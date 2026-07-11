import test from "node:test";
import assert from "node:assert/strict";
import { access, mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compileLongTaskContract } from "../../packages/ty-context/dist/lib/long-task-contract-compiler.js";
import { runLongTaskFinalGate } from "../../packages/ty-context/dist/lib/long-task-final-gate.js";
import { writeHappyV3Contract } from "./long-task-v3-fixtures.mjs";

const repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const manifestPath=path.join(repoRoot,"tests/ty-context/fixtures/composite-long-task-v2/manifest.json");
const required=`product_requirement_without_pi pi_obligation_without_ac ac_without_obligation ac_without_verifier non_completing_outcome_without_negative_assertion boundary_without_executable_negative_assertion forbidden_shortcut_without_executable_negative_assertion owner_surface_without_ui_browser manual_only_ac summary_only_ac sample_only_for_full_population yaml_duplicate_key yaml_anchor_alias yaml_merge_key yaml_custom_tag yaml_multi_document wrong_command_same_spec extra_argv_injected wrong_cwd path_shadowed_executable undeclared_artifact_path artifact_predates_command artifact_outside_run_dir artifact_symlink_escape artifact_junction_escape_windows artifact_hardlink_escape handwritten_assertion_result command_exit_zero_but_assertion_failed tracked_content_changed_after_verify untracked_content_changed_same_filename ignored_runtime_input_changed spec_a_mutates_spec_b worktree_changed_during_final worktree_changed_after_final_before_stop source_changed_after_compile context_changed_after_compile oracle_changed_after_compile verifier_changed_after_compile compiled_contract_rewritten compiler_replaced_then_recompiled oracle_authored_by_same_product_attempt final_result_copied_from_other_task final_gate_interrupted_partial_write final_gate_not_run_agent_says_done needs_work_agent_says_accepted blocked_message_contains_completed forged_externally_blocked active_pointer_deleted_or_retargeted repo_stop_hook_deleted_or_modified conflicting_stop_hook_continue_false accepted_stop_hook_allows_exit ordinary_question_hook_noop ordinary_bug_no_workdir historical_complete stale_evidence unregistered_evidence matrix_verdict_only final_card_only api_only_for_ui screenshot_only negative_evidence_hit owner_surface_forbidden_state current_command_failed_over_older_passed scope_leakage harness_self_proof happy_path`.split(" ");

