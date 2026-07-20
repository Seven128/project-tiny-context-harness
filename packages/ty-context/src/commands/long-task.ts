import path from "node:path";
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
  forceClearCorruptActiveState,
} from "../lib/long-task-state.js";
import { verifyDeliveryContract } from "../lib/long-task-verifier-v2.js";
import { repositoryRoot } from "../lib/long-task-workspace.js";
import {
  initializeLongTask,
  preflightLongTask,
} from "./long-task-authoring.js";
import {
  option,
  rejectOptions,
  rejectUnknown,
} from "./long-task-command-args.js";
import { explainLongTask } from "./long-task-explain.js";
import { handleLongTaskRevisionCommand } from "./long-task-revision.js";

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
  if (await handleLongTaskRevisionCommand(subcommand, workdir, args.slice(2)))
    return;
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

function help(): void {
  console.log(`ty-context long-task commands:
  init <workdir>
  preflight <workdir>
  compile <workdir>
  compile <workdir> --revise
  diagnose-revision <workdir> [--outcome <key>] [--check <key>]
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
