import { createHash } from "node:crypto";
import { execFile, spawnSync } from "node:child_process";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import YAML from "yaml";

const exec = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const candidateCli = path.join(repoRoot, "packages", "ty-context", "dist", "cli.js");

export async function writeHappyV3Contract(root, mutate = () => {}) {
  const task = path.join(root, "task");
  await Promise.all([
    mkdir(path.join(root, "project_context"), { recursive: true }),
    mkdir(path.join(root, "tests", "acceptance"), { recursive: true }),
    mkdir(path.join(root, "src"), { recursive: true }),
    mkdir(task, { recursive: true })
  ]);
  await writeFile(path.join(root, "project_context", "context.toml"), "schema_version = 4\n", "utf8");
  await writeFile(path.join(root, "src", "value.txt"), "good\n", "utf8");
  await writeFile(
    path.join(root, "tests", "acceptance", "oracle.mjs"),
    `import {readFile} from "node:fs/promises";\nconst value=await readFile(new URL("../../src/value.txt",import.meta.url),"utf8").then(v=>v.trim(),()=>null);\nconsole.log(JSON.stringify({schema_version:"ty-context-observation-v2",observations:{works:{kind:"runtime_behavior",actual:{binding_id:"IB-002",capability:"value.read",value},artifact_refs:[]},forbidden:{kind:"scalar",actual:value,artifact_refs:[]}}}));\n`,
    "utf8"
  );
  const data = happyV3Data();
  mutate(data);
  await Promise.all([
    ["product-architecture-source.yaml", data.product],
    ["technical-realization-plan.yaml", data.plan],
    ["acceptance-checklist.yaml", data.checklist]
  ].map(([file, value]) => writeFile(path.join(task, file), YAML.stringify(value), "utf8")));
  await installLegacyHostSmoke(root);
  await exec("git", ["init"], { cwd: root });
  await exec("git", ["config", "user.email", "long-task-v3-fixture@example.invalid"], { cwd: root });
  await exec("git", ["config", "user.name", "Long Task V3 Fixture"], { cwd: root });
  await exec("git", ["add", "."], { cwd: root });
  await exec("git", ["commit", "-m", "fixture baseline"], { cwd: root });
  return task;
}

export function runCompositeCompile(root, task) {
  return spawnSync(process.execPath, [candidateCli, "composite-long-task", "compile", task], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" }
  });
}

export function observationV2Envelope(value="good",bindingId="IB-002",capability="value.read"){
  return {schema_version:"ty-context-observation-v2",observations:{works:{kind:"runtime_behavior",actual:{binding_id:bindingId,capability,value},artifact_refs:[]},forbidden:{kind:"scalar",actual:value,artifact_refs:[]}}};
}

export function observationV2OracleScript(value="good",bindingId="IB-002",capability="value.read",delayMs=0){
  return `${delayMs?`await new Promise(resolve=>setTimeout(resolve,${delayMs}));`:""}console.log(${JSON.stringify(JSON.stringify(observationV2Envelope(value,bindingId,capability)))})\n`;
}

