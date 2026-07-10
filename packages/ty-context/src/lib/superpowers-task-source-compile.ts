import { MACHINE_VERIFIABLE_PROOF_LAYERS, proofLayerName } from "./superpowers-task-proof-layers.js";
import {
  compileDiagnostic,
  throwCompileErrors,
  type CompileDiagnosticRecord
} from "./superpowers-task-compile-diagnostics.js";
import {
  ACCEPTANCE_FIELDS,
  ACCEPTANCE_SCOPES,
  fieldSet,
  isSelectedScopeFitSlice,
  normalizeProofLayerName,
  PLAN_DELIVERY_SCOPES,
  PLAN_FIELDS,
  PRODUCT_DELIVERY_SCOPES,
  PRODUCT_FIELDS,
  SCOPE_FIT_DECISIONS
} from "./superpowers-task-fields.js";
import {
  type AssertionRequirement,
  type SuperpowersAcceptanceCriterion,
  type SuperpowersPlanItem,
  type SuperpowersProductArchitectureScope
} from "./superpowers-task-state-schema.js";
import {
  fieldBoolean,
  fieldLine,
  fieldText,
  parseDocumentFields,
  parseHeadingDefinitions,
  type ParsedField
} from "./superpowers-task-source-parser.js";
import {
  optionalArray,
  optionalText,
  requireArray,
  requireBoolean,
  requireEnum,
  requireText
} from "./superpowers-task-source-field-values.js";

export const DEFAULT_LAYERS = ["code", "test"];

const PRODUCT_FIELD_SET = fieldSet(PRODUCT_FIELDS);
const PLAN_FIELD_SET = fieldSet(PLAN_FIELDS);
const ACCEPTANCE_FIELD_SET = fieldSet(ACCEPTANCE_FIELDS);

export function parseProductArchitectureScope(content: string, sourceFile: string): SuperpowersProductArchitectureScope {
  const fields = parseDocumentFields(content, sourceFile, PRODUCT_FIELD_SET);
  const errors: CompileDiagnosticRecord[] = [];
  const selectedScopeFitSlice = requireText(errors, "Product / Architecture Source", "selected_scope_fit_slice", fields, sourceFile, 1);
  if (selectedScopeFitSlice && !isSelectedScopeFitSlice(selectedScopeFitSlice)) {
    errors.push(compileDiagnostic(
      `Product / Architecture Source invalid selected_scope_fit_slice: ${selectedScopeFitSlice} at ${sourceFile}:${fieldLine(fields, "selected_scope_fit_slice") ?? 1}; allowed: none or SFC-###`,
      "blocking_unparseable_object",
      sourceFile,
      fieldLine(fields, "selected_scope_fit_slice") ?? 1,
      "selected_scope_fit_slice",
      "value must be none or an SFC-### id",
      "fix selected_scope_fit_slice and rerun compile"
    ));
  }
  const scope = {
    delivery_scope: requireEnum(errors, "Product / Architecture Source", "delivery_scope", fields, PRODUCT_DELIVERY_SCOPES, sourceFile, 1) as SuperpowersProductArchitectureScope["delivery_scope"],
    full_population_required: requireBoolean(errors, "Product / Architecture Source", "full_population_required", fields, sourceFile, 1),
    representative_samples_validate: requireArray(errors, "Product / Architecture Source", "representative_samples_validate", fields, sourceFile, 1),
    representative_samples_do_not_validate: requireArray(errors, "Product / Architecture Source", "representative_samples_do_not_validate", fields, sourceFile, 1),
    out_of_scope_backlog: requireArray(errors, "Product / Architecture Source", "out_of_scope_backlog", fields, sourceFile, 1),
    scope_fit_decision: requireEnum(errors, "Product / Architecture Source", "scope_fit_decision", fields, SCOPE_FIT_DECISIONS, sourceFile, 1) as SuperpowersProductArchitectureScope["scope_fit_decision"],
    selected_scope_fit_slice: selectedScopeFitSlice,
    owner_boundary: requireText(errors, "Product / Architecture Source", "owner_boundary", fields, sourceFile, 1),
    primary_capability_path: requireText(errors, "Product / Architecture Source", "primary_capability_path", fields, sourceFile, 1),
    non_completing_outcomes: requireArray(errors, "Product / Architecture Source", "non_completing_outcomes", fields, sourceFile, 1),
    assertion_policy: requireText(errors, "Product / Architecture Source", "assertion_policy", fields, sourceFile, 1),
    source_authority: requireText(errors, "Product / Architecture Source", "source_authority", fields, sourceFile, 1),
    product_goal: requireText(errors, "Product / Architecture Source", "product_goal", fields, sourceFile, 1),
    surface_ia_lock: optionalText(fields, "surface_ia_lock"),
    decision_lock: optionalText(fields, "decision_lock"),
    context_delta: optionalText(fields, "context_delta"),
    source_to_context_coverage: optionalText(fields, "source_to_context_coverage"),
    acceptance_semantics: optionalText(fields, "acceptance_semantics"),
    impact: optionalText(fields, "impact")
  };
  throwCompileErrors(errors);
  return scope;
}

