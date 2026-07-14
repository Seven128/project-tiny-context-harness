import { parseStrictJson } from "./composite-campaign-codec.js";
import type {
  ObservationKind,
  VerificationSpecV3,
} from "./long-task-contract-schema.js";

export interface ObservationV2Record {
  kind: ObservationKind;
  actual: unknown;
  artifact_refs: string[];
}
export interface ObservationV2Envelope {
  schema_version: "ty-context-observation-v2";
  observations: Record<string, ObservationV2Record>;
}

export function parseObservationV2(
  content: string,
  spec: VerificationSpecV3,
  artifactIds: ReadonlySet<string>,
): ObservationV2Envelope {
  let value: unknown;
  try {
    value = parseStrictJson(content.trim());
  } catch (error) {
    throw failure("observation_protocol_invalid", error);
  }
  const root = record(value, "$", ["schema_version", "observations"]);
  if (root.schema_version !== "ty-context-observation-v2")
    throw failure(
      "observation_protocol_invalid",
      "expected ty-context-observation-v2",
    );
  scanReservedAuthority(root, "$");
  const source = record(root.observations, "$.observations", undefined);
  const declared = new Set(
    [...spec.positive_assertions, ...spec.negative_assertions].map(
      (item) => item.observation_id,
    ),
  );
  if (spec.population_enumerator)
    declared.add(spec.population_enumerator.observation_id);
  const observations: Record<string, ObservationV2Record> = {};
  for (const id of Object.keys(source).sort()) {
    token(id, `observation id ${id}`);
    if (!declared.has(id)) throw failure("undeclared_observation", id);
    const item = record(source[id], `$.observations.${id}`, [
      "kind",
      "actual",
      "artifact_refs",
    ]);
    const kind = oneOf(
      item.kind,
      [
        "scalar",
        "implementation_structure",
        "browser_interaction",
        "runtime_behavior",
        "api_contract",
        "data_state",
        "security_boundary",
        "population_coverage",
      ],
      `observation ${id}.kind`,
    ) as ObservationKind;
    const refs = strings(item.artifact_refs, `observation ${id}.artifact_refs`);
    if (new Set(refs).size !== refs.length)
      throw failure(
        "artifact_trust_violation",
        `${id}:duplicate artifact refs`,
      );
    for (const ref of refs)
      if (!artifactIds.has(ref))
        throw failure("artifact_trust_violation", `${id}:${ref}`);
    validateActual(kind, item.actual, id, artifactIds, refs);
    observations[id] = { kind, actual: item.actual, artifact_refs: refs };
  }
  return { schema_version: "ty-context-observation-v2", observations };
}

