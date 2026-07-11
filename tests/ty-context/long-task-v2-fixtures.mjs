import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const exec = promisify(execFile);

export async function writeHappyContract(root, mutate = () => {}) {
  await mkdir(path.join(root, "project_context"), { recursive: true }); await mkdir(path.join(root, "tests", "acceptance"), { recursive: true }); await mkdir(path.join(root, "task"), { recursive: true });
  await writeFile(path.join(root, "project_context", "context.toml"), "schema_version = 4\n");
  await writeFile(path.join(root, "tests", "acceptance", "oracle.mjs"), `console.log(JSON.stringify({schema_version:"ty-context-observation-v1",checks:{works:{passed:true,actual:"ok"},forbidden:{passed:true,actual:"absent"}}}))\n`);
  const data = {
    product: { schema_version: "product-source-v2", product_goal: "Deliver the capability", delivery_scope: "system_capability_build", full_population_required: false, requirements: [{ id: "PR-001", statement: "Capability works", observable_outcome: "Oracle observes success", owner_boundary: "runtime", owner_surfaces: [], context_refs: ["project_context/context.toml"], population_policy: "not_applicable" }], boundaries: [{ id: "PB-001", rule: "No shortcut" }], non_completing_outcomes: [{ id: "NC-001", forbidden_outcome: "No-op" }], representative_samples_validate: [], representative_samples_do_not_validate: [], out_of_scope_backlog: [] },
    plan: { schema_version: "technical-plan-v2", plan_items: [{ id: "PI-001", title: "Implement", obligations: [{ id: "PI-001-OB-001", statement: "Implement behavior", source_requirement_ids: ["PR-001"], implementation_bindings: { paths: ["src/**"], symbols: [], schemas: [], routes: [] }, forbidden_shortcuts: [{ id: "FS-001", statement: "No no-op", source_boundary_ids: ["PB-001"] }], related_ac_ids: ["AC-001"] }], implementation_notes: [] }] },
    checklist: { schema_version: "acceptance-checklist-v2", acceptance_criteria: [{ id: "AC-001", title: "Runtime works", obligation_refs: ["PI-001-OB-001"], validates: ["runtime behavior"], does_not_validate: ["unrelated behavior"], proof_surfaces: ["runtime_behavior"], verification_specs: [{ id: "VS-AC-001", runner_type: "process", executable: "node", argv: ["tests/acceptance/oracle.mjs"], cwd: "repo_root", timeout_ms: 10000, oracle_protocol: "ty-context-observation-v1", oracle_paths: ["tests/acceptance/oracle.mjs"], implementation_test_paths: [], input_paths: ["src/**"], artifact_globs: [], positive_assertions: [{ id: "PA-001", oracle_check_id: "works", expected: "ok" }], negative_assertions: [{ id: "NA-001", oracle_check_id: "forbidden", forbidden: "present", source_boundary_ids: ["PB-001"], source_non_completing_ids: ["NC-001"], source_forbidden_shortcut_ids: ["FS-001"] }], invalid_completion_signals: ["file exists"], environment_requirements: [] }] }] }
  };
  mutate(data);
  await Promise.all([["product-architecture-source.yaml", data.product], ["technical-realization-plan.yaml", data.plan], ["acceptance-checklist.yaml", data.checklist]].map(([file, value]) => writeFile(path.join(root, "task", file), YAML.stringify(value))));
  await exec("git", ["init"], { cwd: root });
  await exec("git", ["config", "user.email", "long-task-fixture@example.invalid"], { cwd: root });
  await exec("git", ["config", "user.name", "Long Task Fixture"], { cwd: root });
  await exec("git", ["add", "."], { cwd: root });
  await exec("git", ["commit", "-m", "fixture baseline"], { cwd: root });
  return path.join(root, "task");
}
