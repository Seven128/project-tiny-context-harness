import { COMPOSITE_INPUT_CONTRACT } from "./composite-input-contract.js";
import { canonicalJson, sha256Hex } from "./composite-campaign-codec.js";
import {
  compositeCampaignEventId,
  compositeCampaignTransactionId,
  encodeCompositeCampaignEventLine,
  validateCompositeCampaignOperationId
} from "./composite-campaign-events.js";
import { validateCompositeCampaignId } from "./composite-campaign-paths.js";
import { validateCompositeAuthoringPacketV1, validateCompositeCampaignV1 } from "./composite-campaign-schema.js";
import { normalizeScopeFitResultV1Shape, validateScopeFitResultV1 } from "./composite-campaign-schema-scope.js";
import type { CompositeCampaignRenderedBundleV1 } from "./composite-campaign-renderer.js";
import {
  assertStableScopeIdentity,
  mergeScopeSlices,
  statusIds
} from "./composite-campaign-store-scope-transition.js";
import {
  assertCompositeCampaignPacketSafe,
  assertCompositeCampaignTrackedFileSize,
  type CompositeCampaignSanitizedRequest
} from "./composite-campaign-security.js";
import {
  COMPOSITE_CAMPAIGN_EVENT_SCHEMA_VERSION,
  COMPOSITE_CAMPAIGN_SCHEMA_VERSION,
  type CompositeAuthoringPacketV1,
  type CompositeCampaignEventKindV1,
  type CompositeCampaignEventV1,
  type CompositeCampaignProjectionV1,
  type CompositeCampaignSliceV1,
  type CompositeCampaignV1,
  type CompositeSfcIdV1,
  type ScopeFitResultV1
} from "./composite-campaign-types.js";

interface BaseTransition {
  campaign: CompositeCampaignV1;
  event: CompositeCampaignEventV1;
  event_line: string;
  event_line_sha256: string;
  payload_sha256: string;
  transaction_id: string;
}
export interface InitialCampaignTransition extends BaseTransition {
  request_content: string;
}
export interface ScopeFitTransition extends BaseTransition {
  scope_fit: ScopeFitResultV1;
  scope_fit_content: string;
}
export interface PacketRevisionTransition extends BaseTransition {
  packet: CompositeAuthoringPacketV1;
  packet_content: string;
  packet_sha256: string;
}
export interface ProjectionTransition extends BaseTransition {
  projection: CompositeCampaignProjectionV1;
}
export function normalizeCompositeScopeFitForFingerprint(value: unknown): ScopeFitResultV1 {
  return normalizeScopeFitResultV1Shape(value);
}
export function createCompositeCampaignInitialTransition(input: {
  campaign_id: string;
  sanitized_request: CompositeCampaignSanitizedRequest;
  operation_id: string;
  created_at: string;
}): InitialCampaignTransition {
  const campaignId = validateCompositeCampaignId(input.campaign_id);
  const operationId = validateCompositeCampaignOperationId(input.operation_id);
  const request = input.sanitized_request;
  if (!request || typeof request.content !== "string" || !Number.isSafeInteger(request.redaction_count) || request.redaction_count < 0) {
    throw new Error("Composite campaign sanitized request is invalid");
  }
  if (request.content.replace(/\[REDACTED\]/g, "").trim().length === 0) {
    throw new Error("Composite campaign request must not be semantically blank");
  }
  const requestBytes = assertCompositeCampaignTrackedFileSize(request.content);
  const requestSha = sha256Hex(request.content);
  const payloadSha = sha256Hex(canonicalJson({
    request_sha256: requestSha,
    request_bytes: requestBytes,
    redaction_count: request.redaction_count
  }));
  const event = buildCompositeCampaignTransitionEvent({
    campaignId, kind: "campaign_created", operationId, payloadSha, sequence: 1,
    previousHash: null, sliceId: null, revision: null,
    payload: { request_sha256: requestSha, redaction_count: request.redaction_count }
  });
  const encoded = encodeCompositeCampaignEventLine(event);
  const campaign = validateCompositeCampaignV1({
    schema_version: COMPOSITE_CAMPAIGN_SCHEMA_VERSION,
    campaign_id: campaignId,
    generation: 1,
    created_at: input.created_at,
    updated_at: input.created_at,
    request: { sha256: requestSha, bytes: requestBytes },
    scope_fit: null,
    scope_fit_sha256: null,
    event_cursor: { sequence: 1, last_event_sha256: encoded.sha256 },
    slices: {}
  });
  return transitionResult(campaign, encoded, payloadSha, request.content);
}

