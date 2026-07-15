#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const { tarball, portableOnly } = parseArgs(process.argv.slice(2));
const root = await mkdtemp(path.join(os.tmpdir(), "ty-context-tarball-smoke-"));

try {
  run("npm", ["init", "-y"], root);
  run("npm", ["install", "--save-dev", tarball], root);
  const installed = path.join(root, "node_modules", "project-tiny-context-harness");
  await assertTarballContents(installed);
  run(
    "npx",
    ["--no-install", "ty-context", "init", "--adopt", "--harness-folder", ".agent"],
    root,
  );
  if (existsSync(path.join(root, ".codex", "hooks.json")))
    throw new Error("portable default unexpectedly installed Codex Hooks");
  run("npx", ["--no-install", "ty-context", "doctor"], root);
  run("npx", ["--no-install", "ty-context", "validate-context"], root);

  if (!portableOnly) {
    run("npx", ["--no-install", "ty-context", "enable", "long-task"], root);
    const workdir = await writeDeliveryInputs(root);
    await writeFile(path.join(root, ".gitignore"), "node_modules/\n", "utf8");
    run("git", ["init", "-b", "main"], root);
    run("git", ["config", "user.email", "tarball-smoke@example.invalid"], root);
    run("git", ["config", "user.name", "Tarball Smoke"], root);
    run("git", ["add", "."], root);
    run("git", ["commit", "-m", "tarball smoke fixture"], root);
    run("npx", ["--no-install", "ty-context", "long-task", "compile", workdir], root);
    run("npx", ["--no-install", "ty-context", "long-task", "final-gate", workdir], root);
    const result = JSON.parse(
      await readFile(path.join(workdir, ".ty-context", "final-receipt.json"), "utf8"),
    );
    if (
      result.schema_version !== "long-task-final-receipt-v1" ||
      result.workflow_status !== "accepted"
    ) {
      throw new Error(
        `minimal Delivery Contract smoke was not accepted: ${JSON.stringify(result)}`,
      );
    }
  }

  console.log(
    portableOnly
      ? `Tarball smoke passed: ${path.basename(tarball)}; portable init, doctor, validate-context and contents accepted.`
      : `Tarball smoke passed: ${path.basename(tarball)}; portable checks plus long-task-delivery-v1 compile and Final Gate accepted.`,
  );
  await rm(root, { recursive: true, force: true });
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  console.error(`Tarball smoke workspace kept at: ${root}`);
  process.exitCode = 1;
}

async function writeDeliveryInputs(root) {
  const workdir = path.join(root, ".long-task");
  await mkdir(path.join(root, "src"), { recursive: true });
  await mkdir(path.join(root, "tests"), { recursive: true });
  await mkdir(workdir, { recursive: true });
  await writeFile(path.join(root, "src/state.json"), '{"ready":true}\n');
  await writeFile(
    path.join(root, "tests/oracle.mjs"),
    `import { readFile } from "node:fs/promises";
const state = JSON.parse(await readFile(new URL("../src/state.json", import.meta.url), "utf8"));
console.log(JSON.stringify({schema_version:"long-task-check-result-v1",observations:{ready:state.ready}}));
`,
  );
  await writeFile(
    path.join(workdir, "delivery-contract.yaml"),
    `schema_version: long-task-delivery-v1
task:
  id: tarball-smoke
  title: Tarball smoke
  goal: Prove the installed long-task workflow.
  source_paths: []
  context_refs: [project_context/areas/main.md]
  context_snapshot_mode: referenced
risk:
  requested_level: auto
  facts:
    public_api_or_schema_change: false
    persistent_data_change: false
    data_migration: false
    security_boundary_change: false
    permission_boundary_change: false
    irreversible_external_effect: false
    critical_user_path: false
    full_population_operation: false
    multi_repository_change: false
    weak_observability: false
global:
  product: { non_goals: [], owner_boundaries: [fixture] }
  technical: { constraints: [], forbidden_paths: [], forbidden_shortcuts: [] }
  acceptance: { checks: [] }
outcomes:
  - key: installed
    title: Installed workflow runs
    depends_on: []
    product:
      observable_result: Installed CLI verifies current behavior.
      owner_boundary: fixture
      owner_surfaces: []
      controls: []
      non_completing_outcomes: []
    technical:
      obligations: [Use the packaged verifier.]
      expected_change_paths: [src/**]
      allowed_support_paths: [tests/**]
      forbidden_paths: []
      bindings:
        - kind: file
          target: state
          carrier_paths: [src/state.json]
      forbidden_shortcuts: []
      rollback_and_recovery: null
    acceptance:
      validates: [Current installed behavior is ready.]
      does_not_validate: []
      checks:
        - key: installed-check
          proof_surface: runtime_behavior
          runner:
            type: node_oracle
            target: tests/oracle.mjs
            argv: []
            cwd: .
            timeout_ms: 30000
            network_policy: { mode: none, allowed_hosts: [] }
          input_paths: [src/**]
          artifact_globs: []
          positive_assertions:
            - observation: ready
              operator: equals
              expected: true
          negative_assertions: []
          environment_requirements: []
      population: null
      counterfactual_controls: []
`,
  );
  return workdir;
}

