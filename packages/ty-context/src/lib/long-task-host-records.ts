import { randomBytes } from "node:crypto";
import { canonicalJson, canonicalValueJson, sha256Hex } from "./composite-campaign-codec.js";
import type { CompiledContractV3 } from "./long-task-contract-schema.js";
import type { AuthorityIdentitiesV1, RepositoryIdentityV1, WorkdirIdentityV1 } from "./long-task-host-identity.js";
import type { HostSignatureV1 } from "./long-task-host-signing.js";

export interface AuthorityReservationHandleV1 {
  kind: "reservation" | "active";
  reservation_id: string | null;
  active_registry_id: string | null;
  repository_identity_hash: string;
  workdir_identity_hash: string;
  expires_at: string | null;
}

export interface AuthorityReservationRecordV1 extends HostSignatureV1 {
  schema_version: "ty-context-host-authority-reservation-v1";
  reservation_id: string;
  repository_identity: RepositoryIdentityV1;
  repository_identity_hash: string;
  workdir_identity: WorkdirIdentityV1;
  workdir_identity_hash: string;
  created_at: string;
  expires_at: string;
}

export interface VerificationLeaseV1 {
  operation_id: string;
  run_id: string;
  process_identity: { pid: number; executable_path: string; executable_sha256: string };
  acquired_at: string;
  expires_at: string;
}

export interface LongTaskHostActiveRegistryV1 extends HostSignatureV1 {
  schema_version: "ty-context-host-active-registry-v1";
  registry_id: string;
  state: "sealed" | "verifying" | "terminal_pending_cleanup";
  repository_identity: RepositoryIdentityV1;
  repository_identity_hash: string;
  workdir_identity: WorkdirIdentityV1;
  workdir_identity_hash: string;
  contract_sha256: string;
  authority_identities: AuthorityIdentitiesV1;
  created_at: string;
  updated_at: string;
  authority_nonce: string;
  verification_lease: VerificationLeaseV1 | null;
  terminal_result: null | Record<string, unknown>;
}

export function activeRepositoryPath(hash: string): string { return `registry/active/by-repository/${hash}.json`; }
export function activeWorkdirPath(hash: string): string { return `registry/active/by-workdir/${hash}.json`; }
export function reservationRepositoryPath(hash: string): string { return `registry/reservations/by-repository/${hash}.json`; }
export function reservationWorkdirPath(hash: string): string { return `registry/reservations/by-workdir/${hash}.json`; }
export function contractPath(hash: string): string { return `registry/contracts/${hash}.json`; }

export function activeHandle(active: LongTaskHostActiveRegistryV1): AuthorityReservationHandleV1 {
  return { kind: "active", reservation_id: null, active_registry_id: active.registry_id, repository_identity_hash: active.repository_identity_hash, workdir_identity_hash: active.workdir_identity_hash, expires_at: null };
}

export function reservationHandle(record: AuthorityReservationRecordV1): AuthorityReservationHandleV1 {
  return { kind: "reservation", reservation_id: record.reservation_id, active_registry_id: null, repository_identity_hash: record.repository_identity_hash, workdir_identity_hash: record.workdir_identity_hash, expires_at: record.expires_at };
}

export function sameAuthority(active: LongTaskHostActiveRegistryV1, repositoryHash: string, workdirHash: string, contractHash: string, identities: AuthorityIdentitiesV1): boolean {
  return active.repository_identity_hash === repositoryHash && active.workdir_identity_hash === workdirHash && active.contract_sha256 === contractHash && canonicalValueJson(active.authority_identities) === canonicalValueJson(identities);
}

export function assertContractIntegrity(contract: CompiledContractV3): void {
  const { contract_sha256, ...unsigned } = contract;
  if (sha256Hex(canonicalJson(unsigned)) !== contract_sha256) throw new Error("host_contract_integrity_failure");
}

export function revisionRequired(): never {
  throw new Error("active_contract_revision_requires_user_authorization");
}

export function uuidV7(now: number): string {
  const bytes = randomBytes(16);
  let timestamp = BigInt(Math.floor(now));
  for (let index = 5; index >= 0; index -= 1) { bytes[index] = Number(timestamp & 0xffn); timestamp >>= 8n; }
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
