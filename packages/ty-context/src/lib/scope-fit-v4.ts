import { parseStrictJson } from "./composite-campaign-codec.js";
import type {
  GlobalConstraintV3,
  ScopeDecisionRequiredV3,
  ScopeFitDecisionV3,
  ScopeFitResultV3,
  ScopeSliceV3,
} from "./composite-campaign-schema-v4.js";

export const SCOPE_FIT_SCHEMA_V4 = "scope-fit-result-v4" as const;
export const SOURCE_UNIT_KINDS = [
  "ui_control",
  "route",
  "api_operation",
  "state_transition",
  "worker_action",
  "data_schema",
  "security_rule",
  "cli_command",
  "migration",
  "integration_contract",
] as const;
export const SEPARATION_REASONS_V4 = [
  "independent_acceptance_outcome",
  "semantic_dependency",
  "different_owner_or_authority",
  "separate_rollout_or_rollback",
  "unresolved_product_decision",
  "authoring_capacity_exceeded",
] as const;

export type SourceUnitKindV4 = (typeof SOURCE_UNIT_KINDS)[number];
export type SeparationReasonV4 = (typeof SEPARATION_REASONS_V4)[number];
export type CapacityEvidenceKindV4 =
  | "output_truncated"
  | "structured_output_failed"
  | "two_repairs_failed"
  | "file_limit_exceeded"
  | "incomplete_unit_mapping";

export interface SourceUnitV4 {
  unit_id: string;
  kind: SourceUnitKindV4;
  statement: string;
  cohesion_key: string;
  owner_boundary: string;
  acceptance_outcome: string;
  source_refs: string[];
  details: Record<string, string>;
}

export interface AuthoringCapacityEvidenceV4 {
  kind: CapacityEvidenceKindV4;
  attempts: number;
  evidence: string;
}

export interface ScopeSliceV4 extends ScopeSliceV3 {
  source_unit_refs: string[];
  separation_reasons: SeparationReasonV4[];
  authoring_capacity_evidence?: AuthoringCapacityEvidenceV4[];
  migration_sequences?: string[];
  generated_artifacts?: string[];
  package_manager_manifests?: string[];
  environment_profiles?: string[];
}

export interface ScopeFitResultV4 extends Omit<
  ScopeFitResultV3,
  "schema_version" | "slices"
> {
  schema_version: typeof SCOPE_FIT_SCHEMA_V4;
  granularity_contract: {
    unit: "control_or_capability_unit";
    slice_policy: "maximal_coherent_authorable_scope";
    parallelism_must_not_force_split: true;
  };
  source_units: SourceUnitV4[];
  slices: ScopeSliceV4[];
}

export function parseScopeFitResultV4(content: string): ScopeFitResultV4 {
  return assertScopeFitResultV4(parseStrictJson(content));
}

export function assertScopeFitResultV4(value: unknown): ScopeFitResultV4 {
  const root = object(value, "scope-fit-result-v4");
  exact(
    root,
    [
      "schema_version",
      "request_sha256",
      "decision",
      "campaign_goal",
      "granularity_contract",
      "source_units",
      "global_constraints",
      "slices",
    ],
    ["rationale", "decision_required"],
  );
  if (root.schema_version !== SCOPE_FIT_SCHEMA_V4)
    invalid(`expected_${SCOPE_FIT_SCHEMA_V4}`);
  sha(root.request_sha256, "request_sha256");
  oneOf(
    root.decision,
    [
      "fit_for_three_inputs",
      "split_required",
      "blocked_for_decision",
      "not_long_task",
    ],
    "decision",
  );
  text(root.campaign_goal, "campaign_goal");
  if (root.rationale !== undefined) strings(root.rationale, "rationale");
  granularity(root.granularity_contract);
  const units = list(root.source_units, "source_units");
  units.forEach((item, index) => sourceUnit(item, index));
  unique(
    (units as SourceUnitV4[]).map((unit) => unit.unit_id),
    "source_unit_id",
  );
  list(root.global_constraints, "global_constraints").forEach((item, index) =>
    globalConstraint(item, index),
  );
  const slices = list(root.slices, "slices");
  slices.forEach((item, index) => scopeSlice(item, index));
  if (root.decision_required !== undefined && root.decision_required !== null)
    decisionRequired(root.decision_required);
  const result = root as unknown as ScopeFitResultV4;
  decisionShape(result);
  validateUnitOwnership(result);
  return result;
}

function sourceUnit(value: unknown, index: number): void {
  const row = object(value, `source_units[${index}]`);
  exact(row, [
    "unit_id",
    "kind",
    "statement",
    "cohesion_key",
    "owner_boundary",
    "acceptance_outcome",
    "source_refs",
    "details",
  ]);
  prefixed(row.unit_id, "SRCU", `${index}.unit_id`);
  oneOf(row.kind, SOURCE_UNIT_KINDS, `${index}.kind`);
  text(row.statement, `${index}.statement`);
  stable(row.cohesion_key, `${index}.cohesion_key`);
  text(row.owner_boundary, `${index}.owner_boundary`);
  text(row.acceptance_outcome, `${index}.acceptance_outcome`);
  ids(row.source_refs, "SRC", `${index}.source_refs`, true);
  const details = object(row.details, `${index}.details`);
  const required = requiredDetailFields(row.kind as SourceUnitKindV4);
  exact(details, required);
  for (const field of required)
    text(details[field], `${index}.details.${field}`);
}

