export const LONG_TASK_SOURCE_FILES = {
  product: "product-architecture-source.yaml",
  plan: "technical-realization-plan.yaml",
  checklist: "acceptance-checklist.yaml"
} as const;

export type DeliveryScope = "system_capability_build" | "representative_sample_validation" | "full_population_operation";
export type PopulationPolicy = "not_applicable" | "representative_sample" | "full_population";
export type ProofSurface = "ui_browser" | "runtime_behavior" | "api_contract" | "data_state" | "security_boundary" | "population_coverage" | "implementation_structure";
export type ExternalBlockerReasonCode = "mfa_required" | "credential_unavailable" | "permission_denied" | "user_contract_decision_required" | "external_approval_required" | "platform_or_legal_restriction" | "external_service_persistently_unavailable";

export interface ProductSourceV2 {
  schema_version: "product-source-v2";
  product_goal: string;
  delivery_scope: DeliveryScope;
  full_population_required: boolean;
  requirements: Array<{ id: string; statement: string; observable_outcome: string; owner_boundary: string; owner_surfaces: string[]; context_refs: string[]; population_policy: PopulationPolicy }>;
  boundaries: Array<{ id: string; rule: string }>;
  non_completing_outcomes: Array<{ id: string; forbidden_outcome: string }>;
  representative_samples_validate: string[];
  representative_samples_do_not_validate: string[];
  out_of_scope_backlog: string[];
}

export interface TechnicalPlanV2 {
  schema_version: "technical-plan-v2";
  plan_items: Array<{ id: string; title: string; obligations: LongTaskObligationV2[]; implementation_notes: string[] }>;
}

export interface LongTaskObligationV2 {
  id: string;
  statement: string;
  source_requirement_ids: string[];
  implementation_bindings: { paths: string[]; symbols: string[]; schemas: string[]; routes: string[] };
  forbidden_shortcuts: Array<{ id: string; statement: string; source_boundary_ids: string[] }>;
  related_ac_ids: string[];
}

export interface VerificationSpecV2 {
  id: string;
  runner_type: "process" | "browser" | "api" | "data" | "static";
  executable: string;
  argv: string[];
  cwd: string;
  timeout_ms: number;
  oracle_protocol: "ty-context-observation-v1";
  oracle_paths: string[];
  implementation_test_paths: string[];
  input_paths: string[];
  artifact_globs: string[];
  positive_assertions: Array<{ id: string; oracle_check_id: string; expected: unknown }>;
  negative_assertions: Array<{ id: string; oracle_check_id: string; forbidden: unknown; source_boundary_ids: string[]; source_non_completing_ids: string[]; source_forbidden_shortcut_ids: string[] }>;
  invalid_completion_signals: string[];
  environment_requirements: Array<{ id: string; kind: "runtime" | "browser" | "credential" | "permission" | "external_service" | "user_decision" | "external_approval" | "platform_restriction"; required: boolean; reason_code: ExternalBlockerReasonCode; minimal_user_action: string; local_alternatives: string[] }>;
  population_enumerator?: { oracle_check_id: string; exclusion_rule_ids: string[]; required_coverage_percent: 100 };
}

export interface AcceptanceChecklistV2 {
  schema_version: "acceptance-checklist-v2";
  acceptance_criteria: Array<{ id: string; title: string; obligation_refs: string[]; validates: string[]; does_not_validate: string[]; proof_surfaces: ProofSurface[]; verification_specs: VerificationSpecV2[] }>;
}

export interface LongTaskSourceBundleV2 {
  product: ProductSourceV2;
  plan: TechnicalPlanV2;
  checklist: AcceptanceChecklistV2;
  source_paths: { product: string; plan: string; checklist: string };
}

export interface VerifierTrustInput { package_name: "project-tiny-context-harness"; package_version: string; cli_path: string; cli_sha256: string; hook_bundle_sha256: string }
export interface FrozenVerificationSpecV2 extends VerificationSpecV2 { normalized_sha256: string; executable_path: string; executable_sha256: string; oracle_sha256: Record<string, string>; global_invariant: boolean }
export interface CompiledContractV2 {
  schema_version: "compiled-long-task-contract-v2";
  contract_sha256: string;
  repository_root: string;
  workdir: string;
  sources: Record<string, { path: string; sha256: string }>;
  context_snapshot: { files: string[]; sha256: Record<string, string> };
  requirement_graph: Record<string, { obligation_ids: string[] }>;
  obligation_graph: Record<string, { requirement_ids: string[]; ac_ids: string[] }>;
  acceptance_graph: Record<string, { obligation_ids: string[]; verification_spec_ids: string[] }>;
  verification_specs: FrozenVerificationSpecV2[];
  verifier_identity: VerifierTrustInput;
}

export interface CoverageResult { passed: boolean; errors: string[]; warnings: string[] }
