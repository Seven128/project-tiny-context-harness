import type {
  DeliveryCheckV2,
  DeliveryContractV2,
  DeliveryOutcomeV2,
  DeliveryRunnerV2,
  ProofSurface,
} from "./long-task-contract-types.js";
import type {
  EffectiveRiskLevel,
  RiskFactName,
} from "./long-task-risk-types.js";

export interface WorkspaceFileV2 {
  path: string;
  mode: number;
  size: number;
  sha256: string;
}

export interface WorkspaceFingerprintV2 {
  head: string;
  head_tree: string;
  index_tree: string;
  staged_diff_sha256: string;
  unstaged_diff_sha256: string;
  untracked_sha256: string;
  status_sha256: string;
  identity: string;
}

export interface WorkspaceManifestV2 {
  repository_root: string;
  git_head: string;
  files: WorkspaceFileV2[];
  fingerprint: WorkspaceFingerprintV2;
  snapshot_sha256: string;
}

export interface FrozenRunnerV2 extends DeliveryRunnerV2 {
  executable: string;
  executable_argv_prefix: string[];
  resolved_cwd: string;
  resolved_target: string;
  definition_sha256: string;
  frozen_files: Record<string, string>;
  package_script: string | null;
  execution_identity: string;
}

export interface CompiledCheckV2 extends Omit<DeliveryCheckV2, "runner"> {
  internal_id: string;
  outcome_key: string | null;
  runner: FrozenRunnerV2;
  verification_input_hashes: Record<string, string>;
  raw_execution_identity: string;
}

export interface ProductClaimV2 {
  id: string;
  outcome_key: string;
  local_key: string;
  kind:
    | "result"
    | "control"
    | "non_completing"
    | "obligation"
    | "forbidden_shortcut";
  required_proof_surfaces: ProofSurface[];
}

export interface GlobalClaimV2 {
  id: string;
  local_key: string;
  kind:
    | "global_non_goal"
    | "global_constraint"
    | "global_forbidden_shortcut";
  required_polarity: "any" | "negative";
}

export interface ClaimProofV2 {
  check_key: string;
  assertion_key: string | null;
  polarity: "positive" | "negative" | "population" | "counterfactual";
  proof_surface: ProofSurface;
}

export interface ClaimCoverageSummaryV2 {
  claims_total: number;
  claims_covered: number;
  uncovered_claims: string[];
  claims_by_global: Record<
    string,
    { covered: boolean; proofs: ClaimProofV2[] }
  >;
  claims_by_outcome: Record<
    string,
    Record<string, { covered: boolean; proofs: ClaimProofV2[] }>
  >;
}

export interface AuthorityHashesV2 {
  source_authority_hash: string;
  product_authority_hash: string;
  acceptance_authority_hash: string;
  risk_authority_hash: string;
  technical_authority_hash: string;
}

export interface ProductSemanticProjectionV2 {
  task_goal: string;
  global_non_goals: Array<{ key: string; statement: string }>;
  outcomes: Array<{
    key: string;
    title: string;
    observable_result: string;
    owner: {
      label: string;
      owner_surfaces: string[];
    };
    controls: Array<{
      key: string;
      location: string;
      trigger: string;
      input: string;
      loading_state: string;
      empty_state: string;
      success_state: string;
      failure_state: string;
      feedback: string;
    }>;
    non_completing_outcomes: Array<{ key: string; statement: string }>;
  }>;
}

export interface GlobalSemanticProjectionV2 {
  constraints: Array<{ key: string; statement: string }>;
  forbidden_shortcuts: Array<{ key: string; statement: string }>;
}

export interface ContextAuthoritySnapshotV2 {
  mode: "referenced" | "full";
  topology_sha256: string;
  files: string[];
  sha256: Record<string, string>;
}

export interface NextAuthorityMaterialsV2 {
  source_hashes: Record<string, string>;
  context_snapshot: ContextAuthoritySnapshotV2;
  product_semantics: ProductSemanticProjectionV2;
  global_semantics: GlobalSemanticProjectionV2;
}

export interface AuthorityMaterialHashesV2 {
  source_hashes_sha256: string;
  context_snapshot_sha256: string;
  product_semantics_sha256: string;
  global_semantics_sha256: string;
}

export interface InitialTaskBaseV2 {
  git_commit: string;
  git_tree: string;
  workspace_manifest: WorkspaceManifestV2;
}

export interface VerifierContentAuthority {
  package_name: string;
  bundle_sha256: string;
  schema_sha256: string;
  hook_sha256: string;
  bundle_files: Record<string, string>;
}

export interface VerifierRuntimeLocator {
  package_version: string;
  package_root: string;
}

export interface VerifierIdentityV2
  extends VerifierContentAuthority,
    VerifierRuntimeLocator {
  package_name: "project-tiny-context-harness";
}

export interface CompiledOutcomeV2 extends Omit<
  DeliveryOutcomeV2,
  "acceptance"
> {
  internal_id: string;
  generated_claims: ProductClaimV2[];
  risk_reasons: RiskFactName[];
  acceptance: Omit<DeliveryOutcomeV2["acceptance"], "checks"> & {
    checks: CompiledCheckV2[];
  };
}

