import { createHash } from "node:crypto";

export function stableJson(value: unknown): string {
  return JSON.stringify(sortJson(value), null, 2);
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJson);
  }
  if (!isRecord(value)) {
    return value;
  }
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortJson(value[key])]));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
