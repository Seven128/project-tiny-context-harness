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
    assert.deepEqual(matrix.items[0].required_proof_layers, ["AC-001.code", "AC-001.runtime", "AC-001.ui_browser", "AC-001.test"]);
    assert.equal(verdict.acceptance_items[0].status, "complete");
    assert.deepEqual(verdict.acceptance_items[0].missing_required_layers, []);

    const evidenceIndex = await readFile(path.join(workdir, "derived/evidence-index.md"), "utf8");
    assert.match(evidenceIndex, /EV-001/);
    assert.match(evidenceIndex, /does_not_prove/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
