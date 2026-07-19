import assert from "node:assert/strict";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  loadAgentBenchmarkAssets,
  prepareAgentBenchmarkRun,
  validateAgentBenchmarkPair,
  validateAgentBenchmarkRun,
} from "../../examples/delivery-benchmark/runner/agent_benchmark.mjs";
import {
  baseline,
  benchmarkDependencies,
  candidate,
  completeRun,
  digest,
  controlOptions,
  fileExists,
  withRunRoot,
} from "./agent-benchmark-fixtures.mjs";

test("prepare-run locks commit/model/prompt hashes and keeps operator gold outside the run", async () => {
  const assets = await loadAgentBenchmarkAssets();
  await withRunRoot(async (root) => {
    const runDir = path.join(root, "control");
    const result = await prepareAgentBenchmarkRun(
      controlOptions(runDir),
      benchmarkDependencies(assets, baseline),
    );
    assert.equal(result.metadata.harness_commit, baseline);
    assert.equal(result.metadata.model, "gpt-fixed");
    assert.equal(result.metadata.reasoning, "xhigh");
    assert.equal(result.metadata.role, "control");
    assert.equal(result.metadata.result_status, "prepared");
    assert.match(result.metadata.prompt_sha256, /^[0-9a-f]{64}$/u);
    assert.match(result.metadata.operator_assets_sha256, /^[0-9a-f]{64}$/u);
    assert.match(result.metadata.harness_cli_sha256, /^[0-9a-f]{64}$/u);
    assert.match(
      result.metadata.agent_benchmark_tool_sha256,
      /^[0-9a-f]{64}$/u,
    );
    assert.match(result.metadata.prepared_repository_tree, /^[0-9a-f]{40}$/u);
    assert.equal(
      await fileExists(path.join(runDir, ".benchmark", "gold-set.json")),
      false,
    );
    assert.equal(
      await fileExists(path.join(runDir, ".benchmark", "plan.json")),
      false,
    );
    const runbook = await readFile(
      path.join(runDir, ".benchmark", "codex-runbook.md"),
      "utf8",
    );
    assert.match(runbook, /new Codex session rooted at this run directory/i);
    assert.match(runbook, /operator-only `agent-benchmark\/` directory/i);
    assert.doesNotMatch(
      runbook,
      /controlling_fact_topics|required_rubric_ids/u,
    );

    const validation = await validateAgentBenchmarkRun({ runDir });
    assert.equal(validation.status, "prepared");
    assert.equal(validation.conclusion_eligible, false);
  });
});

test("prepare-run materializes the explicitly selected Harness checkout", async () => {
  const assets = await loadAgentBenchmarkAssets();
  await withRunRoot(async (root) => {
    const runDir = path.join(root, "selected");
    const selectedHarnessRoot = path.join(root, "baseline-checkout");
    let preparedFrom = null;
    await prepareAgentBenchmarkRun(
      { ...controlOptions(runDir), harnessRoot: selectedHarnessRoot },
      {
        assets,
        readGitState: async (receivedRoot) => {
          assert.equal(receivedRoot, selectedHarnessRoot);
          return { commit: baseline, dirty: false };
        },
        captureOperatorAssets:
          benchmarkDependencies(assets, baseline).captureOperatorAssets,
        captureHarnessCliHash:
          benchmarkDependencies(assets, baseline).captureHarnessCliHash,
        validateSelectedAssets:
          benchmarkDependencies(assets, baseline).validateSelectedAssets,
        prepareRunDirectory: async ({ outDir, harnessRoot }) => {
          preparedFrom = harnessRoot;
          await mkdir(path.join(outDir, ".benchmark"), { recursive: true });
          await writeFile(
            path.join(outDir, ".benchmark", "prompt.md"),
            "Selected checkout prompt.\n",
            "utf8",
          );
        },
        readPreparedRepositoryState: async () => ({
          commit: "2222222222222222222222222222222222222222",
          tree: "3333333333333333333333333333333333333333",
        }),
        now: () => new Date("2026-07-19T00:00:00.000Z"),
      },
    );
    assert.equal(preparedFrom, selectedHarnessRoot);
  });
});

test("prepare-run rejects a dirty checkout and a mismatched Harness ref", async () => {
  const assets = await loadAgentBenchmarkAssets();
  await withRunRoot(async (root) => {
    await assert.rejects(
      prepareAgentBenchmarkRun(controlOptions(path.join(root, "dirty")), {
        ...benchmarkDependencies(assets, baseline),
        readGitState: async () => ({ commit: baseline, dirty: true }),
      }),
      /harness_checkout_dirty/u,
    );
    await assert.rejects(
      prepareAgentBenchmarkRun(controlOptions(path.join(root, "wrong")), {
        ...benchmarkDependencies(assets, baseline),
        readGitState: async () => ({ commit: candidate, dirty: false }),
      }),
      /harness_ref_mismatch/u,
    );
  });
});

