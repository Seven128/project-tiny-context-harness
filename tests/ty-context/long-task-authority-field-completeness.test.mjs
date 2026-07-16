import assert from "node:assert/strict";
import test from "node:test";
import { AUTHORITY_FIELD_POLICY_REGISTRIES } from "../../packages/ty-context/dist/lib/long-task-authority-policy.js";
import { deliveryContract } from "./long-task-delivery-fixtures.mjs";

test("every Delivery Contract authority structure has a complete field policy registry", () => {
  const contract = deliveryContract();
  const outcome = contract.outcomes[0];
  const check = outcome.acceptance.checks[0];
  const runtimeShapes = {
    task: contract.task,
    source_claim: contract.source_claims[0],
    risk: contract.risk,
    global_product: contract.global.product,
    global_technical: contract.global.technical,
    global_acceptance: contract.global.acceptance,
    outcome,
    outcome_product: outcome.product,
    owner: outcome.product.owner,
    requirement: outcome.product.requirements[0],
    control: {
      key: "control",
      location: "main",
      trigger: "click",
      input: "value",
      loading_state: "loading",
      empty_state: "empty",
      success_state: "success",
      failure_state: "failure",
      feedback: "feedback",
    },
    outcome_technical: outcome.technical,
    obligation: outcome.technical.obligations[0],
    binding: {
      ...outcome.technical.bindings[0],
      verification_check_key:
        outcome.technical.bindings[0].verification_check_key,
    },
    rollback: {
      rollback: "rollback",
      recovery: "recover",
      verification_check_keys: [check.key],
    },
    outcome_acceptance: outcome.acceptance,
    check,
    assertion: check.positive_assertions[0],
    runner: check.runner,
    population: {
      check_key: check.key,
      claims: ["result"],
      observations: {
        eligible_ids: "eligible",
        observed_ids: "observed",
        excluded_items: "excluded",
      },
      exclusion_rules: [],
    },
    counterfactual: {
      key: "counterfactual",
      claims: ["result"],
      check_key: check.key,
      mutation: { type: "remove_paths", paths: ["src/state.json"] },
      expected_assertion_failures: ["first-result"],
    },
  };
  assert.deepEqual(
    Object.keys(AUTHORITY_FIELD_POLICY_REGISTRIES).sort(),
    Object.keys(runtimeShapes).sort(),
  );
  for (const [key, shape] of Object.entries(runtimeShapes))
    assert.deepEqual(
      Object.keys(AUTHORITY_FIELD_POLICY_REGISTRIES[key]).sort(),
      Object.keys(shape).sort(),
      `${key} has an unclassified or stale authority field`,
    );
});
