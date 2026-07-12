import { execFile } from "node:child_process";
import { realpath } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { compileLongTaskContract, readCompiledLongTaskContract, writeCompiledLongTaskContract } from "./long-task-contract-compiler.js";
import type { CompiledContractV3 } from "./long-task-contract-schema.js";
import { writeLongTaskRegistryMirror } from "./long-task-active-task.js";
import { authorityIdentities } from "./long-task-host-identity.js";
import { LongTaskHostRegistryServiceV1, type LongTaskHostActiveRegistryV1 } from "./long-task-host-service.js";
import { canonicalValueJson, sha256Hex } from "./composite-campaign-codec.js";
import { LongTaskHostRpcClientV1 } from "./long-task-host-rpc-client.js";
import { managedHostLayout } from "./long-task-managed-host-layout.js";

const exec = promisify(execFile);
const defaultServices = new Map<string, LongTaskHostRegistryServiceV1>();

export function longTaskHostStateRoot(): string {
  return path.join(os.tmpdir(), "project-tiny-context-harness-host-v3", "host-state");
}

export async function longTaskHostService(repositoryRoot: string): Promise<LongTaskHostRegistryServiceV1> {
  return longTaskHostServiceAt(repositoryRoot, longTaskHostStateRoot());
}

export async function longTaskHostServiceAt(repositoryRoot: string, hostRoot: string): Promise<LongTaskHostRegistryServiceV1> {
  const canonical = await realpath(path.resolve(repositoryRoot));
  const serviceKey = process.platform === "win32" ? canonical.toLocaleLowerCase("en-US") : canonical;
  const canonicalHostRoot = path.resolve(hostRoot);
  const mapKey = `${canonicalHostRoot}\0${serviceKey}`;
  const existing = defaultServices.get(mapKey);
  if (existing) return existing;
  const shard = sha256Hex(serviceKey);
  const service = new LongTaskHostRegistryServiceV1({ stateRoot: path.join(canonicalHostRoot, "repositories", shard), keyRoot: canonicalHostRoot });
  defaultServices.set(mapKey, service);
  return service;
}

export async function compileAndSealLongTaskContract(workdir: string, repositoryRoot = process.cwd()): Promise<{ contract: CompiledContractV3; registry: LongTaskHostActiveRegistryV1 }> {
  const service = await longTaskHostService(repositoryRoot);
  let handle = await service.reserveAuthority(repositoryRoot, workdir);
  let renewal = Promise.resolve();
  let renewalError: unknown;
  const timer = handle.kind === "reservation" ? setInterval(() => {
    renewal = renewal.then(async () => { handle = await service.renewReservation(handle); }).catch((error) => { renewalError = error; });
  }, 60_000) : null;
  timer?.unref();
  try {
    const contract = await compileLongTaskContract(workdir, repositoryRoot, { write: false });
    if (timer) { clearInterval(timer); await renewal; }
    if (renewalError) throw renewalError;
    const registry = await service.sealAuthority(handle, contract);
    await writeCompiledLongTaskContract(workdir, contract);
    await writeLongTaskRegistryMirror(registry);
    return { contract, registry };
  } catch (error) {
    if (timer) { clearInterval(timer); await renewal; }
    await service.abandonReservation(handle).catch(() => undefined);
    throw error;
  } finally {
    if (timer) clearInterval(timer);
  }
}

export async function getActiveLongTask(repositoryRoot: string): Promise<LongTaskHostActiveRegistryV1 | null> {
  return (await longTaskHostService(repositoryRoot)).getActive(repositoryRoot);
}

export async function beginActiveLongTaskVerification(contract: CompiledContractV3, runId: string): Promise<string | null> {
  const active = await getActiveLongTask(contract.repository_root);
  if (!active) return null;
  if (active.contract_sha256 !== contract.contract_sha256 || active.workdir_identity.canonical_path !== contract.workdir) throw new Error("active_contract_revision_requires_user_authorization:verification");
  const verifying = await (await longTaskHostService(contract.repository_root)).beginVerification(contract.repository_root, runId);
  return verifying.verification_lease?.operation_id ?? null;
}

export async function finishActiveLongTaskVerification(contract: CompiledContractV3, operationId: string | null): Promise<void> {
  if (operationId) await (await longTaskHostService(contract.repository_root)).finishVerification(contract.repository_root, operationId);
}

export async function startActiveLongTaskVerificationLease(contract: CompiledContractV3, runId: string): Promise<{ stop: () => Promise<void> }> {
  const operationId = await beginActiveLongTaskVerification(contract, runId);
  if (!operationId) return { stop: async () => undefined };
  const service = await longTaskHostService(contract.repository_root);
  let renewal = Promise.resolve();
  let renewalError: unknown;
  const timer = setInterval(() => {
    renewal = renewal.then(() => service.renewVerification(contract.repository_root, operationId)).then(() => undefined).catch((error) => { renewalError = error; });
  }, 60_000);
  timer.unref();
  return { stop: async () => { clearInterval(timer); await renewal; await finishActiveLongTaskVerification(contract, operationId); if (renewalError) throw renewalError; } };
}

