import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPlanProject, writeSuperpowersSources } from "./plan-validator-fixtures.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const cli = path.join(repoRoot, "packages/ty-context/dist/cli.js");
const workdirArg = "tmp/ty-context/plan-acceptance/demo";

test("legacy ty-context superpowers alias delegates supported commands to the composite long-task state kernel", async () => {
  const commandPairs = [
    {
      name: "init",
      async setup(root) {
        await writeSuperpowersSources(root);
      },
      args: ["init", workdirArg],
      assertResult(result, state) {
        assert.equal(result.status, 0, result.stderr);
        assert.match(result.stdout, /initialized superpowers task state/);
        assert.equal(state.meta.plan_slug, "demo");
      }
    },
    {
      name: "compile",
      async setup(root) {
        await writeSuperpowersSources(root);
        assert.equal(runCli(root, "composite-long-task", "init", workdirArg).status, 0);
      },
      args: ["compile", workdirArg],
      assertResult(result, state) {
        assert.equal(result.status, 0, result.stderr);
        assert.match(result.stdout, /compiled superpowers task graph/);
        assert.ok(state.graph.plan_items["PI-001"]);
        assert.ok(state.graph.acceptance_criteria["AC-001"]);
      }
    },
    {
      name: "apply-slice-delta",
      async setup(root) {
        await writeSuperpowersSources(root);
        assert.equal(runCli(root, "composite-long-task", "init", workdirArg).status, 0);
        assert.equal(runCli(root, "composite-long-task", "compile", workdirArg).status, 0);
        await writeFile(path.join(root, workdirArg, "slice-delta.json"), JSON.stringify(sliceDelta(), null, 2), "utf8");
      },
      args: ["apply-slice-delta", workdirArg, `${workdirArg}/slice-delta.json`],
      async assertResult(result, state, root) {
        assert.equal(result.status, 0, result.stderr);
        assert.match(result.stdout, /applied superpowers task slice delta/);
        assert.equal(state.slices.at(-1).slice_id, "S-ALIAS-001");
        await readFile(path.join(root, workdirArg, "derived", "plan-conformance-matrix.json"), "utf8");
      }
    },
    {
      name: "derive",
      async setup(root) {
        await writeSuperpowersSources(root);
        assert.equal(runCli(root, "composite-long-task", "init", workdirArg).status, 0);
        assert.equal(runCli(root, "composite-long-task", "compile", workdirArg).status, 0);
      },
      args: ["derive", workdirArg],
      async assertResult(result, state, root) {
        assert.equal(result.status, 0, result.stderr);
        assert.match(result.stdout, /derived superpowers task artifacts/);
        await readFile(path.join(root, workdirArg, "derived", "final-acceptance-verdict.json"), "utf8");
      }
    },
    {
      name: "slice-gate",
      async setup(root) {
        await writeSuperpowersSources(root);
        assert.equal(runCli(root, "composite-long-task", "init", workdirArg).status, 0);
        assert.equal(runCli(root, "composite-long-task", "compile", workdirArg).status, 0);
        await writeFile(path.join(root, workdirArg, "slice-delta.json"), JSON.stringify(sliceDelta(), null, 2), "utf8");
        assert.equal(runCli(root, "composite-long-task", "apply-slice-delta", workdirArg, `${workdirArg}/slice-delta.json`).status, 0);
      },
      args: ["slice-gate", workdirArg, "--slice", "S-ALIAS-001"],
      assertResult(result) {
        assert.equal(result.status, 0, result.stderr);
        assert.match(result.stdout, /slice gate passed S-ALIAS-001/);
      }
    },
    {
      name: "final-gate",
      async setup(root) {
        await writeSuperpowersSources(root);
        assert.equal(runCli(root, "composite-long-task", "init", workdirArg).status, 0);
        assert.equal(runCli(root, "composite-long-task", "compile", workdirArg).status, 0);
      },
      args: ["final-gate", workdirArg],
      assertResult(result, state) {
        assert.notEqual(result.status, 0);
        assert.match(result.stdout, /final gate product_goal_complete=false/);
        assert.equal(state.final.audit_task_complete, true);
        assert.equal(state.final.product_goal_complete, false);
      }
    }
  ];

  for (const pair of commandPairs) {
    const root = await createPlanProject();
    try {
      await pair.setup(root);
      const result = runCli(root, "superpowers", ...pair.args);
      const state = JSON.parse(await readFile(path.join(root, workdirArg, "task-state.json"), "utf8"));
      await pair.assertResult(result, state, root);
    } catch (error) {
      error.message = `${pair.name}: ${error.message}`;
      throw error;
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

test("legacy ty-context superpowers help keeps render-goal hidden", async () => {
  const root = await createPlanProject();
  try {
    const help = runCli(root, "superpowers", "help", workdirArg);
    assert.equal(help.status, 0, help.stderr);
    assert.doesNotMatch(help.stdout, /render-goal/);
    assert.match(help.stdout, /final-gate/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

function runCli(cwd, ...args) {
  return spawnSync(process.execPath, [cli, ...args], { cwd, encoding: "utf8" });
}

function sliceDelta() {
  return {
    slice_id: "S-ALIAS-001",
    slice_goal: "Close runtime proof through alias",
    touched_plan_items: ["PI-001"],
    touched_acs: ["AC-001"],
    code_changes: ["src/runtime/kernel.ts"],
    evidence_records: [
      {
        evidence_id: "EV-ALIAS-001",
        slice_id: "S-ALIAS-001",
        type: "runtime",
        freshness: { created_at: "2026-06-29T00:00:00.000Z", valid_for: "current_worktree", stale_after: null },
        command: "node --test tests/runtime.spec.ts",
        artifact_paths: ["tmp/ty-context/plan-acceptance/demo/runtime.json"],
        proves: ["AC-001.runtime"],
        does_not_prove: ["AC-001.ui_browser", "full_population_operation"],
        redaction: { checked: true, contains_secret: false },
        reviewability: { external_reviewer_can_reproduce: true, reproduction_steps: "Run node --test tests/runtime.spec.ts." }
      }
    ],
    closed_layers: ["AC-001.runtime"],
    remaining_layers: ["AC-001.code", "AC-001.ui_browser", "AC-001.test"],
    blockers: [],
    cleanup_assertions: ["alias fixture cleaned"],
    progress_value: {
      type: "proof_gap_closed",
      closed_items: ["AC-001.runtime"],
      why_it_reduces_rework: "Alias delegates to the same slice delta state kernel."
    }
  };
}
