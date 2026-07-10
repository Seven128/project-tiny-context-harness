import {
  COMPOSITE_INPUT_CONTRACT,
  COMPOSITE_INPUT_CONTRACT_VERSION
} from "../../packages/ty-context/dist/lib/composite-input-contract.js";
import { canonicalJson, sha256Hex } from "../../packages/ty-context/dist/lib/composite-campaign-codec.js";
import {
  COMPOSITE_AUTHORING_PACKET_SCHEMA_VERSION,
  COMPOSITE_CAMPAIGN_BINDING_SCHEMA_VERSION,
  COMPOSITE_CAMPAIGN_EVENT_SCHEMA_VERSION,
  COMPOSITE_CAMPAIGN_SCHEMA_VERSION,
  SCOPE_FIT_RESULT_SCHEMA_VERSION
} from "../../packages/ty-context/dist/lib/composite-campaign-types.js";

export const HASH_A = "a".repeat(64);
export const HASH_B = "b".repeat(64);
export const HASH_C = "c".repeat(64);
export const CREATED_AT = "2026-07-10T01:02:03.000Z";
export const SOURCE_HASHES_SHA256 = "8adea5fc02e36bb0c2ee2a628a79d0bf8e0ec9ec7437360d063a78b6973cdef4";
export const SCOPE_FIT_SHA256 = "2fb58fc5e4eebb5f5aa8b6f0c873e5541f987652eb50bb2a0b2d7e27ffa762be";
export const AUTHORING_PACKET_SHA256 = "7df5f9366346ebe5211175c6070dc762656c8552ba129d645d96be17ebac4ef4";

export function scopeFitFixture() {
  return {
    schema_version: SCOPE_FIT_RESULT_SCHEMA_VERSION,
    request_sha256: HASH_A,
    decision: "split_required",
    rationale: ["The requirement contains two dependency-ordered capabilities."],
    slices: [
      scopeSlice("SFC-001", "contracts", [], 1, "Define contracts"),
      scopeSlice("SFC-002", "storage", ["SFC-001"], 2, "Implement storage")
    ],
    selected_slice_id: "SFC-001",
    decision_required: null
  };
}

export function fittedScopeFitFixture() {
  return {
    schema_version: SCOPE_FIT_RESULT_SCHEMA_VERSION,
    request_sha256: HASH_A,
    decision: "fit_for_three_inputs",
    rationale: ["The requirement fits one authority packet."],
    slices: [scopeSlice("SFC-001", "single", [], 1, "Deliver the requirement")],
    selected_slice_id: "SFC-001",
    decision_required: null
  };
}

export function blockedScopeFitFixture() {
  const value = scopeFitFixture();
  value.decision = "blocked_for_decision";
  value.slices[1].depends_on = [];
  value.slices[1].priority = value.slices[0].priority;
  value.selected_slice_id = null;
  value.decision_required = {
    decision_id: "decision-1",
    question: "Which dependency-ready slice should be selected?",
    candidates: ["SFC-001", "SFC-002"]
  };
  return value;
}

export function notLongTaskScopeFitFixture() {
  return {
    schema_version: SCOPE_FIT_RESULT_SCHEMA_VERSION,
    request_sha256: HASH_A,
    decision: "not_long_task",
    rationale: ["The request is a small local change."],
    slices: [],
    selected_slice_id: null,
    decision_required: null
  };
}

export function scopeSlice(sliceId, stableKey, dependsOn, priority, objective) {
  return {
    slice_id: sliceId,
    stable_key: stableKey,
    title: objective,
    objective,
    depends_on: dependsOn,
    priority,
    scope_summary: [objective],
    out_of_scope: ["Aggregate campaign completion"],
    decisions_required: []
  };
}

