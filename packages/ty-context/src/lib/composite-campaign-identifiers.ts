import { validatePortablePathComponent } from "./composite-campaign-path-component.js";
import type { CompositeSfcIdV1 } from "./composite-campaign-types.js";

const CAMPAIGN_ID = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const SFC_ID = /^SFC-(?:00[1-9]|0[1-9][0-9]|[1-9][0-9]{2})$/;

export function validateCompositeCampaignId(value: string): string {
  if (typeof value !== "string") throw new TypeError("Composite campaign ID must be a string component");
  validatePortablePathComponent(value, "Composite campaign ID");
  if (value.length > 64 || !CAMPAIGN_ID.test(value)) {
    throw new Error("Composite campaign ID must be one safe lowercase component of at most 64 characters");
  }
  return value;
}

export function validateCompositeSfcId(value: string): CompositeSfcIdV1 {
  if (typeof value !== "string" || !SFC_ID.test(value)) {
    throw new Error("Composite slice ID must use canonical positive SFC-### form");
  }
  return value as CompositeSfcIdV1;
}
