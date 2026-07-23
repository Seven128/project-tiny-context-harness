import { execFile } from "node:child_process";
import { rmSync } from "node:fs";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import YAML from "yaml";

const exec = promisify(execFile);
const repo = fileURLToPath(new URL("../..", import.meta.url));
const cli = path.join(repo, "packages/ty-context/dist/cli.js");
const fixtureSeedEnvironment = "TY_CONTEXT_DELIVERY_FIXTURE_SEED_ROOT";
const ownedFixtureSeeds = new Set();
let standaloneSeedPromise = null;
let cleanupHookRegistered = false;

export async function createDeliveryFixture(options = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "ty-context-delivery-"));
  try {
    const seedRoot = await resolveFixtureSeedRoot(options.fixtureSeedRoot);
    const variant = options.externalConfirmation ? "external" : "default";
    const template = path.join(seedRoot, variant);
    await assertSeedRepository(template);
    await cp(template, root, { recursive: true, force: true });
  } catch (error) {
    await rm(root, { recursive: true, force: true });
    throw error;
  }
  const workdir = path.join(root, ".long-task");
  await mkdir(workdir, { recursive: true });
  const contract = deliveryContract(options);
  addDefaultSensitivityControls(contract);
  await writeContract(workdir, contract);
  return { root, workdir, contract };
}

export async function prepareDeliveryFixtureSeed() {
  const root = await mkdtemp(
    path.join(os.tmpdir(), "ty-context-delivery-seed-"),
  );
  try {
    await initializeSeedRepository(path.join(root, "default"), false);
    await initializeSeedRepository(path.join(root, "external"), true);
  } catch (error) {
    await rm(root, { recursive: true, force: true });
    throw error;
  }
  ownedFixtureSeeds.add(root);
  registerSeedCleanupHook();
  let cleaned = false;
  return {
    root,
    async cleanup() {
      if (cleaned) return;
      cleaned = true;
      ownedFixtureSeeds.delete(root);
      await rm(root, { recursive: true, force: true });
    },
  };
}

async function initializeSeedRepository(root, externalConfirmation) {
  await mkdir(path.join(root, "src"), { recursive: true });
  await mkdir(path.join(root, "tests"), { recursive: true });
  await mkdir(path.join(root, "artifacts"), { recursive: true });
  await mkdir(path.join(root, "project_context", "areas"), { recursive: true });
  await writeFile(
    path.join(root, "src", "state.json"),
    `${JSON.stringify({ first: true, second: false })}\n`,
  );
  await writeFile(
    path.join(root, "artifacts", "proof.json"),
    '{"fixture_proof":true}\n',
  );
  await writeFile(
    path.join(root, "source.md"),
    `# Fixture source

<!-- ty-source-item:start key=first-observable kind=requirement -->
The first outcome must be observable.
<!-- ty-source-item:end -->
${
  externalConfirmation
    ? `
## Fixture external

<!-- ty-source-item:start key=fixture-external kind=external_confirmation -->
Confirm the fixture in external delivery.
<!-- ty-source-item:end -->
`
    : ""
}
`,
  );
  await writeFile(
    path.join(root, "tests", "oracle.mjs"),
    `import { readFile } from "node:fs/promises";
let state = { first: false, second: false };
try { state = JSON.parse(await readFile(new URL("../src/state.json", import.meta.url), "utf8")); } catch {}
const key = process.argv[2] || "first";
const assertionKey = process.argv[3] || \`${"${key}"}-result\`;
console.log(JSON.stringify({
  schema_version: "long-task-check-result-v3",
  execution_status: "completed",
  observations: {
    result: state[key],
    result_copy: state[key],
    negative: false,
    population: {
      eligible_ids: [key],
      observed_ids: state[key] ? [key] : [],
      excluded_items: []
    }
  },
  evidence_records: [
    {
      assertion_key: assertionKey,
      capability: "target_runtime",
      target_ref: "fixture-app",
      root_entrypoint: "tests/oracle.mjs",
      session_id: \`fixture-${"${key}"}-session\`,
      cold_start: true
    },
    {
      assertion_key: assertionKey,
      capability: "state_delta",
      before_sha256: "0".repeat(64),
      after_sha256: "1".repeat(64),
      changed_fields: [key]
    }
  ]
}));
`,
  );
  await writeFile(
    path.join(root, "package.json"),
    `${JSON.stringify(
      {
        name: "fixture",
        private: true,
        tyContext: { harnessFolderName: ".codex" },
        scripts: { oracle: "node tests/oracle.mjs first" },
      },
      null,
      2,
    )}\n`,
  );
  await writeFile(path.join(root, "project_context", "global.md"), "# Global\n");
  await writeFile(
    path.join(root, "project_context", "architecture.md"),
    "# Architecture\n",
  );
  await writeFile(
    path.join(root, "project_context", "areas", "main.md"),
    "# Main\n",
  );
  await writeFile(
    path.join(root, "project_context", "context.toml"),
    `[[areas]]
id = "main"
root = "."
context = "project_context/areas/main.md"
kind = "app"
default = true
`,
  );
  await exec("git", ["init"], { cwd: root });
  await exec("git", ["config", "user.email", "fixture@example.test"], {
    cwd: root,
  });
  await exec("git", ["config", "user.name", "Fixture"], { cwd: root });
  await exec("git", ["add", "."], { cwd: root });
  await exec("git", ["commit", "-m", "fixture"], { cwd: root });
}

