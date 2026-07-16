import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import test from "node:test";
import YAML from "yaml";
import { compileDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-delivery-compiler.js";
import { parseDeliveryContractText } from "../../packages/ty-context/dist/lib/long-task-delivery-parser.js";
import {
  classifyLongTaskRisk,
  validateRiskProof,
} from "../../packages/ty-context/dist/lib/long-task-risk.js";
import {
  createDeliveryFixture,
  deliveryContract,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";

test("Long Task Source authority is mandatory even when both Source arrays are empty", () => {
  const contract = deliveryContract();
  contract.task.source_paths = [];
  contract.source_claims = [];
  assert.throws(() => parse(contract), /source_authority_required/u);
});

test("out_of_scope cannot resolve a Material Source Item", () => {
  const contract = deliveryContract();
  contract.source_claims[0].disposition = {
    type: "out_of_scope",
    reason: "The executing Agent chooses not to implement it.",
  };
  assert.throws(
    () => parse(contract),
    /out_of_scope_requires_non_goal_or_decision:first-observable/u,
  );
});

test("Source acceptance cannot indirectly compress into a result-only Assertion", () => {
  const contract = deliveryContract();
  contract.source_claims[0].disposition = {
    type: "acceptance",
    refs: ["first.first-check.first-result"],
  };
  contract.outcomes[0].acceptance.checks[0].positive_assertions[0].claims = [
    "result",
  ];
  contract.outcomes[0].acceptance.checks[0].positive_assertions[0].criterion =
    "The first outcome must be observable.";
  assert.throws(
    () => parse(contract),
    /source_claim_acceptance_result_only:first-observable:first\.first-check\.first-result/u,
  );
});

test("Runner-derived Evidence Adapter rejects Browser Proof spoofing", () => {
  for (const runnerType of ["node_oracle", "package_script"]) {
    const contract = deliveryContract();
    const check = contract.outcomes[0].acceptance.checks[0];
    check.proof_surface = "ui_browser";
    check.runner.type = runnerType;
    if (runnerType === "package_script") check.runner.target = "oracle";
    assert.throws(
      () => parse(contract),
      /evidence_adapter_mismatch:first:first-check:ui_browser:structured_json_v2/u,
      runnerType,
    );
  }
});

test("Claim-bearing Playwright Assertions use only AC passed equals true", () => {
  const contract = deliveryContract();
  const check = contract.outcomes[0].acceptance.checks[0];
  check.runner.type = "playwright_test";
  check.runner.target = "tests/ui.spec.ts";
  check.proof_surface = "ui_browser";
  check.positive_assertions[0] = {
    ...check.positive_assertions[0],
    observation: "playwright.case.first-result.skipped",
    operator: "equals",
    expected: false,
  };
  assert.throws(
    () => parse(contract),
    /playwright_claim_assertion_invalid:first:first-check:first-result/u,
  );
});

test("required_proof_surfaces uses all-of coverage", () => {
  const contract = deliveryContract();
  contract.outcomes[0].product.requirements[0].required_proof_surfaces = [
    "runtime_behavior",
    "data_state",
  ];
  assert.throws(
    () => parse(contract),
    /product_claim_required_surfaces_missing:first:requirement\.observe-first:data_state/u,
  );
});

test("required_proof_surfaces passes only when every layer has a compatible proof", () => {
  const contract = deliveryContract();
  const outcome = contract.outcomes[0];
  outcome.product.requirements[0].required_proof_surfaces = [
    "ui_browser",
    "data_state",
  ];
  outcome.technical.obligations = [];
  const browserCheck = outcome.acceptance.checks[0];
  browserCheck.proof_surface = "ui_browser";
  browserCheck.runner.type = "playwright_test";
  browserCheck.runner.target = "tests/ui.spec.ts";
  browserCheck.positive_assertions = [
    {
      key: "browser-layer",
      criterion: "The browser layer proves the atomic requirement.",
      claims: ["requirement.observe-first"],
      observation: "playwright.case.browser-layer.passed",
      operator: "equals",
      expected: true,
    },
  ];
  const dataCheck = structuredClone(browserCheck);
  dataCheck.key = "data-layer";
  dataCheck.proof_surface = "data_state";
  dataCheck.runner.type = "node_oracle";
  dataCheck.runner.target = "tests/oracle.mjs";
  dataCheck.positive_assertions = [
    {
      key: "data-layer",
      criterion: "The data layer proves the atomic requirement.",
      claims: ["result", "requirement.observe-first"],
      observation: "result",
      operator: "equals",
      expected: true,
    },
  ];
  outcome.acceptance.checks.push(dataCheck);
  assert.doesNotThrow(() => parse(contract));
});

test("every Outcome has at least one non-result atomic Claim", () => {
  const contract = deliveryContract();
  const outcome = contract.outcomes[0];
  outcome.product.requirements = [];
  outcome.technical.obligations = [];
  outcome.acceptance.checks[0].positive_assertions[0].claims = ["result"];
  assert.throws(
    () => parse(contract),
    /outcome_atomic_claim_required:first/u,
  );
});

test("Claim-bearing Product Assertions cannot use unary operators", () => {
  const contract = deliveryContract();
  const assertion =
    contract.outcomes[0].acceptance.checks[0].positive_assertions[0];
  assertion.operator = "truthy";
  delete assertion.expected;
  assert.throws(
    () => parse(contract),
    /claim_assertion_explicit_expected_required:first:first-check:first-result/u,
  );
});

test("custom structured Result proof requires a bounded sensitivity control when no alternative proof exists", () => {
  const contract = deliveryContract();
  contract.outcomes[0].acceptance.checks[0].artifact_globs = [];
  assert.throws(
    () => validateRiskProof(contract, classifyLongTaskRisk(contract)),
    /weak_evidence_sensitivity_required:first/u,
  );
});

test("explicit weak_observability always requires a bounded sensitivity control", () => {
  const contract = deliveryContract();
  contract.risk.facts.weak_observability = ["first"];
  assert.throws(
    () => validateRiskProof(contract, classifyLongTaskRisk(contract)),
    /weak_evidence_sensitivity_required:first/u,
  );
});

test("one Raw Execution Observation cannot be copied across Checks", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const first = fixture.contract.outcomes[0].acceptance.checks[0];
    const second = structuredClone(first);
    second.key = "copied-proof";
    second.positive_assertions = [
      {
        ...structuredClone(first.positive_assertions[0]),
        key: "copied-result",
      },
    ];
    fixture.contract.outcomes[0].acceptance.checks.push(second);
    await writeContract(fixture.workdir, fixture.contract);
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
      /raw_execution_observation_reused:/u,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Compile enforces criterion even when Authoring Preflight is skipped", async () => {
  const fixture = await createDeliveryFixture();
  try {
    delete fixture.contract.outcomes[0].acceptance.checks[0]
      .positive_assertions[0].criterion;
    await writeContract(fixture.workdir, fixture.contract);
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
      /assertion_criterion_required:first\.first-check\.first-result/u,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

function parse(contract) {
  return parseDeliveryContractText(YAML.stringify(contract));
}
