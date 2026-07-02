import test from "node:test";
import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderCompositeLongTaskGoal } from "../../packages/ty-context/dist/lib/composite-long-task-renderer.js";
import { initializeSuperpowersTask } from "../../packages/ty-context/dist/lib/superpowers-task-state.js";
import { compileSuperpowersTask } from "../../packages/ty-context/dist/lib/superpowers-task-compile.js";
import { createPlanProject, writeSuperpowersSources } from "./plan-validator-fixtures.mjs";

test("execution-binding records task-local authorities, state paths, commands and completion gate", async () => {
  const root = await createPlanProject();
  try {
    await writeSuperpowersSources(root);
    const workdir = path.join(root, "tmp/ty-context/plan-acceptance/demo");
    await initializeSuperpowersTask(workdir, { taskId: "CLT-BINDING", planSlug: "demo" });
    await compileSuperpowersTask(workdir);
    const result = await renderCompositeLongTaskGoal(workdir);

    const binding = await readFile(path.join(workdir, "execution-binding.md"), "utf8");
    assert.match(binding, /# Composite Long-Task Execution Binding/);
    assert.match(binding, new RegExp(`workdir: ${escapeRegex(path.normalize(workdir))}`));
    assert.match(binding, /protocol: workflow-protocol\.md/);
    assert.match(binding, new RegExp(`protocol_sha256: ${result.protocolSha256}`));
    assert.match(binding, /goal_objective: goal-objective\.txt/);
    assert.match(binding, /product_architecture_source: product-architecture-source\.md/);
    assert.match(binding, /technical_realization_plan: technical-realization-plan\.md/);
    assert.match(binding, /acceptance_checklist: acceptance-checklist\.md/);
    assert.match(binding, /task_state: task-state\.json/);
    assert.match(binding, /events: events\.ndjson/);
    assert.match(binding, /derived_dir: derived\//);
    assert.match(binding, /init: ty-context composite-long-task init <workdir>/);
    assert.match(binding, /compile: ty-context composite-long-task compile <workdir>/);
    assert.match(binding, /derive: ty-context composite-long-task derive <workdir>/);
    assert.match(binding, /apply_slice_delta: ty-context composite-long-task apply-slice-delta <workdir> <slice-delta\.json>/);
    assert.match(binding, /slice_gate: ty-context composite-long-task slice-gate <workdir> --slice <id>/);
    assert.match(binding, /epoch_gate: ty-context composite-long-task epoch-gate <workdir> --epoch <id>/);
    assert.match(binding, /state_validator: ty-context validate-superpowers-state <workdir>/);
    assert.match(binding, /acceptance_validator: ty-context validate-plan-acceptance <workdir>/);
    assert.match(binding, /final_gate: ty-context composite-long-task final-gate <workdir>/);
    assert.match(binding, /product_goal_complete_source: final_gate/);
    assert.match(binding, /cannot_hand_set_product_goal_complete: true/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("render-goal requires initialized compiled state and three source files", async () => {
  const root = await createPlanProject();
  try {
    const workdir = path.join(root, "tmp/ty-context/plan-acceptance/demo");
    await assert.rejects(() => renderCompositeLongTaskGoal(workdir), /product-architecture-source\.md/);
    await writeFile(path.join(workdir, "product-architecture-source.md"), "# Product / Architecture Source\n", "utf8");
    await writeFile(path.join(workdir, "technical-realization-plan.md"), "# Technical Realization Plan\n", "utf8");
    await writeFile(path.join(workdir, "acceptance-checklist.md"), "# Acceptance Checklist\n", "utf8");
    await assert.rejects(() => renderCompositeLongTaskGoal(workdir), /task-state\.json.*init\/compile|initialize/i);
    await initializeSuperpowersTask(workdir, { taskId: "CLT-UNCOMPILED", planSlug: "demo" });
    await assert.rejects(() => renderCompositeLongTaskGoal(workdir), /compiled task-state\.json.*compile/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
