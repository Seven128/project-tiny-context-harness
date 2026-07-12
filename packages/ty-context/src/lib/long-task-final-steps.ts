import { canonicalJson, sha256Hex } from "./composite-campaign-codec.js";

export const LONG_TASK_FINAL_STEP_IDS = [
  "host_registry_read",
  "compiled_contract_read",
  "source_context_freshness",
  "oracle_closure_freshness",
  "trusted_tool_identity",
  "final_source_snapshot",
  "dependency_layers",
  "real_specs",
  "environment_probes",
  "binding_evaluation",
  "counterfactual_controls",
  "proof_projection",
  "ac_projection",
  "obligation_projection",
  "plan_item_projection",
  "requirement_projection",
  "negative_evidence",
  "population_validation",
  "workspace_stability",
  "durable_result_commit"
] as const;

export type LongTaskFinalStepIdV3 = typeof LONG_TASK_FINAL_STEP_IDS[number];
export type LongTaskFinalStepStatusV3 = "passed" | "failed" | "skipped";

export interface LongTaskFinalStepTraceEntryV3 {
  index: number;
  step_id: LongTaskFinalStepIdV3;
  status: LongTaskFinalStepStatusV3;
  started_at: string;
  finished_at: string;
  finding_codes: string[];
  evidence_refs: string[];
}

export interface LongTaskFinalTraceV3 {
  schema_version: "long-task-final-trace-v3";
  result_id: string;
  registry_id: string;
  contract_sha256: string;
  run_id: string;
  steps: LongTaskFinalStepTraceEntryV3[];
  trace_sha256: string;
}

export function createLongTaskFinalTraceV3(input: Omit<LongTaskFinalTraceV3, "schema_version" | "trace_sha256">): LongTaskFinalTraceV3 {
  const unsigned = { schema_version: "long-task-final-trace-v3" as const, ...input };
  assertLongTaskFinalTraceSequenceV3(unsigned.steps);
  return { ...unsigned, trace_sha256: sha256Hex(canonicalJson(unsigned)) };
}

export function assertLongTaskFinalTraceSequenceV3(steps: LongTaskFinalStepTraceEntryV3[]): void {
  if (steps.length !== LONG_TASK_FINAL_STEP_IDS.length) throw new Error("final_gate_sequence_invalid:length");
  for (let index = 0; index < LONG_TASK_FINAL_STEP_IDS.length; index += 1) {
    const step = steps[index];
    if (!step || step.index !== index + 1 || step.step_id !== LONG_TASK_FINAL_STEP_IDS[index] || step.status === "skipped") throw new Error(`final_gate_sequence_invalid:${index + 1}`);
  }
}

export function verifyLongTaskFinalTraceV3(value: LongTaskFinalTraceV3): void {
  if (value.schema_version !== "long-task-final-trace-v3") throw new Error("final_gate_sequence_invalid:schema");
  const { trace_sha256, ...unsigned } = value;
  if (sha256Hex(canonicalJson(unsigned)) !== trace_sha256) throw new Error("final_gate_sequence_invalid:hash");
  assertLongTaskFinalTraceSequenceV3(value.steps);
}
