import type {
  CounterfactualControlV2,
  DeliveryBindingV2,
  DeliveryControlV2,
  DeliveryObligationV2,
  DeliveryOwnerV2,
  EnvironmentRequirementV2,
  KeyedPathV2,
  KeyedStatementV2,
  PopulationRequirementV2,
  ProofSurface,
  RollbackRecoveryV2,
  SourceClaimV2,
} from "./long-task-delivery-types.js";

export type Shape = Record<string, unknown>;

export function object(
  value: unknown,
  label: string,
  required: string[],
  optional: string[] = [],
): Shape {
  if (!value || typeof value !== "object" || Array.isArray(value))
    fail(label, "must be an object");
  const row = value as Shape;
  const allowed = new Set([...required, ...optional]);
  const unknown = Object.keys(row).filter((name) => !allowed.has(name));
  if (unknown.length) fail(label, `unknown keys: ${unknown.join(",")}`);
  const missing = required.filter((name) => !(name in row));
  if (missing.length) fail(label, `missing keys: ${missing.join(",")}`);
  return row;
}

export function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) fail(label, "must be an array");
  return value;
}

export function string(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim())
    fail(label, "must be a non-empty string");
  return value;
}

export function text(value: unknown, label: string): string {
  if (typeof value !== "string") fail(label, "must be a string");
  return value;
}

export function strings(value: unknown, label: string): string[] {
  return array(value, label).map((item, index) =>
    string(item, `${label}[${index}]`),
  );
}

export function literal<T extends string>(
  value: unknown,
  allowed: readonly T[],
  label: string,
): T {
  if (typeof value !== "string" || !allowed.includes(value as T))
    fail(label, `must be one of ${allowed.join(",")}`);
  return value as T;
}

export function key(value: unknown, label: string): string {
  const result = string(value, label);
  if (!/^[a-z0-9][a-z0-9-]*$/u.test(result))
    fail(label, "must match ^[a-z0-9][a-z0-9-]*$");
  return result;
}

export function nullable<T>(
  value: unknown,
  parser: (value: unknown) => T,
): T | null {
  return value === null ? null : parser(value);
}

export function parseKeyedStatements(
  value: unknown,
  label: string,
): KeyedStatementV2[] {
  return array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = object(item, itemLabel, ["key", "statement"]);
    return {
      key: key(row.key, `${itemLabel}.key`),
      statement: string(row.statement, `${itemLabel}.statement`),
    };
  });
}

export function parseKeyedPaths(value: unknown, label: string): KeyedPathV2[] {
  return array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = object(item, itemLabel, ["key", "path"]);
    return {
      key: key(row.key, `${itemLabel}.key`),
      path: string(row.path, `${itemLabel}.path`),
    };
  });
}

export function parseControls(
  value: unknown,
  label: string,
): DeliveryControlV2[] {
  return array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = object(item, itemLabel, [
      "key",
      "location",
      "trigger",
      "input",
      "loading_state",
      "empty_state",
      "success_state",
      "failure_state",
      "feedback",
    ]);
    return {
      key: key(row.key, `${itemLabel}.key`),
      location: string(row.location, `${itemLabel}.location`),
      trigger: text(row.trigger, `${itemLabel}.trigger`),
      input: text(row.input, `${itemLabel}.input`),
      loading_state: text(row.loading_state, `${itemLabel}.loading_state`),
      empty_state: text(row.empty_state, `${itemLabel}.empty_state`),
      success_state: text(row.success_state, `${itemLabel}.success_state`),
      failure_state: text(row.failure_state, `${itemLabel}.failure_state`),
      feedback: text(row.feedback, `${itemLabel}.feedback`),
    };
  });
}

export function parseOwner(value: unknown, label: string): DeliveryOwnerV2 {
  const row = object(value, label, ["label", "context_refs", "path_globs"]);
  return {
    label: string(row.label, `${label}.label`),
    context_refs: strings(row.context_refs, `${label}.context_refs`),
    path_globs: strings(row.path_globs, `${label}.path_globs`),
  };
}

