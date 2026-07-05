export const PRODUCT_FIELDS = [
  "delivery_scope",
  "full_population_required",
  "representative_samples_validate",
  "representative_samples_do_not_validate",
  "out_of_scope_backlog",
  "scope_fit_decision",
  "selected_scope_fit_slice",
  "owner_boundary",
  "primary_capability_path",
  "non_completing_outcomes",
  "assertion_policy",
  "source_authority",
  "product_goal",
  "surface_ia_lock",
  "decision_lock",
  "context_delta",
  "source_to_context_coverage",
  "acceptance_semantics",
  "impact"
] as const;

export const PLAN_FIELDS = [
  "delivery_scope",
  "capability_target",
  "representative_samples",
  "full_population_boundary",
  "non_required_population",
  "owner_surfaces",
  "forbidden_surfaces",
  "owner_boundary",
  "primary_capability_path",
  "trigger_contract",
  "state_transition_contract",
  "observable_result_contract",
  "assertion_support",
  "required_assertion_commands",
  "invalid_implementation_shortcuts",
  "implementation_paths",
  "required_tests",
  "related_acs",
  "requirement_ref",
  "decision_id",
  "proof_layer_ids",
  "api_schema_changes",
  "state_machine",
  "data_flow",
  "worker_runtime_behavior",
  "ui_ia_changes",
  "migration_plan",
  "evidence_artifacts",
  "explicit_no_test_scope",
  "non_completing_shortcuts",
  "substitution_policy",
  "drift_severity",
  "partial_conditions",
  "blockers",
  "context_fact_refs"
] as const;

export const ACCEPTANCE_FIELDS = [
  "acceptance_scope",
  "ac_validates",
  "ac_does_not_validate",
  "sample_boundary",
  "full_population_required",
  "related_plan_items",
  "required_proof_layers",
  "assertion_command",
  "assertion_artifacts",
  "positive_assertions",
  "negative_assertions",
  "machine_blocking",
  "invalid_completion_signals",
  "assertion_result_required",
  "ac_type",
  "proof_chain",
  "verification_method",
  "fail_conditions",
  "invalid_evidence",
  "substitution_policy",
  "missing_layer_downgrade",
  "auditor_expectation",
  "out_of_scope_na_approval_source",
  "required_test_ids",
  "explicit_no_test_scope",
  "hard_blockers",
  "validates_explanation",
  "does_not_validate_explanation",
  "final_evidence_expected",
  "test_cases"
] as const;

export const PRODUCT_REQUIRED_FIELDS = [
  "delivery_scope",
  "full_population_required",
  "representative_samples_validate",
  "representative_samples_do_not_validate",
  "out_of_scope_backlog",
  "scope_fit_decision",
  "selected_scope_fit_slice",
  "owner_boundary",
  "primary_capability_path",
  "non_completing_outcomes",
  "assertion_policy",
  "source_authority",
  "product_goal"
] as const;

export const PLAN_REQUIRED_FIELDS = [
  "delivery_scope",
  "capability_target",
  "representative_samples",
  "full_population_boundary",
  "non_required_population",
  "owner_boundary",
  "primary_capability_path",
  "trigger_contract",
  "state_transition_contract",
  "observable_result_contract",
  "assertion_support",
  "required_assertion_commands",
  "invalid_implementation_shortcuts",
  "implementation_paths"
] as const;

export const ACCEPTANCE_REQUIRED_FIELDS = [
  "acceptance_scope",
  "ac_validates",
  "ac_does_not_validate",
  "sample_boundary",
  "full_population_required",
  "related_plan_items",
  "required_proof_layers",
  "assertion_command",
  "assertion_artifacts",
  "positive_assertions",
  "negative_assertions",
  "machine_blocking",
  "invalid_completion_signals",
  "assertion_result_required"
] as const;

type FieldType = "array" | "boolean" | "enum" | "text";

export const PRODUCT_FIELD_TYPES: Record<(typeof PRODUCT_FIELDS)[number], FieldType> = {
  delivery_scope: "enum",
  full_population_required: "boolean",
  representative_samples_validate: "array",
  representative_samples_do_not_validate: "array",
  out_of_scope_backlog: "array",
  scope_fit_decision: "enum",
  selected_scope_fit_slice: "text",
  owner_boundary: "text",
  primary_capability_path: "text",
  non_completing_outcomes: "array",
  assertion_policy: "text",
  source_authority: "text",
  product_goal: "text",
  surface_ia_lock: "text",
  decision_lock: "text",
  context_delta: "text",
  source_to_context_coverage: "text",
  acceptance_semantics: "text",
  impact: "text"
};

