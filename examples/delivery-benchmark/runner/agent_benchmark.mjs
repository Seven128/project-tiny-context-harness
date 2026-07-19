#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadAgentBenchmarkAssets,
  validateAgentBenchmarkAssets,
} from "./agent-benchmark-assets.mjs";
import { prepareAgentBenchmarkRun } from "./agent-benchmark-prepare.mjs";
import {
  help,
  parseAgentBenchmarkArgs,
} from "./agent-benchmark-shared.mjs";
import {
  validateAgentBenchmarkPair,
  validateAgentBenchmarkRun,
} from "./agent-benchmark-validate.mjs";

export {
  loadAgentBenchmarkAssets,
  parseAgentBenchmarkArgs,
  prepareAgentBenchmarkRun,
  validateAgentBenchmarkAssets,
  validateAgentBenchmarkPair,
  validateAgentBenchmarkRun,
};

export async function runAgentBenchmarkCli(argv = process.argv.slice(2)) {
  const options = parseAgentBenchmarkArgs(argv);
  if (options.help || options.command === "help") {
    process.stdout.write(help());
    return null;
  }

  let result;
  switch (options.command) {
    case "validate-assets": {
      const assets = await loadAgentBenchmarkAssets(options);
      result = {
        status: "valid",
        baseline_commit: assets.plan.baseline_commit,
        tracks: assets.plan.tracks.map((track) => ({
          id: track.id,
          status: track.status,
          scenarios: track.scenarios,
        })),
        episodes: assets.goldSet.episodes.length,
        known_gaps: assets.goldSet.coverage.known_gaps,
        warnings: assets.warnings,
      };
      break;
    }
    case "prepare-run":
      result = await prepareAgentBenchmarkRun(options);
      break;
    case "validate-run":
      result = await validateAgentBenchmarkRun(options);
      break;
    case "validate-pair":
      result = await validateAgentBenchmarkPair(options);
      break;
    default:
      throw new Error(`unknown command: ${options.command}`);
  }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.status === "invalid") process.exitCode = 1;
  return result;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  runAgentBenchmarkCli().catch((error) => {
    process.stderr.write(
      `agent-benchmark: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
