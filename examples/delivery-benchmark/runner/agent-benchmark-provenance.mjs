import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { sha256 } from "./agent-benchmark-shared.mjs";

const exec = promisify(execFile);
const TOOL_ROOT = path.dirname(fileURLToPath(import.meta.url));
const AGENT_BENCHMARK_TOOL_FILES = [
  "agent_benchmark.mjs",
  "agent-benchmark-assets.mjs",
  "agent-benchmark-evidence.mjs",
  "agent-benchmark-metadata.mjs",
  "agent-benchmark-prepare.mjs",
  "agent-benchmark-provenance.mjs",
  "agent-benchmark-runbook.mjs",
  "agent-benchmark-shared.mjs",
  "agent-benchmark-validate.mjs",
];
const REQUIRED_OPERATOR_ASSETS = [
  "examples/delivery-benchmark/runner/delivery_benchmark.mjs",
  "examples/delivery-benchmark/prompts/harness.md",
  "rubric.json",
  "requirements.md",
  "acceptance_criteria.md",
  "quality_probe.mjs",
];
const OPTIONAL_SCENARIO_ASSETS = [
  "gate_profile.md",
  "recovery_checkpoint.md",
  "recovery_answer_key.json",
  "rfc_change.md",
  "debug_fix.md",
  "lifecycle_probe.md",
];

export async function captureAgentBenchmarkToolHash(toolRoot = TOOL_ROOT) {
  const hashes = {};
  for (const file of AGENT_BENCHMARK_TOOL_FILES)
    hashes[file] = sha256(await readFile(path.join(toolRoot, file)));
  return { hashes, sha256: sha256(JSON.stringify(hashes)) };
}

export async function captureBenchmarkOperatorAssets(harnessRoot, scenario) {
  const scenarioRoot = path.join(
    harnessRoot,
    "examples",
    "delivery-benchmark",
    "scenarios",
    scenario,
  );
  const files = [
    ...REQUIRED_OPERATOR_ASSETS.slice(0, 2).map((relative) => ({
      relative,
      absolute: path.join(harnessRoot, ...relative.split("/")),
      required: true,
    })),
    ...REQUIRED_OPERATOR_ASSETS.slice(2).map((name) => ({
      relative: `examples/delivery-benchmark/scenarios/${scenario}/${name}`,
      absolute: path.join(scenarioRoot, name),
      required: true,
    })),
    ...OPTIONAL_SCENARIO_ASSETS.map((name) => ({
      relative: `examples/delivery-benchmark/scenarios/${scenario}/${name}`,
      absolute: path.join(scenarioRoot, name),
      required: false,
    })),
  ];
  const hashes = {};
  for (const file of files) {
    const content = await readFile(file.absolute).catch((error) => {
      if (!file.required && error?.code === "ENOENT") return null;
      throw new Error(`benchmark_operator_asset_missing:${file.relative}`);
    });
    hashes[file.relative] = content === null ? null : sha256(content);
  }
  return {
    hashes,
    sha256: sha256(JSON.stringify(hashes)),
  };
}

export async function captureHarnessCliHash(harnessRoot) {
  const relative = "packages/ty-context/dist/cli.js";
  const content = await readFile(path.join(harnessRoot, ...relative.split("/"))).catch(
    () => {
      throw new Error(
        `harness_cli_not_built:${relative}:run the package build in the selected checkout`,
      );
    },
  );
  return { path: relative, sha256: sha256(content) };
}

export async function readPreparedRepositoryState(runDir) {
  const [commit, tree] = await Promise.all([
    git(runDir, ["rev-parse", "HEAD"]),
    git(runDir, ["rev-parse", "HEAD^{tree}"]),
  ]);
  return { commit, tree };
}

async function git(cwd, args) {
  const { stdout } = await exec("git", args, { cwd, windowsHide: true });
  return stdout.trim();
}