async function assertTarballContents(directory) {
  const files = [];
  async function visit(current, relative = "") {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const next = relative ? `${relative}/${entry.name}` : entry.name;
      const absolute = path.join(current, entry.name);
      if (entry.name === "__pycache__" || /\.(?:pyc|pyo)$/iu.test(entry.name))
        throw new Error(`tarball contains a Python runtime cache: ${absolute}`);
      if (entry.isDirectory()) await visit(absolute, next);
      else files.push(next);
    }
  }
  await visit(directory);
  for (const forbidden of [
    /^dist\/lib\/(?:composite-|codex-|scope-fit|git-worktree-paths|process-(?:identity|tree))/u,
    /^dist\/schemas\/composite-/u,
    /^assets\/composite\//u,
    /^assets\/skills\/(?:prepare-composite-long-task|composite-long-task-workflow)\//u,
  ]) {
    const found = files.find((file) => forbidden.test(file));
    if (found) throw new Error(`tarball contains retired runtime asset: ${found}`);
  }
  for (const required of [
    "dist/schemas/long-task-delivery-v1/long-task-delivery-v1.schema.json",
    "assets/skills/long-task-workflow/SKILL.md",
    "assets/hooks/long-task-hook.mjs",
  ]) {
    if (!files.includes(required)) throw new Error(`tarball missing required asset: ${required}`);
  }
}

function parseArgs(args) {
  const index = args.indexOf("--tarball");
  const value = index >= 0 ? args[index + 1] : args[0];
  const portableOnly = args.includes("--portable-only");
  const expectedLength = portableOnly ? 3 : 2;
  if (!value || (index >= 0 && args.length !== expectedLength) || (index < 0 && args.length !== 1))
    throw new Error("usage: node tools/release_tarball_smoke.mjs --tarball <package.tgz> [--portable-only]");
  const resolved = path.resolve(value);
  if (!existsSync(resolved) || !resolved.endsWith(".tgz"))
    throw new Error(`tarball not found: ${resolved}`);
  return { tarball: resolved, portableOnly };
}

function run(command, args, cwd) {
  const executable =
    process.platform === "win32" && ["npm", "npx"].includes(command)
      ? (process.env.ComSpec ?? "cmd.exe")
      : command;
  const argv = executable === command ? args : ["/d", "/s", "/c", command, ...args];
  const result = spawnSync(executable, argv, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
  });
  if (result.status !== 0 || result.error)
    throw result.error ?? new Error(`${command} ${args.join(" ")} failed\n${result.stdout}\n${result.stderr}`);
}
