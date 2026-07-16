import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { evaluateDeliveryAssertion } from "../../packages/ty-context/dist/lib/long-task-assertions-v2.js";
import { parseDeliveryContractText } from "../../packages/ty-context/dist/lib/long-task-delivery-parser.js";
import { evaluateCheckEvidence } from "../../packages/ty-context/dist/lib/long-task-evidence-v2.js";
import { deliveryContract } from "./long-task-delivery-fixtures.mjs";

const binaryOperators = [
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
  "set_equals",
  "subset_of",
  "superset_of",
];
const presenceOrUnaryOperators = [
  "exists",
  "not_exists",
  "truthy",
  "falsy",
];

test("all Assertion operators fail closed for missing Observations except not_exists", () => {
  for (const operator of [
    ...presenceOrUnaryOperators,
    ...binaryOperators,
  ]) {
    const assertion = {
      key: "safety",
      claims: ["result"],
      observation: "missing.value",
      operator,
      ...(binaryOperators.includes(operator) ? { expected: expected(operator) } : {}),
    };
    assert.equal(
      evaluateDeliveryAssertion(assertion, {}),
      operator === "not_exists",
      operator,
    );
  }
});

test("Parser and JSON Schema require expected only for binary Assertions", async () => {
  for (const operator of binaryOperators) {
    const contract = contractWithAssertion(operator);
    delete contract.outcomes[0].acceptance.checks[0].positive_assertions[0]
      .expected;
    assert.throws(
      () => parseDeliveryContractText(YAML.stringify(contract)),
      /assertion_expected_required/u,
      operator,
    );
  }
  for (const operator of presenceOrUnaryOperators) {
    const contract = contractWithAssertion(operator);
    contract.outcomes[0].acceptance.checks[0].positive_assertions[0].expected =
      true;
    assert.throws(
      () => parseDeliveryContractText(YAML.stringify(contract)),
      /assertion_expected_forbidden/u,
      operator,
    );
  }
  for (const operator of [...presenceOrUnaryOperators, ...binaryOperators])
    assert.doesNotThrow(
      () =>
        parseDeliveryContractText(
          YAML.stringify(contractWithAssertion(operator)),
        ),
      operator,
    );

  const repo = fileURLToPath(new URL("../..", import.meta.url));
  const schema = JSON.parse(
    await readFile(
      path.join(
        repo,
        "packages/ty-context/src/schemas/long-task-delivery-v2/long-task-delivery-v2.schema.json",
      ),
      "utf8",
    ),
  );
  assert.equal(schema.$defs.assertion.allOf.length, 2);
  assert.deepEqual(
    schema.$defs.assertion.allOf[1].then.not.required,
    ["expected"],
  );
});

test("missing Observation produces assertion_failed without Claim proof", async () => {
  const check = {
    internal_id: "CHECK.safety.missing",
    outcome_key: "safety",
    key: "missing",
    proof_surface: "runtime_behavior",
    runner: {
      type: "node_oracle",
      target: "tests/missing.mjs",
      argv: [],
      cwd: ".",
      timeout_ms: 1000,
      effect: "read_only",
      retry_policy: "none",
      idempotent: true,
      executable: process.execPath,
      executable_argv_prefix: [],
      resolved_cwd: "",
      resolved_target: "tests/missing.mjs",
      definition_sha256: "missing",
      frozen_files: {},
      package_script: null,
      execution_identity: "missing",
    },
    verification_input_hashes: {},
    input_paths: [],
    expected_output_paths: [],
    artifact_globs: [],
    positive_assertions: [
      {
        key: "missing-result",
        claims: ["OUT.safety.result"],
        observation: "missing",
        operator: "equals",
        expected: true,
      },
    ],
    negative_assertions: [],
    environment_requirements: [],
  };
  const result = await evaluateCheckEvidence(
    check,
    {
      execution_identity: "missing",
      execution_status: "completed",
      exit_code: 0,
      observations: {},
      stdout_sha256: "stdout",
      stderr_sha256: "stderr",
      attempts: 1,
      duration_ms: 1,
      error: null,
    },
    path.resolve("."),
  );
  assert.equal(result.status, "assertion_failed");
  assert.deepEqual(result.claim_proofs, []);
  assert.deepEqual(
    result.findings.map((finding) => finding.code),
    ["assertion_failed"],
  );
});

function contractWithAssertion(operator) {
  const contract = deliveryContract();
  contract.outcomes[0].acceptance.checks[0].positive_assertions = [
    {
      key: "assertion",
      claims: ["result", "obligation.implement-first"],
      observation: "result",
      operator,
      ...(binaryOperators.includes(operator) ? { expected: expected(operator) } : {}),
    },
  ];
  return contract;
}

function expected(operator) {
  if (
    [
      "greater_than",
      "greater_or_equal",
      "less_than",
      "less_or_equal",
    ].includes(operator)
  )
    return 0;
  if (["set_equals", "subset_of", "superset_of"].includes(operator)) return [];
  if (["matches", "not_matches"].includes(operator)) return ".*";
  if (["contains", "not_contains"].includes(operator)) return "value";
  return true;
}
