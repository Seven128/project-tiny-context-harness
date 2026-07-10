import { utf8ByteLength } from "./composite-campaign-codec.js";
import {
  isRedactedPropertyValue,
  isRedactedValue,
  isSensitiveKey,
  secretLabelForKey
} from "./composite-campaign-sensitive-rules.js";
import { sanitizeCompositeRequestText, secretLabelForText } from "./composite-campaign-request-sanitizer.js";

export const COMPOSITE_CAMPAIGN_TRACKED_FILE_MAX_BYTES = 1024 * 1024;
export const COMPOSITE_CAMPAIGN_EVENT_LINE_MAX_BYTES = 64 * 1024;

export interface CompositeCampaignSanitizedRequest {
  content: string;
  redaction_count: number;
}

export interface CompositeCampaignSecretFinding {
  pointer: string;
  label: string;
}

export function sanitizeCompositeCampaignRequest(raw: string): CompositeCampaignSanitizedRequest {
  if (typeof raw !== "string") throw new TypeError("Composite campaign request must be a string");
  const sanitized = sanitizeCompositeRequestText(raw);
  return { content: sanitized.content, redaction_count: sanitized.redactionCount };
}

export function findCompositeCampaignPacketSecrets(value: unknown): CompositeCampaignSecretFinding[] {
  const findings: CompositeCampaignSecretFinding[] = [];
  scanValue(value, "", undefined, findings, new Set());
  return findings;
}

export function assertCompositeCampaignPacketSafe(value: unknown): void {
  assertCompositeCampaignValueSafe(value, "packet");
}

export function assertCompositeCampaignScopeFitSafe(value: unknown): void {
  assertCompositeCampaignValueSafe(value, "Scope Fit");
}

function assertCompositeCampaignValueSafe(value: unknown, label: string): void {
  const findings = findCompositeCampaignPacketSecrets(value);
  if (findings.length === 0) return;
  const locations = findings.map(({ pointer, label }) => `${pointer || "/"} (${label})`).join(", ");
  throw new Error(`Composite campaign ${label} contains secret or credential material at ${locations}`);
}

export function assertCompositeCampaignTrackedFileSize(value: string | Uint8Array): number {
  const bytes = byteLength(value);
  if (bytes > COMPOSITE_CAMPAIGN_TRACKED_FILE_MAX_BYTES) {
    throw new Error(`Composite campaign tracked file exceeds the 1 MiB byte limit (${bytes} bytes)`);
  }
  return bytes;
}

export function assertCompositeCampaignEventLineSize(value: string | Uint8Array): number {
  const bytes = byteLength(value);
  if (bytes > COMPOSITE_CAMPAIGN_EVENT_LINE_MAX_BYTES) {
    throw new Error(`Composite campaign event line exceeds the 64 KiB byte limit (${bytes} bytes)`);
  }
  return bytes;
}

function scanValue(
  value: unknown,
  pointer: string,
  property: string | undefined,
  findings: CompositeCampaignSecretFinding[],
  ancestors: Set<object>
): void {
  if (typeof value === "string") {
    if (isRedactedValue(value) || isRedactedPropertyValue(property, value)) return;
    const label = property && isSensitiveKey(property) ? secretLabelForKey(property) : secretLabelForText(value);
    if (label) findings.push({ pointer: pointer || "/", label });
    return;
  }
  if (property && isSensitiveKey(property) && value !== null && value !== undefined) {
    findings.push({ pointer: pointer || "/", label: secretLabelForKey(property) });
    return;
  }
  if (!value || typeof value !== "object" || ancestors.has(value)) return;
  ancestors.add(value);
  if (Array.isArray(value)) {
    value.forEach((entry, index) => scanValue(entry, `${pointer}/${index}`, undefined, findings, ancestors));
  } else {
    for (const [key, entry] of Object.entries(value)) {
      scanValue(entry, `${pointer}/${escapePointer(key)}`, key, findings, ancestors);
    }
  }
  ancestors.delete(value);
}

function escapePointer(value: string): string {
  return value.replace(/~/g, "~0").replace(/\//g, "~1");
}

function byteLength(value: string | Uint8Array): number {
  return typeof value === "string" ? utf8ByteLength(value) : value.byteLength;
}
