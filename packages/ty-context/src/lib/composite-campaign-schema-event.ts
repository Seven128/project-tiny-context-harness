import {
  COMPOSITE_CAMPAIGN_EVENT_SCHEMA_VERSION,
  type CompositeCampaignEventKindV1,
  type CompositeCampaignEventV1,
  type ScopeFitDecisionV1
} from "./composite-campaign-types.js";
import {
  campaignIdValue,
  enumValue,
  exactKeys,
  guardSchemaVersion,
  hashValue,
  integerValue,
  nullableHash,
  nullableSfcId,
  rejectAggregateCompletionKeys,
  requireRecord,
  revisionValue,
  sfcIdValue,
  stringValue
} from "./composite-campaign-schema-common.js";

const KINDS = [
  "campaign_created", "scope_fit_applied", "packet_revision_created", "projection_published",
  "handoff_published", "goal_bound", "result_projected"
] as const;
const SCOPE_DECISIONS = ["fit_for_three_inputs", "split_required", "blocked_for_decision", "not_long_task"] as const;
const RESULT_STATUSES = ["accept", "blocked", "reject"] as const;

type EventPayload = Record<string, string | number | null>;

export function validateCompositeCampaignEventV1(value: unknown): CompositeCampaignEventV1 {
  const object = guardSchemaVersion(value, COMPOSITE_CAMPAIGN_EVENT_SCHEMA_VERSION, "CompositeCampaignEventV1");
  rejectAggregateCompletionKeys(value);
  exactKeys(object, [
    "schema_version", "event_id", "transaction_id", "operation_id", "sequence", "campaign_id", "slice_id",
    "revision", "manifest_generation", "previous_event_sha256", "kind", "payload"
  ], [], "CompositeCampaignEventV1");
  const sequence = integerValue(object.sequence, "CompositeCampaignEventV1.sequence", 1);
  const generation = integerValue(object.manifest_generation, "CompositeCampaignEventV1.manifest_generation", 1);
  if (generation !== sequence) throw new Error("CompositeCampaignEventV1 manifest_generation must equal sequence");
  const previous = nullableHash(object.previous_event_sha256, "CompositeCampaignEventV1.previous_event_sha256");
  if (sequence === 1 ? previous !== null : previous === null) {
    throw new Error("event sequence 1 requires previous_event_sha256=null; later events require the preceding canonical line hash");
  }
  const kind = enumValue(object.kind, KINDS, "CompositeCampaignEventV1.kind");
  if (sequence === 1 && kind !== "campaign_created") throw new Error("event sequence 1 must be campaign_created");
  if (sequence > 1 && kind === "campaign_created") throw new Error("campaign_created must be event sequence 1");
  const sliceId = nullableSfcId(object.slice_id, "CompositeCampaignEventV1.slice_id");
  const revision = object.revision === null ? null : revisionValue(object.revision, "CompositeCampaignEventV1.revision");
  validateEventIdentity(kind, sliceId, revision);
  const payload = validatePayload(kind, object.payload, revision);
  return {
    schema_version: COMPOSITE_CAMPAIGN_EVENT_SCHEMA_VERSION,
    event_id: stringValue(object.event_id, "CompositeCampaignEventV1.event_id"),
    transaction_id: stringValue(object.transaction_id, "CompositeCampaignEventV1.transaction_id"),
    operation_id: stringValue(object.operation_id, "CompositeCampaignEventV1.operation_id"),
    sequence,
    campaign_id: campaignIdValue(object.campaign_id, "CompositeCampaignEventV1.campaign_id"),
    slice_id: sliceId,
    revision,
    manifest_generation: generation,
    previous_event_sha256: previous,
    kind,
    payload
  } as CompositeCampaignEventV1;
}

function validateEventIdentity(
  kind: CompositeCampaignEventKindV1,
  sliceId: string | null,
  revision: number | null
): void {
  if (kind === "campaign_created" || kind === "scope_fit_applied") {
    if (sliceId !== null || revision !== null) throw new Error(`${kind} requires slice_id=null and revision=null`);
    return;
  }
  if (sliceId === null || revision === null) throw new Error(`${kind} requires non-null slice_id and revision`);
}

function validatePayload(kind: CompositeCampaignEventKindV1, value: unknown, revision: number | null): EventPayload {
  const path = `CompositeCampaignEventV1.${kind}.payload`;
  const object = requireRecord(value, path);
  if (kind === "campaign_created") {
    exactKeys(object, ["request_sha256", "redaction_count"], [], path);
    return {
      request_sha256: hashValue(object.request_sha256, `${path}.request_sha256`),
      redaction_count: integerValue(object.redaction_count, `${path}.redaction_count`, 0)
    };
  }
  if (kind === "scope_fit_applied") {
    exactKeys(object, ["scope_fit_sha256", "decision", "selected_slice_id"], [], path);
    const decision = enumValue(object.decision, SCOPE_DECISIONS, `${path}.decision`) as ScopeFitDecisionV1;
    const selected = nullableSfcId(object.selected_slice_id, `${path}.selected_slice_id`);
    const mustSelect = decision === "fit_for_three_inputs" || decision === "split_required";
    if (mustSelect !== (selected !== null)) throw new Error(`${path}.selected_slice_id is inconsistent with decision ${decision}`);
    return { scope_fit_sha256: hashValue(object.scope_fit_sha256, `${path}.scope_fit_sha256`), decision, selected_slice_id: selected };
  }
  if (kind === "packet_revision_created") {
    exactKeys(object, ["packet_sha256", "previous_packet_sha256"], [], path);
    const previous = nullableHash(object.previous_packet_sha256, `${path}.previous_packet_sha256`);
    if ((revision === 1) !== (previous === null)) throw new Error(`${path}.previous_packet_sha256 is inconsistent with revision`);
    return { packet_sha256: hashValue(object.packet_sha256, `${path}.packet_sha256`), previous_packet_sha256: previous };
  }
  if (kind === "projection_published") {
    exactKeys(object, ["bundle_sha256"], [], path);
    return { bundle_sha256: hashValue(object.bundle_sha256, `${path}.bundle_sha256`) };
  }
  if (kind === "handoff_published") {
    exactKeys(object, ["binding_id", "task_id", "task_attempt_id"], [], path);
    return {
      binding_id: stringValue(object.binding_id, `${path}.binding_id`),
      task_id: stringValue(object.task_id, `${path}.task_id`),
      task_attempt_id: stringValue(object.task_attempt_id, `${path}.task_attempt_id`)
    };
  }
  if (kind === "goal_bound") {
    exactKeys(object, ["binding_id", "goal_id"], [], path);
    return {
      binding_id: stringValue(object.binding_id, `${path}.binding_id`),
      goal_id: stringValue(object.goal_id, `${path}.goal_id`)
    };
  }
  exactKeys(object, ["binding_id", "status", "final_gate_event_sha256"], [], path);
  return {
    binding_id: stringValue(object.binding_id, `${path}.binding_id`),
    status: enumValue(object.status, RESULT_STATUSES, `${path}.status`),
    final_gate_event_sha256: hashValue(object.final_gate_event_sha256, `${path}.final_gate_event_sha256`)
  };
}
