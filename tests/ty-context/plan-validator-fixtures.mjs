import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
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
  return root;
}

export async function writePlan(root, content) {
  await writeFile(path.join(root, "plan.md"), content, "utf8");
}

export async function writeAcceptance(root, matrix, verdict) {
  const dir = path.join(root, "tmp/ty-context/plan-acceptance/demo");
  await writeFile(path.join(dir, "demo-plan-conformance-matrix.json"), JSON.stringify(matrix, null, 2), "utf8");
  await writeFile(path.join(dir, "demo-final-acceptance-verdict.json"), JSON.stringify(verdict, null, 2), "utf8");
}

export async function writeSuperpowersSources(root) {
  const dir = path.join(root, "tmp/ty-context/plan-acceptance/demo");
  await writeFile(
    path.join(dir, "product-architecture-source.md"),
    "# Product / Architecture Source\n\nOperations owns runtime recovery on the real owner surface.\n",
    "utf8"
  );
  await writeFile(
    path.join(dir, "technical-realization-plan.md"),
    "# Technical Realization Plan\n\n- PI-001: Implement runtime recovery on Operations.\n  - owner_surfaces: Operations\n  - implementation_paths: src/pages/OperationsPage.tsx, src/runtime/kernel.ts\n  - required_tests: tests/runtime.spec.ts\n  - related_acs: AC-001\n",
    "utf8"
  );
  await writeFile(
    path.join(dir, "acceptance-checklist.md"),
    "# Acceptance Checklist\n\n- AC-001: Operations runtime recovery works on the owner surface.\n  - related_plan_items: PI-001\n  - required_proof_layers: code, runtime, ui_browser, test\n",
    "utf8"
  );
}

export function validTaskState(overrides = {}) {
  const sourceText = {
    product_architecture_source: "# Product / Architecture Source\n\nOperations owns runtime recovery on the real owner surface.\n",
    technical_realization_plan:
      "# Technical Realization Plan\n\n- PI-001: Implement runtime recovery on Operations.\n  - owner_surfaces: Operations\n  - implementation_paths: src/pages/OperationsPage.tsx, src/runtime/kernel.ts\n  - required_tests: tests/runtime.spec.ts\n  - related_acs: AC-001\n",
    acceptance_checklist:
      "# Acceptance Checklist\n\n- AC-001: Operations runtime recovery works on the owner surface.\n  - related_plan_items: PI-001\n  - required_proof_layers: code, runtime, ui_browser, test\n"
  };
  const state = {
    meta: {
      task_id: "SP-TEST-001",
      plan_slug: "demo",
      created_at: "2026-06-29T00:00:00.000Z",
      updated_at: "2026-06-29T00:00:00.000Z",
      schema_version: "superpowers-task-state-v1",
      goal_type: "implementation",
      product_goal_complete: false,
      acceptance_target_status: "not_run",
      audit_task_complete: false
    },
    sources: {
      product_architecture_source: {
        path: "product-architecture-source.md",
        sha256: sha256(sourceText.product_architecture_source),
        authority: "intent_scope_boundaries"
      },
      technical_realization_plan: {
        path: "technical-realization-plan.md",
        sha256: sha256(sourceText.technical_realization_plan),
        authority: "plan_items_execution_blueprint_conformance"
      },
      acceptance_checklist: {
        path: "acceptance-checklist.md",
        sha256: sha256(sourceText.acceptance_checklist),
        authority: "acs_completion_semantics_proof_layers"
      }
    },
    context: {
      product_context_delta: "none",
      technical_context_delta: "none",
      source_to_context_coverage: [],
      context_to_implementation_binding: []
    },
    graph: {
      plan_items: {
        "PI-001": {
          requirement: "Implement runtime recovery on Operations.",
          owner_surfaces: ["Operations"],
          forbidden_surfaces: ["Provider Admission"],
          implementation_paths: ["src/pages/OperationsPage.tsx", "src/runtime/kernel.ts"],
          required_tests: ["tests/runtime.spec.ts"],
          status: "complete",
          related_acs: ["AC-001"],
          required_proof_layers: ["AC-001.code", "AC-001.runtime", "AC-001.ui_browser", "AC-001.test"]
        }
      },
      acceptance_criteria: {
        "AC-001": {
          scope: "Operations runtime recovery works on the owner surface.",
          related_plan_items: ["PI-001"],
          required_proof_layers: ["code", "runtime", "ui_browser", "test"],
          status: "complete"
        }
      },
      proof_layers: {
        "AC-001.code": { required: true, status: "satisfied", evidence_ids: ["EV-001"] },
        "AC-001.runtime": { required: true, status: "satisfied", evidence_ids: ["EV-001"] },
        "AC-001.ui_browser": { required: true, status: "satisfied", evidence_ids: ["EV-002"] },
        "AC-001.test": { required: true, status: "satisfied", evidence_ids: ["EV-003"] }
      },
      edges: [{ from: "PI-001", to: "AC-001", type: "supports" }]
    },
    slices: [
      {
        slice_id: "S-001",
        slice_goal: "Close runtime and browser proof layers",
        touched_plan_items: ["PI-001"],
        touched_acs: ["AC-001"],
        code_changes: ["src/pages/OperationsPage.tsx", "src/runtime/kernel.ts"],
        evidence_records: ["EV-001", "EV-002", "EV-003"],
        closed_layers: ["AC-001.code", "AC-001.runtime", "AC-001.ui_browser", "AC-001.test"],
        remaining_layers: [],
        blockers: [],
        cleanup_assertions: ["test DB reset"],
        progress_value: {
          type: "closed_required_proof_layer",
          closed_items: ["AC-001.code", "AC-001.runtime", "AC-001.ui_browser", "AC-001.test"],
          why_it_reduces_rework: "All required proof layers now map to fresh evidence."
        }
      }
    ],
    evidence: [
      evidenceRecord("EV-001", "runtime", ["AC-001.code", "AC-001.runtime"], ["AC-001.ui_browser"]),
      evidenceRecord("EV-002", "browser", ["AC-001.ui_browser"], ["AC-001.security"]),
      evidenceRecord("EV-003", "test", ["AC-001.test"], ["all-provider coverage"])
    ],
    gates: { validator: { status: "not_run" }, auditor: { auditor_status: "pass", findings: [] } },
    progress: {},
    blockers: [],
    final: {
      product_goal_complete: false,
      acceptance_target_status: "not_run",
      audit_task_complete: false,
      completion_basis: []
    },
    ...overrides
  };
  return state;
}

