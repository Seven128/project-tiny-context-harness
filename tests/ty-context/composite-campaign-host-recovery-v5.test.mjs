import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  StdioCodexAppServerClient,
  AmbiguousThreadLaunchError,
  AppServerUnavailableError,
} from "../../packages/ty-context/dist/lib/codex-app-server-client.js";
import { buildModelCatalog } from "../../packages/ty-context/dist/lib/codex-model-catalog.js";
import { routeCodexModel } from "../../packages/ty-context/dist/lib/codex-model-router.js";
import { recoverCampaignHostV5 } from "../../packages/ty-context/dist/lib/composite-campaign-host-recovery.js";
import {
  bindThreadGoalV5,
  bindThreadIdentityV5,
  bindThreadRoutingV5,
  markPacketValidationV5,
  markWorktreeReadyV5,
  reconcileThreadTurnV5,
  recordAuthoringTurnV5,
  recordExecutionTurnV5,
} from "../../packages/ty-context/dist/lib/composite-campaign-thread-state.js";
import { emptyThreadStateV5 } from "../../packages/ty-context/dist/lib/composite-campaign-schema-v5.js";
import { applyCampaignScopeV5 } from "../../packages/ty-context/dist/lib/composite-runtime-v5/campaign-packet-store.js";
import {
  createCampaignV5,
  loadCampaignV5,
  updateSliceThreadV5,
} from "../../packages/ty-context/dist/lib/composite-campaign-v5.js";
import { runCampaignV5 } from "../../packages/ty-context/dist/lib/composite-campaign-thread-orchestrator.js";

const fake = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "fake-codex-app-server.mjs",
);

test("App Server sibling Turns settle and reconcile before Host exit", async () => {
  const sources = await Promise.all(
    [
      "composite-campaign-packet-author.ts",
      "composite-campaign-goal-runner.ts",
      "composite-campaign-thread-orchestrator.ts",
    ].map((file) =>
      readFile(
        fileURLToPath(
          new URL(`../../packages/ty-context/src/lib/${file}`, import.meta.url),
        ),
        "utf8",
      ),
    ),
  );
  assert.ok(sources.every((source) => /Promise\.allSettled/u.test(source)));
  assert.match(sources[2], /settleOutstandingTurnsBeforeClose/u);
  assert.match(sources[2], /recoverCampaignHostV5/u);
  assert.match(sources[2], /app_server_unknown_mutation_on_shutdown/u);
});

test("one_authoring_failure_reconciles_siblings", async () => {
  const source = await sourceFile("composite-campaign-packet-author.ts");
  assert.match(source, /Promise\.allSettled/u);
  assert.match(source, /campaign_packet_authoring_failed_after_all_slices_settled/u);
  assert.match(source, /AggregateError/u);
});

test("one_launch_failure_reconciles_started_turns", async () => {
  const [runner, host] = await Promise.all([
    sourceFile("composite-campaign-goal-runner.ts"),
    sourceFile("composite-campaign-thread-orchestrator.ts"),
  ]);
  assert.match(runner, /campaign_wave_launch_failed_after_all_goals_settled/u);
  assert.match(runner, /Promise\.allSettled/u);
  assert.match(runner, /loadCampaignQueued/u);
  assert.match(host, /settleOutstandingTurnsBeforeClose/u);
});

test("one_execution_failure_waits_for_sibling_terminal_state", async () => {
  const source = await sourceFile("composite-campaign-goal-runner.ts");
  assert.match(source, /campaign_goal_wait_failed_after_all_goals_settled/u);
  assert.match(source, /sliceIds\.map\(\(sliceId\) => runSliceUntilAccepted/u);
});

test("completed_sibling_is_not_restarted", async () => {
  const [author, runner] = await Promise.all([
    sourceFile("composite-campaign-packet-author.ts"),
    sourceFile("composite-campaign-goal-runner.ts"),
  ]);
  assert.match(author, /slice\.status === "packet_ready"\) return "authored"/u);
  assert.match(runner, /slice\.status === "accepted"\) return/u);
});

test("interrupted_sibling_resumes_same_goal", async () => {
  const source = await sourceFile("composite-campaign-goal-runner.ts");
  assert.match(source, /completion\.status === "interrupted"/u);
  assert.match(source, /resumeThread\(manifest\.thread_id\)/u);
  assert.match(source, /Resume the same Goal/u);
});

