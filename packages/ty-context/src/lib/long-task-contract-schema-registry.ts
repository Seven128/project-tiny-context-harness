import acceptance from "../schemas/composite-v3/acceptance-checklist-v3.schema.json" with { type: "json" };
import product from "../schemas/composite-v3/product-source-v3.schema.json" with { type: "json" };
import technical from "../schemas/composite-v3/technical-plan-v3.schema.json" with { type: "json" };
import { canonicalJson, sha256Hex } from "./composite-campaign-codec.js";

export const COMPOSITE_V3_SCHEMAS = {
  "acceptance-checklist-v3": acceptance,
  "product-source-v3": product,
  "technical-plan-v3": technical,
} as const;

export const COMPOSITE_V3_SCHEMA_SET_SHA256 = sha256Hex(
  canonicalJson(COMPOSITE_V3_SCHEMAS),
);

export function requiredRootFields(
  schema: keyof typeof COMPOSITE_V3_SCHEMAS,
): string[] {
  return [...COMPOSITE_V3_SCHEMAS[schema].required];
}
