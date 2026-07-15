import type {
  DeliveryCheckV1,
  DeliveryContractV1,
  DeliveryOutcomeV1,
  DeliveryRunnerV1,
  EffectiveRiskLevel,
} from "./long-task-contract-types.js";

export interface WorkspaceFileV1 {
  path: string;
  mode: number;
  size: number;
  sha256: string;
}

export interface WorkspaceManifestV1 {
  repository_root: string;
  git_head: string;
  files: WorkspaceFileV1[];
  snapshot_sha256: string;
}

export interface FrozenRunnerV1 extends DeliveryRunnerV1 {
  executable: string;
  executable_argv_prefix: string[];
  definition_sha256: string;
  frozen_files: Record<string, string>;
  execution_identity: string;
}

export interface CompiledCheckV1 extends Omit<DeliveryCheckV1, "runner"> {
  internal_id: string;
  outcome_key: string | null;
  runner: FrozenRunnerV1;
  verification_source_hashes: Record<string, string>;
}

export interface AuthorityHashesV1 {
  source_authority_hash: string;
  product_authority_hash: string;
  acceptance_authority_hash: string;
  risk_authority_hash: string;
  technical_authority_hash: string;
}

export interface InitialTaskBaseV1 {
  git_commit: string;
  git_tree: string;
  workspace_manifest: WorkspaceManifestV1;
}

export interface DeliverySetChildBindingV1 {
  set_workdir: string;
  set_identity: string;
  contract_key: string;
  dependency_contract_identities: Record<string, string>;
  dependency_receipt_identities: Record<string, string>;
  dependency_interface_identities: Record<string, string>;
}

export interface VerifierIdentityV1 {
  package_name: "project-tiny-context-harness";
  package_version: string;
  package_root: string;
  bundle_sha256: string;
  bundle_files: Record<string, string>;
  schema_sha256: string;
  hook_sha256: string;
}

export interface CompiledOutcomeV1 extends Omit<
  DeliveryOutcomeV1,
  "acceptance"
> {
  internal_id: string;
  acceptance: Omit<DeliveryOutcomeV1["acceptance"], "checks"> & {
    checks: CompiledCheckV1[];
  };
}

export interface CompiledDeliveryContractV1 {
  schema_version: "compiled-long-task-delivery-v1";
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
  verifier_identity: VerifierIdentityV1;
  effective_risk: EffectiveRiskLevel;
  risk_reasons: string[];
  baseline_workspace: WorkspaceManifestV1;
  initial_task_base: InitialTaskBaseV1;
  authority_hashes: AuthorityHashesV1;
  delivery_set: DeliverySetChildBindingV1 | null;
  task: DeliveryContractV1["task"];
  risk: DeliveryContractV1["risk"];
  global: Omit<DeliveryContractV1["global"], "acceptance"> & {
    acceptance: {
      checks: CompiledCheckV1[];
      external_confirmations: DeliveryContractV1["global"]["acceptance"]["external_confirmations"];
    };
  };
  outcomes: CompiledOutcomeV1[];
}

export interface LongTaskFindingV1 {
  code: string;
  outcome_key: string | null;
  check_key: string | null;
  message: string;
  expected?: unknown;
  actual?: unknown;
  next_action: string;
}

export interface CheckExecutionResultV1 {
  internal_id: string;
  outcome_key: string | null;
  check_key: string;
  status: "passed" | "failed" | "blocked_external";
  execution_identity: string;
  assertion_results: boolean[];
  observations: Record<string, unknown>;
  findings: LongTaskFindingV1[];
  attempts: number;
  duration_ms: number;
}

export interface ProgressRecordV1 {
  schema_version: "long-task-progress-record-v1";
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
  result: "passed" | "failed" | "blocked_external";
  check_result: CheckExecutionResultV1;
  findings: LongTaskFindingV1[];
  completed_at: string;
}

export interface TargetedVerificationResultV1 {
  schema_version: "long-task-targeted-progress-v1";
  compiled_identity: string;
  snapshot_sha256: string;
  acceptance_authorized: false;
  selected_outcome: string | null;
  selected_check: string | null;
  updated_progress_records: string[];
  check_results: CheckExecutionResultV1[];
  findings: LongTaskFindingV1[];
  completed_at: string;
}

export type OutcomeStatusV1 =
  | "unverified"
  | "progress_passing"
  | "progress_failing"
  | "progress_stale"
  | "blocked_external";

export interface FinalReceiptV1 {
  schema_version: "long-task-final-receipt-v1";
  receipt_sha256: string;
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
  verifier_identity: VerifierIdentityV1;
  check_results: CheckExecutionResultV1[];
  outcome_results: Record<string, "passed" | "failed" | "blocked_external">;
  findings: LongTaskFindingV1[];
  started_at: string;
  completed_at: string;
}
