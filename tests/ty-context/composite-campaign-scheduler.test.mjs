import test from "node:test";
import assert from "node:assert/strict";
import { analyzeConflictV4, deriveConflictProfileV4, pathPatternsMayOverlapV4 } from "../../packages/ty-context/dist/lib/composite-campaign-conflicts.js";
import { selectDeterministicWaveV4 } from "../../packages/ty-context/dist/lib/composite-campaign-scheduler.js";

test("independent_slices_same_wave", () => {
  const wave = selectDeterministicWaveV4([
    profile("SFC-001", { write_paths: ["src/a/**"] }),
    profile("SFC-002", { write_paths: ["src/b/**"] }),
  ]);
  assert.deepEqual(wave.slice_ids, ["SFC-001", "SFC-002"]);
  assert.equal(wave.pair_decisions[0].can_parallel, true);
});

test("explicit_dependency_serial", () => {
  const left = profile("SFC-001", { depends_on: ["SFC-002"] });
  const right = profile("SFC-002");
  assert.deepEqual(codes(analyzeConflictV4(left, right)), ["explicit_dependency"]);
  assert.equal(selectDeterministicWaveV4([left, right]).slice_ids.length, 1);
});

test("overlapping_path_serial", () => {
  assert.equal(pathPatternsMayOverlapV4("src/message/**", "src/message/page.tsx"), true);
  assert.equal(pathPatternsMayOverlapV4("src/a/**", "src/b/**"), false);
  const decision = analyzeConflictV4(profile("SFC-001", { write_paths: ["src/message/**"] }), profile("SFC-002", { write_paths: ["src/message/page.tsx"] }));
  assert.ok(codes(decision).includes("write_write_overlap"));
  assert.equal(decision.can_parallel, false);
});

test("shared_schema_serial", () => {
  const decision = analyzeConflictV4(
    profile("SFC-001", { contract_keys: ["schema:api/schema.json#/Result"] }),
    profile("SFC-002", { contract_keys: ["schema:api/schema.json#/Result"] }),
  );
  assert.deepEqual(codes(decision), ["contract_key_overlap"]);
});

test("shared_resource_lock_serial", () => {
  const decision = analyzeConflictV4(
    profile("SFC-001", { resource_locks: ["browser:primary"] }),
    profile("SFC-002", { resource_locks: ["browser:primary"] }),
  );
  assert.deepEqual(codes(decision), ["resource_lock_overlap"]);
});

test("Scope Fit V4 cohesion, migration, generated artifact, package manifest, and environment evidence serialize",()=>{
  const left=profile("SFC-001",{source_unit_cohesion_keys:["same-outcome"],migration_sequences:["db-v7"],generated_artifacts:["dist/schema.json"],package_manager_manifests:["package-lock.json"],environment_profiles:["integration"]});
  const right=profile("SFC-002",{source_unit_cohesion_keys:["same-outcome"],migration_sequences:["db-v7"],generated_artifacts:["dist/**"],package_manager_manifests:["package-lock.json"],environment_profiles:["integration"]});
  assert.deepEqual(codes(analyzeConflictV4(left,right)),["source_unit_cohesion_overlap","migration_sequence_overlap","generated_artifact_overlap","package_manager_manifest_overlap","environment_profile_overlap"]);
});

test("unknown_conflict_defaults_serial", () => {
  const unknown = profile("SFC-001", { positive_evidence_complete: false, unknown_reasons: ["implementation_targets_missing"] });
  const known = profile("SFC-002");
  const decision = analyzeConflictV4(unknown, known);
  assert.ok(codes(decision).includes("unknown_parallel_evidence"));
  assert.deepEqual(selectDeterministicWaveV4([unknown, known]).slice_ids, ["SFC-001"]);
});

test("stable_order_is_deterministic and the selected set is maximum, not greedy", () => {
  const first = profile("SFC-001", { stable_key: "a", write_paths: ["shared/**"], resource_locks: ["service:one"] });
  const second = profile("SFC-002", { stable_key: "b", write_paths: ["shared/file.ts"] });
  const third = profile("SFC-003", { stable_key: "c", resource_locks: ["service:one"] });
  const expected = ["SFC-002", "SFC-003"];
  assert.deepEqual(selectDeterministicWaveV4([third, first, second]).slice_ids, expected);
  assert.deepEqual(selectDeterministicWaveV4([second, third, first]).slice_ids, expected);
});

test("scheduler caps a maximum conflict-free wave at four", () => {
  const profiles = [5, 2, 4, 1, 3].map((number) => profile(`SFC-00${number}`, { stable_key: `slice-${number}`, write_paths: [`src/${number}/**`] }));
  const wave = selectDeterministicWaveV4(profiles, { max_concurrency: 99 });
  assert.equal(wave.capacity, 4);
  assert.deepEqual(wave.slice_ids, ["SFC-001", "SFC-002", "SFC-003", "SFC-004"]);
  assert.deepEqual(wave.deferred[0].reason_codes, ["capacity_limit"]);
});

test("packet preflight material derives positive write, read, contract, and Context evidence", () => {
  const derived = deriveConflictProfileV4(scopeSlice(), {
    product: { requirements: [{ context_refs: ["project_context/areas/main.md"] }] },
    plan: { plan_items: [{ obligations: [{ implementation_bindings: [{ id: "IB-001", kind: "file", target: "src/value.ts" }, { id: "IB-002", kind: "schema", target: "schema.json#/Result" }] }] }] },
    checklist: { verification_specs: [{ input_paths: ["src/**"], oracle: { entrypoint: "tests/oracle.mjs" }, command_steps: [{ tool: "node_script", target: "tests/oracle.mjs" }] }], counterexample_fixtures: [{ path: "tests/fixtures/bad.json" }] },
  });
  assert.equal(derived.positive_evidence_complete, true);
  assert.deepEqual(derived.write_paths, ["src/value.ts"]);
  assert.deepEqual(derived.contract_keys, ["schema:schema.json#/Result"]);
  assert.ok(derived.read_paths.includes("project_context/areas/main.md"));
});

function profile(slice_id, overrides = {}) {
  return {
    slice_id, stable_key: overrides.stable_key ?? slice_id.toLowerCase(), priority: overrides.priority ?? 1,
    depends_on: [], produces_contracts: [], consumes_contracts: [], write_paths: [`src/${slice_id.toLowerCase()}/**`],
    read_paths: [`tests/${slice_id.toLowerCase()}/**`], contract_keys: [], resource_locks: [], context_refs: [],
    conflict_domains: [slice_id], positive_evidence_complete: true, unknown_reasons: [], ...overrides,
  };
}
function codes(decision) { return [...new Set(decision.reasons.map((reason) => reason.code))]; }
function scopeSlice() { return { slice_id: "SFC-001", stable_key: "slice-1", title: "Slice", objective: "Deliver", depends_on: [], priority: 1, source_refs: ["SRC-001"], scope_summary: ["value"], out_of_scope: [], produces_contracts: [], consumes_contracts: [], conflict_domains: ["value"], resource_locks: [] }; }
