import assert from "node:assert/strict";
import test from "node:test";
import { ACTIVE_AUTHORITY_TRANSITION_POLICY } from "../../packages/ty-context/dist/lib/long-task-authority-transition-policy.js";
import {
  CHECK_EXECUTION_INPUT_POLICY,
  computeRawExecutionIdentity,
  rawExecutionInputProjection,
} from "../../packages/ty-context/dist/lib/long-task-check-execution-policy.js";

test("every DeliveryCheck field has an explicit execution-input policy", () => {
  assert.deepEqual(Object.keys(CHECK_EXECUTION_INPUT_POLICY).sort(), [
    "artifact_globs",
    "environment_requirements",
    "expected_output_paths",
    "input_paths",
    "key",
    "negative_assertions",
    "positive_assertions",
    "proof_surface",
    "runner",
    "verification_inputs",
  ]);
  assert.deepEqual(
    Object.entries(CHECK_EXECUTION_INPUT_POLICY)
      .filter(([, policy]) => policy === "raw_execution")
      .map(([field]) => field)
      .sort(),
    ["environment_requirements", "runner"],
  );
  assert.equal(
    CHECK_EXECUTION_INPUT_POLICY.verification_inputs,
    "raw_execution_via_runner_freeze",
  );
});

test("all raw execution fields affect identity and per-check evidence does not", () => {
  const base = compiledCheck();
  const baseIdentity = computeRawExecutionIdentity(base);
  const runnerChanged = structuredClone(base);
  runnerChanged.runner.execution_identity = "runner-b";
  assert.notEqual(computeRawExecutionIdentity(runnerChanged), baseIdentity);

  const environmentChanged = structuredClone(base);
  environmentChanged.environment_requirements[0].target =
    "TY_CONTEXT_OTHER_ENV";
  assert.notEqual(
    computeRawExecutionIdentity(environmentChanged),
    baseIdentity,
  );

  for (const mutate of [
    (check) => check.artifact_globs.push("artifacts/**"),
    (check) =>
      check.positive_assertions.push({
        key: "extra",
        claims: ["result"],
        observation: "result",
        operator: "truthy",
      }),
    (check) => check.negative_assertions.push(check.positive_assertions[0]),
  ]) {
    const candidate = structuredClone(base);
    mutate(candidate);
    assert.equal(computeRawExecutionIdentity(candidate), baseIdentity);
  }
  assert.deepEqual(Object.keys(rawExecutionInputProjection(base)).sort(), [
    "environment_requirements",
    "evidence_adapter",
    "runner",
    "verification_inputs",
  ]);
});

test("the centralized Active Authority transition matrix stays complete", () => {
  assert.deepEqual(Object.keys(ACTIVE_AUTHORITY_TRANSITION_POLICY), [
    "compile_first",
    "compile_revise",
    "verify",
    "final_gate",
    "stop_accepted_clear",
    "close_accepted_clear",
    "abandon_valid",
    "abandon_corrupt",
    "legacy_migration",
    "verifier_migration",
  ]);
  for (const operation of [
    "compile_first",
    "compile_revise",
    "stop_accepted_clear",
    "close_accepted_clear",
    "abandon_valid",
    "abandon_corrupt",
    "legacy_migration",
    "verifier_migration",
  ])
    assert.equal(
      ACTIVE_AUTHORITY_TRANSITION_POLICY[operation].requires_lock,
      true,
      operation,
    );
  assert.equal(
    ACTIVE_AUTHORITY_TRANSITION_POLICY.verify.cas,
    "recheck_before_progress_write",
  );
  assert.equal(
    ACTIVE_AUTHORITY_TRANSITION_POLICY.final_gate.cas,
    "recheck_before_acceptance",
  );
});

function compiledCheck() {
  return {
    internal_id: "CHECK.first.test",
    outcome_key: "first",
    key: "test",
    proof_surface: "runtime_behavior",
    evidence_adapter: "structured_json_v2",
    runner: {
      type: "node_oracle",
      target: "tests/oracle.mjs",
      argv: [],
      cwd: ".",
      timeout_ms: 30000,
      effect: "read_only",
      retry_policy: "none",
      idempotent: true,
      executable: process.execPath,
      executable_argv_prefix: ["tests/oracle.mjs"],
      resolved_cwd: "",
      resolved_target: "tests/oracle.mjs",
      definition_sha256: "definition",
      frozen_files: { "tests/oracle.mjs": "hash" },
      package_script: null,
      execution_identity: "runner-a",
    },
    verification_inputs: ["tests/oracle.mjs"],
    verification_input_hashes: { "tests/oracle.mjs": "hash" },
    input_paths: ["src/**"],
    expected_output_paths: [],
    artifact_globs: [],
    positive_assertions: [
      {
        key: "result",
        claims: ["result"],
        observation: "result",
        operator: "equals",
        expected: true,
      },
    ],
    negative_assertions: [],
    environment_requirements: [
      {
        key: "env",
        kind: "env_var",
        target: "TY_CONTEXT_TEST_ENV",
      },
    ],
  };
}