export function parseObligations(
  value: unknown,
  label: string,
): DeliveryObligationV2[] {
  return array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = object(item, itemLabel, [
      "key",
      "statement",
      "required_proof_surfaces",
    ]);
    return {
      key: key(row.key, `${itemLabel}.key`),
      statement: string(row.statement, `${itemLabel}.statement`),
      required_proof_surfaces: array(
        row.required_proof_surfaces,
        `${itemLabel}.required_proof_surfaces`,
      ).map((surface, surfaceIndex) =>
        literal(
          surface,
          PROOF_SURFACES,
          `${itemLabel}.required_proof_surfaces[${surfaceIndex}]`,
        ),
      ),
    };
  });
}

export function parseBindings(
  value: unknown,
  label: string,
): DeliveryBindingV2[] {
  return array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = object(
      item,
      itemLabel,
      ["key", "kind", "target", "carrier_paths"],
      ["existence", "verification_check_key"],
    );
    const kindValue = literal(
      row.kind,
      ["path_glob", "file", "verified"] as const,
      `${itemLabel}.kind`,
    );
    const verificationCheckKey = Object.hasOwn(row, "verification_check_key")
      ? key(row.verification_check_key, `${itemLabel}.verification_check_key`)
      : undefined;
    if (kindValue === "verified" && !verificationCheckKey)
      fail(`${itemLabel}.verification_check_key`, "is required for verified");
    if (kindValue !== "verified" && verificationCheckKey)
      fail(
        `${itemLabel}.verification_check_key`,
        "is only allowed for verified",
      );
    return {
      key: key(row.key, `${itemLabel}.key`),
      kind: kindValue,
      target: string(row.target, `${itemLabel}.target`),
      carrier_paths: strings(row.carrier_paths, `${itemLabel}.carrier_paths`),
      existence: Object.hasOwn(row, "existence")
        ? literal(
            row.existence,
            ["existing", "planned"] as const,
            `${itemLabel}.existence`,
          )
        : "existing",
      ...(verificationCheckKey
        ? { verification_check_key: verificationCheckKey }
        : {}),
    };
  });
}

export function parseSourceClaims(
  value: unknown,
  label: string,
): SourceClaimV2[] {
  return array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = object(item, itemLabel, [
      "key",
      "source_ref",
      "statement",
      "disposition",
    ]);
    const disposition = object(
      row.disposition,
      `${itemLabel}.disposition`,
      ["type"],
      ["refs", "reason"],
    );
    const type = literal(
      disposition.type,
      [
        "claim",
        "global_constraint",
        "out_of_scope",
        "decision_required",
      ] as const,
      `${itemLabel}.disposition.type`,
    );
    return {
      key: key(row.key, `${itemLabel}.key`),
      source_ref: string(row.source_ref, `${itemLabel}.source_ref`),
      statement: string(row.statement, `${itemLabel}.statement`),
      disposition:
        type === "claim" || type === "global_constraint"
          ? {
              type,
              refs: strings(disposition.refs, `${itemLabel}.disposition.refs`),
            }
          : {
              type,
              reason: string(
                disposition.reason,
                `${itemLabel}.disposition.reason`,
              ),
            },
    };
  });
}

export function parseRollback(
  value: unknown,
  label: string,
): RollbackRecoveryV2 {
  const row = object(value, label, [
    "rollback",
    "recovery",
    "verification_check_keys",
  ]);
  return {
    rollback: string(row.rollback, `${label}.rollback`),
    recovery: string(row.recovery, `${label}.recovery`),
    verification_check_keys: strings(
      row.verification_check_keys,
      `${label}.verification_check_keys`,
    ),
  };
}

