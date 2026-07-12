import path from "node:path";
import { readAuthoritativeLongTaskContract, longTaskHostService } from "./long-task-host-client.js";
import { hashLongTaskWorkspace } from "./long-task-snapshot.js";
import { runLongTaskFinalGate, type LongTaskFinalGateOptionsV3 } from "./long-task-final-gate.js";
import { readCanonicalJsonV3 } from "./long-task-durable-json.js";
import { assertFinalResultEnvelopeShapeV3 } from "./long-task-final-envelope.js";
import { verifyLongTaskFinalTraceV3, type LongTaskFinalTraceV3 } from "./long-task-final-steps.js";
import { assertLongTaskFinalMapsCompleteV3 } from "./long-task-result-projector.js";
import type { FinalResultEnvelopeV3 } from "./long-task-run-result.js";

export interface StopCheckResult { decision?:"block";reason?:string;continue?:boolean }

export async function stopCheckLongTask(workdir:string,lastAssistantMessage:string,options:LongTaskFinalGateOptionsV3={}):Promise<StopCheckResult>{
  const contract=options.contract??(await readAuthoritativeLongTaskContract(workdir)).contract;const service=options.host_service??await longTaskHostService(contract.repository_root);let envelope:FinalResultEnvelopeV3;let trace:LongTaskFinalTraceV3;
  try{const finalFile=await readCanonicalJsonV3<FinalResultEnvelopeV3>(path.join(workdir,"final-result.json"));envelope=finalFile.value;assertFinalResultEnvelopeShapeV3(envelope);if(envelope.payload.contract_sha256!==contract.contract_sha256)throw new Error("copied_result_rejected:contract");assertLongTaskFinalMapsCompleteV3(contract,envelope.payload);const current=await hashLongTaskWorkspace(contract.repository_root,contract);if(current!==envelope.payload.final_snapshot_sha256||current!==envelope.payload.workspace_hash_after)throw new Error("workspace_changed_after_final");const traceFile=await readCanonicalJsonV3<LongTaskFinalTraceV3>(path.join(workdir,"runs",envelope.payload.run_id,"final-trace.json"));trace=traceFile.value;verifyLongTaskFinalTraceV3(trace);await service.verifyCommittedFinalResult(contract.repository_root,workdir,envelope,trace);}catch(error){return block(resultCode(error));}
  if(envelope.payload.workflow_status==="needs_work")return block(envelope.payload.findings[0]?.next_action??"Final verification needs work; continue implementation.");
  const fresh=await runLongTaskFinalGate(workdir,options);if(envelope.payload.workflow_status==="accepted"){if(fresh.workflow_status!=="accepted")return block(fresh.findings[0]?.next_action??"Stop-time full verification no longer accepts the workspace.");return {};}
  if(fresh.workflow_status!=="externally_blocked")return block(fresh.findings[0]?.next_action??"External blocker could not be reproduced by the frozen verifier.");const action=fresh.external_blocker?.minimal_user_action;if(!action)return block("final_result_incomplete:external_blocker_action");if(/\b(?:done|completed|accepted)\b|完成|已完成|验收通过/iu.test(lastAssistantMessage))return block("A blocked reply cannot claim completion or acceptance.");if(!/block|阻塞|需要用户/iu.test(lastAssistantMessage)||!lastAssistantMessage.includes(action))return block(`Report only the external blocker and this minimal user action: ${action}`);return {};
}

function block(reason:string):StopCheckResult{return {decision:"block",reason,continue:true};}
function resultCode(error:unknown):string{const value=error instanceof Error?error.message:String(error);const direct=value.split(":",1)[0];if(/^(?:final_result_incomplete|final_result_hash_mismatch|final_result_signature_invalid|historical_result_rejected|copied_result_rejected|forged_result_rejected|workspace_changed_after_final|final_gate_sequence_invalid)$/u.test(direct))return value;return `final_result_incomplete:${direct||"unknown"}`;}
