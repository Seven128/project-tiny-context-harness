import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export async function createPlanProject() {
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
  await writeFile(path.join(root, "tmp/ty-context/plan-acceptance/demo/ui-assertion-report.json"), "{}", "utf8");
  return root;
}
export async function writeAcceptance(root, matrix, verdict) {
  const dir = path.join(root, "tmp/ty-context/plan-acceptance/demo");
  await writeFile(path.join(dir, "demo-plan-conformance-matrix.json"), JSON.stringify(matrix, null, 2), "utf8");
  await writeFile(path.join(dir, "demo-final-acceptance-verdict.json"), JSON.stringify(verdict, null, 2), "utf8");
}

export async function writeEvidenceManifest(root, manifest) {
  const dir = path.join(root, "tmp/ty-context/plan-acceptance/demo");
  await writeFile(path.join(dir, "demo-evidence-manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
}

export async function writeFinalVerdictMarkdown(root, content) {
  const dir = path.join(root, "tmp/ty-context/plan-acceptance/demo");
  await writeFile(path.join(dir, "demo-final-acceptance-verdict.md"), content, "utf8");
}

export function validMatrix() {
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
export function validVerdict() {
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
