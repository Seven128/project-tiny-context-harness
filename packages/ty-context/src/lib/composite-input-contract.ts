import { createHash } from "node:crypto";

export const COMPOSITE_INPUT_CONTRACT_VERSION = "composite-input-contract-v1" as const;

export type CompositeInputDocumentId =
  | "product_architecture_source"
  | "technical_realization_plan"
  | "acceptance_checklist";
export type CompositeInputDefinitionKind = "document" | "PI" | "AC";
export type CompositeInputFieldType = "array" | "boolean" | "enum" | "text";

export interface CompositeInputFieldDescriptor {
  name: string;
  type: CompositeInputFieldType;
  required: boolean;
  enum_values: readonly string[];
}

export interface CompositeInputDocumentDescriptor {
  id: CompositeInputDocumentId;
  file: string;
  definition_kind: CompositeInputDefinitionKind;
  fields: readonly CompositeInputFieldDescriptor[];
}

export interface CompositeInputContract {
  schema_version: typeof COMPOSITE_INPUT_CONTRACT_VERSION;
  documents: readonly CompositeInputDocumentDescriptor[];
  canonical_sha256: string;
}

const field = <
  const Name extends string,
  const Type extends CompositeInputFieldType,
  const Required extends boolean = false,
  const EnumValues extends readonly string[] = readonly []
>(
  name: Name,
  type: Type,
  required?: Required,
  enumValues?: EnumValues
) => ({
  name,
  type,
  required: required ?? false,
  enum_values: enumValues ?? []
}) as CompositeInputFieldDescriptor & {
  name: Name;
  type: Type;
  required: Required;
  enum_values: EnumValues;
};

const productFields = [
  field("delivery_scope", "enum", true, ["system_capability_build", "representative_sample_validation", "full_population_operation", "mixed_scope_requires_boundary"]),
  field("full_population_required", "boolean", true),
  field("representative_samples_validate", "array", true),
  field("representative_samples_do_not_validate", "array", true),
  field("out_of_scope_backlog", "array", true),
  field("scope_fit_decision", "enum", true, ["fit_for_three_inputs", "selected_from_split", "blocked_for_decision"]),
  field("selected_scope_fit_slice", "text", true),
  field("owner_boundary", "text", true),
  field("primary_capability_path", "text", true),
  field("non_completing_outcomes", "array", true),
  field("assertion_policy", "text", true),
  field("source_authority", "text", true),
  field("product_goal", "text", true),
  field("surface_ia_lock", "text"),
  field("decision_lock", "text"),
  field("context_delta", "text"),
  field("source_to_context_coverage", "text"),
  field("acceptance_semantics", "text"),
  field("impact", "text")
] as const;

const planFields = [
  field("delivery_scope", "enum", true, ["system_capability_build", "representative_sample_validation", "full_population_operation", "out_of_scope_backlog"]),
  field("capability_target", "text", true),
  field("representative_samples", "array", true),
  field("full_population_boundary", "text", true),
  field("non_required_population", "array", true),
  field("owner_surfaces", "array"),
  field("forbidden_surfaces", "array"),
  field("owner_boundary", "text", true),
  field("primary_capability_path", "text", true),
  field("trigger_contract", "text", true),
  field("state_transition_contract", "text", true),
  field("observable_result_contract", "text", true),
  field("assertion_support", "text", true),
  field("required_assertion_commands", "array", true),
  field("invalid_implementation_shortcuts", "array", true),
  field("implementation_paths", "array", true),
  field("required_tests", "array"),
  field("related_acs", "array"),
  field("requirement_ref", "text"),
  field("decision_id", "text"),
  field("proof_layer_ids", "array"),
  field("api_schema_changes", "text"),
  field("state_machine", "text"),
  field("data_flow", "text"),
  field("worker_runtime_behavior", "text"),
  field("ui_ia_changes", "text"),
  field("migration_plan", "text"),
  field("evidence_artifacts", "array"),
  field("explicit_no_test_scope", "boolean"),
  field("non_completing_shortcuts", "array"),
  field("substitution_policy", "array"),
  field("drift_severity", "text"),
  field("partial_conditions", "array"),
  field("blockers", "array"),
  field("context_fact_refs", "array")
] as const;

const acceptanceFields = [
  field("acceptance_scope", "enum", true, ["system_capability_build", "representative_sample_validation", "full_population_operation", "full_population_not_required"]),
  field("ac_validates", "array", true),
  field("ac_does_not_validate", "array", true),
  field("sample_boundary", "text", true),
  field("full_population_required", "boolean", true),
  field("related_plan_items", "array", true),
  field("required_proof_layers", "array", true),
  field("assertion_command", "text", true),
  field("assertion_artifacts", "array", true),
  field("positive_assertions", "array", true),
  field("negative_assertions", "array", true),
  field("machine_blocking", "boolean", true),
  field("invalid_completion_signals", "array", true),
  field("assertion_result_required", "boolean", true),
  field("ac_type", "text"),
  field("proof_chain", "array"),
  field("verification_method", "array"),
  field("fail_conditions", "array"),
  field("invalid_evidence", "array"),
  field("substitution_policy", "array"),
  field("missing_layer_downgrade", "text"),
  field("auditor_expectation", "text"),
  field("out_of_scope_na_approval_source", "text"),
  field("required_test_ids", "array"),
  field("explicit_no_test_scope", "boolean"),
  field("hard_blockers", "array"),
  field("validates_explanation", "text"),
  field("does_not_validate_explanation", "text"),
  field("final_evidence_expected", "array"),
  field("test_cases", "array")
] as const;

const documents = [
  { id: "product_architecture_source", file: "product-architecture-source.md", definition_kind: "document", fields: productFields },
  { id: "technical_realization_plan", file: "technical-realization-plan.md", definition_kind: "PI", fields: planFields },
  { id: "acceptance_checklist", file: "acceptance-checklist.md", definition_kind: "AC", fields: acceptanceFields }
] as const satisfies readonly CompositeInputDocumentDescriptor[];

const canonicalBody = {
  schema_version: COMPOSITE_INPUT_CONTRACT_VERSION,
  documents
} as const satisfies Omit<CompositeInputContract, "canonical_sha256">;

export const COMPOSITE_INPUT_CONTRACT = deepFreeze({
  ...canonicalBody,
  canonical_sha256: createHash("sha256").update(JSON.stringify(canonicalBody)).digest("hex")
} satisfies CompositeInputContract);

type CompositeInputDocumentById<Id extends CompositeInputDocumentId> = Extract<(typeof documents)[number], { id: Id }>;

export function compositeInputDocument<const Id extends CompositeInputDocumentId>(id: Id): CompositeInputDocumentById<Id> {
  const document = COMPOSITE_INPUT_CONTRACT.documents.find((candidate) => candidate.id === id);
  if (!document) {
    throw new Error(`Unknown CompositeInputContract document: ${id}`);
  }
  return document as CompositeInputDocumentById<Id>;
}

function deepFreeze<const Value>(value: Value): Value {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}
