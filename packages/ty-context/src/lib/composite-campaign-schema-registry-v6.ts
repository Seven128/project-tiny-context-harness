import campaign from "../schemas/composite-v6/composite-campaign-v6.schema.json" with { type: "json" };
import receipt from "../schemas/composite-v6/slice-execution-receipt-v3.schema.json" with { type: "json" };
import coverage from "../schemas/composite-v5/composite-source-coverage-v2.schema.json" with { type: "json" };
import scope from "../schemas/composite-v5/scope-fit-result-v4.schema.json" with { type: "json" };
import envelope from "../schemas/composite-v5/slice-change-envelope-v1.schema.json" with { type: "json" };
import impact from "../schemas/composite-v5/campaign-wave-impact-v2.schema.json" with { type: "json" };
import integration from "../schemas/composite-v5/wave-integration-result-v2.schema.json" with { type: "json" };
import targetReceipt from "../schemas/composite-v5/campaign-target-finalization-receipt-v1.schema.json" with { type: "json" };
import targetRevalidation from "../schemas/composite-v5/campaign-target-revalidation-result-v1.schema.json" with { type: "json" };
import { canonicalJson, sha256Hex } from "./composite-campaign-codec.js";

export const COMPOSITE_V6_SCHEMAS = {
  "composite-campaign-v6": campaign,
  "composite-source-coverage-v2": coverage,
  "scope-fit-result-v4": scope,
  "slice-execution-receipt-v3": receipt,
  "slice-change-envelope-v1": envelope,
  "campaign-wave-impact-v2": impact,
  "wave-integration-result-v2": integration,
  "campaign-target-finalization-receipt-v1": targetReceipt,
  "campaign-target-revalidation-result-v1": targetRevalidation,
} as const;

export const COMPOSITE_V6_SCHEMA_SET_SHA256 = sha256Hex(
  canonicalJson(COMPOSITE_V6_SCHEMAS),
);