export function packetFixture(options = {}) {
  const fitted = options.fitted ?? false;
  const product = contractFields("product_architecture_source");
  product.scope_fit_decision = fitted ? "fit_for_three_inputs" : "selected_from_split";
  product.selected_scope_fit_slice = fitted ? "none" : "SFC-001";
  const plan = contractFields("technical_realization_plan");
  plan.related_acs = ["AC-001"];
  const acceptance = contractFields("acceptance_checklist");
  acceptance.related_plan_items = ["PI-001"];
  return {
    schema_version: COMPOSITE_AUTHORING_PACKET_SCHEMA_VERSION,
    campaign_id: "campaign-1",
    slice_id: "SFC-001",
    revision: 1,
    created_at: CREATED_AT,
    request_sha256: HASH_A,
    previous_packet_sha256: null,
    input_contract: {
      schema_version: COMPOSITE_INPUT_CONTRACT_VERSION,
      contract_sha256: COMPOSITE_INPUT_CONTRACT.canonical_sha256
    },
    context_delta_candidate: {
      product: "none",
      technical: "required",
      notes: ["Goal execution must re-read current Context and resolve these candidates."]
    },
    authorities: {
      product_architecture_source: { fields: product },
      technical_realization_plan: { plan_items: [{ id: "PI-001", title: "Implement", fields: plan }] },
      acceptance_checklist: { acceptance_criteria: [{ id: "AC-001", title: "Verify", fields: acceptance }] }
    }
  };
}

export function contractFields(documentId) {
  const descriptor = COMPOSITE_INPUT_CONTRACT.documents.find((item) => item.id === documentId);
  return Object.fromEntries(descriptor.fields.map((field) => [field.name, fieldValue(field)]));
}

export function packetFields(packet, documentId) {
  if (documentId === "product_architecture_source") return packet.authorities.product_architecture_source.fields;
  if (documentId === "technical_realization_plan") return packet.authorities.technical_realization_plan.plan_items[0].fields;
  return packet.authorities.acceptance_checklist.acceptance_criteria[0].fields;
}

export function invalidFieldValue(type) {
  if (type === "array") return "not-an-array";
  if (type === "boolean") return "not-a-boolean";
  if (type === "enum") return ["not-an-enum"];
  return ["not-text"];
}

function fieldValue(field) {
  if (field.type === "array") return [];
  if (field.type === "boolean") return false;
  if (field.type === "enum") return field.enum_values[0];
  return `${field.name} value`;
}

export function sourceHashes() {
  return {
    product_architecture_source: HASH_A,
    technical_realization_plan: HASH_B,
    acceptance_checklist: HASH_C
  };
}

export function projectionFixture() {
  return {
    product_architecture_source_sha256: HASH_A,
    technical_realization_plan_sha256: HASH_B,
    acceptance_checklist_sha256: HASH_C,
    bundle_sha256: SOURCE_HASHES_SHA256,
    rendered_at: CREATED_AT
  };
}

export function goalFixture() {
  return { goal_id: "goal-1", started_at: CREATED_AT };
}

export function resultFixture() {
  return {
    status: "accept",
    task_attempt_id: "ATTEMPT-1",
    source_hashes_sha256: SOURCE_HASHES_SHA256,
    final_gate_event_sha256: HASH_C,
    recorded_at: CREATED_AT
  };
}

export function bindingFixture(options = {}) {
  return {
    schema_version: COMPOSITE_CAMPAIGN_BINDING_SCHEMA_VERSION,
    binding_id: "binding-1",
    campaign_id: "campaign-1",
    slice_id: "SFC-001",
    revision: 1,
    request_sha256: HASH_A,
    packet_sha256: HASH_B,
    input_contract_sha256: COMPOSITE_INPUT_CONTRACT.canonical_sha256,
    source_hashes: sourceHashes(),
    workdir: "tmp/ty-context/plan-acceptance/campaign-1/SFC-001-r1/",
    task: { task_id: "TASK-1", task_attempt_id: "ATTEMPT-1" },
    handed_off_at: CREATED_AT,
    goal: options.goal ?? null,
    result: options.result ?? null
  };
}

