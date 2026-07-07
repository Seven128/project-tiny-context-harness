import test from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import path from "node:path";
import { deriveSuperpowersArtifacts } from "../../packages/ty-context/dist/lib/superpowers-task-derive.js";
import { runFinalGate } from "../../packages/ty-context/dist/lib/superpowers-task-gates.js";
import { evaluateTrustedEvidenceKernel } from "../../packages/ty-context/dist/lib/superpowers-task-evidence-kernel.js";
import { detectHarnessDrift } from "../../packages/ty-context/dist/lib/superpowers-task-harness-drift.js";
import { evaluateProtectedBaseline } from "../../packages/ty-context/dist/lib/superpowers-task-protected-baseline.js";
import { assertionBackedTaskState } from "./composite-long-task-assertion-fixtures.mjs";
import { createPlanProject, writeSuperpowersSources, writeTaskState } from "./plan-validator-fixtures.mjs";

test("trusted evidence kernel is the only completion path for a fresh happy path", async () => {
  const root = await createPlanProject();
  try {
    await writeSuperpowersSources(root);
    const state = assertionBackedTaskState();
    await writeTaskState(root, state);
    const workdir = path.join(root, "tmp/ty-context/plan-acceptance/demo");
    await deriveSuperpowersArtifacts(workdir);

    const kernel = await evaluateTrustedEvidenceKernel(workdir);
    assert.equal(kernel.product_goal_complete, true);
    assert.equal(kernel.acceptance_target_status, "complete");
    assert.deepEqual(kernel.errors, []);

    const result = await runFinalGate(workdir);
    assert.equal(result.product_goal_complete, true);
    const refreshed = await evaluateTrustedEvidenceKernel(workdir);
    assert.equal(refreshed.product_goal_complete, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("machine-blocking AC with incomplete assertion contract is under_specified and blocks PI completion", async () => {
  const root = await createPlanProject();
  try {
    await writeSuperpowersSources(root);
    const state = assertionBackedTaskState();
    delete state.graph.acceptance_criteria["AC-001"].assertion_command;
    state.graph.acceptance_criteria["AC-001"].final_evidence_expected = ["final-acceptance-verdict.json"];
    await writeTaskState(root, state);
    const workdir = path.join(root, "tmp/ty-context/plan-acceptance/demo");

    const kernel = await evaluateTrustedEvidenceKernel(workdir);
    assert.equal(kernel.product_goal_complete, false);
    assert.equal(kernel.ac_statuses["AC-001"], "under_specified");
    assert.equal(kernel.pi_statuses["PI-001"], "blocked");
    assert.match(kernel.errors.join("\n"), /under_specified|assertion_command|final_evidence_expected/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("AC-010 summary-only pass cannot bootstrap a failed required AC", async () => {
  const root = await createPlanProject();
  try {
    await writeSuperpowersSources(root);
    const state = assertionBackedTaskState();
    const ac001 = state.graph.acceptance_criteria["AC-001"];
    state.graph.acceptance_criteria["AC-004"] = {
      ...structuredClone(ac001),
      scope: "Runtime failure remains visible.",
      related_plan_items: ["PI-001"],
      required_proof_layers: ["ui_browser"],
      status: "partial"
    };
    state.graph.proof_layers["AC-004.ui_browser"] = { required: true, status: "missing", evidence_ids: [] };
    state.graph.acceptance_criteria["AC-010"] = {
      ...structuredClone(ac001),
      scope: "Final gate summary says all ACs passed.",
      related_plan_items: ["PI-001"],
      required_proof_layers: ["test"],
      assertion_command: "node tools/final-gate-summary.mjs",
      final_evidence_expected: ["derived/final-acceptance-verdict.json"],
      status: "complete"
    };
    state.graph.proof_layers["AC-010.test"] = { required: true, status: "satisfied", evidence_ids: ["EV-003"] };
    state.graph.plan_items["PI-001"].related_acs = ["AC-001", "AC-004", "AC-010"];
    await writeTaskState(root, state);
    const workdir = path.join(root, "tmp/ty-context/plan-acceptance/demo");

    const kernel = await evaluateTrustedEvidenceKernel(workdir);
    assert.equal(kernel.product_goal_complete, false);
    assert.equal(kernel.ac_statuses["AC-010"], "invalidated");
    assert.match(kernel.errors.join("\n"), /final_gate_cannot_bootstrap_from_summary_only|AC-004/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("product_task harness edits are blocked by Harness Drift Lock", async () => {
  const cases = [
    "tests/runtime.spec.ts",
    "packages/ty-context/src/lib/superpowers-task-gates.ts",
    "packages/ty-context/src/lib/superpowers-task-command-specs.ts"
  ];

  for (const changedFile of cases) {
    const state = assertionBackedTaskState();
    state.attempts[0].mode = "product_task";
    state.attempts[0].changed_files = [changedFile];

    const drift = detectHarnessDrift(state);
    assert.equal(drift.harness_drift_detected, true, changedFile);
    assert.equal(drift.acceptance_target_status, "blocked", changedFile);
    assert.equal(drift.product_goal_complete, false, changedFile);
    assert.match(drift.errors.join("\n"), new RegExp(`harness_drift_detected|独立 harness_task|${changedFile.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i"));
  }
});

test("harness_task requires adversarial fixtures and never proves product completion", async () => {
  const missingFixtures = assertionBackedTaskState();
  missingFixtures.attempts[0].mode = "harness_task";
  missingFixtures.attempts[0].changed_files = ["packages/ty-context/src/lib/superpowers-task-gates.ts"];

  let drift = detectHarnessDrift(missingFixtures);
  assert.equal(drift.product_goal_complete, false);
  assert.match(drift.errors.join("\n"), /harness_task_missing_adversarial_fixtures/i);

  const withFixtures = assertionBackedTaskState();
  withFixtures.attempts[0].mode = "harness_task";
  withFixtures.attempts[0].changed_files = ["packages/ty-context/src/lib/superpowers-task-gates.ts"];
  withFixtures.gates.harness_task_fixtures = {
    stale_evidence: false,
    historical_complete: false,
    derived_contradiction: false,
    ac010_summary_only: false,
    target_mismatch: false,
    api_only_for_ui: false,
    negative_evidence_after_pass: false,
    source_hash_mismatch: false,
    dirty_worktree_mismatch: false,
    missing_assertion_result: false,
    test_weakening: false,
    happy_path: true
  };
  drift = detectHarnessDrift(withFixtures);
  assert.equal(drift.harness_task_final_verdict, "passed");
  assert.equal(drift.product_goal_complete, false);
  assert.deepEqual(drift.errors, []);
});

test("protected baseline blocks product tasks and requires harness-task reason", async () => {
  const productTask = assertionBackedTaskState();
  productTask.attempts[0].mode = "product_task";
  productTask.attempts[0].changed_files = ["packages/ty-context/assets/protected-harness-baseline.json"];
  let baseline = evaluateProtectedBaseline(productTask);
  assert.equal(baseline.product_goal_complete, false);
  assert.match(baseline.errors.join("\n"), /protected_baseline_changed|product_task/i);

  const harnessTask = assertionBackedTaskState();
  harnessTask.attempts[0].mode = "harness_task";
  harnessTask.attempts[0].changed_files = ["packages/ty-context/assets/protected-harness-baseline.json"];
  baseline = evaluateProtectedBaseline(harnessTask);
  assert.match(baseline.errors.join("\n"), /protected_baseline_reason_required/i);

  harnessTask.gates.protected_baseline = { reason: "tighten final-gate evidence kernel protected paths" };
  baseline = evaluateProtectedBaseline(harnessTask);
  assert.deepEqual(baseline.errors, []);
});
