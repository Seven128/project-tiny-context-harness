// Generated-shape companion for schemas/composite-v3/*.schema.json.
// The JSON Schemas are the normative authoring authority; this file is checked by schema-contract tests.
export const LONG_TASK_SOURCE_FILES = {
  product: "product-architecture-source.yaml",
  plan: "technical-realization-plan.yaml",
  checklist: "acceptance-checklist.yaml",
} as const;

export type DeliveryScope =
  | "system_capability_build"
  | "representative_sample_validation"
  | "full_population_operation";
export type PopulationPolicy =
  "not_applicable" | "representative_sample" | "full_population";
export type ProofSurface =
  | "ui_browser"
  | "runtime_behavior"
  | "api_contract"
  | "data_state"
  | "security_boundary"
  | "population_coverage"
  | "implementation_structure";
export type ObservationKind =
  | "scalar"
  | "implementation_structure"
  | "browser_interaction"
  | "runtime_behavior"
  | "api_contract"
  | "data_state"
  | "security_boundary"
  | "population_coverage";
export type AssertionOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "matches"
  | "not_matches"
  | "greater_than"
  | "greater_or_equal"
  | "less_than"
  | "less_or_equal"
  | "truthy"
  | "falsy"
  | "exists"
  | "not_exists"
  | "set_equals"
  | "subset_of"
  | "superset_of";
export type OwnerSurfaceKind =
  "web" | "cli" | "api" | "runtime" | "data" | "security";
export type BindingKind =
  "path_glob" | "file" | "symbol" | "schema" | "route" | "runtime_capability";
export type ExternalBlockerReasonCode =
  | "mfa_required"
  | "credential_unavailable"
  | "permission_denied"
  | "user_contract_decision_required"
  | "external_approval_required"
  | "platform_or_legal_restriction"
  | "external_service_persistently_unavailable";

export interface OwnerSurfaceV3 {
  id: string;
  kind: OwnerSurfaceKind;
  location: string;
  primary_action: string;
  expected_feedback: string;
}
export interface ProductRequirementV3 {
  id: string;
  statement: string;
  observable_outcome: string;
  owner_boundary: string;
  owner_surface_refs: string[];
  context_refs?: string[];
  task_local_reason?: string;
  population_policy: PopulationPolicy;
}
export interface ProductBoundaryV3 {
  id: string;
  rule: string;
  requirement_refs: string[];
}
export interface NonCompletingOutcomeV3 {
  id: string;
  forbidden_outcome: string;
  requirement_refs: string[];
}
export interface PopulationExclusionRuleV3 {
  id: string;
  rule: string;
  requirement_refs: string[];
}
export interface ProductSourceV3 {
  schema_version: "product-source-v3";
  context_snapshot_mode?: "referenced" | "full";
  product_goal: string;
  delivery_scope: DeliveryScope;
  full_population_required: boolean;
  owner_surfaces: OwnerSurfaceV3[];
  requirements: ProductRequirementV3[];
  boundaries: ProductBoundaryV3[];
  non_completing_outcomes: NonCompletingOutcomeV3[];
  population_exclusion_rules: PopulationExclusionRuleV3[];
  representative_samples_validate: string[];
  representative_samples_do_not_validate: string[];
  out_of_scope_backlog: string[];
}

export type BindingVerificationV3 =
  | { mode: "harness_static" }
  | { mode: "oracle_observation"; spec_id: string; observation_id: string };
export interface ImplementationBindingV3 {
  id: string;
  kind: BindingKind;
  target: string;
  verification: BindingVerificationV3;
}
export interface ForbiddenShortcutV3 {
  id: string;
  statement: string;
  source_boundary_ids: string[];
  source_non_completing_ids: string[];
}
export interface LongTaskObligationV3 {
  id: string;
  statement: string;
  source_requirement_ids: string[];
  implementation_bindings: ImplementationBindingV3[];
  forbidden_shortcuts: ForbiddenShortcutV3[];
  related_ac_ids: string[];
  counterfactual_control_ids: string[];
}
export type CounterfactualMutationV3 =
  | { type: "remove_binding_targets"; binding_ids: string[] }
  | {
      type: "replace_file_with_fixture";
      binding_id: string;
      target_path: string;
      fixture_id: string;
    }
  | {
      type: "rename_route_fixture";
      binding_id: string;
      target_path: string;
      fixture_id: string;
      from_route: string;
      to_route: string;
    }
  | {
      type: "use_declared_counterexample_fixture";
      binding_id: string;
      target_path: string;
      fixture_id: string;
    };
