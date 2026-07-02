import test from "node:test";
import assert from "node:assert/strict";
import {
  EQUIVALENCE_FIXTURE_IDS,
  buildEquivalenceReport,
  compareNormalizedRuns,
  normalizeTaskState
} from "../../tools/verify_composite_long_task_equivalence.mjs";
import { normalizeGates } from "../../tools/composite-long-task-equivalence/normalize.mjs";

test("equivalence runner declares every required fixture family", () => {
  assert.deepEqual(EQUIVALENCE_FIXTURE_IDS, [
    "happy-path",
    "full-population-sample-only",
    "scope-conflict",
    "strict-parse-list-style",
    "strict-parse-duplicate-heading",
    "strict-parse-table-field",
    "strict-parse-field-heading",
    "multi-slice"
  ]);
});

test("normalizeTaskState keeps semantic state and removes volatile data", () => {
  const normalized = normalizeTaskState({
    meta: {
      task_id: "SP-DEMO-001",
      plan_slug: "demo",
      created_at: "2026-06-29T00:00:00.000Z",
      updated_at: "2026-06-29T00:00:01.000Z",
      schema_version: "superpowers-task-state-v1",
      product_goal_complete: true,
      acceptance_target_status: "complete",
      audit_task_complete: false
    },
    sources: {
      acceptance_checklist: {
        path: "acceptance-checklist.md",
        sha256: "a".repeat(64),
        authority: "acs_completion_semantics_proof_layers"
      }
    },
    delivery: {
      product_architecture_scope: {
        delivery_scope: "system_capability_build",
        full_population_required: false
      },
      scope_conflicts: []
    },
    graph: {
      plan_items: {
        "PI-001": {
          requirement: "Build the capability",
          delivery_scope: "system_capability_build",
          owner_surfaces: ["Operations"],
          implementation_paths: ["src/runtime/kernel.ts"],
          required_tests: ["tests/runtime.spec.ts"],
          related_acs: ["AC-001"]
        }
      },
      acceptance_criteria: {
        "AC-001": {
          scope: "Capability works",
          acceptance_scope: "system_capability_build",
          full_population_required: false,
          required_proof_layers: ["code", "runtime"],
          related_plan_items: ["PI-001"]
        }
      },
      proof_layers: {
        "AC-001.runtime": { required: true, status: "satisfied", evidence_ids: ["EV-001"] }
      },
      edges: [{ from: "PI-001", to: "AC-001", type: "supports" }]
    },
    evidence: [
      {
        evidence_id: "EV-001",
        slice_id: "S-001",
        type: "runtime",
        freshness: { created_at: "2026-06-29T00:00:00.000Z" },
        command: "node --test tests/runtime.spec.ts",
        artifact_paths: ["C:/tmp/current/tmp/ty-context/plan-acceptance/demo/runtime.json"],
        proves: ["AC-001.runtime"],
        does_not_prove: ["full population operation"]
      }
    ],
    blockers: [],
    final: {
      product_goal_complete: true,
      acceptance_target_status: "complete",
      audit_task_complete: false,
      completion_basis: ["final-gate"]
    }
  });

  assert.equal(normalized.meta.product_goal_complete, true);
  assert.equal(normalized.meta.acceptance_target_status, "complete");
  assert.equal(normalized.meta.audit_task_complete, false);
  assert.equal(normalized.meta.created_at, undefined);
  assert.equal(normalized.meta.updated_at, undefined);
  assert.equal(normalized.meta.task_id, undefined);
  assert.equal(normalized.sources.acceptance_checklist.sha256, undefined);
  assert.equal(normalized.graph.plan_items["PI-001"].delivery_scope, "system_capability_build");
  assert.deepEqual(normalized.evidence[0].proves, ["AC-001.runtime"]);
  assert.deepEqual(normalized.evidence[0].does_not_prove, ["full population operation"]);
  assert.deepEqual(normalized.evidence[0].artifact_paths, ["<normalized-path>/runtime.json"]);
});

