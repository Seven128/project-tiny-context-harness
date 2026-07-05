export const SUPERPOWERS_TASK_STATE_SCHEMA_VERSION = "superpowers-task-state-v1";
export const SUPERPOWERS_TASK_STATE_JSON_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://project-tiny-context-harness.local/superpowers-task-state.schema.json",
  title: "Superpowers Long-Task State",
  type: "object",
  required: ["meta", "sources", "context", "delivery", "graph", "slices", "evidence", "gates", "progress", "blockers", "final"],
  properties: {
    meta: {
      type: "object",
      required: ["task_id", "plan_slug", "created_at", "updated_at", "schema_version", "product_goal_complete", "acceptance_target_status"],
      properties: {
        schema_version: { const: SUPERPOWERS_TASK_STATE_SCHEMA_VERSION },
        product_goal_complete: { type: "boolean" },
        acceptance_target_status: { type: "string" }
      }
    },
    sources: { type: "object" },
    context: { type: "object" },
    delivery: { type: "object" },
    graph: { type: "object" },
    slices: { type: "array" },
    evidence: { type: "array" },
    gates: { type: "object" },
    progress: { type: "object" },
    blockers: { type: "array" },
    final: { type: "object" }
  }
} as const;

export type SuperpowersProofLayerStatus = "missing" | "satisfied" | "invalidated" | "blocked";
export type SuperpowersPlanItemStatus =
  | "not_started"
  | "in_progress"
  | "complete"
  | "partial"
  | "blocked"
  | "invalidated"
  | "out_of_scope_NA";
export type SuperpowersAcceptanceStatus = "not_run" | "complete" | "partial" | "blocked" | "invalidated" | "out_of_scope_NA";
export type SuperpowersProductDeliveryScope =
  | "system_capability_build"
  | "representative_sample_validation"
  | "full_population_operation"
  | "mixed_scope_requires_boundary";
export type SuperpowersPlanDeliveryScope =
  | "system_capability_build"
  | "representative_sample_validation"
  | "full_population_operation"
  | "out_of_scope_backlog";
export type SuperpowersAcceptanceScope =
  | "system_capability_build"
  | "representative_sample_validation"
  | "full_population_operation"
  | "full_population_not_required";

export interface SuperpowersTaskState {
  meta: {
    task_id: string;
    plan_slug: string;
    created_at: string;
    updated_at: string;
    schema_version: typeof SUPERPOWERS_TASK_STATE_SCHEMA_VERSION;
    goal_type: string;
    product_goal_complete: boolean;
    acceptance_target_status: string;
    audit_task_complete: boolean;
  };
  sources: Record<string, SuperpowersSourceRecord>;
  context: {
    product_context_delta: "none" | "required";
    technical_context_delta: "none" | "required";
    source_to_context_coverage: Record<string, unknown>[];
    context_to_implementation_binding: Record<string, unknown>[];
  };
  delivery: SuperpowersDeliveryState;
  graph: {
    plan_items: Record<string, SuperpowersPlanItem>;
    acceptance_criteria: Record<string, SuperpowersAcceptanceCriterion>;
    proof_layers: Record<string, SuperpowersProofLayer>;
    edges: SuperpowersGraphEdge[];
  };
  slices: SuperpowersSliceRecord[];
  evidence: SuperpowersEvidenceRecord[];
  gates: Record<string, unknown>;
  progress: SuperpowersProgressState;
  blockers: unknown[];
  final: {
    product_goal_complete: boolean;
    acceptance_target_status: string;
    audit_task_complete: boolean;
    completion_basis: string[];
    next_required_actions?: string[];
  };
}

export interface SuperpowersSourceRecord {
  path: string;
  sha256: string;
  authority: string;
}

export interface SuperpowersDeliveryState {
  product_architecture_scope: SuperpowersProductArchitectureScope;
  scope_conflicts: string[];
}

export interface SuperpowersProductArchitectureScope {
  delivery_scope: SuperpowersProductDeliveryScope | "";
  full_population_required: boolean | null;
  representative_samples_validate: string[];
  representative_samples_do_not_validate: string[];
  out_of_scope_backlog: string[];
}

export interface SuperpowersProgressState {
  system_capability_progress: Record<string, unknown>;
  representative_sample_progress: Record<string, unknown>;
  real_object_coverage: Record<string, unknown>;
  full_population_operation_progress: Record<string, unknown>;
  [key: string]: unknown;
}

