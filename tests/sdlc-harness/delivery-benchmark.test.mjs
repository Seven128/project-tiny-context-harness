import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import {
  listScenarios,
  prepareRunDirectory,
  renderStagePrompt
} from "../../examples/delivery-benchmark/runner/delivery_benchmark.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("benchmark report data is reset for Minimal Context reruns", async () => {
  const data = await loadBenchmarkData();
  assert.equal(data.generatedAt, "2026-06-03T00:00:00.000Z");
  assert.match(data.copy.en.keyFinding.headline, /No public benchmark result/);
  assert.match(data.copy.zh.keyFinding.headline, /没有可用于正式结论/);
  assert.ok(data.scenarios.length >= 4);
  assert.ok(data.scenarios.every((scenario) => scenario.status === "pending"));
  assert.ok(data.scenarios.every((scenario) => !scenario.modes));

  const serialized = JSON.stringify(data);
  assert.doesNotMatch(serialized, /"status":"completed"/i);
  assert.doesNotMatch(serialized, /"modes":/i);
  assert.doesNotMatch(serialized, /"summaryPath":/i);
});

test("benchmark docs keep skeleton protocol and remove old pilot conclusions", async () => {
  const read = (relativePath) => readFile(path.join(repoRoot, relativePath), "utf8");
  const [readme, runbook, resultsReadme, context] = await Promise.all([
    read("examples/delivery-benchmark/README.md"),
    read("examples/delivery-benchmark/RUNBOOK.md"),
    read("examples/delivery-benchmark/results/README.md"),
    read("project_context/areas/delivery-benchmark.md")
  ]);

  for (const content of [readme, runbook, resultsReadme]) {
    assert.match(content, /Minimal Context/);
    assert.match(content, /reset/i);
    assert.doesNotMatch(content, /completed public run|formal result summary/i);
    assert.doesNotMatch(content, /\.work_products|validate-dev|validate-plan/);
  }

  assert.match(readme, /runner and scenario skeletons/i);
  assert.match(runbook, /Do not require lifecycle phase state/);
  assert.match(resultsReadme, /no historical stage-workflow result/);
  assert.match(context, /Historical stage-based numbers are removed/);
});

test("results directory contains only report shell and reset data", async () => {
  const files = await readdir(path.join(repoRoot, "examples", "delivery-benchmark", "results"));
  assert.deepEqual(files.sort(), ["README.md", "benchmark-data.js", "index.html"]);
});

test("runner still supports scenario listing, prepare, and staged prompts", async () => {
  const scenarios = await listScenarios();
  assert.deepEqual(
    scenarios.sort(),
    [
      "expense-policy-engine",
      "project-context-recovery-lab",
      "support-triage-board",
      "webhook-provider-bridge"
    ].sort()
  );

  const runRoot = await mkdtemp(path.join(os.tmpdir(), "delivery-benchmark-reset-"));
  try {
    const runDir = path.join(runRoot, "harness");
    await prepareRunDirectory({
      scenario: "support-triage-board",
      mode: "harness",
      outDir: runDir,
      force: true
    });
    const prompt = await readFile(path.join(runDir, ".benchmark", "prompt.md"), "utf8");
    assert.match(prompt, /Minimal Context Harness/);
    assert.match(prompt, /project_context\/\*\*/);
    assert.match(prompt, /make validate-context/);
    assert.doesNotMatch(prompt, /\.work_products/);
    assert.doesNotMatch(prompt, /validate-dev|validate-plan/);

    const recoveryPrompt = await renderStagePrompt({
      scenario: "support-triage-board",
      mode: "harness",
      stage: "recovery"
    });
    assert.match(recoveryPrompt, /Fresh-Agent Takeover/);
    assert.doesNotMatch(recoveryPrompt, /recovery_answer_key/);
  } finally {
    await rm(runRoot, { recursive: true, force: true });
  }
});

async function loadBenchmarkData() {
  const source = await readFile(
    path.join(repoRoot, "examples", "delivery-benchmark", "results", "benchmark-data.js"),
    "utf8"
  );
  const context = { window: {} };
  vm.runInNewContext(source, context, { filename: "benchmark-data.js" });
  return context.window.__DELIVERY_BENCHMARK_DATA__;
}
