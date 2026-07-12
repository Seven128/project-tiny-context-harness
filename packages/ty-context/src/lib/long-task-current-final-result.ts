import path from "node:path";
import { readCompiledLongTaskContract } from "./long-task-contract-compiler.js";
import { readCanonicalJsonV3 } from "./long-task-durable-json.js";
import { assertFinalResultEnvelopeShapeV3 } from "./long-task-final-envelope.js";
import { verifyLongTaskFinalTraceV3, type LongTaskFinalTraceV3 } from "./long-task-final-steps.js";
import { assertLongTaskFinalMapsCompleteV3 } from "./long-task-result-projector.js";
import type { FinalResultEnvelopeV3, FinalResultPayloadV3 } from "./long-task-run-result.js";

export interface CurrentFinalResultFilesV3 {
  contract_sha256: string;
  payload: FinalResultPayloadV3;
  envelope: FinalResultEnvelopeV3;
  trace: LongTaskFinalTraceV3;
  envelope_sha256: string;
}

export async function readCurrentLongTaskFinalResultFilesV3(workdir: string): Promise<CurrentFinalResultFilesV3> {
  const contract = await readCompiledLongTaskContract(workdir);
  const finalFile = await readCanonicalJsonV3<FinalResultEnvelopeV3>(path.join(workdir, "final-result.json"));
  const envelope = finalFile.value;
  assertFinalResultEnvelopeShapeV3(envelope);
  if (envelope.payload.contract_sha256 !== contract.contract_sha256) throw new Error("copied_result_rejected:contract");
  assertLongTaskFinalMapsCompleteV3(contract, envelope.payload);
  const trace = (await readCanonicalJsonV3<LongTaskFinalTraceV3>(path.join(workdir, "runs", envelope.payload.run_id, "final-trace.json"))).value;
  verifyLongTaskFinalTraceV3(trace);
  if (trace.result_id !== envelope.payload.result_id || trace.registry_id !== envelope.payload.registry_id || trace.contract_sha256 !== contract.contract_sha256 || trace.run_id !== envelope.payload.run_id) throw new Error("final_result_incomplete:trace_identity");
  return { contract_sha256: contract.contract_sha256, payload: envelope.payload, envelope, trace, envelope_sha256: finalFile.sha256 };
}

export async function readCurrentLongTaskFinalResultV3(workdir: string): Promise<FinalResultPayloadV3> {
  const current = await readCurrentLongTaskFinalResultFilesV3(workdir);
  const { longTaskHostService } = await import("./long-task-host-client.js");
  const contract = await readCompiledLongTaskContract(workdir);
  await (await longTaskHostService(contract.repository_root)).verifyCommittedFinalResult(contract.repository_root, workdir, current.envelope, current.trace);
  if (!terminal(current.payload.workflow_status)) throw new Error("final_result_not_terminal");
  return current.payload;
}

export function assertCurrentFinalMatchesRegistryV3(current: CurrentFinalResultFilesV3, registry: { contract_sha256?: unknown; terminal_result?: unknown }): FinalResultPayloadV3 {
  const terminalResult = registry.terminal_result as Record<string, unknown> | null;
  const payload = current.payload;
  if (registry.contract_sha256 !== current.contract_sha256 || !terminalResult || terminalResult.result_id !== payload.result_id || terminalResult.payload_sha256 !== current.envelope.integrity.payload_sha256 || terminalResult.envelope_sha256 !== current.envelope_sha256 || terminalResult.trace_sha256 !== current.trace.trace_sha256 || terminalResult.workflow_status !== payload.workflow_status || !terminal(payload.workflow_status)) throw new Error("historical_result_rejected:host_latest");
  return payload;
}

function terminal(value: string): boolean { return value === "accepted" || value === "externally_blocked"; }
