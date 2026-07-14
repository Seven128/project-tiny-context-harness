import test from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { runValidator } from "../../packages/ty-context/dist/lib/validators.js";
import {
  createPlanProject,
  validMatrix,
  validVerdict,
  writeAcceptance
} from "./plan-validator-fixtures.mjs";
test("validate-plan-acceptance accepts consistent matrix and verdict artifacts", async () => {
  const root = await createPlanProject();
  try {
    await writeAcceptance(root, validMatrix(), validVerdict());
    const report = await runValidator(root, "validate-plan-acceptance", ["tmp/ty-context/plan-acceptance/demo"]);
    assert.deepEqual(report.errors, []);
    assert.match(report.info.join("\n"), /Plan acceptance artifact consistency passed/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("validate-plan-acceptance rejects complete verdict rows with missing evidence", async () => {
  const root = await createPlanProject();
  try {
    const verdict = validVerdict();
    verdict.acceptance_items[0].missing_evidence = ["browser proof gap"];
    await writeAcceptance(root, validMatrix(), verdict);
    const report = await runValidator(root, "validate-plan-acceptance", ["tmp/ty-context/plan-acceptance/demo"]);
    assert.match(report.errors.join("\n"), /missing_evidence is not empty/);
    assert.match(report.errors.join("\n"), /weak-proof language/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("validate-plan-acceptance rejects complete matrix rows with missing paths", async () => {
  const root = await createPlanProject();
  try {
    const matrix = validMatrix();
    matrix.items[0].missing_paths = ["src/runtime/kernel.ts"];
    await writeAcceptance(root, matrix, validVerdict());
    const report = await runValidator(root, "validate-plan-acceptance", ["tmp/ty-context/plan-acceptance/demo"]);
    assert.match(report.errors.join("\n"), /missing_paths is not empty/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("validate-plan-acceptance rejects missing matrix/verdict cross references", async () => {
  const root = await createPlanProject();
  try {
    const matrix = validMatrix();
    delete matrix.items[0].acceptance_ids;
    const verdict = validVerdict();
    delete verdict.acceptance_items[0].related_plan_item_ids;
    await writeAcceptance(root, matrix, verdict);
    const report = await runValidator(root, "validate-plan-acceptance", ["tmp/ty-context/plan-acceptance/demo"]);
    assert.match(report.errors.join("\n"), /must include acceptance_ids or related_plan_item_ids/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("validate-plan-acceptance rejects UI-facing ACs without fresh real-page evidence", async () => {
  const root = await createPlanProject();
  try {
    const verdict = validVerdict();
    verdict.acceptance_items[0].fresh_evidence = ["unit test tests/runtime.spec.ts"];
    await writeAcceptance(root, validMatrix(), verdict);
    const report = await runValidator(root, "validate-plan-acceptance", ["tmp/ty-context/plan-acceptance/demo"]);
    assert.match(report.errors.join("\n"), /lacks fresh real-page evidence/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("validate-plan-acceptance rejects surface rows without user path or negative surface checks", async () => {
  const root = await createPlanProject();
  try {
    const matrix = validMatrix();
    delete matrix.items[0].required_user_paths;
    delete matrix.items[0].negative_surface_checks;
    await writeAcceptance(root, matrix, validVerdict());
    const report = await runValidator(root, "validate-plan-acceptance", ["tmp/ty-context/plan-acceptance/demo"]);
    assert.match(report.errors.join("\n"), /required_user_paths is empty/);
    assert.match(report.errors.join("\n"), /negative_surface_checks is empty/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("validate-plan-acceptance rejects required user paths routed through forbidden surfaces", async () => {
  const root = await createPlanProject();
  try {
    const matrix = validMatrix();
    matrix.items[0].required_user_paths = ["Provider Admission -> runtime recovery"];
    await writeAcceptance(root, matrix, validVerdict());
    const report = await runValidator(root, "validate-plan-acceptance", ["tmp/ty-context/plan-acceptance/demo"]);
    assert.match(report.errors.join("\n"), /forbidden surface: Provider Admission/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("validate-plan-acceptance rejects required Context Delta without context fact refs", async () => {
  const root = await createPlanProject();
  try {
    const matrix = validMatrix();
    matrix.context_delta = "required";
    delete matrix.items[0].context_fact_refs;
    const verdict = validVerdict();
    delete verdict.acceptance_items[0].context_fact_refs;
    await writeAcceptance(root, matrix, verdict);
    const report = await runValidator(root, "validate-plan-acceptance", ["tmp/ty-context/plan-acceptance/demo"]);
    assert.match(report.errors.join("\n"), /Context Delta is required.*context_fact_refs/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("validate-plan-acceptance allows structured out_of_scope_NA rows", async () => {
  const root = await createPlanProject();
  try {
    const matrix = validMatrix();
    matrix.items[0] = {
      plan_item_id: "P-1",
      acceptance_ids: ["AC-1"],
      status: "out_of_scope_NA",
      na_reason: "Runner sidecar was explicitly excluded from this task.",
      scope_source: "Acceptance Checklist section Scope"
    };
    const verdict = validVerdict();
    verdict.acceptance_items[0] = {
      ac_id: "AC-1",
      related_plan_item_ids: ["P-1"],
      status: "out_of_scope_NA",
      na_reason: "Runner sidecar was explicitly excluded from this task.",
      scope_source: "Acceptance Checklist section Scope"
    };
    await writeAcceptance(root, matrix, verdict);
    const report = await runValidator(root, "validate-plan-acceptance", ["tmp/ty-context/plan-acceptance/demo"]);
    assert.deepEqual(report.errors, []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("validate-plan-acceptance rejects unstructured out_of_scope_NA rows", async () => {
  const root = await createPlanProject();
  try {
    const matrix = validMatrix();
    matrix.items[0].status = "out_of_scope_NA";
    await writeAcceptance(root, matrix, validVerdict());
    const report = await runValidator(root, "validate-plan-acceptance", ["tmp/ty-context/plan-acceptance/demo"]);
    assert.match(report.errors.join("\n"), /out_of_scope_NA but lacks/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
