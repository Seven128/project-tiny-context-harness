import {
  type SuperpowersAcceptanceCriterion,
  type SuperpowersPlanItem,
  type SuperpowersProductArchitectureScope
} from "./superpowers-task-state-schema.js";
import {
  fieldArray,
  fieldBoolean,
  fieldLine,
  fieldText,
  parseDocumentFields,
  parseHeadingDefinitions,
  type ParsedField
} from "./superpowers-task-source-parser.js";

export const DEFAULT_LAYERS = ["code", "test"];

const PRODUCT_DELIVERY_SCOPES = new Set(["system_capability_build", "representative_sample_validation", "full_population_operation", "mixed_scope_requires_boundary"]);
const PLAN_DELIVERY_SCOPES = new Set(["system_capability_build", "representative_sample_validation", "full_population_operation", "out_of_scope_backlog"]);
const ACCEPTANCE_SCOPES = new Set(["system_capability_build", "representative_sample_validation", "full_population_operation", "full_population_not_required"]);
const PRODUCT_FIELDS = new Set([
  "delivery_scope",
  "full_population_required",
  "representative_samples_validate",
  "representative_samples_do_not_validate",
  "out_of_scope_backlog",
  "source_authority",
  "product_goal",
  "surface_ia_lock",
  "decision_lock",
  "context_delta",
  "source_to_context_coverage",
  "acceptance_semantics",
  "impact"
]);
const PLAN_FIELDS = new Set([
  "delivery_scope",
  "capability_target",
  "representative_samples",
  "full_population_boundary",
  "non_required_population",
  "owner_surfaces",
  "forbidden_surfaces",
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
]);
const ACCEPTANCE_FIELDS = new Set([
  "checklist_source",
  "acceptance_scope",
  "ac_validates",
  "ac_does_not_validate",
  "sample_boundary",
  "full_population_required",
  "related_plan_items",
  "required_proof_layers",
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
]);

export function parseProductArchitectureScope(content: string, sourceFile: string): SuperpowersProductArchitectureScope {
  const fields = parseDocumentFields(content, sourceFile, PRODUCT_FIELDS);
  const errors: string[] = [];
  const scope = {
    delivery_scope: requireEnum(errors, "Product / Architecture Source", "delivery_scope", fields, PRODUCT_DELIVERY_SCOPES, sourceFile, 1) as SuperpowersProductArchitectureScope["delivery_scope"],
    full_population_required: requireBoolean(errors, "Product / Architecture Source", "full_population_required", fields, sourceFile, 1),
    representative_samples_validate: requireArray(errors, "Product / Architecture Source", "representative_samples_validate", fields, sourceFile, 1),
    representative_samples_do_not_validate: requireArray(errors, "Product / Architecture Source", "representative_samples_do_not_validate", fields, sourceFile, 1),
    out_of_scope_backlog: requireArray(errors, "Product / Architecture Source", "out_of_scope_backlog", fields, sourceFile, 1)
  };
  throwCompileErrors(errors);
  return scope;
}

export function parsePlanItems(content: string, sourceFile: string): Record<string, SuperpowersPlanItem> {
  const items: Record<string, SuperpowersPlanItem> = {};
  const errors: string[] = [];
  for (const definition of parseHeadingDefinitions(content, { kind: "PI", sourceFile, allowedFields: PLAN_FIELDS })) {
    const fields = definition.fields;
    items[definition.id] = {
      requirement: definition.title,
      source_file: definition.source_file,
      source_start_line: definition.source_start_line,
      source_end_line: definition.source_end_line,
      delivery_scope: requireEnum(errors, definition.id, "delivery_scope", fields, PLAN_DELIVERY_SCOPES, sourceFile, definition.source_start_line) as SuperpowersPlanItem["delivery_scope"],
      capability_target: requireText(errors, definition.id, "capability_target", fields, sourceFile, definition.source_start_line),
      representative_samples: requireArray(errors, definition.id, "representative_samples", fields, sourceFile, definition.source_start_line),
      full_population_boundary: requireText(errors, definition.id, "full_population_boundary", fields, sourceFile, definition.source_start_line),
      non_required_population: requireArray(errors, definition.id, "non_required_population", fields, sourceFile, definition.source_start_line),
      owner_surfaces: optionalArray(fields, "owner_surfaces"),
      forbidden_surfaces: optionalArray(fields, "forbidden_surfaces"),
      implementation_paths: optionalArray(fields, "implementation_paths"),
      required_tests: optionalArray(fields, "required_tests"),
      status: "not_started",
      related_acs: optionalArray(fields, "related_acs").map((item) => item.toUpperCase()),
      required_proof_layers: []
    };
  }
  throwCompileErrors(errors);
  return items;
}

