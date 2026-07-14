import assert from "node:assert/strict";
import test from "node:test";
import { decideWaveImpactV1 } from "../../packages/ty-context/dist/lib/composite-campaign-wave-impact.js";

test("wave_gate_runs_only_proven_affected_specs", () => {
  const decision = decideWaveImpactV1(input("src/a.ts"));
  assert.equal(decision.mode, "targeted");
  assert.deepEqual(decision.affected_slice_ids, ["SFC-001"]);
});

test("unknown_wave_impact_falls_back_to_full", () => {
  const decision = decideWaveImpactV1(input("generated/unknown.lock"));
  assert.equal(decision.mode, "full");
  assert.deepEqual(decision.affected_slice_ids, ["SFC-001", "SFC-002"]);
});

function input(changedPath) {
  return {
    wave_slice_ids: ["SFC-001"],
    candidate_slice_ids: ["SFC-001", "SFC-002"],
    changed_paths: [changedPath],
    profiles: {
      "SFC-001": profile("SFC-001", ["src/a.ts"], ["src/a.ts"]),
      "SFC-002": profile("SFC-002", ["src/b.ts"], ["src/b.ts"]),
    },
    envelopes: {
      "SFC-001": envelope(["src/a.ts"]),
      "SFC-002": envelope(["src/b.ts"]),
    },
    global_constraint_slice_sets: [],
  };
}

function profile(slice_id, write_paths, read_paths) {
  return {
    slice_id,
    stable_key: slice_id.toLowerCase(),
    priority: 1,
    depends_on: [],
    produces_contracts: [],
    consumes_contracts: [],
    write_paths,
    read_paths,
    contract_keys: [],
    resource_locks: [],
    context_refs: [],
    conflict_domains: [slice_id],
    source_unit_cohesion_keys: [slice_id],
    migration_sequences: [],
    generated_artifacts: [],
    package_manager_manifests: [],
    environment_profiles: [],
    positive_evidence_complete: true,
    unknown_reasons: [],
  };
}

function envelope(allowed_write_paths) {
  return {
    schema_version: "slice-change-envelope-v1",
    allowed_write_paths,
    allowed_supporting_paths: [],
    forbidden_paths: [".codex/composite-long-task/campaigns/CAMP"],
    undeclared_change_policy: "reject",
    binding_carrier_paths: {},
  };
}
