import { canonicalJson, sha256Hex } from "./composite-campaign-codec.js";
import { validateCompositeCampaignOperationId } from "./composite-campaign-events.js";
import { validateCompositeSfcId } from "./composite-campaign-identifiers.js";
import {
  validateCompositeCampaignBindingV1,
  validateCompositeCampaignV1
} from "./composite-campaign-schema.js";
import { sourceHashesSha256 } from "./composite-campaign-schema-binding.js";
import { buildCompositeCampaignTransitionEvent } from "./composite-campaign-store-transitions.js";
import type {
  CompositeCampaignBindingResultV1,
  CompositeCampaignBindingV1,
  CompositeCampaignEventV1,
  CompositeCampaignV1,
  CompositeSfcIdV1
} from "./composite-campaign-types.js";
import { encodeCompositeCampaignEventLine } from "./composite-campaign-events.js";

export interface CompositeCampaignLifecycleTransition {
  campaign: CompositeCampaignV1;
  event: CompositeCampaignEventV1;
  event_line: string;
  event_line_sha256: string;
  payload_sha256: string;
  transaction_id: string;
}

export function publishCompositeCampaignHandoffTransition(
  currentValue: unknown,
  bindingValue: unknown,
  operationIdValue: string,
  updatedAt: string
): CompositeCampaignLifecycleTransition {
  const current = validateCompositeCampaignV1(currentValue);
  const binding = validateCompositeCampaignBindingV1(bindingValue);
  const operationId = validateCompositeCampaignOperationId(operationIdValue);
  const slice = selectedSlice(current, binding.slice_id);
  if (slice.authoring_status !== "ready" || !slice.current_revision) {
    throw new Error("Composite campaign handoff requires the selected ready revision");
  }
  if (slice.binding?.result) throw new Error("A completed composite campaign Goal cannot publish a replacement handoff");
  const refreshingStarted = Boolean(slice.binding?.goal || slice.handoff_status === "started");
  if (refreshingStarted && (!slice.binding?.goal || !binding.goal ||
    canonicalJson(slice.binding.goal) !== canonicalJson(binding.goal) ||
    slice.binding.handed_off_at !== binding.handed_off_at)) {
    throw new Error("A started replacement handoff must preserve the same Goal and original handoff timestamp");
  }
  if (!refreshingStarted && binding.goal) throw new Error("A handoff-ready binding cannot acquire a Goal through handoff publication");
  if (slice.binding && slice.binding.binding_id !== binding.binding_id) {
    throw new Error("A replacement handoff must preserve the immutable binding_id");
  }
  const nextSlice = {
    ...slice,
    handoff_status: refreshingStarted ? "started" as const : "ready" as const,
    result_projection: refreshingStarted ? "sync_pending" as const : "unrecorded" as const,
    binding
  };
  const payload = {
    binding_id: binding.binding_id,
    task_id: binding.task.task_id,
    task_attempt_id: binding.task.task_attempt_id
  };
  return lifecycleTransition(current, binding.slice_id, binding.revision, "handoff_published", payload,
    operationId, updatedAt, { ...current.slices, [binding.slice_id]: nextSlice });
}

export function bindCompositeCampaignGoalTransition(
  currentValue: unknown,
  sliceIdValue: string,
  goalIdValue: string,
  operationIdValue: string,
  startedAt: string
): CompositeCampaignLifecycleTransition {
  const current = validateCompositeCampaignV1(currentValue);
  const sliceId = validateCompositeSfcId(sliceIdValue);
  const operationId = validateCompositeCampaignOperationId(operationIdValue);
  const goalId = requiredText(goalIdValue, "goal_id");
  const slice = selectedSlice(current, sliceId);
  if (slice.handoff_status !== "ready" || !slice.binding) {
    throw new Error("Composite campaign Goal start requires one handoff-ready binding");
  }
  if (slice.binding.goal) throw new Error("Composite campaign binding already has a Goal");
  const binding: CompositeCampaignBindingV1 = {
    ...slice.binding,
    goal: { goal_id: goalId, started_at: startedAt }
  };
  const nextSlice = {
    ...slice,
    handoff_status: "started" as const,
    result_projection: "sync_pending" as const,
    binding
  };
  const payload = { binding_id: binding.binding_id, goal_id: goalId };
  return lifecycleTransition(current, sliceId, binding.revision, "goal_bound", payload,
    operationId, startedAt, { ...current.slices, [sliceId]: nextSlice });
}

