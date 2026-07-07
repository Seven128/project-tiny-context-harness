import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { rm } from "node:fs/promises";
import {
  MACHINE_VERIFIABLE_PROOF_LAYERS,
  evaluateAcEvidence,
  evaluateAssertionEvidence,
  evaluateNegativeEvidence,
  evaluateProofLayer
} from "../../packages/ty-context/dist/lib/superpowers-task-assertions.js";
import { validateSuperpowersState } from "../../packages/ty-context/dist/lib/superpowers-task-validator.js";
import { assertionBackedTaskState } from "./composite-long-task-assertion-fixtures.mjs";
import { createPlanProject, writeSuperpowersSources, writeTaskState } from "./plan-validator-fixtures.mjs";

const EXPANDED_MACHINE_LAYERS = [
  "worker_runtime",
  "data_artifact",
  "security_redaction",
  "integration",
  "all_provider_all_runner",
  "cleanup_stale_scan"
];

test("assertion evaluators expose the public AC proof-layer assertion API", () => {
  const state = assertionBackedTaskState();
  const uiEvidence = state.evidence[1];
  const expectedMachineLayers = ["ui_browser", "api_schema", ...EXPANDED_MACHINE_LAYERS, "test"];

  assert.deepEqual(expectedMachineLayers.filter((layer) => !MACHINE_VERIFIABLE_PROOF_LAYERS.has(layer)), []);
  assert.equal(evaluateProofLayer(state, "AC-001.ui_browser").assertion_status, "passed");
  assert.equal(evaluateAcEvidence(state, "AC-001").assertion_status, "passed");
  assert.deepEqual(evaluateAssertionEvidence(uiEvidence, "AC-001.ui_browser"), []);
  assert.deepEqual(evaluateNegativeEvidence(uiEvidence, "AC-001.ui_browser"), []);
});

