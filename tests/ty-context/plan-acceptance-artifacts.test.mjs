import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runValidator } from "../../packages/ty-context/dist/lib/validators.js";
import {
  createPlanProject,
  validMatrix,
  validVerdict,
  writeAcceptance,
  writeEvidenceManifest,
  writeFinalVerdictMarkdown
} from "./plan-validator-fixtures.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("validate-plan-acceptance reports warnings and hygiene for optional artifact cleanup", async () => {
  const root = await createPlanProject();
  try {
    const matrix = validMatrix();
    matrix.overall_status = "partial";
    matrix.items[0].status = "partial";
    matrix.items[0].scope_assessment = "old result says accepted complete and final passed";
    const verdict = validVerdict();
    verdict.overall_status = "partial";
    verdict.acceptance_items[0].status = "partial";
    verdict.acceptance_items[0].decision = "previously complete, stale current proof missing";
    verdict.acceptance_items[0].milestones = { stale_label: { status: "done" } };

    await writeAcceptance(root, matrix, verdict);
    const report = await runValidator(root, "validate-plan-acceptance", ["tmp/ty-context/plan-acceptance/demo"]);

    assert.deepEqual(report.errors, []);
    assert.match((report.warnings ?? []).join("\n"), /unsupported milestone status: done/);
    assert.match((report.hygiene ?? []).join("\n"), /stale|overclaim|complete/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("validate CLI prints warnings and hygiene without failing", async () => {
  const root = await createPlanProject();
  try {
    const matrix = validMatrix();
    matrix.overall_status = "partial";
    matrix.items[0].status = "partial";
    matrix.items[0].scope_assessment = "old result says accepted complete and final passed";
    const verdict = validVerdict();
    verdict.overall_status = "partial";
    verdict.acceptance_items[0].status = "partial";
    verdict.acceptance_items[0].decision = "previously complete, stale current proof missing";
    verdict.acceptance_items[0].milestones = { stale_label: { status: "done" } };
    await writeAcceptance(root, matrix, verdict);

    const result = spawnSync(
      process.execPath,
      [path.join(repoRoot, "packages/ty-context/dist/cli.js"), "validate-plan-acceptance", "tmp/ty-context/plan-acceptance/demo"],
      { cwd: root, encoding: "utf8" }
    );

    assert.equal(result.status, 0);
    assert.match(result.stderr, /warning: .*unsupported milestone status: done/);
    assert.match(result.stderr, /hygiene: .*stale or overclaim/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("validate-plan-acceptance rejects raw secrets in complete evidence", async () => {
  const root = await createPlanProject();
  try {
    const verdict = validVerdict();
    verdict.acceptance_items[0].fresh_evidence = [
      "real page route /operations screenshot tmp/ty-context/plan-acceptance/demo/browser.png",
      "Authorization: Bearer sk_live_1234567890abcdef"
    ];
    await writeAcceptance(root, validMatrix(), verdict);
    const report = await runValidator(root, "validate-plan-acceptance", ["tmp/ty-context/plan-acceptance/demo"]);
    assert.match(report.errors.join("\n"), /secret|credential|token|cookie|Authorization/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("validate-plan-acceptance validates optional manifest and active-count references", async () => {
  const root = await createPlanProject();
  try {
    const matrix = validMatrix();
    matrix.items[0].evidence_id = "E-1";
    const verdict = validVerdict();
    verdict.acceptance_items[0].evidence_id = "E-1";
    await writeAcceptance(root, matrix, verdict);
    await writeEvidenceManifest(root, {
      evidence: [
        {
          evidence_id: "E-2",
          slice_id: "S-1",
          slice_goal: "runtime proof",
          touched_plan_item_ids: ["P-1"],
          touched_ac_ids: ["AC-1"],
          missing_layer_classes: ["runtime exercised"],
          proves: ["runtime proof captured"],
          explicitly_does_not_prove: ["UI acceptance"],
          closed_missing_layers: ["runtime exercised"],
          remaining_missing_layers: [],
          cleanup_status: "clean",
          redaction_security_status: "redacted",
          freshness: "current"
        }
      ]
    });
    await writeFinalVerdictMarkdown(
      root,
      `# Final Acceptance Verdict

<!-- generated:active-counts:start -->
complete_count: 0
partial_count: 1
acceptance_required_count: 1
missing_layer_count: 0
<!-- generated:active-counts:end -->
`
    );

    const report = await runValidator(root, "validate-plan-acceptance", ["tmp/ty-context/plan-acceptance/demo"]);
    assert.match(report.errors.join("\n"), /unknown evidence_id: E-1/);
    assert.match(report.errors.join("\n"), /active-count|complete_count|generated/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("validate-plan-acceptance rejects wrong owner-surface proof and live-proof substitution", async () => {
  const root = await createPlanProject();
  try {
    const matrix = validMatrix();
    matrix.items[0].real_page_evidence = ["real page Provider Admission screenshot tmp/ty-context/plan-acceptance/demo/browser.png"];
    const verdict = validVerdict();
    verdict.acceptance_items[0].live_proof_substitution_used = true;
    await writeAcceptance(root, matrix, verdict);

    const report = await runValidator(root, "validate-plan-acceptance", ["tmp/ty-context/plan-acceptance/demo"]);
    assert.match(report.errors.join("\n"), /wrong owner surface|forbidden.*surface/i);
    assert.match(report.errors.join("\n"), /live_proof_substitution_used without approval/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
