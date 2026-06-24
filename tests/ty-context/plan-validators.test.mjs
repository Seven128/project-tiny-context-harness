import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runValidator } from "../../packages/ty-context/dist/lib/validators.js";
test("validate-plan-contract accepts split source and implementation binding tables", async () => {
  const root = await createPlanProject();
  try {
    await writePlan(root, validPlan());
    const report = await runValidator(root, "validate-plan-contract", ["plan.md"]);
    assert.deepEqual(report.errors, []);
    assert.match(report.info.join("\n"), /Plan contract validation passed/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("validate-plan-contract rejects old mixed Source-to-Context table and unresolved coverage", async () => {
  const root = await createPlanProject();
  try {
    await writePlan(
      root,
      validPlan().replace(
        "Source item | Durable constraint | Type | Existing Context Hit | Context action | Owning Context | Coverage status",
        "Source item | Durable constraint | Type | Existing Context Hit | Context action | Owning Context | Implementation constraint | Coverage status"
      ).replace("| P-1 | Operations owns runtime recovery | surface | `project_context/areas/main.md` | none | `project_context/areas/main.md` | covered |", "| P-1 | Operations owns runtime recovery | surface |  | update missing |  | missing implementation binding | new_context_required |")
    );
    const report = await runValidator(root, "validate-plan-contract", ["plan.md"]);
    assert.match(report.errors.join("\n"), /must not include Implementation constraint/);
    assert.match(report.errors.join("\n"), /new_context_required/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("validate-plan-contract rejects non-bound or weak implementation binding", async () => {
  const root = await createPlanProject();
  try {
    await writePlan(
      root,
      validPlan().replace("| B-1 |", "| B-1 checked path |").replace("| bound |", "| partial |")
    );
    const report = await runValidator(root, "validate-plan-contract", ["plan.md"]);
    assert.match(report.errors.join("\n"), /partial/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("validate-plan-contract rejects referenced paths that do not exist", async () => {
  const root = await createPlanProject();
  try {
    await writePlan(root, validPlan().replace("src/pages/OperationsPage.tsx", "src/pages/MissingPage.tsx"));
    const report = await runValidator(root, "validate-plan-contract", ["plan.md"]);
    assert.match(report.errors.join("\n"), /references missing path: src\/pages\/MissingPage\.tsx/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("validate-plan-acceptance accepts consistent matrix and verdict artifacts", async () => {
  const root = await createPlanProject();
  try {
    await writeAcceptance(root, validMatrix(), validVerdict());
    const report = await runValidator(root, "validate-plan-acceptance", ["tmp/ty-context/plan-acceptance/demo"]);
    assert.deepEqual(report.errors, []);
    assert.match(report.info.join("\n"), /Plan acceptance validation passed/);
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
async function createPlanProject() {
  const root = await mkdtemp(path.join(os.tmpdir(), "ty-context-plan-validator-"));
  for (const dir of [
    "project_context/areas",
    "src/pages",
    "src/runtime",
    "tests",
    "tmp/ty-context/plan-acceptance/demo"
  ]) {
    await mkdir(path.join(root, dir), { recursive: true });
  }
  await writeFile(path.join(root, "project_context/areas/main.md"), "# Main\n", "utf8");
  await writeFile(path.join(root, "src/pages/OperationsPage.tsx"), "export const page = true;\n", "utf8");
  await writeFile(path.join(root, "src/runtime/kernel.ts"), "export const runtime = true;\n", "utf8");
  await writeFile(path.join(root, "tests/runtime.spec.ts"), "export const test = true;\n", "utf8");
  await writeFile(path.join(root, "tmp/ty-context/plan-acceptance/demo/browser.png"), "fake", "utf8");
  await writeFile(path.join(root, "tmp/ty-context/plan-acceptance/demo/runtime.json"), "{}", "utf8");
  return root;
}

async function writePlan(root, content) {
  await writeFile(path.join(root, "plan.md"), content, "utf8");
}

async function writeAcceptance(root, matrix, verdict) {
  const dir = path.join(root, "tmp/ty-context/plan-acceptance/demo");
  await writeFile(path.join(dir, "demo-plan-conformance-matrix.json"), JSON.stringify(matrix, null, 2), "utf8");
  await writeFile(path.join(dir, "demo-final-acceptance-verdict.json"), JSON.stringify(verdict, null, 2), "utf8");
}

function validPlan() {
  return `# Plan

## Source-to-Context Coverage

| Source item | Durable constraint | Type | Existing Context Hit | Context action | Owning Context | Coverage status |
|---|---|---|---|---|---|---|
| P-1 | Operations owns runtime recovery | surface | \`project_context/areas/main.md\` | none | \`project_context/areas/main.md\` | covered |

## Context-to-Implementation Binding

| Context fact | Implementation obligation | Expected surfaces | Implemented paths | Forbidden shortcuts | Verification path | Binding status |
|---|---|---|---|---|---|---|
| \`project_context/areas/main.md\` | Operations page exposes runtime recovery | ui page, runtime api | \`src/pages/OperationsPage.tsx\`, \`src/runtime/kernel.ts\` | component-only | \`tests/runtime.spec.ts\`, browser route /operations screenshot \`tmp/ty-context/plan-acceptance/demo/browser.png\` | bound |
`;
}

function validMatrix() {
  return {
    overall_status: "complete",
    items: [
      {
        plan_item_id: "P-1",
        plan_requirement: "Operations owns runtime recovery",
        acceptance_ids: ["AC-1"],
        status: "complete",
        conformance_type: "product_surface",
        owner_surface: "Operations",
        required_user_paths: ["Operations -> Runtime recovery"],
        forbidden_primary_surfaces: ["Provider Admission", "Crawl Plans"],
        negative_surface_checks: ["browser route /provider-admission confirms runtime recovery is not primary"],
        default_visibility_required: true,
        real_page_evidence: ["default-visible real page route /operations screenshot tmp/ty-context/plan-acceptance/demo/browser.png"],
        context_fact_refs: ["project_context/areas/main.md"],
        expected_surfaces: ["ui", "runtime"],
        implemented_paths: ["src/pages/OperationsPage.tsx", "src/runtime/kernel.ts"],
        missing_paths: [],
        tests: ["tests/runtime.spec.ts"],
        runtime_evidence: ["tmp/ty-context/plan-acceptance/demo/runtime.json"],
        scope_assessment: "full",
        drift: "no drift detected"
      }
    ]
  };
}

function validVerdict() {
  return {
    overall_status: "complete",
    acceptance_items: [
      {
        ac_id: "AC-1",
        related_plan_item_ids: ["P-1"],
        status: "complete",
        required_evidence: ["UI page recovery is visible"],
        fresh_evidence: ["real page route /operations screenshot tmp/ty-context/plan-acceptance/demo/browser.png"],
        missing_evidence: [],
        contradictions: [],
        context_fact_refs: ["project_context/areas/main.md"],
        decision: "accept"
      }
    ]
  };
}
