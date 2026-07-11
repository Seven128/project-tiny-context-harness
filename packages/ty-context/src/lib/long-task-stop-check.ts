import { readFile } from "node:fs/promises";
import path from "node:path";
import { readCompiledLongTaskContract } from "./long-task-contract-compiler.js";
import { hashLongTaskWorkspace } from "./long-task-snapshot.js";
import type { FinalResultV2 } from "./long-task-run-result.js";
import { runLongTaskFinalGate } from "./long-task-final-gate.js";

export interface StopCheckResult { decision?: "block"; reason?: string; continue?: boolean }
export async function stopCheckLongTask(workdir: string, lastAssistantMessage: string): Promise<StopCheckResult> {
  const contract = await readCompiledLongTaskContract(workdir); let result: FinalResultV2 | undefined; try { result = JSON.parse(await readFile(path.join(workdir, "final-result.json"), "utf8")) as FinalResultV2; } catch { return block("Final gate has not produced a trusted result. Run final-gate and continue implementation."); }
  if (result.schema_version !== "long-task-final-result-v2" || result.contract_sha256 !== contract.contract_sha256 || result.atomic_write_complete !== true) return block("Final result is stale or invalid; rerun final-gate.");
  const current = await hashLongTaskWorkspace(contract.repository_root, contract); if (current !== result.final_snapshot_sha256 || current !== result.workspace_hash_after) return block("Workspace changed after final verification; rerun final-gate.");
  if (result.workflow_status === "accepted") { const fresh = await runLongTaskFinalGate(workdir); if (fresh.workflow_status !== "accepted") return block(fresh.findings[0]?.next_action ?? "Stop-time full verification no longer accepts the workspace."); return {}; }
  if (result.workflow_status === "externally_blocked") { const fresh = await runLongTaskFinalGate(workdir); if (fresh.workflow_status !== "externally_blocked") return block(fresh.findings[0]?.next_action ?? "External blocker could not be reproduced by the frozen verifier."); result = fresh; if (!result.external_blocker?.minimal_user_action) return block("External blocker result is missing trusted minimal user action; rerun final-gate."); if (/\b(?:done|completed|accepted)\b|完成|已完成|验收通过/i.test(lastAssistantMessage)) return block("A blocked reply cannot claim completion or acceptance."); if (!/block|阻塞|需要用户/i.test(lastAssistantMessage) || !lastAssistantMessage.includes(result.external_blocker.minimal_user_action)) return block(`Report only the external blocker and this minimal user action: ${result.external_blocker.minimal_user_action}`); return {}; }
  return block(result.findings[0]?.next_action ?? "Final verification needs work; continue implementation.");
}
function block(reason: string): StopCheckResult { return { decision: "block", reason, continue: true }; }