export function parsePlanItems(content: string, sourceFile: string): Record<string, SuperpowersPlanItem> {
  const items: Record<string, SuperpowersPlanItem> = {};
  const errors: CompileDiagnosticRecord[] = [];
  for (const definition of parseHeadingDefinitions(content, { kind: "PI", sourceFile, allowedFields: PLAN_FIELD_SET })) {
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
      owner_boundary: requireText(errors, definition.id, "owner_boundary", fields, sourceFile, definition.source_start_line),
      primary_capability_path: requireText(errors, definition.id, "primary_capability_path", fields, sourceFile, definition.source_start_line),
      trigger_contract: requireText(errors, definition.id, "trigger_contract", fields, sourceFile, definition.source_start_line),
      state_transition_contract: requireText(errors, definition.id, "state_transition_contract", fields, sourceFile, definition.source_start_line),
      observable_result_contract: requireText(errors, definition.id, "observable_result_contract", fields, sourceFile, definition.source_start_line),
      assertion_support: requireText(errors, definition.id, "assertion_support", fields, sourceFile, definition.source_start_line),
      required_assertion_commands: requireArray(errors, definition.id, "required_assertion_commands", fields, sourceFile, definition.source_start_line),
      invalid_implementation_shortcuts: requireArray(errors, definition.id, "invalid_implementation_shortcuts", fields, sourceFile, definition.source_start_line),
      owner_surfaces: optionalArray(fields, "owner_surfaces"),
      forbidden_surfaces: optionalArray(fields, "forbidden_surfaces"),
      implementation_paths: requireArray(errors, definition.id, "implementation_paths", fields, sourceFile, definition.source_start_line),
      required_tests: optionalArray(fields, "required_tests"),
      proof_layer_ids: optionalArray(fields, "proof_layer_ids").map(normalizeLayerId),
      requirement_ref: optionalText(fields, "requirement_ref"),
      decision_id: optionalText(fields, "decision_id"),
      api_schema_changes: optionalText(fields, "api_schema_changes"),
      state_machine: optionalText(fields, "state_machine"),
      data_flow: optionalText(fields, "data_flow"),
      worker_runtime_behavior: optionalText(fields, "worker_runtime_behavior"),
      ui_ia_changes: optionalText(fields, "ui_ia_changes"),
      migration_plan: optionalText(fields, "migration_plan"),
      evidence_artifacts: optionalArray(fields, "evidence_artifacts"),
      non_completing_shortcuts: optionalArray(fields, "non_completing_shortcuts"),
      substitution_policy: optionalArray(fields, "substitution_policy"),
      drift_severity: optionalText(fields, "drift_severity"),
      partial_conditions: optionalArray(fields, "partial_conditions"),
      blockers: optionalArray(fields, "blockers"),
      explicit_no_test_scope: fieldBoolean(fields, "explicit_no_test_scope") === true,
      context_fact_refs: optionalArray(fields, "context_fact_refs"),
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
  const errors: CompileDiagnosticRecord[] = [];
  for (const definition of parseHeadingDefinitions(content, { kind: "AC", sourceFile, allowedFields: ACCEPTANCE_FIELD_SET })) {
    const fields = definition.fields;
    const layers = requireArray(errors, definition.id, "required_proof_layers", fields, sourceFile, definition.source_start_line).map(normalizeLayer).filter(Boolean);
    const requiredProofLayers = layers.length > 0 ? layers : DEFAULT_LAYERS;
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
      related_plan_items: requireArray(errors, definition.id, "related_plan_items", fields, sourceFile, definition.source_start_line).map((item) => item.toUpperCase()),
      required_proof_layers: requiredProofLayers,
      assertion_requirements: assertionRequirements(fields, requiredProofLayers),
      assertion_command: requireText(errors, definition.id, "assertion_command", fields, sourceFile, definition.source_start_line),
      assertion_artifacts: requireArray(errors, definition.id, "assertion_artifacts", fields, sourceFile, definition.source_start_line),
      positive_assertions: requireArray(errors, definition.id, "positive_assertions", fields, sourceFile, definition.source_start_line),
      negative_assertions: requireArray(errors, definition.id, "negative_assertions", fields, sourceFile, definition.source_start_line),
      machine_blocking: requireBoolean(errors, definition.id, "machine_blocking", fields, sourceFile, definition.source_start_line),
      invalid_completion_signals: requireArray(errors, definition.id, "invalid_completion_signals", fields, sourceFile, definition.source_start_line),
      assertion_result_required: requireBoolean(errors, definition.id, "assertion_result_required", fields, sourceFile, definition.source_start_line),
      ac_type: optionalText(fields, "ac_type"),
      proof_chain: optionalArray(fields, "proof_chain").map(normalizeLayerId),
      required_test_ids: optionalArray(fields, "required_test_ids"),
      fail_conditions: optionalArray(fields, "fail_conditions"),
      invalid_evidence: optionalArray(fields, "invalid_evidence"),
      substitution_policy: optionalArray(fields, "substitution_policy"),
      missing_layer_downgrade: optionalText(fields, "missing_layer_downgrade"),
      auditor_expectation: optionalText(fields, "auditor_expectation"),
      out_of_scope_na_approval_source: optionalText(fields, "out_of_scope_na_approval_source"),
      hard_blockers: optionalArray(fields, "hard_blockers"),
      validates_explanation: optionalText(fields, "validates_explanation"),
      does_not_validate_explanation: optionalText(fields, "does_not_validate_explanation"),
      final_evidence_expected: optionalArray(fields, "final_evidence_expected"),
      verification_method: optionalArray(fields, "verification_method"),
      test_cases: optionalArray(fields, "test_cases"),
      explicit_no_test_scope: fieldBoolean(fields, "explicit_no_test_scope") === true,
      status: "not_run"
    };
  }
  throwCompileErrors(errors);
  return items;
}