export function parseCounterfactuals(
  value: unknown,
  label: string,
): CounterfactualControlV2[] {
  return array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = object(item, itemLabel, [
      "key",
      "claims",
      "check_key",
      "mutation",
      "expected_assertion_failures",
    ]);
    const mutation = object(
      row.mutation,
      `${itemLabel}.mutation`,
      ["type"],
      ["paths", "path", "fixture_path"],
    );
    const type = literal(
      mutation.type,
      ["remove_paths", "replace_file"] as const,
      `${itemLabel}.mutation.type`,
    );
    return {
      key: key(row.key, `${itemLabel}.key`),
      claims: strings(row.claims, `${itemLabel}.claims`),
      check_key: key(row.check_key, `${itemLabel}.check_key`),
      mutation:
        type === "remove_paths"
          ? {
              type,
              paths: strings(mutation.paths, `${itemLabel}.mutation.paths`),
            }
          : {
              type,
              path: string(mutation.path, `${itemLabel}.mutation.path`),
              fixture_path: string(
                mutation.fixture_path,
                `${itemLabel}.mutation.fixture_path`,
              ),
            },
      expected_assertion_failures: strings(
        row.expected_assertion_failures,
        `${itemLabel}.expected_assertion_failures`,
      ).map((item, assertionIndex) =>
        key(
          item,
          `${itemLabel}.expected_assertion_failures[${assertionIndex}]`,
        ),
      ),
    };
  });
}

export function parsePopulation(
  value: unknown,
  label: string,
): PopulationRequirementV2 {
  const row = object(value, label, [
    "check_key",
    "claims",
    "observations",
    "exclusion_rules",
  ]);
  const observations = object(row.observations, `${label}.observations`, [
    "eligible_ids",
    "observed_ids",
    "excluded_items",
  ]);
  return {
    check_key: key(row.check_key, `${label}.check_key`),
    claims: strings(row.claims, `${label}.claims`),
    observations: {
      eligible_ids: string(
        observations.eligible_ids,
        `${label}.observations.eligible_ids`,
      ),
      observed_ids: string(
        observations.observed_ids,
        `${label}.observations.observed_ids`,
      ),
      excluded_items: string(
        observations.excluded_items,
        `${label}.observations.excluded_items`,
      ),
    },
    exclusion_rules: parseKeyedStatements(
      row.exclusion_rules,
      `${label}.exclusion_rules`,
    ),
  };
}

export function parseEnvironmentRequirements(
  value: unknown,
  label: string,
): EnvironmentRequirementV2[] {
  return array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const base = object(
      item,
      itemLabel,
      ["key", "kind"],
      ["target", "host", "port", "timeout_ms"],
    );
    const kindValue = literal(
      base.kind,
      ["executable", "file", "directory", "env_var", "loopback_tcp"] as const,
      `${itemLabel}.kind`,
    );
    const requirementKey = key(base.key, `${itemLabel}.key`);
    if (kindValue !== "loopback_tcp")
      return {
        key: requirementKey,
        kind: kindValue,
        target: string(base.target, `${itemLabel}.target`),
      } as EnvironmentRequirementV2;
    const host = literal(
      base.host,
      ["127.0.0.1", "::1", "localhost"] as const,
      `${itemLabel}.host`,
    );
    const port = Number(base.port);
    const timeout = Number(base.timeout_ms);
    if (!Number.isInteger(port) || port < 1 || port > 65535)
      fail(`${itemLabel}.port`, "must be an integer from 1 to 65535");
    if (!Number.isInteger(timeout) || timeout < 10 || timeout > 60_000)
      fail(`${itemLabel}.timeout_ms`, "must be an integer from 10 to 60000");
    return {
      key: requirementKey,
      kind: kindValue,
      host,
      port,
      timeout_ms: timeout,
    };
  });
}

export const PROOF_SURFACES = [
  "ui_browser",
  "runtime_behavior",
  "api_contract",
  "data_state",
  "security_boundary",
  "population_coverage",
  "implementation_structure",
] as const satisfies readonly ProofSurface[];

export function fail(label: string, message: string): never {
  throw new Error(`delivery_contract_invalid:${label}:${message}`);
}
