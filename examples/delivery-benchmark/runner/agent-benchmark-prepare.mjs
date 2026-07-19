import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import {
  loadAgentBenchmarkAssets,
  validateAgentBenchmarkAssets,
} from "./agent-benchmark-assets.mjs";
import { renderCodexRunbook } from "./agent-benchmark-runbook.mjs";
import {
  captureAgentBenchmarkToolHash,
  captureBenchmarkOperatorAssets,
  captureHarnessCliHash,
  readPreparedRepositoryState,
} from "./agent-benchmark-provenance.mjs";
import {
  AGENT_RUNBOOK_FILE,
  AGENT_RUN_FILE,
  AGENT_SESSION_TEMPLATE_FILE,
  REPO_ROOT,
  VALID_ROLES,
  isCommitSha,
  requireKey,
  requireString,
  sha256,
  writeJson,
} from "./agent-benchmark-shared.mjs";
import { assertOperatorAssetsNotCopied } from "./agent-benchmark-validate.mjs";

const exec = promisify(execFile);

export async function prepareAgentBenchmarkRun(options, dependencies = {}) {
  const assets =
    dependencies.assets ?? (await loadAgentBenchmarkAssets(options));
  const track = assets.plan.tracks.find(
    (candidate) => candidate.id === requireString(options.trackId, "--track"),
  );
  if (!track) throw new Error(`unknown benchmark track: ${options.trackId}`);
  if (track.status !== "agent_run_ready")
    throw new Error(
      `benchmark_track_not_agent_run_ready:${track.id}:${track.status}`,
    );
  const role = requireString(options.role, "--role");
  if (!VALID_ROLES.has(role))
    throw new Error("--role must be control or candidate");
  const scenario = requireString(options.scenario, "--scenario");
  if (!track.scenarios.includes(scenario))
    throw new Error(`track ${track.id} does not cover scenario ${scenario}`);
  const variantId = requireKey(options.variantId, "--variant");
  const runIndex = options.runIndex;
  if (!Number.isInteger(runIndex) || runIndex < 1)
    throw new Error("--run-index must be a positive integer");
  const model = requireString(options.model, "--model");
  const reasoning = requireString(options.reasoning, "--reasoning");
  const expectedHarnessRef =
    options.harnessRef ??
    (role === "control" ? assets.plan.baseline_commit : undefined);
  if (!isCommitSha(expectedHarnessRef))
    throw new Error(
      "--harness-ref must be a 40-character commit SHA for candidate runs",
    );

  const harnessRoot = path.resolve(
    options.harnessRoot ?? dependencies.repoRoot ?? REPO_ROOT,
  );
  const gitState = await (dependencies.readGitState ?? readGitState)(harnessRoot);
  if (gitState.commit !== expectedHarnessRef)
    throw new Error(
      `harness_ref_mismatch:expected=${expectedHarnessRef}:actual=${gitState.commit}`,
    );
  if (gitState.dirty)
    throw new Error("harness_checkout_dirty:commit or stash changes first");
  await (
    dependencies.validateSelectedAssets ?? validateSelectedHarnessAssets
  )(assets, harnessRoot);
  const operatorAssets = await (
    dependencies.captureOperatorAssets ?? captureBenchmarkOperatorAssets
  )(harnessRoot, scenario);
  const harnessCli = await (
    dependencies.captureHarnessCliHash ?? captureHarnessCliHash
  )(harnessRoot);
  const operatorTool = await (
    dependencies.captureOperatorTool ?? captureAgentBenchmarkToolHash
  )();

  const outDir = path.resolve(requireString(options.outDir, "--out-dir"));
  const prepare =
    dependencies.prepareRunDirectory ??
    ((prepareOptions) =>
      defaultPrepareRunDirectory(prepareOptions, harnessRoot));
  await prepare({
    scenario,
    mode: "harness",
    outDir,
    force: options.force === true,
    harnessRoot,
  });
  const preparedRepository = await (
    dependencies.readPreparedRepositoryState ?? readPreparedRepositoryState
  )(outDir);
  const promptText = await readFile(
    path.join(outDir, ".benchmark", "prompt.md"),
    "utf8",
  );
  const metadata = runMetadata({
    assets,
    track,
    role,
    variantId,
    scenario,
    runIndex,
    model,
    reasoning,
    gitState,
    operatorAssets,
    harnessCli,
    operatorTool,
    preparedRepository,
    promptText,
    now: dependencies.now ? dependencies.now() : new Date(),
  });
  const benchmarkDir = path.join(outDir, ".benchmark");
  await mkdir(benchmarkDir, { recursive: true });
  await writeJson(path.join(benchmarkDir, AGENT_RUN_FILE), metadata);
  await writeJson(
    path.join(benchmarkDir, AGENT_SESSION_TEMPLATE_FILE),
    sessionTemplate(metadata),
  );
  await writeFile(
    path.join(benchmarkDir, AGENT_RUNBOOK_FILE),
    renderCodexRunbook(metadata, outDir, harnessRoot),
    "utf8",
  );
  await assertOperatorAssetsNotCopied(outDir);
  return { run_dir: outDir, metadata };
}

