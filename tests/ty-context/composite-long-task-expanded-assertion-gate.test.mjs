import test from "node:test";
import assert from "node:assert/strict";
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
    state.evidence = EXPANDED_MACHINE_LAYERS.map((layer) => machineLayerEvidence(layer, false));
    await writeTaskState(root, state);

    let report = await validateSuperpowersState(root, ["tmp/ty-context/plan-acceptance/demo"]);
    for (const layer of EXPANDED_MACHINE_LAYERS) {
      assert.match(report.errors.join("\n"), new RegExp(`${layer}.*missing assertion result|missing assertion result.*${layer}`), layer);
    }

    state.evidence = EXPANDED_MACHINE_LAYERS.map((layer) => machineLayerEvidence(layer, true));
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

function replaceAcLayers(state, layers) {
  const layerIds = layers.map((layer) => `AC-001.${layer}`);
  state.graph.acceptance_criteria["AC-001"].required_proof_layers = layers;
  state.graph.acceptance_criteria["AC-001"].status = "complete";
  state.graph.plan_items["PI-001"].owner_surfaces = [];
  state.graph.plan_items["PI-001"].required_proof_layers = layerIds;
  state.graph.plan_items["PI-001"].status = "complete";
  state.graph.proof_layers = Object.fromEntries(
    layerIds.map((layerId) => [layerId, { required: true, status: "satisfied", evidence_ids: [`EV-${layerId.split(".")[1]}`] }])
  );
}

function machineLayerEvidence(layer, includeAssertion) {
  const layerId = `AC-001.${layer}`;
  const evidence = {
    evidence_id: `EV-${layer}`,
    slice_id: "S-001",
    type: `${layer}_assertion`,
    freshness: { created_at: "2026-06-29T00:00:00.000Z", valid_for: "current_worktree", stale_after: null },
    command: `node --test tests/${layer}.test.mjs`,
    command_exit_code: 0,
    artifact_paths: [`tmp/ty-context/plan-acceptance/demo/${layer}.json`],
    proves: [layerId],
    does_not_prove: ["unrelated proof layer"],
    redaction: { checked: true, contains_secret: false },
    reviewability: { external_reviewer_can_reproduce: true, reproduction_steps: `Run node --test tests/${layer}.test.mjs.` }
  };
  if (!includeAssertion) {
    return evidence;
  }
  return {
    ...evidence,
    assertion_result: {
      schema_version: "assertion-result-v1",
      status: "passed",
      runner: `${layer}-runner`,
      exit_code: 0,
      target_ac_ids: ["AC-001"],
      target_proof_layers: [layerId],
      positive_assertions: [{ id: `${layer}_passed`, status: "passed", expected: "passed", actual: "passed" }],
      negative_assertions: [{ id: `${layer}_not_bypassed`, status: "passed", expected: "not bypassed", actual: "not bypassed" }],
      artifacts: [`tmp/ty-context/plan-acceptance/demo/${layer}.json`]
    }
  };
}
