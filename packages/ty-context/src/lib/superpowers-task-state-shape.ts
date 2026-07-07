import { isRecord, type SuperpowersTaskState } from "./superpowers-task-state-schema.js";

export function validateShape(state: SuperpowersTaskState, errors: string[]): void {
  if (state.meta?.schema_version !== "superpowers-task-state-v1") {
    errors.push("task-state.json schema_version must be superpowers-task-state-v1");
  }
  for (const key of [
    "meta",
    "sources",
    "context",
    "delivery",
    "graph",
    "attempts",
    "current_attempt_id",
    "required_command_specs",
    "command_runs",
    "negative_evidence_records",
    "slices",
    "evidence",
    "gates",
    "progress",
    "blockers",
    "final"
  ]) {
    if (!(key in (state as unknown as Record<string, unknown>))) {
      errors.push(`task-state.json is missing section: ${key}`);
    }
  }
}

export function hasUsableShape(state: SuperpowersTaskState): boolean {
  const candidate = state as unknown as Record<string, unknown>;
  return (
    isRecord(candidate.meta) &&
    isRecord(candidate.sources) &&
    isRecord(candidate.context) &&
    isRecord(candidate.delivery) &&
    isRecord(candidate.graph) &&
    isRecord(candidate.graph.plan_items) &&
    isRecord(candidate.graph.acceptance_criteria) &&
    isRecord(candidate.graph.proof_layers) &&
    Array.isArray(candidate.attempts) &&
    typeof candidate.current_attempt_id === "string" &&
    Array.isArray(candidate.required_command_specs) &&
    Array.isArray(candidate.command_runs) &&
    Array.isArray(candidate.negative_evidence_records) &&
    Array.isArray(candidate.slices) &&
    Array.isArray(candidate.evidence) &&
    isRecord(candidate.gates) &&
    isRecord(candidate.progress) &&
    Array.isArray(candidate.blockers) &&
    isRecord(candidate.final)
  );
}