async function resolveFixtureSeedRoot(explicitRoot) {
  if (explicitRoot) return path.resolve(explicitRoot);
  if (process.env[fixtureSeedEnvironment])
    return path.resolve(process.env[fixtureSeedEnvironment]);
  standaloneSeedPromise ??= prepareDeliveryFixtureSeed();
  return (await standaloneSeedPromise).root;
}

async function assertSeedRepository(root) {
  for (const relative of [".git", "source.md", "package.json"]) {
    const info = await stat(path.join(root, relative)).catch(() => null);
    if (!info)
      throw new Error(
        `delivery_fixture_seed_invalid: missing ${relative} in ${root}`,
      );
  }
}

function registerSeedCleanupHook() {
  if (cleanupHookRegistered) return;
  cleanupHookRegistered = true;
  process.once("exit", () => {
    for (const root of ownedFixtureSeeds)
      rmSync(root, { recursive: true, force: true });
    ownedFixtureSeeds.clear();
  });
}

export function deliveryContract(options = {}) {
  const check = (key, argument, outcomeKey) => ({
    key,
    journey_roles: ["success", "stage_gate"],
    execution_target: { target_ref: "fixture-app", entrypoint: "root" },
    scenario: {
      given: [{ key: "fixture-loaded", statement: "Load the fixture state." }],
      when: [{ key: "read-outcome", statement: "Read the selected outcome." }],
    },
    proof_surface: "runtime_behavior",
    runner: {
      type: "node_oracle",
      target: "tests/oracle.mjs",
      argv: [argument],
      cwd: ".",
      timeout_ms: 30000,
      effect: "read_only",
      retry_policy: "none",
      idempotent: true,
    },
    verification_inputs: ["tests/oracle.mjs"],
    input_paths: ["src/**"],
    expected_output_paths: [],
    artifact_globs: ["artifacts/proof.json"],
    positive_assertions: [
      {
        key: `${outcomeKey}-result`,
        criterion: `${outcomeKey} is observable and implemented.`,
        claims: [
          "result",
          `requirement.observe-${outcomeKey}`,
          `obligation.implement-${outcomeKey}`,
        ],
        observation: "result",
        evidence_capabilities: ["target_runtime", "state_delta"],
        operator: "equals",
        expected: true,
      },
    ],
    negative_assertions: [],
    environment_requirements: [],
  });
  const outcome = (key, argument, dependsOn = []) => ({
    key,
    title: `${key} title`,
    stage: key,
    depends_on: dependsOn,
    product: {
      observable_result: `${key} becomes observable`,
      success_path_required: true,
      degradation_path_required: false,
      owner: {
        label: "fixture",
        context_refs: ["project_context/areas/main.md"],
        path_globs: ["src/**"],
      },
      requirements: [
        {
          key: `observe-${key}`,
          statement: `The ${key} outcome must be observable.`,
          required_proof_surfaces: ["runtime_behavior"],
        },
      ],
      owner_surfaces: [],
      controls: [],
      surface_bindings: [],
      non_completing_outcomes: [],
    },
    technical: {
      obligations: [
        {
          key: `implement-${key}`,
          statement: `Implement ${key}`,
          required_proof_surfaces: ["runtime_behavior"],
        },
      ],
      expected_change_paths: ["src/**"],
      allowed_support_paths: [],
      forbidden_paths: ["secrets/**"],
      forbidden_shortcuts: [],
      bindings: [
        {
          key: `state-${key}`,
          kind: "file",
          target: "src/state.json",
          carrier_paths: ["src/state.json"],
          existence: "existing",
        },
      ],
      rollback_and_recovery: null,
    },
    acceptance: {
      checks: [check(`${key}-check`, argument, key)],
      population: null,
      counterfactual_controls: [],
    },
  });
  return {
    schema_version: "long-task-delivery-v2",
    task: {
      id: "fixture-task",
      title: "Fixture task",
      goal: "Prove the declared fixture outcomes.",
      target_profile: {
        key: "fixture-target",
        description: "The executable fixture is usable through its declared root.",
        required_state: "target_profile_usable",
        required_target_refs: ["fixture-app"],
      },
      execution_targets: [
        {
          key: "fixture-app",
          description: "The fixture process entrypoint.",
          role: "product",
          runtime_family: "process",
          root_entrypoint: "tests/oracle.mjs",
        },
      ],
      source_paths: ["source.md"],
      context_refs: ["project_context/areas/main.md"],
      context_snapshot_mode: "referenced",
    },
    source_claims: [
      {
        key: "first-observable",
        source_ref: "source.md#fixture-source",
        statement: "The first outcome must be observable.",
        disposition: {
          type: "claim",
          refs: ["first.requirement.observe-first"],
        },
      },
      ...(options.externalConfirmation
        ? [
            {
              key: "fixture-external",
              source_ref: "source.md#fixture-external",
              statement: "Confirm the fixture in external delivery.",
              disposition: {
                type: "external_confirmation",
                refs: ["fixture-external"],
              },
            },
          ]
        : []),
    ],
    stages: options.twoOutcomes
      ? [
          { key: "first", title: "First", depends_on: [], gate_outcome: "first" },
          { key: "second", title: "Second", depends_on: ["first"], gate_outcome: "second" },
        ]
      : [
          { key: "first", title: "First", depends_on: [], gate_outcome: "first" },
        ],
    risk: {
      requested_level: "auto",
      facts: {
        public_api_or_schema_change: [],
        persistent_data_change: [],
        data_migration: [],
        security_boundary_change: [],
        permission_boundary_change: [],
        irreversible_external_effect: [],
        critical_user_path: [],
        full_population_operation: [],
        multi_repository_change: [],
        weak_observability: [],
      },
    },
    global: {
      product: { non_goals: [] },
      technical: {
        constraints: [],
        forbidden_paths: [{ key: "no-secrets", path: "secrets/**" }],
        forbidden_shortcuts: [],
      },
      acceptance: {
        checks: [],
        counterfactual_controls: [],
        external_confirmations: options.externalConfirmation
          ? [
              {
                key: "fixture-external",
                description: "Confirm the fixture in external delivery.",
                owner: "release-owner",
                kind: "field_validation",
                impact_claims: ["first.result"],
                blocks_target: false,
              },
            ]
          : [],
      },
    },
    outcomes: options.twoOutcomes
      ? [outcome("first", "first"), outcome("second", "second", ["first"])]
      : [outcome("first", "first")],
  };
}