export function addSecondRequirementBranch(data) {
  data.product.owner_surfaces.push({ id: "OS-SECONDARY", kind: "runtime", location: "secondary", primary_action: "run", expected_feedback: "secondary-visible" });
  data.product.requirements.push({ id: "PR-002", statement: "Secondary capability works", observable_outcome: "Secondary result is visible", owner_boundary: "secondary", owner_surface_refs: ["OS-SECONDARY"], context_refs: ["project_context/context.toml"], population_policy: "not_applicable" });
  data.product.boundaries.push({ id: "PB-002", rule: "Secondary boundary", requirement_refs: ["PR-002"] });
  data.product.non_completing_outcomes.push({ id: "NCO-002", forbidden_outcome: "Secondary no-op", requirement_refs: ["PR-002"] });
  data.plan.plan_items.push({
    id: "PI-002",
    title: "Implement secondary",
    implementation_notes: [],
    obligations: [{
      id: "PI-002-OB-001",
      statement: "Implement secondary behavior",
      source_requirement_ids: ["PR-002"],
      implementation_bindings: [
        { id: "IB-003", kind: "file", target: "src/value.txt", verification: { mode: "harness_static" } },
        { id: "IB-004", kind: "runtime_capability", target: "value.secondary", verification: { mode: "oracle_observation", spec_id: "VS-AC-002", observation_id: "works" } }
      ],
      forbidden_shortcuts: [{ id: "FS-002", statement: "No secondary no-op", source_boundary_ids: ["PB-002"], source_non_completing_ids: ["NCO-002"] }],
      related_ac_ids: ["AC-002"],
      counterfactual_control_ids: ["CF-PI-002-OB-001"]
    }]
  });
  data.plan.counterfactual_controls.push({ id: "CF-PI-002-OB-001", obligation_ids: ["PI-002-OB-001"], mutation: { type: "remove_binding_targets", binding_ids: ["IB-003"] }, expected_failed_assertion_ids: ["PA-002"] });
  data.checklist.proof_requirements.push({ id: "PRF-AC-002-RUNTIME", proof_surface: "runtime_behavior", obligation_refs: ["PI-002-OB-001"], owner_surface_refs: ["OS-SECONDARY"], verification_spec_ids: ["VS-AC-002"] });
  data.checklist.acceptance_criteria.push({ id: "AC-002", title: "Secondary runtime works", obligation_refs: ["PI-002-OB-001"], validates: ["secondary runtime behavior"], does_not_validate: ["primary runtime behavior"], proof_requirement_refs: ["PRF-AC-002-RUNTIME"], verification_spec_ids: ["VS-AC-002"] });
  data.checklist.verification_specs.push(makeSpec("002", { requirement: "PR-002", planItem: "PI-002", obligation: "PI-002-OB-001", bindings: ["IB-003", "IB-004"], ac: "AC-002", proof: "PRF-AC-002-RUNTIME", boundary: "PB-002", outcome: "NCO-002", shortcut: "FS-002" }));
}

function happyV3Data() {
  return {
    product: {
      schema_version: "product-source-v3",
      product_goal: "Deliver the capability",
      delivery_scope: "system_capability_build",
      full_population_required: false,
      owner_surfaces: [{ id: "OS-RUNTIME", kind: "runtime", location: "value-reader", primary_action: "read-value", expected_feedback: "good-visible" }],
      requirements: [{ id: "PR-001", statement: "Capability works", observable_outcome: "Oracle observes the product value", owner_boundary: "runtime", owner_surface_refs: ["OS-RUNTIME"], context_refs: ["project_context/context.toml"], population_policy: "not_applicable" }],
      boundaries: [{ id: "PB-001", rule: "No shortcut", requirement_refs: ["PR-001"] }],
      non_completing_outcomes: [{ id: "NCO-001", forbidden_outcome: "No-op", requirement_refs: ["PR-001"] }],
      population_exclusion_rules: [],
      representative_samples_validate: [],
      representative_samples_do_not_validate: [],
      out_of_scope_backlog: []
    },
    plan: {
      schema_version: "technical-plan-v3",
      plan_items: [{
        id: "PI-001",
        title: "Implement",
        implementation_notes: [],
        obligations: [{
          id: "PI-001-OB-001",
          statement: "Implement behavior",
          source_requirement_ids: ["PR-001"],
          implementation_bindings: [
            { id: "IB-001", kind: "file", target: "src/value.txt", verification: { mode: "harness_static" } },
            { id: "IB-002", kind: "runtime_capability", target: "value.read", verification: { mode: "oracle_observation", spec_id: "VS-AC-001", observation_id: "works" } }
          ],
          forbidden_shortcuts: [{ id: "FS-001", statement: "No no-op", source_boundary_ids: ["PB-001"], source_non_completing_ids: ["NCO-001"] }],
          related_ac_ids: ["AC-001"],
          counterfactual_control_ids: ["CF-PI-001-OB-001"]
        }]
      }],
      counterfactual_controls: [{ id: "CF-PI-001-OB-001", obligation_ids: ["PI-001-OB-001"], mutation: { type: "remove_binding_targets", binding_ids: ["IB-001"] }, expected_failed_assertion_ids: ["PA-001"] }]
    },
    checklist: {
      schema_version: "acceptance-checklist-v3",
      counterexample_fixtures: [],
      proof_requirements: [{ id: "PRF-AC-001-RUNTIME", proof_surface: "runtime_behavior", obligation_refs: ["PI-001-OB-001"], owner_surface_refs: ["OS-RUNTIME"], verification_spec_ids: ["VS-AC-001"] }],
      acceptance_criteria: [{ id: "AC-001", title: "Runtime works", obligation_refs: ["PI-001-OB-001"], validates: ["runtime behavior"], does_not_validate: ["unrelated behavior"], proof_requirement_refs: ["PRF-AC-001-RUNTIME"], verification_spec_ids: ["VS-AC-001"] }],
      verification_specs: [makeSpec("001", { requirement: "PR-001", planItem: "PI-001", obligation: "PI-001-OB-001", bindings: ["IB-001", "IB-002"], ac: "AC-001", proof: "PRF-AC-001-RUNTIME", boundary: "PB-001", outcome: "NCO-001", shortcut: "FS-001" })],
      environment_probes: []
    }
  };
}

