import path from "node:path";
import { canonicalJson, sha256Hex } from "./composite-campaign-codec.js";
import type { LongTaskSourceBundleV3 } from "./long-task-contract-schema.js";

export interface ChangeEnvelopeV1 {
  schema_version: "slice-change-envelope-v1";
  allowed_write_paths: string[];
  allowed_supporting_paths: string[];
  allowed_contract_keys: string[];
  forbidden_paths: string[];
  undeclared_change_policy: "reject";
  envelope_sha256: string;
}

export interface ChangeEnvelopeSourcesV1 {
  allowedSupportingPaths?: string[];
  forbiddenPaths?: string[];
}

export const HARD_FORBIDDEN_CHANGE_PATHS = [
  ".codex/composite-long-task/**",
  ".codex/ty-context-active-long-task.json",
  ".codex/ty-context-final-result-receipt.json",
  "project_context/**",
] as const;

export function deriveChangeEnvelopeV1(
  bundle: LongTaskSourceBundleV3,
  sources: ChangeEnvelopeSourcesV1 = {},
): ChangeEnvelopeV1 {
  const bindings = bundle.plan.plan_items
    .flatMap((item) => item.obligations)
    .flatMap((item) => item.implementation_bindings);
  return createChangeEnvelopeV1({
    allowed_write_paths: bindings
      .filter(
        (binding) => binding.kind === "file" || binding.kind === "path_glob",
      )
      .map((binding) =>
        assertEnvelopePath(binding.target, `binding:${binding.id}`),
      ),
    allowed_supporting_paths: (sources.allowedSupportingPaths ?? []).map(
      (value) => assertEnvelopePath(value, "supporting_path"),
    ),
    allowed_contract_keys: bindings
      .filter(
        (binding) => binding.kind !== "file" && binding.kind !== "path_glob",
      )
      .map((binding) => `${binding.kind}:${binding.target}`),
    forbidden_paths: [
      ...HARD_FORBIDDEN_CHANGE_PATHS,
      ...(sources.forbiddenPaths ?? []),
    ].map((value) => assertEnvelopePath(value, "forbidden_path")),
  });
}

export function validateChangeEnvelopeV1(
  value: ChangeEnvelopeV1,
): ChangeEnvelopeV1 {
  if (!value || value.schema_version !== "slice-change-envelope-v1")
    throw new Error("change_envelope_schema_invalid");
  const expected = [
    "schema_version",
    "allowed_write_paths",
    "allowed_supporting_paths",
    "allowed_contract_keys",
    "forbidden_paths",
    "undeclared_change_policy",
    "envelope_sha256",
  ];
  for (const key of expected)
    if (!Object.hasOwn(value, key))
      throw new Error(`change_envelope_field_missing:${key}`);
  for (const key of Object.keys(value))
    if (!expected.includes(key))
      throw new Error(`change_envelope_field_unknown:${key}`);
  const normalized = {
    schema_version: "slice-change-envelope-v1" as const,
    allowed_write_paths: pathSet(
      value.allowed_write_paths,
      "allowed_write_paths",
    ),
    allowed_supporting_paths: pathSet(
      value.allowed_supporting_paths,
      "allowed_supporting_paths",
    ),
    allowed_contract_keys: contractKeySet(value.allowed_contract_keys),
    forbidden_paths: pathSet(value.forbidden_paths, "forbidden_paths"),
    undeclared_change_policy: value.undeclared_change_policy,
  };
  if (normalized.undeclared_change_policy !== "reject")
    throw new Error("change_envelope_undeclared_change_policy_invalid");
  for (const required of HARD_FORBIDDEN_CHANGE_PATHS)
    if (!normalized.forbidden_paths.includes(required))
      throw new Error(`change_envelope_hard_forbidden_missing:${required}`);
  const forbiddenOverlap = [
    ...normalized.allowed_write_paths,
    ...normalized.allowed_supporting_paths,
  ].filter((candidate) =>
    normalized.forbidden_paths.some((forbidden) =>
      patternsMayOverlap(candidate, forbidden),
    ),
  );
  if (forbiddenOverlap.length)
    throw new Error(
      `change_envelope_forbidden_overlap:${stable(forbiddenOverlap).join(",")}`,
    );
  const envelopeSha256 = sha256Hex(canonicalJson(normalized));
  if (value.envelope_sha256 !== envelopeSha256)
    throw new Error("change_envelope_hash_mismatch");
  return { ...normalized, envelope_sha256: envelopeSha256 };
}

export function unionChangeEnvelopesV1(
  envelopes: ChangeEnvelopeV1[],
  explicitConflictPaths: string[] = [],
): ChangeEnvelopeV1 {
  if (envelopes.length === 0)
    throw new Error("repair_envelope_requires_affected_slices");
  const checked = envelopes.map((item) =>
    validateChangeEnvelopeV1(structuredClone(item)),
  );
  return createChangeEnvelopeV1({
    allowed_write_paths: checked.flatMap((item) => item.allowed_write_paths),
    allowed_supporting_paths: [
      ...checked.flatMap((item) => item.allowed_supporting_paths),
      ...explicitConflictPaths.map((item) =>
        assertEnvelopePath(item, "repair_conflict_path"),
      ),
    ],
    allowed_contract_keys: checked.flatMap(
      (item) => item.allowed_contract_keys,
    ),
    forbidden_paths: checked.flatMap((item) => item.forbidden_paths),
  });
}

