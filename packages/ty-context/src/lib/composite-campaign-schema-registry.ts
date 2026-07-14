import campaign from "../schemas/composite-v5/composite-campaign-v5.schema.json" with { type: "json" };
import goal from "../schemas/composite-v5/slice-goal-manifest-v2.schema.json" with { type: "json" };
import scope from "../schemas/composite-v5/scope-fit-result-v4.schema.json" with { type: "json" };
import { canonicalJson, sha256Hex } from "./composite-campaign-codec.js";

export const COMPOSITE_V5_SCHEMAS = {
  "composite-campaign-v5": campaign,
  "scope-fit-result-v4": scope,
  "slice-goal-manifest-v2": goal,
} as const;

export const COMPOSITE_V5_SCHEMA_SET_SHA256 = sha256Hex(
  canonicalJson(COMPOSITE_V5_SCHEMAS),
);
