import type {
  AssertionOperator,
  DeliveryAssertionV1,
  DeliveryCheckV1,
  DeliveryRunnerV1,
  ProofSurface,
  RunnerType,
} from "./long-task-delivery-types.js";
import {
  array,
  fail,
  key,
  literal,
  object,
  string,
  strings,
} from "./long-task-delivery-shape.js";

export function parseCheck(value: unknown, label: string): DeliveryCheckV1 {
  const row = object(
    value,
    label,
    [
      "key",
      "proof_surface",
      "runner",
      "input_paths",
      "artifact_globs",
      "positive_assertions",
      "negative_assertions",
      "environment_requirements",
    ],
    ["verification_sources", "expected_output_paths"],
  );
  return {
    key: key(row.key, `${label}.key`),
    proof_surface: literal(
      row.proof_surface,
      [
        "ui_browser",
        "runtime_behavior",
        "api_contract",
        "data_state",
        "security_boundary",
        "population_coverage",
        "implementation_structure",
      ] as const satisfies readonly ProofSurface[],
      `${label}.proof_surface`,
    ),
    runner: parseRunner(row.runner, `${label}.runner`),
    verification_sources: Object.hasOwn(row, "verification_sources")
      ? strings(row.verification_sources, `${label}.verification_sources`)
      : [],
    input_paths: strings(row.input_paths, `${label}.input_paths`),
    expected_output_paths: Object.hasOwn(row, "expected_output_paths")
      ? strings(row.expected_output_paths, `${label}.expected_output_paths`)
      : [],
    artifact_globs: strings(row.artifact_globs, `${label}.artifact_globs`),
    positive_assertions: parseAssertions(
      row.positive_assertions,
      `${label}.positive_assertions`,
    ),
    negative_assertions: parseAssertions(
      row.negative_assertions,
      `${label}.negative_assertions`,
    ),
    environment_requirements: strings(
      row.environment_requirements,
      `${label}.environment_requirements`,
    ),
  };
}

function parseRunner(value: unknown, label: string): DeliveryRunnerV1 {
  const row = object(
    value,
    label,
    ["type", "target", "argv", "cwd", "timeout_ms", "network_policy"],
    ["effect", "retry_policy", "idempotent"],
  );
  const network = object(row.network_policy, `${label}.network_policy`, [
    "mode",
    "allowed_hosts",
  ]);
  const timeout = row.timeout_ms;
  if (
    !Number.isInteger(timeout) ||
    Number(timeout) < 100 ||
    Number(timeout) > 3_600_000
  )
    fail(`${label}.timeout_ms`, "must be an integer from 100 to 3600000");
  const mode = literal(
    network.mode,
    ["none", "loopback", "declared_hosts"] as const,
    `${label}.network_policy.mode`,
  );
  const allowedHosts = strings(
    network.allowed_hosts,
    `${label}.network_policy.allowed_hosts`,
  );
  if (mode !== "declared_hosts" && allowedHosts.length)
    fail(
      `${label}.network_policy.allowed_hosts`,
      "must be empty for this mode",
    );
  if (mode === "declared_hosts" && !allowedHosts.length)
    fail(
      `${label}.network_policy.allowed_hosts`,
      "must declare at least one host for this mode",
    );
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
    timeout_ms: Number(timeout),
    network_policy: { mode, allowed_hosts: allowedHosts },
    effect: Object.hasOwn(row, "effect")
      ? literal(
          row.effect,
          ["read_only", "test_sandbox"] as const,
          `${label}.effect`,
        )
      : "read_only",
    retry_policy: Object.hasOwn(row, "retry_policy")
      ? literal(
          row.retry_policy,
          ["none", "transient_once"] as const,
          `${label}.retry_policy`,
        )
      : "none",
    idempotent: Object.hasOwn(row, "idempotent")
      ? (() => {
          if (typeof row.idempotent !== "boolean")
            fail(`${label}.idempotent`, "must be a boolean");
          return row.idempotent;
        })()
      : false,
  };
}

function parseAssertions(value: unknown, label: string): DeliveryAssertionV1[] {
  return array(value, label).map((item, index) => {
    const row = object(
      item,
      `${label}[${index}]`,
      ["observation", "operator"],
      ["expected"],
    );
    return {
      observation: string(row.observation, `${label}[${index}].observation`),
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
        `${label}[${index}].operator`,
      ),
      ...(Object.hasOwn(row, "expected") ? { expected: row.expected } : {}),
    };
  });
}
