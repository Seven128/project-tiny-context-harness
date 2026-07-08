import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deriveSuperpowersArtifacts } from "../../packages/ty-context/dist/lib/superpowers-task-derive.js";
import { runFinalGate } from "../../packages/ty-context/dist/lib/superpowers-task-gates.js";
import { validateSuperpowersState } from "../../packages/ty-context/dist/lib/superpowers-task-validator.js";
import { runValidator } from "../../packages/ty-context/dist/lib/validators.js";
import { createPlanProject, validTaskState, writeAcceptance, writeSuperpowersSources, writeTaskState } from "./plan-validator-fixtures.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const cli = path.join(repoRoot, "packages/ty-context/dist/cli.js");
const workdirArg = "tmp/ty-context/plan-acceptance/demo";
const sourceFiles = [
  ["product_architecture_source", "product-architecture-source.md", "intent_scope_boundaries"],
  ["technical_realization_plan", "technical-realization-plan.md", "plan_items_execution_blueprint_conformance"],
  ["acceptance_checklist", "acceptance-checklist.md", "acs_completion_semantics_proof_layers"]
];

test("composite long-task preserves source authority, task-state execution state, append-only events and generated derived views", async () => {
  const root = await createPlanProject();
  try {
    await writeSuperpowersSources(root);
    const workdir = path.join(root, workdirArg);
    const originalSources = await readSources(workdir);

    const init = runCli(root, "composite-long-task", "init", workdirArg);
    assert.equal(init.status, 0, init.stderr);
    await assertEventsAppendOnly(workdir, "", ["task_initialized"]);

    const compile = runCli(root, "composite-long-task", "compile", workdirArg);
    assert.equal(compile.status, 0, compile.stderr);
    const afterCompileEvents = await assertEventsAppendOnly(workdir, await readFile(path.join(workdir, "events.ndjson"), "utf8"), [
      "task_initialized",
      "graph_compiled"
    ]);

    let state = JSON.parse(await readFile(path.join(workdir, "task-state.json"), "utf8"));
    assert.deepEqual(Object.keys(state.sources).sort(), sourceFiles.map(([key]) => key).sort());
    for (const [key, filename, authority] of sourceFiles) {
      assert.equal(state.sources[key].path, filename);
      assert.equal(state.sources[key].authority, authority);
      assert.equal(state.sources[key].sha256, sha256(originalSources[filename]));
    }
    assert.deepEqual(await readSources(workdir), originalSources);

    const assertionRun = runCli(root, "composite-long-task", "run-assertion", workdirArg, "--ac", "AC-001", "--proof-layer", "worker_runtime", "--", process.execPath, "-e", "process.exit(0)");
    assert.equal(assertionRun.status, 0, assertionRun.stderr);
    state = JSON.parse(await readFile(path.join(workdir, "task-state.json"), "utf8"));
    const commandRun = state.command_runs.at(-1);
    const deltaPath = path.join(workdir, "slice-delta.json");
    await writeFile(deltaPath, JSON.stringify(partialSliceDelta(state, commandRun), null, 2), "utf8");
    const apply = runCli(root, "composite-long-task", "apply-slice-delta", workdirArg, path.relative(root, deltaPath));
    assert.equal(apply.status, 0, apply.stderr);
    const afterApplyEvents = await assertEventsAppendOnly(workdir, afterCompileEvents, ["task_initialized", "graph_compiled", "assertion_command_run", "slice_delta_applied"]);
    assert.deepEqual(await readSources(workdir), originalSources);

    const finalGate = runCli(root, "composite-long-task", "final-gate", workdirArg);
    assert.notEqual(finalGate.status, 0);
    assert.match(finalGate.stdout, /final gate product_goal_complete=false/);
    await assertEventsAppendOnly(workdir, afterApplyEvents, ["task_initialized", "graph_compiled", "assertion_command_run", "slice_delta_applied", "final_gate"]);
    assert.deepEqual(await readSources(workdir), originalSources);

    await writeAcceptance(root, { overall_status: "complete", items: [] }, { overall_status: "complete", acceptance_items: [] });
    const legacyReport = await runValidator(root, "validate-plan-acceptance", [workdirArg]);
    assert.match(legacyReport.errors.join("\n"), /missing current satisfied proof layer|missing current attempt command-run record|missing positive assertion/i);
    assert.match(legacyReport.info.join("\n"), /state-backed/i);
    const stateAfterLegacyArtifacts = JSON.parse(await readFile(path.join(workdir, "task-state.json"), "utf8"));
    assert.equal(stateAfterLegacyArtifacts.final.product_goal_complete, false);

    await writeFile(path.join(workdir, "derived/final-acceptance-verdict.json"), JSON.stringify({ overall_status: "complete", acceptance_items: [] }), "utf8");
    const driftReport = await validateSuperpowersState(root, [workdir]);
    assert.match(driftReport.errors.join("\n"), /derived.*final-acceptance-verdict.*does not match task-state/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("hand-set product_goal_complete is rejected when proof layers or Context state are incomplete", async () => {
  const cases = [
    {
      name: "incomplete proof layers",
      mutate(state) {
        state.graph.proof_layers["AC-001.worker_runtime"].status = "missing";
        state.graph.acceptance_criteria["AC-001"].status = "partial";
      },
      expected: /required plan items, ACs or proof layers are incomplete/i
    },
    {
      name: "unresolved Context Delta",
      mutate(state) {
        state.context.product_context_delta = "required";
        state.context.source_to_context_coverage = [{ coverage_status: "new_context_required", owning_context: "project_context/areas/main.md" }];
      },
      expected: /Context Delta coverage is unresolved/i
    }
  ];

  for (const item of cases) {
    const root = await createPlanProject();
    try {
      await writeSuperpowersSources(root);
      const state = validTaskState();
      state.meta.product_goal_complete = true;
      state.final.product_goal_complete = true;
      item.mutate(state);
      await writeTaskState(root, state);

      const report = await validateSuperpowersState(root, [workdirArg]);
      assert.match(report.errors.join("\n"), item.expected, item.name);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

test("sample-only evidence cannot prove full-population completion", async () => {
  const root = await createPlanProject();
  try {
    await writeSuperpowersSources(root);
    const state = validTaskState();
    state.delivery.product_architecture_scope.delivery_scope = "full_population_operation";
    state.delivery.product_architecture_scope.full_population_required = true;
    state.graph.acceptance_criteria["AC-001"].acceptance_scope = "full_population_operation";
    state.graph.acceptance_criteria["AC-001"].full_population_required = true;
    state.meta.product_goal_complete = true;
    state.final.product_goal_complete = true;
    await writeTaskState(root, state);

    const report = await validateSuperpowersState(root, [workdirArg]);
    assert.match(report.errors.join("\n"), /does not prove full population coverage/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("final-gate refuses sample-only evidence for full-population completion", async () => {
  const root = await createPlanProject();
  try {
    await writeSuperpowersSources(root);
    const state = validTaskState();
    state.delivery.product_architecture_scope.delivery_scope = "full_population_operation";
    state.delivery.product_architecture_scope.full_population_required = true;
    state.graph.plan_items["PI-001"].delivery_scope = "full_population_operation";
    state.graph.acceptance_criteria["AC-001"].acceptance_scope = "full_population_operation";
    state.graph.acceptance_criteria["AC-001"].full_population_required = true;
    state.evidence[0].does_not_prove = ["full population operation", "all-interface completion"];
    await writeTaskState(root, state);
    await deriveSuperpowersArtifacts(path.join(root, workdirArg));

    const result = await runFinalGate(path.join(root, workdirArg));
    assert.equal(result.product_goal_complete, false);
    assert.match(result.errors.join("\n"), /full[- ]population.*does not prove|sample/i);
    const updated = JSON.parse(await readFile(path.join(root, workdirArg, "task-state.json"), "utf8"));
    assert.equal(updated.final.product_goal_complete, false);
    assert.equal(updated.final.acceptance_target_status, "partial");
    assert.match(updated.final.next_required_actions.join("\n"), /full[- ]population.*does not prove|sample/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("scope_conflict_requires_decision blocks final completion", async () => {
  const root = await createPlanProject();
  try {
    await writeSuperpowersSources(root);
    const state = validTaskState();
    state.delivery.product_architecture_scope.delivery_scope = "full_population_operation";
    state.delivery.product_architecture_scope.full_population_required = true;
    state.delivery.scope_conflicts = ["scope_conflict_requires_decision: full population source conflicts with capability-only plan"];
    await writeTaskState(root, state);
    const workdir = path.join(root, workdirArg);
    await deriveSuperpowersArtifacts(workdir);

    const result = await runFinalGate(workdir);
    assert.equal(result.product_goal_complete, false);
    assert.match(result.errors.join("\n"), /scope_conflict_requires_decision/i);
    assert.deepEqual(result.errors, [...new Set(result.errors)]);
    const updated = JSON.parse(await readFile(path.join(workdir, "task-state.json"), "utf8"));
    assert.equal(updated.final.audit_task_complete, true);
    assert.equal(updated.final.product_goal_complete, false);
    assert.equal(updated.final.acceptance_target_status, "blocked");
    assert.match(updated.final.next_required_actions.join("\n"), /scope_conflict_requires_decision/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("audit_task_complete is not product_goal_complete", async () => {
  const root = await createPlanProject();
  try {
    await writeSuperpowersSources(root);
    const state = validTaskState();
    state.graph.proof_layers["AC-001.worker_runtime"].status = "missing";
    state.graph.proof_layers["AC-001.worker_runtime"].evidence_ids = [];
    await writeTaskState(root, state);

    const result = await runFinalGate(path.join(root, workdirArg));
    assert.equal(result.product_goal_complete, false);
    const updated = JSON.parse(await readFile(path.join(root, workdirArg, "task-state.json"), "utf8"));
    assert.equal(updated.final.audit_task_complete, true);
    assert.equal(updated.final.product_goal_complete, false);
    assert.equal(updated.meta.audit_task_complete, true);
    assert.equal(updated.meta.product_goal_complete, false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

function runCli(cwd, ...args) {
  return spawnSync(process.execPath, [cli, ...args], { cwd, encoding: "utf8" });
}

async function readSources(workdir) {
  return Object.fromEntries(await Promise.all(sourceFiles.map(async ([, filename]) => [filename, await readFile(path.join(workdir, filename), "utf8")])));
}

async function assertEventsAppendOnly(workdir, previous, expectedTypes) {
  const current = await readFile(path.join(workdir, "events.ndjson"), "utf8");
  assert.equal(current.startsWith(previous), true);
  const events = current
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  assert.deepEqual(
    events.map((event) => event.event_type),
    expectedTypes
  );
  return current;
}

function partialSliceDelta(state, commandRun) {
  const attempt = state.attempts.find((item) => item.task_attempt_id === state.current_attempt_id);
  return {
    slice_id: "S-CLT-001",
    slice_goal: "Close runtime proof",
    touched_plan_items: ["PI-001"],
    touched_acs: ["AC-001"],
    code_changes: ["src/runtime/kernel.ts"],
    evidence_records: [
      {
        schema_version: "evidence-record-v2",
        evidence_id: "EV-CLT-001",
        task_attempt_id: state.current_attempt_id,
        generated_at: commandRun.completed_at ?? commandRun.ended_at,
        source_bundle_hash: attempt.source_bundle_hash,
        product_source_hash: attempt.product_source_hash,
        technical_plan_hash: attempt.technical_plan_hash,
        acceptance_checklist_hash: attempt.acceptance_checklist_hash,
        git_head: attempt.git_head,
        git_status_short: attempt.git_status_short,
        tracked_diff_hash: attempt.tracked_diff_hash,
        relevant_untracked_hash: attempt.relevant_untracked_hash,
        covers_dirty_worktree: true,
        worktree_fingerprint: attempt.worktree_fingerprint,
        command_spec_id: commandRun.command_spec_id,
        command_run_id: commandRun.command_run_id,
        command_line: commandRun.command_line,
        artifact_path: "tmp/ty-context/plan-acceptance/demo/runtime.json",
        artifact_sha256: sha256("{}"),
        artifact_mtime: commandRun.ended_at,
        slice_id: "S-CLT-001",
        type: "runtime_assertion",
        freshness: { created_at: "2026-06-29T00:00:00.000Z", valid_for: "current_worktree", stale_after: null },
        command: "node --test tests/runtime.spec.ts",
        command_exit_code: 0,
        artifact_paths: ["tmp/ty-context/plan-acceptance/demo/runtime.json"],
        proves: ["AC-001.worker_runtime"],
        does_not_prove: ["AC-001.ui_browser", "full_population_operation"],
        redaction: { checked: true, contains_secret: false },
        reviewability: { external_reviewer_can_reproduce: true, reproduction_steps: "Run node --test tests/runtime.spec.ts." },
        assertion_result: {
          schema_version: "assertion-result-v2",
          status: "passed",
          runner: "node:test",
          exit_code: 0,
          target_ac_ids: ["AC-001"],
          target_proof_layers: ["AC-001.worker_runtime"],
          positive_assertions: [{ id: "runtime_job_completed", status: "passed", expected: "complete", actual: "complete" }],
          negative_assertions: [{ id: "runtime_not_blocked", status: "passed", expected: "not blocked", actual: "not blocked" }],
          artifacts: ["tmp/ty-context/plan-acceptance/demo/runtime.json"]
        }
      }
    ],
    closed_layers: ["AC-001.worker_runtime"],
    remaining_layers: ["AC-001.code", "AC-001.ui_browser", "AC-001.test"],
    blockers: [],
    cleanup_assertions: ["runtime fixture cleaned"],
    progress_value: {
      type: "proof_gap_closed",
      closed_items: ["AC-001.worker_runtime"],
      why_it_reduces_rework: "Runtime proof is now mapped to a proof layer."
    }
  };
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}
