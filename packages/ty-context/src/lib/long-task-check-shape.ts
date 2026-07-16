import type {
  AssertionOperator,
  DeliveryAssertionV2,
  DeliveryCheckV2,
  DeliveryRunnerV2,
  RunnerType,
} from "./long-task-delivery-types.js";
import {
  array,
  fail,
  key,
  literal,
  object,
  parseEnvironmentRequirements,
  PROOF_SURFACES,
  string,
  strings,
} from "./long-task-delivery-shape.js";

export function parseCheck(value: unknown, label: string): DeliveryCheckV2 {
  const row = object(value, label, [
    "key",
    "proof_surface",
    "runner",
    "verification_inputs",
    "input_paths",
    "expected_output_paths",
    "artifact_globs",
    "positive_assertions",
    "negative_assertions",
    "environment_requirements",
  ]);
  return {
    key: key(row.key, `${label}.key`),
    proof_surface: literal(
      row.proof_surface,
      PROOF_SURFACES,
      `${label}.proof_surface`,
    ),
    runner: parseRunner(row.runner, `${label}.runner`),
    verification_inputs: strings(
      row.verification_inputs,
      `${label}.verification_inputs`,
    ),
    input_paths: strings(row.input_paths, `${label}.input_paths`),
    expected_output_paths: strings(
      row.expected_output_paths,
      `${label}.expected_output_paths`,
    ),
    artifact_globs: strings(row.artifact_globs, `${label}.artifact_globs`),
    positive_assertions: parseAssertions(
      row.positive_assertions,
      `${label}.positive_assertions`,
    ),
    negative_assertions: parseAssertions(
      row.negative_assertions,
      `${label}.negative_assertions`,
    ),
    environment_requirements: parseEnvironmentRequirements(
      row.environment_requirements,
      `${label}.environment_requirements`,
    ),
  };
}

function parseRunner(value: unknown, label: string): DeliveryRunnerV2 {
  const row = object(value, label, [
    "type",
    "target",
    "argv",
    "cwd",
    "timeout_ms",
    "effect",
    "retry_policy",
    "idempotent",
  ]);
  const timeout = Number(row.timeout_ms);
  if (!Number.isInteger(timeout) || timeout < 100 || timeout > 3_600_000)
    fail(`${label}.timeout_ms`, "must be an integer from 100 to 3600000");
  if (typeof row.idempotent !== "boolean")
    fail(`${label}.idempotent`, "must be a boolean");
  return {
    type: literal(
      row.type,
      [
        "package_script",
        "project_binary",
        "node_oracle",
        "playwright_test",
      ] as const satisfies readonly RunnerType[],
      `${label}.type`,
    ),
    target: string(row.target, `${label}.target`),
    argv: strings(row.argv, `${label}.argv`),
    cwd: string(row.cwd, `${label}.cwd`),
    timeout_ms: timeout,
    effect: literal(
      row.effect,
      ["read_only", "test_sandbox"] as const,
      `${label}.effect`,
    ),
    retry_policy: literal(
      row.retry_policy,
      ["none", "transient_once"] as const,
      `${label}.retry_policy`,
    ),
    idempotent: row.idempotent,
  };
}

function parseAssertions(value: unknown, label: string): DeliveryAssertionV2[] {
  return array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = object(
      item,
      itemLabel,
      ["key", "claims", "observation", "operator"],
      ["expected"],
    );
    return {
      key: key(row.key, `${itemLabel}.key`),
      claims: strings(row.claims, `${itemLabel}.claims`),
      observation: string(row.observation, `${itemLabel}.observation`),
      operator: literal(
        row.operator,
        [
          "equals",
          "not_equals",
          "contains",
          "not_contains",
          "matches",
          "not_matches",
          "greater_than",
          "greater_or_equal",
          "less_than",
          "less_or_equal",
          "truthy",
          "falsy",
          "exists",
          "not_exists",
          "set_equals",
          "subset_of",
          "superset_of",
        ] as const satisfies readonly AssertionOperator[],
        `${itemLabel}.operator`,
      ),
      ...(Object.hasOwn(row, "expected") ? { expected: row.expected } : {}),
    };
  });
}