export function undeclaredChangedPathsV1(
  changedPaths: string[],
  envelope: ChangeEnvelopeV1,
): string[] {
  const checked = validateChangeEnvelopeV1(structuredClone(envelope));
  const normalized = stable(
    changedPaths.map((item) => assertEnvelopePath(item, "changed_path")),
  );
  const permitted = [
    ...checked.allowed_write_paths,
    ...checked.allowed_supporting_paths,
  ];
  return normalized.filter(
    (candidate) =>
      !permitted.some((pattern) => pathMatchesEnvelope(candidate, pattern)),
  );
}

export function assertChangedPathsWithinEnvelopeV1(
  changedPaths: string[],
  envelope: ChangeEnvelopeV1,
): void {
  const checked = validateChangeEnvelopeV1(structuredClone(envelope));
  const normalized = stable(
    changedPaths.map((item) => assertEnvelopePath(item, "changed_path")),
  );
  const forbidden = normalized.filter((candidate) =>
    checked.forbidden_paths.some((pattern) =>
      pathMatchesEnvelope(candidate, pattern),
    ),
  );
  if (forbidden.length)
    throw new Error(
      `slice_receipt_forbidden_campaign_state_change:${forbidden.join(",")}`,
    );
  const undeclared = undeclaredChangedPathsV1(normalized, checked);
  if (undeclared.length)
    throw new Error(
      `slice_receipt_unbound_changed_path:${undeclared.join(",")}`,
    );
}

export function pathMatchesEnvelope(
  candidateValue: string,
  patternValue: string,
): boolean {
  const candidate = assertEnvelopePath(candidateValue, "candidate");
  const pattern = assertEnvelopePath(patternValue, "pattern");
  if (!hasGlob(pattern))
    return candidate === pattern || candidate.startsWith(`${pattern}/`);
  return globRegExp(pattern).test(candidate);
}

function createChangeEnvelopeV1(input: {
  allowed_write_paths: string[];
  allowed_supporting_paths: string[];
  allowed_contract_keys: string[];
  forbidden_paths: string[];
}): ChangeEnvelopeV1 {
  const identity = {
    schema_version: "slice-change-envelope-v1" as const,
    allowed_write_paths: pathSet(
      input.allowed_write_paths,
      "allowed_write_paths",
    ),
    allowed_supporting_paths: pathSet(
      input.allowed_supporting_paths,
      "allowed_supporting_paths",
    ),
    allowed_contract_keys: contractKeySet(input.allowed_contract_keys),
    forbidden_paths: pathSet(input.forbidden_paths, "forbidden_paths"),
    undeclared_change_policy: "reject" as const,
  };
  return validateChangeEnvelopeV1({
    ...identity,
    envelope_sha256: sha256Hex(canonicalJson(identity)),
  });
}

function pathSet(values: unknown, label: string): string[] {
  if (!Array.isArray(values))
    throw new Error(`change_envelope_${label}_invalid`);
  return stable(values.map((item) => assertEnvelopePath(item, label)));
}

function contractKeySet(values: unknown): string[] {
  if (!Array.isArray(values))
    throw new Error("change_envelope_allowed_contract_keys_invalid");
  return stable(
    values.map((item) => {
      if (
        typeof item !== "string" ||
        !/^(?:symbol|schema|route|runtime_capability):\S+$/u.test(item) ||
        /[\r\n\0]/u.test(item)
      )
        throw new Error(`change_envelope_contract_key_invalid:${String(item)}`);
      return item;
    }),
  );
}

function globRegExp(pattern: string): RegExp {
  let result = "^";
  for (let index = 0; index < pattern.length; index += 1) {
    const current = pattern[index];
    if (current === "*" && pattern[index + 1] === "*") {
      index += 1;
      if (pattern[index + 1] === "/") {
        index += 1;
        result += "(?:.*/)?";
      } else result += ".*";
    } else if (current === "*") result += "[^/]*";
    else if (current === "?") result += "[^/]";
    else result += current.replace(/[\\^$+?.()|{}\[\]]/gu, "\\$&");
  }
  return new RegExp(`${result}$`, process.platform === "win32" ? "iu" : "u");
}

function patternsMayOverlap(left: string, right: string): boolean {
  if (left === right) return true;
  if (!hasGlob(left) && pathMatchesEnvelope(left, right)) return true;
  if (!hasGlob(right) && pathMatchesEnvelope(right, left)) return true;
  const leftPrefix = left.split(/[*?\[]/u, 1)[0];
  const rightPrefix = right.split(/[*?\[]/u, 1)[0];
  return (
    leftPrefix.startsWith(rightPrefix) || rightPrefix.startsWith(leftPrefix)
  );
}

function hasGlob(value: string): boolean {
  return /[*?\[]/u.test(value);
}

function assertEnvelopePath(value: unknown, label: string): string {
  if (typeof value !== "string")
    throw new Error(`change_envelope_path_invalid:${label}`);
  const normalized = value
    .replace(/\\/gu, "/")
    .replace(/^\.\//u, "")
    .replace(/\/{2,}/gu, "/")
    .replace(/\/$/u, "");
  if (
    !normalized ||
    path.posix.isAbsolute(normalized) ||
    /^[A-Za-z]:/u.test(normalized) ||
    normalized.split("/").includes("..") ||
    normalized.includes("\0")
  )
    throw new Error(`change_envelope_path_invalid:${label}:${value}`);
  return normalized;
}

function stable(values: string[]): string[] {
  return [...new Set(values)].sort(asciiCompare);
}

function asciiCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
