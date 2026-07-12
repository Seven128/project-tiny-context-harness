import { randomBytes } from "node:crypto";
import { readFile, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { canonicalJson, sha256Hex } from "./composite-campaign-codec.js";
import { authorityIdentities, computeRepositoryIdentity, computeWorkdirIdentity } from "./long-task-host-identity.js";
import { LongTaskHostStorageV1, type HostStorageOptionsV1, type HostStorageWriteV1 } from "./long-task-host-storage.js";
import type { HostSignatureV1 } from "./long-task-host-signing.js";
import type { CompiledContractV3 } from "./long-task-contract-schema.js";
import { activeHandle, activeRepositoryPath, activeWorkdirPath, assertContractIntegrity, contractPath, reservationHandle, reservationRepositoryPath, reservationWorkdirPath, revisionRequired, sameAuthority, uuidV7, type AuthorityReservationHandleV1, type AuthorityReservationRecordV1, type LongTaskHostActiveRegistryV1 } from "./long-task-host-records.js";
import { assertFinalResultEnvelopeShapeV3, finalResultAttestationBytesV3 } from "./long-task-final-envelope.js";
import { readCanonicalJsonV3 } from "./long-task-durable-json.js";
import { verifyLongTaskFinalTraceV3, type LongTaskFinalTraceV3 } from "./long-task-final-steps.js";
import type { FinalResultEnvelopeV3, FinalResultPayloadV3 } from "./long-task-run-result.js";
export type { AuthorityReservationHandleV1, LongTaskHostActiveRegistryV1, VerificationLeaseV1 } from "./long-task-host-records.js";

export interface HostFinalResultCommitV3 extends HostSignatureV1 { schema_version:"ty-context-host-final-result-commit-v3";result_id:string;registry_id:string;repository_identity_hash:string;workdir_identity_hash:string;contract_sha256:string;run_id:string;final_snapshot_sha256:string;payload_sha256:string;envelope_sha256:string;trace_sha256:string;workflow_status:string;committed_at:string }

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

  async resolveFinalRegistryId(repositoryRoot:string,workdir:string,contractSha256:string):Promise<string>{const repository=await computeRepositoryIdentity(repositoryRoot);const task=await computeWorkdirIdentity(repositoryRoot,workdir);return this.storage.withExclusive(async()=>{const active=await this.recoverActiveLeaseUnlocked(await this.readActiveUnlocked(repository.hash));if(active){if(active.contract_sha256!==contractSha256||active.workdir_identity_hash!==task.hash)revisionRequired();return active.registry_id;}return `detached-${sha256Hex(`${repository.hash}\0${task.hash}\0${contractSha256}`).slice(0,48)}`;});}

  async attestFinalResult(payload:FinalResultPayloadV3):Promise<FinalResultEnvelopeV3>{const {createFinalResultEnvelopeV3,finalResultPayloadSha256V3}=await import("./long-task-final-envelope.js");const payloadSha256=finalResultPayloadSha256V3(payload);const attestation=await this.storage.signer.attest(finalResultAttestationBytesV3(payload,payloadSha256));return createFinalResultEnvelopeV3(payload,attestation);}

  async commitFinalResult(repositoryRoot:string,workdir:string,envelope:FinalResultEnvelopeV3,trace:LongTaskFinalTraceV3):Promise<HostFinalResultCommitV3>{
    assertFinalResultEnvelopeShapeV3(envelope);verifyLongTaskFinalTraceV3(trace);const repository=await computeRepositoryIdentity(repositoryRoot);const task=await computeWorkdirIdentity(repositoryRoot,workdir);const finalFile=path.join(task.identity.canonical_path,"final-result.json");const traceFile=path.join(task.identity.canonical_path,"runs",envelope.payload.run_id,"final-trace.json");const [diskEnvelope,diskTrace]=await Promise.all([readCanonicalJsonV3<FinalResultEnvelopeV3>(finalFile),readCanonicalJsonV3<LongTaskFinalTraceV3>(traceFile)]);if(canonicalJson(diskEnvelope.value)!==canonicalJson(envelope)||canonicalJson(diskTrace.value)!==canonicalJson(trace))throw new Error("final_result_hash_mismatch:workspace_copy");
    return this.storage.withExclusive(async()=>{const active=await this.recoverActiveLeaseUnlocked(await this.readActiveUnlocked(repository.hash));const registryId=active?.registry_id??`detached-${sha256Hex(`${repository.hash}\0${task.hash}\0${envelope.payload.contract_sha256}`).slice(0,48)}`;if(envelope.payload.registry_id!==registryId||envelope.payload.contract_sha256!==(active?.contract_sha256??envelope.payload.contract_sha256)||trace.registry_id!==registryId||trace.contract_sha256!==envelope.payload.contract_sha256||trace.run_id!==envelope.payload.run_id||trace.result_id!==envelope.payload.result_id)throw new Error("final_result_incomplete:authority_identity");if(active&&(active.workdir_identity_hash!==task.hash||active.state!=="sealed"||active.verification_lease))throw new Error("host_registry_state_invalid:final_commit");await this.storage.signer.verifyAttestation(envelope.host_attestation,finalResultAttestationBytesV3(envelope.payload,envelope.integrity.payload_sha256));const existing=await this.readSigned<HostFinalResultCommitV3>(finalCommitPath(envelope.payload.result_id),"ty-context-host-final-result-commit-v3");if(existing){if(existing.envelope_sha256!==diskEnvelope.sha256||existing.trace_sha256!==trace.trace_sha256)throw new Error("final_result_hash_mismatch:committed_identity");return existing;}const committedAt=new Date(this.storage.now()).toISOString();const commit=await this.storage.signer.sign({schema_version:"ty-context-host-final-result-commit-v3" as const,result_id:envelope.payload.result_id,registry_id:registryId,repository_identity_hash:repository.hash,workdir_identity_hash:task.hash,contract_sha256:envelope.payload.contract_sha256,run_id:envelope.payload.run_id,final_snapshot_sha256:envelope.payload.final_snapshot_sha256,payload_sha256:envelope.integrity.payload_sha256,envelope_sha256:diskEnvelope.sha256,trace_sha256:trace.trace_sha256,workflow_status:envelope.payload.workflow_status,committed_at:committedAt});const writes:HostStorageWriteV1[]=[{path:finalEnvelopePath(commit.result_id),content:canonicalJson(envelope)},{path:finalTracePath(commit.result_id),content:canonicalJson(trace)},{path:finalCommitPath(commit.result_id),content:canonicalJson(commit)},{path:finalLatestPath(task.hash),content:canonicalJson(commit)}];if(active){const {key_id:_key,record_sha256:_hash,signature:_signature,...unsigned}=active;const updated=await this.storage.signer.sign({...unsigned,updated_at:committedAt,terminal_result:{result_id:commit.result_id,payload_sha256:commit.payload_sha256,envelope_sha256:commit.envelope_sha256,trace_sha256:commit.trace_sha256,workflow_status:commit.workflow_status,committed_at:commit.committed_at}});writes.push(...this.activeWrites(updated));}await this.storage.commitUnlocked("commit_final_result",writes);return commit;});
  }

  async verifyCommittedFinalResult(repositoryRoot:string,workdir:string,envelope:FinalResultEnvelopeV3,trace:LongTaskFinalTraceV3):Promise<HostFinalResultCommitV3>{assertFinalResultEnvelopeShapeV3(envelope);verifyLongTaskFinalTraceV3(trace);const repository=await computeRepositoryIdentity(repositoryRoot);const task=await computeWorkdirIdentity(repositoryRoot,workdir);return this.storage.withExclusive(async()=>{await this.storage.signer.verifyAttestation(envelope.host_attestation,finalResultAttestationBytesV3(envelope.payload,envelope.integrity.payload_sha256));const latest=await this.readSigned<HostFinalResultCommitV3>(finalLatestPath(task.hash),"ty-context-host-final-result-commit-v3");if(!latest)throw new Error("final_result_incomplete:host_commit_missing");if(latest.result_id!==envelope.payload.result_id)throw new Error("historical_result_rejected");const commit=await this.readSigned<HostFinalResultCommitV3>(finalCommitPath(latest.result_id),"ty-context-host-final-result-commit-v3");if(!commit||canonicalJson(commit)!==canonicalJson(latest))throw new Error("final_result_hash_mismatch:host_commit");const [hostEnvelope,hostTrace]=await Promise.all([this.storage.readJson<FinalResultEnvelopeV3>(finalEnvelopePath(commit.result_id)),this.storage.readJson<LongTaskFinalTraceV3>(finalTracePath(commit.result_id))]);if(!hostEnvelope||!hostTrace||sha256Hex(canonicalJson(hostEnvelope))!==commit.envelope_sha256||hostTrace.trace_sha256!==commit.trace_sha256||canonicalJson(hostEnvelope)!==canonicalJson(envelope)||canonicalJson(hostTrace)!==canonicalJson(trace)||commit.repository_identity_hash!==repository.hash||commit.workdir_identity_hash!==task.hash)throw new Error("final_result_hash_mismatch:host_copy");return commit;});}

  async releaseTerminal(repositoryRoot:string,result:Record<string,unknown>,turnId:string):Promise<unknown>{if(!/^[A-Za-z0-9._:-]{1,256}$/u.test(turnId))throw new Error("host_terminal_turn_id_invalid");const repository=await computeRepositoryIdentity(repositoryRoot);const tombstone=await this.storage.withExclusive(async()=>{const active=await this.recoverActiveLeaseUnlocked(await this.readActiveUnlocked(repository.hash));if(!active)throw new Error("host_active_registry_missing");if(active.state!=="sealed"||active.verification_lease)throw new Error("host_registry_state_invalid:terminal");const latest=await this.readSigned<HostFinalResultCommitV3>(finalLatestPath(active.workdir_identity_hash),"ty-context-host-final-result-commit-v3");if(!latest||result.result_id!==latest.result_id||result.contract_sha256!==active.contract_sha256||result.workflow_status!==latest.workflow_status||sha256Hex(canonicalJson(result))!==latest.payload_sha256||!["accepted","externally_blocked"].includes(String(result.workflow_status)))throw new Error("host_terminal_result_invalid");const completedAt=new Date(this.storage.now()).toISOString();const signed=await this.storage.signer.sign({schema_version:"ty-context-host-terminal-tombstone-v1" as const,registry_id:active.registry_id,repository_identity_hash:active.repository_identity_hash,workdir_identity_hash:active.workdir_identity_hash,contract_sha256:active.contract_sha256,workflow_status:String(result.workflow_status),result_sha256:latest.payload_sha256,stop_turn_id:turnId,completed_at:completedAt,retain_until:new Date(this.storage.now()+30*24*60*60_000).toISOString()});await this.storage.commitUnlocked("release_terminal",[{path:`registry/tombstones/${active.registry_id}.json`,content:canonicalJson(signed)},{path:`registry/active/records/${active.registry_id}.json`,content:null},{path:activeRepositoryPath(active.repository_identity_hash),content:null},{path:activeWorkdirPath(active.workdir_identity_hash),content:null}]);return signed;});await rm(path.join(repository.identity.canonical_path,".codex","ty-context-active-long-task.json"),{force:true}).catch(()=>undefined);return tombstone;}

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

function finalCommitPath(resultId:string):string{return `registry/results/commits/${safeResultId(resultId)}.json`;}
function finalEnvelopePath(resultId:string):string{return `registry/results/envelopes/${safeResultId(resultId)}.json`;}
function finalTracePath(resultId:string):string{return `registry/results/traces/${safeResultId(resultId)}.json`;}
function finalLatestPath(workdirHash:string):string{return `registry/results/latest/by-workdir/${workdirHash}.json`;}
function safeResultId(value:string):string{if(!/^[A-Za-z0-9._:-]{1,256}$/u.test(value))throw new Error("final_result_incomplete:result_id");return value;}
