import test from "node:test";
import assert from "node:assert/strict";
import { buildModelCatalog } from "../../packages/ty-context/dist/lib/codex-model-catalog.js";
import {
  EFFORT_ORDER,
  effortRank,
  routeCodexModel,
} from "../../packages/ty-context/dist/lib/codex-model-router.js";
import {
  MODEL_ROUTING_POLICY,
  MODEL_ROUTING_POLICY_SHA256,
  loadCodexModelRoutingPolicyV1,
} from "../../packages/ty-context/dist/lib/codex-model-routing-policy.js";

test("routing_policy_preserves_current_semantics", () => {
  assert.deepEqual(EFFORT_ORDER, [
    "none",
    "low",
    "medium",
    "high",
    "xhigh",
    "max",
  ]);
  assert.deepEqual(EFFORT_ORDER.map(effortRank), [0, 1, 2, 3, 4, 5]);
  const catalog = buildModelCatalog([
    model("gpt-5.6-sol", ["low", "medium", "high", "xhigh", "max"]),
    model("gpt-5.6-terra", ["medium", "xhigh"]),
    model("gpt-5.6-luna", ["medium", "max"]),
  ]);
  assert.deepEqual(
    routeCodexModel({ model: "gpt-5.6-sol", effort: "xhigh" }, catalog)
      .execution_profile,
    { model: "gpt-5.6-sol", effort: "medium" },
  );
  const frozen = routeCodexModel(
    { model: "gpt-5.6-sol", effort: "xhigh" },
    catalog,
  );
  assert.equal(frozen.policy_id, "sol-xhigh-execution-medium");
  assert.equal(frozen.policy_sha256, MODEL_ROUTING_POLICY_SHA256);
  assert.equal(frozen.catalog_sha256, catalog.sha256);
  assert.match(frozen.decision_sha256, /^[a-f0-9]{64}$/u);
  assert.equal(
    routeCodexModel({ model: "gpt-5.6-sol", effort: "max" }, catalog).reason,
    "sol_max_to_medium",
  );
  for (const profile of [
    { model: "gpt-5.6-sol", effort: "high" },
    { model: "gpt-5.6-terra", effort: "xhigh" },
    { model: "gpt-5.6-luna", effort: "max" },
  ])
    assert.deepEqual(
      routeCodexModel(profile, catalog).execution_profile,
      profile,
    );
  assert.equal(
    routeCodexModel({ model: "unknown-model", effort: "xhigh" }, catalog)
      .reason,
    "unknown_profile_passthrough",
  );
});

test("versioned model policy and catalog bounds are enforced", () => {
  assert.equal(
    MODEL_ROUTING_POLICY.schema_version,
    "model-routing-policy-v1",
  );
  assert.equal(MODEL_ROUTING_POLICY.default, "passthrough");
  assert.equal(MODEL_ROUTING_POLICY.rules[0].minimum_effort, "xhigh");
  assert.equal(MODEL_ROUTING_POLICY.rules[0].execution.effort, "medium");
  assert.throws(
    () =>
      buildModelCatalog(
        Array.from(
          { length: MODEL_ROUTING_POLICY.catalog_limits.max_models + 1 },
          (_, index) => model(`model-${index}`, ["medium"]),
        ),
      ),
    /model_limit/u,
  );
});

test("alias, target availability, and explicit catalog successor are evidence bounded", () => {
  const successor = buildModelCatalog([
    model("gpt-5.6-sol", ["medium", "xhigh"], "gpt-6-orion"),
    model("gpt-6-orion", ["xhigh"]),
  ]);
  assert.equal(
    routeCodexModel({ model: "gpt-5.6", effort: "xhigh" }, successor).reason,
    "sol_xhigh_to_medium",
  );
  assert.equal(
    routeCodexModel({ model: "gpt-6-orion", effort: "xhigh" }, successor)
      .reason,
    "catalog_upgrade_to_sol_medium",
  );
  const unavailable = buildModelCatalog([
    model("gpt-5.6-sol", ["high", "xhigh"]),
  ]);
  const decision = routeCodexModel(
    { model: "gpt-5.6-sol", effort: "xhigh" },
    unavailable,
  );
  assert.equal(decision.reason, "target_unavailable_passthrough");
  assert.equal(decision.switched, false);
});

test("invalid_policy_falls_back_to_passthrough", () => {
  const loaded = loadCodexModelRoutingPolicyV1(
    "schema_version: model-routing-policy-v1\npolicy_id: broken\ndefault: guess\n",
  );
  assert.equal(loaded.status, "fallback");
  assert.equal(loaded.policy.policy_id, "safe-passthrough-fallback");
  const catalog = buildModelCatalog([
    model("gpt-5.6-sol", ["medium", "xhigh"]),
  ]);
  const controller = { model: "gpt-5.6-sol", effort: "xhigh" };
  const decision = routeCodexModel(
    controller,
    catalog,
    loaded.policy,
    loaded.sha256,
  );
  assert.deepEqual(decision.execution_profile, controller);
  assert.equal(decision.switched, false);
  assert.equal(decision.reason, "policy_unavailable_passthrough");
  assert.equal(decision.policy_sha256, loaded.sha256);
});

function model(name, efforts, upgrade = null) {
  return {
    id: name,
    model: name,
    upgrade,
    upgradeInfo: upgrade ? { model: upgrade } : null,
    hidden: false,
    supportedReasoningEfforts: efforts.map((reasoningEffort) => ({
      reasoningEffort,
    })),
    defaultReasoningEffort: "medium",
  };
}