function makeSpec(suffix, refs) {
  const runtimeExpected=suffix==="001"?{binding_id:"IB-002",capability:"value.read",value:"good"}:{binding_id:"IB-004",capability:"value.secondary",value:"good"};
  return {
    id: `VS-AC-${suffix}`,
    runner_type: "node_oracle",
    proof_capabilities: ["runtime_behavior"],
    claims: { requirement_ids: [refs.requirement], plan_item_ids: [refs.planItem], obligation_ids: [refs.obligation], binding_ids: refs.bindings ?? [refs.binding], ac_ids: [refs.ac], proof_requirement_ids: [refs.proof] },
    oracle: { entrypoint: "tests/acceptance/oracle.mjs" },
    cwd: ".",
    timeout_ms: 10000,
    input_paths: ["src/**"],
    artifact_globs: [],
    network_policy: { mode: "none", allowed_hosts: [] },
    command_steps: [{ id: `CMD-${suffix}`, tool: "node_script", target: "tests/acceptance/oracle.mjs", argv: [], cwd: ".", timeout_ms: 10000, environment_refs: [], output_artifact_ids: [] }],
    environment_refs: [],
    positive_assertions: [{ id: `PA-${suffix}`, observation_id: "works", observation_kind: "runtime_behavior", operator: "equals", expected: runtimeExpected }],
    negative_assertions: [{ id: `NA-${suffix}`, observation_id: "forbidden", observation_kind: "scalar", operator: "not_equals", expected: "forbidden", source_boundary_ids: [refs.boundary], source_non_completing_ids: [refs.outcome], source_forbidden_shortcut_ids: [refs.shortcut] }],
    environment_requirements: []
  };
}

async function installLegacyHostSmoke(root) {
  const hooks = path.join(root, ".codex", "hooks");
  const installedCli = path.join(root, "node_modules", "project-tiny-context-harness", "dist", "cli.js");
  await Promise.all([mkdir(hooks, { recursive: true }), mkdir(path.dirname(installedCli), { recursive: true })]);
  await copyFile(candidateCli, installedCli);
  const script = "process.stdout.write('{}\\n');\n";
  const config = `${JSON.stringify({ hooks: Object.fromEntries(["SessionStart", "PostCompact", "Stop"].map((event) => [event, [{ hooks: [{ type: "command", command: "node .codex/hooks/long-task-hook.mjs" }] }]])) }, null, 2)}\n`;
  const scriptFile = path.join(hooks, "long-task-hook.mjs");
  const configFile = path.join(root, ".codex", "hooks.json");
  await writeFile(scriptFile, script, "utf8");
  await writeFile(configFile, config, "utf8");
  const scriptHash = hash(script);
  const configHash = hash(config);
  const bundleHash = hash(`${configHash}:${scriptHash}`);
  await writeFile(path.join(root, ".codex", "ty-context-long-task-hook-heartbeat.json"), `${JSON.stringify({ repository_root: root, hook_sha256: scriptHash, bundle_sha256: bundleHash, verifier_cli_path: installedCli, verifier_cli_sha256: hash(await import("node:fs/promises").then(({ readFile }) => readFile(installedCli))), verifier_drift_observed: false, events: { Stop: new Date().toISOString() } }, null, 2)}\n`, "utf8");
}

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}
