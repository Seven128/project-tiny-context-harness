import assert from "node:assert/strict";
import test from "node:test";
import { decideWaveImpactV2 } from "../../packages/ty-context/dist/lib/composite-campaign-wave-impact.js";
import {
  canonicalJson,
  sha256Hex,
} from "../../packages/ty-context/dist/lib/composite-campaign-codec.js";

test("wave_gate_uses_actual_merge_diff", () => {
  const decision = decideWaveImpactV2(input("src/a.ts"));
  assert.equal(decision.mode, "targeted");
  assert.deepEqual(decision.affected_slice_ids, ["SFC-001"]);
  assert.deepEqual(decision.affected_spec_ids, ["SFC-001:VS-A"]);
  assert.ok(
    decision.reason_evidence.includes("SFC-001:VS-A:path:src/a.ts"),
  );
});

test("wave_gate_runs_only_proven_affected_specs", () => {
  const decision = decideWaveImpactV2(input("src/a.ts"));
  assert.deepEqual(decision.affected_spec_ids, ["SFC-001:VS-A"]);
  assert.ok(!decision.affected_spec_ids.includes("SFC-001:VS-A-OTHER"));
  assert.ok(!decision.affected_spec_ids.includes("SFC-002:VS-B"));
});

test("unknown_wave_impact_falls_back_to_full", () => {
  const decision = decideWaveImpactV2(input("generated/unknown.lock"));
  assert.equal(decision.mode, "full");
  assert.deepEqual(decision.affected_slice_ids, ["SFC-001", "SFC-002"]);
  assert.deepEqual(decision.affected_spec_ids, [
    "SFC-001:VS-A",
    "SFC-001:VS-A-OTHER",
    "SFC-002:VS-B",
  ]);
});

test("global_constraint_specs_always_run", () => {
  const value = input("src/a.ts");
  value.global_constraint_spec_ids = ["SFC-002:VS-B"];
  const decision = decideWaveImpactV2(value);
  assert.deepEqual(decision.affected_slice_ids, ["SFC-001", "SFC-002"]);
  assert.deepEqual(decision.affected_spec_ids, [
    "SFC-001:VS-A",
    "SFC-002:VS-B",
  ]);
  assert.ok(
    decision.reason_evidence.includes("SFC-002:VS-B:global_constraint"),
  );
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
      "SFC-001": envelope(["src/a.ts", "src/a-other.ts"]),
      "SFC-002": envelope(["src/b.ts"]),
    },
    spec_profiles: {
      "SFC-001": [
        spec("SFC-001", "VS-A", ["src/a.ts"]),
        spec("SFC-001", "VS-A-OTHER", ["src/a-other.ts"]),
      ],
      "SFC-002": [spec("SFC-002", "VS-B", ["src/b.ts"])],
    },
    global_constraint_spec_ids: [],
  };
}

function spec(slice_id, spec_id, paths) {
  return {
    slice_id,
    spec_id,
    binding_paths: paths,
    verification_paths: paths,
    contract_keys: [],
    context_refs: [],
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
  const identity = {
    schema_version: "slice-change-envelope-v1",
    allowed_write_paths,
    allowed_supporting_paths: [],
    allowed_contract_keys: [],
    forbidden_paths: [
      ".codex/composite-long-task/**",
      ".codex/ty-context-active-long-task.json",
      ".codex/ty-context-final-result-receipt.json",
      "project_context/**",
    ],
    undeclared_change_policy: "reject",
  };
  return { ...identity, envelope_sha256: sha256Hex(canonicalJson(identity)) };
}