export function campaignFixture(binding) {
  const scopeFit = scopeFitFixture();
  const generation = binding?.result ? 7 : binding?.goal ? 6 : binding ? 5 : 4;
  return {
    schema_version: COMPOSITE_CAMPAIGN_SCHEMA_VERSION,
    campaign_id: "campaign-1",
    generation,
    created_at: CREATED_AT,
    updated_at: CREATED_AT,
    request: { sha256: HASH_A, bytes: 128 },
    scope_fit: scopeFit,
    scope_fit_sha256: SCOPE_FIT_SHA256,
    event_cursor: { sequence: generation, last_event_sha256: HASH_C },
    slices: {
      "SFC-001": campaignSliceOne(binding),
      "SFC-002": {
        slice_id: "SFC-002", stable_key: "storage", title: "Implement storage", depends_on: ["SFC-001"], priority: 2,
        selection_status: "candidate", authoring_status: "draft", handoff_status: "none",
        result_projection: "unrecorded", current_revision: null, revisions: [], binding: null
      }
    }
  };
}

function campaignSliceOne(binding) {
  return {
    slice_id: "SFC-001", stable_key: "contracts", title: "Define contracts", depends_on: [], priority: 1,
    selection_status: "selected", authoring_status: "ready", handoff_status: "ready",
    result_projection: "unrecorded", current_revision: 1,
    revisions: [{
      revision: 1, created_at: CREATED_AT, packet_sha256: HASH_B, previous_packet_sha256: null,
      input_contract_sha256: COMPOSITE_INPUT_CONTRACT.canonical_sha256, projections: projectionFixture()
    }],
    binding
  };
}

export function eventFixtures() {
  const base = {
    schema_version: COMPOSITE_CAMPAIGN_EVENT_SCHEMA_VERSION,
    event_id: "event-0001", transaction_id: "transaction-0001", operation_id: "operation-0001",
    sequence: 1, campaign_id: "campaign-1", slice_id: null, revision: null,
    manifest_generation: 1, previous_event_sha256: null
  };
  const later = (sequence, kind, payload, options = {}) => ({
    ...base,
    event_id: `event-${String(sequence).padStart(4, "0")}`,
    transaction_id: `transaction-${String(sequence).padStart(4, "0")}`,
    operation_id: `operation-${String(sequence).padStart(4, "0")}`,
    sequence,
    slice_id: Object.hasOwn(options, "slice_id") ? options.slice_id : "SFC-001",
    revision: options.revision === undefined ? 1 : options.revision,
    manifest_generation: sequence,
    previous_event_sha256: HASH_A,
    kind,
    payload
  });
  return [
    { ...base, kind: "campaign_created", payload: { request_sha256: HASH_A, redaction_count: 0 } },
    later(2, "scope_fit_applied", { scope_fit_sha256: HASH_A, decision: "split_required", selected_slice_id: "SFC-001" }, { slice_id: null, revision: null }),
    later(3, "packet_revision_created", { packet_sha256: HASH_B, previous_packet_sha256: null }),
    later(4, "projection_published", { bundle_sha256: HASH_C }),
    later(5, "handoff_published", { binding_id: "binding-1", task_id: "TASK-1", task_attempt_id: "ATTEMPT-1" }),
    later(6, "goal_bound", { binding_id: "binding-1", goal_id: "goal-1" }),
    later(7, "result_projected", { binding_id: "binding-1", status: "accept", final_gate_event_sha256: HASH_C })
  ];
}

export function reverseObjectKeysDeep(value) {
  if (Array.isArray(value)) return value.map(reverseObjectKeysDeep);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).reverse().map(([key, entry]) => [key, reverseObjectKeysDeep(entry)]));
}

export function packetHash(value) {
  return sha256Hex(canonicalJson(value));
}
