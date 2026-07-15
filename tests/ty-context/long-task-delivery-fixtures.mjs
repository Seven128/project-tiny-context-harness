import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import YAML from "yaml";

const exec = promisify(execFile);
const repo = fileURLToPath(new URL("../..", import.meta.url));
const cli = path.join(repo, "packages/ty-context/dist/cli.js");

export async function createDeliveryFixture(options = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "ty-context-delivery-"));
  await mkdir(path.join(root, "src"), { recursive: true });
  await mkdir(path.join(root, "tests"), { recursive: true });
  await mkdir(path.join(root, "project_context", "areas"), { recursive: true });
  await writeFile(path.join(root, "src", "state.json"), `${JSON.stringify({ first: true, second: false })}\n`);
  await writeFile(path.join(root, "source.md"), "# Fixture source\n\nThe first outcome must be observable.\n");
  await writeFile(
    path.join(root, "tests", "oracle.mjs"),
    `import { readFile } from "node:fs/promises";
const state = JSON.parse(await readFile(new URL("../src/state.json", import.meta.url), "utf8"));
const key = process.argv[2] || "first";
console.log(JSON.stringify({ schema_version: "long-task-check-result-v1", observations: { result: state[key], population: { eligible: 1, observed: state[key] ? 1 : 0, excluded: 0 } } }));
`,
  );
  await writeFile(path.join(root, "package.json"), `${JSON.stringify({ name: "fixture", private: true, tyContext: { harnessFolderName: ".codex" }, scripts: { oracle: "node tests/oracle.mjs first" } }, null, 2)}\n`);
  await writeFile(path.join(root, "project_context", "global.md"), "# Global\n");
  await writeFile(path.join(root, "project_context", "architecture.md"), "# Architecture\n");
  await writeFile(path.join(root, "project_context", "areas", "main.md"), "# Main\n");
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
  await exec("git", ["config", "user.email", "fixture@example.test"], { cwd: root });
  await exec("git", ["config", "user.name", "Fixture"], { cwd: root });
  await exec("git", ["add", "."], { cwd: root });
  await exec("git", ["commit", "-m", "fixture"], { cwd: root });
  const workdir = path.join(root, ".long-task");
  await mkdir(workdir, { recursive: true });
  const contract = deliveryContract(options);
  await writeContract(workdir, contract);
  return { root, workdir, contract };
}

export function deliveryContract(options = {}) {
  const checks = (key, argument) => ({
    key,
    proof_surface: "runtime_behavior",
    runner: {
      type: "node_oracle",
      target: "tests/oracle.mjs",
      argv: [argument],
      cwd: ".",
      timeout_ms: 30000,
      network_policy: { mode: "none", allowed_hosts: [] },
      effect: "read_only",
      retry_policy: "none",
      idempotent: false,
    },
    verification_sources: ["tests/oracle.mjs"],
    input_paths: ["src/**"],
    expected_output_paths: [],
    artifact_globs: [],
    positive_assertions: [
      { observation: "result", operator: "equals", expected: true },
    ],
    negative_assertions: [],
    environment_requirements: [],
  });
  const outcome = (key, argument, dependsOn = []) => ({
    key,
    title: `${key} title`,
    depends_on: dependsOn,
    product: {
      observable_result: `${key} becomes observable`,
      owner_boundary: "fixture",
      owner_surfaces: [],
      controls: [],
      non_completing_outcomes: [],
    },
    technical: {
      obligations: [`Implement ${key}`],
      expected_change_paths: ["src/**"],
      allowed_support_paths: [],
      forbidden_paths: ["secrets/**"],
      bindings: [
        { kind: "file", target: "state", carrier_paths: ["src/state.json"], existence: "existing" },
      ],
      forbidden_shortcuts: [],
      rollback_and_recovery: null,
    },
    acceptance: {
      validates: [`${key} is true`],
      does_not_validate: [],
      checks: [checks(`${key}-check`, argument)],
      population: null,
      counterfactual_controls: [],
    },
  });
  return {
    schema_version: "long-task-delivery-v1",
    task: {
      id: "fixture-task",
      title: "Fixture task",
      goal: "Prove the declared fixture outcomes.",
      source_paths: ["source.md"],
      context_refs: ["project_context/areas/main.md"],
      context_snapshot_mode: "referenced",
    },
    source_claims: [
      {
        key: "first-observable",
        source_ref: "source.md#fixture-source",
        statement: "The first outcome must be observable.",
        disposition: { type: "contract", refs: ["first"] },
      },
    ],
    risk: {
      requested_level: "auto",
      facts: {
        public_api_or_schema_change: false,
        persistent_data_change: false,
        data_migration: false,
        security_boundary_change: false,
        permission_boundary_change: false,
        irreversible_external_effect: false,
        critical_user_path: false,
        full_population_operation: false,
        multi_repository_change: false,
        weak_observability: false,
      },
      evidence: [],
    },
    global: {
      product: { non_goals: [], owner_boundaries: ["fixture"] },
      technical: { constraints: [], forbidden_paths: ["secrets/**"], forbidden_shortcuts: [] },
      acceptance: { checks: [], external_confirmations: [] },
    },
    outcomes: options.twoOutcomes
      ? [outcome("first", "first"), outcome("second", "second", ["first"])]
      : [outcome("first", "first")],
  };
}

export async function writeContract(workdir, contract) {
  contract.risk.evidence ??= [];
  for (const [fact, value] of Object.entries(contract.risk.facts))
    if (value && !contract.risk.evidence.some((item) => item.fact === fact))
      contract.risk.evidence.push({
        fact,
        source_claim_refs: ["first-observable"],
        context_refs: ["project_context/areas/main.md"],
        affected_paths: ["src/**"],
        rationale: `Fixture declares ${fact}.`,
      });
  await writeFile(path.join(workdir, "delivery-contract.yaml"), YAML.stringify(contract, { lineWidth: 0 }));
}

export async function readState(root) {
  return JSON.parse(await readFile(path.join(root, "src", "state.json"), "utf8"));
}

export async function runCli(cwd, args, options = {}) {
  const { skipCandidateCommit = false, ...execOptions } = options;
  if (
    !skipCandidateCommit &&
    args[0] === "long-task" &&
    args[1] === "final-gate"
  ) {
    await commitCandidate(cwd);
  }
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