function runMetadata(options) {
  const episodes = options.assets.goldSet.episodes.filter(
    (episode) => episode.scenario === options.scenario,
  );
  const expectedStages = ["initial", "recovery", "rfc", "debug"]
    .filter((stage) => episodes.some((episode) => episode.stage === stage))
    .map(stageLabel);
  return {
    schema_version: "tiny-context-agent-run-v1",
    track_id: options.track.id,
    role: options.role,
    variant_id: options.variantId,
    scenario: options.scenario,
    run_index: options.runIndex,
    harness_commit: options.gitState.commit,
    harness_checkout_clean: !options.gitState.dirty,
    harness_cli_path: options.harnessCli.path,
    harness_cli_sha256: options.harnessCli.sha256,
    agent_benchmark_tool_sha256: options.operatorTool.sha256,
    agent_benchmark_tool_hashes: options.operatorTool.hashes,
    operator_assets_sha256: options.operatorAssets.sha256,
    operator_asset_hashes: options.operatorAssets.hashes,
    prepared_repository_commit: options.preparedRepository.commit,
    prepared_repository_tree: options.preparedRepository.tree,
    model: options.model,
    reasoning: options.reasoning,
    session_requirement: "fresh_independent_session_per_stage",
    expected_stages: expectedStages,
    gold_set_episode_ids: episodes.map((episode) => episode.id),
    prompt_sha256: sha256(options.promptText),
    plan_sha256: options.assets.planSha256,
    gold_set_sha256: options.assets.goldSetSha256,
    gold_set_episode_count: episodes.length,
    quality_bar_id: `${options.scenario}:${options.assets.goldSetSha256}`,
    prepared_at: options.now.toISOString(),
    conclusion_eligible: false,
    result_status: "prepared",
  };
}

function sessionTemplate(metadata) {
  return {
    schema_version: "tiny-context-agent-session-v1",
    stage_prompt_timing_confirmed: false,
    stage_sessions: metadata.expected_stages.map((stage) => ({
      stage,
      session_id: `replace-with-${stage.toLowerCase()}-session-id`,
      fresh_session_confirmed: false,
      model: metadata.model,
      reasoning: metadata.reasoning,
      started_at: "",
      ended_at: "",
      status: "pending",
      agent_tokens: null,
      context_read_files: [],
      context_read_rounds: null,
      preflight_rounds: null,
      notes: "",
    })),
    measurement_confidence: {
      agent_tokens: "unavailable",
      context_reads: "agent_reported",
      preflight_rounds: "operator_observed",
    },
    notes: "",
  };
}

function stageLabel(stage) {
  return stage === "initial" ? "INITIAL_DELIVERY" : stage.toUpperCase();
}

async function validateSelectedHarnessAssets(assets, harnessRoot) {
  const validation = await validateAgentBenchmarkAssets(
    assets.plan,
    assets.goldSet,
    {
      scenariosRoot: path.join(
        harnessRoot,
        "examples",
        "delivery-benchmark",
        "scenarios",
      ),
    },
  );
  if (validation.errors.length > 0)
    throw new Error(
      `selected_harness_benchmark_assets_invalid:\n${validation.errors.join("\n")}`,
    );
}

async function defaultPrepareRunDirectory(options, harnessRoot) {
  const runnerPath = path.join(
    harnessRoot,
    "examples",
    "delivery-benchmark",
    "runner",
    "delivery_benchmark.mjs",
  );
  const module = await import(pathToFileURL(runnerPath).href);
  return module.prepareRunDirectory(options);
}

async function readGitState(repoRoot) {
  const { stdout: commitOutput } = await exec("git", ["rev-parse", "HEAD"], {
    cwd: repoRoot,
    windowsHide: true,
  });
  const { stdout: statusOutput } = await exec(
    "git",
    ["status", "--porcelain=v1"],
    { cwd: repoRoot, windowsHide: true },
  );
  return {
    commit: commitOutput.trim(),
    dirty: Boolean(statusOutput.trim()),
  };
}