export function projectCompositeCampaignResultTransition(
  currentValue: unknown,
  sliceIdValue: string,
  resultValue: CompositeCampaignBindingResultV1,
  operationIdValue: string,
  recordedAt: string
): CompositeCampaignLifecycleTransition {
  const current = validateCompositeCampaignV1(currentValue);
  const sliceId = validateCompositeSfcId(sliceIdValue);
  const operationId = validateCompositeCampaignOperationId(operationIdValue);
  const slice = selectedSlice(current, sliceId);
  if (slice.handoff_status !== "started" || !slice.binding?.goal) {
    throw new Error("Composite campaign result requires one started Goal binding");
  }
  if (slice.binding.result) throw new Error("Composite campaign binding already has a recorded result");
  if (resultValue.recorded_at !== recordedAt) throw new Error("Composite campaign result recorded_at must match transition time");
  if (resultValue.source_hashes_sha256 !== sourceHashesSha256(slice.binding.source_hashes)) {
    throw new Error("Composite campaign result source hashes do not match the frozen handoff");
  }
  const binding = validateCompositeCampaignBindingV1({
    ...slice.binding,
    task: { ...slice.binding.task, task_attempt_id: resultValue.task_attempt_id },
    result: resultValue
  });
  const nextSlice = { ...slice, result_projection: resultValue.status, binding };
  const payload = {
    binding_id: binding.binding_id,
    status: resultValue.status,
    final_gate_event_sha256: resultValue.final_gate_event_sha256
  };
  return lifecycleTransition(current, sliceId, binding.revision, "result_projected", payload,
    operationId, recordedAt, { ...current.slices, [sliceId]: nextSlice });
}

function lifecycleTransition(
  current: CompositeCampaignV1,
  sliceId: CompositeSfcIdV1,
  revision: number,
  kind: "handoff_published" | "goal_bound" | "result_projected",
  payload: Record<string, string>,
  operationId: string,
  updatedAt: string,
  slices: CompositeCampaignV1["slices"]
): CompositeCampaignLifecycleTransition {
  const sequence = current.generation + 1;
  const payloadSha = sha256Hex(canonicalJson(payload));
  const event = buildCompositeCampaignTransitionEvent({
    campaignId: current.campaign_id,
    kind,
    operationId,
    payloadSha,
    sequence,
    previousHash: current.event_cursor.last_event_sha256,
    sliceId,
    revision,
    payload
  });
  const encoded = encodeCompositeCampaignEventLine(event);
  const campaign = validateCompositeCampaignV1({
    ...current,
    generation: sequence,
    updated_at: updatedAt,
    event_cursor: { sequence, last_event_sha256: encoded.sha256 },
    slices
  });
  return {
    campaign,
    event: encoded.event,
    event_line: encoded.line,
    event_line_sha256: encoded.sha256,
    payload_sha256: payloadSha,
    transaction_id: encoded.event.transaction_id
  };
}

function selectedSlice(current: CompositeCampaignV1, sliceId: CompositeSfcIdV1) {
  const slice = current.slices[sliceId];
  if (!slice || slice.selection_status !== "selected") {
    throw new Error("Composite campaign lifecycle mutation requires the current selected slice");
  }
  return slice;
}

function requiredText(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim() || /[\r\n\0]/.test(value)) {
    throw new Error(`Composite campaign ${label} must be one non-empty line`);
  }
  return value;
}