function normalizeLayer(value: string): string {
  return normalizeProofLayerName(value);
}

function normalizeLayerId(value: string): string {
  const trimmed = value.trim();
  if (!trimmed.includes(".")) {
    return normalizeLayer(trimmed);
  }
  const acId = trimmed.slice(0, trimmed.lastIndexOf(".")).toUpperCase();
  const layer = trimmed.slice(trimmed.lastIndexOf(".") + 1);
  return `${acId}.${normalizeLayer(layer)}`;
}

function assertionRequirements(fields: Record<string, ParsedField>, layers: string[]): AssertionRequirement[] {
  const requiredTestIds = optionalArray(fields, "required_test_ids");
  const positiveAssertions = unique(optionalArray(fields, "positive_assertions"));
  const negativeAssertions = unique(optionalArray(fields, "negative_assertions"));
  const assertionCommand = fieldText(fields, "assertion_command");
  const assertionArtifacts = optionalArray(fields, "assertion_artifacts");
  const machineBlocking = fieldBoolean(fields, "machine_blocking");
  const assertionResultRequired = fieldBoolean(fields, "assertion_result_required");
  const invalidCompletionSignals = optionalArray(fields, "invalid_completion_signals");
  return layers.map((layer) => {
    const normalized = proofLayerName(normalizeLayer(layer));
    return {
      proof_layer: normalized,
      required: true,
      machine_blocking: machineBlocking ?? MACHINE_VERIFIABLE_PROOF_LAYERS.has(normalized),
      assertion_result_required: assertionResultRequired ?? MACHINE_VERIFIABLE_PROOF_LAYERS.has(normalized),
      assertion_command: assertionCommand,
      assertion_artifacts: assertionArtifacts,
      invalid_completion_signals: invalidCompletionSignals,
      required_test_ids: requiredTestIds,
      positive_assertions: positiveAssertions,
      negative_assertions: negativeAssertions
    };
  });
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