test("host_exit_leaves_no_unknown_running_turn", async () => {
  const decision = routeCodexModel(
    { model: "gpt-5.6-sol", effort: "xhigh" },
    buildModelCatalog([
      {
        id: "gpt-5.6-sol",
        model: "gpt-5.6-sol",
        supportedReasoningEfforts: [
          { reasoningEffort: "medium", description: "medium" },
          { reasoningEffort: "xhigh", description: "xhigh" },
        ],
      },
    ]),
  );
  let state = emptyThreadStateV5();
  state = bindThreadIdentityV5(bindThreadRoutingV5(state, decision), "thr", "thr");
  state = recordAuthoringTurnV5(state, "author");
  state = markPacketValidationV5(state);
  state = markWorktreeReadyV5(state);
  state = bindThreadGoalV5(state, "a".repeat(64), "launch");
  state = recordExecutionTurnV5(state, "execute");
  state = reconcileThreadTurnV5(state, "execute", "system_error");
  assert.equal(state.turn_observations.execute.status, "unknown");
  assert.equal(state.turn_observations.execute.reconciliation_required, true);
  const source = await sourceFile("composite-campaign-thread-orchestrator.ts");
  assert.match(source, /app_server_unknown_mutation_on_shutdown/u);
});

test("app_server_restart_resumes_thread and reconciles a correlated unknown authoring Turn", async () => {
  const fixture = await campaignFixture("recovery");
  const stateFile = path.join(fixture.root, "fake-state.json");
  const first = client(stateFile);
  await first.initialize();
  const catalog = buildModelCatalog(await first.listModels());
  const routing = routeCodexModel(
    { model: "gpt-5.6-sol", effort: "xhigh" },
    catalog,
  );
  const thread = await first.startThread({
    cwd: fixture.root,
    model: routing.authoring_profile.model,
  });
  await updateSliceThreadV5(
    fixture.root,
    fixture.campaignPath,
    "SFC-001",
    "test_thread_bound",
    (state) =>
      bindThreadIdentityV5(
        bindThreadRoutingV5(state, routing),
        thread.id,
        thread.sessionId,
      ),
  );
  const turn = await first.startTurn({
    threadId: thread.id,
    input: "recover this authoring turn",
    cwd: fixture.root,
    model: "gpt-5.6-sol",
    effort: "xhigh",
    sandboxPolicy: { type: "readOnly", networkAccess: false },
    outputSchema: { type: "object" },
  });
  await first.waitForTurn(thread.id, turn.id);
  await first.close();
  const second = client(stateFile);
  await second.initialize();
  try {
    const recovered = await recoverCampaignHostV5(
      second,
      fixture.root,
      fixture.campaignPath,
    );
    assert.deepEqual(recovered.resumed_thread_ids, [thread.id]);
    assert.deepEqual(recovered.reconciled_turn_ids, [turn.id]);
    const campaign = (await loadCampaignV5(fixture.root, fixture.campaignPath))
      .campaign;
    assert.equal(campaign.slices["SFC-001"].thread.thread_id, thread.id);
    assert.deepEqual(campaign.slices["SFC-001"].thread.authoring_turn_ids, [
      turn.id,
    ]);
    assert.equal(campaign.slices["SFC-001"].thread.active_turn_id, null);
    assert.equal(campaign.slices["SFC-001"].thread.turn_observations[turn.id].status, "completed");
    assert.equal(campaign.slices["SFC-001"].thread.turn_observations[turn.id].reconciliation_required, false);
  } finally {
    await second.close();
  }
});

test("ambiguous_host_thread_launch fails closed and App Server unavailability never falls back", async () => {
  const fixture = await campaignFixture("ambiguous");
  await updateSliceThreadV5(
    fixture.root,
    fixture.campaignPath,
    "SFC-001",
    "test_launch_intent",
    (state) => ({ ...state, launch_token: "intent-without-correlated-thread" }),
  );
  const active = client(path.join(fixture.root, "ambiguous-state.json"));
  await active.initialize();
  try {
    await assert.rejects(
      () => recoverCampaignHostV5(active, fixture.root, fixture.campaignPath),
      AmbiguousThreadLaunchError,
    );
  } finally {
    await active.close();
  }
  const unavailable = await campaignFixture("unavailable", false);
  const result = await runCampaignV5({
    projectRoot: unavailable.root,
    campaignPath: unavailable.campaignPath,
    clientFactory: () => new UnavailableClient(),
  });
  assert.deepEqual(result, {
    status: "wait_external",
    reason: "app_server_unavailable",
  });
  const campaign = (
    await loadCampaignV5(unavailable.root, unavailable.campaignPath)
  ).campaign;
  assert.equal(campaign.execution_host.status, "wait_external");
  assert.equal(
    campaign.execution_host.last_error_code,
    "app_server_unavailable",
  );
});

