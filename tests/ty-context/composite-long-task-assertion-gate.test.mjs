import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { compileSuperpowersTask } from "../../packages/ty-context/dist/lib/superpowers-task-compile.js";
import { deriveSuperpowersArtifacts } from "../../packages/ty-context/dist/lib/superpowers-task-derive.js";
import { runFinalGate } from "../../packages/ty-context/dist/lib/superpowers-task-gates.js";
import { initializeSuperpowersTask } from "../../packages/ty-context/dist/lib/superpowers-task-state.js";
import { validateSuperpowersState } from "../../packages/ty-context/dist/lib/superpowers-task-validator.js";
import { runValidator } from "../../packages/ty-context/dist/lib/validators.js";
import { assertionBackedTaskState } from "./composite-long-task-assertion-fixtures.mjs";
import { createPlanProject, writeSuperpowersSources, writeTaskState } from "./plan-validator-fixtures.mjs";

test("assertion-backed runtime UI and test evidence validates and final-gate completes", async () => {
  const root = await createPlanProject();
  try {
    await writeSuperpowersSources(root);
    await writeTaskState(root, assertionBackedTaskState());
    const workdir = path.join(root, "tmp/ty-context/plan-acceptance/demo");
    await deriveSuperpowersArtifacts(workdir);

    const report = await validateSuperpowersState(root, [workdir]);
    assert.deepEqual(report.errors, []);

    const acceptanceReport = await runValidator(root, "validate-plan-acceptance", [workdir]);
    assert.deepEqual(acceptanceReport.errors, []);

    const result = await runFinalGate(workdir);
    assert.deepEqual(result.errors, []);
    assert.equal(result.product_goal_complete, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("adversarial weak evidence cases A-I block validation and final completion", async () => {
  const cases = [
    {
      name: "A: ui_browser satisfied from browser type without assertion_result",
      mutate(state) {
        delete state.evidence[1].assertion_result;
      },
      expected: /missing assertion result|ui_browser proof not machine-backed/i
    },
    {
      name: "B: screenshot artifact only cannot satisfy UI Path AC",
      mutate(state) {
        state.evidence[1].type = "screenshot";
        delete state.evidence[1].assertion_result;
      },
      expected: /screenshot.*cannot satisfy|missing assertion result|ui_browser proof not machine-backed/i
    },
    {
      name: "C: failed assertion result blocks proof layer",
      mutate(state) {
        state.evidence[1].assertion_result.status = "failed";
        state.evidence[1].assertion_result.exit_code = 1;
        state.evidence[1].command_exit_code = 1;
      },
      expected: /assertion.*failed|exit code/i
    },
    {
      name: "D: negative assertion or forbidden owner state invalidates AC",
      mutate(state) {
        state.evidence[1].assertion_result.negative_assertions[0].status = "failed";
        state.evidence[1].assertion_result.negative_assertions[0].forbidden_text = "未验证";
        state.evidence[1].negative_evidence_scan.status = "failed";
        state.evidence[1].negative_evidence_scan.forbidden_findings[0] = {
          id: "no-unverified",
          status: "found",
          forbidden_text: "未验证",
          actual: "页面显示未验证"
        };
      },
      expected: /negative evidence|forbidden|未验证/i
    },
    {
      name: "E: UI assertion missing action-level run and polling proof blocks UI Path AC",
      mutate(state) {
        state.evidence[1].assertion_result.action = "";
        state.evidence[1].assertion_result.positive_assertions.push(
          { id: "run_id_present", status: "failed", expected: "run id visible", actual: "" },
          { id: "polling_observed", status: "failed", expected: "polling reached final state", actual: "not_run" }
        );
      },
      expected: /action|run_id_present|polling_observed|positive assertion/i
    },
    {
      name: "F: API-only evidence cannot satisfy UI Path AC",
      mutate(state) {
        state.evidence[1].type = "api_assertion";
      },
      expected: /API-only cannot satisfy UI Path AC|ui_browser evidence type/i
    },
    {
      name: "G: assertion target AC mismatch blocks proof layer",
      mutate(state) {
        state.evidence[1].assertion_result.target_ac_ids = ["AC-999"];
      },
      expected: /target AC|AC-001/i
    },
    {
      name: "H: stale assertion report blocks proof layer",
      mutate(state) {
        state.evidence[1].assertion_result.status = "stale";
      },
      expected: /stale|assertion/i
    },
    {
      name: "I: auditor pass cannot replace missing assertion report",
      mutate(state) {
        delete state.evidence[1].assertion_result;
        state.gates.auditor = { auditor_status: "pass", findings: [] };
      },
      expected: /missing assertion result|auditor.*not.*proof|ui_browser proof not machine-backed/i
    }
  ];

  for (const item of cases) {
    const root = await createPlanProject();
    try {
      await writeSuperpowersSources(root);
      const state = assertionBackedTaskState();
      item.mutate(state);
      await writeTaskState(root, state);
      const workdir = path.join(root, "tmp/ty-context/plan-acceptance/demo");
      await deriveSuperpowersArtifacts(workdir);

      const report = await validateSuperpowersState(root, [workdir]);
      assert.match(report.errors.join("\n"), item.expected, item.name);

      const acceptanceReport = await runValidator(root, "validate-plan-acceptance", [workdir]);
      assert.match(acceptanceReport.errors.join("\n"), item.expected, `${item.name} through validate-plan-acceptance`);

      const finalGate = await runFinalGate(workdir);
      assert.equal(finalGate.product_goal_complete, false, item.name);
      assert.match(finalGate.errors.join("\n"), item.expected, `${item.name} through final-gate`);
      const finalState = JSON.parse(await readFile(path.join(workdir, "task-state.json"), "utf8"));
      assert.match(finalState.final.acceptance_target_status, /partial|invalidated/);
      assert.ok(finalState.final.next_required_actions.length > 0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

test("SFC stale passed evidence and current owner-surface failures force final-gate false", async () => {
  const root = await createPlanProject();
  try {
    await writeSuperpowersSources(root);
    const state = assertionBackedTaskState();
    state.command_runs.push({
      command_run_id: "CR-current-failed-ui",
      task_attempt_id: state.current_attempt_id,
      command_spec_id: state.required_command_specs[0].command_spec_id,
      ac_id: "AC-001",
      proof_layer: "ui_browser",
      command_line: "npx playwright test tests/runtime.spec.ts --grep recovery",
      exit_code: 1,
      started_at: "2026-07-02T00:00:00.000Z",
      ended_at: "2026-07-02T00:01:00.000Z",
      artifact_paths: ["test-results/.last-run.json"]
    });
    await writeTaskState(root, state);
    const workdir = path.join(root, "tmp/ty-context/plan-acceptance/demo");
    await deriveSuperpowersArtifacts(workdir);

    await writeCurrentFailureArtifacts(workdir);
    await writeFile(
      path.join(workdir, "events.ndjson"),
      `${JSON.stringify({ event_type: "final_gate", product_goal_complete: true, created_at: "2026-06-29T00:00:00.000Z" })}\n`,
      "utf8"
    );

    const report = await validateSuperpowersState(root, [workdir]);
    assert.match(
      report.errors.join("\n"),
      /current contradiction|command_run_failed|playwright_last_run_failed|owner_dom_forbidden_state|historical_complete_ignored/i
    );

    const acceptanceReport = await runValidator(root, "validate-plan-acceptance", [workdir]);
    assert.match(acceptanceReport.errors.join("\n"), /current contradiction|command_run_failed|playwright_last_run_failed|owner_dom_forbidden_state/i);

    const result = await runFinalGate(workdir);
    assert.equal(result.product_goal_complete, false);
    assert.match(result.errors.join("\n"), /workflow_gate_bug_prevented|command_run_failed|playwright_last_run_failed|owner_dom_forbidden_state/i);
    const finalState = JSON.parse(await readFile(path.join(workdir, "task-state.json"), "utf8"));
    assert.equal(finalState.final.product_goal_complete, false);
    assert.equal(finalState.meta.product_goal_complete, false);
    assert.match(finalState.final.acceptance_target_status, /invalidated|partial/);
    assert.match(finalState.gates.final_gate.errors.join("\n"), /Historical stale completion event detected and ignored/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("derived matrix and verdict expose assertion status and negative evidence findings", async () => {
  const root = await createPlanProject();
  try {
    await writeSuperpowersSources(root);
    const state = assertionBackedTaskState();
    state.evidence[1].assertion_result.status = "failed";
    state.evidence[1].assertion_result.positive_assertions[0].status = "failed";
    state.evidence[1].negative_evidence_scan.forbidden_findings[0] = {
      id: "no-unavailable",
      status: "found",
      forbidden_text: "不可用",
      actual: "不可用"
    };
    await writeTaskState(root, state);
    const workdir = path.join(root, "tmp/ty-context/plan-acceptance/demo");

    await deriveSuperpowersArtifacts(workdir);

    const matrix = JSON.parse(await readFile(path.join(workdir, "derived/plan-conformance-matrix.json"), "utf8"));
    const verdict = JSON.parse(await readFile(path.join(workdir, "derived/final-acceptance-verdict.json"), "utf8"));
    const evidenceIndex = JSON.parse(await readFile(path.join(workdir, "derived/evidence-index.json"), "utf8"));
    assert.equal(matrix.items[0].assertion_status, "failed");
    assert.match(matrix.items[0].blocking_assertion_failures.join("\n"), /ui_owner_surface_loaded|assertion_result.status=failed/i);
    assert.match(matrix.items[0].negative_evidence_findings.join("\n"), /不可用/);
    assert.equal(verdict.acceptance_items[0].assertion_status, "failed");
    assert.match(verdict.acceptance_items[0].blocking_assertion_failures.join("\n"), /ui_owner_surface_loaded|assertion_result.status=failed/i);
    assert.match(verdict.acceptance_items[0].negative_evidence_findings.join("\n"), /不可用/);
    assert.equal(verdict.acceptance_items[0].decision, "continue");
    assert.equal(evidenceIndex.proof_layers["AC-001.ui_browser"].assertion_status, "failed");
    assert.deepEqual(evidenceIndex.proof_layers["AC-001.ui_browser"].evidence_ids, ["EV-002"]);
    assert.match(evidenceIndex.evidence["EV-002"].negative_evidence_scan.forbidden_findings[0].actual, /不可用/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function writeCurrentFailureArtifacts(workdir) {
  const playwrightDir = path.join(workdir, "test-results");
  await mkdir(playwrightDir, { recursive: true });
  await writeFile(
    path.join(playwrightDir, ".last-run.json"),
    JSON.stringify(
      {
        status: "failed",
        failedTests: ["tests/runtime.spec.ts::recovery"],
        target_ac_ids: ["AC-001"],
        target_proof_layers: ["AC-001.ui_browser"],
        started_at: "2026-07-01T00:00:00.000Z",
        ended_at: "2026-07-01T00:01:00.000Z"
      },
      null,
      2
    ),
    "utf8"
  );
  await writeFile(
    path.join(playwrightDir, "error-context.md"),
    [
      "# Error Context",
      "",
      "target_ac_ids: AC-001",
      "target_proof_layers: AC-001.ui_browser",
      "owner_surface: Operations",
      "route: /operations",
      "DOM text: 尚未运行自测 / 运行未记录"
    ].join("\n"),
    "utf8"
  );
}

test("compile derives assertion requirements from checklist proof and test fields", async () => {
  const root = await createPlanProject();
  try {
    const workdir = path.join(root, "tmp/ty-context/plan-acceptance/demo");
    await initializeSuperpowersTask(workdir, { taskId: "SP-ASSERTION-REQ", planSlug: "demo" });
    await writeFile(
      path.join(workdir, "product-architecture-source.md"),
      `# Product / Architecture Source

delivery_scope: system_capability_build
full_population_required: false
representative_samples_validate:
  - recovery happy path sample
representative_samples_do_not_validate:
  - full population operation
out_of_scope_backlog:
  - historical record migration
scope_fit_decision: fit_for_three_inputs
selected_scope_fit_slice: none
owner_boundary: Product source owns Operations recovery fixture.
primary_capability_path: Operations -> runtime recovery
non_completing_outcomes:
  - full population operation
assertion_policy: machine layers require assertion reports
source_authority: product source
product_goal: runtime recovery fixture
`,
      "utf8"
    );
    await writeFile(
      path.join(workdir, "technical-realization-plan.md"),
      `# Technical Realization Plan

## PI-001: Implement runtime recovery on Operations.

delivery_scope: system_capability_build
capability_target: reusable runtime recovery capability
representative_samples:
  - recovery happy path sample
full_population_boundary: not required for capability build
non_required_population:
  - historical record migration
owner_boundary: Operations and runtime kernel own recovery behavior
primary_capability_path: Operations UI triggers runtime recovery
trigger_contract: user starts recovery
state_transition_contract: recovery transitions to complete
observable_result_contract: UI and runtime artifact show completion
assertion_support: browser and runtime command assertions target AC-001
required_assertion_commands:
  - node --test tests/runtime.spec.ts
invalid_implementation_shortcuts:
  - screenshot-only
owner_surfaces:
  - Operations
implementation_paths:
  - src/pages/OperationsPage.tsx
required_tests:
  - tests/runtime.spec.ts
related_acs:
  - AC-001
`,
      "utf8"
    );
    await writeFile(
      path.join(workdir, "acceptance-checklist.md"),
      `# Acceptance Checklist

## AC-001: Operations runtime recovery works on the owner surface.

acceptance_scope: system_capability_build
ac_validates:
  - reusable runtime recovery capability
ac_does_not_validate:
  - full population operation
sample_boundary: recovery happy path sample
full_population_required: false
related_plan_items:
  - PI-001
required_proof_layers:
  - ui_browser
  - worker_runtime
  - test
assertion_command: node --test tests/runtime.spec.ts
assertion_artifacts:
  - tmp/ty-context/plan-acceptance/demo/runtime.json
positive_assertions:
  - ui_owner_surface_loaded
negative_assertions:
  - 页面无明显变化
machine_blocking: true
invalid_completion_signals:
  - 页面无明显变化
assertion_result_required: true
required_test_ids:
  - tests/runtime.spec.ts::happy-path
verification_method: browser assertion and runtime command assertion
fail_conditions:
  - 页面无明显变化
invalid_evidence:
  - screenshot-only
final_evidence_expected:
  - owner route assertion report
test_cases:
  - ui_owner_surface_loaded
  - polling_reaches_final_state
`,
      "utf8"
    );

    const state = await compileSuperpowersTask(workdir);
    const requirements = state.graph.acceptance_criteria["AC-001"].assertion_requirements;
    assert.ok(Array.isArray(requirements));
    assert.deepEqual(
      requirements.map((item) => [item.proof_layer, item.machine_blocking, item.required_test_ids]),
      [
        ["ui_browser", true, ["tests/runtime.spec.ts::happy-path"]],
        ["worker_runtime", true, ["tests/runtime.spec.ts::happy-path"]],
        ["test", true, ["tests/runtime.spec.ts::happy-path"]]
      ]
    );
    assert.ok(requirements.every((item) => item.positive_assertions.includes("ui_owner_surface_loaded")));
    assert.ok(requirements.every((item) => item.negative_assertions.includes("页面无明显变化")));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
