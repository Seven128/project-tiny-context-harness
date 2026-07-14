import test from "node:test";
import assert from "node:assert/strict";
import { access, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  canonicalJson,
  canonicalValueJson,
  canonicalYaml,
  sha256Hex,
} from "../../packages/ty-context/dist/lib/composite-campaign-codec.js";
import { buildModelCatalog } from "../../packages/ty-context/dist/lib/codex-model-catalog.js";
import { routeCodexModel } from "../../packages/ty-context/dist/lib/codex-model-router.js";
import { loadCodexModelRoutingPolicyV1 } from "../../packages/ty-context/dist/lib/codex-model-routing-policy.js";
import {
  createSliceGoalManifest,
  createSliceGoalManifestV2,
  createSliceGoalManifestV3,
  readSliceGoalManifest,
  renderSliceGoalObjective,
} from "../../packages/ty-context/dist/lib/composite-campaign-goal-manifest.js";
import {
  COMPOSITE_V5_SCHEMAS,
  COMPOSITE_V5_SCHEMA_SET_SHA256,
} from "../../packages/ty-context/dist/lib/composite-campaign-schema-registry.js";
import {
  emptyThreadStateV5,
  parseCampaignV5,
} from "../../packages/ty-context/dist/lib/composite-campaign-schema-v5.js";
import {
  acceptThreadV5,
  bindThreadGoalV5,
  bindThreadIdentityV5,
  bindThreadRoutingV5,
  markPacketValidationV5,
  markWorktreeReadyV5,
  recordAuthoringTurnV5,
  recordExecutionTurnV5,
} from "../../packages/ty-context/dist/lib/composite-campaign-thread-state.js";

test("routing_policy_hash_is_persisted", async () => {
  assert.deepEqual(Object.keys(COMPOSITE_V5_SCHEMAS).sort(), [
    "campaign-target-finalization-receipt-v1",
    "campaign-target-revalidation-result-v1",
    "campaign-wave-impact-v2",
    "composite-campaign-v5",
    "composite-source-coverage-v2",
    "scope-fit-result-v4",
    "slice-change-envelope-v1",
    "slice-execution-receipt-v2",
    "slice-goal-manifest-v3",
    "wave-integration-result-v2",
  ]);
  assert.match(COMPOSITE_V5_SCHEMA_SET_SHA256, /^[a-f0-9]{64}$/);
  const root = await mkdtemp(path.join(os.tmpdir(), "goal-manifest-v3-"));
  const worktree = path.join(root, "worktree");
  const contract = path.join(worktree, "tmp", "contract");
  const created = await createSliceGoalManifestV3(
    root,
    input(worktree, contract),
  );
  const reread = await readSliceGoalManifest(created.manifest_path);
  assert.equal(reread.schema_version, "slice-goal-manifest-v3");
  assert.equal(reread.thread_id, "thr-001");
  assert.equal(reread.authoring_effort, "xhigh");
  assert.equal(reread.execution_effort, "medium");
  assert.equal(reread.routing_reason, "sol_xhigh_to_medium");
  assert.equal(reread.routing_policy_id, "sol-xhigh-execution-medium");
  assert.equal(reread.routing_policy_sha256, "1".repeat(64));
  assert.equal(reread.routing_catalog_sha256, "2".repeat(64));
  assert.equal(
    reread.routing_decision_sha256,
    routingDecision().decision_sha256,
  );
  const objective = await readFile(created.objective_path, "utf8");
  assert.ok(objective.length <= 4000);
  assert.match(objective, /Read only the Context referenced by this Slice/);
  assert.match(objective, /do not reread unrelated Context/);
  assert.doesNotMatch(objective, /Read current project Context/);
  const oversized = input(
    worktree,
    path.join(worktree, "tmp", "x".repeat(3800)),
  );
  await assert.rejects(
    () => createSliceGoalManifestV3(path.join(root, "oversized"), oversized),
    /maximum_4000/,
  );
  await assert.rejects(() =>
    access(
      path.join(
        root,
        "oversized",
        "waves",
        "WAVE-001",
        "goals",
        "SFC-001",
        "goal-manifest.json",
      ),
    ),
  );
});

test("Goal Manifest V2 is audit-only for new Campaign V5 execution", async () => {
  await assert.rejects(
    () => createSliceGoalManifestV2("unused", {}),
    /V2 is audit-only/u,
  );
});

