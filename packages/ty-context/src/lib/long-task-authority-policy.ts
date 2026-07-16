import type {
  CounterfactualControlV2,
  DeliveryAssertionV2,
  DeliveryBindingV2,
  DeliveryCheckV2,
  DeliveryContractV2,
  DeliveryControlV2,
  DeliveryObligationV2,
  DeliveryOutcomeV2,
  DeliveryOwnerV2,
  DeliveryRunnerV2,
  PopulationRequirementV2,
  RollbackRecoveryV2,
  SourceClaimV2,
} from "./long-task-contract-types.js";

export type AuthorityFieldPolicy =
  | "identity"
  | "semantic_user_review"
  | "proof_additive"
  | "runner_authority"
  | "input_coverage"
  | "output_requirement"
  | "scope"
  | "readiness_only"
  | "descriptive_non_authoritative";

type TaskV2 = DeliveryContractV2["task"];
type RiskV2 = DeliveryContractV2["risk"];
type GlobalProductV2 = DeliveryContractV2["global"]["product"];
type GlobalTechnicalV2 = DeliveryContractV2["global"]["technical"];
type GlobalAcceptanceV2 = DeliveryContractV2["global"]["acceptance"];
type OutcomeProductV2 = DeliveryOutcomeV2["product"];
type DeliveryRequirementV2 = OutcomeProductV2["requirements"][number];
type OutcomeTechnicalV2 = DeliveryOutcomeV2["technical"];
type OutcomeAcceptanceV2 = DeliveryOutcomeV2["acceptance"];

export const TASK_AUTHORITY_POLICY = {
  id: "identity",
  title: "descriptive_non_authoritative",
  goal: "semantic_user_review",
  source_paths: "scope",
  context_refs: "scope",
  context_snapshot_mode: "scope",
} satisfies Record<keyof TaskV2, AuthorityFieldPolicy>;

export const SOURCE_CLAIM_AUTHORITY_POLICY = {
  key: "identity",
  source_ref: "scope",
  statement: "semantic_user_review",
  disposition: "semantic_user_review",
} satisfies Record<keyof SourceClaimV2, AuthorityFieldPolicy>;

export const RISK_AUTHORITY_POLICY = {
  requested_level: "semantic_user_review",
  facts: "semantic_user_review",
} satisfies Record<keyof RiskV2, AuthorityFieldPolicy>;

export const GLOBAL_PRODUCT_AUTHORITY_POLICY = {
  non_goals: "semantic_user_review",
} satisfies Record<keyof GlobalProductV2, AuthorityFieldPolicy>;

export const GLOBAL_TECHNICAL_AUTHORITY_POLICY = {
  constraints: "semantic_user_review",
  forbidden_paths: "scope",
  forbidden_shortcuts: "semantic_user_review",
} satisfies Record<keyof GlobalTechnicalV2, AuthorityFieldPolicy>;

export const GLOBAL_ACCEPTANCE_AUTHORITY_POLICY = {
  checks: "proof_additive",
  external_confirmations: "semantic_user_review",
} satisfies Record<keyof GlobalAcceptanceV2, AuthorityFieldPolicy>;

export const OUTCOME_AUTHORITY_POLICY = {
  key: "identity",
  title: "descriptive_non_authoritative",
  depends_on: "readiness_only",
  product: "semantic_user_review",
  technical: "semantic_user_review",
  acceptance: "proof_additive",
} satisfies Record<keyof DeliveryOutcomeV2, AuthorityFieldPolicy>;

export const OUTCOME_PRODUCT_AUTHORITY_POLICY = {
  observable_result: "semantic_user_review",
  owner: "semantic_user_review",
  requirements: "semantic_user_review",
  owner_surfaces: "semantic_user_review",
  controls: "semantic_user_review",
  non_completing_outcomes: "semantic_user_review",
} satisfies Record<keyof OutcomeProductV2, AuthorityFieldPolicy>;

export const REQUIREMENT_AUTHORITY_POLICY = {
  key: "identity",
  statement: "semantic_user_review",
  required_proof_surfaces: "proof_additive",
} satisfies Record<keyof DeliveryRequirementV2, AuthorityFieldPolicy>;

export const OWNER_AUTHORITY_POLICY = {
  label: "identity",
  context_refs: "scope",
  path_globs: "scope",
} satisfies Record<keyof DeliveryOwnerV2, AuthorityFieldPolicy>;

export const CONTROL_AUTHORITY_POLICY = {
  key: "identity",
  location: "semantic_user_review",
  trigger: "semantic_user_review",
  input: "semantic_user_review",
  loading_state: "semantic_user_review",
  empty_state: "semantic_user_review",
  success_state: "semantic_user_review",
  failure_state: "semantic_user_review",
  feedback: "semantic_user_review",
} satisfies Record<keyof DeliveryControlV2, AuthorityFieldPolicy>;

export const OUTCOME_TECHNICAL_AUTHORITY_POLICY = {
  obligations: "semantic_user_review",
  expected_change_paths: "scope",
  allowed_support_paths: "scope",
  forbidden_paths: "scope",
  bindings: "semantic_user_review",
  forbidden_shortcuts: "semantic_user_review",
  rollback_and_recovery: "semantic_user_review",
} satisfies Record<keyof OutcomeTechnicalV2, AuthorityFieldPolicy>;

