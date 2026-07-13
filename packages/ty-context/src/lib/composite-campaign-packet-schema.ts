import { COMPOSITE_V3_SCHEMAS } from "./long-task-contract-schema-registry.js";
import type { JsonValue } from "./codex-app-server-protocol.js";

export interface PacketSchemaIdentity {
  campaignId: string;
  sliceId: string;
  revision: number;
  previousPacketSha256: string | null;
  sourceUnitIds: string[];
}

export function compositeAuthoringPacketOutputSchemaV3(input: PacketSchemaIdentity): JsonValue {
  const product = namespace(COMPOSITE_V3_SCHEMAS["product-source-v3"] as unknown as Record<string, unknown>, "product");
  const technical = namespace(COMPOSITE_V3_SCHEMAS["technical-plan-v3"] as unknown as Record<string, unknown>, "technical");
  const acceptance = namespace(COMPOSITE_V3_SCHEMAS["acceptance-checklist-v3"] as unknown as Record<string, unknown>, "acceptance");
  const idArray = { type: "array", minItems: 1, uniqueItems: true, items: { type: "string", pattern: "^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+$" } };
  return {
    type: "object", additionalProperties: false,
    required: ["schema_version", "campaign_id", "slice_id", "revision", "previous_packet_sha256", "authorities", "source_unit_bindings"],
    properties: {
      schema_version: { const: "composite-authoring-packet-v3" }, campaign_id: { const: input.campaignId }, slice_id: { const: input.sliceId },
      revision: { const: input.revision }, previous_packet_sha256: input.previousPacketSha256 === null ? { type: "null" } : { const: input.previousPacketSha256 },
      authorities: { type: "object", additionalProperties: false, required: ["product_architecture_source", "technical_realization_plan", "acceptance_checklist"], properties: { product_architecture_source: product.schema, technical_realization_plan: technical.schema, acceptance_checklist: acceptance.schema } },
      source_unit_bindings: { type: "array", minItems: input.sourceUnitIds.length, maxItems: input.sourceUnitIds.length, uniqueItems: true, items: { type: "object", additionalProperties: false, required: ["source_unit_id", "requirement_ids", "obligation_ids", "acceptance_criterion_ids", "verification_spec_ids"], properties: { source_unit_id: { enum: input.sourceUnitIds }, requirement_ids: idArray, obligation_ids: idArray, acceptance_criterion_ids: idArray, verification_spec_ids: idArray } } }
    },
    $defs: { ...product.defs, ...technical.defs, ...acceptance.defs }
  } as JsonValue;
}

function namespace(source: Record<string, unknown>, prefix: string): { schema: JsonValue; defs: Record<string, JsonValue> } {
  const definitions = source.$defs && typeof source.$defs === "object" ? source.$defs as Record<string, unknown> : {};
  const root = Object.fromEntries(Object.entries(source).filter(([key]) => !["$schema", "$id", "$defs", "title"].includes(key)));
  const defs = Object.fromEntries(Object.entries(definitions).map(([key, value]) => [`${prefix}_${key}`, rewrite(value, prefix)]));
  return { schema: rewrite(root, prefix), defs };
}

function rewrite(value: unknown, prefix: string): JsonValue {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map((item) => rewrite(item, prefix));
  if (!value || typeof value !== "object") throw new Error("packet_output_schema_invalid:non_json_value");
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, key === "$ref" && typeof item === "string" && item.startsWith("#/$defs/") ? `#/$defs/${prefix}_${item.slice(8)}` : rewrite(item, prefix)]));
}
