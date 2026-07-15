import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { compileDeliveryContract } from "../lib/long-task-delivery-compiler.js";
import { runDeliveryFinalGate } from "../lib/long-task-final-v1.js";
import {
  closeDeliveryTask,
  readDeliveryStatus,
  resumeDeliveryTask,
  stopCheckDeliveryTask,
} from "../lib/long-task-status-v1.js";
import {
  abandonLongTaskState,
  activateDeliveryContract,
  readCompiledDeliveryContract,
  writeCompiledDeliveryContract,
} from "../lib/long-task-state.js";
import { verifyDeliveryContract } from "../lib/long-task-verifier-v1.js";

export async function longTask(args: string[]): Promise<void> {
  const subcommand = args[0] ?? "help";
  if (subcommand === "help") return help();
  const workdirArgument = args[1];
  if (!workdirArgument) throw new Error(`${subcommand} requires <workdir>`);
  const workdir = path.resolve(process.cwd(), workdirArgument);

  if (subcommand === "init") {
    rejectUnknown(args.slice(2), []);
    await initialize(workdir);
    console.log(JSON.stringify({ status: "initialized", workdir }));
    return;
  }
  if (subcommand === "compile") {
    rejectUnknown(args.slice(2), []);
    const compiled = await compileDeliveryContract(workdir, process.cwd());
    await writeCompiledDeliveryContract(compiled);
    await activateDeliveryContract(compiled);
    console.log(
      JSON.stringify({
        status: "compiled",
        task_id: compiled.task.id,
        compiled_identity: compiled.compiled_identity,
        effective_risk: compiled.effective_risk,
        outcomes: compiled.outcomes.map((outcome) => outcome.key),
      }),
    );
    return;
  }
  if (subcommand === "verify") {
    const outcome = option(args.slice(2), "--outcome");
    const check = option(args.slice(2), "--check");
    rejectOptions(args.slice(2), ["--outcome", "--check"]);
    const result = await verifyDeliveryContract(workdir, { outcome, check });
    console.log(JSON.stringify(result));
    if (result.findings.length) process.exitCode = 1;
    return;
  }
  if (subcommand === "status") {
    rejectUnknown(args.slice(2), []);
    console.log(JSON.stringify(await readDeliveryStatus(workdir), null, 2));
    return;
  }
  if (subcommand === "resume") {
    rejectUnknown(args.slice(2), []);
    console.log(JSON.stringify(await resumeDeliveryTask(workdir), null, 2));
    return;
  }
  if (subcommand === "final-gate") {
    rejectUnknown(args.slice(2), []);
    const result = await runDeliveryFinalGate(workdir);
    console.log(JSON.stringify(result));
    if (result.workflow_status !== "accepted") process.exitCode = 1;
    return;
  }
  if (subcommand === "stop-check") {
    const message = option(args.slice(2), "--message") ?? "";
    rejectOptions(args.slice(2), ["--message"]);
    const result = await stopCheckDeliveryTask(workdir, message);
    console.log(JSON.stringify(result));
    if (!result.continue) process.exitCode = 1;
    return;
  }
  if (subcommand === "close") {
    rejectUnknown(args.slice(2), []);
    await closeDeliveryTask(workdir);
    console.log(JSON.stringify({ status: "closed", workdir }));
    return;
  }
  if (subcommand === "abandon") {
    rejectUnknown(args.slice(2), []);
    const compiled = await readCompiledDeliveryContract(workdir);
    await abandonLongTaskState(compiled.repository_root, workdir);
    console.log(JSON.stringify({ status: "abandoned", workdir }));
    return;
  }
  throw new Error(`Unknown long-task subcommand: ${subcommand}`);
}

async function initialize(workdir: string): Promise<void> {
  await mkdir(workdir, { recursive: true });
  try {
    await writeFile(path.join(workdir, "delivery-contract.yaml"), template(), {
      flag: "wx",
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
}

function option(args: string[], name: string): string | undefined {
  const indexes = args.flatMap((value, index) =>
    value === name ? [index] : [],
  );
  if (indexes.length > 1) throw new Error(`duplicate option: ${name}`);
  if (!indexes.length) return undefined;
  const value = args[indexes[0] + 1];
  if (!value || value.startsWith("--"))
    throw new Error(`${name} requires a value`);
  return value;
}

function rejectOptions(args: string[], allowed: string[]): void {
  for (let index = 0; index < args.length; index += 2) {
    if (!allowed.includes(args[index]) || !args[index + 1])
      throw new Error(`Unknown or injected arguments: ${args.join(" ")}`);
  }
}

function rejectUnknown(actual: string[], allowed: string[]): void {
  if (actual.join("\0") !== allowed.join("\0"))
    throw new Error(`Unknown or injected arguments: ${actual.join(" ")}`);
}

function help(): void {
  console.log(`ty-context long-task commands:
  init <workdir>
  compile <workdir>
  verify <workdir> [--outcome <key>] [--check <key>]
  status <workdir>
  resume <workdir>
  final-gate <workdir>
  stop-check <workdir> [--message <text>]
  close <workdir>
  abandon <workdir>`);
}

function template(): string {
  return `schema_version: long-task-delivery-v1
task:
  id: replace-me
  title: Replace me
  goal: Describe the complete observable delivery goal.
  source_paths: []
  context_refs: []
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
  product:
    non_goals: []
    owner_boundaries: []
  technical:
    constraints: []
    forbidden_paths: []
    forbidden_shortcuts: []
  acceptance:
    checks: []
outcomes:
  - key: replace-outcome
    title: Replace outcome
    depends_on: []
    product:
      observable_result: Describe what a user or system can observe.
      owner_boundary: Describe the owning product or module boundary.
      owner_surfaces: []
      controls: []
      non_completing_outcomes: []
    technical:
      obligations: []
      expected_change_paths: ["src/**"]
      allowed_support_paths: ["tests/**"]
      forbidden_paths: []
      bindings: []
      forbidden_shortcuts: []
      rollback_and_recovery: null
    acceptance:
      validates: ["Replace with the falsifiable result proved by the Check."]
      does_not_validate: []
      checks:
        - key: replace-check
          proof_surface: runtime_behavior
          runner:
            type: node_oracle
            target: tests/replace-oracle.mjs
            argv: []
            cwd: .
            timeout_ms: 30000
            network_policy:
              mode: none
              allowed_hosts: []
          input_paths: ["src/**"]
          artifact_globs: []
          positive_assertions:
            - observation: result
              operator: equals
              expected: true
          negative_assertions: []
          environment_requirements: []
      population: null
      counterfactual_controls: []
`;
}
