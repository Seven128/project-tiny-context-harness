import test from "node:test";
import assert from "node:assert/strict";
import {
  assertCampaignV4,
  assertScopeFitResultV3,
} from "../../packages/ty-context/dist/lib/composite-campaign-schema-v4.js";
import {
  assertStableScopeEvolutionV3,
  computeReadyFrontierV3,
  validateScopeFitGraphV3,
} from "../../packages/ty-context/dist/lib/composite-campaign-graph.js";
import {
  assertGlobalConstraintPacketCoverageV1,
  validateSourceCoverageAgainstScopeV3,
} from "../../packages/ty-context/dist/lib/composite-campaign-source-coverage.js";

const SHA = "a".repeat(64);
const GIT = "b".repeat(40);

test("Scope Fit V3 persists a complete stable DAG and computes a deterministic ready frontier", () => {
  const value = scope();
  const graph = validateScopeFitGraphV3(value);
  assert.deepEqual(graph.topological_slice_ids, ["SFC-001", "SFC-002"]);
  assert.equal(graph.graph_sha256.length, 64);
  assert.deepEqual(computeReadyFrontierV3(value, []).map((slice) => slice.slice_id), ["SFC-001"]);
  assert.deepEqual(computeReadyFrontierV3(value, ["SFC-001"]).map((slice) => slice.slice_id), ["SFC-002"]);
});

test("graph rejects cycles, dangling dependencies, and missing producer-consumer ordering", () => {
  const cyclic = scope(); cyclic.slices[0].depends_on = ["SFC-002"];
  assert.throws(() => validateScopeFitGraphV3(cyclic), /dependency_cycle/);
  const dangling = scope(); dangling.slices[1].depends_on = ["SFC-999"];
  assert.throws(() => validateScopeFitGraphV3(dangling), /missing_dependency:SFC-002:SFC-999/);
  const unordered = scope(); unordered.slices[1].depends_on = [];
  assert.throws(() => validateScopeFitGraphV3(unordered), /contract_dependency_missing:SFC-002:SFC-001:provider-runtime-v1/);
});

test("stable SFC identities are append-only and cannot be renumbered", () => {
  const previous = scope(); const appended = scope();
  appended.slices.push(slice("SFC-003", "docs", 2, ["SRC-004"]));
  assert.doesNotThrow(() => assertStableScopeEvolutionV3(previous, appended));
  const renumbered = scope(); renumbered.slices[0].slice_id = "SFC-010";
  renumbered.global_constraints[0].applies_to[0] = "SFC-010";
  renumbered.slices[1].depends_on = ["SFC-010"];
  assert.throws(() => assertStableScopeEvolutionV3(previous, renumbered), /stable_slice_removed:SFC-001|stable_slice_renumbered/);
});

test("source items and global constraints have bidirectional packet-ready coverage", () => {
  const source = scope(); const coverage = sourceCoverage();
  const analysis = validateSourceCoverageAgainstScopeV3(source, coverage);
  assert.equal(analysis.source_item_count, 3);
  assert.deepEqual(analysis.pending_global_constraint_binding_pairs, []);
  assert.doesNotThrow(() => assertGlobalConstraintPacketCoverageV1(source, coverage, [
    packetIndex("SFC-001", "REQ-001", "AC-001", "VS-001"),
    packetIndex("SFC-002", "REQ-002", "AC-002", "VS-002"),
  ]));
  const missingSource = sourceCoverage(); missingSource.items.pop();
  assert.throws(() => validateSourceCoverageAgainstScopeV3(source, missingSource), /global_constraint_source_missing:GC-001/);
  const nonGlobal = packetIndex("SFC-002", "REQ-002", "AC-002", "VS-002"); nonGlobal.global_invariant_spec_ids = [];
  assert.throws(() => assertGlobalConstraintPacketCoverageV1(source, coverage, [packetIndex("SFC-001", "REQ-001", "AC-001", "VS-001"), nonGlobal]), /global_invariant_unknown:VS-002/);
});

