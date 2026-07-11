import path from "node:path";
import { readCompiledLongTaskContract, assertLongTaskContractFresh } from "./long-task-contract-compiler.js";
import { hashLongTaskWorkspace } from "./long-task-snapshot.js";
import { verifyLongTask } from "./long-task-verifier.js";
import { atomic } from "./long-task-status.js";
import type { FinalResultV2 } from "./long-task-run-result.js";
import { classifyExternalBlocker } from "./long-task-external-blocker.js";

export async function runLongTaskFinalGate(workdir: string): Promise<FinalResultV2> {
  const contract = await readCompiledLongTaskContract(workdir); await assertLongTaskContractFresh(contract);
  const before = await hashLongTaskWorkspace(contract.repository_root, contract);
  const run = await verifyLongTask(workdir, contract.verification_specs.map((spec) => spec.id));
  const after = await hashLongTaskWorkspace(contract.repository_root, contract);
  const blocker = classifyExternalBlocker(run, contract); const findings = [...blocker.findings];
  if (before !== after || after !== run.snapshot.snapshot_sha256) findings.push({ category: "workspace_changed_during_or_after_final", expected: run.snapshot.snapshot_sha256, actual: after, evidence_path: `runs/${run.run_id}/snapshot-manifest.json`, next_action: "Restore a stable workspace and rerun final-gate", reverify_command: `ty-context composite-long-task final-gate ${quote(workdir)}` });
  const failedSpecs = new Set(run.spec_results.filter((value) => value.status !== "passed").map((value) => value.spec_id));
  const specResults = Object.fromEntries(run.spec_results.map((value) => [value.spec_id, value.status]));
  const acceptanceResults: Record<string,"passed"|"failed"> = Object.fromEntries(Object.entries(contract.acceptance_graph).map(([id, value]) => [id, value.verification_spec_ids.some((spec) => failedSpecs.has(spec)) ? "failed" as const : "passed" as const]));
  const obligationResults: Record<string,"passed"|"failed"> = Object.fromEntries(Object.entries(contract.obligation_graph).map(([id, value]) => [id, value.ac_ids.some((ac) => acceptanceResults[ac] !== "passed") ? "failed" as const : "passed" as const]));
  const requirementResults: Record<string,"passed"|"failed"> = Object.fromEntries(Object.entries(contract.requirement_graph).map(([id, value]) => [id, value.obligation_ids.some((obligation) => obligationResults[obligation] !== "passed") ? "failed" as const : "passed" as const]));
  const result: FinalResultV2 = {
    schema_version: "long-task-final-result-v2", workflow_status: blocker.externally_blocked && findings.length === 0 ? "externally_blocked" : findings.length === 0 ? "accepted" : "needs_work",
    contract_sha256: contract.contract_sha256, run_id: run.run_id, final_snapshot_sha256: run.snapshot.snapshot_sha256,
    source_hashes: Object.fromEntries(Object.entries(contract.sources).map(([key, value]) => [key, value.sha256])), context_hashes: contract.context_snapshot.sha256,
    oracle_hashes: Object.assign({}, ...contract.verification_specs.map((spec) => spec.oracle_sha256)), verifier_identity: contract.verifier_identity,
    requirement_results: requirementResults, obligation_results: obligationResults, acceptance_results: acceptanceResults, spec_results: specResults,
    workspace_hash_before: before, workspace_hash_after: after, findings, ...(blocker.externally_blocked ? { external_blocker: { minimal_user_action: blocker.minimal_user_action ?? "Complete the required external action" } } : {}), started_at: run.started_at, completed_at: new Date().toISOString(), atomic_write_complete: true
  };
  await atomic(path.join(workdir, "final-result.json"), result); return result;
}
function quote(value: string): string { return /\s/.test(value) ? JSON.stringify(value) : value; }
