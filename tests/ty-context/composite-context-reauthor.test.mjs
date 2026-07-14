import test from "node:test";
import assert from "node:assert/strict";
import { appendFile, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createCampaignV5,
  loadCampaignV5,
  mutateCampaignV5,
} from "../../packages/ty-context/dist/lib/composite-campaign-v5.js";
import { applyCampaignScopeV5 } from "../../packages/ty-context/dist/lib/composite-runtime-v5/campaign-packet-store.js";
import {
  bindThreadGoalV5,
  bindThreadIdentityV5,
  markPacketValidationV5,
  markWorktreeReadyV5,
} from "../../packages/ty-context/dist/lib/composite-campaign-thread-state.js";

const repo = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

test("context_change_before_goal_reauthors_packet", async () => {
  const source = await readFile(
    path.join(
      repo,
      "packages/ty-context/src/lib/composite-campaign-orchestrator.ts",
    ),
    "utf8",
  );
  assert.match(source, /campaign_context_changed:/);
  assert.match(source, /packet_context_changed/);
  assert.match(source, /action:\s*"author_packets"/);
  assert.match(source, /status = "packet_pending"/);
});

test("context_baseline_recomputes_before_goal_and_fails_closed_after_goal", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "campaign-context-freeze-"));
  git(root, ["init", "-b", "main"]);
  git(root, ["config", "user.email", "test@example.com"]);
  git(root, ["config", "user.name", "Test"]);
  await writeContext(root);
  const plan = "SRC-001: preserve the Context-owned behavior\n";
  await writeFile(path.join(root, "plan.md"), plan);
  git(root, ["add", "."]);
  git(root, ["commit", "-m", "fixture"]);
  const created = await createCampaignV5(root, "context-freeze", "plan.md");
  const scope = scopeFixture(created.campaign.source_plan_sha256);
  const coverage = coverageFixture(created.campaign.source_plan_sha256);
  await writeFile(path.join(root, "scope.json"), JSON.stringify(scope));
  await writeFile(path.join(root, "coverage.json"), JSON.stringify(coverage));
  await applyCampaignScopeV5(
    root,
    created.campaign_path,
    "scope.json",
    "coverage.json",
  );
  const before = (await loadCampaignV5(root, created.campaign_path)).campaign
    .context_baseline.baseline_sha256;
  await appendFile(
    path.join(root, "project_context/global.md"),
    "\n- pre-goal update\n",
  );
  await applyCampaignScopeV5(
    root,
    created.campaign_path,
    "scope.json",
    "coverage.json",
  );
  const recomputed = (await loadCampaignV5(root, created.campaign_path))
    .campaign.context_baseline.baseline_sha256;
  assert.notEqual(recomputed, before);
  await mutateCampaignV5(
    root,
    created.campaign_path,
    "test_goal_bound",
    async (_campaignRoot, campaign) => {
      const slice = campaign.slices["SFC-001"];
      let state = bindThreadIdentityV5(
        slice.thread,
        "thread-context",
        "session-context",
      );
      state = markPacketValidationV5(state);
      state = markWorktreeReadyV5(state);
      slice.thread = bindThreadGoalV5(
        state,
        "a".repeat(64),
        "launch-context",
      );
      return campaign;
    },
  );
  await appendFile(
    path.join(root, "project_context/global.md"),
    "\n- post-goal update\n",
  );
  await assert.rejects(
    () => loadCampaignV5(root, created.campaign_path),
    /context_changed_after_campaign_goal/,
  );
});

function scopeFixture(request_sha256) {
  return {
    schema_version: "scope-fit-result-v4",
    request_sha256,
    decision: "fit_for_three_inputs",
    campaign_goal: "preserve Context",
    granularity_contract: {
      unit: "control_or_capability_unit",
      slice_policy: "maximal_coherent_authorable_scope",
      parallelism_must_not_force_split: true,
    },
    source_units: [
      {
        unit_id: "SRCU-001",
        kind: "cli_command",
        statement: "preserve Context",
        cohesion_key: "context",
        owner_boundary: "cli",
        acceptance_outcome: "context stays authoritative",
        source_refs: ["SRC-001"],
        details: { acceptance_evidence: "contract oracle" },
      },
    ],
    global_constraints: [],
    slices: [
      {
        slice_id: "SFC-001",
        stable_key: "context",
        title: "Context",
        objective: "Preserve Context",
        depends_on: [],
        priority: 1,
        source_refs: ["SRC-001"],
        source_unit_refs: ["SRCU-001"],
        scope_summary: ["Context"],
        out_of_scope: [],
        separation_reasons: [],
        produces_contracts: [],
        consumes_contracts: [],
        conflict_domains: ["context"],
        resource_locks: [],
      },
    ],
    decision_required: null,
  };
}

function coverageFixture(source_plan_sha256) {
  return {
    schema_version: "composite-source-coverage-v2",
    source_plan_sha256,
    items: [
      {
        source_item_id: "SRC-001",
        statement: "preserve Context",
        disposition: "slice",
        slice_refs: ["SFC-001"],
        global_constraint_refs: [],
        rationale: "Context owns the behavior",
        context_resolution: {
          status: "existing",
          context_refs: ["project_context/global.md"],
          task_local_reason: null,
        },
      },
    ],
    global_constraint_bindings: [],
  };
}

async function writeContext(root) {
  const files = {
    "project_context/context.toml": '[[areas]]\nid = "main"\nroot = "."\ncontext = "project_context/areas/main.md"\nkind = "app"\ndefault = true\n',
    "project_context/global.md": "# Global Context\n\n- Own the behavior.\n",
    "project_context/architecture.md": "# Architecture Context\n\n- Keep one boundary.\n",
    "project_context/areas/main.md": "# Main Area\n\n- Own the fixture.\n",
  };
  for (const [relative, content] of Object.entries(files)) {
    const target = path.join(root, ...relative.split("/"));
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content);
  }
}

function git(root, args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
}
