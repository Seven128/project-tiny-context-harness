import test from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { runValidator } from "../../packages/ty-context/dist/lib/validators.js";
import { createPlanProject, validMatrix, validVerdict, writeAcceptance } from "./plan-validator-fixtures.mjs";

test("validate-plan-acceptance rejects complete verdict rows with external-reviewer proof gaps", async () => {
  const cases = [
    {
      mutate(row) {
        row.missing_required_layers = ["runtime exercised"];
      },
      expected: /missing_required_layers is not empty/
    },
    {
      mutate(row) {
        row.drift_severity = "material";
      },
      expected: /drift_severity is material/
    },
    {
      mutate(row) {
        row.sibling_substitution_used = true;
      },
      expected: /sibling_substitution_used without approval/
    },
    {
      mutate(row) {
        row.auditor_status = "partial";
        row.auditor_findings = ["artifact evidence is stale"];
      },
      expected: /auditor_status is partial/
    },
    {
      mutate(row) {
        row.fresh_evidence = ["local audit says complete", "validator pass"];
      },
      expected: /fresh_evidence contains only summary or self-certifying evidence/
    }
  ];

  for (const item of cases) {
    const root = await createPlanProject();
    try {
      const verdict = validVerdict();
      item.mutate(verdict.acceptance_items[0]);
      await writeAcceptance(root, validMatrix(), verdict);
      const report = await runValidator(root, "validate-plan-acceptance", ["tmp/ty-context/plan-acceptance/demo"]);
      assert.match(report.errors.join("\n"), item.expected);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

test("validate-plan-acceptance rejects complete matrix rows with missing proof layers or substitution", async () => {
  const cases = [
    {
      mutate(row) {
        row.missing_required_layers = ["api reflected"];
      },
      expected: /missing_required_layers is not empty/
    },
    {
      mutate(row) {
        row.drift_severity = "critical";
      },
      expected: /drift_severity is critical/
    },
    {
      mutate(row) {
        row.sibling_substitution_used = true;
      },
      expected: /sibling_substitution_used without approval/
    }
  ];

  for (const item of cases) {
    const root = await createPlanProject();
    try {
      const matrix = validMatrix();
      item.mutate(matrix.items[0]);
      await writeAcceptance(root, matrix, validVerdict());
      const report = await runValidator(root, "validate-plan-acceptance", ["tmp/ty-context/plan-acceptance/demo"]);
      assert.match(report.errors.join("\n"), item.expected);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

test("validate-plan-acceptance allows non-complete rows to carry proof gaps for follow-up", async () => {
  const root = await createPlanProject();
  try {
    const matrix = validMatrix();
    matrix.overall_status = "partial";
    matrix.items[0].status = "partial";
    matrix.items[0].missing_required_layers = ["api reflected"];
    matrix.items[0].drift_severity = "material";

    const verdict = validVerdict();
    verdict.overall_status = "partial";
    verdict.acceptance_items[0].status = "partial";
    verdict.acceptance_items[0].missing_required_layers = ["runtime exercised"];
    verdict.acceptance_items[0].auditor_status = "blocked";
    await writeAcceptance(root, matrix, verdict);

    const report = await runValidator(root, "validate-plan-acceptance", ["tmp/ty-context/plan-acceptance/demo"]);
    assert.deepEqual(report.errors, []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
