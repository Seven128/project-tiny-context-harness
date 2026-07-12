import { randomBytes } from "node:crypto";
import { readFile, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { canonicalJson, sha256Hex } from "./composite-campaign-codec.js";
import { authorityIdentities, computeRepositoryIdentity, computeWorkdirIdentity } from "./long-task-host-identity.js";
import { LongTaskHostStorageV1, type HostStorageOptionsV1, type HostStorageWriteV1 } from "./long-task-host-storage.js";
import type { HostSignatureV1 } from "./long-task-host-signing.js";
import type { CompiledContractV3 } from "./long-task-contract-schema.js";
import { activeHandle, activeRepositoryPath, activeWorkdirPath, assertContractIntegrity, contractPath, reservationHandle, reservationRepositoryPath, reservationWorkdirPath, revisionRequired, sameAuthority, uuidV7, type AuthorityReservationHandleV1, type AuthorityReservationRecordV1, type LongTaskHostActiveRegistryV1 } from "./long-task-host-records.js";
export type { AuthorityReservationHandleV1, LongTaskHostActiveRegistryV1, VerificationLeaseV1 } from "./long-task-host-records.js";

export class LongTaskHostRegistryServiceV1 {
  readonly stateRoot: string;
  private readonly storage: LongTaskHostStorageV1;

  constructor(options: HostStorageOptionsV1) {
    this.storage = new LongTaskHostStorageV1(options);
    this.stateRoot = this.storage.stateRoot;
  }

  async reserveAuthority(repositoryRoot: string, workdir: string): Promise<AuthorityReservationHandleV1> {
    const repository = await computeRepositoryIdentity(repositoryRoot);
    const task = await computeWorkdirIdentity(repositoryRoot, workdir);
    return this.storage.withExclusive(async () => {
      const active = await this.readActiveUnlocked(repository.hash);
      if (active) {
        if (active.workdir_identity_hash !== task.hash) revisionRequired();
        return activeHandle(active);
      }
      const existing = await this.readReservationUnlocked(repository.hash);
      if (existing && Date.parse(existing.expires_at) > this.storage.now()) {
        if (existing.workdir_identity_hash !== task.hash) revisionRequired();
        return reservationHandle(existing);
      }
      if (existing) await this.storage.commitUnlocked("expire_reservation", this.deleteReservationWrites(existing));
      const workdirActive = await this.readSigned<LongTaskHostActiveRegistryV1>(activeWorkdirPath(task.hash), "ty-context-host-active-registry-v1");
      const workdirReservation = await this.readSigned<AuthorityReservationRecordV1>(reservationWorkdirPath(task.hash), "ty-context-host-authority-reservation-v1");
      if (workdirActive || (workdirReservation && Date.parse(workdirReservation.expires_at) > this.storage.now())) revisionRequired();
      const createdAt = new Date(this.storage.now()).toISOString();
      const reservation = await this.storage.signer.sign({
        schema_version: "ty-context-host-authority-reservation-v1" as const,
        reservation_id: uuidV7(this.storage.now()),
        repository_identity: repository.identity,
        repository_identity_hash: repository.hash,
        workdir_identity: task.identity,
        workdir_identity_hash: task.hash,
        created_at: createdAt,
        expires_at: new Date(this.storage.now() + 15 * 60_000).toISOString()
      });
      await this.storage.commitUnlocked("reserve", this.reservationWrites(reservation));
      return reservationHandle(reservation);
    });
  }

  async sealAuthority(handle: AuthorityReservationHandleV1, contract: CompiledContractV3): Promise<LongTaskHostActiveRegistryV1> {
    assertContractIntegrity(contract);
    const repository = await computeRepositoryIdentity(contract.repository_root);
    const task = await computeWorkdirIdentity(contract.repository_root, contract.workdir);
    const identities = authorityIdentities(contract);
    return this.storage.withExclusive(async () => {
      const existing = await this.readActiveUnlocked(repository.hash);
      if (existing) {
        if (sameAuthority(existing, repository.hash, task.hash, contract.contract_sha256, identities)) return existing;
        revisionRequired();
      }
      if (handle.kind !== "reservation" || !handle.reservation_id) throw new Error("host_authority_reservation_missing");
      const reservation = await this.readReservationUnlocked(repository.hash);
      if (!reservation || reservation.reservation_id !== handle.reservation_id || Date.parse(reservation.expires_at) <= this.storage.now()) throw new Error("host_authority_reservation_missing_or_expired");
      if (reservation.repository_identity_hash !== repository.hash || reservation.workdir_identity_hash !== task.hash) revisionRequired();
      const now = new Date(this.storage.now()).toISOString();
      const active = await this.storage.signer.sign({
        schema_version: "ty-context-host-active-registry-v1" as const,
        registry_id: uuidV7(this.storage.now()),
        state: "sealed" as const,
        repository_identity: repository.identity,
        repository_identity_hash: repository.hash,
        workdir_identity: task.identity,
        workdir_identity_hash: task.hash,
        contract_sha256: contract.contract_sha256,
        authority_identities: identities,
        created_at: now,
        updated_at: now,
        authority_nonce: randomBytes(32).toString("base64url"),
        verification_lease: null,
        terminal_result: null
      });
      await this.storage.commitUnlocked("seal", [
        { path: contractPath(contract.contract_sha256), content: canonicalJson(contract) },
        ...this.activeWrites(active),
        ...this.deleteReservationWrites(reservation)
      ]);
      return active;
    });
  }

  async renewReservation(handle: AuthorityReservationHandleV1): Promise<AuthorityReservationHandleV1> {
    if (handle.kind !== "reservation" || !handle.reservation_id) return handle;
    return this.storage.withExclusive(async () => {
      const reservation = await this.readReservationUnlocked(handle.repository_identity_hash);
      if (!reservation || reservation.reservation_id !== handle.reservation_id || Date.parse(reservation.expires_at) <= this.storage.now()) throw new Error("host_authority_reservation_missing_or_expired");
      const { key_id: _key, record_sha256: _hash, signature: _signature, ...unsigned } = reservation;
      const renewed = await this.storage.signer.sign({ ...unsigned, expires_at: new Date(this.storage.now() + 15 * 60_000).toISOString() });
      await this.storage.commitUnlocked("renew_reservation", this.reservationWrites(renewed));
      return reservationHandle(renewed);
    });
  }

  async getActive(repositoryRoot: string): Promise<LongTaskHostActiveRegistryV1 | null> {
    const repository = await computeRepositoryIdentity(repositoryRoot);
    return this.storage.withExclusive(async () => this.recoverActiveLeaseUnlocked(await this.readActiveUnlocked(repository.hash)));
  }

  async readActiveAuthority(repositoryRoot: string): Promise<{ registry: LongTaskHostActiveRegistryV1; contract: CompiledContractV3 } | null> {
    const repository = await computeRepositoryIdentity(repositoryRoot);
    return this.storage.withExclusive(async () => {
      const registry = await this.recoverActiveLeaseUnlocked(await this.readActiveUnlocked(repository.hash));
      if (!registry) return null;
      const contract = await this.readSealedContractUnlocked(registry);
      return { registry, contract };
    });
  }

  async readSealedContract(repositoryRoot: string): Promise<CompiledContractV3 | null> {
    return (await this.readActiveAuthority(repositoryRoot))?.contract ?? null;
  }

  async beginVerification(repositoryRoot: string, runId: string): Promise<LongTaskHostActiveRegistryV1> {
    if (!/^[A-Za-z0-9._:-]{1,128}$/u.test(runId)) throw new Error("verification_run_id_invalid");
    const repository = await computeRepositoryIdentity(repositoryRoot);
    const processIdentity = { pid: process.pid, executable_path: process.execPath, executable_sha256: sha256Hex(await readFile(process.execPath)) };
    return this.storage.withExclusive(async () => {
      const active = await this.recoverActiveLeaseUnlocked(await this.readActiveUnlocked(repository.hash));
      if (!active) throw new Error("host_active_registry_missing");
      if (active.state === "verifying") {
        if (active.verification_lease?.run_id === runId) return active;
        throw new Error("host_verification_lease_conflict");
      }
      if (active.state !== "sealed") throw new Error(`host_registry_state_invalid:${active.state}`);
      const now = new Date(this.storage.now()).toISOString();
      return this.replaceActiveUnlocked(active, {
        state: "verifying",
        updated_at: now,
        verification_lease: {
          operation_id: uuidV7(this.storage.now()),
          run_id: runId,
          process_identity: processIdentity,
          acquired_at: now,
          expires_at: new Date(this.storage.now() + 10 * 60_000).toISOString()
        }
      }, "begin_verification");
    });
  }

  async renewVerification(repositoryRoot: string, operationId: string): Promise<LongTaskHostActiveRegistryV1> {
    const repository = await computeRepositoryIdentity(repositoryRoot);
    return this.storage.withExclusive(async () => {
      const active = await this.readActiveUnlocked(repository.hash);
      if (active?.state !== "verifying" || active.verification_lease?.operation_id !== operationId) throw new Error("host_verification_lease_invalid");
      return this.replaceActiveUnlocked(active, {
        updated_at: new Date(this.storage.now()).toISOString(),
        verification_lease: { ...active.verification_lease, expires_at: new Date(this.storage.now() + 10 * 60_000).toISOString() }
      }, "renew_verification");
    });
  }

  async finishVerification(repositoryRoot: string, operationId: string): Promise<LongTaskHostActiveRegistryV1> {
    const repository = await computeRepositoryIdentity(repositoryRoot);
    return this.storage.withExclusive(async () => {
      const active = await this.readActiveUnlocked(repository.hash);
      if (active?.state !== "verifying" || active.verification_lease?.operation_id !== operationId) throw new Error("host_verification_lease_invalid");
      return this.replaceActiveUnlocked(active, { state: "sealed", updated_at: new Date(this.storage.now()).toISOString(), verification_lease: null }, "finish_verification");
    });
  }

  async releaseTerminal(repositoryRoot:string,result:Record<string,unknown>,turnId:string):Promise<unknown>{if(!/^[A-Za-z0-9._:-]{1,256}$/u.test(turnId))throw new Error("host_terminal_turn_id_invalid");const repository=await computeRepositoryIdentity(repositoryRoot);const tombstone=await this.storage.withExclusive(async()=>{const active=await this.recoverActiveLeaseUnlocked(await this.readActiveUnlocked(repository.hash));if(!active)throw new Error("host_active_registry_missing");if(active.state!=="sealed"||active.verification_lease)throw new Error("host_registry_state_invalid:terminal");if(result.contract_sha256!==active.contract_sha256||!["accepted","externally_blocked"].includes(String(result.workflow_status)))throw new Error("host_terminal_result_invalid");const completedAt=new Date(this.storage.now()).toISOString();const signed=await this.storage.signer.sign({schema_version:"ty-context-host-terminal-tombstone-v1" as const,registry_id:active.registry_id,repository_identity_hash:active.repository_identity_hash,workdir_identity_hash:active.workdir_identity_hash,contract_sha256:active.contract_sha256,workflow_status:String(result.workflow_status),result_sha256:sha256Hex(canonicalJson(result)),stop_turn_id:turnId,completed_at:completedAt,retain_until:new Date(this.storage.now()+30*24*60*60_000).toISOString()});await this.storage.commitUnlocked("release_terminal",[{path:`registry/tombstones/${active.registry_id}.json`,content:canonicalJson(signed)},{path:`registry/active/records/${active.registry_id}.json`,content:null},{path:activeRepositoryPath(active.repository_identity_hash),content:null},{path:activeWorkdirPath(active.workdir_identity_hash),content:null}]);return signed;});await rm(path.join(repository.identity.canonical_path,".codex","ty-context-active-long-task.json"),{force:true}).catch(()=>undefined);return tombstone;}

  async abandonReservation(handle: AuthorityReservationHandleV1): Promise<void> {
    if (handle.kind !== "reservation" || !handle.reservation_id) return;
    await this.storage.withExclusive(async () => {
      const reservation = await this.readReservationUnlocked(handle.repository_identity_hash);
      if (reservation?.reservation_id === handle.reservation_id && !await this.readActiveUnlocked(handle.repository_identity_hash)) await this.storage.commitUnlocked("abandon_reservation", this.deleteReservationWrites(reservation));
    });
  }

  async recover(): Promise<void> {
    await this.storage.withExclusive(async () => {
      const directory = path.join(this.stateRoot, "registry", "active", "records");
      for (const name of await readdir(directory)) {
        if (!name.endsWith(".json")) continue;
        const active = await this.readSigned<LongTaskHostActiveRegistryV1>(`registry/active/records/${name}`, "ty-context-host-active-registry-v1");
        await this.recoverActiveLeaseUnlocked(active);
      }
    });
  }

  private async recoverActiveLeaseUnlocked(active: LongTaskHostActiveRegistryV1 | null): Promise<LongTaskHostActiveRegistryV1 | null> {
    if (!active || active.state !== "verifying" || !active.verification_lease || Date.parse(active.verification_lease.expires_at) > this.storage.now()) return active;
    return this.replaceActiveUnlocked(active, { state: "sealed", updated_at: new Date(this.storage.now()).toISOString(), verification_lease: null }, "recover_expired_verification");
  }

  private async replaceActiveUnlocked(active: LongTaskHostActiveRegistryV1, changes: Partial<LongTaskHostActiveRegistryV1>, operation: string): Promise<LongTaskHostActiveRegistryV1> {
    const { key_id: _key, record_sha256: _hash, signature: _signature, ...unsigned } = active;
    const updated = await this.storage.signer.sign({ ...unsigned, ...changes });
    await this.storage.commitUnlocked(operation, this.activeWrites(updated));
    return updated;
  }

  private async readActiveUnlocked(repositoryHash: string): Promise<LongTaskHostActiveRegistryV1 | null> {
    return this.readSigned<LongTaskHostActiveRegistryV1>(activeRepositoryPath(repositoryHash), "ty-context-host-active-registry-v1");
  }

  private async readSealedContractUnlocked(active: LongTaskHostActiveRegistryV1): Promise<CompiledContractV3> {
    const contract = await this.storage.readJson<CompiledContractV3>(contractPath(active.contract_sha256));
    if (!contract) throw new Error("host_registry_integrity_failure:sealed_contract_missing");
    assertContractIntegrity(contract);
    if (contract.contract_sha256 !== active.contract_sha256 || contract.repository_root !== active.repository_identity.canonical_path || contract.workdir !== active.workdir_identity.canonical_path) throw new Error("host_registry_integrity_failure:sealed_contract_identity");
    return contract;
  }

  private async readReservationUnlocked(repositoryHash: string): Promise<AuthorityReservationRecordV1 | null> {
    return this.readSigned<AuthorityReservationRecordV1>(reservationRepositoryPath(repositoryHash), "ty-context-host-authority-reservation-v1");
  }

  private async readSigned<T extends HostSignatureV1 & { schema_version: string }>(relativePath: string, schema: T["schema_version"]): Promise<T | null> {
    const value = await this.storage.readJson<T>(relativePath);
    if (!value) return null;
    await this.storage.signer.verify(value);
    if (value.schema_version !== schema) throw new Error(`host_registry_integrity_failure:schema:${relativePath}`);
    return value;
  }

  private activeWrites(active: LongTaskHostActiveRegistryV1): HostStorageWriteV1[] {
    const content = canonicalJson(active);
    return [
      { path: `registry/active/records/${active.registry_id}.json`, content },
      { path: activeRepositoryPath(active.repository_identity_hash), content },
      { path: activeWorkdirPath(active.workdir_identity_hash), content }
    ];
  }

  private reservationWrites(record: AuthorityReservationRecordV1): HostStorageWriteV1[] {
    const content = canonicalJson(record);
    return [
      { path: reservationRepositoryPath(record.repository_identity_hash), content },
      { path: reservationWorkdirPath(record.workdir_identity_hash), content }
    ];
  }

  private deleteReservationWrites(record: AuthorityReservationRecordV1): HostStorageWriteV1[] {
    return [
      { path: reservationRepositoryPath(record.repository_identity_hash), content: null },
      { path: reservationWorkdirPath(record.workdir_identity_hash), content: null }
    ];
  }
}