export async function writeTaskState(root, state = validTaskState()) {
  const dir = path.join(root, "tmp/ty-context/plan-acceptance/demo");
  await writeFile(path.join(dir, "task-state.json"), JSON.stringify(state, null, 2), "utf8");
}

export async function writeDerivedMatrix(root, matrix) {
  const dir = path.join(root, "tmp/ty-context/plan-acceptance/demo/derived");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "plan-conformance-matrix.json"), JSON.stringify(matrix, null, 2), "utf8");
}

export async function writeDerivedVerdict(root, verdict) {
  const dir = path.join(root, "tmp/ty-context/plan-acceptance/demo/derived");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "final-acceptance-verdict.json"), JSON.stringify(verdict, null, 2), "utf8");
}

export async function writeEvidenceManifest(root, manifest) {
  const dir = path.join(root, "tmp/ty-context/plan-acceptance/demo");
  await writeFile(path.join(dir, "demo-evidence-manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
}

export async function writeFinalVerdictMarkdown(root, content) {
  const dir = path.join(root, "tmp/ty-context/plan-acceptance/demo");
  await writeFile(path.join(dir, "demo-final-acceptance-verdict.md"), content, "utf8");
}

export function validPlan() {
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

function evidenceRecord(evidenceId, type, proves, doesNotProve) {
  return {
    evidence_id: evidenceId,
    slice_id: "S-001",
    type,
    freshness: {
      created_at: "2026-06-29T00:00:00.000Z",
      valid_for: "current_worktree",
      stale_after: null
    },
    command: type === "browser" ? "browser screenshot route /operations" : "npm test --workspace project-tiny-context-harness",
    artifact_paths:
      type === "browser"
        ? ["tmp/ty-context/plan-acceptance/demo/browser.png"]
        : ["tmp/ty-context/plan-acceptance/demo/runtime.json"],
    proves,
    does_not_prove: doesNotProve,
    redaction: {
      checked: true,
      contains_secret: false
    },
    reviewability: {
      external_reviewer_can_reproduce: true,
      reproduction_steps: type === "browser" ? "Open route /operations and inspect browser screenshot." : "Run the recorded command."
    }
  };
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}
