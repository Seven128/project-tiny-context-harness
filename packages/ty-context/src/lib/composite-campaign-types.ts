import { COMPOSITE_INPUT_CONTRACT_VERSION } from "./composite-input-contract.js";

export const SCOPE_FIT_RESULT_SCHEMA_VERSION = "scope-fit-result-v1" as const;
export const COMPOSITE_AUTHORING_PACKET_SCHEMA_VERSION = "composite-authoring-packet-v1" as const;
export const COMPOSITE_CAMPAIGN_SCHEMA_VERSION = "composite-campaign-v1" as const;
export const COMPOSITE_CAMPAIGN_EVENT_SCHEMA_VERSION = "composite-campaign-event-v1" as const;
export const COMPOSITE_CAMPAIGN_BINDING_SCHEMA_VERSION = "composite-campaign-binding-v1" as const;

export type ScopeFitDecisionV1 =
  | "fit_for_three_inputs"
  | "split_required"
  | "blocked_for_decision"
  | "not_long_task";

export type CompositeSfcIdV1 = `SFC-${number}`;

export interface ScopeFitSliceV1 {
  slice_id: CompositeSfcIdV1;
  stable_key: string;
  title: string;
  objective: string;
  depends_on: CompositeSfcIdV1[];
  priority: number;
  scope_summary: string[];
  out_of_scope: string[];
  decisions_required: string[];
}

export interface ScopeFitDecisionRequiredV1 {
  decision_id: string;
  question: string;
  candidates: CompositeSfcIdV1[];
}

export interface ScopeFitResultV1 {
  schema_version: typeof SCOPE_FIT_RESULT_SCHEMA_VERSION;
  request_sha256: string;
  decision: ScopeFitDecisionV1;
  rationale: string[];
  slices: ScopeFitSliceV1[];
  selected_slice_id: CompositeSfcIdV1 | null;
  decision_required: ScopeFitDecisionRequiredV1 | null;
}

export type CompositeContextDeltaCandidateValueV1 = "none" | "required";
export type CompositeAuthoringFieldValueV1 = string | boolean | string[];
export type CompositeAuthoringFieldsV1 = Record<string, CompositeAuthoringFieldValueV1>;

export interface CompositeAuthoringPlanItemV1 {
  id: string;
  title: string;
  fields: CompositeAuthoringFieldsV1;
}

export interface CompositeAuthoringAcceptanceCriterionV1 {
  id: string;
  title: string;
  fields: CompositeAuthoringFieldsV1;
}

export interface CompositeAuthoringPacketV1 {
  schema_version: typeof COMPOSITE_AUTHORING_PACKET_SCHEMA_VERSION;
  campaign_id: string;
  slice_id: CompositeSfcIdV1;
  revision: number;
  created_at: string;
  request_sha256: string;
  previous_packet_sha256: string | null;
  input_contract: {
    schema_version: typeof COMPOSITE_INPUT_CONTRACT_VERSION;
    contract_sha256: string;
  };
  context_delta_candidate: {
    product: CompositeContextDeltaCandidateValueV1;
    technical: CompositeContextDeltaCandidateValueV1;
    notes: string[];
  };
  authorities: {
    product_architecture_source: { fields: CompositeAuthoringFieldsV1 };
    technical_realization_plan: { plan_items: CompositeAuthoringPlanItemV1[] };
    acceptance_checklist: { acceptance_criteria: CompositeAuthoringAcceptanceCriterionV1[] };
  };
}

export type CompositeCampaignSelectionStatusV1 = "candidate" | "selected" | "superseded";
export type CompositeCampaignAuthoringStatusV1 = "draft" | "ready" | "stale";
export type CompositeCampaignHandoffStatusV1 = "none" | "ready" | "started";
export type CompositeCampaignResultProjectionV1 = "unrecorded" | "accept" | "blocked" | "reject" | "sync_pending";
export type CompositeCampaignResultStatusV1 = "accept" | "blocked" | "reject";

export interface CompositeCampaignSourceHashesV1 {
  product_architecture_source: string;
  technical_realization_plan: string;
  acceptance_checklist: string;
}

export interface CompositeCampaignProjectionV1 {
  product_architecture_source_sha256: string;
  technical_realization_plan_sha256: string;
  acceptance_checklist_sha256: string;
  bundle_sha256: string;
  rendered_at: string;
}