export function applyCompositeScopeFitTransition(
  currentValue: unknown,
  scopeValue: unknown,
  operationIdValue: string,
  updatedAt: string
): ScopeFitTransition {
  const current = validateCompositeCampaignV1(currentValue);
  const operationId = validateCompositeCampaignOperationId(operationIdValue);
  const structural = normalizeScopeFitResultV1Shape(scopeValue);
  if (structural.request_sha256 !== current.request.sha256) {
    throw new Error("Scope Fit request_sha256 must match the immutable campaign request");
  }
  assertStableScopeIdentity(current, structural);
  const accepted = statusIds(current, ["accept"]);
  const terminal = statusIds(current, ["accept", "blocked", "reject"]);
  const historical = Object.values(current.slices)
    .filter((slice): slice is CompositeCampaignSliceV1 => slice !== undefined)
    .find((slice) =>
      slice.selection_status === "selected" && terminal.has(slice.slice_id)
    )?.slice_id ?? null;
  const scope = validateScopeFitResultV1(structural, {
    acceptedSliceIds: accepted,
    terminalSliceIds: terminal,
    historicalSelectedSliceId: historical
  });
  const scopeContent = canonicalJson(scope);
  const scopeSha = sha256Hex(scopeContent);
  const slices = mergeScopeSlices(current, scope, terminal);
  const sequence = current.generation + 1;
  const event = buildCompositeCampaignTransitionEvent({
    campaignId: current.campaign_id, kind: "scope_fit_applied", operationId,
    payloadSha: scopeSha, sequence, previousHash: current.event_cursor.last_event_sha256,
    sliceId: null, revision: null,
    payload: { scope_fit_sha256: scopeSha, decision: scope.decision, selected_slice_id: scope.selected_slice_id }
  });
  const encoded = encodeCompositeCampaignEventLine(event);
  const campaign = validateCompositeCampaignV1({
    ...current,
    generation: sequence,
    updated_at: updatedAt,
    scope_fit: scope,
    scope_fit_sha256: scopeSha,
    event_cursor: { sequence, last_event_sha256: encoded.sha256 },
    slices
  });
  return { ...transitionBase(campaign, encoded, scopeSha), scope_fit: scope, scope_fit_content: scopeContent };
}

