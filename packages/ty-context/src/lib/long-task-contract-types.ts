import type {
  LongTaskRiskFacts,
  RequestedRiskLevel,
} from "./long-task-risk-types.js";

export type SourceClaimDispositionV2 =
  | { type: "claim"; refs: string[] }
  | { type: "acceptance"; refs: string[] }
  | { type: "global_constraint"; refs: string[] }
  | { type: "external_confirmation"; refs: string[] }
  | { type: "out_of_scope"; reason: string }
  | { type: "decision_required"; reason: string };

export interface SourceClaimV2 {
  key: string;
  source_ref: string;
  statement: string;
  disposition: SourceClaimDispositionV2;
}

export interface KeyedStatementV2 {
  key: string;
  statement: string;
}

export interface KeyedPathV2 {
  key: string;
  path: string;
}

export interface ExternalConfirmationV2 {
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

export type PresenceOrUnaryAssertionOperator = "exists" | "truthy" | "falsy";

export type BinaryAssertionOperator =
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
  | "set_equals"
  | "subset_of"
  | "superset_of";

export type AssertionOperator =
  PresenceOrUnaryAssertionOperator | BinaryAssertionOperator;

interface DeliveryAssertionBaseV2 {
  key: string;
  criterion?: string;
  claims: string[];
  observation: string;
}

export type DeliveryAssertionV2 =
  | (DeliveryAssertionBaseV2 & {
      operator: PresenceOrUnaryAssertionOperator;
      expected?: never;
    })
  | (DeliveryAssertionBaseV2 & {
      operator: BinaryAssertionOperator;
      expected: unknown;
    });

export interface DeliveryRunnerV2 {
  type: RunnerType;
  target: string;
  argv: string[];
  cwd: string;
  timeout_ms: number;
  effect: "read_only" | "test_sandbox";
  retry_policy: "none" | "transient_once";
  idempotent: boolean;
}

export type EnvironmentRequirementV2 =
  | { key: string; kind: "executable" | "env_var"; target: string }
  | { key: string; kind: "file" | "directory"; target: string }
  | {
      key: string;
      kind: "loopback_tcp";
      host: "127.0.0.1" | "::1" | "localhost";
      port: number;
      timeout_ms: number;
    };

export interface DeliveryCheckV2 {
  key: string;
  proof_surface: ProofSurface;
  runner: DeliveryRunnerV2;
  verification_inputs: string[];
  input_paths: string[];
  expected_output_paths: string[];
  artifact_globs: string[];
  positive_assertions: DeliveryAssertionV2[];
  negative_assertions: DeliveryAssertionV2[];
  environment_requirements: EnvironmentRequirementV2[];
}

export interface DeliveryControlV2 {
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

interface DeliveryRequirementV2 extends KeyedStatementV2 {
  required_proof_surfaces: ProofSurface[];
}

export interface DeliveryOwnerV2 {
  label: string;
  context_refs: string[];
  path_globs: string[];
}

export interface DeliveryObligationV2 extends KeyedStatementV2 {
  required_proof_surfaces: ProofSurface[];
}

export interface DeliveryBindingV2 {
  key: string;
  kind: "path_glob" | "file" | "verified";
  target: string;
  carrier_paths: string[];
  existence: "existing" | "planned";
  verification_check_key?: string;
}

export interface RollbackRecoveryV2 {
  rollback: string;
  recovery: string;
  verification_check_keys: string[];
}

export type CounterfactualMutationV2 =
  | { type: "remove_paths"; paths: string[] }
  | { type: "replace_file"; path: string; fixture_path: string };

export interface CounterfactualControlV2 {
  key: string;
  claims: string[];
  check_key: string;
  mutation: CounterfactualMutationV2;
  expected_assertion_failures: string[];
}

export interface PopulationRequirementV2 {
  check_key: string;
  claims: string[];
  observations: {
    eligible_ids: string;
    observed_ids: string;
    excluded_items: string;
  };
  exclusion_rules: KeyedStatementV2[];
}

export interface DeliveryOutcomeV2 {
  key: string;
  title: string;
  depends_on: string[];
  product: {
    observable_result: string;
    owner: DeliveryOwnerV2;
    requirements: DeliveryRequirementV2[];
    owner_surfaces: string[];
    controls: DeliveryControlV2[];
    non_completing_outcomes: KeyedStatementV2[];
  };
  technical: {
    obligations: DeliveryObligationV2[];
    expected_change_paths: string[];
    allowed_support_paths: string[];
    forbidden_paths: string[];
    bindings: DeliveryBindingV2[];
    forbidden_shortcuts: KeyedStatementV2[];
    rollback_and_recovery: RollbackRecoveryV2 | null;
  };
  acceptance: {
    checks: DeliveryCheckV2[];
    population: PopulationRequirementV2 | null;
    counterfactual_controls: CounterfactualControlV2[];
  };
}

export interface DeliveryContractV2 {
  schema_version: "long-task-delivery-v2";
  task: {
    id: string;
    title: string;
    goal: string;
    source_paths: string[];
    context_refs: string[];
    context_snapshot_mode: "referenced" | "full";
  };
  source_claims: SourceClaimV2[];
  risk: {
    requested_level: RequestedRiskLevel;
    facts: LongTaskRiskFacts;
  };
  global: {
    product: { non_goals: KeyedStatementV2[] };
    technical: {
      constraints: KeyedStatementV2[];
      forbidden_paths: KeyedPathV2[];
      forbidden_shortcuts: KeyedStatementV2[];
    };
    acceptance: {
      checks: DeliveryCheckV2[];
      external_confirmations: ExternalConfirmationV2[];
    };
  };
  outcomes: DeliveryOutcomeV2[];
}
