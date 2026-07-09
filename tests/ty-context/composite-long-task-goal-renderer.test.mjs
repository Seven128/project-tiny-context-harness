import test from "node:test";
import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { initializeSuperpowersTask } from "../../packages/ty-context/dist/lib/superpowers-task-state.js";
import { compileSuperpowersTask } from "../../packages/ty-context/dist/lib/superpowers-task-compile.js";
import { renderCompositeLongTaskGoal } from "../../packages/ty-context/dist/lib/composite-long-task-renderer.js";
import { createPlanProject, writeSuperpowersSources } from "./plan-validator-fixtures.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("render-goal creates a thin Codex Goal objective and does not mutate task state", async () => {
  const root = await createPlanProject();
  try {
    await writeSuperpowersSources(root);
    const workdir = path.join(root, "tmp/ty-context/plan-acceptance/demo");
    await initializeSuperpowersTask(workdir, { taskId: "CLT-GOAL", planSlug: "demo" });
    await compileSuperpowersTask(workdir);
    const beforeState = await readFile(path.join(workdir, "task-state.json"), "utf8");

    const result = await renderCompositeLongTaskGoal(workdir);

    assert.equal(result.goalObjectivePath, path.join(workdir, "goal-objective.txt"));
    assert.ok(result.goalObjectiveLength <= 3850, `goal objective too long: ${result.goalObjectiveLength}`);

    const goal = await readFile(path.join(workdir, "goal-objective.txt"), "utf8");
    assert.match(goal, /^\/goal Execute the composite long-task workflow/m);
    assert.match(goal, /workflow-protocol\.md/);
    assert.match(goal, /execution-binding\.md/);
    assert.match(goal, /Product \/ Architecture Source owns intent, scope, Scope Fit, owner boundaries and assertion policy/);
    assert.match(goal, /task-state\.json is the only execution state source/);
    assert.match(goal, /events\.ndjson is append-only/);
    assert.match(goal, /derived\/\*\* is generated/);
    assert.match(goal, /workflow-protocol\.md to combine Tiny Context gates with official Superpowers execution/);
    assert.match(goal, /not business Context and must not be registered in project_context\/context\.toml/);
    assert.match(goal, /Do not hand-set product_goal_complete/i);
    assert.match(goal, /assertion_result\.status=passed/);
    assert.match(goal, /zero command\/assertion exit codes/);
    assert.match(goal, /no failed\/stale negative_evidence_scan/);
    assert.match(goal, /final-gate compute product_goal_complete=true/i);
    assert.match(goal, /AC Evidence Assertion Gate, Negative Evidence Scan Gate/);
    assert.match(goal, /blocker_triage category\/next_action/);
    assert.match(goal, /self-recoverable transient\/generated-output mismatch may recover once/);
    assert.match(goal, /audit_task_complete is true but acceptance_target_status is not complete/i);
    assert.match(goal, /Audit workflow completed; acceptance target not complete\./);
    assert.match(goal, /forbidden shortcuts/i);
    assert.match(goal, /Context Delta is required but Context is not updated/);
    assert.match(goal, /Source-to-Context Coverage \/ Context-to-Implementation Binding has unresolved required gaps/);
    assert.match(goal, /Blocked:/);
    assert.doesNotMatch(goal, /^\/goal\s+Read workflow-protocol\.md\.?$/i);
    assert.doesNotMatch(goal, /## Workflow Identity/);
    assert.doesNotMatch(goal, /## Evidence Protocol/);

    const afterState = await readFile(path.join(workdir, "task-state.json"), "utf8");
    assert.equal(afterState, beforeState, "render-goal must not alter task-state.json business state");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("public CLI renders goal artifacts through composite-long-task namespace", async () => {
  const root = await createPlanProject();
  try {
    await writeSuperpowersSources(root);
    const cli = path.join(repoRoot, "packages/ty-context/dist/cli.js");
    const workdir = "tmp/ty-context/plan-acceptance/demo";
    const init = spawnSync(process.execPath, [cli, "composite-long-task", "init", workdir], { cwd: root, encoding: "utf8" });
    assert.equal(init.status, 0, init.stderr);
    const compile = spawnSync(process.execPath, [cli, "composite-long-task", "compile", workdir], { cwd: root, encoding: "utf8" });
    assert.equal(compile.status, 0, compile.stderr);
    const render = spawnSync(process.execPath, [cli, "composite-long-task", "render-goal", workdir], { cwd: root, encoding: "utf8" });
    assert.equal(render.status, 0, render.stderr);
    assert.match(render.stdout, /goal-objective\.txt/);
    assert.match(render.stdout, /workflow-protocol\.md/);
    await readFile(path.join(root, workdir, "goal-objective.txt"), "utf8");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