test("policy_unavailable_passthrough_survives_campaign_state", () => {
  const decision = policyFallbackDecision();
  let thread = bindThreadRoutingV5(emptyThreadStateV5(), decision);
  thread = bindThreadIdentityV5(thread, "thr-policy-fallback", "thr-policy-fallback");
  const reread = parseCampaignV5(
    canonicalYaml(campaignWithRepairThread(thread)),
  );
  const persisted = reread.repair_threads["REPAIR-001"].thread;
  assert.equal(persisted.routing_reason, "policy_unavailable_passthrough");
  assert.equal(
    persisted.routing_freeze.routing_decision.reason,
    "policy_unavailable_passthrough",
  );
  assert.deepEqual(persisted.authoring_profile, {
    model: "gpt-5.6-sol",
    effort: "xhigh",
  });
  assert.deepEqual(persisted.execution_profile, persisted.authoring_profile);
});

test("policy_unavailable_passthrough_survives_goal_manifest_v3", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "goal-policy-fallback-"));
  const worktree = path.join(root, "worktree");
  const contract = path.join(worktree, "tmp", "contract");
  const decision = policyFallbackDecision();
  const created = await createSliceGoalManifestV3(
    root,
    input(worktree, contract, decision),
  );
  const reread = await readSliceGoalManifest(created.manifest_path);
  assert.equal(reread.routing_reason, "policy_unavailable_passthrough");
  assert.equal(reread.authoring_model, decision.authoring_profile.model);
  assert.equal(reread.authoring_effort, decision.authoring_profile.effort);
  assert.equal(reread.execution_model, decision.execution_profile.model);
  assert.equal(reread.execution_effort, decision.execution_profile.effort);

  const v2Identity = {
    schema_version: "slice-goal-manifest-v2",
    campaign_id: "campaign",
    slice_id: "SFC-001",
    wave_id: "WAVE-001",
    worktree: path.resolve(worktree),
    branch: "tyctx/slice",
    base_commit: "a".repeat(40),
    packet_revision: 1,
    packet_sha256: "b".repeat(64),
    contract_workdir: path.resolve(contract),
    integration_branch: "tyctx/integration",
    allowed_implementation_bindings: ["src/**"],
    forbidden_campaign_state_paths: [
      ".codex/composite-long-task/campaigns/campaign",
    ],
    launch_token: "policy-fallback",
    thread_id: "thr-001",
    authoring_model: decision.authoring_profile.model,
    authoring_effort: decision.authoring_profile.effort,
    execution_model: decision.execution_profile.model,
    execution_effort: decision.execution_profile.effort,
    routing_reason: decision.reason,
  };
  const v2File = path.join(root, "goal-manifest-v2.json");
  await writeFile(
    v2File,
    canonicalJson({
      ...v2Identity,
      manifest_sha256: sha256Hex(canonicalJson(v2Identity)),
    }),
  );
  const audit = await readSliceGoalManifest(v2File);
  assert.equal(audit.schema_version, "slice-goal-manifest-v2");
  assert.equal(audit.routing_reason, "policy_unavailable_passthrough");
});

test("Campaign V4 Goal creation and rendering are audit-only", async () => {
  await assert.rejects(
    () => createSliceGoalManifest("unused", {}),
    /Campaign V4 is audit-only/,
  );
  assert.throws(
    () => renderSliceGoalObjective({}),
    /Campaign V4 is audit-only/,
  );
});

test("Campaign V5 thread phases preserve one thread across authoring, Goal, execution, and acceptance", () => {
  let state = emptyThreadStateV5();
  state = bindThreadRoutingV5(state, routingDecision());
  state = bindThreadIdentityV5(state, "thr-001", "thr-001");
  state = recordAuthoringTurnV5(state, "turn-author");
  state = markPacketValidationV5(state);
  state = markWorktreeReadyV5(state);
  state = bindThreadGoalV5(state, "a".repeat(64), "launch");
  state = recordExecutionTurnV5(state, "turn-execute");
  state = acceptThreadV5(state);
  assert.equal(state.thread_id, "thr-001");
  assert.deepEqual(state.authoring_turn_ids, ["turn-author"]);
  assert.deepEqual(state.execution_turn_ids, ["turn-execute"]);
  assert.equal(state.goal.status, "complete");
  assert.equal(state.phase, "accepted");
});