test("compareNormalizedRuns separates semantic regressions from matching output", () => {
  const baseline = {
    fixtures: {
      "happy-path": {
        task_state: { final: { product_goal_complete: true }, graph: { plan_items: { "PI-001": {} } } },
        derived: { "final-acceptance-verdict": { overall_status: "complete" } },
        gates: { final_gate: { exit_code: 0, product_goal_complete: true } }
      }
    }
  };
  const matching = structuredClone(baseline);
  assert.deepEqual(compareNormalizedRuns(baseline, matching).rejectedDiffs, []);

  const changed = structuredClone(baseline);
  changed.fixtures["happy-path"].gates.final_gate.product_goal_complete = false;
  const diff = compareNormalizedRuns(baseline, changed);
  assert.equal(diff.rejectedDiffs.length, 1);
  assert.match(diff.rejectedDiffs[0].path, /happy-path.*product_goal_complete/);
});

test("compareNormalizedRuns treats current-only render-goal as an allowed public-surface diff", () => {
  const baseline = { fixtures: { "happy-path": { gates: { final_gate: { exit_code: 0 } } } } };
  const current = {
    fixtures: {
      "happy-path": {
        gates: {
          final_gate: { exit_code: 0 },
          render_goal: { exit_code: 0, category: "none", product_goal_complete: null }
        }
      }
    }
  };

  const diff = compareNormalizedRuns(baseline, current);
  assert.equal(diff.rejectedDiffs.length, 0);
  assert.equal(diff.allowedDiffs.length, 1);
  assert.match(diff.allowedDiffs[0].path, /render_goal/);
});

test("normalizeGates parses final-gate false before completion-rule error prose", () => {
  const gates = normalizeGates({
    final_gate: {
      status: 1,
      stdout: "final gate product_goal_complete=false",
      stderr: "error: product_goal_complete=true but full-population completion relies on sample evidence"
    }
  });

  assert.equal(gates.final_gate.product_goal_complete, false);
  assert.equal(gates.final_gate.category, "sample_only_full_population");
});

test("normalizeGates classifies hand-set completion blockers", () => {
  const gates = normalizeGates({
    validate_superpowers_state: {
      status: 1,
      stdout: "",
      stderr: "error: product_goal_complete=true but required plan items, ACs or proof layers are incomplete"
    }
  });

  assert.equal(gates.validate_superpowers_state.category, "hand_set_completion_blocker");
});

test("buildEquivalenceReport renders the required conclusion template", () => {
  const report = buildEquivalenceReport({
    verdict: "equivalent",
    baselineCommit: "df03307c6ee4a3740def6e32c1c6b958bf59acf7",
    currentCommit: "9a9e8e33428865bd5c5f87bd870857d454edd527",
    fixtureCount: 8,
    semanticDiffCount: 0,
    allowedDiffCount: 3,
    rejectedDiffCount: 0,
    checks: {
      taskStateGraph: "passed",
      evidenceSemantics: "passed",
      derivedViews: "passed",
      gates: "passed",
      productGoalComplete: "passed",
      strictParser: "passed",
      scopeConflictBlocker: "passed",
      sampleOnlyFullPopulationBlocker: "passed",
      handSetCompletionBlocker: "passed",
      thinGoal: "passed",
      workflowProtocol: "passed",
      executionBinding: "passed",
      codexFreshSessionSmoke: "not_run"
    },
    conclusion: "同一输入仍走同一状态机并得到同一完成判定。"
  });

  assert.match(report, /## Equivalence Result/);
  assert.match(report, /- Verdict: equivalent/);
  assert.match(report, /## State Kernel Parity/);
  assert.match(report, /## Negative Case Parity/);
  assert.match(report, /## Goal \/ Protocol Runtime/);
  assert.match(report, /## Baseline Semantics/);
  assert.match(report, /fixed Superpowers Long-Task baseline/i);
  assert.match(report, /sample-only evidence could incorrectly satisfy full_population final completion/i);
  assert.match(report, /not to the pre-fix buggy baseline/i);
  assert.match(report, /Codex fresh-session smoke: not_run/);
});
