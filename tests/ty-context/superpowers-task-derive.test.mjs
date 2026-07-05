import test from "node:test";
import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { deriveSuperpowersArtifacts } from "../../packages/ty-context/dist/lib/superpowers-task-derive.js";
import { createPlanProject, validTaskState, writeSuperpowersSources, writeTaskState } from "./plan-validator-fixtures.mjs";

test("derive-superpowers-artifacts writes generated matrix verdict progress evidence and context views", async () => {
  const root = await createPlanProject();
  try {
    await writeSuperpowersSources(root);
    await writeTaskState(root, validTaskState());
    const workdir = path.join(root, "tmp/ty-context/plan-acceptance/demo");

    const result = await deriveSuperpowersArtifacts(workdir);

    assert.ok(result.files.some((file) => file.endsWith("derived/plan-conformance-matrix.json")));
    assert.ok(result.files.some((file) => file.endsWith("derived/final-acceptance-verdict.json")));
    assert.ok(result.files.some((file) => file.endsWith("derived/progress-ledger.md")));
    assert.ok(result.files.some((file) => file.endsWith("derived/evidence-index.md")));
    assert.ok(result.files.some((file) => file.endsWith("derived/context-alignment.md")));
    assert.ok(result.files.some((file) => file.endsWith("derived/final-summary.md")));

    const matrix = JSON.parse(await readFile(path.join(workdir, "derived/plan-conformance-matrix.json"), "utf8"));
    const verdict = JSON.parse(await readFile(path.join(workdir, "derived/final-acceptance-verdict.json"), "utf8"));
    assert.equal(matrix.items[0].status, "complete");
    assert.equal(matrix.items[0].delivery_scope, "system_capability_build");
    assert.equal(matrix.items[0].capability_target, "reusable runtime recovery capability");
    assert.deepEqual(matrix.items[0].representative_samples, ["recovery happy path sample"]);
    assert.equal(matrix.items[0].full_population_boundary, "not required for capability build");
    assert.deepEqual(matrix.items[0].non_required_population, ["historical record migration"]);
    assert.deepEqual(matrix.items[0].required_proof_layers, ["AC-001.code", "AC-001.worker_runtime", "AC-001.ui_browser", "AC-001.test"]);
    assert.deepEqual(matrix.items[0].invalid_evidence, []);
    assert.deepEqual(matrix.items[0].forbidden_shortcuts_hit, []);
    assert.equal(matrix.items[0].decision, "accept");
    assert.equal(verdict.acceptance_items[0].status, "complete");
    assert.equal(verdict.acceptance_items[0].acceptance_scope, "system_capability_build");
    assert.deepEqual(verdict.acceptance_items[0].ac_validates, ["reusable runtime recovery capability"]);
    assert.deepEqual(verdict.acceptance_items[0].ac_does_not_validate, ["full population operation"]);
    assert.equal(verdict.acceptance_items[0].sample_boundary, "recovery happy path sample");
    assert.equal(verdict.acceptance_items[0].full_population_required, false);
    assert.equal(verdict.acceptance_items[0].full_population_status, "not_in_scope");
    assert.deepEqual(verdict.acceptance_items[0].missing_required_layers, []);
    assert.deepEqual(verdict.acceptance_items[0].invalid_completion_signals, ["页面无明显变化"]);
    assert.deepEqual(verdict.acceptance_items[0].required_next_evidence, []);

    const progress = JSON.parse(await readFile(path.join(workdir, "derived/progress-ledger.json"), "utf8"));
    assert.equal(progress.system_capability_progress.status, "complete");
    assert.equal(progress.representative_sample_progress.status, "complete");
    assert.equal(progress.real_object_coverage.status, "sampled_only");
    assert.equal(progress.full_population_operation_progress.status, "not_in_scope");
    assert.equal(progress.acceptance_progress.status, "complete");
    assert.equal(progress.engineering_implementation_progress.status, "complete");
    assert.equal(progress.runtime_proof_progress.status, "complete");
    assert.equal(progress.proof_layer_milestones.length, 4);
    assert.equal(progress.artifact_budget.evidence_records, 3);
    assert.equal(progress.workflow_overhead.slices, 1);

    const evidenceIndex = await readFile(path.join(workdir, "derived/evidence-index.md"), "utf8");
    assert.match(evidenceIndex, /EV-001/);
    assert.match(evidenceIndex, /does_not_prove/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