function input(worktree, contract_workdir, routing = routingDecision()) {
  return {
    campaign_id: "campaign",
    slice_id: "SFC-001",
    wave_id: "WAVE-001",
    worktree,
    branch: "tyctx/slice",
    base_commit: "a".repeat(40),
    packet_revision: 1,
    packet_sha256: "b".repeat(64),
    contract_workdir,
    integration_branch: "tyctx/integration",
    allowed_implementation_bindings: ["src/**"],
    forbidden_campaign_state_paths: [
      ".codex/composite-long-task/campaigns/campaign",
    ],
    change_envelope: changeEnvelope(),
    thread_id: "thr-001",
    authoring_model: routing.authoring_profile.model,
    authoring_effort: routing.authoring_profile.effort,
    execution_model: routing.execution_profile.model,
    execution_effort: routing.execution_profile.effort,
    routing_reason: routing.reason,
    routing_policy_id: routing.policy_id,
    routing_switched: routing.switched,
    routing_policy_sha256: routing.policy_sha256,
    routing_catalog_sha256: routing.catalog_sha256,
    routing_decision_sha256: routing.decision_sha256,
  };
}

function changeEnvelope() {
  const identity = {
    schema_version: "slice-change-envelope-v1",
    allowed_write_paths: ["src/**"],
    allowed_supporting_paths: [],
    allowed_contract_keys: [],
    forbidden_paths: [
      ".codex/composite-long-task/**",
      ".codex/ty-context-active-long-task.json",
      ".codex/ty-context-final-result-receipt.json",
      "project_context/**",
    ],
    undeclared_change_policy: "reject",
  };
  return { ...identity, envelope_sha256: sha256Hex(canonicalJson(identity)) };
}

function routingDecision() {
  const identity = {
    authoring_profile: { model: "gpt-5.6-sol", effort: "xhigh" },
    execution_profile: { model: "gpt-5.6-sol", effort: "medium" },
    switched: true,
    reason: "sol_xhigh_to_medium",
    policy_id: "sol-xhigh-execution-medium",
    policy_sha256: "1".repeat(64),
    catalog_sha256: "2".repeat(64),
  };
  return {
    ...identity,
    decision_sha256: sha256Hex(canonicalValueJson(identity)),
  };
}

function policyFallbackDecision() {
  const loaded = loadCodexModelRoutingPolicyV1(
    "schema_version: model-routing-policy-v1\npolicy_id: broken\ndefault: guess\n",
  );
  assert.equal(loaded.status, "fallback");
  const catalog = buildModelCatalog([
    {
      id: "gpt-5.6-sol",
      model: "gpt-5.6-sol",
      upgrade: null,
      upgradeInfo: null,
      hidden: false,
      supportedReasoningEfforts: ["medium", "xhigh"].map(
        (reasoningEffort) => ({ reasoningEffort }),
      ),
      defaultReasoningEffort: "medium",
    },
  ]);
  return routeCodexModel(
    { model: "gpt-5.6-sol", effort: "xhigh" },
    catalog,
    loaded.policy,
    loaded.sha256,
  );
}

function campaignWithRepairThread(thread) {
  return {
    schema_version: "composite-campaign-v5",
    campaign_id: "campaign",
    source_plan_sha256: "a".repeat(64),
    source_kind: "discussed_plan",
    created_at: new Date().toISOString(),
    target_branch: "main",
    base_commit: null,
    integration_branch: "tyctx/integration",
    integration_head: null,
    graph: {
      graph_revision: 0,
      graph_sha256: sha256Hex(canonicalValueJson({ slices: [] })),
      slices: {},
    },
    slices: {},
    waves: {},
    generation: 1,
    campaign_status: "planning",
    context_baseline: {
      graph_sha256: "b".repeat(64),
      files: {
        "project_context/global.md": "c".repeat(64),
        "project_context/architecture.md": "d".repeat(64),
        "project_context/context.toml": "e".repeat(64),
      },
      baseline_sha256: "f".repeat(64),
    },
    campaign_policy: {
      auto_push: true,
      protected_branch_mode: "pull_request",
      preserve_primary_worktree: true,
    },
    execution_host: {
      kind: "codex_app_server",
      controller_thread_id: null,
      controller_profile: { model: null, effort: null, source: "unknown" },
      model_catalog_sha256: null,
      app_server_version: null,
      status: "disconnected",
      restart_count: 0,
      last_error_code: null,
    },
    repair_threads: {
      "REPAIR-001": {
        wave_id: "WAVE-001",
        repair_id: "REPAIR-001",
        thread,
      },
    },
    finalization: null,
  };
}