export function parseAcceptanceCriteria(content: string, sourceFile: string): Record<string, SuperpowersAcceptanceCriterion> {
  const items: Record<string, SuperpowersAcceptanceCriterion> = {};
  const errors: string[] = [];
  for (const definition of parseHeadingDefinitions(content, { kind: "AC", sourceFile, allowedFields: ACCEPTANCE_FIELDS })) {
    const fields = definition.fields;
    const layers = optionalArray(fields, "required_proof_layers").map(normalizeLayer).filter(Boolean);
    items[definition.id] = {
      scope: definition.title,
      source_file: definition.source_file,
      source_start_line: definition.source_start_line,
      source_end_line: definition.source_end_line,
      acceptance_scope: requireEnum(errors, definition.id, "acceptance_scope", fields, ACCEPTANCE_SCOPES, sourceFile, definition.source_start_line) as SuperpowersAcceptanceCriterion["acceptance_scope"],
      ac_validates: requireArray(errors, definition.id, "ac_validates", fields, sourceFile, definition.source_start_line),
      ac_does_not_validate: requireArray(errors, definition.id, "ac_does_not_validate", fields, sourceFile, definition.source_start_line),
      sample_boundary: requireText(errors, definition.id, "sample_boundary", fields, sourceFile, definition.source_start_line),
      full_population_required: requireBoolean(errors, definition.id, "full_population_required", fields, sourceFile, definition.source_start_line),
      related_plan_items: optionalArray(fields, "related_plan_items").map((item) => item.toUpperCase()),
      required_proof_layers: layers.length > 0 ? layers : DEFAULT_LAYERS,
      status: "not_run"
    };
  }
  throwCompileErrors(errors);
  return items;
}

function normalizeLayer(value: string): string {
  return value.trim().toLowerCase().replace(/[- ]+/g, "_");
}

function requireEnum(errors: string[], label: string, name: string, fields: Record<string, ParsedField>, allowed: Set<string>, sourceFile: string, fallbackLine: number): string {
  const value = fieldText(fields, name);
  const line = fieldLine(fields, name) ?? fallbackLine;
  if (!value) {
    errors.push(`${label} missing ${name} at ${sourceFile}:${line}`);
    return "";
  }
  if (!allowed.has(value)) {
    errors.push(`${label} invalid ${name}: ${value} at ${sourceFile}:${line}; allowed: ${[...allowed].join(", ")}`);
  }
  return value;
}

function requireText(errors: string[], label: string, name: string, fields: Record<string, ParsedField>, sourceFile: string, fallbackLine: number): string {
  const value = fieldText(fields, name);
  const line = fieldLine(fields, name) ?? fallbackLine;
  if (!value) {
    errors.push(`${label} missing ${name} at ${sourceFile}:${line}`);
  }
  return value;
}

function requireArray(errors: string[], label: string, name: string, fields: Record<string, ParsedField>, sourceFile: string, fallbackLine: number): string[] {
  const line = fieldLine(fields, name) ?? fallbackLine;
  if (!fields[name]) {
    errors.push(`${label} missing ${name} at ${sourceFile}:${line}`);
    return [];
  }
  return fieldArray(fields, name);
}

function requireBoolean(errors: string[], label: string, name: string, fields: Record<string, ParsedField>, sourceFile: string, fallbackLine: number): boolean | null {
  const line = fieldLine(fields, name) ?? fallbackLine;
  if (!fields[name]) {
    errors.push(`${label} missing ${name} at ${sourceFile}:${line}`);
    return null;
  }
  const value = fieldBoolean(fields, name);
  if (value === null) {
    errors.push(`${label} invalid ${name}: ${fieldText(fields, name)} at ${sourceFile}:${line}; must be true or false`);
  }
  return value;
}

function optionalArray(fields: Record<string, ParsedField>, name: string): string[] {
  return fields[name] ? fieldArray(fields, name) : [];
}

function throwCompileErrors(errors: string[]): void {
  if (errors.length > 0) {
    throw new Error(`Superpowers source compile failed:\n- ${errors.join("\n- ")}`);
  }
}
