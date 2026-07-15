import test from "node:test";
import assert from "node:assert/strict";
import { routeCodexExecProfileV1 } from "../../packages/ty-context/dist/lib/composite-campaign-exec-policy.js";
import { loadCodexModelRoutingPolicyV1 } from "../../packages/ty-context/dist/lib/codex-model-routing-policy.js";

for (const [effort, reason] of [
  ["xhigh", "sol_xhigh_to_medium"],
  ["max", "sol_max_to_medium"],
  ["ultra", "sol_ultra_to_medium"],
])
  test(`gpt-5.6-sol ${effort} routes execution to medium`, () => {
    const decision = routeCodexExecProfileV1({ model: "gpt-5.6-sol", effort });
    assert.deepEqual(decision.authoring_profile, { model: "gpt-5.6-sol", effort });
    assert.deepEqual(decision.execution_profile, {
      model: "gpt-5.6-sol",
      effort: "medium",
    });
    assert.equal(decision.reason, reason);
  });

test("high, non-Sol, unknown, and invalid policy are passthrough", () => {
  for (const profile of [
    { model: "gpt-5.6-sol", effort: "high" },
    { model: "gpt-5.5", effort: "ultra" },
    { model: "future-model", effort: "future-effort" },
  ]) {
    const decision = routeCodexExecProfileV1(profile);
    assert.deepEqual(decision.execution_profile, profile);
    assert.equal(decision.switched, false);
  }
  const invalid = loadCodexModelRoutingPolicyV1("rules: [invalid]");
  assert.equal(invalid.status, "fallback");
  const controller = { model: "gpt-5.6-sol", effort: "ultra" };
  const decision = routeCodexExecProfileV1(controller, {
    policy: invalid.policy,
    policySha256: invalid.sha256,
    policyAvailable: false,
  });
  assert.deepEqual(decision.execution_profile, controller);
  assert.equal(decision.reason, "policy_unavailable_passthrough");
});

test("controller aliases route through the canonical family without changing authoring", () => {
  const decision = routeCodexExecProfileV1({
    model: "gpt-5.6",
    effort: "xhigh",
  });
  assert.deepEqual(decision.authoring_profile, {
    model: "gpt-5.6",
    effort: "xhigh",
  });
  assert.deepEqual(decision.execution_profile, {
    model: "gpt-5.6-sol",
    effort: "medium",
  });
  assert.equal(decision.reason, "sol_xhigh_to_medium");
});

test("policy loader enforces known minimum effort, rank, and exact reason keys", () => {
  for (const mutation of [
    "minimum_effort: future",
    "accepted_efforts: [high]",
    "accepted_efforts: [future]",
    "exact_reasons: { xhigh: sol_xhigh_to_medium, extra: sol_max_to_medium }",
  ]) {
    const loaded = loadCodexModelRoutingPolicyV1(policyFixture(mutation));
    assert.equal(loaded.status, "fallback", mutation);
  }
});

function policyFixture(mutation) {
  const values = {
    minimum_effort: "minimum_effort: xhigh",
    accepted_efforts: "accepted_efforts: [xhigh]",
    exact_reasons: "exact_reasons: { xhigh: sol_xhigh_to_medium }",
  };
  const key = mutation.split(":", 1)[0];
  values[key] = mutation;
  return `schema_version: model-routing-policy-v1
policy_id: fixture
catalog_limits: { max_models: 16, max_model_identifier_length: 64, max_efforts_per_model: 8 }
aliases: { gpt-5.6: gpt-5.6-sol }
rules:
  - controller_family: gpt-5.6-sol
    ${values.minimum_effort}
    ${values.accepted_efforts}
    successor_allowed: true
    execution: { model: gpt-5.6-sol, effort: medium }
    ${values.exact_reasons}
    successor_reason: catalog_upgrade_to_sol_medium
default: passthrough
`;
}