test("all expanded machine-verifiable proof layers require assertion-backed evidence", async () => {
  const root = await createPlanProject();
  try {
    await writeSuperpowersSources(root);
    const state = assertionBackedTaskState();
    replaceAcLayers(state, EXPANDED_MACHINE_LAYERS);
    state.evidence = EXPANDED_MACHINE_LAYERS.map((layer) => machineLayerEvidence(state, layer, false));
    await writeTaskState(root, state);

    let report = await validateSuperpowersState(root, ["tmp/ty-context/plan-acceptance/demo"]);
    for (const layer of EXPANDED_MACHINE_LAYERS) {
      assert.match(report.errors.join("\n"), new RegExp(`${layer}.*missing assertion result|missing assertion result.*${layer}`), layer);
    }

    state.evidence = EXPANDED_MACHINE_LAYERS.map((layer) => machineLayerEvidence(state, layer, true));
    await writeTaskState(root, state);
    report = await validateSuperpowersState(root, ["tmp/ty-context/plan-acceptance/demo"]);
    assert.deepEqual(report.errors, []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("adversarial invalid state evidence shortcuts J-R cannot close machine proof layers", async () => {
  const cases = [
    ["J: final-card-only complete", "final_card"],
    ["K: matrix/verdict-only complete", "plan_conformance_matrix"],
    ["K2: verdict-only complete", "final_acceptance_verdict"],
    ["L: validator-pass-only complete", "validator_pass"],
    ["M: auditor-pass-only complete", "auditor_pass"],
    ["N: subagent summary only", "subagent_summary"],
    ["O: prose summary only", "prose_summary"],
    ["P: file-exists-only", "file_exists"],
    ["P2: artifact-exists-only", "artifact_exists"],
    ["P3: test-name-only", "test_name_only"],
    ["Q: diagnostic-only surface", "diagnostic_surface"],
    ["R: local-audit-only", "local_audit"]
  ];

  for (const [name, evidenceType] of cases) {
    const root = await createPlanProject();
    try {
      await writeSuperpowersSources(root);
      const state = assertionBackedTaskState();
      state.evidence[0].type = evidenceType;
      state.evidence[0].artifact_paths = [`tmp/ty-context/plan-acceptance/demo/${evidenceType}.json`];
      await writeTaskState(root, state);

      const report = await validateSuperpowersState(root, ["tmp/ty-context/plan-acceptance/demo"]);
      assert.match(report.errors.join("\n"), /invalid evidence|forbidden shortcut|cannot satisfy/i, name);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

test("negative evidence scans must target the same proof layer as the assertion evidence", async () => {
  const root = await createPlanProject();
  try {
    await writeSuperpowersSources(root);
    const state = assertionBackedTaskState();
    state.evidence[1].negative_evidence_scan.target_proof_layers = ["AC-999.ui_browser"];
    await writeTaskState(root, state);

    const report = await validateSuperpowersState(root, ["tmp/ty-context/plan-acceptance/demo"]);
    assert.match(report.errors.join("\n"), /negative evidence scan target proof layers.*AC-001\.ui_browser/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("current-attempt completion rejects legacy or old-attempt machine evidence", async () => {
  const root = await createPlanProject();
  try {
    await writeSuperpowersSources(root);
    const state = assertionBackedTaskState();
    state.current_attempt_id = "ATT-CURRENT";
    state.attempts = [
      {
        task_attempt_id: "ATT-CURRENT",
        source_bundle_hash: "f".repeat(64),
        product_source_hash: state.sources.product_architecture_source.sha256,
        technical_plan_hash: state.sources.technical_realization_plan.sha256,
        acceptance_checklist_hash: state.sources.acceptance_checklist.sha256,
        git_head: "no-git",
        git_status_short: "no-git",
        tracked_diff_hash: "a".repeat(64),
        untracked_relevant_hash: "ignored:no-git",
        worktree_fingerprint: "b".repeat(64),
        started_at: "2026-07-01T00:00:00.000Z",
        finalized_at: null,
        required_command_specs_hash: "c".repeat(64)
      }
    ];
    state.required_command_specs = [
      {
        command_spec_id: "d".repeat(64),
        ac_id: "AC-001",
        proof_layers: ["code", "worker_runtime", "ui_browser", "test"],
        command: "node --test tests/runtime.spec.ts",
        required_test_ids: ["tests/runtime.spec.ts"],
        machine_blocking: true,
        assertion_result_required: true
      }
    ];
    state.command_runs = [];
    state.negative_evidence_records = [];
    state.evidence[1].schema_version = "evidence-record-v1";
    state.evidence[1].task_attempt_id = "ATT-OLD";
    await writeTaskState(root, state);

    const report = await validateSuperpowersState(root, ["tmp/ty-context/plan-acceptance/demo"]);
    assert.match(report.errors.join("\n"), /EvidenceRecordV2|current attempt|old attempt|stale evidence/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("machine-backed completion requires a current attempt", async () => {
  const root = await createPlanProject();
  try {
    await writeSuperpowersSources(root);
    const state = assertionBackedTaskState();
    state.current_attempt_id = "";
    state.attempts = [];
    await writeTaskState(root, state);

    const report = await validateSuperpowersState(root, ["tmp/ty-context/plan-acceptance/demo"]);
    assert.match(report.errors.join("\n"), /current attempt.*required|missing current attempt/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

function replaceAcLayers(state, layers) {
  const layerIds = layers.map((layer) => `AC-001.${layer}`);
  state.graph.acceptance_criteria["AC-001"].required_proof_layers = layers;
  state.graph.acceptance_criteria["AC-001"].status = "complete";
  state.graph.plan_items["PI-001"].owner_surfaces = [];
  state.graph.plan_items["PI-001"].required_proof_layers = layerIds;
  state.graph.plan_items["PI-001"].status = "complete";
  const ac = state.graph.acceptance_criteria["AC-001"];
  const specBase = {
    ac_id: "AC-001",
    proof_layers: layers,
    command: ac.assertion_command,
    assertion_artifacts: ac.assertion_artifacts,
    required_test_ids: ac.required_test_ids,
    machine_blocking: ac.machine_blocking !== false,
    assertion_result_required: ac.assertion_result_required !== false,
    positive_assertions: ac.positive_assertions,
    negative_assertions: ac.negative_assertions,
    invalid_completion_signals: ac.invalid_completion_signals,
    final_evidence_expected: ac.final_evidence_expected
  };
  const commandSpecId = commandSpecIdFor(specBase);
  state.required_command_specs = [{ command_spec_id: commandSpecId, ...specBase }];
  state.attempts[0].required_command_specs_hash = requiredCommandSpecsHash(state.required_command_specs);
  state.command_runs = layers.map((layer) => ({
    command_run_id: `CR-${layer}`,
    task_attempt_id: state.current_attempt_id,
    command_spec_id: commandSpecId,
    ac_id: "AC-001",
    proof_layer: layer,
    command_line: `node --test tests/${layer}.test.mjs`,
    exit_code: 0,
    started_at: "2026-07-01T00:00:00.000Z",
    ended_at: "2026-07-01T00:01:00.000Z",
    artifact_paths: ["tmp/ty-context/plan-acceptance/demo/runtime.json"]
  }));
  state.graph.proof_layers = Object.fromEntries(
    layerIds.map((layerId) => [layerId, { required: true, status: "satisfied", evidence_ids: [`EV-${layerId.split(".")[1]}`] }])
  );
}

function machineLayerEvidence(state, layer, includeAssertion) {
  const layerId = `AC-001.${layer}`;
  const attempt = state.attempts[0];
  const commandSpec = state.required_command_specs[0];
  const scan = {
    schema_version: "negative-evidence-scan-v1",
    status: "passed",
    target_ac_ids: ["AC-001"],
    target_proof_layers: [layerId],
    invalid_completion_signals_checked: ["页面无明显变化"],
    forbidden_findings: [{ id: "no-unchanged-page", status: "not_found", forbidden_text: "页面无明显变化" }],
    required_findings: [{ id: `${layer}_passed`, status: "passed", expected: "passed", actual: "passed" }],
    artifacts: ["tmp/ty-context/plan-acceptance/demo/runtime.json"]
  };
  const evidence = {
    schema_version: "evidence-record-v2",
    evidence_id: `EV-${layer}`,
    task_attempt_id: state.current_attempt_id,
    source_bundle_hash: attempt.source_bundle_hash,
    product_source_hash: attempt.product_source_hash,
    technical_plan_hash: attempt.technical_plan_hash,
    acceptance_checklist_hash: attempt.acceptance_checklist_hash,
    git_head: attempt.git_head,
    worktree_fingerprint: attempt.worktree_fingerprint,
    command_spec_id: commandSpec.command_spec_id,
    command_run_id: `CR-${layer}`,
    command_line: `node --test tests/${layer}.test.mjs`,
    artifact_path: "tmp/ty-context/plan-acceptance/demo/runtime.json",
    artifact_sha256: sha256("{}"),
    artifact_mtime: "2026-07-01T00:01:00.000Z",
    target_ac_ids: ["AC-001"],
    target_pi_ids: ["PI-001"],
    target_proof_layers: [layerId],
    slice_id: "S-001",
    type: `${layer}_assertion`,
    freshness: { created_at: "2026-06-29T00:00:00.000Z", valid_for: "current_worktree", stale_after: null },
    command: `node --test tests/${layer}.test.mjs`,
    command_exit_code: 0,
    artifact_paths: ["tmp/ty-context/plan-acceptance/demo/runtime.json"],
    proves: [layerId],
    does_not_prove: ["unrelated proof layer"],
    redaction: { checked: true, contains_secret: false },
    reviewability: { external_reviewer_can_reproduce: true, reproduction_steps: `Run node --test tests/${layer}.test.mjs.` },
    negative_evidence_scan: includeAssertion ? scan : undefined
  };
  if (!includeAssertion) {
    return evidence;
  }
  return {
    ...evidence,
    assertion_result: {
      schema_version: "assertion-result-v2",
      status: "passed",
      runner: `${layer}-runner`,
      exit_code: 0,
      target_ac_ids: ["AC-001"],
      target_pi_ids: ["PI-001"],
      target_proof_layers: [layerId],
      positive_assertions: [
        { id: "required_behavior_observed", status: "passed", expected: "observed", actual: "observed" },
        { id: `${layer}_passed`, status: "passed", expected: "passed", actual: "passed" }
      ],
      negative_assertions: [
        { id: "no-forbidden-final-state", status: "passed" },
        { id: `${layer}_not_bypassed`, status: "passed", expected: "not bypassed", actual: "not bypassed" }
      ],
      invalid_completion_signals: [{ id: "no-unchanged-page", status: "passed", forbidden_text: "页面无明显变化" }],
      negative_evidence_scan: scan,
      required_test_ids: ["tests/runtime.spec.ts"],
      artifacts: ["tmp/ty-context/plan-acceptance/demo/runtime.json"]
    }
  };
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

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}
