import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import test from "node:test";
import YAML from "yaml";
import { compileDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-delivery-compiler.js";
import { parseDeliveryContractText } from "../../packages/ty-context/dist/lib/long-task-delivery-parser.js";
import {
  createDeliveryFixture,
  deliveryContract,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";

test("Requirement Claims require coverage on an allowed proof surface", () => {
  const uncovered = deliveryContract();
  uncovered.outcomes[0].acceptance.checks[0].positive_assertions[0].claims =
    ["result", "obligation.implement-first"];
  assert.throws(
    () => parse(uncovered),
    /product_claim_uncovered:first\.requirement\.observe-first/u,
  );

  const wrongSurface = deliveryContract();
  wrongSurface.outcomes[0].product.requirements[0].required_proof_surfaces = [
    "ui_browser",
  ];
  assert.throws(
    () => parse(wrongSurface),
    /requirement_proof_surface_mismatch:first:requirement\.observe-first:runtime_behavior/u,
  );
});

test("Control location is an independent ui_browser Claim", () => {
  const uncovered = deliveryContract();
  uncovered.outcomes[0].product.controls.push({
    key: "submit",
    location: "settings footer",
    trigger: "",
    input: "",
    loading_state: "",
    empty_state: "",
    success_state: "",
    failure_state: "",
    feedback: "",
  });
  assert.throws(
    () => parse(uncovered),
    /product_claim_uncovered:first\.control\.submit\.location/u,
  );

  const covered = deliveryContract();
  covered.outcomes[0].product.controls.push({
    key: "submit",
    location: "settings footer",
    trigger: "click",
    input: "",
    loading_state: "",
    empty_state: "",
    success_state: "",
    failure_state: "",
    feedback: "",
  });
  const uiCheck = structuredClone(covered.outcomes[0].acceptance.checks[0]);
  uiCheck.key = "submit-ui";
  uiCheck.proof_surface = "ui_browser";
  uiCheck.positive_assertions = [
    {
      key: "submit-location",
      criterion: "Submit is in the settings footer.",
      claims: ["control.submit.location", "control.submit.trigger"],
      observation: "submit-location",
      operator: "equals",
      expected: true,
    },
  ];
  covered.outcomes[0].acceptance.checks.push(uiCheck);
  assert.doesNotThrow(() => parse(covered));
});

test("Source items map to Requirements or named Acceptance Assertions, never Outcome Result", () => {
  const requirement = deliveryContract();
  assert.doesNotThrow(() => parse(requirement));

  const result = deliveryContract();
  result.source_claims[0].disposition.refs = ["first.result"];
  assert.throws(
    () => parse(result),
    /source_claim_result_overcompression:first-observable:first\.result/u,
  );

  const acceptance = deliveryContract();
  acceptance.source_claims[0].disposition = {
    type: "acceptance",
    refs: ["first.first-check.first-result"],
  };
  assert.doesNotThrow(() => parse(acceptance));

  const missingAcceptance = deliveryContract();
  missingAcceptance.source_claims[0].disposition = {
    type: "acceptance",
    refs: ["first.first-check.missing-ac"],
  };
  assert.throws(
    () => parse(missingAcceptance),
    /source_claim_acceptance_ref_unknown/u,
  );

  const crossOutcome = deliveryContract({ twoOutcomes: true });
  crossOutcome.source_claims[0].disposition = {
    type: "acceptance",
    refs: ["first.second-check.second-result"],
  };
  assert.throws(
    () => parse(crossOutcome),
    /source_claim_acceptance_ref_unknown/u,
  );
});

test("Source external-confirmation refs must resolve", () => {
  const contract = deliveryContract();
  contract.global.acceptance.external_confirmations.push({
    key: "human-review",
    description: "A human reviews the result.",
    owner: "maintainer",
  });
  contract.source_claims[0].disposition = {
    type: "external_confirmation",
    refs: ["human-review"],
  };
  assert.doesNotThrow(() => parse(contract));

  contract.source_claims[0].disposition.refs = ["missing-review"];
  assert.throws(
    () => parse(contract),
    /source_claim_external_confirmation_ref_unknown/u,
  );
});

test("one Check cannot duplicate an Observation or use playwright.passed for fine-grained Claims", () => {
  const duplicate = deliveryContract();
  const check = duplicate.outcomes[0].acceptance.checks[0];
  check.positive_assertions.push({
    key: "duplicate-observation",
    criterion: "A second assertion reuses the same broad observation.",
    claims: ["result"],
    observation: check.positive_assertions[0].observation,
    operator: "equals",
    expected: true,
  });
  assert.throws(
    () => parse(duplicate),
    /assertion_observation_duplicate:first:first-check/u,
  );

  const broad = deliveryContract();
  broad.outcomes[0].acceptance.checks[0].runner.type = "playwright_test";
  broad.outcomes[0].acceptance.checks[0].runner.target = "tests/ui.spec.ts";
  broad.outcomes[0].acceptance.checks[0].proof_surface = "runtime_behavior";
  broad.outcomes[0].acceptance.checks[0].positive_assertions[0].observation =
    "playwright.passed";
  assert.throws(
    () => parse(broad),
    /fine_grained_claim_requires_ac_observation:first:requirement\.observe-first/u,
  );
});

test("Compile validates real Source anchors and blocks decisions", async () => {
  const fixture = await createDeliveryFixture();
  try {
    fixture.contract.source_claims[0].source_ref = "source.md#missing-anchor";
    await writeContract(fixture.workdir, fixture.contract);
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
      /source_claim_anchor_not_found:first-observable:source\.md#missing-anchor/u,
    );

    fixture.contract.source_claims[0] = {
      key: "first-observable",
      source_ref: "source.md#fixture-source",
      statement: "The first outcome needs a decision.",
      disposition: {
        type: "decision_required",
        reason: "Choose the final product behavior.",
      },
    };
    await writeContract(fixture.workdir, fixture.contract);
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
      /source_claim_decision_required:first-observable/u,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

function parse(contract) {
  return parseDeliveryContractText(YAML.stringify(contract));
}
