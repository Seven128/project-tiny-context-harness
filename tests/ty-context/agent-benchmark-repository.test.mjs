import assert from "node:assert/strict";
import { rm, writeFile } from "node:fs/promises";
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
  completeRun,
  controlOptions,
  git,
  withRunRoot,
} from "./agent-benchmark-fixtures.mjs";

test("complete-run validation requires a clean main branch pushed to origin", async () => {
  const assets = await loadAgentBenchmarkAssets();
  await withRunRoot(async (root) => {
    const runDir = path.join(root, "run");
    await prepareAgentBenchmarkRun(
      controlOptions(runDir),
      benchmarkDependencies(assets, baseline),
    );
    await completeRun(runDir, "repository-session");

    const clean = await validateAgentBenchmarkRun({
      runDir,
      complete: true,
    });
    assert.equal(clean.conclusion_eligible, true);
    assert.equal(clean.repository.clean, true);
    assert.equal(clean.repository.branch, "main");
    assert.equal(clean.repository.head, clean.repository.origin_main);
    assert.equal(clean.repository.prepared_commit_ancestor, true);

    const dirtyPath = path.join(runDir, "untracked.txt");
    await writeFile(dirtyPath, "dirty\n", "utf8");
    const dirty = await validateAgentBenchmarkRun({
      runDir,
      complete: true,
    });
    assert.equal(dirty.status, "invalid");
    assert.match(dirty.errors.join("\n"), /final repository is dirty/u);
    await rm(dirtyPath);

    await writeFile(path.join(runDir, "package.json"), '{"changed":true}\n');
    git(runDir, ["add", "package.json"]);
    git(runDir, ["commit", "-m", "local unpushed result"]);
    const unpushed = await validateAgentBenchmarkRun({
      runDir,
      complete: true,
    });
    assert.equal(unpushed.status, "invalid");
    assert.match(
      unpushed.errors.join("\n"),
      /HEAD is not pushed to origin\/main/u,
    );
  });
});