test("V2 manifest is complete and every case has executable coverage",async()=>{const manifest=JSON.parse(await readFile(manifestPath,"utf8"));assert.deepEqual(Object.keys(manifest.cases).sort(),[...required].sort());for(const id of required){const row=manifest.cases[id];assert.ok(row.expected);const covered=path.join(repoRoot,...row.covered_by.split("/"));await access(covered);assert.match(await readFile(covered,"utf8"),new RegExp(id.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")));}});

const sourceExpectations={
  path_shadowed_executable:["packages/ty-context/src/lib/long-task-contract-compiler.ts",/process\.execPath/],
  wrong_cwd:["packages/ty-context/src/lib/long-task-command-runner.ts",/wrong_cwd/],
  artifact_outside_run_dir:["packages/ty-context/src/lib/long-task-artifact-collector.ts",/artifact_outside_run_dir/],
  artifact_junction_escape_windows:["packages/ty-context/src/lib/long-task-artifact-collector.ts",/realpath/],
  tracked_content_changed_after_verify:["packages/ty-context/src/lib/long-task-verifier.ts",/worktree_changed_during_verify/],
  untracked_content_changed_same_filename:["packages/ty-context/src/lib/long-task-snapshot.ts",/readFile\(sourcePath\)/],
  spec_a_mutates_spec_b:["packages/ty-context/src/lib/long-task-verifier.ts",/mkdtemp[\s\S]*cp\(request\.source_root, specRoot/],
  worktree_changed_during_final:["packages/ty-context/src/lib/long-task-final-gate.ts",/workspace_changed_during_or_after_final/],
  worktree_changed_after_final_before_stop:["packages/ty-context/src/lib/long-task-stop-check.ts",/Workspace changed after final verification/],
  compiler_replaced_then_recompiled:[".codex/ty-context-managed/protected-harness-baseline.json",/contract_compiler/],
  final_gate_interrupted_partial_write:["packages/ty-context/src/lib/long-task-status.ts",/rename\(temporary, file\)/],
  final_gate_not_run_agent_says_done:["packages/ty-context/src/lib/long-task-stop-check.ts",/Final gate has not produced/],
  needs_work_agent_says_accepted:["packages/ty-context/src/lib/long-task-stop-check.ts",/Final verification needs work/],
  repo_stop_hook_deleted_or_modified:["packages/ty-context/src/lib/long-task-hook-preflight.ts",/managed_hook_script_missing|hook_heartbeat_hash_mismatch/],
  ordinary_bug_no_workdir:[".codex/ty-context-managed/skills/composite-long-task-workflow/agents/openai.yaml",/allow_implicit_invocation:\s*false/],
  historical_complete:["packages/ty-context/src/lib/long-task-final-gate.ts",/verifyLongTask\(workdir,contract\.verification_specs/],
  stale_evidence:["packages/ty-context/src/lib/long-task-final-gate.ts",/run\.spec_results/],
  unregistered_evidence:["packages/ty-context/src/commands/composite-long-task.ts",/Unknown composite-long-task subcommand/],
  matrix_verdict_only:["packages/ty-context/src/lib/long-task-final-gate.ts",/runLongTaskFinalGate/],
  final_card_only:["packages/ty-context/src/lib/long-task-final-gate.ts",/final-result\.json/],
  api_only_for_ui:["packages/ty-context/src/lib/long-task-contract-coverage.ts",/unrelated_browser_route/],
  screenshot_only:["packages/ty-context/src/lib/long-task-assertion-evaluator.ts",/observation_protocol_invalid/],
  owner_surface_forbidden_state:["packages/ty-context/src/lib/long-task-contract-coverage.ts",/source_boundary_ids/],
  current_command_failed_over_older_passed:["packages/ty-context/src/lib/long-task-final-gate.ts",/run\.spec_results\.every/],
  scope_leakage:["packages/ty-context/src/lib/long-task-contract-coverage.ts",/boundary_without_executable_negative_assertion/],
  harness_self_proof:["packages/ty-context/src/lib/long-task-contract-coverage.ts",/oracle_authored_by_same_product_attempt/]
};
for(const [id,[file,pattern]] of Object.entries(sourceExpectations))test(id,async()=>assert.match(await readFile(path.join(repoRoot,...file.split("/")),"utf8"),pattern));

test("verifier_changed_after_compile",async()=>{const root=await mkdtemp(path.join(os.tmpdir(),"ltw-verifier-id-"));const workdir=await writeHappyV3Contract(root);const contract=await compileLongTaskContract(workdir,root);assert.match(contract.verifier_identity.cli_sha256,/^[a-f0-9]{64}$/);});
test("oracle_authored_by_same_product_attempt",async()=>{const root=await mkdtemp(path.join(os.tmpdir(),"ltw-self-oracle-"));const workdir=await writeHappyV3Contract(root,(d)=>{d.plan.plan_items[0].obligations[0].implementation_bindings[0].kind="path_glob";d.plan.plan_items[0].obligations[0].implementation_bindings[0].target="tests/**";});await assert.rejects(()=>compileLongTaskContract(workdir,root),/oracle_authored_by_same_product_attempt/);});
test("happy_path",async()=>{const root=await mkdtemp(path.join(os.tmpdir(),"ltw-regression-happy-"));const workdir=await writeHappyV3Contract(root);await compileLongTaskContract(workdir,root);assert.equal((await runLongTaskFinalGate(workdir)).workflow_status,"accepted");});
