import {
  COMPOSITE_INPUT_CONTRACT,
  COMPOSITE_INPUT_CONTRACT_VERSION,
  compositeInputDocument,
  type CompositeInputDocumentDescriptor,
  type CompositeInputFieldDescriptor
} from "./composite-input-contract.js";
import {
  COMPOSITE_AUTHORING_PACKET_SCHEMA_VERSION,
  type CompositeAuthoringAcceptanceCriterionV1,
  type CompositeAuthoringFieldsV1,
  type CompositeAuthoringPacketV1,
  type CompositeAuthoringPlanItemV1
} from "./composite-campaign-types.js";
import {
  acIdValue,
  booleanValue,
  campaignIdValue,
  enumValue,
  exactKeys,
  guardSchemaVersion,
  hashValue,
  hasOwn,
  piIdValue,
  rejectAggregateCompletionKeys,
  requireRecord,
  revisionValue,
  sfcIdValue,
  stringArray,
  stringValue,
  timestampValue,
  uniqueValues
} from "./composite-campaign-schema-common.js";

const CONTEXT_DELTA = ["none", "required"] as const;

export function validateCompositeAuthoringPacketV1(value: unknown): CompositeAuthoringPacketV1 {
  const object = guardSchemaVersion(value, COMPOSITE_AUTHORING_PACKET_SCHEMA_VERSION, "CompositeAuthoringPacketV1");
  rejectAggregateCompletionKeys(value);
  exactKeys(object, [
    "schema_version", "campaign_id", "slice_id", "revision", "created_at", "request_sha256",
    "previous_packet_sha256", "input_contract", "context_delta_candidate", "authorities"
  ], [], "CompositeAuthoringPacketV1");
  const revision = revisionValue(object.revision, "CompositeAuthoringPacketV1.revision");
  const previousPacket = object.previous_packet_sha256 === null
    ? null
    : hashValue(object.previous_packet_sha256, "CompositeAuthoringPacketV1.previous_packet_sha256");
  if ((revision === 1) !== (previousPacket === null)) {
    throw new Error("revision 1 requires previous_packet_sha256=null; later revisions require the preceding packet hash");
  }
  const inputContract = validateInputContract(object.input_contract);
  const contextDelta = validateContextDelta(object.context_delta_candidate);
  const authoritiesObject = requireRecord(object.authorities, "CompositeAuthoringPacketV1.authorities");
  exactKeys(authoritiesObject, [
    "product_architecture_source", "technical_realization_plan", "acceptance_checklist"
  ], [], "CompositeAuthoringPacketV1.authorities");
  const product = validateProductAuthority(authoritiesObject.product_architecture_source);
  const planItems = validatePlanAuthority(authoritiesObject.technical_realization_plan);
  const criteria = validateAcceptanceAuthority(authoritiesObject.acceptance_checklist);
  validateReferences(planItems, criteria);
  const sliceId = sfcIdValue(object.slice_id, "CompositeAuthoringPacketV1.slice_id");
  validateProductMapping(product.fields, sliceId);
  return {
    schema_version: COMPOSITE_AUTHORING_PACKET_SCHEMA_VERSION,
    campaign_id: campaignIdValue(object.campaign_id, "CompositeAuthoringPacketV1.campaign_id"),
    slice_id: sliceId,
    revision,
    created_at: timestampValue(object.created_at, "CompositeAuthoringPacketV1.created_at"),
    request_sha256: hashValue(object.request_sha256, "CompositeAuthoringPacketV1.request_sha256"),
    previous_packet_sha256: previousPacket,
    input_contract: inputContract,
    context_delta_candidate: contextDelta,
    authorities: {
      product_architecture_source: product,
      technical_realization_plan: { plan_items: planItems },
      acceptance_checklist: { acceptance_criteria: criteria }
    }
  };
}

function validateInputContract(value: unknown): CompositeAuthoringPacketV1["input_contract"] {
  const path = "CompositeAuthoringPacketV1.input_contract";
  const object = requireRecord(value, path);
  exactKeys(object, ["schema_version", "contract_sha256"], [], path);
  if (object.schema_version !== COMPOSITE_INPUT_CONTRACT_VERSION) {
    throw new Error(`${path} version/schema_version must equal ${COMPOSITE_INPUT_CONTRACT_VERSION}`);
  }
  const hash = hashValue(object.contract_sha256, `${path}.contract_sha256`);
  if (hash !== COMPOSITE_INPUT_CONTRACT.canonical_sha256) {
    throw new Error(`${path} contract SHA256 mismatch`);
  }
  return { schema_version: COMPOSITE_INPUT_CONTRACT_VERSION, contract_sha256: hash };
}

function validateContextDelta(value: unknown): CompositeAuthoringPacketV1["context_delta_candidate"] {
  const path = "CompositeAuthoringPacketV1.context_delta_candidate";
  const object = requireRecord(value, path);
  exactKeys(object, ["product", "technical", "notes"], [], path);
  return {
    product: enumValue(object.product, CONTEXT_DELTA, `${path}.product`),
    technical: enumValue(object.technical, CONTEXT_DELTA, `${path}.technical`),
    notes: stringArray(object.notes, `${path}.notes`)
  };
}

