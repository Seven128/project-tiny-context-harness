import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { compileDeliverySet } from "../lib/long-task-delivery-set-compiler.js";
import {
  closeDeliverySet,
  runDeliverySetFinalGate,
  stopCheckDeliverySet,
} from "../lib/long-task-delivery-set-final.js";
import {
  abandonDeliverySetState,
  approveSetPendingRevision,
  clearSetRevision,
  readOptionalCompiledDeliverySet,
  writeCompiledDeliverySet,
} from "../lib/long-task-delivery-set-state.js";
import {
  readDeliverySetStatus,
  resumeDeliverySet,
} from "../lib/long-task-delivery-set-status.js";
import {
  activateDeliverySetBinding,
  clearActiveBinding,
  readActiveLongTaskBinding,
} from "../lib/long-task-state.js";
import { repositoryRoot } from "../lib/long-task-workspace.js";

export async function deliverySet(args: string[]): Promise<void> {
  const subcommand = args[0] ?? "help";
  if (subcommand === "help") return help();
  const argument = args[1];
  if (!argument) throw new Error(`${subcommand} requires <setdir>`);
  const setdir = path.resolve(process.cwd(), argument);
  if (subcommand === "init") {
    rejectUnknown(args.slice(2));
    await initialize(setdir);
    console.log(JSON.stringify({ status: "initialized", setdir }));
    return;
  }
  if (subcommand === "compile") {
    return compile(setdir, args.slice(2));
  }
  if (subcommand === "approve-authority-revision") {
    const revision = option(args.slice(2), "--revision");
    rejectOptions(args.slice(2), ["--revision"]);
    if (!revision) throw new Error("--revision requires a value");
    await approveSetPendingRevision(setdir, revision);
    console.log(
      JSON.stringify({ status: "authority_revision_approved", revision }),
    );
    return;
  }
  if (subcommand === "status") {
    rejectUnknown(args.slice(2));
    console.log(JSON.stringify(await readDeliverySetStatus(setdir), null, 2));
    return;
  }
  if (subcommand === "resume") {
    rejectUnknown(args.slice(2));
    console.log(JSON.stringify(await resumeDeliverySet(setdir), null, 2));
    return;
  }
  if (subcommand === "final-gate") {
    return finalGate(setdir, args.slice(2));
  }
  if (subcommand === "stop-check") {
    const message = option(args.slice(2), "--message") ?? "";
    rejectOptions(args.slice(2), ["--message"]);
    const result = await stopCheckDeliverySet(setdir, message);
    console.log(JSON.stringify(result));
    if (!result.continue) process.exitCode = 1;
    return;
  }
  if (subcommand === "close") {
    rejectUnknown(args.slice(2));
    await closeDeliverySet(setdir);
    console.log(JSON.stringify({ status: "closed", setdir }));
    return;
  }
  if (subcommand === "abandon") {
    rejectUnknown(args.slice(2));
    const root = await repositoryRoot(process.cwd());
    const compiled = await readOptionalCompiledDeliverySet(setdir);
    const active = await readActiveLongTaskBinding(root);
    if (active?.mode === "delivery_set" && active.set_workdir === setdir)
      await clearActiveBinding(root, setdir);
    await abandonDeliverySetState(compiled, setdir);
    console.log(JSON.stringify({ status: "abandoned", setdir }));
    return;
  }
  throw new Error(`Unknown delivery-set subcommand: ${subcommand}`);
}

async function compile(setdir: string, args: string[]): Promise<void> {
  const amendmentReason = option(args, "--amendment-reason");
  rejectOptions(args, ["--amendment-reason"]);
  const compiled = await compileDeliverySet(setdir, process.cwd(), {
    amendment_reason: amendmentReason,
  });
  await writeCompiledDeliverySet(compiled);
  await activateDeliverySetBinding({
    schema_version: "active-long-task-binding-v1",
    mode: "delivery_set",
    repository_root: compiled.repository_root,
    set_workdir: compiled.set_workdir,
    compiled_set_identity: compiled.compiled_set_identity,
    registered_child_contracts: Object.fromEntries(
      compiled.contracts.map((contract) => [
        contract.key,
        contract.resolved_workdir,
      ]),
    ),
    verifier_identity: compiled.verifier_identity,
    activated_at: new Date().toISOString(),
  });
  await clearSetRevision(setdir);
  console.log(
    JSON.stringify({
      status: "compiled",
      set_id: compiled.definition.set.id,
      compiled_set_identity: compiled.compiled_set_identity,
      contracts: compiled.contracts.map((contract) => contract.key),
    }),
  );
}

async function finalGate(setdir: string, args: string[]): Promise<void> {
  rejectUnknown(args);
  const result = await runDeliverySetFinalGate(setdir);
  console.log(JSON.stringify(result));
  if (
    result.workflow_status !== "delivery_set_accepted" &&
    result.workflow_status !== "machine_accepted_external_pending"
  )
    process.exitCode = 1;
}

async function initialize(setdir: string): Promise<void> {
  await mkdir(setdir, { recursive: true });
  try {
    await writeFile(path.join(setdir, "delivery-set.yaml"), template(), {
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
  for (let index = 0; index < args.length; index += 2)
    if (!allowed.includes(args[index]) || !args[index + 1])
      throw new Error(`Unknown or injected arguments: ${args.join(" ")}`);
}

function rejectUnknown(args: string[]): void {
  if (args.length)
    throw new Error(`Unknown or injected arguments: ${args.join(" ")}`);
}

function help(): void {
  console.log(`ty-context delivery-set commands:
  init <setdir>
  compile <setdir> [--amendment-reason <reason>]
  approve-authority-revision <setdir> --revision <sha>
  status <setdir>
  resume <setdir>
  final-gate <setdir>
  stop-check <setdir> [--message <text>]
  close <setdir>
  abandon <setdir>`);
}

function template(): string {
  return `schema_version: long-task-delivery-set-v1
multi_repository_change: false
set:
  id: replace-delivery-set
  title: Replace delivery set
  goal: Describe the complete top-level delivery goal.
  source_paths: [source.md]
  context_refs: []
  context_snapshot_mode: referenced
  risk_floor: standard
source_claims: []
global:
  product:
    non_goals: []
    owner_boundaries: []
  technical:
    constraints: []
    forbidden_paths: []
    forbidden_shortcuts: []
  acceptance:
    integration_checks: []
    external_confirmations: []
contracts: []
`;
}
