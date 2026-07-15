import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createCampaignV6 } from "../../packages/ty-context/dist/lib/composite-campaign-v6.js";
import { applyCampaignScopeV6 } from "../../packages/ty-context/dist/lib/composite-runtime-v6/campaign-packet-store.js";
import { runGit } from "../../packages/ty-context/dist/lib/composite-campaign-git-baseline.js";
import { listRepositoryWorktrees } from "../../packages/ty-context/dist/lib/composite-campaign-worktree.js";

test("CLI run --dry-run projects V6 work, routes ultra, and never invokes Codex", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "campaign-cli-v6-"));
  try {
    await git(root, ["init", "-b", "main"]);
    await git(root, ["config", "user.email", "test@example.com"]);
    await git(root, ["config", "user.name", "Test"]);
    await writeContextFixture(root);
    await writeFile(
      path.join(root, "package.json"),
      JSON.stringify({ private: true, tyContext: { harnessFolderName: ".codex" } }),
      "utf8",
    );
    await writeFile(
      path.join(root, ".codex", "config.yaml"),
      'core:\n  package: project-tiny-context-harness\n  schema_version: "4"\nprofiles:\n  enabled:\n    - core-portable\n    - workflow-default\n    - composite-codex\nmodularity:\n  limit: 300\n  policy: scoped_waivers\n  waivers: []\nmanaged_files: []\nnever_overwrite: []\n',
      "utf8",
    );
    const plan = "SRC-001: one complete outcome\n";
    await writeFile(path.join(root, "plan.md"), plan, "utf8");
    await git(root, ["add", "."]);
    await git(root, ["commit", "-m", "fixture"]);
    const created = await createCampaignV6(root, "dry", "plan.md");
    const requestHash = createHash("sha256").update(plan).digest("hex");
    const scope = scopeFixture(requestHash);
    const coverage = coverageFixture(requestHash);
    await writeFile(path.join(root, "scope.json"), JSON.stringify(scope), "utf8");
    await writeFile(path.join(root, "coverage.json"), JSON.stringify(coverage), "utf8");
    await applyCampaignScopeV6(root, created.campaign_path, "scope.json", "coverage.json");
    const cli = path.resolve("packages/ty-context/dist/cli.js");
    const executed = spawnSync(
      process.execPath,
      [
        cli,
        "composite-campaign",
        "run",
        "--campaign",
        path.relative(root, created.campaign_path),
        "--controller-model",
        "gpt-5.6-sol",
        "--controller-effort",
        "ultra",
        "--dry-run",
        "--json",
      ],
      { cwd: root, encoding: "utf8", env: { ...process.env, TY_CONTEXT_CODEX_EXECUTABLE: "must-not-run" } },
    );
    assert.equal(executed.status, 0, executed.stderr);
    const output = JSON.parse(executed.stdout);
    assert.equal(output.schema_version, "composite-campaign-dry-run-v6");
    assert.deepEqual(output.packet_authoring_slice_ids, ["SFC-001"]);
    assert.deepEqual(output.ready_wave, []);
    assert.deepEqual(output.worker_profiles.authoring, {
      model: "gpt-5.6-sol",
      effort: "ultra",
    });
    assert.deepEqual(output.worker_profiles.execution, {
      model: "gpt-5.6-sol",
      effort: "medium",
    });
    assert.equal(output.codex_invoked, false);
    assert.equal(output.worktree_budget.managed_worktree_budget.max_total_worktrees, 6);
    assert.equal((await listRepositoryWorktrees(root)).length, 1);
    assert.equal(
      (await runGit(root, ["branch", "--format=%(refname:short)"])).stdout
        .split(/\r?\n/u)
        .filter((branch) => branch.startsWith("tyctx/campaign/")).length,
      0,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

function scopeFixture(request_sha256) {
  return {
    schema_version: "scope-fit-result-v4",
    request_sha256,
    decision: "fit_for_three_inputs",
    campaign_goal: "one complete outcome",
    granularity_contract: {
      unit: "control_or_capability_unit",
      slice_policy: "maximal_coherent_authorable_scope",
      parallelism_must_not_force_split: true,
    },
    source_units: [
      {
        unit_id: "SRCU-001",
        kind: "ui_control",
        statement: "one outcome",
        cohesion_key: "outcome",
        owner_boundary: "surface",
        acceptance_outcome: "complete",
        source_refs: ["SRC-001"],
        details: {
          owner_surface: "surface",
          route_or_location: "/route",
          control: "button",
          trigger_or_action: "click",
          input: "none",
          loading_state: "loading",
          empty_state: "empty",
          success_state: "success",
          failure_state: "failure",
          state_transition: "idle to done",
          observable_feedback: "message",
          api_or_data_dependency: "api",
          permission_boundary: "user",
          acceptance_evidence: "assertion",
        },
      },
    ],
    global_constraints: [],
    slices: [
      {
        slice_id: "SFC-001",
        stable_key: "outcome",
        title: "Outcome",
        objective: "Deliver outcome",
        depends_on: [],
        priority: 1,
        source_refs: ["SRC-001"],
        source_unit_refs: ["SRCU-001"],
        scope_summary: ["complete outcome"],
        out_of_scope: [],
        separation_reasons: [],
        produces_contracts: [],
        consumes_contracts: [],
        conflict_domains: ["outcome"],
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
        statement: "one complete outcome",
        disposition: "slice",
        slice_refs: ["SFC-001"],
        global_constraint_refs: [],
        rationale: "owned by the maximal coherent slice",
        context_resolution: {
          status: "existing",
          context_refs: ["project_context/context.toml"],
          task_local_reason: null,
        },
      },
    ],
    global_constraint_bindings: [],
  };
}
async function writeContextFixture(root) {
  const files = {
    "project_context/context.toml": '[[areas]]\nid = "main"\nroot = "."\ncontext = "project_context/areas/main.md"\nkind = "app"\ndefault = true\n',
    "project_context/global.md": "# Global Context\n\n- Stable fixture facts.\n",
    "project_context/architecture.md": "# Architecture Context\n\n- Deterministic boundaries.\n",
    "project_context/areas/main.md": "# Main Area\n\n- Own the outcome.\n",
  };
  for (const [relative, content] of Object.entries(files)) {
    const target = path.join(root, ...relative.split("/"));
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content, "utf8");
  }
  await mkdir(path.join(root, ".codex"), { recursive: true });
}
async function git(root, args) {
  return runGit(root, ["-c", "commit.gpgSign=false", ...args], { timeoutMs: 120_000 });
}