function validateProductAuthority(value: unknown): { fields: CompositeAuthoringFieldsV1 } {
  const path = "CompositeAuthoringPacketV1.authorities.product_architecture_source";
  const object = requireRecord(value, path);
  exactKeys(object, ["fields"], [], path);
  return { fields: validateFields(object.fields, compositeInputDocument("product_architecture_source"), `${path}.fields`) };
}

function validatePlanAuthority(value: unknown): CompositeAuthoringPlanItemV1[] {
  const path = "CompositeAuthoringPacketV1.authorities.technical_realization_plan";
  const object = requireRecord(value, path);
  exactKeys(object, ["plan_items"], [], path);
  if (!Array.isArray(object.plan_items) || object.plan_items.length === 0) {
    throw new Error(`${path}.plan_items must be a non-empty array`);
  }
  const descriptor = compositeInputDocument("technical_realization_plan");
  const items = object.plan_items.map((entry, index) => {
    const itemPath = `${path}.plan_items[${index}]`;
    const item = requireRecord(entry, itemPath);
    exactKeys(item, ["id", "title", "fields"], [], itemPath);
    return {
      id: piIdValue(item.id, `${itemPath}.id`),
      title: stringValue(item.title, `${itemPath}.title`),
      fields: validateFields(item.fields, descriptor, `${itemPath}.fields`)
    };
  });
  uniqueValues(items.map((item) => item.id), `${path}.plan_items ids`);
  return items;
}

function validateAcceptanceAuthority(value: unknown): CompositeAuthoringAcceptanceCriterionV1[] {
  const path = "CompositeAuthoringPacketV1.authorities.acceptance_checklist";
  const object = requireRecord(value, path);
  exactKeys(object, ["acceptance_criteria"], [], path);
  if (!Array.isArray(object.acceptance_criteria) || object.acceptance_criteria.length === 0) {
    throw new Error(`${path}.acceptance_criteria must be a non-empty array`);
  }
  const descriptor = compositeInputDocument("acceptance_checklist");
  const criteria = object.acceptance_criteria.map((entry, index) => {
    const criterionPath = `${path}.acceptance_criteria[${index}]`;
    const criterion = requireRecord(entry, criterionPath);
    exactKeys(criterion, ["id", "title", "fields"], [], criterionPath);
    return {
      id: acIdValue(criterion.id, `${criterionPath}.id`),
      title: stringValue(criterion.title, `${criterionPath}.title`),
      fields: validateFields(criterion.fields, descriptor, `${criterionPath}.fields`)
    };
  });
  uniqueValues(criteria.map((criterion) => criterion.id), `${path}.acceptance_criteria ids`);
  return criteria;
}

function validateFields(
  value: unknown,
  descriptor: CompositeInputDocumentDescriptor,
  path: string
): CompositeAuthoringFieldsV1 {
  const object = requireRecord(value, path);
  const required = descriptor.fields.filter((field) => field.required).map((field) => field.name);
  exactKeys(object, required, descriptor.fields.filter((field) => !field.required).map((field) => field.name), path);
  const normalized: CompositeAuthoringFieldsV1 = {};
  for (const field of descriptor.fields) {
    if (!hasOwn(object, field.name)) continue;
    normalized[field.name] = fieldValue(object[field.name], field, `${path}.${field.name}`);
  }
  return normalized;
}

function fieldValue(value: unknown, field: CompositeInputFieldDescriptor, path: string): string | boolean | string[] {
  if (field.type === "array") return stringArray(value, `${path} array`);
  if (field.type === "boolean") return booleanValue(value, `${path} boolean`);
  if (field.type === "enum") return enumValue(value, field.enum_values, `${path} enum`);
  return stringValue(value, `${path} text`, !field.required);
}

function validateReferences(
  planItems: CompositeAuthoringPlanItemV1[],
  criteria: CompositeAuthoringAcceptanceCriterionV1[]
): void {
  const planIds = new Set(planItems.map((item) => item.id));
  const acIds = new Set(criteria.map((criterion) => criterion.id));
  for (const item of planItems) {
    const references = item.fields.related_acs;
    if (!Array.isArray(references)) continue;
    uniqueValues(references, `${item.id}.related_acs`);
    for (const reference of references) {
      acIdValue(reference, `${item.id}.related_acs`);
      if (!acIds.has(reference)) throw new Error(`${item.id}.related_acs references unknown ${reference}`);
    }
  }
  for (const criterion of criteria) {
    const references = criterion.fields.related_plan_items;
    if (!Array.isArray(references)) continue;
    uniqueValues(references, `${criterion.id}.related_plan_items`);
    for (const reference of references) {
      piIdValue(reference, `${criterion.id}.related_plan_items`);
      if (!planIds.has(reference)) throw new Error(`${criterion.id}.related_plan_items references unknown ${reference}`);
    }
  }
}

function validateProductMapping(fields: CompositeAuthoringFieldsV1, sliceId: string): void {
  const decision = fields.scope_fit_decision;
  const selected = fields.selected_scope_fit_slice;
  if (decision === "blocked_for_decision") {
    throw new Error("blocked_for_decision cannot create a CompositeAuthoringPacketV1");
  }
  if (decision === "fit_for_three_inputs") {
    if (selected !== "none") throw new Error("fit_for_three_inputs requires selected_scope_fit_slice: none");
    return;
  }
  if (decision === "selected_from_split" && selected !== sliceId) {
    throw new Error(`selected_from_split selected_scope_fit_slice must equal packet slice_id ${sliceId}`);
  }
}