export interface CounterfactualControlV3 {
  id: string;
  obligation_ids: [string];
  mutation: CounterfactualMutationV3;
  expected_failed_assertion_ids: string[];
}
export interface PlanItemV3 {
  id: string;
  title: string;
  obligations: LongTaskObligationV3[];
  implementation_notes: string[];
}
export interface TechnicalPlanV3 {
  schema_version: "technical-plan-v3";
  plan_items: PlanItemV3[];
  counterfactual_controls: CounterfactualControlV3[];
}

export interface VerificationClaimsV3 {
  requirement_ids: string[];
  plan_item_ids: string[];
  obligation_ids: string[];
  binding_ids: string[];
  ac_ids: string[];
  proof_requirement_ids: string[];
}
export interface OracleDeclarationV3 {
  entrypoint: string;
}
export interface NetworkPolicyV3 {
  mode: "none" | "loopback" | "declared_hosts";
  allowed_hosts: string[];
}
export type CommandToolV3 =
  "package_script" | "project_binary" | "node_script" | "playwright_test";
export interface CommandStepV3 {
  id: string;
  tool: CommandToolV3;
  target: string;
  argv: string[];
  cwd: string;
  timeout_ms: number;
  environment_refs: string[];
  output_artifact_ids: string[];
}
export interface EnvironmentRequirementV3 {
  id: string;
  reason_code: ExternalBlockerReasonCode;
  probe_spec_id: string;
  local_alternative_probe_ids: string[];
  minimal_user_action: string;
}
export interface PositiveAssertionV3 {
  id: string;
  observation_id: string;
  observation_kind: ObservationKind;
  operator: AssertionOperator;
  expected?: unknown;
}
export interface NegativeAssertionV3 extends PositiveAssertionV3 {
  source_boundary_ids: string[];
  source_non_completing_ids: string[];
  source_forbidden_shortcut_ids: string[];
}
export interface PopulationEnumeratorV3 {
  observation_id: string;
  exclusion_rule_ids: string[];
  required_coverage_percent: 100;
}
export interface VerificationSpecV3 {
  id: string;
  runner_type: "node_oracle";
  proof_capabilities: ProofSurface[];
  claims: VerificationClaimsV3;
  oracle: OracleDeclarationV3;
  cwd: string;
  timeout_ms: number;
  input_paths: string[];
  artifact_globs: string[];
  network_policy: NetworkPolicyV3;
  command_steps: CommandStepV3[];
  environment_refs: string[];
  environment_requirements: EnvironmentRequirementV3[];
  positive_assertions: PositiveAssertionV3[];
  negative_assertions: NegativeAssertionV3[];
  population_enumerator?: PopulationEnumeratorV3;
}
export interface ProofRequirementV3 {
  id: string;
  proof_surface: ProofSurface;
  obligation_refs: string[];
  owner_surface_refs: string[];
  verification_spec_ids: string[];
}
export interface AcceptanceCriterionV3 {
  id: string;
  title: string;
  obligation_refs: string[];
  validates: string[];
  does_not_validate: string[];
  proof_requirement_refs: string[];
  verification_spec_ids: string[];
}
export interface CounterexampleFixtureV3 {
  id: string;
  path: string;
  purpose: string;
  non_secret: boolean;
}
export interface EnvironmentProbeV3 {
  id: string;
  kind:
    | "host_capability"
    | "secret_ref"
    | "permission"
    | "network_endpoint"
    | "command_step";
  adapter:
    | "cli_auth"
    | "credential_store"
    | "filesystem_permission"
    | "tcp_endpoint"
    | "http_endpoint"
    | "frozen_command_step";
  target: string;
  timeout_ms: number;
  expected: { exit_codes: number[]; error_codes: string[] };
  artifact_globs: string[];
  environment_refs: string[];
}
export interface AcceptanceChecklistV3 {
  schema_version: "acceptance-checklist-v3";
  counterexample_fixtures: CounterexampleFixtureV3[];
  proof_requirements: ProofRequirementV3[];
  acceptance_criteria: AcceptanceCriterionV3[];
  verification_specs: VerificationSpecV3[];
  environment_probes: EnvironmentProbeV3[];
}
export interface LongTaskSourceBundleV3 {
  product: ProductSourceV3;
  plan: TechnicalPlanV3;
  checklist: AcceptanceChecklistV3;
  source_paths: { product: string; plan: string; checklist: string };
}

