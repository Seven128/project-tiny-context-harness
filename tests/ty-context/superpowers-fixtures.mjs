import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const productArchitectureSourceText = `# Product / Architecture Source

Operations owns runtime recovery on the real owner surface.

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
owner_boundary: Product source owns Operations runtime recovery scope.
primary_capability_path: Operations -> runtime recovery -> assertion-backed completion
non_completing_outcomes:
  - full population operation
assertion_policy: machine layers require assertion_result and negative_evidence_scan where owner-surface contradictions are possible
source_authority: intent_scope_boundaries
product_goal: Reusable runtime recovery capability on Operations
surface_ia_lock: Operations remains owner surface
decision_lock: capability build only
context_delta: none
source_to_context_coverage: covered
acceptance_semantics: assertion-backed machine proof
impact: source-workspace fixture
`;

const technicalRealizationPlanText = `# Technical Realization Plan

## PI-001: Implement runtime recovery on Operations.

delivery_scope: system_capability_build
capability_target: reusable runtime recovery capability
representative_samples:
  - recovery happy path sample
full_population_boundary: not required for capability build
non_required_population:
  - historical record migration
owner_surfaces:
  - Operations
forbidden_surfaces:
  - Provider Admission
owner_boundary: Operations page and runtime kernel own recovery execution.
primary_capability_path: Operations UI triggers runtime kernel recovery and observes completion.
trigger_contract: user starts recovery from Operations owner surface
state_transition_contract: recovery request transitions from queued to complete
observable_result_contract: Operations page and runtime artifact show the completed run id
assertion_support: Playwright and runtime assertions target AC-001 worker_runtime ui_browser and test layers
required_assertion_commands:
  - node --test tests/runtime.spec.ts
invalid_implementation_shortcuts:
  - component screenshot only
implementation_paths:
  - src/pages/OperationsPage.tsx
  - src/runtime/kernel.ts
required_tests:
  - tests/runtime.spec.ts
related_acs:
  - AC-001
`;

const acceptanceChecklistText = `# Acceptance Checklist

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
  - code
  - worker_runtime
  - ui_browser
  - test
assertion_command: node --test tests/runtime.spec.ts
assertion_artifacts:
  - tmp/ty-context/plan-acceptance/demo/runtime.json
  - tmp/ty-context/plan-acceptance/demo/ui-assertion-report.json
positive_assertions:
  - required_behavior_observed
negative_assertions:
  - no-forbidden-final-state
machine_blocking: true
invalid_completion_signals:
  - 页面无明显变化
assertion_result_required: true
ac_type: machine_verifiable
proof_chain:
  - AC-001.worker_runtime
  - AC-001.ui_browser
  - AC-001.test
verification_method:
  - browser assertion
  - runtime assertion
fail_conditions:
  - 页面无明显变化
invalid_evidence:
  - screenshot-only
substitution_policy:
  - no sibling substitution
missing_layer_downgrade: partial
auditor_expectation: verify owner surface and runtime assertions
out_of_scope_na_approval_source: none
required_test_ids:
  - tests/runtime.spec.ts
explicit_no_test_scope: false
hard_blockers:
  - missing assertion_result
validates_explanation: validates reusable runtime recovery capability
does_not_validate_explanation: does not validate full population operation
final_evidence_expected:
  - assertion report
test_cases:
  - happy path
`;