async function campaignFixture(name, withScope = true) {
  const root = await mkdtemp(path.join(os.tmpdir(), `campaign-v5-${name}-`));
  git(root, ["init", "-b", "main"]);
  git(root, ["config", "user.email", "test@example.com"]);
  git(root, ["config", "user.name", "Test"]);
  await writeContextFixture(root);
  const plan = "SRC-001: one recoverable capability\n";
  await writeFile(path.join(root, "plan.md"), plan);
  git(root, ["add", "plan.md", "project_context"]);
  git(root, ["commit", "-m", "fixture"]);
  const created = await createCampaignV5(root, `campaign-${name}`, "plan.md");
  if (withScope) {
    const hash = createHash("sha256").update(plan).digest("hex");
    const scope = {
      schema_version: "scope-fit-result-v4",
      request_sha256: hash,
      decision: "fit_for_three_inputs",
      campaign_goal: "recover",
      granularity_contract: {
        unit: "control_or_capability_unit",
        slice_policy: "maximal_coherent_authorable_scope",
        parallelism_must_not_force_split: true,
      },
      source_units: [
        {
          unit_id: "SRCU-001",
          kind: "cli_command",
          statement: "recover command",
          cohesion_key: "recover",
          owner_boundary: "cli",
          acceptance_outcome: "recover",
          source_refs: ["SRC-001"],
          details: { acceptance_evidence: "fake app server" },
        },
      ],
      global_constraints: [],
      slices: [
        {
          slice_id: "SFC-001",
          stable_key: "recover",
          title: "Recover",
          objective: "Recover",
          depends_on: [],
          priority: 1,
          source_refs: ["SRC-001"],
          source_unit_refs: ["SRCU-001"],
          scope_summary: ["recover"],
          out_of_scope: [],
          separation_reasons: [],
          produces_contracts: [],
          consumes_contracts: [],
          conflict_domains: ["recover"],
          resource_locks: [],
        },
      ],
      decision_required: null,
    };
    const coverage = {
      schema_version: "composite-source-coverage-v2",
      source_plan_sha256: hash,
      items: [
        {
          source_item_id: "SRC-001",
          statement: "recover",
          disposition: "slice",
          slice_refs: ["SFC-001"],
          global_constraint_refs: [],
          rationale: "owned",
          context_resolution: {
            status: "task_local",
            context_refs: [],
            task_local_reason: "host recovery fixture",
          },
        },
      ],
      global_constraint_bindings: [],
    };
    await writeFile(path.join(root, "scope.json"), JSON.stringify(scope));
    await writeFile(path.join(root, "coverage.json"), JSON.stringify(coverage));
    await applyCampaignScopeV5(
      root,
      created.campaign_path,
      "scope.json",
      "coverage.json",
    );
  }
  return { root, campaignPath: created.campaign_path };
}
async function writeContextFixture(root) {
  await mkdir(path.join(root, "project_context", "areas"), { recursive: true });
  await Promise.all([
    writeFile(
      path.join(root, "project_context", "context.toml"),
      '[[areas]]\nid = "main"\nroot = "."\ncontext = "project_context/areas/main.md"\nkind = "app"\ndefault = true\n',
    ),
    writeFile(
      path.join(root, "project_context", "global.md"),
      "# Project Context\n\n- Host recovery fixture.\n",
    ),
    writeFile(
      path.join(root, "project_context", "architecture.md"),
      "# Architecture Context\n\n- Fake App Server boundary.\n",
    ),
    writeFile(
      path.join(root, "project_context", "areas", "main.md"),
      "# Main Area\n\n- Owns host recovery.\n",
    ),
  ]);
}
function client(stateFile) {
  return new StdioCodexAppServerClient({
    command: process.execPath,
    args: [fake],
    env: { FAKE_APP_SERVER_STATE_FILE: stateFile },
    requestTimeoutMs: 3000,
    turnTimeoutMs: 3000,
  });
}
function git(root, args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
}
class UnavailableClient {
  async initialize() {
    throw new AppServerUnavailableError("scripted");
  }
  async close() {}
}

function sourceFile(file) {
  return readFile(
    fileURLToPath(
      new URL(`../../packages/ty-context/src/lib/${file}`, import.meta.url),
    ),
    "utf8",
  );
}
