import type {
  CounterfactualControlV1,
  DeliveryBindingV1,
  DeliveryControlV1,
  PopulationRequirementV1,
  RollbackRecoveryV1,
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
  const unknown = Object.keys(row).filter((key) => !allowed.has(key));
  if (unknown.length) fail(label, `unknown keys: ${unknown.join(",")}`);
  const missing = required.filter((key) => !(key in row));
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

export function strings(value: unknown, label: string): string[] {
  return array(value, label).map((item, index) =>
    string(item, `${label}[${index}]`),
  );
}

export function boolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") fail(label, "must be a boolean");
  return value;
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

export function parseControls(
  value: unknown,
  label: string,
): DeliveryControlV1[] {
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
      trigger: string(row.trigger, `${itemLabel}.trigger`),
      input: string(row.input, `${itemLabel}.input`),
      loading_state: string(row.loading_state, `${itemLabel}.loading_state`),
      empty_state: string(row.empty_state, `${itemLabel}.empty_state`),
      success_state: string(row.success_state, `${itemLabel}.success_state`),
      failure_state: string(row.failure_state, `${itemLabel}.failure_state`),
      feedback: string(row.feedback, `${itemLabel}.feedback`),
    };
  });
}

export function parseBindings(
  value: unknown,
  label: string,
): DeliveryBindingV1[] {
  return array(value, label).map((item, index) => {
    const row = object(item, `${label}[${index}]`, [
      "kind",
      "target",
      "carrier_paths",
    ]);
    return {
      kind: literal(
        row.kind,
        [
          "path_glob",
          "file",
          "symbol",
          "schema",
          "route",
          "runtime_capability",
        ] as const,
        `${label}[${index}].kind`,
      ),
      target: string(row.target, `${label}[${index}].target`),
      carrier_paths: strings(
        row.carrier_paths,
        `${label}[${index}].carrier_paths`,
      ),
    };
  });
}

export function parseRollback(
  value: unknown,
  label: string,
): RollbackRecoveryV1 {
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
): CounterfactualControlV1[] {
  return array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = object(item, itemLabel, ["check_key", "mutation", "expect"]);
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
      expect: literal(
        row.expect,
        ["check_fails"] as const,
        `${itemLabel}.expect`,
      ),
    };
  });
}

export function parsePopulation(
  value: unknown,
  label: string,
): PopulationRequirementV1 {
  const row = object(value, label, [
    "check_key",
    "observation",
    "required_coverage_percent",
    "exclusion_rules",
  ]);
  if (row.required_coverage_percent !== 100)
    fail(`${label}.required_coverage_percent`, "must equal 100");
  return {
    check_key: key(row.check_key, `${label}.check_key`),
    observation: string(row.observation, `${label}.observation`),
    required_coverage_percent: 100,
    exclusion_rules: strings(row.exclusion_rules, `${label}.exclusion_rules`),
  };
}

export function fail(label: string, message: string): never {
  throw new Error(`delivery_contract_invalid:${label}:${message}`);
}