export interface CompiledDeliveryContractV2 {
  schema_version: "compiled-long-task-delivery-v2";
  compiled_identity: string;
  repository_root: string;
  workdir: string;
  contract_file: string;
  contract_sha256: string;
  contract_files: Record<string, string>;
  source_hashes: Record<string, string>;
  context_snapshot: {
    mode: "referenced" | "full";
    topology_sha256: string;
    files: string[];
    sha256: Record<string, string>;
  };
  verifier_identity: VerifierIdentityV2;
  effective_risk: EffectiveRiskLevel;
  risk_reasons: string[];
  baseline_workspace: WorkspaceManifestV2;
  initial_task_base: InitialTaskBaseV2;
  authority_hashes: AuthorityHashesV2;
  authority_materials: NextAuthorityMaterialsV2;
  authority_revision: number;
  claim_coverage: ClaimCoverageSummaryV2;
  task: DeliveryContractV2["task"];
  risk: DeliveryContractV2["risk"];
  source_claims: DeliveryContractV2["source_claims"];
  global: Omit<DeliveryContractV2["global"], "acceptance"> & {
    acceptance: {
      checks: CompiledCheckV2[];
      external_confirmations: DeliveryContractV2["global"]["acceptance"]["external_confirmations"];
    };
  };
  outcomes: CompiledOutcomeV2[];
}

export interface LongTaskFindingV2 {
  code: string;
  outcome_key: string | null;
  check_key: string | null;
  message: string;
  expected?: unknown;
  actual?: unknown;
  next_action: string;
}

export type CheckExecutionStatusV2 =
  | "passed"
  | "assertion_failed"
  | "test_failed"
  | "blocked_external"
  | "infrastructure_error"
  | "invalid_evidence";

export interface AssertionResultV2 {
  key: string;
  polarity: "positive" | "negative";
  passed: boolean;
  claims: string[];
}

export interface RawCommandExecutionV2 {
  raw_execution_identity: string;
  execution_identity: string;
  execution_status:
    | "completed"
    | "blocked_external"
    | "infrastructure_error"
    | "invalid_evidence";
  exit_code: number;
  observations: Record<string, unknown>;
  stdout_sha256: string;
  stderr_sha256: string;
  attempts: number;
  duration_ms: number;
  error: string | null;
}

export interface CheckExecutionResultV2 {
  internal_id: string;
  outcome_key: string | null;
  check_key: string;
  status: CheckExecutionStatusV2;
  execution_identity: string;
  assertion_results: AssertionResultV2[];
  observations: Record<string, unknown>;
  artifact_hashes: Record<string, string>;
  claim_proofs: ClaimProofV2[];
  findings: LongTaskFindingV2[];
  attempts: number;
  duration_ms: number;
}

export interface ProgressRecordV2 {
  schema_version: "long-task-progress-record-v2";
  compiled_identity: string;
  outcome_authority_hash: string;
  check_identity: string;
  check_internal_id: string;
  outcome_key: string | null;
  check_key: string;
  runner_verifier_identity: string;
  relevant_context_identity: string;
  resolved_input_path_hashes: Record<string, string>;
  binding_carrier_path_hashes: Record<string, string>;
  dependency_interface_identities: Record<string, string>;
  result: CheckExecutionStatusV2;
  check_result: CheckExecutionResultV2;
  findings: LongTaskFindingV2[];
  completed_at: string;
}

export interface TargetedVerificationResultV2 {
  schema_version: "long-task-targeted-progress-v2";
  compiled_identity: string;
  snapshot_sha256: string;
  acceptance_authorized: false;
  selected_outcome: string | null;
  selected_check: string | null;
  updated_progress_records: string[];
  check_results: CheckExecutionResultV2[];
  findings: LongTaskFindingV2[];
  completed_at: string;
}

export type OutcomeStatusV2 =
  | "unverified"
  | "progress_passing"
  | "progress_failing"
  | "progress_stale"
  | "blocked_external";

export interface FinalReceiptV2 {
  schema_version: "long-task-final-receipt-v2";
  receipt_sha256: string;
  authority_scope: "audit_only";
  reusable_for_acceptance: false;
  workflow_status:
    | "machine_accepted"
    | "machine_accepted_external_pending"
    | "needs_work"
    | "blocked_external";
  compiled_identity: string;
  contract_sha256: string;
  snapshot_sha256: string;
  git_head: string;
  git_tree: string;
  source_hashes: Record<string, string>;
  context_hashes: Record<string, string>;
  verifier_identity: VerifierIdentityV2;
  check_results: CheckExecutionResultV2[];
  outcome_results: Record<string, "passed" | "failed" | "blocked_external">;
  external_confirmations: DeliveryContractV2["global"]["acceptance"]["external_confirmations"];
  findings: LongTaskFindingV2[];
  snapshot_preparation_ms: number;
  started_at: string;
  completed_at: string;
}

export type StrictRiskObligationV2 = {
  outcome_key: string;
  risk_fact: RiskFactName;
  obligations: string[];
};
