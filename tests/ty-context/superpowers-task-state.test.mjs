import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeSuperpowersTask, applySliceDelta } from "../../packages/ty-context/dist/lib/superpowers-task-state.js";
import { compileSuperpowersTask } from "../../packages/ty-context/dist/lib/superpowers-task-compile.js";
import { createPlanProject, writeSuperpowersSources } from "./plan-validator-fixtures.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
test("superpowers state init and compile create canonical source-hashed graph", async () => {
  const root = await createPlanProject();
  try {
    await writeSuperpowersSources(root);
    const workdir = path.join(root, "tmp/ty-context/plan-acceptance/demo");

    await initializeSuperpowersTask(workdir, { taskId: "SP-TEST-001", planSlug: "demo" });
    await compileSuperpowersTask(workdir);

    const state = JSON.parse(await readFile(path.join(workdir, "task-state.json"), "utf8"));
    const schema = JSON.parse(await readFile(path.join(workdir, "task-state.schema.json"), "utf8"));
    assert.equal(state.meta.schema_version, "superpowers-task-state-v1");
    assert.equal(schema.properties.meta.properties.schema_version.const, "superpowers-task-state-v1");
    assert.equal(state.meta.product_goal_complete, false);
    assert.match(state.sources.product_architecture_source.sha256, /^[a-f0-9]{64}$/);
    assert.ok(state.graph.plan_items["PI-001"]);
    assert.ok(state.graph.acceptance_criteria["AC-001"]);
    assert.ok(state.graph.proof_layers["AC-001.worker_runtime"]);
    assert.deepEqual(state.graph.edges, [{ from: "PI-001", to: "AC-001", type: "supports" }]);
    assert.match(state.current_attempt_id, /^ATT-/);
    assert.equal(state.attempts.length, 1);
    assert.equal(state.attempts[0].task_attempt_id, state.current_attempt_id);
    assert.match(state.attempts[0].source_bundle_hash, /^[a-f0-9]{64}$/);
    assert.match(state.attempts[0].worktree_fingerprint, /^[a-f0-9]{64}$/);
    assert.ok(state.required_command_specs.length >= 1);
    assert.match(state.required_command_specs[0].command_spec_id, /^[a-f0-9]{64}$/);
    assert.equal(state.required_command_specs[0].ac_id, "AC-001");
    assert.deepEqual(state.required_command_specs[0].proof_layers, ["code", "worker_runtime", "ui_browser", "test"]);
    assert.deepEqual(state.command_runs, []);
    assert.deepEqual(state.negative_evidence_records, []);

    const events = await readFile(path.join(workdir, "events.ndjson"), "utf8");
    assert.match(events, /"event_type":"task_initialized"/);
    assert.match(events, /"event_type":"graph_compiled"/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("compile parses Product Source, plan item and AC delivery boundaries", async () => {
  const root = await createPlanProject();
  try {
    await writeSuperpowersSources(root);
    const workdir = path.join(root, "tmp/ty-context/plan-acceptance/demo");

    await initializeSuperpowersTask(workdir, { taskId: "SP-TEST-DELIVERY", planSlug: "demo" });
    await compileSuperpowersTask(workdir);

    const state = JSON.parse(await readFile(path.join(workdir, "task-state.json"), "utf8"));
    assert.equal(state.delivery.product_architecture_scope.delivery_scope, "system_capability_build");
    assert.equal(state.delivery.product_architecture_scope.full_population_required, false);
    assert.deepEqual(state.delivery.product_architecture_scope.representative_samples_validate, ["recovery happy path sample"]);
    assert.deepEqual(state.delivery.product_architecture_scope.representative_samples_do_not_validate, ["full population operation"]);
    assert.deepEqual(state.delivery.product_architecture_scope.out_of_scope_backlog, ["historical record migration"]);

    assert.equal(state.graph.plan_items["PI-001"].delivery_scope, "system_capability_build");
    assert.equal(state.graph.plan_items["PI-001"].capability_target, "reusable runtime recovery capability");
    assert.deepEqual(state.graph.plan_items["PI-001"].representative_samples, ["recovery happy path sample"]);
    assert.equal(state.graph.plan_items["PI-001"].full_population_boundary, "not required for capability build");
    assert.deepEqual(state.graph.plan_items["PI-001"].non_required_population, ["historical record migration"]);

    assert.equal(state.graph.acceptance_criteria["AC-001"].acceptance_scope, "system_capability_build");
    assert.deepEqual(state.graph.acceptance_criteria["AC-001"].ac_validates, ["reusable runtime recovery capability"]);
    assert.deepEqual(state.graph.acceptance_criteria["AC-001"].ac_does_not_validate, ["full population operation"]);
    assert.equal(state.graph.acceptance_criteria["AC-001"].sample_boundary, "recovery happy path sample");
    assert.equal(state.graph.acceptance_criteria["AC-001"].full_population_required, false);
    assert.equal(state.progress.full_population_operation_progress.status, "not_in_scope");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("compile records scope conflicts when source, plan and AC disagree", async () => {
  const root = await createPlanProject();
  try {
    await writeSuperpowersSources(root);
    const workdir = path.join(root, "tmp/ty-context/plan-acceptance/demo");
    await writeFile(
      path.join(workdir, "acceptance-checklist.md"),
      `# Acceptance Checklist

## AC-001: Every real object is operated on.

acceptance_scope: full_population_operation
ac_validates:
  - full population operation
ac_does_not_validate:
  - framework-only capability
  - full population operation
sample_boundary: no sample substitute
full_population_required: true
related_plan_items:
  - PI-001
required_proof_layers:
  - code
  - worker_runtime
  - ui_browser
  - test
assertion_command: node --test tests/runtime.spec.ts
assertion_artifacts:
  - tmp/ty-context/plan-acceptance/demo/runtime.json
positive_assertions:
  - full population operation
negative_assertions:
  - framework-only capability
machine_blocking: true
invalid_completion_signals:
  - framework-only capability
assertion_result_required: true
`,
      "utf8"
    );

    await initializeSuperpowersTask(workdir, { taskId: "SP-TEST-CONFLICT", planSlug: "demo" });
    await compileSuperpowersTask(workdir);

    const state = JSON.parse(await readFile(path.join(workdir, "task-state.json"), "utf8"));
    assert.match(state.delivery.scope_conflicts.join("\n"), /scope_conflict_requires_decision/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("apply-slice-delta records progress value, evidence and closes proof layers", async () => {
  const root = await createPlanProject();
  try {
    await writeSuperpowersSources(root);
    const workdir = path.join(root, "tmp/ty-context/plan-acceptance/demo");
    await initializeSuperpowersTask(workdir, { taskId: "SP-TEST-001", planSlug: "demo" });
    await compileSuperpowersTask(workdir);

    const deltaPath = path.join(workdir, "slice-delta.json");
    await writeFile(
      deltaPath,
      JSON.stringify(
        {
          slice_id: "S-001",
          slice_goal: "Close runtime proof",
          touched_plan_items: ["PI-001"],
          touched_acs: ["AC-001"],
          code_changes: ["src/runtime/kernel.ts"],
          evidence_records: [
            {
              evidence_id: "EV-001",
              slice_id: "S-001",
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

    await applySliceDelta(workdir, deltaPath);

    const state = JSON.parse(await readFile(path.join(workdir, "task-state.json"), "utf8"));
    assert.equal(state.graph.proof_layers["AC-001.worker_runtime"].status, "satisfied");
    assert.deepEqual(state.graph.proof_layers["AC-001.worker_runtime"].evidence_ids, ["EV-001"]);
    assert.equal(state.evidence[0].evidence_id, "EV-001");
    assert.equal(state.slices[0].progress_value.type, "proof_gap_closed");

    const events = await readFile(path.join(workdir, "events.ndjson"), "utf8");
    assert.match(events, /"event_type":"slice_delta_applied"/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("apply-slice-delta rejects non-canonical progress value types", async () => {
  const root = await createPlanProject();
  try {
    await writeSuperpowersSources(root);
    const workdir = path.join(root, "tmp/ty-context/plan-acceptance/demo");
    await initializeSuperpowersTask(workdir, { taskId: "SP-TEST-PROGRESS-TYPE", planSlug: "demo" });
    await compileSuperpowersTask(workdir);

    const deltaPath = path.join(workdir, "slice-delta-invalid-progress.json");
    await writeFile(
      deltaPath,
      JSON.stringify(
        {
          slice_id: "S-BAD-PROGRESS",
          progress_value: {
            type: "closed_required_proof_layer",
            closed_items: ["AC-001.worker_runtime"],
            why_it_reduces_rework: "Legacy progress type should be rejected."
          }
        },
        null,
        2
      ),
      "utf8"
    );

    await assert.rejects(
      () => applySliceDelta(workdir, deltaPath),
      /progress_value\.type must be one of functional_gap_closed, proof_gap_closed, blocker_resolved, invalid_evidence_removed/
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("composite long-task CLI namespace initializes, compiles and recommends next slices", async () => {
  const root = await createPlanProject();
  try {
    await writeSuperpowersSources(root);
    const cli = path.join(repoRoot, "packages/ty-context/dist/cli.js");
    const workdir = "tmp/ty-context/plan-acceptance/demo";

    const init = spawnSync(process.execPath, [cli, "composite-long-task", "init", workdir], { cwd: root, encoding: "utf8" });
    assert.equal(init.status, 0, init.stderr);
    assert.match(init.stdout, /task-state\.json/);

    const compile = spawnSync(process.execPath, [cli, "composite-long-task", "compile", workdir], { cwd: root, encoding: "utf8" });
    assert.equal(compile.status, 0, compile.stderr);
    assert.match(compile.stdout, /compiled/);

    const deltaPath = path.join(root, workdir, "slice-delta.json");
    await writeFile(
      deltaPath,
      JSON.stringify(
        {
          slice_id: "S-CLI-001",
          slice_goal: "Close CLI runtime proof",
          touched_plan_items: ["PI-001"],
          touched_acs: ["AC-001"],
          code_changes: ["src/runtime/kernel.ts"],
          evidence_records: [
            {
              evidence_id: "EV-CLI-001",
              slice_id: "S-CLI-001",
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
    const apply = spawnSync(process.execPath, [cli, "composite-long-task", "apply-slice-delta", workdir, deltaPath], { cwd: root, encoding: "utf8" });
    assert.equal(apply.status, 0, apply.stderr);
    assert.match(apply.stdout, /derived files=/);
    await readFile(path.join(root, workdir, "derived", "plan-conformance-matrix.json"), "utf8");

    const next = spawnSync(process.execPath, [cli, "composite-long-task", "next-slices", workdir, "--limit", "3"], {
      cwd: root,
      encoding: "utf8"
    });
    assert.equal(next.status, 0, next.stderr);
    assert.match(next.stdout, /Next 3 high-value clusters|PI-001|AC-001/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
