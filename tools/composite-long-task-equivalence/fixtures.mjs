import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { slash } from "./normalize.mjs";

export async function prepareFixture(root, fixtureId) {
  const workdir = path.join(root, "tmp", "ty-context", "plan-acceptance", fixtureId);
  await rm(workdir, { recursive: true, force: true });
  await mkdir(workdir, { recursive: true });
  await mkdir(path.join(root, "tmp"), { recursive: true });
  await writeFile(path.join(workdir, "runtime.json"), "{}\n", "utf8");
  await writeFile(path.join(workdir, "browser.png"), "fake\n", "utf8");
  const sources = fixtureSources(fixtureId);
  await writeFile(path.join(workdir, "product-architecture-source.md"), sources.product, "utf8");
  await writeFile(path.join(workdir, "technical-realization-plan.md"), sources.plan, "utf8");
  await writeFile(path.join(workdir, "acceptance-checklist.md"), sources.checklist, "utf8");
  const deltas = fixtureDeltas(fixtureId).map(async (delta, index) => {
    const deltaPath = path.join(root, "tmp", `${fixtureId}-slice-delta-${index + 1}.json`);
    await writeFile(deltaPath, `${JSON.stringify(delta, null, 2)}\n`, "utf8");
    return deltaPath;
  });
  return {
    fixtureId,
    workdir,
    workdirArg: slash(path.relative(root, workdir)),
    deltas: await Promise.all(deltas),
    strictParse: fixtureId.startsWith("strict-parse")
  };
}

function fixtureSources(fixtureId) {
  if (fixtureId === "strict-parse-list-style") {
    return strictSources({
      plan: `# Technical Realization Plan

- PI-001: Legacy list definition
  - delivery_scope: system_capability_build
  - capability_target: legacy capability
  - full_population_boundary: not required
`
    });
  }
  if (fixtureId === "strict-parse-duplicate-heading") {
    return strictSources({
      plan: `${technicalPlan({ deliveryScope: "system_capability_build" })}

## PI-001: Duplicate definition

delivery_scope: system_capability_build
capability_target: duplicate capability
representative_samples:
full_population_boundary: duplicate boundary
non_required_population:
related_acs: AC-001
`
    });
  }
  if (fixtureId === "strict-parse-table-field") {
    return strictSources({
      product: `# Product / Architecture Source

| field | value |
|---|---|
| delivery_scope | system_capability_build |
full_population_required: false
representative_samples_validate:
representative_samples_do_not_validate:
out_of_scope_backlog:
`
    });
  }
  if (fixtureId === "strict-parse-field-heading") {
    return strictSources({
      plan: `# Technical Realization Plan

## PI-001: Field heading plan

### delivery_scope

system_capability_build
capability_target: real capability
representative_samples:
full_population_boundary: not required
non_required_population:
related_acs: AC-001
`
    });
  }
  if (fixtureId === "full-population-sample-only") {
    return sourcePacket({
      deliveryScope: "full_population_operation",
      fullPopulationRequired: true,
      acScope: "full_population_operation",
      acFullPopulationRequired: true
    });
  }
  if (fixtureId === "scope-conflict") {
    return sourcePacket({
      deliveryScope: "system_capability_build",
      fullPopulationRequired: false,
      planDeliveryScope: "full_population_operation",
      acScope: "full_population_operation",
      acFullPopulationRequired: true
    });
  }
  return sourcePacket({
    deliveryScope: "system_capability_build",
    fullPopulationRequired: false,
    acScope: "system_capability_build",
    acFullPopulationRequired: false
  });
}

function strictSources(overrides) {
  return {
    product:
      overrides.product ??
      productSource({
        deliveryScope: "system_capability_build",
        fullPopulationRequired: false
      }),
    plan: overrides.plan ?? technicalPlan({ deliveryScope: "system_capability_build" }),
    checklist:
      overrides.checklist ??
      acceptanceChecklist({
        acceptanceScope: "system_capability_build",
        fullPopulationRequired: false
      })
  };
}

function sourcePacket(options) {
  return {
    product: productSource(options),
    plan: technicalPlan({
      deliveryScope: options.planDeliveryScope ?? options.deliveryScope
    }),
    checklist: acceptanceChecklist({
      acceptanceScope: options.acScope,
      fullPopulationRequired: options.acFullPopulationRequired
    })
  };
}

