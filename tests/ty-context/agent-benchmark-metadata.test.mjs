import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  loadAgentBenchmarkAssets,
  prepareAgentBenchmarkRun,
  validateAgentBenchmarkRun,
} from "../../examples/delivery-benchmark/runner/agent_benchmark.mjs";
import {
  baseline,
  benchmarkDependencies,
  candidate,
  controlOptions,
  digest,
  withRunRoot,
} from "./agent-benchmark-fixtures.mjs";

test("run validation binds metadata to the operator plan, gold set, and baseline", async () => {
  const assets = await loadAgentBenchmarkAssets();
  await withRunRoot(async (root) => {
    const runDir = path.join(root, "run");
    await prepareAgentBenchmarkRun(
      controlOptions(runDir),
      benchmarkDependencies(assets, baseline),
    );
    const metadataPath = path.join(runDir, ".benchmark", "agent-run.json");
    const original = await readFile(metadataPath, "utf8");
    const metadata = JSON.parse(original);

    metadata.plan_sha256 = digest("different operator plan");
    await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);
    const changedPlan = await validateAgentBenchmarkRun({ runDir });
    assert.equal(changedPlan.status, "invalid");
    assert.match(changedPlan.errors.join("\n"), /plan_sha256/u);

    metadata.plan_sha256 = assets.planSha256;
    metadata.agent_benchmark_tool_sha256 = digest("different operator tool");
    await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);
    const changedTool = await validateAgentBenchmarkRun({ runDir });
    assert.equal(changedTool.status, "invalid");
    assert.match(changedTool.errors.join("\n"), /tool hash/u);

    metadata.agent_benchmark_tool_sha256 =
      JSON.parse(original).agent_benchmark_tool_sha256;
    metadata.harness_commit = candidate;
    await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);
    const changedBaseline = await validateAgentBenchmarkRun({ runDir });
    assert.equal(changedBaseline.status, "invalid");
    assert.match(
      changedBaseline.errors.join("\n"),
      /fixed operator baseline commit/u,
    );

    await writeFile(metadataPath, original);
  });
});