export async function writeSuperpowersSources(root) {
  const dir = path.join(root, "tmp/ty-context/plan-acceptance/demo");
  await writeFile(path.join(dir, "product-architecture-source.md"), productArchitectureSourceText, "utf8");
  await writeFile(path.join(dir, "technical-realization-plan.md"), technicalRealizationPlanText, "utf8");
  await writeFile(path.join(dir, "acceptance-checklist.md"), acceptanceChecklistText, "utf8");
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

export function validTaskState(overrides = {}) {
  const sourceText = {
    product_architecture_source: productArchitectureSourceText,
    technical_realization_plan: technicalRealizationPlanText,
    acceptance_checklist: acceptanceChecklistText
  };
  const currentAttemptId = "ATT-TEST-001";
  const worktreeFingerprint = "b".repeat(64);
  const productSourceHash = sha256(sourceText.product_architecture_source);
  const technicalPlanHash = sha256(sourceText.technical_realization_plan);
  const acceptanceChecklistHash = sha256(sourceText.acceptance_checklist);
  const commandSpecBase = {
    ac_id: "AC-001",
    proof_layers: ["code", "worker_runtime", "ui_browser", "test"],
    command: "node --test tests/runtime.spec.ts",
    assertion_artifacts: [
      "tmp/ty-context/plan-acceptance/demo/runtime.json",
      "tmp/ty-context/plan-acceptance/demo/ui-assertion-report.json"
    ],
    required_test_ids: ["tests/runtime.spec.ts"],
    machine_blocking: true,
    assertion_result_required: true,
    positive_assertions: ["required_behavior_observed"],
    negative_assertions: ["no-forbidden-final-state"],
    invalid_completion_signals: ["页面无明显变化"],
    final_evidence_expected: ["assertion report"]
  };
  const commandSpecId = commandSpecIdFor(commandSpecBase);
  const commandSpec = { command_spec_id: commandSpecId, ...commandSpecBase };
  const specsHash = requiredCommandSpecsHash([commandSpec]);
  const sourceBundleHash = sha256(
    stableJson({
      product_source_hash: productSourceHash,
      technical_plan_hash: technicalPlanHash,
      acceptance_checklist_hash: acceptanceChecklistHash,
      required_command_specs_hash: specsHash
    })
  );
  const commandRuns = ["worker_runtime", "ui_browser", "test"].map((layer) => ({
    command_run_id: `CR-${layer}`,
    task_attempt_id: currentAttemptId,
    command_spec_id: commandSpecId,
    ac_id: "AC-001",
    proof_layer: layer,
    command_line: layer === "ui_browser" ? "npx playwright test tests/runtime.spec.ts --grep recovery" : "npm test --workspace project-tiny-context-harness",
    exit_code: 0,
    started_at: "2026-07-01T00:00:00.000Z",
    completed_at: "2026-07-01T00:01:00.000Z",
    ended_at: "2026-07-01T00:01:00.000Z",
    artifact_paths: []
  }));
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
      product_architecture_source: { path: "product-architecture-source.md", sha256: productSourceHash, authority: "intent_scope_boundaries" },
      technical_realization_plan: { path: "technical-realization-plan.md", sha256: technicalPlanHash, authority: "plan_items_execution_blueprint_conformance" },
      acceptance_checklist: { path: "acceptance-checklist.md", sha256: acceptanceChecklistHash, authority: "acs_completion_semantics_proof_layers" }
    },
    context: {
      product_context_delta: "none",
      technical_context_delta: "none",
      source_to_context_coverage: [],
      context_to_implementation_binding: []
    },
    delivery: {
      product_architecture_scope: {
        delivery_scope: "system_capability_build",
        full_population_required: false,
        representative_samples_validate: ["recovery happy path sample"],
        representative_samples_do_not_validate: ["full population operation"],
        out_of_scope_backlog: ["historical record migration"],
        scope_fit_decision: "fit_for_three_inputs",
        selected_scope_fit_slice: "none",
        owner_boundary: "Product source owns Operations runtime recovery scope.",
        primary_capability_path: "Operations -> runtime recovery -> assertion-backed completion",
        non_completing_outcomes: ["full population operation"],
        assertion_policy: "machine layers require assertion_result and negative_evidence_scan where owner-surface contradictions are possible",
        source_authority: "intent_scope_boundaries",
        product_goal: "Reusable runtime recovery capability on Operations",
        surface_ia_lock: "Operations remains owner surface",
        decision_lock: "capability build only",
        context_delta: "none",
        source_to_context_coverage: "covered",
        acceptance_semantics: "assertion-backed machine proof",
        impact: "source-workspace fixture"
      },
      scope_conflicts: []
    },
    graph: {
      plan_items: {
        "PI-001": {
          requirement: "Implement runtime recovery on Operations.",
          source_file: "technical-realization-plan.md",
          source_start_line: 3,
          source_end_line: 23,
          delivery_scope: "system_capability_build",
          capability_target: "reusable runtime recovery capability",
          representative_samples: ["recovery happy path sample"],
          full_population_boundary: "not required for capability build",
          non_required_population: ["historical record migration"],
          owner_boundary: "Operations page and runtime kernel own recovery execution.",
          primary_capability_path: "Operations UI triggers runtime kernel recovery and observes completion.",
          trigger_contract: "user starts recovery from Operations owner surface",
          state_transition_contract: "recovery request transitions from queued to complete",
          observable_result_contract: "Operations page and runtime artifact show the completed run id",
          assertion_support: "Playwright and runtime assertions target AC-001 worker_runtime ui_browser and test layers",
          required_assertion_commands: ["node --test tests/runtime.spec.ts"],
          invalid_implementation_shortcuts: ["component screenshot only"],
          owner_surfaces: ["Operations"],
          forbidden_surfaces: ["Provider Admission"],
          implementation_paths: ["src/pages/OperationsPage.tsx", "src/runtime/kernel.ts"],
          required_tests: ["tests/runtime.spec.ts"],
          status: "complete",
          related_acs: ["AC-001"],
          required_proof_layers: ["AC-001.code", "AC-001.worker_runtime", "AC-001.ui_browser", "AC-001.test"],
          proof_layer_ids: ["AC-001.code", "AC-001.worker_runtime", "AC-001.ui_browser", "AC-001.test"]
        }
      },
      acceptance_criteria: {
        "AC-001": {
          scope: "Operations runtime recovery works on the owner surface.",
          source_file: "acceptance-checklist.md",
          source_start_line: 3,
          source_end_line: 21,
          acceptance_scope: "system_capability_build",
          ac_validates: ["reusable runtime recovery capability"],
          ac_does_not_validate: ["full population operation"],
          sample_boundary: "recovery happy path sample",
          full_population_required: false,
          related_plan_items: ["PI-001"],
          required_proof_layers: ["code", "worker_runtime", "ui_browser", "test"],
          assertion_command: "node --test tests/runtime.spec.ts",
          assertion_artifacts: [
            "tmp/ty-context/plan-acceptance/demo/runtime.json",
            "tmp/ty-context/plan-acceptance/demo/ui-assertion-report.json"
          ],
          positive_assertions: ["required_behavior_observed"],
          negative_assertions: ["no-forbidden-final-state"],
          machine_blocking: true,
          invalid_completion_signals: ["页面无明显变化"],
          assertion_result_required: true,
          ac_type: "machine_verifiable",
          proof_chain: ["AC-001.worker_runtime", "AC-001.ui_browser", "AC-001.test"],
          verification_method: ["browser assertion", "runtime assertion"],
          fail_conditions: ["页面无明显变化"],
          invalid_evidence: ["screenshot-only"],
          substitution_policy: ["no sibling substitution"],
          missing_layer_downgrade: "partial",
          auditor_expectation: "verify owner surface and runtime assertions",
          out_of_scope_na_approval_source: "none",
          required_test_ids: ["tests/runtime.spec.ts"],
          explicit_no_test_scope: false,
          hard_blockers: ["missing assertion_result"],
          validates_explanation: "validates reusable runtime recovery capability",
          does_not_validate_explanation: "does not validate full population operation",
          final_evidence_expected: ["assertion report"],
          test_cases: ["happy path"],
          status: "complete"
        }
      },
      proof_layers: {
        "AC-001.code": { required: true, status: "satisfied", evidence_ids: ["EV-001"] },
        "AC-001.worker_runtime": { required: true, status: "satisfied", evidence_ids: ["EV-001"] },
        "AC-001.ui_browser": { required: true, status: "satisfied", evidence_ids: ["EV-002"] },
        "AC-001.test": { required: true, status: "satisfied", evidence_ids: ["EV-003"] }
      },
      edges: [{ from: "PI-001", to: "AC-001", type: "supports" }]
    },
    attempts: [
      {
        task_attempt_id: currentAttemptId,
        source_bundle_hash: sourceBundleHash,
        product_source_hash: productSourceHash,
        technical_plan_hash: technicalPlanHash,
        acceptance_checklist_hash: acceptanceChecklistHash,
        git_head: "no-git",
        git_status_short: "no-git",
        tracked_diff_hash: "a".repeat(64),
        relevant_untracked_hash: "ignored:no-git",
        untracked_relevant_hash: "ignored:no-git",
        worktree_fingerprint: worktreeFingerprint,
        started_at: "2026-06-29T00:00:00.000Z",
        ended_at: null,
        finalized_at: null,
        required_command_specs_hash: specsHash,
        mode: "product_task",
        changed_files: []
      }
    ],
    current_attempt_id: currentAttemptId,
    required_command_specs: [commandSpec],
    command_runs: commandRuns,
    negative_evidence_records: [],
    slices: [
      {
        slice_id: "S-001",
        slice_goal: "Close runtime and browser proof layers",
        touched_plan_items: ["PI-001"],
        touched_acs: ["AC-001"],
        code_changes: ["src/pages/OperationsPage.tsx", "src/runtime/kernel.ts"],
        evidence_records: ["EV-001", "EV-002", "EV-003"],
        closed_layers: ["AC-001.code", "AC-001.worker_runtime", "AC-001.ui_browser", "AC-001.test"],
        remaining_layers: [],
        blockers: [],
        cleanup_assertions: ["test DB reset"],
        progress_value: {
          type: "proof_gap_closed",
            closed_items: ["AC-001.code", "AC-001.worker_runtime", "AC-001.ui_browser", "AC-001.test"],
          why_it_reduces_rework: "All required proof layers now map to fresh evidence."
        }
      }
    ],
    evidence: [
      evidenceRecord("EV-001", "worker_runtime_assertion", ["AC-001.code", "AC-001.worker_runtime"], ["AC-001.ui_browser"], {
        currentAttemptId,
        sourceBundleHash,
        productSourceHash,
        technicalPlanHash,
        acceptanceChecklistHash,
        worktreeFingerprint,
        commandSpecId
      }),
      evidenceRecord("EV-002", "playwright_assertion", ["AC-001.ui_browser"], ["AC-001.security"], {
        currentAttemptId,
        sourceBundleHash,
        productSourceHash,
        technicalPlanHash,
        acceptanceChecklistHash,
        worktreeFingerprint,
        commandSpecId
      }),
      evidenceRecord("EV-003", "test_assertion", ["AC-001.test"], ["all-provider coverage"], {
        currentAttemptId,
        sourceBundleHash,
        productSourceHash,
        technicalPlanHash,
        acceptanceChecklistHash,
        worktreeFingerprint,
        commandSpecId
      })
    ],
    gates: { validator: { status: "not_run" }, auditor: { auditor_status: "pass", findings: [] } },
    progress: {
      system_capability_progress: { status: "complete", plan_items: ["PI-001"] },
      representative_sample_progress: { status: "complete", samples: ["recovery happy path sample"] },
      real_object_coverage: { status: "sampled_only", covered_objects: ["recovery happy path sample"] },
      full_population_operation_progress: { status: "not_in_scope" }
    },
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

function evidenceRecord(evidenceId, type, proves, doesNotProve, context) {
  const targetLayer = proves.find((item) => /\.(worker_runtime|ui_browser|test)$/.test(item));
  const proofLayer = targetLayer?.split(".").at(-1) ?? "code";
  const artifactPath =
    type === "playwright_assertion"
      ? "tmp/ty-context/plan-acceptance/demo/ui-assertion-report.json"
      : "tmp/ty-context/plan-acceptance/demo/runtime.json";
  const record = {
    schema_version: "evidence-record-v2",
    evidence_id: evidenceId,
    task_attempt_id: context.currentAttemptId,
    generated_at: "2026-07-01T00:01:00.000Z",
    source_bundle_hash: context.sourceBundleHash,
    product_source_hash: context.productSourceHash,
    technical_plan_hash: context.technicalPlanHash,
    acceptance_checklist_hash: context.acceptanceChecklistHash,
    git_head: "no-git",
    git_status_short: "no-git",
    tracked_diff_hash: "a".repeat(64),
    relevant_untracked_hash: "ignored:no-git",
    covers_dirty_worktree: true,
    worktree_fingerprint: context.worktreeFingerprint,
    command_spec_id: context.commandSpecId,
    command_run_id: `CR-${proofLayer}`,
    command_line: type === "playwright_assertion" ? "npx playwright test tests/runtime.spec.ts --grep recovery" : "npm test --workspace project-tiny-context-harness",
    artifact_path: artifactPath,
    artifact_sha256: sha256("{}"),
    artifact_mtime: "2026-07-01T00:01:00.000Z",
    target_ac_ids: ["AC-001"],
    target_pi_ids: ["PI-001"],
    target_proof_layers: proves,
    slice_id: "S-001",
    type,
    freshness: { created_at: "2026-06-29T00:00:00.000Z", valid_for: "current_worktree", stale_after: null },
    command: type === "playwright_assertion" ? "npx playwright test tests/runtime.spec.ts --grep recovery" : "npm test --workspace project-tiny-context-harness",
    command_exit_code: 0,
    artifact_paths:
      type === "playwright_assertion"
        ? [
            "tmp/ty-context/plan-acceptance/demo/browser.png",
            "tmp/ty-context/plan-acceptance/demo/playwright-trace.zip",
            "tmp/ty-context/plan-acceptance/demo/ui-assertion-report.json"
          ]
        : ["tmp/ty-context/plan-acceptance/demo/runtime.json"],
    proves,
    does_not_prove: doesNotProve,
    redaction: { checked: true, contains_secret: false },
    reviewability: {
      external_reviewer_can_reproduce: true,
      reproduction_steps: type === "playwright_assertion" ? "Run the recorded Playwright command and inspect the trace/report." : "Run the recorded command."
    }
  };
  if (targetLayer) {
    record.assertion_result = assertionResultFor(type, targetLayer);
  }
  const scan = {
      schema_version: "negative-evidence-scan-v1",
      status: "passed",
      target_ac_ids: ["AC-001"],
      target_proof_layers: [targetLayer ?? "AC-001.worker_runtime"],
      invalid_completion_signals_checked: ["页面无明显变化"],
      owner_surface: "Operations",
      route: "/operations",
      forbidden_findings: [
        { id: "no-unverified", status: "not_found", forbidden_text: "未验证" }, { id: "no-unavailable", status: "not_found", forbidden_text: "不可用" },
        { id: "no-temp-unavailable", status: "not_found", forbidden_text: "暂不可用" }, { id: "no-unchanged-page", status: "not_found", forbidden_text: "页面无明显变化" }
      ],
      required_findings: [{ id: "final_status_chinese", status: "passed", expected: "已完成", actual: "已完成" }],
      artifacts: [artifactPath]
    };
  if (targetLayer) {
    record.negative_evidence_scan = scan;
    record.assertion_result.negative_evidence_scan = scan;
  }
  return record;
}

function assertionResultFor(type, targetLayer) {
  const base = {
    schema_version: "assertion-result-v2",
    status: "passed",
    runner: type,
    exit_code: 0,
    target_ac_ids: ["AC-001"],
    target_pi_ids: ["PI-001"],
    target_proof_layers: [targetLayer],
    positive_assertions: [{ id: "required_behavior_observed", status: "passed", expected: "observed", actual: "observed" }],
    negative_assertions: [{ id: "no-forbidden-final-state", status: "passed" }],
    invalid_completion_signals: [{ id: "no-unchanged-page", status: "passed", forbidden_text: "页面无明显变化" }],
    required_test_ids: ["tests/runtime.spec.ts"],
    artifacts: ["tmp/ty-context/plan-acceptance/demo/runtime.json"]
  };
  if (type !== "playwright_assertion") {
    return base;
  }
  return {
    ...base,
    runner: "playwright",
    owner_surface: "Operations",
    route: "/operations",
    action: "start recovery and wait for run_id job-123 to complete",
    positive_assertions: [
      { id: "required_behavior_observed", status: "passed", expected: "observed", actual: "observed" },
      { id: "ui_owner_surface_loaded", status: "passed", expected: "Operations", actual: "Operations" },
      { id: "run_id_present", status: "passed", expected: "job-123", actual: "job-123" },
      { id: "polling_observed", status: "passed", expected: "complete", actual: "complete" },
      { id: "final_status_chinese", status: "passed", expected: "已完成", actual: "已完成" }
    ],
    negative_assertions: [
      { id: "no-forbidden-final-state", status: "passed" },
      { id: "no-unverified", status: "passed", forbidden_text: "未验证" }, { id: "no-unavailable", status: "passed", forbidden_text: "不可用" },
      { id: "no-temp-unavailable", status: "passed", forbidden_text: "暂不可用" }, { id: "no-unchanged-page", status: "passed", forbidden_text: "页面无明显变化" }
    ],
    artifacts: ["tmp/ty-context/plan-acceptance/demo/browser.png", "tmp/ty-context/plan-acceptance/demo/playwright-trace.zip", "tmp/ty-context/plan-acceptance/demo/ui-assertion-report.json"]
  };
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function commandSpecIdFor(spec) {
  return sha256(
    [
      spec.ac_id,
      spec.proof_layers.join(","),
      spec.command,
      spec.assertion_artifacts.join(","),
      spec.required_test_ids.join(","),
      spec.positive_assertions.join(","),
      spec.negative_assertions.join(","),
      spec.invalid_completion_signals.join(","),
      spec.final_evidence_expected.join(",")
    ].join("\n")
  );
}

function requiredCommandSpecsHash(specs) {
  return sha256(
    stableJson(
      specs.map((spec) => ({
        ...spec,
        proof_layers: [...spec.proof_layers].sort(),
        assertion_artifacts: [...spec.assertion_artifacts].sort(),
        required_test_ids: [...spec.required_test_ids].sort(),
        positive_assertions: [...spec.positive_assertions].sort(),
        negative_assertions: [...spec.negative_assertions].sort(),
        invalid_completion_signals: [...spec.invalid_completion_signals].sort(),
        final_evidence_expected: [...spec.final_evidence_expected].sort()
      }))
    )
  );
}

function stableJson(value) {
  return JSON.stringify(sortJson(value), null, 2);
}

function sortJson(value) {
  if (Array.isArray(value)) {
    return value.map(sortJson);
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortJson(value[key])]));
}