export async function readAuthoritativeLongTaskContract(workdir: string): Promise<{ contract: CompiledContractV3; registry: LongTaskHostActiveRegistryV1 | null }> {
  const repositoryRoot = await gitRoot(workdir).catch(() => null);
  if (!repositoryRoot) return { contract: await readCompiledLongTaskContract(workdir), registry: null };
  const service = await longTaskHostService(repositoryRoot);
  const authority = await service.readActiveAuthority(repositoryRoot);
  if (!authority) return { contract: await readCompiledLongTaskContract(workdir), registry: null };
  const { contract, registry } = authority;
  const canonicalWorkdir = await realpath(path.resolve(workdir));
  if (!samePath(canonicalWorkdir, registry.workdir_identity.canonical_path)) throw new Error("active_contract_revision_requires_user_authorization:workdir");
  if (contract.contract_sha256 !== registry.contract_sha256 || canonicalValueJson(authorityIdentities(contract)) !== canonicalValueJson(registry.authority_identities)) throw new Error("host_registry_integrity_failure:authority_binding");
  return { contract, registry };
}

export interface HostCompileSummaryV1 { schema_version:"ty-context-host-compile-result-v1";contract_sha256:string;registry_id:string;counts:{requirements:number;plan_items:number;obligations:number;bindings:number;acceptance_criteria:number;proof_requirements:number;verification_specs:number} }
export interface HostVerifySummaryV1 { schema_version:"ty-context-host-verify-result-v1";contract_sha256:string;run_id:string;workflow_status:"needs_work"|"externally_blocked";findings_count:number;spec_results:Record<string,string> }
export interface HostFinalSummaryV1 { schema_version:"ty-context-host-final-result-summary-v1";contract_sha256:string;run_id:string;workflow_status:"accepted"|"needs_work"|"externally_blocked";findings_count:number;final_result_path:string }

export async function compileAndSealLongTaskContractViaHost(workdir:string,repositoryRoot?:string):Promise<{contract:CompiledContractV3;registry:LongTaskHostActiveRegistryV1;summary:HostCompileSummaryV1}>{const root=repositoryRoot?await realpath(path.resolve(repositoryRoot)):await gitRoot(workdir);const task=await realpath(path.resolve(workdir));const reservation=await managedRpc(10*60_000).call("reserve_authority",root,{workdir:task});const summary=await managedRpc(10*60_000).call("compile_and_seal",root,{workdir:task,reservation}) as HostCompileSummaryV1;const contract=await readCompiledLongTaskContract(task);const registry=await managedRpc(5000).call("get_active",root,{}) as LongTaskHostActiveRegistryV1;if(summary.schema_version!=="ty-context-host-compile-result-v1"||contract.contract_sha256!==summary.contract_sha256||registry.contract_sha256!==summary.contract_sha256||registry.registry_id!==summary.registry_id)throw new Error("host_registry_integrity_failure:compile_response");return {contract,registry,summary};}
export async function verifyLongTaskViaHost(workdir:string,specIds?:string[]):Promise<HostVerifySummaryV1>{const task=await realpath(path.resolve(workdir));const root=await gitRoot(task);const result=await managedRpc(6*60*60_000).call("verify",root,{workdir:task,spec_ids:specIds??[]}) as HostVerifySummaryV1;if(result.schema_version!=="ty-context-host-verify-result-v1"||!result.contract_sha256||!result.run_id)return invalidHostResult();return result;}
export async function finalGateLongTaskViaHost(workdir:string):Promise<HostFinalSummaryV1>{const task=await realpath(path.resolve(workdir));const root=await gitRoot(task);const result=await managedRpc(6*60*60_000).call("final_gate",root,{workdir:task}) as HostFinalSummaryV1;if(result.schema_version!=="ty-context-host-final-result-summary-v1"||!result.contract_sha256||!result.run_id||!samePath(path.resolve(result.final_result_path),path.join(task,"final-result.json")))return invalidHostResult();return result;}

function managedRpc(timeout_ms:number):LongTaskHostRpcClientV1{const layout=managedHostLayout();return new LongTaskHostRpcClientV1({endpoint:layout.endpoint,public_key_path:layout.attestation_public_key_path,timeout_ms});}
function invalidHostResult():never{throw new Error("host_rpc_response_invalid:worker_result");}

async function gitRoot(workdir: string): Promise<string> {
  const output = await exec("git", ["rev-parse", "--show-toplevel"], { cwd: workdir, windowsHide: true });
  return path.resolve(output.stdout.trim());
}

function samePath(left: string, right: string): boolean {
  return process.platform === "win32" ? left.toLocaleLowerCase("en-US") === right.toLocaleLowerCase("en-US") : left === right;
}