export interface CompositeCampaignRevisionV1 {
  revision: number;
  created_at: string;
  packet_sha256: string;
  previous_packet_sha256: string | null;
  input_contract_sha256: string;
  projections: CompositeCampaignProjectionV1 | null;
}

export interface CompositeCampaignBindingGoalV1 {
  goal_id: string;
  started_at: string;
}

export interface CompositeCampaignBindingResultV1 {
  status: CompositeCampaignResultStatusV1;
  task_attempt_id: string;
  source_hashes_sha256: string;
  final_gate_event_sha256: string;
  recorded_at: string;
}

export interface CompositeCampaignBindingV1 {
  schema_version: typeof COMPOSITE_CAMPAIGN_BINDING_SCHEMA_VERSION;
  binding_id: string;
  campaign_id: string;
  slice_id: CompositeSfcIdV1;
  revision: number;
  request_sha256: string;
  packet_sha256: string;
  input_contract_sha256: string;
  source_hashes: CompositeCampaignSourceHashesV1;
  workdir: string;
  task: { task_id: string; task_attempt_id: string };
  handed_off_at: string;
  goal: CompositeCampaignBindingGoalV1 | null;
  result: CompositeCampaignBindingResultV1 | null;
}

export interface CompositeCampaignSliceV1 {
  slice_id: CompositeSfcIdV1;
  stable_key: string;
  title: string;
  depends_on: CompositeSfcIdV1[];
  priority: number;
  selection_status: CompositeCampaignSelectionStatusV1;
  authoring_status: CompositeCampaignAuthoringStatusV1;
  handoff_status: CompositeCampaignHandoffStatusV1;
  result_projection: CompositeCampaignResultProjectionV1;
  current_revision: number | null;
  revisions: CompositeCampaignRevisionV1[];
  binding: CompositeCampaignBindingV1 | null;
}

export interface CompositeCampaignV1 {
  schema_version: typeof COMPOSITE_CAMPAIGN_SCHEMA_VERSION;
  campaign_id: string;
  generation: number;
  created_at: string;
  updated_at: string;
  request: { sha256: string; bytes: number };
  scope_fit: ScopeFitResultV1 | null;
  scope_fit_sha256: string | null;
  event_cursor: { sequence: number; last_event_sha256: string };
  slices: Partial<Record<CompositeSfcIdV1, CompositeCampaignSliceV1>>;
}

export type CompositeCampaignEventKindV1 =
  | "campaign_created"
  | "scope_fit_applied"
  | "packet_revision_created"
  | "projection_published"
  | "handoff_published"
  | "goal_bound"
  | "result_projected";

interface CompositeCampaignEventBaseV1<
  Kind extends CompositeCampaignEventKindV1,
  Payload extends Record<string, string | number | boolean | null>
> {
  schema_version: typeof COMPOSITE_CAMPAIGN_EVENT_SCHEMA_VERSION;
  event_id: string;
  transaction_id: string;
  operation_id: string;
  sequence: number;
  campaign_id: string;
  slice_id: CompositeSfcIdV1 | null;
  revision: number | null;
  manifest_generation: number;
  previous_event_sha256: string | null;
  kind: Kind;
  payload: Payload;
}

export type CompositeCampaignEventV1 =
  | CompositeCampaignEventBaseV1<"campaign_created", { request_sha256: string; redaction_count: number }>
  | CompositeCampaignEventBaseV1<"scope_fit_applied", { scope_fit_sha256: string; decision: ScopeFitDecisionV1; selected_slice_id: CompositeSfcIdV1 | null }>
  | CompositeCampaignEventBaseV1<"packet_revision_created", { packet_sha256: string; previous_packet_sha256: string | null }>
  | CompositeCampaignEventBaseV1<"projection_published", { bundle_sha256: string }>
  | CompositeCampaignEventBaseV1<"handoff_published", { binding_id: string; task_id: string; task_attempt_id: string }>
  | CompositeCampaignEventBaseV1<"goal_bound", { binding_id: string; goal_id: string }>
  | CompositeCampaignEventBaseV1<"result_projected", { binding_id: string; status: CompositeCampaignResultStatusV1; final_gate_event_sha256: string }>;

export interface CompositeCampaignLoadedSnapshotV1 {
  campaign: CompositeCampaignV1;
  raw_manifest: string;
  manifest_etag_sha256: string;
  generation: number;
}