export function addProductionControlBinding(
  contract,
  {
    outcomeKey = "first",
    controlKey,
    surfaceRef = "fixture-main",
    targetRef = "fixture-app",
    rootCheckRef = `${outcomeKey}-check`,
    entryActionRef = "read-outcome",
    rootClaimRef = null,
    designTargets = [],
    acceptanceBlockers = [],
  },
) {
  const outcome = contract.outcomes.find((item) => item.key === outcomeKey);
  if (!outcome) throw new Error(`fixture_outcome_unknown:${outcomeKey}`);
  if (!outcome.product.owner_surfaces.includes(surfaceRef))
    outcome.product.owner_surfaces.push(surfaceRef);
  const carrierRef = `state-${outcomeKey}`;
  outcome.product.surface_bindings.push({
    key: `${controlKey}-${targetRef}`,
    surface_ref: surfaceRef,
    target_ref: targetRef,
    control_refs: [controlKey],
    route_binding_ref: carrierRef,
    component_binding_refs: [carrierRef],
    root_journey_check_ref: rootCheckRef,
    entry_action_ref: entryActionRef,
    design_targets: designTargets,
    acceptance_blockers: acceptanceBlockers,
  });
  if (rootClaimRef) {
    const check = outcome.acceptance.checks.find(
      (item) => item.key === rootCheckRef,
    );
    if (!check) throw new Error(`fixture_check_unknown:${rootCheckRef}`);
    const assertion = check.positive_assertions[0];
    const control = outcome.product.controls.find(
      (item) => item.key === controlKey,
    );
    const rootClaims = [
      ...(control?.surface ? [`control.${controlKey}.surface`] : []),
      rootClaimRef,
    ];
    for (const claim of rootClaims)
      if (!assertion.claims.includes(claim)) assertion.claims.push(claim);
    if (!assertion.evidence_capabilities.includes("interaction_trace"))
      assertion.evidence_capabilities.push("interaction_trace");
  }
  return outcome.product.surface_bindings.at(-1);
}