export interface SuperpowersPlanItem {
  requirement: string;
  source_file: string;
  source_start_line: number;
  source_end_line: number;
  delivery_scope: SuperpowersPlanDeliveryScope | "";
  capability_target: string;
  representative_samples: string[];
  full_population_boundary: string;
  non_required_population: string[];
  owner_surfaces: string[];
  forbidden_surfaces: string[];
  implementation_paths: string[];
  required_tests: string[];
  proof_layer_ids?: string[];
  non_completing_shortcuts?: string[];
  substitution_policy?: string[];
  explicit_no_test_scope?: boolean;
  context_fact_refs?: string[];
  status: SuperpowersPlanItemStatus;
  related_acs: string[];
  required_proof_layers: string[];
}

export interface SuperpowersAcceptanceCriterion {
  scope: string;
  source_file: string;
  source_start_line: number;
  source_end_line: number;
  acceptance_scope: SuperpowersAcceptanceScope | "";
  ac_validates: string[];
  ac_does_not_validate: string[];
  sample_boundary: string;
  full_population_required: boolean | null;
  related_plan_items: string[];
  required_proof_layers: string[];
  assertion_requirements?: AssertionRequirement[];
  required_test_ids?: string[];
  fail_conditions?: string[];
  invalid_evidence?: string[];
  final_evidence_expected?: string[];
  explicit_no_test_scope?: boolean;
  status: SuperpowersAcceptanceStatus;
}

export interface AssertionRequirement {
  proof_layer: string;
  required: boolean;
  machine_blocking: boolean;
  required_test_ids: string[];
  positive_assertions: string[];
  negative_assertions: string[];
}

export interface SuperpowersProofLayer {
  required: boolean;
  status: SuperpowersProofLayerStatus;
  evidence_ids: string[];
}

export interface SuperpowersGraphEdge {
  from: string;
  to: string;
  type: "supports" | string;
}

export interface SuperpowersSliceRecord {
  slice_id: string;
  slice_goal: string;
  touched_plan_items: string[];
  touched_acs: string[];
  missing_layer_classes?: string[];
  code_changes: string[];
  evidence_records: string[];
  closed_layers: string[];
  remaining_layers: string[];
  blockers: unknown[];
  cleanup_assertions: string[];
  progress_value: {
    type: string;
    closed_items: string[];
    why_it_reduces_rework: string;
  };
}

export interface SuperpowersEvidenceRecord {
  evidence_id: string;
  slice_id: string;
  type: string;
  freshness: {
    created_at: string;
    valid_for: string;
    stale_after: string | null;
  };
  command?: string;
  command_exit_code?: number;
  artifact_paths: string[];
  proves: string[];
  does_not_prove: string[];
  redaction: {
    checked: boolean;
    contains_secret: boolean;
  };
  reviewability: {
    external_reviewer_can_reproduce: boolean;
    reproduction_steps: string;
  };
  assertion_result?: AssertionResult;
  negative_evidence_scan?: NegativeEvidenceScan;
  sibling_substitution_used?: boolean;
  sibling_substitution_approval_source?: string;
}

export interface AssertionResult {
  schema_version: "assertion-result-v1";
  status: "passed" | "failed" | "blocked" | "stale";
  runner: string;
  exit_code: number;
  target_ac_ids: string[];
  target_proof_layers: string[];
  owner_surface?: string;
  route?: string;
  action?: string;
  positive_assertions: AssertionCheck[];
  negative_assertions: AssertionCheck[];
  artifacts?: string[];
}

export interface AssertionCheck {
  id: string;
  status: "passed" | "failed" | "blocked" | "stale";
  actual?: string;
  expected?: string;
  forbidden_text?: string;
}

export interface NegativeEvidenceScan {
  schema_version: "negative-evidence-scan-v1";
  status: "passed" | "failed" | "blocked" | "stale";
  target_ac_ids: string[];
  owner_surface?: string;
  route?: string;
  forbidden_findings: NegativeFinding[];
  required_findings: AssertionCheck[];
  artifacts: string[];
}

export interface NegativeFinding {
  id: string;
  status: "found" | "not_found";
  forbidden_text?: string;
  actual?: string;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(asStringArray);
  }
  if (value === undefined || value === null) {
    return [];
  }
  return String(value)
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}
