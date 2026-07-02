#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import { runEquivalence } from "./composite-long-task-equivalence/runner.mjs";

export {
  EQUIVALENCE_FIXTURE_IDS,
  buildEquivalenceReport,
  compareNormalizedRuns,
  normalizeTaskState
} from "./composite-long-task-equivalence/normalize.mjs";
export { runEquivalence } from "./composite-long-task-equivalence/runner.mjs";

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      continue;
    }
    const [key, inline] = arg.slice(2).split("=", 2);
    const next = argv[index + 1];
    const value = inline ?? (next === undefined || next.startsWith("--") ? "true" : argv[++index]);
    args[key] = value;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args["baseline-sha"] || !args["current-sha"]) {
    throw new Error(
      "usage: node tools/verify_composite_long_task_equivalence.mjs --baseline-sha <sha> --current-sha <sha> [--run-id <id>] [--output-dir <dir>] [--skip-install true] [--update-golden true]"
    );
  }
  const result = await runEquivalence({
    baselineSha: args["baseline-sha"],
    currentSha: args["current-sha"],
    runId: args["run-id"],
    outputDir: args["output-dir"],
    skipInstall: args["skip-install"] === "true",
    updateGolden: args["update-golden"] === "true"
  });
  process.stdout.write(`${result.outputDir}\n`);
  if (result.comparison.rejectedDiffs.length > 0) {
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : String(error));
    process.exitCode = 1;
  });
}