function addDefaultSensitivityControls(contract) {
  for (const outcome of contract.outcomes)
    outcome.acceptance.counterfactual_controls = [
      {
        key: `remove-${outcome.key}-state`,
        binding_key: `state-${outcome.key}`,
        claims: [
          "result",
          `requirement.observe-${outcome.key}`,
          `obligation.implement-${outcome.key}`,
        ],
        check_key: `${outcome.key}-check`,
        mutation: { type: "remove_paths", paths: ["src/state.json"] },
        expected_assertion_failures: [`${outcome.key}-result`],
      },
    ];
}

export async function writeContract(workdir, contract) {
  await writeFile(
    path.join(workdir, "delivery-contract.yaml"),
    YAML.stringify(contract, { lineWidth: 0 }),
  );
}

export async function readState(root) {
  return JSON.parse(await readFile(path.join(root, "src", "state.json"), "utf8"));
}

export async function runCli(cwd, args, options = {}) {
  const { skipCandidateCommit = false, ...execOptions } = options;
  if (!skipCandidateCommit && args[0] === "long-task" && args[1] === "final-gate")
    await commitCandidate(cwd);
  const result = await exec(process.execPath, [cli, ...args], {
    cwd,
    windowsHide: true,
    ...execOptions,
  });
  return parseCliJson(result.stdout);
}

export async function commitCandidate(cwd) {
  await exec("git", ["add", "-A"], { cwd, windowsHide: true });
  await exec("git", ["commit", "--allow-empty", "-m", "candidate"], {
    cwd,
    windowsHide: true,
  });
}

export async function runCliFailure(cwd, args, options = {}) {
  try {
    await runCli(cwd, args, options);
    throw new Error(`expected command failure: ${args.join(" ")}`);
  } catch (error) {
    if (!error.stdout) throw error;
    return parseCliJson(error.stdout);
  }
}

export function parseCliJson(stdout) {
  const text = stdout.trim();
  try {
    return JSON.parse(text);
  } catch {}
  const line = text.split(/\r?\n/u).at(-1);
  try {
    return JSON.parse(line);
  } catch {
    return { text };
  }
}

export async function pathExists(file) {
  try {
    await import("node:fs/promises").then(({ access }) => access(file));
    return true;
  } catch {
    return false;
  }
}
