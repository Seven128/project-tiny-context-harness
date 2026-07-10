import { validateCompositeCampaignId, validateCompositeSfcId } from "./composite-campaign-identifiers.js";
import type { CompositeSfcIdV1 } from "./composite-campaign-types.js";

export type UnknownRecord = Record<string, unknown>;

export function guardSchemaVersion(value: unknown, expected: string, path: string): UnknownRecord {
  const object = requireRecord(value, path);
  const actual = object.schema_version;
  if (typeof actual === "string" && actual !== expected && isFutureSchema(actual, expected)) {
    throw new Error(`${path} uses an unsupported future schema major: ${actual}`);
  }
  if (actual !== expected) throw new Error(`${path}.schema_version must equal ${expected}`);
  return object;
}

export function rejectAggregateCompletionKeys(value: unknown, path = "$", seen = new Set<object>()): void {
  if (!value || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((entry, index) => rejectAggregateCompletionKeys(entry, `${path}[${index}]`, seen));
  } else {
    for (const [key, entry] of Object.entries(value)) {
      if (isAggregateCompletionKey(key)) {
        throw new Error(`Aggregate completion key ${key} is forbidden at ${path}`);
      }
      rejectAggregateCompletionKeys(entry, `${path}.${key}`, seen);
    }
  }
}

export function requireRecord(value: unknown, path: string): UnknownRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${path} must be an object`);
  }
  return value as UnknownRecord;
}

export function exactKeys(
  value: UnknownRecord,
  required: readonly string[],
  optional: readonly string[] = [],
  path = "$"
): void {
  const allowed = new Set([...required, ...optional]);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new Error(`${path} has unknown key ${key}`);
  }
  for (const key of required) {
    if (!Object.hasOwn(value, key)) throw new Error(`${path}.${key} is required`);
  }
}

export function stringValue(value: unknown, path: string, allowEmpty = false): string {
  if (typeof value !== "string" || (!allowEmpty && value.trim().length === 0)) {
    throw new Error(`${path} must be ${allowEmpty ? "a string" : "a non-empty string"}`);
  }
  return value;
}

export function stringArray(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) throw new Error(`${path} must be an array of strings`);
  const result: string[] = [];
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.hasOwn(value, index)) {
      throw new Error(`${path}[${index}] is a sparse array hole; ${path} must be an array of strings`);
    }
    result.push(stringValue(value[index], `${path}[${index}]`));
  }
  return result;
}

export function booleanValue(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") throw new Error(`${path} must be a boolean`);
  return value;
}

export function integerValue(value: unknown, path: string, minimum = 0): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) {
    throw new Error(`${path} must be a safe integer >= ${minimum}`);
  }
  return value as number;
}

export function revisionValue(value: unknown, path: string): number {
  const revision = integerValue(value, path, 1);
  if (revision > 9999) throw new Error(`${path} must fit a four-digit positive revision`);
  return revision;
}

export function enumValue<const Value extends string>(
  value: unknown,
  allowed: readonly Value[],
  path: string
): Value {
  if (typeof value !== "string" || !allowed.includes(value as Value)) {
    throw new Error(`${path} must be an allowed enum value: ${allowed.join(" | ")}`);
  }
  return value as Value;
}

export function hashValue(value: unknown, path: string): string {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) {
    throw new Error(`${path} must be a lowercase SHA-256 hex string`);
  }
  return value;
}

export function nullableHash(value: unknown, path: string): string | null {
  return value === null ? null : hashValue(value, path);
}

export function timestampValue(value: unknown, path: string): string {
  const timestamp = stringValue(value, path);
  const parsed = Date.parse(timestamp);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(timestamp) ||
    Number.isNaN(parsed) || new Date(parsed).toISOString() !== timestamp
  ) {
    throw new Error(`${path} must be an ISO-8601 UTC timestamp`);
  }
  return timestamp;
}

export function campaignIdValue(value: unknown, path: string): string {
  const candidate = stringValue(value, path);
  try {
    return validateCompositeCampaignId(candidate);
  } catch (error) {
    throw new Error(`${path} is invalid: ${messageOf(error)}`);
  }
}

export function sfcIdValue(value: unknown, path: string): CompositeSfcIdV1 {
  const candidate = stringValue(value, path);
  try {
    return validateCompositeSfcId(candidate);
  } catch (error) {
    throw new Error(`${path} must use canonical SFC-### identity: ${messageOf(error)}`);
  }
}

export function piIdValue(value: unknown, path: string): string {
  const candidate = stringValue(value, path);
  if (!/^PI-(?:00[1-9]|0[1-9]\d|[1-9]\d{2})$/.test(candidate)) {
    throw new Error(`${path} must use canonical positive PI-### identity`);
  }
  return candidate;
}

export function acIdValue(value: unknown, path: string): string {
  const candidate = stringValue(value, path);
  if (!/^AC-(?:00[1-9]|0[1-9]\d|[1-9]\d{2})$/.test(candidate)) {
    throw new Error(`${path} must use canonical positive AC-### identity`);
  }
  return candidate;
}

export function nullableSfcId(value: unknown, path: string): CompositeSfcIdV1 | null {
  return value === null ? null : sfcIdValue(value, path);
}

export function uniqueValues(values: readonly string[], path: string): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) throw new Error(`${path} contains duplicate value ${value}`);
    seen.add(value);
  }
}

export function hasOwn(value: UnknownRecord, key: string): boolean {
  return Object.hasOwn(value, key);
}

function isFutureSchema(actual: string, expected: string): boolean {
  const actualMatch = /^(.*)-v(\d+)$/.exec(actual);
  const expectedMatch = /^(.*)-v(\d+)$/.exec(expected);
  return Boolean(
    actualMatch && expectedMatch && actualMatch[1] === expectedMatch[1] &&
    Number(actualMatch[2]) > Number(expectedMatch[2])
  );
}

function isAggregateCompletionKey(key: string): boolean {
  const normalized = key.replace(/([a-z0-9])([A-Z])/g, "$1_$2").replace(/-/g, "_").toLowerCase();
  if (normalized === "completion_output_status") return true;
  const tokens = normalized.split("_");
  const scope = tokens.some((token) => ["campaign", "product", "goal", "aggregate", "overall", "all"].includes(token));
  const completion = tokens.some((token) => ["complete", "completed", "completion"].includes(token));
  return scope && completion;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