function productSource({ deliveryScope, fullPopulationRequired }) {
  return `# Product / Architecture Source

Operations owns runtime recovery on the real owner surface.

delivery_scope: ${deliveryScope}
full_population_required: ${fullPopulationRequired}
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
`;
}

function technicalPlan({ deliveryScope }) {
  return `# Technical Realization Plan

## PI-001: Implement runtime recovery on Operations.

delivery_scope: ${deliveryScope}
capability_target: reusable runtime recovery capability
representative_samples:
  - recovery happy path sample
full_population_boundary: ${deliveryScope === "full_population_operation" ? "all configured providers" : "not required for capability build"}
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
}

function acceptanceChecklist({ acceptanceScope, fullPopulationRequired }) {
  return `# Acceptance Checklist

## AC-001: Operations runtime recovery works on the owner surface.

acceptance_scope: ${acceptanceScope}
ac_validates:
  - reusable runtime recovery capability
ac_does_not_validate:
  - ${fullPopulationRequired ? "sample-only recovery path" : "full population operation"}
sample_boundary: recovery happy path sample
full_population_required: ${fullPopulationRequired}
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
`;
}

function fixtureDeltas(fixtureId) {
  if (fixtureId.startsWith("strict-parse")) {
    return [];
  }
  const sampleOnly = fixtureId === "full-population-sample-only";
  if (fixtureId === "multi-slice") {
    return [
      sliceDelta({
        sliceId: "SLICE-001",
        evidenceId: "EV-001",
        layers: ["AC-001.worker_runtime"],
        doesNotProve: ["AC-001.ui_browser"]
      }),
      sliceDelta({
        sliceId: "SLICE-002",
        evidenceId: "EV-002",
        layers: ["AC-001.code", "AC-001.ui_browser", "AC-001.test"],
        doesNotProve: ["full population operation"]
      })
    ];
  }
  return [
    sliceDelta({
      sliceId: "SLICE-001",
      evidenceId: "EV-001",
      layers: ["AC-001.code", "AC-001.worker_runtime", "AC-001.ui_browser", "AC-001.test"],
      doesNotProve: sampleOnly ? ["full population operation", "all-provider coverage"] : ["security audit"]
    })
  ];
}

function sliceDelta({ sliceId, evidenceId, layers, doesNotProve }) {
  const evidenceRecords = evidenceForLayers({ sliceId, evidenceId, layers, doesNotProve });
  return {
    slice_id: sliceId,
    slice_goal: `Close ${layers.join(", ")}`,
    touched_plan_items: ["PI-001"],
    touched_acs: ["AC-001"],
    code_changes: ["src/pages/OperationsPage.tsx", "src/runtime/kernel.ts"],
    evidence_records: evidenceRecords,
    closed_layers: layers,
    remaining_layers: ["AC-001.code", "AC-001.worker_runtime", "AC-001.ui_browser", "AC-001.test"].filter((layer) => !layers.includes(layer)),
    blockers: [],
    cleanup_assertions: ["fixture cleaned"],
    progress_value: {
      type: "proof_gap_closed",
      closed_items: layers,
      why_it_reduces_rework: "Required proof layers now map to fresh evidence."
    }
  };
}

function evidenceForLayers({ sliceId, evidenceId, layers, doesNotProve }) {
  const records = [];
  if (layers.includes("AC-001.code") && !layers.includes("AC-001.worker_runtime")) {
    records.push(baseEvidence(`${evidenceId}-CODE`, sliceId, "code_review", ["AC-001.code"], doesNotProve));
  }
  if (layers.includes("AC-001.worker_runtime")) {
    const proves = layers.includes("AC-001.code") ? ["AC-001.code", "AC-001.worker_runtime"] : ["AC-001.worker_runtime"];
    records.push({
      ...baseEvidence(`${evidenceId}-WORKER`, sliceId, "worker_runtime_assertion", proves, doesNotProve),
      assertion_result: assertionResult({
        runner: "node-runtime",
        target_proof_layers: ["AC-001.worker_runtime"],
        artifacts: ["tmp/ty-context/plan-acceptance/demo/runtime.json"]
      })
    });
  }
  if (layers.includes("AC-001.ui_browser")) {
    records.push({
      ...baseEvidence(`${evidenceId}-UI`, sliceId, "playwright_assertion", ["AC-001.ui_browser"], doesNotProve),
      command: "npx playwright test tests/runtime.spec.ts --grep recovery",
      artifact_paths: [
        "tmp/ty-context/plan-acceptance/demo/browser.png",
        "tmp/ty-context/plan-acceptance/demo/playwright-trace.zip",
        "tmp/ty-context/plan-acceptance/demo/ui-assertion-report.json"
      ],
      assertion_result: assertionResult({
        runner: "playwright",
        target_proof_layers: ["AC-001.ui_browser"],
        owner_surface: "Operations",
        route: "/operations",
        action: "start recovery and wait for run_id job-123 to complete",
        positive_assertions: [
          { id: "ui_owner_surface_loaded", status: "passed", expected: "Operations", actual: "Operations" },
          { id: "run_id_present", status: "passed", expected: "job-123", actual: "job-123" },
          { id: "polling_observed", status: "passed", expected: "complete", actual: "complete" }
        ],
        negative_assertions: uiNegativeAssertions(),
        artifacts: [
          "tmp/ty-context/plan-acceptance/demo/browser.png",
          "tmp/ty-context/plan-acceptance/demo/playwright-trace.zip",
          "tmp/ty-context/plan-acceptance/demo/ui-assertion-report.json"
        ]
      }),
      negative_evidence_scan: {
        schema_version: "negative-evidence-scan-v1",
        status: "passed",
        target_ac_ids: ["AC-001"],
        target_proof_layers: ["AC-001.ui_browser"],
        invalid_completion_signals_checked: ["未验证", "不可用", "暂不可用", "页面无明显变化"],
        owner_surface: "Operations",
        route: "/operations",
        forbidden_findings: uiNegativeAssertions().map((item) => ({
          id: item.id,
          status: "not_found",
          forbidden_text: item.forbidden_text
        })),
        required_findings: [{ id: "final_status", status: "passed", expected: "complete", actual: "complete" }],
        artifacts: ["tmp/ty-context/plan-acceptance/demo/ui-assertion-report.json"]
      }
    });
  }
  if (layers.includes("AC-001.test")) {
    records.push({
      ...baseEvidence(`${evidenceId}-TEST`, sliceId, "test_assertion", ["AC-001.test"], doesNotProve),
      assertion_result: assertionResult({
        runner: "node:test",
        target_proof_layers: ["AC-001.test"],
        artifacts: ["tmp/ty-context/plan-acceptance/demo/runtime.json"]
      })
    });
  }
  return records;
}

function baseEvidence(evidenceId, sliceId, type, proves, doesNotProve) {
  return {
    evidence_id: evidenceId,
    slice_id: sliceId,
    type,
    freshness: { created_at: "2026-06-29T00:00:00.000Z", valid_for: "current_worktree", stale_after: null },
    command: "node --test tests/runtime.spec.ts",
    command_exit_code: 0,
    artifact_paths: ["tmp/ty-context/plan-acceptance/demo/runtime.json"],
    proves,
    does_not_prove: doesNotProve,
    redaction: { checked: true, contains_secret: false },
    reviewability: {
      external_reviewer_can_reproduce: true,
      reproduction_steps: "Run the recorded command and inspect listed artifacts."
    }
  };
}

function assertionResult(overrides = {}) {
  return {
    schema_version: "assertion-result-v1",
    status: "passed",
    runner: "node:test",
    exit_code: 0,
    target_ac_ids: ["AC-001"],
    target_proof_layers: [],
    positive_assertions: [{ id: "required_behavior_observed", status: "passed", expected: "observed", actual: "observed" }],
    negative_assertions: [{ id: "no-forbidden-final-state", status: "passed" }],
    artifacts: [],
    ...overrides
  };
}

function uiNegativeAssertions() {
  return [
    { id: "no-unverified", status: "passed", forbidden_text: "未验证" },
    { id: "no-unavailable", status: "passed", forbidden_text: "不可用" },
    { id: "no-temp-unavailable", status: "passed", forbidden_text: "暂不可用" },
    { id: "no-unchanged-page", status: "passed", forbidden_text: "页面无明显变化" }
  ];
}
