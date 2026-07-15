import type {
  CompiledCheckV1,
  DeliveryCheckV1,
  ExternalConfirmationV1,
  InitialTaskBaseV1,
  LongTaskFindingV1,
  SourceClaimV1,
  VerifierIdentityV1,
  WorkspaceManifestV1,
  CheckExecutionResultV1,
} from "./long-task-delivery-types.js";

export type BoundarySeparationReasonV1 =
  | "independent_release"
  | "independent_rollback"
  | "different_owner_or_authority"
  | "different_risk_or_approval_boundary"
  | "independent_product_capability";

export interface DeliverySetContractEntryV1 {
  key: string;
  workdir: string;
  depends_on: string[];
  source_claim_refs: string[];
  boundary: {
    observable_result: string;
    separation_reason: BoundarySeparationReasonV1;
    evidence: string;
  };
}

export interface DeliverySetV1 {
  schema_version: "long-task-delivery-set-v1";
  multi_repository_change: boolean;
  set: {
    id: string;
    title: string;
    goal: string;
    source_paths: string[];
    context_refs: string[];
    context_snapshot_mode: "referenced" | "full";
    risk_floor: "standard" | "strict";
  };
  source_claims: SourceClaimV1[];
  global: {
    product: { non_goals: string[]; owner_boundaries: string[] };
    technical: {
      constraints: string[];
      forbidden_paths: string[];
      forbidden_shortcuts: string[];
    };
    acceptance: {
      integration_checks: DeliveryCheckV1[];
      external_confirmations: ExternalConfirmationV1[];
    };
  };
  contracts: DeliverySetContractEntryV1[];
}

export interface CompiledDeliverySetContractEntryV1 extends DeliverySetContractEntryV1 {
  resolved_workdir: string;
}

export interface CompiledDeliverySetV1 {
  schema_version: "compiled-long-task-delivery-set-v1";
  compiled_set_identity: string;
  repository_root: string;
  set_workdir: string;
  set_file: string;
  set_sha256: string;
  source_hashes: Record<string, string>;
  context_snapshot: {
    mode: "referenced" | "full";
    topology_sha256: string;
    files: string[];
    sha256: Record<string, string>;
  };
  verifier_identity: VerifierIdentityV1;
  initial_task_base: InitialTaskBaseV1;
  set_authority_hashes: {
    source: string;
    product: string;
    acceptance: string;
    risk: string;
    technical: string;
    boundaries: string;
  };
  definition: DeliverySetV1;
  integration_checks: CompiledCheckV1[];
  contracts: CompiledDeliverySetContractEntryV1[];
}

export interface ChildContractGateReceiptV1 {
  schema_version: "long-task-child-contract-gate-receipt-v1";
  receipt_sha256: string;
  workflow_status: "contract_gate_passed";
  set_identity: string;
  contract_key: string;
  contract_identity: string;
  snapshot_sha256: string;
  interface_identity: string;
  check_results: CheckExecutionResultV1[];
  completed_at: string;
}

export interface DeliverySetReceiptV1 {
  schema_version: "long-task-delivery-set-receipt-v1";
  receipt_sha256: string;
  workflow_status:
    "delivery_set_accepted" | "machine_accepted_external_pending";
  compiled_set_identity: string;
  snapshot_sha256: string;
  git_head: string;
  git_tree: string;
  source_hashes: Record<string, string>;
  context_hashes: Record<string, string>;
  verifier_identity: VerifierIdentityV1;
  child_contract_identities: Record<string, string>;
  child_check_results: Record<string, CheckExecutionResultV1[]>;
  integration_check_results: CheckExecutionResultV1[];
  findings: LongTaskFindingV1[];
  started_at: string;
  completed_at: string;
}

export interface DeliverySetStatusV1 {
  schema_version: "long-task-delivery-set-status-v1";
  set_id: string;
  compiled_set_identity: string;
  workspace_snapshot_sha256: string;
  ready_contracts: string[];
  blocked_contracts: string[];
  contract_gate_passed: string[];
  stale_contracts: string[];
  remaining_contracts: string[];
  final_result:
    | "none"
    | "delivery_set_accepted_fresh"
    | "machine_accepted_external_pending_fresh"
    | "accepted_stale"
    | "needs_work";
  findings: LongTaskFindingV1[];
}

export type BoundaryCheckDecisionV1 =
  | "single_contract"
  | "single_contract_bundle"
  | "delivery_set"
  | "decision_required"
  | "capacity_blocked";

export interface BoundaryCheckInputV1 {
  atomic_user_loop: boolean;
  capacity_requires_fragments: boolean;
  capacity_available: boolean;
  split_motivations: string[];
  candidates: Array<{
    observable_result: string;
    executable_acceptance: boolean;
    separation_reason?: BoundarySeparationReasonV1;
    preserves_atomic_loop: boolean;
  }>;
}

export interface DeliverySetRunV1 {
  snapshot: WorkspaceManifestV1;
  check_results: CheckExecutionResultV1[];
  findings: LongTaskFindingV1[];
}

export interface CompileDeliverySetOptionsV1 {
  require_completion_gate?: boolean;
  amendment_reason?: string;
}
