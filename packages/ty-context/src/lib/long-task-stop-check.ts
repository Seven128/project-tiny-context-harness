import { readFile } from "node:fs/promises";
import path from "node:path";
import { assertLongTaskContractFresh, readCompiledLongTaskContract } from "./long-task-contract-compiler.js";
import { hashLongTaskWorkspace } from "./long-task-snapshot.js";
import type { FinalResultV3 } from "./long-task-run-result.js";
import { assertLongTaskFinalAuthority } from "./long-task-final-receipt.js";

export interface StopCheckResult { decision?: "block"; reason?: string; continue?: boolean }
export async function stopCheckLongTask(workdir: string, _lastAssistantMessage: string): Promise<StopCheckResult> {
  const contract = await readCompiledLongTaskContract(workdir); try { await assertLongTaskContractFresh(contract); } catch { return block("Contract inputs or verifier changed after compile; restore the active contract and rerun final-gate."); } let result: FinalResultV3 | undefined; let resultText = ""; try { resultText = await readFile(path.join(workdir, "final-result.json"), "utf8"); result = JSON.parse(resultText) as FinalResultV3; await assertLongTaskFinalAuthority(contract, resultText, result); } catch { return block("Final gate has not produced a trusted receipt-bound result. Run final-gate and continue implementation."); }
  if (result.schema_version !== "long-task-final-result-v3" || result.contract_sha256 !== contract.contract_sha256 || result.atomic_write_complete !== true) return block("Final result is stale or invalid; rerun final-gate.");
  const current = await hashLongTaskWorkspace(contract.repository_root, contract); if (current !== result.final_snapshot_sha256 || current !== result.workspace_hash_after) return block("Workspace changed after final verification; rerun final-gate.");
  if (result.workflow_status === "accepted") return {};
  return block(result.findings[0]?.next_action ?? "Final verification needs work; continue implementation.");
}
function block(reason: string): StopCheckResult { return { decision: "block", reason, continue: true }; }
