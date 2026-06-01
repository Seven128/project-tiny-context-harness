import {
  type ComparisonConfidence,
  renderWorkflowInspection,
  renderWorkflowInspectionPrompt,
  runWorkflowInspection,
  type WorkflowInspectionOptions
} from "../lib/workflow-inspector.js";

const COMPARISON_CONFIDENCE = new Set(["low", "medium", "high"]);

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
    } else if (arg === "--workflow-control-minutes") {
      options.workflowControlMinutes = parsePositiveNumber(requireValue(args, ++index, arg), arg);
    } else if (arg === "--total-delivery-minutes") {
      options.totalDeliveryMinutes = parsePositiveNumber(requireValue(args, ++index, arg), arg);
    } else if (arg === "--estimated-vibe-handoff-minutes") {
      options.estimatedVibeHandoffMinutes = parsePositiveNumber(requireValue(args, ++index, arg), arg);
    } else if (arg === "--avoided-rework-minutes") {
      options.avoidedReworkMinutes = parsePositiveNumber(requireValue(args, ++index, arg), arg);
    } else if (arg === "--comparison-confidence") {
      options.comparisonConfidence = parseComparisonConfidence(requireValue(args, ++index, arg));
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
  --estimated-tokens <n>     Self-reported recent workflow token estimate
  --workflow-control-minutes <n>
                             Time spent operating/understanding Harness mechanics
  --total-delivery-minutes <n>
                             End-to-end time to reach the current same-quality handoff
  --estimated-vibe-handoff-minutes <n>
                             Estimated pure-vibe time to reach the same Review/Testing/handoff quality
  --avoided-rework-minutes <n>
                             Estimated rework avoided by Harness constraints
  --comparison-confidence <low|medium|high>
                             Confidence in the counterfactual vibe baseline; default low`);
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

function parseComparisonConfidence(value: string): ComparisonConfidence {
  if (!COMPARISON_CONFIDENCE.has(value)) {
    throw new Error("--comparison-confidence must be low, medium, or high");
  }
  return value as ComparisonConfidence;
}