export interface VerifierTrustInput {
  package_name: "project-tiny-context-harness";
  package_version: string;
  cli_path: string;
  cli_sha256: string;
  hook_bundle_sha256: string;
  schema_set_sha256: string;
}
type FrozenPositiveAssertionV3 = PositiveAssertionV3 & {
  oracle_check_id: string;
  forbidden?: never;
  source_forbidden_shortcut_ids?: never;
};
type FrozenNegativeAssertionV3 = NegativeAssertionV3 & {
  oracle_check_id: string;
  forbidden: unknown;
};
type FrozenEnvironmentRequirementV3 = EnvironmentRequirementV3 & {
  required: true;
  local_alternatives: string[];
};
export interface FrozenVerificationSpecV3 extends Omit<
  VerificationSpecV3,
  "positive_assertions" | "negative_assertions" | "environment_requirements"
> {
  positive_assertions: FrozenPositiveAssertionV3[];
  negative_assertions: FrozenNegativeAssertionV3[];
  environment_requirements: FrozenEnvironmentRequirementV3[];
  normalized_sha256: string;
  executable_path: string;
  executable_sha256: string;
  argv: string[];
  oracle_paths: string[];
  oracle_sha256: Record<string, string>;
  implementation_test_paths: string[];
  invalid_completion_signals: string[];
  global_invariant: boolean;
}

export interface CompiledContractGraphsV3 {
  requirements: Record<
    string,
    {
      plan_item_ids: string[];
      obligation_ids: string[];
      boundary_ids: string[];
      non_completing_outcome_ids: string[];
      population_exclusion_rule_ids: string[];
    }
  >;
  plan_items: Record<string, { obligation_ids: string[] }>;
  obligations: Record<
    string,
    {
      requirement_ids: string[];
      binding_ids: string[];
      ac_ids: string[];
      proof_requirement_ids: string[];
      counterfactual_control_ids: string[];
      forbidden_shortcut_ids: string[];
    }
  >;
  acceptance_criteria: Record<
    string,
    {
      obligation_ids: string[];
      proof_requirement_ids: string[];
      verification_spec_ids: string[];
    }
  >;
  proof_requirements: Record<
    string,
    {
      obligation_ids: string[];
      owner_surface_ids: string[];
      verification_spec_ids: string[];
    }
  >;
  verification_specs: Record<string, VerificationClaimsV3>;
}
export interface CompiledContractV3 {
  schema_version: "compiled-long-task-contract-v3";
  contract_sha256: string;
  repository_root: string;
  workdir: string;
  sources: Record<string, { path: string; sha256: string }>;
  context_snapshot_mode: "referenced" | "full";
  context_graph_sha256: string;
  context_snapshot: {
    files: string[];
    sha256: Record<string, string>;
  };
  owner_surfaces: OwnerSurfaceV3[];
  requirements: ProductRequirementV3[];
  product_boundaries: ProductBoundaryV3[];
  non_completing_outcomes: NonCompletingOutcomeV3[];
  population_exclusion_rules: PopulationExclusionRuleV3[];
  plan_items: Array<{
    id: string;
    title: string;
    implementation_notes: string[];
    obligation_ids: string[];
  }>;
  obligations: LongTaskObligationV3[];
  bindings: ImplementationBindingV3[];
  forbidden_shortcuts: ForbiddenShortcutV3[];
  acceptance_criteria: AcceptanceCriterionV3[];
  proof_requirements: ProofRequirementV3[];
  verification_specs: FrozenVerificationSpecV3[];
  counterfactual_controls: CounterfactualControlV3[];
  counterexample_fixtures: CounterexampleFixtureV3[];
  environment_probes: EnvironmentProbeV3[];
  graphs: CompiledContractGraphsV3;
  verifier_identity: VerifierTrustInput;
}
export interface CoverageResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
}