export function createCompositePacketRevisionTransition(
  currentValue: unknown,
  packetValue: unknown,
  operationIdValue: string,
  updatedAt: string
): PacketRevisionTransition {
  const current = validateCompositeCampaignV1(currentValue);
  const operationId = validateCompositeCampaignOperationId(operationIdValue);
  assertCompositeCampaignPacketSafe(packetValue);
  const packet = validateCompositeAuthoringPacketV1(packetValue);
  const packetContent = canonicalJson(packet);
  assertCompositeCampaignTrackedFileSize(packetContent);
  const packetSha = sha256Hex(packetContent);
  if (packet.campaign_id !== current.campaign_id) throw new Error("Packet campaign_id does not match campaign");
  if (packet.request_sha256 !== current.request.sha256) throw new Error("Packet request_sha256 does not match campaign request");
  const slice = current.slices[packet.slice_id];
  if (!slice || slice.selection_status !== "selected") throw new Error("Packet slice must be the current selected campaign slice");
  if (slice.handoff_status !== "none" || slice.binding !== null) throw new Error("A handed-off or bound slice cannot receive a packet revision");
  const nextRevision = (slice.current_revision ?? 0) + 1;
  const previous = slice.revisions.at(-1)?.packet_sha256 ?? null;
  if (packet.revision !== nextRevision) throw new Error(`Packet revision must be the exact next revision ${nextRevision}`);
  if (packet.previous_packet_sha256 !== previous) throw new Error("Packet previous_packet_sha256 does not match the immutable revision chain");
  const nextSlice: CompositeCampaignSliceV1 = {
    ...slice,
    authoring_status: "draft",
    handoff_status: "none",
    result_projection: "unrecorded",
    current_revision: packet.revision,
    revisions: [...slice.revisions, {
      revision: packet.revision,
      created_at: packet.created_at,
      packet_sha256: packetSha,
      previous_packet_sha256: packet.previous_packet_sha256,
      input_contract_sha256: COMPOSITE_INPUT_CONTRACT.canonical_sha256,
      projections: null
    }],
    binding: null
  };
  const sequence = current.generation + 1;
  const event = buildCompositeCampaignTransitionEvent({
    campaignId: current.campaign_id, kind: "packet_revision_created", operationId,
    payloadSha: packetSha, sequence, previousHash: current.event_cursor.last_event_sha256,
    sliceId: packet.slice_id, revision: packet.revision,
    payload: { packet_sha256: packetSha, previous_packet_sha256: packet.previous_packet_sha256 }
  });
  const encoded = encodeCompositeCampaignEventLine(event);
  const campaign = validateCompositeCampaignV1({
    ...current,
    generation: sequence,
    updated_at: updatedAt,
    event_cursor: { sequence, last_event_sha256: encoded.sha256 },
    slices: { ...current.slices, [packet.slice_id]: nextSlice }
  });
  return {
    ...transitionBase(campaign, encoded, packetSha),
    packet,
    packet_content: packetContent,
    packet_sha256: packetSha
  };
}
export function publishCompositeProjectionTransition(
  currentValue: unknown,
  sliceId: CompositeSfcIdV1,
  revisionValue: number,
  rendered: CompositeCampaignRenderedBundleV1,
  operationIdValue: string,
  renderedAt: string
): ProjectionTransition {
  const current = validateCompositeCampaignV1(currentValue);
  const operationId = validateCompositeCampaignOperationId(operationIdValue);
  const slice = current.slices[sliceId];
  if (!slice || slice.selection_status !== "selected") throw new Error("Projection slice must be the current selected campaign slice");
  if (slice.current_revision !== revisionValue) throw new Error("Projection revision must be the current immutable packet revision");
  if (slice.authoring_status !== "draft" || slice.handoff_status !== "none" || slice.binding !== null) {
    throw new Error("Projection publication requires one unbound draft authoring revision");
  }
  const revision = slice.revisions.at(-1)!;
  if (revision.projections !== null) throw new Error("Projection revision is already published and immutable");
  if (rendered.contract_sha256 !== revision.input_contract_sha256 || rendered.packet_sha256 !== revision.packet_sha256) {
    throw new Error("Rendered projection identity does not match the current packet revision");
  }
  const projection: CompositeCampaignProjectionV1 = {
    product_architecture_source_sha256: rendered.source_hashes.product_architecture_source,
    technical_realization_plan_sha256: rendered.source_hashes.technical_realization_plan,
    acceptance_checklist_sha256: rendered.source_hashes.acceptance_checklist,
    bundle_sha256: rendered.bundle_sha256,
    rendered_at: renderedAt
  };
  const nextRevision = { ...revision, projections: projection };
  const nextSlice: CompositeCampaignSliceV1 = {
    ...slice,
    authoring_status: "ready",
    revisions: [...slice.revisions.slice(0, -1), nextRevision]
  };
  const sequence = current.generation + 1;
  const event = buildCompositeCampaignTransitionEvent({
    campaignId: current.campaign_id, kind: "projection_published", operationId,
    payloadSha: rendered.bundle_sha256, sequence, previousHash: current.event_cursor.last_event_sha256,
    sliceId, revision: revisionValue, payload: { bundle_sha256: rendered.bundle_sha256 }
  });
  const encoded = encodeCompositeCampaignEventLine(event);
  const campaign = validateCompositeCampaignV1({
    ...current,
    generation: sequence,
    updated_at: renderedAt,
    event_cursor: { sequence, last_event_sha256: encoded.sha256 },
    slices: { ...current.slices, [sliceId]: nextSlice }
  });
  return { ...transitionBase(campaign, encoded, rendered.bundle_sha256), projection };
}
export function buildCompositeCampaignTransitionEvent(input: {
  campaignId: string; kind: CompositeCampaignEventKindV1; operationId: string; payloadSha: string;
  sequence: number; previousHash: string | null; sliceId: CompositeSfcIdV1 | null; revision: number | null;
  payload: Record<string, string | number | null>;
}): CompositeCampaignEventV1 {
  const transactionId = compositeCampaignTransactionId(input.campaignId, input.kind, input.operationId, input.payloadSha);
  return {
    schema_version: COMPOSITE_CAMPAIGN_EVENT_SCHEMA_VERSION,
    event_id: compositeCampaignEventId(transactionId, input.sequence),
    transaction_id: transactionId,
    operation_id: input.operationId,
    sequence: input.sequence,
    campaign_id: input.campaignId,
    slice_id: input.sliceId,
    revision: input.revision,
    manifest_generation: input.sequence,
    previous_event_sha256: input.previousHash,
    kind: input.kind,
    payload: input.payload
  } as CompositeCampaignEventV1;
}

function transitionBase(campaign: CompositeCampaignV1, encoded: ReturnType<typeof encodeCompositeCampaignEventLine>, payloadSha: string): BaseTransition {
  return {
    campaign, event: encoded.event, event_line: encoded.line, event_line_sha256: encoded.sha256,
    payload_sha256: payloadSha, transaction_id: encoded.event.transaction_id
  };
}

function transitionResult(
  campaign: CompositeCampaignV1,
  encoded: ReturnType<typeof encodeCompositeCampaignEventLine>,
  payloadSha: string,
  requestContent: string
): InitialCampaignTransition {
  return { ...transitionBase(campaign, encoded, payloadSha), request_content: requestContent };
}