function scopeSlice(value: unknown, index: number): void {
  const row = object(value, `slices[${index}]`);
  exact(
    row,
    [
      "slice_id",
      "stable_key",
      "title",
      "objective",
      "depends_on",
      "priority",
      "source_refs",
      "source_unit_refs",
      "scope_summary",
      "out_of_scope",
      "separation_reasons",
      "produces_contracts",
      "consumes_contracts",
      "conflict_domains",
      "resource_locks",
    ],
    [
      "authoring_capacity_evidence",
      "migration_sequences",
      "generated_artifacts",
      "package_manager_manifests",
      "environment_profiles",
    ],
  );
  prefixed(row.slice_id, "SFC", `${index}.slice_id`);
  stable(row.stable_key, `${index}.stable_key`);
  text(row.title, `${index}.title`);
  text(row.objective, `${index}.objective`);
  ids(row.depends_on, "SFC", `${index}.depends_on`);
  integer(row.priority, `${index}.priority`, 0);
  ids(row.source_refs, "SRC", `${index}.source_refs`, true);
  ids(row.source_unit_refs, "SRCU", `${index}.source_unit_refs`, true);
  strings(row.scope_summary, `${index}.scope_summary`);
  strings(row.out_of_scope, `${index}.out_of_scope`);
  enums(
    row.separation_reasons,
    SEPARATION_REASONS_V4,
    `${index}.separation_reasons`,
  );
  tokens(row.produces_contracts, `${index}.produces_contracts`);
  tokens(row.consumes_contracts, `${index}.consumes_contracts`);
  tokens(row.conflict_domains, `${index}.conflict_domains`);
  tokens(row.resource_locks, `${index}.resource_locks`);
  for (const field of [
    "migration_sequences",
    "generated_artifacts",
    "package_manager_manifests",
    "environment_profiles",
  ] as const)
    if (row[field] !== undefined) tokens(row[field], `${index}.${field}`);
  if (row.authoring_capacity_evidence !== undefined)
    list(
      row.authoring_capacity_evidence,
      `${index}.authoring_capacity_evidence`,
    ).forEach((item, evidenceIndex) =>
      capacityEvidence(
        item,
        `${index}.authoring_capacity_evidence[${evidenceIndex}]`,
      ),
    );
  const reasons = row.separation_reasons as SeparationReasonV4[];
  const evidence = (row.authoring_capacity_evidence ??
    []) as AuthoringCapacityEvidenceV4[];
  if (reasons.includes("authoring_capacity_exceeded") && !evidence.length)
    invalid(`capacity_evidence_missing:${String(row.slice_id)}`);
  if (!reasons.includes("authoring_capacity_exceeded") && evidence.length)
    invalid(`capacity_reason_missing:${String(row.slice_id)}`);
}

function requiredDetailFields(kind: SourceUnitKindV4): string[] {
  if (kind === "ui_control")
    return [
      "owner_surface",
      "route_or_location",
      "control",
      "trigger_or_action",
      "input",
      "loading_state",
      "empty_state",
      "success_state",
      "failure_state",
      "state_transition",
      "observable_feedback",
      "api_or_data_dependency",
      "permission_boundary",
      "acceptance_evidence",
    ];
  if (kind === "api_operation")
    return [
      "endpoint",
      "method",
      "request_schema",
      "response_schema",
      "validation",
      "error_semantics",
      "authorization",
      "state_effect",
      "caller",
      "acceptance_evidence",
    ];
  if (kind === "state_transition" || kind === "worker_action")
    return [
      "trigger",
      "input",
      "state_transition",
      "side_effect",
      "retry",
      "failure",
      "recovery",
      "observable_output",
      "acceptance_evidence",
    ];
  return ["acceptance_evidence"];
}

function decisionShape(result: ScopeFitResultV4): void {
  if (result.decision === "fit_for_three_inputs" && result.slices.length !== 1)
    invalid("fit_requires_one_slice");
  if (result.decision === "split_required" && result.slices.length < 2)
    invalid("split_requires_multiple_slices");
  if (
    result.decision === "not_long_task" &&
    (result.slices.length ||
      result.source_units.length ||
      result.global_constraints.length)
  )
    invalid("not_long_task_not_empty");
  if (result.decision === "blocked_for_decision" && !result.decision_required)
    invalid("decision_required_missing");
  if (result.decision !== "blocked_for_decision" && result.decision_required)
    invalid("unexpected_decision_required");
}

