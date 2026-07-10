import { COMPOSITE_INPUT_CONTRACT } from "./composite-input-contract.js";
import { canonicalJson, sha256Hex } from "./composite-campaign-codec.js";
import { COMPOSITE_CAMPAIGN_TRACKED_FILE_MAX_BYTES } from "./composite-campaign-security.js";
import {
  COMPOSITE_CAMPAIGN_SCHEMA_VERSION,
  type CompositeCampaignAuthoringStatusV1,
  type CompositeCampaignHandoffStatusV1,
  type CompositeCampaignResultProjectionV1,
  type CompositeCampaignSelectionStatusV1,
  type CompositeCampaignSliceV1,
  type CompositeCampaignV1,
  type CompositeSfcIdV1,
  type ScopeFitResultV1
} from "./composite-campaign-types.js";
import { validateScopeFitResultV1 } from "./composite-campaign-schema-scope.js";
import { validateCompositeCampaignBindingV1 } from "./composite-campaign-schema-binding.js";
import { projectionSourceHashes, validateCampaignRevision } from "./composite-campaign-schema-revision.js";
import {
  validateCampaignBindingInjectivity,
  validateCampaignPacketHashInjectivity,
  validateHistoricalSelectionOrder,
  validateCampaignProvenanceChronology
} from "./composite-campaign-schema-provenance.js";
import {
  campaignIdValue,
  enumValue,
  exactKeys,
  guardSchemaVersion,
  hashValue,
  integerValue,
  rejectAggregateCompletionKeys,
  requireRecord,
  revisionValue,
  sfcIdValue,
  stringArray,
  stringValue,
  timestampValue,
  uniqueValues
} from "./composite-campaign-schema-common.js";

const SELECTION = ["candidate", "selected", "superseded"] as const;
const AUTHORING = ["draft", "ready", "stale"] as const;
const HANDOFF = ["none", "ready", "started"] as const;
const RESULT = ["unrecorded", "accept", "blocked", "reject", "sync_pending"] as const;

export function validateCompositeCampaignV1(value: unknown): CompositeCampaignV1 {
  const object = guardSchemaVersion(value, COMPOSITE_CAMPAIGN_SCHEMA_VERSION, "CompositeCampaignV1");
  rejectAggregateCompletionKeys(value);
  exactKeys(object, [
    "schema_version", "campaign_id", "generation", "created_at", "updated_at", "request",
    "scope_fit", "scope_fit_sha256", "event_cursor", "slices"
  ], [], "CompositeCampaignV1");
  const campaignId = campaignIdValue(object.campaign_id, "CompositeCampaignV1.campaign_id");
  const generation = integerValue(object.generation, "CompositeCampaignV1.generation", 1);
  const createdAt = timestampValue(object.created_at, "CompositeCampaignV1.created_at");
  const updatedAt = timestampValue(object.updated_at, "CompositeCampaignV1.updated_at");
  if (Date.parse(updatedAt) < Date.parse(createdAt)) throw new Error("CompositeCampaignV1.updated_at precedes created_at");
  const request = validateRequest(object.request);
  const scopeFitHash = object.scope_fit_sha256 === null
    ? null
    : hashValue(object.scope_fit_sha256, "CompositeCampaignV1.scope_fit_sha256");
  const cursor = validateEventCursor(object.event_cursor);
  if (generation !== cursor.sequence) throw new Error("campaign generation must equal event_cursor sequence");
  const slices = validateSlices(object.slices);
  for (const slice of Object.values(slices)) validateSliceState(slice, campaignId, request.sha256);
  validateCampaignBindingInjectivity(slices);
  validateCampaignPacketHashInjectivity(slices);
  validateHistoricalSelectionOrder(slices);
  validateCampaignProvenanceChronology(createdAt, updatedAt, slices);
  const acceptedSliceIds = new Set(
    Object.values(slices).filter((slice) => slice.result_projection === "accept").map((slice) => slice.slice_id)
  );
  const terminalSliceIds = new Set(
    Object.values(slices)
      .filter((slice) => ["accept", "blocked", "reject"].includes(slice.result_projection))
      .map((slice) => slice.slice_id)
  );
  const historicalSelected = Object.values(slices).find((slice) =>
    slice.selection_status === "selected" && terminalSliceIds.has(slice.slice_id)
  )?.slice_id ?? null;
  const scopeFit = object.scope_fit === null ? null : validateScopeFitResultV1(object.scope_fit, {
    acceptedSliceIds,
    terminalSliceIds,
    historicalSelectedSliceId: historicalSelected
  });
  if ((scopeFit === null) !== (scopeFitHash === null)) throw new Error("scope_fit and scope_fit_sha256 must both be null or both be present");
  if (scopeFit && scopeFit.request_sha256 !== request.sha256) throw new Error("scope_fit request_sha256 must match campaign request.sha256");
  if (scopeFit && sha256Hex(canonicalJson(scopeFit)) !== scopeFitHash) throw new Error("scope_fit_sha256 does not match canonical Scope Fit bytes");
  validateScopeSlices(scopeFit, slices);
  const minimumGeneration = lifecycleEventLowerBound(scopeFit, slices);
  if (generation < minimumGeneration) {
    throw new Error(`campaign generation violates lifecycle event lower bound; expected at least ${minimumGeneration}`);
  }
  return {
    schema_version: COMPOSITE_CAMPAIGN_SCHEMA_VERSION,
    campaign_id: campaignId,
    generation,
    created_at: createdAt,
    updated_at: updatedAt,
    request,
    scope_fit: scopeFit,
    scope_fit_sha256: scopeFitHash,
    event_cursor: cursor,
    slices
  };
}