export const PLAN_FIELD_TYPES: Record<(typeof PLAN_FIELDS)[number], FieldType> = {
  delivery_scope: "enum",
  capability_target: "text",
  representative_samples: "array",
  full_population_boundary: "text",
  non_required_population: "array",
  owner_surfaces: "array",
  forbidden_surfaces: "array",
  owner_boundary: "text",
  primary_capability_path: "text",
  trigger_contract: "text",
  state_transition_contract: "text",
  observable_result_contract: "text",
  assertion_support: "text",
  required_assertion_commands: "array",
  invalid_implementation_shortcuts: "array",
  implementation_paths: "array",
  required_tests: "array",
  related_acs: "array",
  requirement_ref: "text",
  decision_id: "text",
  proof_layer_ids: "array",
  api_schema_changes: "text",
  state_machine: "text",
  data_flow: "text",
  worker_runtime_behavior: "text",
  ui_ia_changes: "text",
  migration_plan: "text",
  evidence_artifacts: "array",
  explicit_no_test_scope: "boolean",
  non_completing_shortcuts: "array",
  substitution_policy: "array",
  drift_severity: "text",
  partial_conditions: "array",
  blockers: "array",
  context_fact_refs: "array"
};

export const ACCEPTANCE_FIELD_TYPES: Record<(typeof ACCEPTANCE_FIELDS)[number], FieldType> = {
  acceptance_scope: "enum",
  ac_validates: "array",
  ac_does_not_validate: "array",
  sample_boundary: "text",
  full_population_required: "boolean",
  related_plan_items: "array",
  required_proof_layers: "array",
  assertion_command: "text",
  assertion_artifacts: "array",
  positive_assertions: "array",
  negative_assertions: "array",
  machine_blocking: "boolean",
  invalid_completion_signals: "array",
  assertion_result_required: "boolean",
  ac_type: "text",
  proof_chain: "array",
  verification_method: "array",
  fail_conditions: "array",
  invalid_evidence: "array",
  substitution_policy: "array",
  missing_layer_downgrade: "text",
  auditor_expectation: "text",
  out_of_scope_na_approval_source: "text",
  required_test_ids: "array",
  explicit_no_test_scope: "boolean",
  hard_blockers: "array",
  validates_explanation: "text",
  does_not_validate_explanation: "text",
  final_evidence_expected: "array",
  test_cases: "array"
};

export const PRODUCT_DELIVERY_SCOPES: Set<string> = new Set([
  "system_capability_build", "representative_sample_validation", "full_population_operation", "mixed_scope_requires_boundary"
]);
export const PLAN_DELIVERY_SCOPES: Set<string> = new Set([
  "system_capability_build", "representative_sample_validation", "full_population_operation", "out_of_scope_backlog"
]);
export const ACCEPTANCE_SCOPES: Set<string> = new Set([
  "system_capability_build", "representative_sample_validation", "full_population_operation", "full_population_not_required"
]);
export const SCOPE_FIT_DECISIONS: Set<string> = new Set(["fit_for_three_inputs", "selected_from_split", "blocked_for_decision"]);

export const CANONICAL_PROOF_LAYERS = [
  "code",
  "api_schema",
  "worker_runtime",
  "data_artifact",
  "integration",
  "ui_browser",
  "security_redaction",
  "all_provider_all_runner",
  "cleanup_stale_scan",
  "test"
] as const;

export const LEGACY_PROOF_LAYER_ALIASES: Record<string, string> = {
  runtime: "worker_runtime",
  browser: "ui_browser",
  api: "api_schema",
  data: "data_artifact",
  security: "security_redaction"
};

export const MACHINE_VERIFIABLE_LAYER_NAMES: Set<string> = new Set(CANONICAL_PROOF_LAYERS.filter((layer) => layer !== "code"));

export function fieldSet(fields: readonly string[]): Set<string> {
  return new Set(fields);
}

export function normalizeProofLayerName(layer: string): string {
  const normalized = layer.trim().toLowerCase().replace(/[- ]+/g, "_");
  return LEGACY_PROOF_LAYER_ALIASES[normalized] ?? normalized;
}

export function normalizeProofLayerId(layerId: string): string {
  const value = layerId.trim();
  if (!value.includes(".")) {
    return normalizeProofLayerName(value);
  }
  const acId = value.slice(0, value.lastIndexOf("."));
  const layer = value.slice(value.lastIndexOf(".") + 1);
  return `${acId}.${normalizeProofLayerName(layer)}`;
}

export function isSelectedScopeFitSlice(value: string): boolean {
  return value === "none" || /^SFC-\d{3,}$/i.test(value);
}
