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
