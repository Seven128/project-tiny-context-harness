import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPlanProject, writeSuperpowersSources } from "./plan-validator-fixtures.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("composite-long-task public namespace preserves state-kernel behavior", async () => {
  const root = await createPlanProject();
  try {
    await writeSuperpowersSources(root);
    const cli = path.join(repoRoot, "packages/ty-context/dist/cli.js");
    const workdir = "tmp/ty-context/plan-acceptance/demo";

    const init = spawnSync(process.execPath, [cli, "composite-long-task", "init", workdir], { cwd: root, encoding: "utf8" });
    assert.equal(init.status, 0, init.stderr);
    assert.match(init.stdout, /composite long-task state/);

    const compile = spawnSync(process.execPath, [cli, "composite-long-task", "compile", workdir], { cwd: root, encoding: "utf8" });
    assert.equal(compile.status, 0, compile.stderr);
    assert.match(compile.stdout, /compiled composite long-task graph/);

    const state = JSON.parse(await readFile(path.join(root, workdir, "task-state.json"), "utf8"));
    assert.equal(state.meta.product_goal_complete, false);
    assert.ok(state.graph.plan_items["PI-001"]);
    assert.ok(state.graph.acceptance_criteria["AC-001"]);

    const deltaPath = path.join(root, workdir, "slice-delta.json");
    await writeFile(
      deltaPath,
      JSON.stringify(
        {
          slice_id: "S-CLT-001",
          slice_goal: "Close CLI runtime proof",
          touched_plan_items: ["PI-001"],
          touched_acs: ["AC-001"],
          code_changes: ["src/runtime/kernel.ts"],
          evidence_records: [
            {
              evidence_id: "EV-CLT-001",
              slice_id: "S-CLT-001",
              type: "runtime",
              freshness: { created_at: "2026-06-29T00:00:00.000Z", valid_for: "current_worktree", stale_after: null },
              command: "node --test tests/runtime.spec.ts",
              artifact_paths: ["tmp/ty-context/plan-acceptance/demo/runtime.json"],
              proves: ["AC-001.worker_runtime"],
              does_not_prove: ["AC-001.ui_browser"],
              redaction: { checked: true, contains_secret: false },
              reviewability: { external_reviewer_can_reproduce: true, reproduction_steps: "Run node --test tests/runtime.spec.ts." }
            }
          ],
          closed_layers: ["AC-001.worker_runtime"],
          remaining_layers: ["AC-001.ui_browser"],
          blockers: [],
          cleanup_assertions: ["runtime fixture cleaned"],
          progress_value: {
            type: "proof_gap_closed",
            closed_items: ["AC-001.worker_runtime"],
            why_it_reduces_rework: "Runtime proof is now mapped to a proof layer."
          }
        },
        null,
        2
      ),
      "utf8"
    );

    const apply = spawnSync(process.execPath, [cli, "composite-long-task", "apply-slice-delta", workdir, deltaPath], {
      cwd: root,
      encoding: "utf8"
    });
    assert.equal(apply.status, 0, apply.stderr);
    assert.match(apply.stdout, /derived files=/);

    const sliceGate = spawnSync(process.execPath, [cli, "composite-long-task", "slice-gate", workdir, "--slice", "S-CLT-001"], {
      cwd: root,
      encoding: "utf8"
    });
    assert.equal(sliceGate.status, 0, sliceGate.stderr);
    assert.match(sliceGate.stdout, /slice gate passed S-CLT-001/);

    const finalGate = spawnSync(process.execPath, [cli, "composite-long-task", "final-gate", workdir], { cwd: root, encoding: "utf8" });
    assert.notEqual(finalGate.status, 0);
    assert.match(finalGate.stdout, /final gate product_goal_complete=false/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