function validateUnitOwnership(scope: ScopeFitResultV4): void {
  const unitIds = new Set(scope.source_units.map((unit) => unit.unit_id));
  const owners = new Map<string, string>();
  for (const slice of scope.slices) {
    if (scope.slices.length > 1 && !slice.separation_reasons.length)
      invalid(`separation_reasons_missing:${slice.slice_id}`);
    for (const unitId of slice.source_unit_refs) {
      if (!unitIds.has(unitId))
        invalid(`unknown_source_unit:${slice.slice_id}:${unitId}`);
      if (owners.has(unitId)) invalid(`source_unit_multiply_owned:${unitId}`);
      owners.set(unitId, slice.slice_id);
    }
  }
  for (const unitId of unitIds)
    if (!owners.has(unitId)) invalid(`source_unit_unassigned:${unitId}`);
}

function granularity(value: unknown): void {
  const row = object(value, "granularity_contract");
  exact(row, ["unit", "slice_policy", "parallelism_must_not_force_split"]);
  if (
    row.unit !== "control_or_capability_unit" ||
    row.slice_policy !== "maximal_coherent_authorable_scope" ||
    row.parallelism_must_not_force_split !== true
  )
    invalid("granularity_contract");
}
function globalConstraint(value: unknown, index: number): void {
  const row = object(value, `global_constraints[${index}]`);
  exact(row, ["constraint_id", "statement", "applies_to"]);
  prefixed(row.constraint_id, "GC", `${index}.constraint_id`);
  text(row.statement, `${index}.statement`);
  ids(row.applies_to, "SFC", `${index}.applies_to`, true);
}
function decisionRequired(value: unknown): void {
  const row = object(value, "decision_required");
  exact(row, ["decision_id", "question", "candidates"]);
  portable(row.decision_id, "decision_id");
  text(row.question, "question");
  ids(row.candidates, "SFC", "candidates", true);
}
function capacityEvidence(value: unknown, label: string): void {
  const row = object(value, label);
  exact(row, ["kind", "attempts", "evidence"]);
  oneOf(
    row.kind,
    [
      "output_truncated",
      "structured_output_failed",
      "two_repairs_failed",
      "file_limit_exceeded",
      "incomplete_unit_mapping",
    ],
    `${label}.kind`,
  );
  integer(row.attempts, `${label}.attempts`, 1);
  text(row.evidence, `${label}.evidence`);
  if (row.kind === "two_repairs_failed" && (row.attempts as number) < 3)
    invalid(`${label}:repairs_less_than_two`);
}
function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    invalid(`${label}_not_object`);
  return value as Record<string, unknown>;
}
function list(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) invalid(`${label}_not_array`);
  return value;
}
function exact(
  row: Record<string, unknown>,
  required: string[],
  optional: string[] = [],
): void {
  for (const key of required)
    if (!Object.hasOwn(row, key)) invalid(`missing_field:${key}`);
  const allowed = new Set([...required, ...optional]);
  for (const key of Object.keys(row))
    if (!allowed.has(key)) invalid(`unknown_field:${key}`);
}
function text(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || !value.trim()) invalid(`${label}_empty`);
}
function strings(value: unknown, label: string): string[] {
  const rows = list(value, label);
  for (const item of rows) text(item, label);
  return rows as string[];
}
function tokens(value: unknown, label: string): string[] {
  const rows = strings(value, label);
  if (new Set(rows).size !== rows.length) invalid(`${label}_duplicate`);
  for (const item of rows)
    if (/\s/u.test(item) || item.length > 300) invalid(`${label}_invalid`);
  return rows;
}
function sha(value: unknown, label: string): void {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/u.test(value))
    invalid(`${label}_invalid`);
}
function portable(value: unknown, label: string): void {
  text(value, label);
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(value))
    invalid(`${label}_invalid`);
}
function stable(value: unknown, label: string): void {
  text(value, label);
  if (!/^[a-z0-9][a-z0-9._-]{0,127}$/u.test(value)) invalid(`${label}_invalid`);
}
function prefixed(value: unknown, prefix: string, label: string): void {
  if (
    typeof value !== "string" ||
    !new RegExp(`^${prefix}-[0-9]{3,}$`, `u`).test(value)
  )
    invalid(`${label}_invalid`);
}
function ids(
  value: unknown,
  prefix: string,
  label: string,
  nonempty = false,
): string[] {
  const rows = list(value, label);
  if (nonempty && !rows.length) invalid(`${label}_empty`);
  for (const item of rows) prefixed(item, prefix, label);
  unique(rows as string[], label);
  return rows as string[];
}
function enums<T extends string>(
  value: unknown,
  allowed: readonly T[],
  label: string,
): T[] {
  const rows = list(value, label);
  for (const item of rows) oneOf(item, allowed, label);
  unique(rows as T[], label);
  return rows as T[];
}
function integer(value: unknown, label: string, min: number): void {
  if (!Number.isInteger(value) || (value as number) < min)
    invalid(`${label}_invalid`);
}
function unique(values: string[], label: string): void {
  if (new Set(values).size !== values.length) invalid(`${label}_duplicate`);
}
function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  label: string,
): asserts value is T {
  if (typeof value !== "string" || !allowed.includes(value as T))
    invalid(`${label}_unsupported`);
}
function invalid(reason: string): never {
  throw new Error(`scope_fit_v4_invalid:${reason}`);
}

export type { GlobalConstraintV3, ScopeDecisionRequiredV3, ScopeFitDecisionV3 };
