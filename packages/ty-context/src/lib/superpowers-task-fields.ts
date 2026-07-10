import {
  COMPOSITE_INPUT_CONTRACT,
  COMPOSITE_INPUT_CONTRACT_VERSION,
  compositeInputDocument,
  type CompositeInputDocumentDescriptor,
  type CompositeInputFieldDescriptor,
  type CompositeInputFieldType
} from "./composite-input-contract.js";
export {
  CANONICAL_PROOF_LAYERS,
  LEGACY_PROOF_LAYER_ALIASES,
  MACHINE_VERIFIABLE_LAYER_NAMES,
  normalizeProofLayerId,
  normalizeProofLayerName
} from "./superpowers-task-proof-layers.js";

export { COMPOSITE_INPUT_CONTRACT, COMPOSITE_INPUT_CONTRACT_VERSION };
export type { CompositeInputContract } from "./composite-input-contract.js";

const PRODUCT_CONTRACT = compositeInputDocument("product_architecture_source");
const PLAN_CONTRACT = compositeInputDocument("technical_realization_plan");
const ACCEPTANCE_CONTRACT = compositeInputDocument("acceptance_checklist");

export const PRODUCT_FIELDS = fieldNames(PRODUCT_CONTRACT);
export const PLAN_FIELDS = fieldNames(PLAN_CONTRACT);
export const ACCEPTANCE_FIELDS = fieldNames(ACCEPTANCE_CONTRACT);

export const PRODUCT_REQUIRED_FIELDS = requiredFieldNames(PRODUCT_CONTRACT);
export const PLAN_REQUIRED_FIELDS = requiredFieldNames(PLAN_CONTRACT);
export const ACCEPTANCE_REQUIRED_FIELDS = requiredFieldNames(ACCEPTANCE_CONTRACT);

type FieldType = CompositeInputFieldType;

export const PRODUCT_FIELD_TYPES: Record<(typeof PRODUCT_FIELDS)[number], FieldType> = fieldTypes(PRODUCT_CONTRACT);
export const PLAN_FIELD_TYPES: Record<(typeof PLAN_FIELDS)[number], FieldType> = fieldTypes(PLAN_CONTRACT);
export const ACCEPTANCE_FIELD_TYPES: Record<(typeof ACCEPTANCE_FIELDS)[number], FieldType> = fieldTypes(ACCEPTANCE_CONTRACT);

export const PRODUCT_DELIVERY_SCOPES: Set<string> = enumValues(PRODUCT_CONTRACT, "delivery_scope");
export const PLAN_DELIVERY_SCOPES: Set<string> = enumValues(PLAN_CONTRACT, "delivery_scope");
export const ACCEPTANCE_SCOPES: Set<string> = enumValues(ACCEPTANCE_CONTRACT, "acceptance_scope");
export const SCOPE_FIT_DECISIONS: Set<string> = enumValues(PRODUCT_CONTRACT, "scope_fit_decision");

export function fieldSet(fields: readonly string[]): Set<string> {
  return new Set(fields);
}

export function isSelectedScopeFitSlice(value: string): boolean {
  return value === "none" || /^SFC-\d{3,}$/i.test(value);
}

type FieldNames<Fields extends readonly CompositeInputFieldDescriptor[]> = {
  [Index in keyof Fields]: Fields[Index] extends CompositeInputFieldDescriptor ? Fields[Index]["name"] : never;
};

type RequiredFieldNames<Fields extends readonly CompositeInputFieldDescriptor[]> =
  Fields extends readonly [
    infer Head extends CompositeInputFieldDescriptor,
    ...infer Tail extends readonly CompositeInputFieldDescriptor[]
  ]
    ? Head["required"] extends true
      ? readonly [Head["name"], ...RequiredFieldNames<Tail>]
      : RequiredFieldNames<Tail>
    : readonly [];

type FieldTypeMap<Fields extends readonly CompositeInputFieldDescriptor[]> = {
  [Field in Fields[number] as Field["name"]]: Field["type"];
};

function fieldNames<const Document extends CompositeInputDocumentDescriptor>(document: Document): FieldNames<Document["fields"]> {
  return document.fields.map((field) => field.name) as unknown as FieldNames<Document["fields"]>;
}

function requiredFieldNames<const Document extends CompositeInputDocumentDescriptor>(document: Document): RequiredFieldNames<Document["fields"]> {
  return document.fields.filter((field) => field.required).map((field) => field.name) as unknown as RequiredFieldNames<Document["fields"]>;
}

function fieldTypes<const Document extends CompositeInputDocumentDescriptor>(document: Document): FieldTypeMap<Document["fields"]> {
  return Object.fromEntries(document.fields.map((field) => [field.name, field.type])) as FieldTypeMap<Document["fields"]>;
}

function enumValues(document: CompositeInputDocumentDescriptor, fieldName: string): Set<string> {
  return new Set(document.fields.find((field) => field.name === fieldName)?.enum_values ?? []);
}
