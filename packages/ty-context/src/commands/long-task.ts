import path from "node:path";
import { compileDeliveryContract } from "../lib/long-task-delivery-compiler.js";
import { runDeliveryFinalGate } from "../lib/long-task-final-v2.js";
import {
  closeDeliveryTask,
  doctorDeliveryTask,
  readDeliveryStatus,
  resumeDeliveryTask,
  stopCheckDeliveryTask,
} from "../lib/long-task-status-v2.js";
import {
  abandonLongTaskState,
  approvePendingAuthorityRevision,
  clearFinalReceipt,
  clearAuthorityRevision,
  commitActiveAuthority,
  forceClearCorruptActiveState,
  invalidateDerivedProgress,
  loadActiveLongTaskAuthority,
  stageCompiledDeliveryContract,
} from "../lib/long-task-state.js";
import { verifyDeliveryContract } from "../lib/long-task-verifier-v2.js";
import { repositoryRoot } from "../lib/long-task-workspace.js";
import {
  initializeLongTask,
  preflightLongTask,
} from "./long-task-authoring.js";
import { explainLongTask } from "./long-task-explain.js";

export async function longTask(args: string[]): Promise<void> {
  const subcommand = args[0] ?? "help";
  if (subcommand === "help") return help();
  const workdirArgument = args[1];
  if (!workdirArgument) throw new Error(`${subcommand} requires <workdir>`);
  const workdir = path.resolve(process.cwd(), workdirArgument);

  if (subcommand === "init") {
    rejectUnknown(args.slice(2), []);
    await initializeLongTask(workdir);
    console.log(JSON.stringify({ status: "initialized", workdir }));
    return;
  }
  if (subcommand === "preflight") {
    rejectUnknown(args.slice(2), []);
    return preflightLongTask(workdir);
  }
  if (subcommand === "compile") return compile(workdir, args.slice(2));
  if (subcommand === "approve-authority-revision")
    return approveRevision(workdir, args.slice(2));
  if (subcommand === "explain") {
    rejectUnknown(args.slice(2), []);
    return explainLongTask(workdir);
  }
  if (subcommand === "verify") return verify(workdir, args.slice(2));
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
  if (subcommand === "doctor") {
    rejectUnknown(args.slice(2), []);
    console.log(JSON.stringify(await doctorDeliveryTask(workdir), null, 2));
    return;
  }
  if (subcommand === "final-gate") return finalGate(workdir, args.slice(2));
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
    const result = await closeDeliveryTask(workdir);
    console.log(
      JSON.stringify({
        status: result.status,
        workdir,
        workflow_status: result.workflow_status,
        external_confirmations: result.external_confirmations,
      }),
    );
    return;
  }
  if (subcommand === "abandon") {
    const forceCorruptState =
      args.length === 3 && args[2] === "--force-corrupt-state";
    if (args.length > 2 && !forceCorruptState)
      throw new Error(
        `Unknown or injected arguments: ${args.slice(2).join(" ")}`,
      );
    const root = await repositoryRoot(process.cwd());
    if (forceCorruptState) await forceClearCorruptActiveState(root, workdir);
    else await abandonLongTaskState(root, workdir);
    console.log(
      JSON.stringify({
        status: "abandoned",
        workdir,
        force_corrupt_state: forceCorruptState,
      }),
    );
    return;
  }
  throw new Error(`Unknown long-task subcommand: ${subcommand}`);
}

async function compile(workdir: string, args: string[]): Promise<void> {
  const revise = args.length === 1 && args[0] === "--revise";
  if (args.length && !revise)
    throw new Error(`Unknown or injected arguments: ${args.join(" ")}`);
  const root = await repositoryRoot(process.cwd());
  const loaded = await loadActiveLongTaskAuthority(root, {
    migrate_legacy: true,
  });
  const previous = loaded.authority?.authority_snapshot ?? null;
  if (loaded.authority && loaded.authority.workdir !== path.resolve(workdir))
    throw new Error(`active_task_exists:${loaded.authority.workdir}`);
  const compiled = await compileDeliveryContract(workdir, process.cwd(), {
    revise,
    previous_authority: previous,
  });
  if (loaded.authority && loaded.authority.task_id !== compiled.task.id)
    throw new Error(`active_task_exists:${loaded.authority.workdir}`);
  const stagedCache = await stageCompiledDeliveryContract(compiled);
  let authorityCommitted = false;
  try {
    await commitActiveAuthority({
      candidate: compiled,
      expected_previous_identity:
        loaded.authority?.active_authority_identity ?? null,
    });
    authorityCommitted = true;
    try {
      await stagedCache.publish();
    } catch (error) {
      await stagedCache.discard();
      throw new Error(
        `compiled_cache_projection_publish_failed:${message(error)}`,
      );
    }
  } catch (error) {
    if (!authorityCommitted) await stagedCache.discard();
    throw error;
  }
  if (!previous || previous.compiled_identity !== compiled.compiled_identity) {
    await invalidateDerivedProgress(workdir);
    await clearFinalReceipt(compiled.repository_root, workdir);
  }
  await clearAuthorityRevision(workdir);
  console.log(
    JSON.stringify({
      status: "compiled",
      task_id: compiled.task.id,
      compiled_identity: compiled.compiled_identity,
      authority_revision: compiled.authority_revision,
      effective_risk: compiled.effective_risk,
      outcomes: compiled.outcomes.map((outcome) => outcome.key),
      claim_coverage: compiled.claim_coverage,
    }),
  );
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function approveRevision(workdir: string, args: string[]): Promise<void> {
  const revision = option(args, "--revision");
  rejectOptions(args, ["--revision"]);
  if (!revision) throw new Error("--revision requires a value");
  await approvePendingAuthorityRevision(workdir, revision);
  console.log(
    JSON.stringify({ status: "authority_revision_approved", revision }),
  );
}

async function verify(workdir: string, args: string[]): Promise<void> {
  const outcome = option(args, "--outcome");
  const check = option(args, "--check");
  rejectOptions(args, ["--outcome", "--check"]);
  const result = await verifyDeliveryContract(workdir, { outcome, check });
  console.log(JSON.stringify(result));
  if (result.findings.length) process.exitCode = 1;
}

async function finalGate(workdir: string, args: string[]): Promise<void> {
  rejectUnknown(args, []);
  const result = await runDeliveryFinalGate(workdir);
  console.log(JSON.stringify(result));
  if (
    result.workflow_status !== "machine_accepted" &&
    result.workflow_status !== "machine_accepted_external_pending"
  )
    process.exitCode = 1;
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

function rejectUnknown(actual: string[], allowed: string[]): void {
  if (actual.join("\0") !== allowed.join("\0"))
    throw new Error(`Unknown or injected arguments: ${actual.join(" ")}`);
}

function help(): void {
  console.log(`ty-context long-task commands:
  init <workdir>
  preflight <workdir>
  compile <workdir>
  compile <workdir> --revise
  approve-authority-revision <workdir> --revision <sha>
  explain <workdir>
  verify <workdir> [--outcome <key>] [--check <key>]
  status <workdir>
  resume <workdir>
  doctor <workdir>
  final-gate <workdir>
  stop-check <workdir> [--message <text>]
  close <workdir>
  abandon <workdir> [--force-corrupt-state]`);
}
