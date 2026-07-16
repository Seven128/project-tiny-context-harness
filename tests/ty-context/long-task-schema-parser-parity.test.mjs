import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { parseDeliveryContractText } from "../../packages/ty-context/dist/lib/long-task-delivery-parser.js";
import { deliveryContract } from "./long-task-delivery-fixtures.mjs";

const activeOperators = [
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
  "set_equals",
  "subset_of",
  "superset_of",
];

test("negative-only Global Check and zero positive Assertions have Schema/Parser parity", async () => {
  const contract = deliveryContract();
  contract.global.product.non_goals.push({
    key: "no-legacy",
    statement: "Legacy fallback is forbidden.",
  });
  const check = structuredClone(
    contract.outcomes[0].acceptance.checks[0],
  );
  check.key = "negative-only";
  check.positive_assertions = [];
  check.negative_assertions = [
    {
      key: "legacy-absent",
      claims: ["non_goal.no-legacy"],
      observation: "negative",
      operator: "equals",
      expected: false,
    },
  ];
  contract.global.acceptance.checks.push(check);
  assert.doesNotThrow(() =>
    parseDeliveryContractText(YAML.stringify(contract)),
  );
  const schema = await deliverySchema();
  assert.equal(
    Object.hasOwn(schema.$defs.check.properties.positive_assertions, "minItems"),
    false,
  );
});

test("Assertion operator and expected rules stay aligned across Schema and Parser", async () => {
  const schema = await deliverySchema();
  assert.deepEqual(
    [...schema.$defs.assertion.properties.operator.enum].sort(),
    [...activeOperators].sort(),
  );
  assert.equal(
    schema.$defs.assertion.properties.operator.enum.includes("not_exists"),
    false,
  );

  const invalid = deliveryContract();
  invalid.outcomes[0].acceptance.checks[0].positive_assertions[0].operator =
    "invalid_operator";
  assert.throws(
    () => parseDeliveryContractText(YAML.stringify(invalid)),
    /operator.*must be one of/u,
  );

  const missingExpected = deliveryContract();
  delete missingExpected.outcomes[0].acceptance.checks[0]
    .positive_assertions[0].expected;
  assert.throws(
    () => parseDeliveryContractText(YAML.stringify(missingExpected)),
    /assertion_expected_required/u,
  );
  assert.ok(
    schema.$defs.assertion.allOf[0].then.required.includes("expected"),
  );

  const unaryExpected = deliveryContract();
  unaryExpected.outcomes[0].acceptance.checks[0].positive_assertions[0] = {
    key: "exists",
    claims: ["result", "obligation.implement-first"],
    observation: "result",
    operator: "exists",
    expected: true,
  };
  assert.throws(
    () => parseDeliveryContractText(YAML.stringify(unaryExpected)),
    /assertion_expected_forbidden/u,
  );
  assert.deepEqual(
    schema.$defs.assertion.allOf[1].then.not.required,
    ["expected"],
  );

  const invalidRegex = deliveryContract();
  invalidRegex.outcomes[0].acceptance.checks[0].positive_assertions[0] = {
    key: "regex",
    claims: ["result", "obligation.implement-first"],
    observation: "result",
    operator: "matches",
    expected: "[",
  };
  assert.throws(
    () => parseDeliveryContractText(YAML.stringify(invalidRegex)),
    /assertion_expected_invalid_regex/u,
  );
  assert.equal(
    schema.$defs.assertion.allOf[2].then.properties.expected.format,
    "regex",
  );
});

async function deliverySchema() {
  const repo = fileURLToPath(new URL("../..", import.meta.url));
  return JSON.parse(
    await readFile(
      path.join(
        repo,
        "packages/ty-context/src/schemas/long-task-delivery-v2/long-task-delivery-v2.schema.json",
      ),
      "utf8",
    ),
  );
}