function validateRequest(value: unknown): CompositeCampaignV1["request"] {
  const path = "CompositeCampaignV1.request";
  const object = requireRecord(value, path);
  exactKeys(object, ["sha256", "bytes"], [], path);
  const bytes = integerValue(object.bytes, `${path}.bytes`, 1);
  if (bytes > COMPOSITE_CAMPAIGN_TRACKED_FILE_MAX_BYTES) throw new Error(`${path}.bytes exceeds the 1 MiB tracked file limit`);
  return { sha256: hashValue(object.sha256, `${path}.sha256`), bytes };
}

function validateEventCursor(value: unknown): CompositeCampaignV1["event_cursor"] {
  const path = "CompositeCampaignV1.event_cursor";
  const object = requireRecord(value, path);
  exactKeys(object, ["sequence", "last_event_sha256"], [], path);
  return {
    sequence: integerValue(object.sequence, `${path}.sequence`, 1),
    last_event_sha256: hashValue(object.last_event_sha256, `${path}.last_event_sha256`)
  };
}

function validateSlices(value: unknown): Record<string, CompositeCampaignSliceV1> {
  const object = requireRecord(value, "CompositeCampaignV1.slices");
  const slices: Record<string, CompositeCampaignSliceV1> = {};
  const stableKeys: string[] = [];
  for (const [key, entry] of Object.entries(object).sort(([left], [right]) => left.localeCompare(right))) {
    const id = sfcIdValue(key, `CompositeCampaignV1.slices key ${key}`);
    const slice = validateSlice(entry, `CompositeCampaignV1.slices.${key}`);
    if (slice.slice_id !== id) throw new Error(`slice map key ${id} does not match slice_id ${slice.slice_id}`);
    slices[id] = slice;
    stableKeys.push(slice.stable_key);
  }
  uniqueValues(stableKeys, "CompositeCampaignV1 slice stable_key values");
  for (const slice of Object.values(slices)) {
    for (const dependency of slice.depends_on) {
      if (!slices[dependency]) throw new Error(`${slice.slice_id}.depends_on references unknown ${dependency}`);
      if (dependency === slice.slice_id) throw new Error(`${slice.slice_id}.depends_on contains self dependency`);
    }
  }
  return slices;
}