test("Scope Fit and Campaign V4 validators reject unknown fields and keep graph/runtime ids aligned", () => {
  const strictScope = scope(); strictScope.unexpected = true;
  assert.throws(() => assertScopeFitResultV3(strictScope), /unknown field unexpected/);
  const campaign = campaignState();
  assert.equal(assertCampaignV4(campaign).campaign_status, "authoring");
  campaign.slices["SFC-999"] = runtimeSlice();
  assert.throws(() => assertCampaignV4(campaign), /graph and runtime slice ids must match/);
});

function scope() {
  return {
    schema_version: "scope-fit-result-v3", request_sha256: SHA, decision: "split_required", campaign_goal: "Deliver provider and UI capabilities",
    global_constraints: [{ constraint_id: "GC-001", statement: "Use one result semantic", applies_to: ["SFC-001", "SFC-002"] }],
    slices: [
      { ...slice("SFC-001", "provider-runtime", 1, ["SRC-001"]), produces_contracts: ["provider-runtime-v1"] },
      { ...slice("SFC-002", "message-center-ui", 1, ["SRC-002"]), depends_on: ["SFC-001"], consumes_contracts: ["provider-runtime-v1"] },
    ],
  };
}

function slice(slice_id, stable_key, priority, source_refs) {
  return { slice_id, stable_key, title: stable_key, objective: `Deliver ${stable_key}`, depends_on: [], priority, source_refs, scope_summary: [stable_key], out_of_scope: [], produces_contracts: [], consumes_contracts: [], conflict_domains: [stable_key], resource_locks: [] };
}

function sourceCoverage() {
  return {
    schema_version: "composite-source-coverage-v1", source_plan_sha256: SHA,
    items: [
      { source_item_id: "SRC-001", statement: "Provider", disposition: "slice", slice_refs: ["SFC-001"], global_constraint_refs: [], rationale: "Provider outcome", context_resolution: { status: "task_local", context_refs: [], task_local_reason: "Fixture-only provider outcome." } },
      { source_item_id: "SRC-002", statement: "UI", disposition: "slice", slice_refs: ["SFC-002"], global_constraint_refs: [], rationale: "UI outcome", context_resolution: { status: "task_local", context_refs: [], task_local_reason: "Fixture-only UI outcome." } },
      { source_item_id: "SRC-003", statement: "Shared semantic", disposition: "global_constraint", slice_refs: [], global_constraint_refs: ["GC-001"], rationale: "Cross-slice rule", context_resolution: { status: "task_local", context_refs: [], task_local_reason: "Fixture-only shared rule." } },
    ],
    global_constraint_bindings: [
      binding("SFC-001", "REQ-001", "AC-001", "VS-001"),
      binding("SFC-002", "REQ-002", "AC-002", "VS-002"),
    ],
  };
}

function binding(slice_id, requirement, acceptance, spec) { return { constraint_id: "GC-001", slice_id, requirement_ids: [requirement], acceptance_criterion_ids: [acceptance], verification_spec_ids: [spec] }; }
function packetIndex(slice_id, requirement, acceptance, spec) { return { slice_id, requirement_ids: [requirement], acceptance_criterion_ids: [acceptance], verification_spec_ids: [spec], global_invariant_spec_ids: [spec] }; }
function runtimeSlice() { return { status: "packet_pending", packet_revision: null, packet_sha256: null, wave_id: null, branch: null, worktree: null, goal_id: null, base_commit: null, head_commit: null, final_receipt_sha256: null, merge_commit: null }; }
function campaignState() {
  return {
    schema_version: "composite-campaign-v4", campaign_id: "campaign-1", source_plan_sha256: SHA, source_kind: "discussed_plan", created_at: "2026-07-13T00:00:00.000Z",
    target_branch: "main", base_commit: GIT, integration_branch: "tyctx/campaign/campaign-1/integration", integration_head: GIT,
    graph: { graph_revision: 1, graph_sha256: SHA, slices: { "SFC-001": { stable_key: "provider-runtime", depends_on: [], priority: 1 }, "SFC-002": { stable_key: "message-center-ui", depends_on: ["SFC-001"], priority: 1 } } },
    slices: { "SFC-001": runtimeSlice(), "SFC-002": runtimeSlice() }, waves: {}, generation: 1, campaign_status: "authoring",
  };
}
