import assert from "node:assert/strict";
import test from "node:test";
import YAML from "yaml";
import { parseDeliveryContractText } from "../../packages/ty-context/dist/lib/long-task-delivery-parser.js";
import { deliveryContract } from "./long-task-delivery-fixtures.mjs";

function parse(contract) {
  return parseDeliveryContractText(YAML.stringify(contract));
}

test("result, Control states, non-completing, obligation and shortcut Claims require coverage", () => {
  const contract = deliveryContract();
  const outcome = contract.outcomes[0];
  outcome.product.controls.push({
    key: "submit",
    location: "footer",
    trigger: "click",
    input: "content",
    loading_state: "loading",
    empty_state: "disabled",
    success_state: "done",
    failure_state: "error",
    feedback: "visible",
  });
  assert.throws(() => parse(contract), /product_claim_uncovered/);
});

test("unknown and cross-Outcome Claim refs fail", () => {
  const unknown = deliveryContract();
  unknown.outcomes[0].acceptance.checks[0].positive_assertions[0].claims.push(
    "missing.claim",
  );
  assert.throws(() => parse(unknown), /assertion_claim_unknown/);
  const cross = deliveryContract({ twoOutcomes: true });
  cross.outcomes[0].acceptance.checks[0].positive_assertions[0].claims.push(
    "second.result",
  );
  assert.throws(() => parse(cross), /assertion_claim_cross_outcome/);
});

test("UI Claims require browser proof and obligation surfaces must match", () => {
  const ui = deliveryContract();
  const outcome = ui.outcomes[0];
  outcome.product.controls.push({
    key: "submit",
    location: "footer",
    trigger: "click",
    input: "",
    loading_state: "",
    empty_state: "",
    success_state: "",
    failure_state: "",
    feedback: "",
  });
  outcome.acceptance.checks[0].positive_assertions[0].claims.push(
    "control.submit.trigger",
  );
  assert.throws(() => parse(ui), /ui_claim_requires_ui_browser/);
  const obligation = deliveryContract();
  obligation.outcomes[0].technical.obligations[0].required_proof_surfaces = [
    "api_contract",
  ];
  assert.throws(() => parse(obligation), /obligation_proof_surface_mismatch/);
});

test("non-completing and forbidden shortcuts reject positive-only coverage", () => {
  for (const kind of ["non_completing", "forbidden_shortcut"]) {
    const contract = deliveryContract();
    const outcome = contract.outcomes[0];
    if (kind === "non_completing")
      outcome.product.non_completing_outcomes.push({
        key: "exit-zero-only",
        statement: "Exit zero alone is not completion.",
      });
    else
      outcome.technical.forbidden_shortcuts.push({
        key: "self-report",
        statement: "Self-report is not proof.",
      });
    outcome.acceptance.checks[0].positive_assertions[0].claims.push(
      `${kind}.` + (kind === "non_completing" ? "exit-zero-only" : "self-report"),
    );
    assert.throws(
      () => parse(contract),
      /negative_or_counterfactual_claim_proof_required/,
    );
  }
});

test("fully covered Claims parse successfully and Source Claims target generated ids", () => {
  const contract = deliveryContract();
  assert.doesNotThrow(() => parse(contract));
  contract.source_claims[0].disposition.refs = ["first.missing"];
  assert.throws(() => parse(contract), /source_claim_product_ref_unknown/);
});
