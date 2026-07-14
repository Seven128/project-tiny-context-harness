import path from "node:path";
import type { LongTaskSourceBundleV3 } from "./long-task-contract-schema.js";

export interface ChangeEnvelopeV1 {
  schema_version: "slice-change-envelope-v1";
  allowed_write_paths: string[];
  allowed_supporting_paths: string[];
  forbidden_paths: string[];
  undeclared_change_policy: "reject";
  binding_carrier_paths: Record<string, string[]>;
}

export const HARD_FORBIDDEN_CHANGE_PATHS = [
  "project_context/**",
  ".codex/composite-long-task/**",
] as const;

export function deriveChangeEnvelopeV1(
  bundle: LongTaskSourceBundleV3,
  forbiddenPaths: string[] = [],
): ChangeEnvelopeV1 {
  const allowed: string[] = [];
  const carriers: Record<string, string[]> = {};
  for (const binding of bundle.plan.plan_items
    .flatMap((item) => item.obligations)
    .flatMap((item) => item.implementation_bindings)) {
    if (binding.kind === "file" || binding.kind === "path_glob") {
      allowed.push(assertEnvelopePath(binding.target, `binding:${binding.id}`));
      continue;
    }
    const bindingCarriers = stable(
      (binding.carrier_paths ?? []).map((value) =>
        assertEnvelopePath(value, `binding:${binding.id}:carrier`),
      ),
    );
    if (bindingCarriers.length === 0)
      throw new Error(`change_envelope_carrier_required:${binding.id}`);
    carriers[binding.id] = bindingCarriers;
    allowed.push(...bindingCarriers);
  }
  return validateChangeEnvelopeV1({
    schema_version: "slice-change-envelope-v1",
    allowed_write_paths: stable(allowed),
    allowed_supporting_paths: stable(
      (bundle.plan.supporting_paths ?? []).map((value) =>
        assertEnvelopePath(value, "supporting_path"),
      ),
    ),
    forbidden_paths: stable(
      [
        ...HARD_FORBIDDEN_CHANGE_PATHS,
        ...(bundle.plan.forbidden_paths ?? []),
        ...forbiddenPaths,
      ].map((value) => assertEnvelopePath(value, "forbidden_path")),
    ),
    undeclared_change_policy: "reject",
    binding_carrier_paths: Object.fromEntries(
      Object.entries(carriers).sort(([left], [right]) =>
        asciiCompare(left, right),
      ),
    ),
  });
}

export function validateChangeEnvelopeV1(
  value: ChangeEnvelopeV1,
): ChangeEnvelopeV1 {
  if (!value || value.schema_version !== "slice-change-envelope-v1")
    throw new Error("change_envelope_schema_invalid");
  for (const key of [
    "allowed_write_paths",
    "allowed_supporting_paths",
    "forbidden_paths",
  ] as const) {
    if (!Array.isArray(value[key]))
      throw new Error(`change_envelope_${key}_invalid`);
    value[key] = stable(
      value[key].map((item) => assertEnvelopePath(item, key)),
    );
  }
  if (value.undeclared_change_policy !== "reject")
    throw new Error("change_envelope_undeclared_change_policy_invalid");
  if (
    !value.binding_carrier_paths ||
    typeof value.binding_carrier_paths !== "object" ||
    Array.isArray(value.binding_carrier_paths)
  ) {
    throw new Error("change_envelope_binding_carrier_paths_invalid");
  }
  for (const [bindingId, carriers] of Object.entries(
    value.binding_carrier_paths,
  )) {
    if (
      !/^IB-[A-Z0-9][A-Z0-9-]*$/u.test(bindingId) ||
      !Array.isArray(carriers) ||
      carriers.length === 0
    ) {
      throw new Error(`change_envelope_binding_carrier_invalid:${bindingId}`);
    }
    value.binding_carrier_paths[bindingId] = stable(
      carriers.map((item) => assertEnvelopePath(item, `carrier:${bindingId}`)),
    );
  }
  const forbiddenOverlap = [
    ...value.allowed_write_paths,
    ...value.allowed_supporting_paths,
  ].filter((candidate) =>
    value.forbidden_paths.some((forbidden) =>
      patternsMayOverlap(candidate, forbidden),
    ),
  );
  if (forbiddenOverlap.length)
    throw new Error(
      `change_envelope_forbidden_overlap:${stable(forbiddenOverlap).join(",")}`,
    );
  return value;
}

export function unionChangeEnvelopesV1(
  envelopes: ChangeEnvelopeV1[],
  repairExtras: string[] = [],
): ChangeEnvelopeV1 {
  if (envelopes.length === 0)
    throw new Error("repair_envelope_requires_affected_slices");
  const carriers: Record<string, string[]> = {};
  for (const envelope of envelopes.map((item) =>
    validateChangeEnvelopeV1(structuredClone(item)),
  )) {
    for (const [bindingId, paths] of Object.entries(
      envelope.binding_carrier_paths,
    )) {
      carriers[bindingId] = stable([...(carriers[bindingId] ?? []), ...paths]);
    }
  }
  return validateChangeEnvelopeV1({
    schema_version: "slice-change-envelope-v1",
    allowed_write_paths: stable(
      envelopes.flatMap((item) => item.allowed_write_paths),
    ),
    allowed_supporting_paths: stable([
      ...envelopes.flatMap((item) => item.allowed_supporting_paths),
      ...repairExtras.map((item) => assertEnvelopePath(item, "repair_extra")),
    ]),
    forbidden_paths: stable(envelopes.flatMap((item) => item.forbidden_paths)),
    undeclared_change_policy: "reject",
    binding_carrier_paths: carriers,
  });
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
  const permitted = [
    ...checked.allowed_write_paths,
    ...checked.allowed_supporting_paths,
  ];
  const unbound = normalized.filter(
    (candidate) =>
      !permitted.some((pattern) => pathMatchesEnvelope(candidate, pattern)),
  );
  if (unbound.length)
    throw new Error(`slice_receipt_unbound_changed_path:${unbound.join(",")}`);
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

function assertEnvelopePath(value: string, label: string): string {
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
  ) {
    throw new Error(`change_envelope_path_invalid:${label}:${value}`);
  }
  return normalized;
}

function stable(values: string[]): string[] {
  return [...new Set(values)].sort(asciiCompare);
}
function asciiCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
