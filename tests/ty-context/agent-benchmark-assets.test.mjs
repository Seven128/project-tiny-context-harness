import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  loadAgentBenchmarkAssets,
  validateAgentBenchmarkAssets,
} from "../../examples/delivery-benchmark/runner/agent_benchmark.mjs";
import { captureBenchmarkOperatorAssets } from "../../examples/delivery-benchmark/runner/agent-benchmark-provenance.mjs";
import {
  baseline,
  readRepoFile,
} from "./agent-benchmark-fixtures.mjs";

test("agent benchmark assets validate the fixed baseline, rubric links, and explicit gaps", async () => {
  const assets = await loadAgentBenchmarkAssets();
  assert.equal(assets.plan.baseline_commit, baseline);
  assert.equal(assets.goldSet.operator_only, true);
  assert.ok(assets.goldSet.episodes.length >= 12);
  assert.deepEqual(
    assets.plan.tracks
      .filter((track) => track.status === "agent_run_ready")
      .map((track) => track.id)
      .sort(),
    ["context-routing", "workflow-expression"],
  );
  const gaps = new Set(
    assets.goldSet.coverage.known_gaps.map((item) => item.id),
  );
  for (const gap of [
    "population-coverage",
    "long-task-authoring",
    "preflight-repair",
    "weak-observability",
  ])
    assert.ok(gaps.has(gap), `missing explicit benchmark gap ${gap}`);
});

test("asset validation rejects broken fixed conditions, duplicate episodes, and unknown rubric ids", async () => {
  const assets = await loadAgentBenchmarkAssets();
  const plan = structuredClone(assets.plan);
  const gold = structuredClone(assets.goldSet);
  plan.fixed_conditions.fresh_session_per_stage = false;
  gold.operator_only = false;
  gold.episodes[1].id = gold.episodes[0].id;
  gold.episodes[0].expected_context_delta = "sometimes";
  gold.episodes[0].required_rubric_ids.push("UNKNOWN-RUBRIC-ID");
  const result = await validateAgentBenchmarkAssets(plan, gold, {
    scenariosRoot: assets.scenariosRoot,
  });
  assert.match(result.errors.join("\n"), /fresh_session_per_stage/u);
  assert.match(result.errors.join("\n"), /operator_only/u);
  assert.match(result.errors.join("\n"), /expected_context_delta/u);
  assert.match(result.errors.join("\n"), /episode id is duplicated/u);
  assert.match(result.errors.join("\n"), /UNKNOWN-RUBRIC-ID/u);
});

test("operator asset projection includes hidden quality inputs and changes with them", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "agent-operator-assets-"));
  const scenarioRoot = path.join(
    root,
    "examples",
    "delivery-benchmark",
    "scenarios",
    "sample",
  );
  try {
    await mkdir(path.join(root, "examples", "delivery-benchmark", "runner"), {
      recursive: true,
    });
    await mkdir(path.join(root, "examples", "delivery-benchmark", "prompts"), {
      recursive: true,
    });
    await mkdir(scenarioRoot, { recursive: true });
    const files = {
      "examples/delivery-benchmark/runner/delivery_benchmark.mjs": "runner\n",
      "examples/delivery-benchmark/prompts/harness.md": "prompt\n",
      "examples/delivery-benchmark/scenarios/sample/rubric.json": "{}\n",
      "examples/delivery-benchmark/scenarios/sample/requirements.md": "requirements\n",
      "examples/delivery-benchmark/scenarios/sample/acceptance_criteria.md": "acceptance\n",
      "examples/delivery-benchmark/scenarios/sample/quality_probe.mjs": "probe-v1\n",
    };
    for (const [relative, content] of Object.entries(files))
      await writeFile(path.join(root, ...relative.split("/")), content, "utf8");
    const before = await captureBenchmarkOperatorAssets(root, "sample");
    assert.match(before.sha256, /^[0-9a-f]{64}$/u);
    assert.equal(
      before.hashes[
        "examples/delivery-benchmark/scenarios/sample/recovery_answer_key.json"
      ],
      null,
    );
    await writeFile(
      path.join(scenarioRoot, "quality_probe.mjs"),
      "probe-v2\n",
      "utf8",
    );
    const after = await captureBenchmarkOperatorAssets(root, "sample");
    assert.notEqual(after.sha256, before.sha256);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("benchmark documentation separates deterministic preparation from real Agent evidence", async () => {
  const [readme, plan, gold, rootReadme, runbook, benchmarking, context] =
    await Promise.all([
      readRepoFile("examples/delivery-benchmark/agent-benchmark/README.md"),
      readRepoFile("examples/delivery-benchmark/agent-benchmark/plan.json"),
      readRepoFile("examples/delivery-benchmark/agent-benchmark/gold-set.json"),
      readRepoFile("examples/delivery-benchmark/README.md"),
      readRepoFile("examples/delivery-benchmark/RUNBOOK.md"),
      readRepoFile("docs/benchmarking.md"),
      readRepoFile("project_context/areas/delivery-benchmark.md"),
    ]);
  assert.match(readme, /does not simulate an Agent/i);
  assert.match(
    readme,
    /new Codex session rooted at the prepared scenario directory/i,
  );
  assert.match(readme, /gold set remains outside/i);
  assert.match(readme, /At least three eligible paired runs/i);
  assert.doesNotMatch(readme, /benchmark-proven faster|2x faster/i);
  assert.match(plan, new RegExp(baseline, "u"));
  assert.match(gold, /"operator_only": true/u);
  for (const content of [rootReadme, runbook, benchmarking, context]) {
    assert.match(content, /real Codex|Real Codex/iu);
    assert.match(content, /gold set|gold-set/iu);
    assert.match(content, /separate|independent/iu);
  }
  assert.match(context, /runner records .*hashes/iu);
  assert.match(context, /Population proof/iu);
});