test("completed independent pair requires matching conditions and intervention symmetry", async () => {
  const assets = await loadAgentBenchmarkAssets();
  await withRunRoot(async (root) => {
    const controlDir = path.join(root, "control");
    const candidateDir = path.join(root, "candidate");
    await prepareAgentBenchmarkRun(
      controlOptions(controlDir),
      benchmarkDependencies(assets, baseline),
    );
    await prepareAgentBenchmarkRun(
      {
        ...controlOptions(candidateDir),
        role: "candidate",
        variantId: "context-resolve-r0",
        harnessRef: candidate,
      },
      benchmarkDependencies(assets, candidate),
    );
    await completeRun(controlDir, "session-control");
    await completeRun(candidateDir, "session-candidate");

    const pair = await validateAgentBenchmarkPair({
      controlRun: controlDir,
      candidateRun: candidateDir,
      complete: true,
    });
    assert.equal(pair.status, "valid");
    assert.equal(pair.conclusion_eligible, true);
    assert.equal(pair.calibration_only, false);
    assert.equal(pair.comparison.observer_elapsed.delta_minutes, 0);
    assert.equal(
      pair.comparison.session_diagnostics.confidence,
      "diagnostic_only_unless_backed_by_session_tool_export",
    );

    await writeFile(
      path.join(candidateDir, ".benchmark", "interventions.ndjson"),
      `${JSON.stringify({ severity: "correction" })}\n`,
      "utf8",
    );
    const asymmetric = await validateAgentBenchmarkPair({
      controlRun: controlDir,
      candidateRun: candidateDir,
      complete: true,
    });
    assert.equal(asymmetric.status, "valid");
    assert.equal(asymmetric.conclusion_eligible, false);
    assert.equal(asymmetric.calibration_only, true);
    assert.match(asymmetric.reasons.join("\n"), /interventions differ/u);

    await writeFile(
      path.join(candidateDir, ".benchmark", "interventions.ndjson"),
      "",
      "utf8",
    );
    const metadataPath = path.join(
      candidateDir,
      ".benchmark",
      "agent-run.json",
    );
    const metadata = JSON.parse(await readFile(metadataPath, "utf8"));
    metadata.operator_asset_hashes = {
      "operator-fixture": digest("candidate-operator"),
    };
    metadata.operator_assets_sha256 = digest(
      JSON.stringify(metadata.operator_asset_hashes),
    );
    await writeFile(
      metadataPath,
      `${JSON.stringify(metadata, null, 2)}\n`,
      "utf8",
    );
    const changedQualityBar = await validateAgentBenchmarkPair({
      controlRun: controlDir,
      candidateRun: candidateDir,
      complete: true,
    });
    assert.equal(changedQualityBar.status, "invalid");
    assert.match(changedQualityBar.errors.join("\n"), /operator_assets_sha256/u);
  });
});

test("complete-run validation enforces fresh stage sessions, observer count, and recovery proof", async () => {
  const assets = await loadAgentBenchmarkAssets();
  await withRunRoot(async (root) => {
    const runDir = path.join(root, "run");
    await prepareAgentBenchmarkRun(
      controlOptions(runDir),
      benchmarkDependencies(assets, baseline),
    );
    await completeRun(runDir, "session");
    const good = await validateAgentBenchmarkRun({ runDir, complete: true });
    assert.equal(good.conclusion_eligible, true);

    const sessionPath = path.join(runDir, ".benchmark", "agent-session.json");
    const sessionText = await readFile(sessionPath, "utf8");
    const session = JSON.parse(sessionText);
    session.stage_sessions[1].session_id = session.stage_sessions[0].session_id;
    await writeFile(sessionPath, `${JSON.stringify(session, null, 2)}\n`, "utf8");
    const reused = await validateAgentBenchmarkRun({ runDir, complete: true });
    assert.equal(reused.status, "invalid");
    assert.match(reused.errors.join("\n"), /session_id reused/u);
    await writeFile(sessionPath, sessionText, "utf8");

    const observationPath = path.join(
      runDir,
      ".benchmark",
      "observations.ndjson",
    );
    const observationText = await readFile(observationPath, "utf8");
    await writeFile(
      observationPath,
      `${observationText.split(/\r?\n/u).filter(Boolean).slice(0, 2).join("\n")}\n`,
      "utf8",
    );
    const shortObserver = await validateAgentBenchmarkRun({
      runDir,
      complete: true,
    });
    assert.equal(shortObserver.status, "complete");
    assert.equal(shortObserver.calibration_only, true);
    assert.match(
      shortObserver.calibration_reasons.join("\n"),
      /observer stage count differs/u,
    );
    await writeFile(observationPath, observationText, "utf8");

    await rm(path.join(runDir, ".benchmark", "recovery-score.json"));
    const missingRecovery = await validateAgentBenchmarkRun({
      runDir,
      complete: true,
    });
    assert.equal(missingRecovery.status, "invalid");
    assert.match(missingRecovery.errors.join("\n"), /recovery-score.json/u);
  });
});

test("same-commit pair is calibration-only after all mechanical gates pass", async () => {
  const assets = await loadAgentBenchmarkAssets();
  await withRunRoot(async (root) => {
    const controlDir = path.join(root, "control");
    const candidateDir = path.join(root, "candidate");
    await prepareAgentBenchmarkRun(
      controlOptions(controlDir),
      benchmarkDependencies(assets, baseline),
    );
    await prepareAgentBenchmarkRun(
      {
        ...controlOptions(candidateDir),
        role: "candidate",
        variantId: "tooling-calibration",
        harnessRef: baseline,
      },
      benchmarkDependencies(assets, baseline),
    );
    await completeRun(controlDir, "same-control");
    await completeRun(candidateDir, "same-candidate");
    const pair = await validateAgentBenchmarkPair({
      controlRun: controlDir,
      candidateRun: candidateDir,
      complete: true,
    });
    assert.equal(pair.status, "valid");
    assert.equal(pair.conclusion_eligible, false);
    assert.equal(pair.calibration_only, true);
    assert.match(pair.reasons.join("\n"), /same Harness commit/u);
  });
});