export const OBLIGATION_AUTHORITY_POLICY = {
  key: "identity",
  statement: "semantic_user_review",
  required_proof_surfaces: "proof_additive",
} satisfies Record<keyof DeliveryObligationV2, AuthorityFieldPolicy>;

export const BINDING_AUTHORITY_POLICY = {
  key: "identity",
  kind: "semantic_user_review",
  target: "semantic_user_review",
  carrier_paths: "scope",
  existence: "semantic_user_review",
  verification_check_key: "proof_additive",
} satisfies Record<keyof DeliveryBindingV2, AuthorityFieldPolicy>;

export const ROLLBACK_AUTHORITY_POLICY = {
  rollback: "semantic_user_review",
  recovery: "semantic_user_review",
  verification_check_keys: "proof_additive",
} satisfies Record<keyof RollbackRecoveryV2, AuthorityFieldPolicy>;

export const OUTCOME_ACCEPTANCE_AUTHORITY_POLICY = {
  checks: "proof_additive",
  population: "proof_additive",
  counterfactual_controls: "proof_additive",
} satisfies Record<keyof OutcomeAcceptanceV2, AuthorityFieldPolicy>;

export const CHECK_AUTHORITY_POLICY = {
  key: "identity",
  proof_surface: "semantic_user_review",
  runner: "runner_authority",
  verification_inputs: "proof_additive",
  input_paths: "input_coverage",
  expected_output_paths: "output_requirement",
  artifact_globs: "proof_additive",
  positive_assertions: "proof_additive",
  negative_assertions: "proof_additive",
  environment_requirements: "proof_additive",
} satisfies Record<keyof DeliveryCheckV2, AuthorityFieldPolicy>;

export const ASSERTION_AUTHORITY_POLICY = {
  key: "identity",
  criterion: "semantic_user_review",
  claims: "proof_additive",
  observation: "proof_additive",
  operator: "proof_additive",
  expected: "proof_additive",
} satisfies Record<keyof DeliveryAssertionV2, AuthorityFieldPolicy>;

export const RUNNER_AUTHORITY_POLICY = {
  type: "runner_authority",
  target: "runner_authority",
  argv: "runner_authority",
  cwd: "runner_authority",
  timeout_ms: "runner_authority",
  effect: "runner_authority",
  retry_policy: "runner_authority",
  idempotent: "runner_authority",
} satisfies Record<keyof DeliveryRunnerV2, AuthorityFieldPolicy>;

export const POPULATION_AUTHORITY_POLICY = {
  check_key: "proof_additive",
  claims: "proof_additive",
  observations: "proof_additive",
  exclusion_rules: "proof_additive",
} satisfies Record<keyof PopulationRequirementV2, AuthorityFieldPolicy>;

export const COUNTERFACTUAL_AUTHORITY_POLICY = {
  key: "identity",
  claims: "proof_additive",
  check_key: "proof_additive",
  mutation: "proof_additive",
  expected_assertion_failures: "proof_additive",
} satisfies Record<keyof CounterfactualControlV2, AuthorityFieldPolicy>;

export const AUTHORITY_FIELD_POLICY_REGISTRIES = {
  task: TASK_AUTHORITY_POLICY,
  source_claim: SOURCE_CLAIM_AUTHORITY_POLICY,
  risk: RISK_AUTHORITY_POLICY,
  global_product: GLOBAL_PRODUCT_AUTHORITY_POLICY,
  global_technical: GLOBAL_TECHNICAL_AUTHORITY_POLICY,
  global_acceptance: GLOBAL_ACCEPTANCE_AUTHORITY_POLICY,
  outcome: OUTCOME_AUTHORITY_POLICY,
  outcome_product: OUTCOME_PRODUCT_AUTHORITY_POLICY,
  requirement: REQUIREMENT_AUTHORITY_POLICY,
  owner: OWNER_AUTHORITY_POLICY,
  control: CONTROL_AUTHORITY_POLICY,
  outcome_technical: OUTCOME_TECHNICAL_AUTHORITY_POLICY,
  obligation: OBLIGATION_AUTHORITY_POLICY,
  binding: BINDING_AUTHORITY_POLICY,
  rollback: ROLLBACK_AUTHORITY_POLICY,
  outcome_acceptance: OUTCOME_ACCEPTANCE_AUTHORITY_POLICY,
  check: CHECK_AUTHORITY_POLICY,
  assertion: ASSERTION_AUTHORITY_POLICY,
  runner: RUNNER_AUTHORITY_POLICY,
  population: POPULATION_AUTHORITY_POLICY,
  counterfactual: COUNTERFACTUAL_AUTHORITY_POLICY,
} as const;

export function projectFieldsByPolicy<T extends object>(
  value: T,
  policy: Record<keyof T, AuthorityFieldPolicy>,
  included: ReadonlySet<AuthorityFieldPolicy>,
): Partial<T> {
  return Object.fromEntries(
    (Object.keys(policy) as Array<keyof T>)
      .filter((key) => included.has(policy[key]))
      .map((key) => [key, value[key]]),
  ) as Partial<T>;
}