function validateSlice(value: unknown, path: string): CompositeCampaignSliceV1 {
  const object = requireRecord(value, path);
  exactKeys(object, [
    "slice_id", "stable_key", "title", "depends_on", "priority", "selection_status", "authoring_status",
    "handoff_status", "result_projection", "current_revision", "revisions", "binding"
  ], [], path);
  const dependencies = stringArray(object.depends_on, `${path}.depends_on`)
    .map((entry, index) => sfcIdValue(entry, `${path}.depends_on[${index}]`))
    .sort();
  uniqueValues(dependencies, `${path}.depends_on`);
  if (!Array.isArray(object.revisions)) throw new Error(`${path}.revisions must be an array`);
  const revisions = object.revisions.map((entry, index) => validateCampaignRevision(entry, `${path}.revisions[${index}]`));
  revisions.forEach((revision, index) => {
    if (revision.revision !== index + 1) throw new Error(`${path}.revisions must be consecutive from revision 1`);
    const expectedPrevious = index === 0 ? null : revisions[index - 1].packet_sha256;
    if (revision.previous_packet_sha256 !== expectedPrevious) throw new Error(`${path}.revision ${revision.revision} previous_packet_sha256 chain mismatch`);
    if (revision.previous_packet_sha256 !== null && revision.packet_sha256 === revision.previous_packet_sha256) {
      throw new Error(`${path}.revision ${revision.revision} packet_sha256 must differ from previous_packet_sha256; no-op self-link revisions are forbidden`);
    }
  });
  const currentRevision = object.current_revision === null
    ? null
    : revisionValue(object.current_revision, `${path}.current_revision`);
  const expectedCurrent = revisions.length === 0 ? null : revisions.at(-1)!.revision;
  if (currentRevision !== expectedCurrent) throw new Error(`${path}.current_revision must identify the latest immutable revision`);
  return {
    slice_id: sfcIdValue(object.slice_id, `${path}.slice_id`),
    stable_key: stringValue(object.stable_key, `${path}.stable_key`),
    title: stringValue(object.title, `${path}.title`),
    depends_on: dependencies,
    priority: integerValue(object.priority, `${path}.priority`, 1),
    selection_status: enumValue(object.selection_status, SELECTION, `${path}.selection_status`) as CompositeCampaignSelectionStatusV1,
    authoring_status: enumValue(object.authoring_status, AUTHORING, `${path}.authoring_status`) as CompositeCampaignAuthoringStatusV1,
    handoff_status: enumValue(object.handoff_status, HANDOFF, `${path}.handoff_status`) as CompositeCampaignHandoffStatusV1,
    result_projection: enumValue(object.result_projection, RESULT, `${path}.result_projection`) as CompositeCampaignResultProjectionV1,
    current_revision: currentRevision,
    revisions,
    binding: object.binding === null ? null : validateCompositeCampaignBindingV1(object.binding)
  };
}

function validateScopeSlices(scope: ScopeFitResultV1 | null, slices: Record<string, CompositeCampaignSliceV1>): void {
  if (!scope) {
    if (Object.keys(slices).length !== 0) throw new Error("campaign without scope_fit cannot contain slices");
    return;
  }
  if (scope.slices.length !== Object.keys(slices).length) throw new Error("campaign slices must exactly match the stable Scope Fit graph");
  for (const source of scope.slices) {
    const slice = slices[source.slice_id];
    if (!slice) throw new Error(`campaign slices are missing Scope Fit slice ${source.slice_id}`);
    if (
      slice.stable_key !== source.stable_key || slice.title !== source.title || slice.priority !== source.priority ||
      canonicalJson(slice.depends_on) !== canonicalJson(source.depends_on)
    ) throw new Error(`campaign slice ${source.slice_id} identity does not match the stable Scope Fit graph`);
    const selected = scope.selected_slice_id === source.slice_id;
    if (selected !== (slice.selection_status === "selected")) {
      throw new Error(`campaign slice ${source.slice_id} selection_status does not match Scope Fit selected_slice_id`);
    }
  }
}

