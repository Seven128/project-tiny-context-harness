import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import {
  loadAgentBenchmarkAssets,
  prepareAgentBenchmarkRun,
} from "../../examples/delivery-benchmark/runner/agent_benchmark.mjs";
import { repoRoot } from "./agent-benchmark-fixtures.mjs";

const exec = promisify(execFile);

test("prepare-run default path uses the selected clean checkout and its built CLI", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "agent-default-path-"));
  try {
    const harnessRoot = path.join(root, "harness");
    const outDir = path.join(root, "run");
    await createFakeHarnessCheckout(harnessRoot);
    const { stdout } = await exec("git", ["rev-parse", "HEAD"], {
      cwd: harnessRoot,
      windowsHide: true,
    });
    const commit = stdout.trim();
    const assets = await loadAgentBenchmarkAssets();
    const result = await prepareAgentBenchmarkRun(
      {
        trackId: "context-routing",
        role: "candidate",
        variantId: "default-path-probe",
        scenario: "support-triage-board",
        runIndex: 1,
        model: "gpt-fixed",
        reasoning: "xhigh",
        harnessRoot,
        harnessRef: commit,
        outDir,
        force: true,
      },
      { assets, now: () => new Date("2026-07-19T00:00:00.000Z") },
    );
    assert.equal(result.metadata.harness_commit, commit);
    assert.equal(result.metadata.harness_checkout_clean, true);
    assert.match(result.metadata.harness_cli_sha256, /^[0-9a-f]{64}$/u);
    assert.match(result.metadata.operator_assets_sha256, /^[0-9a-f]{64}$/u);
    assert.match(result.metadata.prepared_repository_commit, /^[0-9a-f]{40}$/u);
    assert.match(result.metadata.prepared_repository_tree, /^[0-9a-f]{40}$/u);
    const runbook = await readFile(
      path.join(outDir, ".benchmark", "codex-runbook.md"),
      "utf8",
    );
    assert.match(runbook, /real, independent Codex stage sessions/iu);
    assert.match(runbook, /RECOVERY/iu);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function createFakeHarnessCheckout(root) {
  await mkdir(path.join(root, "examples", "delivery-benchmark", "runner"), {
    recursive: true,
  });
  await mkdir(path.join(root, "examples", "delivery-benchmark", "prompts"), {
    recursive: true,
  });
  await cp(
    path.join(repoRoot, "examples", "delivery-benchmark", "scenarios"),
    path.join(root, "examples", "delivery-benchmark", "scenarios"),
    { recursive: true },
  );
  await mkdir(path.join(root, "packages", "ty-context", "dist"), {
    recursive: true,
  });
  await writeFile(
    path.join(
      root,
      "examples",
      "delivery-benchmark",
      "runner",
      "delivery_benchmark.mjs",
    ),
    fakeRunnerSource(),
    "utf8",
  );
  await writeFile(
    path.join(root, "examples", "delivery-benchmark", "prompts", "harness.md"),
    "Harness prompt.\n",
    "utf8",
  );
  await writeFile(
    path.join(root, "packages", "ty-context", "dist", "cli.js"),
    "// built Harness CLI fixture\n",
    "utf8",
  );
  await git(root, ["init", "-b", "main"]);
  await git(root, ["config", "user.name", "Agent Benchmark Test"]);
  await git(root, ["config", "user.email", "agent-benchmark@example.invalid"]);
  await git(root, ["add", "."]);
  await git(root, ["commit", "-m", "fake Harness checkout"]);
}

function fakeRunnerSource() {
  return `import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
export async function prepareRunDirectory(options) {
  await mkdir(path.join(options.outDir, ".benchmark"), { recursive: true });
  await writeFile(path.join(options.outDir, ".benchmark", "prompt.md"), "Measured prompt.\\n");
  await writeFile(path.join(options.outDir, ".benchmark", "prompts.ndjson"), "");
  await writeFile(path.join(options.outDir, ".gitignore"), ".benchmark/\\n");
  await writeFile(path.join(options.outDir, "README.md"), "Prepared run.\\n");
  execFileSync("git", ["init", "-b", "main"], { cwd: options.outDir, stdio: "ignore" });
  execFileSync("git", ["config", "user.name", "Prepared Run"], { cwd: options.outDir, stdio: "ignore" });
  execFileSync("git", ["config", "user.email", "prepared@example.invalid"], { cwd: options.outDir, stdio: "ignore" });
  execFileSync("git", ["add", "."], { cwd: options.outDir, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "prepared"], { cwd: options.outDir, stdio: "ignore" });
  return { outDir: options.outDir };
}
`;
}

async function git(cwd, args) {
  await exec("git", args, { cwd, windowsHide: true });
}
