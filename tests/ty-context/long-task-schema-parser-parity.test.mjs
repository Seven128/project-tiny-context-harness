import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { preflightDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-authoring-preflight.js";
import { compileDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-delivery-compiler.js";
import { parseDeliveryContractText } from "../../packages/ty-context/dist/lib/long-task-delivery-parser.js";
import {
  createDeliveryFixture,
  deliveryContract,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";

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
      criterion: "The retired legacy behavior remains absent.",
      claims: ["non_goal.no-legacy"],
      observation: "negative",
      evidence_capabilities: ["state_delta"],
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
    evidence_capabilities: ["presence"],
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
    evidence_capabilities: ["state_delta"],
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

test("Source authority cardinality and retired dispositions stay aligned across Schema and Parser", async () => {
  const schema = await deliverySchema();
  assert.equal(
    schema.properties.task.properties.source_paths.minItems,
    1,
  );
  assert.equal(schema.properties.source_claims.minItems, 1);
  assert.equal(
    Object.hasOwn(schema.properties.source_claims, "default"),
    false,
  );
  const acceptance = schema.$defs.sourceClaim.properties.disposition.oneOf.find(
    (candidate) => candidate.properties.type.const === "acceptance",
  );
  assert.equal(acceptance.properties.refs.minItems, 1);
  assert.equal(acceptance.properties.refs.maxItems, 1);
  assert.equal(JSON.stringify(schema).includes("out_of_scope"), false);

  const multipleAcceptanceRefs = deliveryContract();
  multipleAcceptanceRefs.source_claims[0].disposition = {
    type: "acceptance",
    refs: ["first.first-check.first-result", "first.first-check.other"],
  };
  assert.throws(
    () =>
      parseDeliveryContractText(YAML.stringify(multipleAcceptanceRefs)),
    /source_claim_acceptance_ref_count/u,
  );
});

test("Requirement and Obligation proof surfaces are non-empty and unique in both Schema and Parser", async () => {
  const schema = await deliverySchema();
  for (const definition of ["requirement", "obligation"]) {
    const surfaces =
      schema.$defs[definition].properties.required_proof_surfaces;
    assert.equal(surfaces.minItems, 1, `${definition} minItems`);
    assert.equal(surfaces.uniqueItems, true, `${definition} uniqueItems`);
  }

  for (const [name, select] of [
    ["Requirement", (contract) => contract.outcomes[0].product.requirements[0]],
    ["Obligation", (contract) => contract.outcomes[0].technical.obligations[0]],
  ]) {
    const empty = deliveryContract();
    select(empty).required_proof_surfaces = [];
    assert.throws(
      () => parseDeliveryContractText(YAML.stringify(empty)),
      /required_proof_surfaces_empty/u,
      `${name} empty`,
    );

    const duplicate = deliveryContract();
    select(duplicate).required_proof_surfaces = [
      "runtime_behavior",
      "runtime_behavior",
    ];
    assert.throws(
      () => parseDeliveryContractText(YAML.stringify(duplicate)),
      /required_proof_surface_duplicate/u,
      `${name} duplicate`,
    );
  }
});

test("Preflight and direct Compile reject the same operator and proof-surface safety errors", async () => {
  const scenarios = [
    {
      code: "claim_assertion_explicit_expected_required",
      mutate(contract) {
        const assertion =
          contract.outcomes[0].acceptance.checks[0]
            .positive_assertions[0];
        assertion.operator = "truthy";
        delete assertion.expected;
      },
    },
    ...[
      ["Requirement", (contract) => contract.outcomes[0].product.requirements[0]],
      ["Obligation", (contract) => contract.outcomes[0].technical.obligations[0]],
    ].flatMap(([name, select]) => [
      {
        code: "required_proof_surfaces_empty",
        name: `${name} empty`,
        mutate(contract) {
          select(contract).required_proof_surfaces = [];
        },
      },
      {
        code: "required_proof_surface_duplicate",
        name: `${name} duplicate`,
        mutate(contract) {
          select(contract).required_proof_surfaces = [
            "runtime_behavior",
            "runtime_behavior",
          ];
        },
      },
    ]),
  ];
  for (const scenario of scenarios) {
    const fixture = await createDeliveryFixture();
    try {
      scenario.mutate(fixture.contract);
      await writeContract(fixture.workdir, fixture.contract);
      const preflight = await preflightDeliveryContract(
        fixture.workdir,
        fixture.root,
      );
      assert.equal(preflight.status, "not_ready", scenario.name);
      assert.ok(
        preflight.diagnostics.some((item) => item.code === scenario.code),
        `${scenario.name ?? scenario.code}: missing ${scenario.code}`,
      );
      await assert.rejects(
        compileDeliveryContract(fixture.workdir, fixture.root, {
          require_completion_gate: false,
        }),
        new RegExp(scenario.code, "u"),
        scenario.name,
      );
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  }
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
