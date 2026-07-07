import path from "node:path";
import { applySliceDelta, initializeSuperpowersTask } from "../lib/superpowers-task-state.js";
import { compileSuperpowersTask } from "../lib/superpowers-task-compile.js";
import { startAndSaveSuperpowersAttempt } from "../lib/superpowers-task-attempt.js";
import { recordSuperpowersEvidence, runSuperpowersAssertion } from "../lib/superpowers-task-evidence.js";
import { deriveSuperpowersArtifacts } from "../lib/superpowers-task-derive.js";
import { runEpochGate, runFinalGate, runSliceGate } from "../lib/superpowers-task-gates.js";
import { nextSuperpowersSlices } from "../lib/superpowers-task-next-slices.js";
import { renderCompositeLongTaskGoal } from "../lib/composite-long-task-renderer.js";
import type { SuperpowersAttemptMode } from "../lib/superpowers-task-state-schema.js";

export async function compositeLongTask(args: string[]): Promise<void> {
  await runCompositeLongTaskCommand(args, {
    commandName: "ty-context composite-long-task",
    label: "composite long-task",
    showHelp: true
  });
}

export async function runCompositeLongTaskCommand(
  args: string[],
  options: { commandName: string; label: string; showHelp: boolean }
): Promise<void> {
  const subcommand = args[0] ?? "help";
  const workdirArg = args[1];
  if (!workdirArg || subcommand === "help") {
    help(options.commandName, options.showHelp);
    return;
  }
  const workdir = path.resolve(process.cwd(), workdirArg);
  if (subcommand === "init") {
    await initializeSuperpowersTask(workdir, { planSlug: path.basename(workdir) });
    console.log(`initialized ${options.label} state at ${workdirArg}/task-state.json`);
    return;
  }
  if (subcommand === "compile") {
    const state = await compileSuperpowersTask(workdir, { mode: attemptMode(args) });
    console.log(`compiled ${options.label} graph plan_items=${Object.keys(state.graph.plan_items).length} acs=${Object.keys(state.graph.acceptance_criteria).length}`);
    return;
  }
  if (subcommand === "start-attempt") {
    const attempt = await startAndSaveSuperpowersAttempt(workdir, attemptMode(args));
    console.log(`started attempt ${attempt.task_attempt_id}`);
    return;
  }
  if (subcommand === "run-assertion") {
    const separator = args.indexOf("--");
    const commandArgs = separator >= 0 ? args.slice(separator + 1) : [];
    const run = await runSuperpowersAssertion(workdir, {
      acId: optionValue(args, "--ac") ?? "",
      proofLayer: optionValue(args, "--proof-layer") ?? "",
      commandArgs
    });
    console.log(`recorded assertion command_run_id=${run.command_run_id} exit_code=${run.exit_code}`);
    if (run.exit_code !== 0) {
      process.exitCode = 1;
    }
    return;
  }
  if (subcommand === "record-evidence") {
    const evidence = await recordSuperpowersEvidence(workdir, {
      artifactPath: path.resolve(process.cwd(), optionValue(args, "--from") ?? ""),
      commandRunId: optionValue(args, "--command-run-id") ?? ""
    });
    console.log(`registered evidence ${evidence.evidence_id}`);
    return;
  }
  if (subcommand === "apply-slice-delta") {
    const delta = args[2];
    if (!delta) {
      throw new Error("apply-slice-delta requires <slice-delta.json>");
    }
    await applySliceDelta(workdir, path.resolve(process.cwd(), delta));
    const result = await deriveSuperpowersArtifacts(workdir);
    console.log(`applied ${options.label} slice delta and derived files=${result.files.length}`);
    return;
  }
  if (subcommand === "derive") {
    const result = await deriveSuperpowersArtifacts(workdir);
    console.log(`derived ${options.label} artifacts files=${result.files.length}`);
    return;
  }
  if (subcommand === "slice-gate") {
    const sliceId = optionValue(args, "--slice") ?? "";
    const result = await runSliceGate(workdir, sliceId);
    console.log(result.passed ? `slice gate passed ${sliceId}` : `slice gate blocked ${result.messages.join("; ")}`);
    if (!result.passed) {
      process.exitCode = 1;
    }
    return;
  }
  if (subcommand === "epoch-gate") {
    const epochId = optionValue(args, "--epoch") ?? "";
    const result = await runEpochGate(workdir, epochId);
    console.log(result.passed ? `epoch gate passed ${epochId}` : `epoch gate blocked ${result.messages.join("; ")}`);
    return;
  }
  if (subcommand === "final-gate") {
    const result = await runFinalGate(workdir);
    console.log(`final gate product_goal_complete=${result.product_goal_complete}`);
    if (!result.product_goal_complete) {
      process.exitCode = 1;
      for (const error of result.errors) {
        console.error(`error: ${error}`);
      }
    }
    return;
  }
  if (subcommand === "next-slices") {
    const limit = Number.parseInt(optionValue(args, "--limit") ?? "5", 10);
    const slices = await nextSuperpowersSlices(workdir, Number.isFinite(limit) ? limit : 5);
    console.log(`Next ${Math.min(Number.isFinite(limit) ? limit : 5, 5)} high-value clusters:`);
    console.log(slices.join("\n"));
    return;
  }
  if (subcommand === "render-goal") {
    const result = await renderCompositeLongTaskGoal(workdir);
    console.log(
      `rendered ${options.label} goal artifacts: ${path.basename(result.goalObjectivePath)} ${path.basename(result.protocolPath)} ${path.basename(result.executionBindingPath)} length=${result.goalObjectiveLength}`
    );
    return;
  }
  help(options.commandName, options.showHelp);
}

function help(commandName: string, showRenderGoal: boolean): void {
  const renderGoal = showRenderGoal ? "\n  render-goal <workdir>                  Render workflow-protocol.md, execution-binding.md and goal-objective.txt" : "";
  console.log(`${commandName} commands:
  init <workdir>                         Initialize task-state.json and events.ndjson
  compile <workdir> [--mode product_task|harness_task]
                                         Compile sources into task graph
  start-attempt <workdir> [--mode product_task|harness_task]
                                         Start a fresh current attempt
  run-assertion <workdir> --ac <id> --proof-layer <layer> -- <command>
                                         Run and record an assertion command
  record-evidence <workdir> --from <artifact> --command-run-id <id>
                                         Register current-attempt EvidenceRecordV2
  apply-slice-delta <workdir> <delta>    Apply structured slice delta, evidence and derived views
  derive <workdir>                       Generate derived/** views
  slice-gate <workdir> --slice <id>      Validate one slice has real progress
  epoch-gate <workdir> --epoch <id>      Refresh shared epoch evidence views
  final-gate <workdir>                   Compute product_goal_complete
  next-slices <workdir> --limit 5        Recommend next proof clusters${renderGoal}`);
}

function optionValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function attemptMode(args: string[]): SuperpowersAttemptMode {
  const value = optionValue(args, "--mode");
  if (value === "harness_task") {
    return "harness_task";
  }
  return "product_task";
}