function validateSliceState(slice: CompositeCampaignSliceV1, campaignId: string, requestHash: string): void {
  const current = slice.current_revision === null ? null : slice.revisions.at(-1)!;
  const hasCurrentProjection = Boolean(current?.projections);
  if ((slice.authoring_status === "ready") !== hasCurrentProjection) {
    throw new Error(`${slice.slice_id} authoring_status must be ready if and only if current projection metadata exists`);
  }
  if (slice.selection_status === "candidate") {
    const pristine = slice.authoring_status === "draft" && slice.handoff_status === "none" &&
      slice.result_projection === "unrecorded" && slice.current_revision === null &&
      slice.revisions.length === 0 && slice.binding === null;
    if (!pristine) throw new Error(`${slice.slice_id} candidate must not contain authoring or handoff history`);
    return;
  }
  if (slice.selection_status === "superseded" && !["accept", "blocked", "reject"].includes(slice.result_projection)) {
    throw new Error(`${slice.slice_id} superseded selection must preserve a terminal historical result`);
  }
  if (slice.handoff_status !== "none") {
    if (!["selected", "superseded"].includes(slice.selection_status)) {
      throw new Error(`${slice.slice_id} handoff requires a selected or terminal superseded slice`);
    }
    if (slice.authoring_status !== "ready") {
      throw new Error(`${slice.slice_id} handoff requires authoring_status ready`);
    }
  }
  if (slice.handoff_status === "none") {
    if (slice.binding) throw new Error(`${slice.slice_id} handoff_status none cannot have a binding`);
  } else if (!slice.binding || !current?.projections) {
    throw new Error(`${slice.slice_id} handoff_status ${slice.handoff_status} requires projection metadata and binding`);
  }
  const binding = slice.binding;
  if (!binding) {
    if (slice.result_projection !== "unrecorded") throw new Error(`${slice.slice_id} result_projection requires a binding result`);
    return;
  }
  if (binding.campaign_id !== campaignId) throw new Error(`${slice.slice_id} binding campaign_id does not match owning campaign`);
  if (binding.slice_id !== slice.slice_id) throw new Error(`${slice.slice_id} binding slice_id does not match owning slice`);
  if (binding.revision !== slice.current_revision) throw new Error(`${slice.slice_id} binding revision does not match current_revision`);
  if (binding.request_sha256 !== requestHash) throw new Error(`${slice.slice_id} binding request_sha256 does not match campaign request`);
  if (!current || binding.packet_sha256 !== current.packet_sha256) throw new Error(`${slice.slice_id} binding packet_sha256 does not match current revision`);
  if (binding.input_contract_sha256 !== current.input_contract_sha256 || binding.input_contract_sha256 !== COMPOSITE_INPUT_CONTRACT.canonical_sha256) {
    throw new Error(`${slice.slice_id} binding input_contract_sha256 does not match current revision`);
  }
  const expectedSources = projectionSourceHashes(current.projections!);
  for (const key of Object.keys(expectedSources) as Array<keyof typeof expectedSources>) {
    if (binding.source_hashes[key] !== expectedSources[key]) throw new Error(`${slice.slice_id} binding source hash ${key} does not match projection`);
  }
  if (slice.handoff_status === "ready" && (binding.goal || binding.result)) {
    throw new Error(`${slice.slice_id} handoff_status ready cannot have a goal or result`);
  }
  if (slice.handoff_status === "started" && !binding.goal) throw new Error(`${slice.slice_id} handoff_status started requires a goal`);
  if (binding.result && slice.handoff_status !== "started") throw new Error(`${slice.slice_id} result requires handoff_status started and a goal`);
  if (slice.result_projection === "sync_pending") {
    if (slice.handoff_status !== "started" || !binding.goal || binding.result) {
      throw new Error(`${slice.slice_id} sync_pending requires started handoff with a goal and no recorded result`);
    }
  } else if (slice.result_projection === "unrecorded") {
    if (binding.result) throw new Error(`${slice.slice_id} result_projection unrecorded cannot have a recorded result`);
  } else if (!binding.result || binding.result.status !== slice.result_projection) {
    throw new Error(`${slice.slice_id} result_projection must match binding result status`);
  }
}

function lifecycleEventLowerBound(
  scope: ScopeFitResultV1 | null,
  slices: Record<string, CompositeCampaignSliceV1>
): number {
  let events = 1 + (scope ? 1 : 0);
  for (const slice of Object.values(slices)) {
    if (slice.selection_status === "superseded") events += 1;
    events += slice.revisions.length;
    events += slice.revisions.filter((revision) => revision.projections !== null).length;
    if (slice.binding) events += 1;
    if (slice.binding?.goal) events += 1;
    if (slice.binding?.result) events += 1;
  }
  return events;
}