function validateActual(
  kind: ObservationKind,
  actual: unknown,
  id: string,
  artifactIds: ReadonlySet<string>,
  refs: string[],
): void {
  if (kind === "scalar") return;
  if (kind === "implementation_structure") {
    const row = record(actual, id, [
      "binding_id",
      "target",
      "observed",
      "descriptor",
    ]);
    stringsAt(row, ["binding_id", "target"]);
    if (typeof row.observed !== "boolean")
      throw failure("observation_protocol_invalid", `${id}.observed`);
    return;
  }
  if (kind === "browser_interaction") {
    const row = record(actual, id, [
      "binding_id",
      "owner_surface_id",
      "route",
      "action",
      "feedback",
      "trace_artifact",
    ]);
    stringsAt(row, [
      "binding_id",
      "owner_surface_id",
      "route",
      "action",
      "feedback",
      "trace_artifact",
    ]);
    const trace = String(row.trace_artifact);
    if (!artifactIds.has(trace) || !refs.includes(trace))
      throw failure("artifact_trust_violation", `${id}:${trace}`);
    return;
  }
  if (kind === "runtime_behavior") {
    const row = record(actual, id, ["binding_id", "capability", "value"]);
    stringsAt(row, ["binding_id", "capability"]);
    return;
  }
  if (kind === "api_contract") {
    const row = record(actual, id, [
      "binding_id",
      "method",
      "route",
      "request_schema",
      "response_schema",
      "status_code",
    ]);
    stringsAt(row, ["binding_id", "method", "route"]);
    if (!Number.isInteger(row.status_code))
      throw failure("observation_protocol_invalid", `${id}.status_code`);
    return;
  }
  if (kind === "data_state") {
    const row = record(actual, id, ["binding_id", "schema_ref", "records"]);
    stringsAt(row, ["binding_id", "schema_ref"]);
    return;
  }
  if (kind === "security_boundary") {
    const row = record(actual, id, [
      "binding_id",
      "boundary_id",
      "attempted_action",
      "effect",
    ]);
    stringsAt(row, ["binding_id", "boundary_id", "attempted_action"]);
    return;
  }
  const row = record(actual, id, [
    "enumerated_ids",
    "validated_ids",
    "exclusions",
  ]);
  strings(row.enumerated_ids, `${id}.enumerated_ids`);
  strings(row.validated_ids, `${id}.validated_ids`);
  if (!Array.isArray(row.exclusions))
    throw failure("observation_protocol_invalid", `${id}.exclusions`);
  for (const [index, item] of row.exclusions.entries()) {
    const exclusion = record(item, `${id}.exclusions.${index}`, [
      "id",
      "rule_id",
    ]);
    stringsAt(exclusion, ["id", "rule_id"]);
  }
}
function scanReservedAuthority(value: unknown, path: string): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      scanReservedAuthority(item, `${path}[${index}]`),
    );
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, item] of Object.entries(value)) {
    const tokens = key.toLocaleLowerCase("en-US").split(/[-_]/u);
    if (
      tokens.some((token) =>
        [
          "pass",
          "passed",
          "success",
          "accepted",
          "complete",
          "completed",
          "ok",
        ].includes(token),
      ) ||
      [
        "external_blocker",
        "attempted_alternatives",
        "minimal_user_action",
        "finding",
        "assertion_result",
        "coverage_percent",
        "coverage_percentage",
      ].includes(key.toLocaleLowerCase("en-US"))
    )
      throw failure("oracle_self_signed_result", `${path}.${key}`);
    if (
      key.toLocaleLowerCase("en-US") === "status" &&
      typeof item === "string" &&
      [
        "pass",
        "passed",
        "success",
        "complete",
        "completed",
        "accepted",
        "ok",
      ].includes(item.trim().toLocaleLowerCase("en-US"))
    )
      throw failure("oracle_self_signed_result", `${path}.${key}`);
    scanReservedAuthority(item, `${path}.${key}`);
  }
}
function record(
  value: unknown,
  label: string,
  keys?: string[],
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw failure("observation_protocol_invalid", `${label} must be object`);
  const row = value as Record<string, unknown>;
  if (keys) {
    for (const key of keys)
      if (!(key in row))
        throw failure(
          "observation_protocol_invalid",
          `${label}.${key} missing`,
        );
    for (const key of Object.keys(row))
      if (!keys.includes(key))
        throw failure(
          "observation_protocol_invalid",
          `${label}.${key} unknown`,
        );
  }
  return row;
}
function strings(value: unknown, label: string): string[] {
  if (
    !Array.isArray(value) ||
    value.some((item) => typeof item !== "string" || !item.trim())
  )
    throw failure("observation_protocol_invalid", label);
  return value as string[];
}
function stringsAt(row: Record<string, unknown>, keys: string[]): void {
  for (const key of keys) token(row[key], key);
}
function token(value: unknown, label: string): string {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value !== value.normalize("NFC") ||
    Buffer.byteLength(value, "utf8") > 256
  )
    throw failure("observation_protocol_invalid", label);
  return value;
}
function oneOf(value: unknown, allowed: string[], label: string): string {
  if (typeof value !== "string" || !allowed.includes(value))
    throw failure("observation_protocol_invalid", label);
  return value;
}
function failure(code: string, detail: unknown): Error {
  return new Error(
    `${code}:${detail instanceof Error ? detail.message : String(detail)}`,
  );
}
