import {
  renderWorkflowInspection,
  renderWorkflowInspectionPrompt,
  runWorkflowInspection,
  type WorkflowInspectionOptions
} from "../lib/workflow-inspector.js";

export async function inspectWorkflow(args: string[]): Promise<void> {
  const options: WorkflowInspectionOptions = {};
  let json = false;
  let prompt = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--json") {
      json = true;
    } else if (arg === "--prompt") {
      prompt = true;
    } else if (arg === "--recent-minutes") {
      options.recentMinutes = parsePositiveNumber(requireValue(args, ++index, arg), arg);
    } else if (arg === "--recent-turns") {
      options.recentTurns = parsePositiveNumber(requireValue(args, ++index, arg), arg);
    } else if (arg === "--estimated-tokens") {
      options.estimatedTokens = parsePositiveNumber(requireValue(args, ++index, arg), arg);
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      return;
    } else {
      throw new Error(`unknown inspect-workflow argument: ${arg}`);
    }
  }

  const report = await runWorkflowInspection(process.cwd(), options);
  if (json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    process.stdout.write(renderWorkflowInspection(report));
    if (prompt) {
      console.log("");
      console.log(renderWorkflowInspectionPrompt(report));
    }
  }
  if (report.decision === "BLOCKED") {
    process.exitCode = 1;
  }
}

function printHelp(): void {
  console.log(`sdlc-harness inspect-workflow

Lightly inspect whether a user repository is running the Harness workflow as intended.

Options:
  --json                     Emit a machine-readable report
  --prompt                   Print an Agent self-inspection prompt after the measured report
  --recent-minutes <n>       Self-reported recent workflow orientation time
  --recent-turns <n>         Self-reported recent workflow conversation turns
  --estimated-tokens <n>     Self-reported recent workflow token estimate`);
}

function requireValue(args: string[], index: number, flag: string): string {
  const value = args[index];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function parsePositiveNumber(value: string, flag: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${flag} must be a non-negative number`);
  }
  return parsed;
}
