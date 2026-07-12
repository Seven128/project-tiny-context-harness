import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { registeredBlackBoxV3CaseIds } from "./black-box-v3-cases.mjs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const v3 = path.join(repo, "tests", "ty-context", "fixtures", "composite-long-task-v3", "manifest.json");
const obsolete = [
  "tests/ty-context/fixtures/composite-long-task-v2/manifest.json",
  "tests/ty-context/composite-long-task-v2-regression.test.mjs",
  ".codex/ty-context-managed/protected-harness-baseline.json",
  "packages/ty-context/assets/protected-harness-baseline.json",
  "tools/verify_composite_long_task_equivalence.mjs",
  ".codex/hooks.json",
  ".codex/hooks/long-task-hook.mjs",
  ".codex/ty-context-long-task-hook-heartbeat.json",
  "packages/ty-context/src/lib/long-task-hook-install.ts",
  "tests/ty-context/composite-long-task-hook-install.test.mjs",
  ".codex/ty-context-managed/hooks/long-task-hook.mjs",
  "packages/ty-context/assets/hooks/long-task-hook.mjs",
];
const required = [...new Set(`empty_product_requirements duplicate_plan_item plan_item_without_obligation obligation_without_binding empty_validates empty_does_not_validate unrelated_negative_assertion unrelated_browser_route proof_surface_without_capability binding_without_observer v2_product_source_rejected v2_technical_plan_rejected v2_acceptance_rejected observation_v1_rejected implementation_missing_oracle_constant_success implementation_binding_missing binding_present_but_behavior_noop oracle_actual_mismatch oracle_forbidden_actual_present oracle_self_signed_passed oracle_passed_true_actual_wrong oracle_contains_passed_field negative_assertion_actual_is_forbidden population_partial_claimed_complete population_one_of_one_hundred population_unknown_exclusion population_duplicate_ids counterfactual_removed_implementation_still_passes counterfactual_wrong_binding_target counterfactual_still_passes oracle_transitive_helper_changed oracle_transitive_dependency_changed oracle_dynamic_import_escape oracle_unfrozen_npm_dependency repo_relative_executable_helper_changed oracle_child_process_unpinned_command weaken_sources_then_recompile replace_oracle_then_recompile compile_second_workdir delete_repo_pointer_but_host_registry_exists rewrite_both_repo_pointers both_repo_pointers_deleted same_contract_idempotent_compile oracle_lists_unexecuted_alternatives wrong_blocker_reason implementation_failure_plus_blocker missing_probe_artifact local_alternative_succeeds trusted_mfa_blocker external_blocker_not_probed historical_final_result copied_final_result final_result_forged workspace_changed_during_final workspace_changed_after_final host_hooks_disabled non_managed_hook conflicting_continue_false_hook ordinary_question_no_active_task happy_path`.split(" "))].sort();

test("the release matrix is a complete structured V3 black-box runtime manifest", async () => {
  const manifest = JSON.parse(await readFile(v3, "utf8"));
  assert.equal(manifest.schema_version, "composite-v3-black-box-manifest-v1");
  assert.ok(Array.isArray(manifest.cases), "manifest cases must be an array, not covered_by claims");
  assert.deepEqual(manifest.cases.map((row) => row.id).sort(), required);
  assert.equal(manifest.cases.length, 60, "the merged source + Appendix matrix has exactly 60 unique cases");
  assert.equal(new Set(manifest.cases.map((row) => row.id)).size, manifest.cases.length);
  assert.deepEqual(registeredBlackBoxV3CaseIds, required);
  for (const row of manifest.cases) {
    assert.deepEqual(Object.keys(row).sort(), ["entrypoint", "expected_code", "expected_status", "hfc", "id", "platforms", "test_file", "test_name", "test_type"].sort());
    assert.equal(row.test_type, "black_box_cli_runtime");
    assert.equal(row.test_file, "tests/ty-context/composite-long-task-v3-black-box.test.mjs");
    assert.equal(row.test_name, row.id);
    assert.ok(["compile", "verify", "final-gate", "managed-hook"].includes(row.entrypoint));
    assert.ok(["compile_rejected", "needs_work", "blocked", "accepted", "noop"].includes(row.expected_status));
    assert.match(row.expected_code, /^[a-z][a-z0-9_]*$/u);
    assert.deepEqual([...new Set(row.platforms)].sort(), row.platforms);
    assert.ok(row.platforms.length > 0 && row.platforms.every((platform) => ["windows", "linux", "macos"].includes(platform)));
  }
  for (const relative of obsolete) await assert.rejects(readFile(path.join(repo, ...relative.split("/"))), { code: "ENOENT" });
});
