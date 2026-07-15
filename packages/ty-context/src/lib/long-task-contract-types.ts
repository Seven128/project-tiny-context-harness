export type RequestedRiskLevel = "auto" | "standard" | "strict";
export type EffectiveRiskLevel = "standard" | "strict";

export interface LongTaskRiskFacts {
  public_api_or_schema_change: boolean;
  persistent_data_change: boolean;
  data_migration: boolean;
  security_boundary_change: boolean;
  permission_boundary_change: boolean;
  irreversible_external_effect: boolean;
  critical_user_path: boolean;
  full_population_operation: boolean;
  multi_repository_change: boolean;
  weak_observability: boolean;
}

export interface RiskEvidenceV1 {
  fact: keyof LongTaskRiskFacts;
  source_claim_refs: string[];
  context_refs: string[];
  affected_paths: string[];
  rationale: string;
}

export type SourceClaimDispositionV1 =
  | { type: "contract"; refs: string[] }
  | { type: "global_constraint"; refs: string[] }
  | { type: "out_of_scope"; reason: string }
  | { type: "decision_required"; reason: string };

export interface SourceClaimV1 {
  key: string;
  source_ref: string;
  statement: string;
  disposition: SourceClaimDispositionV1;
}

export interface ExternalConfirmationV1 {
  key: string;
  description: string;
  owner: string;
}

export type ProofSurface =
  | "ui_browser"
  | "runtime_behavior"
  | "api_contract"
  | "data_state"
  | "security_boundary"
  | "population_coverage"
  | "implementation_structure";

export type RunnerType =
  "package_script" | "project_binary" | "node_oracle" | "playwright_test";

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

export interface DeliveryAssertionV1 {
  observation: string;
  operator: AssertionOperator;
  expected?: unknown;
}

export interface NetworkPolicyV1 {
  mode: "none" | "loopback" | "declared_hosts";
  allowed_hosts: string[];
}

export interface DeliveryRunnerV1 {
  type: RunnerType;
  target: string;
  argv: string[];
  cwd: string;
  timeout_ms: number;
  network_policy: NetworkPolicyV1;
  effect: "read_only" | "test_sandbox";
  retry_policy: "none" | "transient_once";
  idempotent: boolean;
}

export interface DeliveryCheckV1 {
  key: string;
  proof_surface: ProofSurface;
  runner: DeliveryRunnerV1;
  verification_sources: string[];
  input_paths: string[];
  expected_output_paths: string[];
  artifact_globs: string[];
  positive_assertions: DeliveryAssertionV1[];
  negative_assertions: DeliveryAssertionV1[];
  environment_requirements: string[];
}

export interface DeliveryControlV1 {
  key: string;
  location: string;
  trigger: string;
  input: string;
  loading_state: string;
  empty_state: string;
  success_state: string;
  failure_state: string;
  feedback: string;
}

export interface DeliveryBindingV1 {
  kind:
    "path_glob" | "file" | "symbol" | "schema" | "route" | "runtime_capability";
  target: string;
  carrier_paths: string[];
  existence: "existing" | "planned";
}

export interface RollbackRecoveryV1 {
  rollback: string;
  recovery: string;
  verification_check_keys: string[];
}

export type CounterfactualMutationV1 =
  | { type: "remove_paths"; paths: string[] }
  | { type: "replace_file"; path: string; fixture_path: string };

export interface CounterfactualControlV1 {
  check_key: string;
  mutation: CounterfactualMutationV1;
  expect: "check_fails";
}

export interface PopulationRequirementV1 {
  check_key: string;
  observation: string;
  required_coverage_percent: 100;
  exclusion_rules: string[];
}

export interface DeliveryOutcomeV1 {
  key: string;
  title: string;
  depends_on: string[];
  product: {
    observable_result: string;
    owner_boundary: string;
    owner_surfaces: string[];
    controls: DeliveryControlV1[];
    non_completing_outcomes: string[];
  };
  technical: {
    obligations: string[];
    expected_change_paths: string[];
    allowed_support_paths: string[];
    forbidden_paths: string[];
    bindings: DeliveryBindingV1[];
    forbidden_shortcuts: string[];
    rollback_and_recovery: RollbackRecoveryV1 | null;
  };
  acceptance: {
    validates: string[];
    does_not_validate: string[];
    checks: DeliveryCheckV1[];
    population: PopulationRequirementV1 | null;
    counterfactual_controls: CounterfactualControlV1[];
  };
}

export interface DeliveryContractV1 {
  schema_version: "long-task-delivery-v1";
  task: {
    id: string;
    title: string;
    goal: string;
    source_paths: string[];
    context_refs: string[];
    context_snapshot_mode: "referenced" | "full";
  };
  source_claims: SourceClaimV1[];
  risk: {
    requested_level: RequestedRiskLevel;
    facts: LongTaskRiskFacts;
    evidence: RiskEvidenceV1[];
  };
  global: {
    product: { non_goals: string[]; owner_boundaries: string[] };
    technical: {
      constraints: string[];
      forbidden_paths: string[];
      forbidden_shortcuts: string[];
    };
    acceptance: {
      checks: DeliveryCheckV1[];
      external_confirmations: ExternalConfirmationV1[];
    };
  };
  outcomes: DeliveryOutcomeV1[];
}
