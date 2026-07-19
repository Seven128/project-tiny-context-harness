import { existsSync } from "node:fs";
import { loadAgentBenchmarkAssets } from "./agent-benchmark-assets.mjs";
import { captureAgentBenchmarkToolHash } from "./agent-benchmark-provenance.mjs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  readFinalRepositoryEvidence,
  readInterventionSummary,
  readObserverEvidence,
  readProtocolPromptEvidence,
  readRecoveryEvidence,
  sessionIds,
  validateSessionReport,
} from "./agent-benchmark-evidence.mjs";
import {
  AGENT_RUN_FILE,
  AGENT_SESSION_FILE,
  QUALITY_PROBE_FILE,
  readJson,
  requireString,
  sha256,
} from "./agent-benchmark-shared.mjs";
import {
  validateRunAgainstAssets,
  validateRunMetadata,
} from "./agent-benchmark-metadata.mjs";

export async function validateAgentBenchmarkRun(options) {
  const runDir = path.resolve(requireString(options.runDir, "--run-dir"));
  const benchmarkDir = path.join(runDir, ".benchmark");
  const metadata = await readJson(path.join(benchmarkDir, AGENT_RUN_FILE));
  const errors = [];
  const warnings = [];
  const calibrationReasons = [];
  validateRunMetadata(metadata, errors);
  let assets = null;
  let operatorTool = null;
  try {
    assets = await loadAgentBenchmarkAssets(options);
    validateRunAgainstAssets(metadata, assets, errors);
    operatorTool = await captureAgentBenchmarkToolHash();
    if (metadata.agent_benchmark_tool_sha256 !== operatorTool.sha256)
      errors.push(
        "agent-run tool hash does not match the current operator runner",
      );
  } catch (error) {
    errors.push(
      `operator benchmark assets are unavailable: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  await assertOperatorAssetsNotCopied(runDir).catch((error) =>
    errors.push(error instanceof Error ? error.message : String(error)),
  );
  const promptPath = path.join(benchmarkDir, "prompt.md");
  if (!existsSync(promptPath)) errors.push("benchmark prompt.md is missing");
  else if (sha256(await readFile(promptPath, "utf8")) !== metadata.prompt_sha256)
    errors.push("benchmark prompt.md hash no longer matches agent-run.json");

  const interventions = await readInterventionSummary(runDir);
  let session = null;
  let quality = null;
  let observer = null;
  let protocolPrompts = null;
  let recovery = null;
  let repository = null;
  if (options.complete) {
    const sessionPath = path.join(benchmarkDir, AGENT_SESSION_FILE);
    if (!existsSync(sessionPath))
      errors.push(
        `${AGENT_SESSION_FILE} is missing; copy the template and fill the external stage-session facts`,
      );
    else {
      session = await readJson(sessionPath);
      validateSessionReport(metadata, session, errors);
    }
    const qualityPath = path.join(benchmarkDir, QUALITY_PROBE_FILE);
    if (!existsSync(qualityPath)) errors.push(`${QUALITY_PROBE_FILE} is missing`);
    else {
      quality = await readJson(qualityPath);
      if (quality.scenario_id !== metadata.scenario)
        errors.push("quality probe scenario does not match agent-run.json");
      if (quality.decision !== "PASS")
        errors.push(`quality probe did not pass: ${quality.decision}`);
    }
    observer = await readObserverEvidence(
      runDir,
      metadata.expected_stages ?? [],
      errors,
      calibrationReasons,
    );
    protocolPrompts = await readProtocolPromptEvidence(
      runDir,
      metadata,
      errors,
      calibrationReasons,
    );
    recovery = await readRecoveryEvidence(runDir, metadata, errors);
    repository = await readFinalRepositoryEvidence(
      runDir,
      metadata.prepared_repository_commit,
      errors,
    );
  } else
    warnings.push(
      "run is only structurally validated; pass --complete after every external Codex stage session and hidden probe",
    );

  const conclusionEligible =
    options.complete === true &&
    errors.length === 0 &&
    calibrationReasons.length === 0;
  return {
    schema_version: "tiny-context-agent-run-validation-v1",
    run_dir: runDir,
    status:
      errors.length === 0
        ? options.complete
          ? "complete"
          : "prepared"
        : "invalid",
    conclusion_eligible: conclusionEligible,
    calibration_only:
      options.complete === true && errors.length === 0 && !conclusionEligible,
    metadata,
    operator_asset_baseline: assets?.plan.baseline_commit ?? null,
    operator_tool_sha256: operatorTool?.sha256 ?? null,
    session,
    quality,
    observer,
    protocol_prompts: protocolPrompts,
    recovery,
    repository,
    interventions,
    calibration_reasons: calibrationReasons,
    errors,
    warnings,
  };
}

export async function validateAgentBenchmarkPair(options) {
  const complete = options.complete === true;
  const shared = {
    complete,
    planPath: options.planPath,
    goldSetPath: options.goldSetPath,
    scenariosRoot: options.scenariosRoot,
  };
  const control = await validateAgentBenchmarkRun({
    ...shared,
    runDir: requireString(options.controlRun, "--control-run"),
  });
  const candidate = await validateAgentBenchmarkRun({
    ...shared,
    runDir: requireString(options.candidateRun, "--candidate-run"),
  });
  const errors = [...control.errors, ...candidate.errors];
  const reasons = [
    ...control.calibration_reasons.map((reason) => `control: ${reason}`),
    ...candidate.calibration_reasons.map((reason) => `candidate: ${reason}`),
  ];
  const left = control.metadata;
  const right = candidate.metadata;
  if (left.role !== "control") errors.push("control run role must be control");
  if (right.role !== "candidate")
    errors.push("candidate run role must be candidate");
  for (const field of [
    "track_id",
    "scenario",
    "run_index",
    "model",
    "reasoning",
    "prompt_sha256",
    "plan_sha256",
    "quality_bar_id",
    "gold_set_sha256",
    "operator_assets_sha256",
    "agent_benchmark_tool_sha256",
  ])
    if (left[field] !== right[field])
      errors.push(`paired run mismatch: ${field}`);
  for (const field of ["expected_stages", "gold_set_episode_ids"])
    if (JSON.stringify(left[field]) !== JSON.stringify(right[field]))
      errors.push(`paired run mismatch: ${field}`);
  if (
    complete &&
    JSON.stringify(control.protocol_prompts?.hashes_by_stage ?? {}) !==
      JSON.stringify(candidate.protocol_prompts?.hashes_by_stage ?? {})
  )
    errors.push("paired run mismatch: protocol_prompt_hashes");
  if (left.variant_id === right.variant_id)
    errors.push("paired runs must use distinct variant ids");
  if (complete && sessionsOverlap(control.session, candidate.session))
    errors.push("paired runs must not reuse a Codex session id");
  if (left.harness_commit === right.harness_commit)
    reasons.push(
      "control and candidate use the same Harness commit; result is calibration-only",
    );
  if (!sameInterventions(control.interventions, candidate.interventions))
    reasons.push(
      "operator interventions differ between control and candidate; result is calibration-only",
    );
  if (!complete) reasons.push("pair has not been validated with --complete");
  const conclusionEligible =
    complete &&
    errors.length === 0 &&
    reasons.length === 0 &&
    control.conclusion_eligible &&
    candidate.conclusion_eligible;
  return {
    schema_version: "tiny-context-agent-pair-validation-v1",
    status: errors.length === 0 ? "valid" : "invalid",
    conclusion_eligible: conclusionEligible,
    calibration_only: errors.length === 0 && !conclusionEligible,
    comparison: compareRuns(control, candidate),
    control,
    candidate,
    errors,
    reasons,
  };
}

export async function assertOperatorAssetsNotCopied(runDir) {
  const benchmarkDir = path.join(runDir, ".benchmark");
  for (const forbidden of ["plan.json", "gold-set.json"])
    if (existsSync(path.join(benchmarkDir, forbidden)))
      throw new Error(`operator_only_asset_leaked:${forbidden}`);
}

function compareRuns(control, candidate) {
  const controlMinutes = control.observer?.observed_minutes ?? null;
  const candidateMinutes = candidate.observer?.observed_minutes ?? null;
  return {
    observer_elapsed: {
      data_source: "external_observer",
      control_minutes: controlMinutes,
      candidate_minutes: candidateMinutes,
      delta_minutes:
        controlMinutes === null || candidateMinutes === null
          ? null
          : round(candidateMinutes - controlMinutes),
      candidate_to_control_ratio:
        controlMinutes && candidateMinutes !== null
          ? round(candidateMinutes / controlMinutes)
          : null,
    },
    session_diagnostics: {
      confidence: "diagnostic_only_unless_backed_by_session_tool_export",
      control: summarizeSession(control.session),
      candidate: summarizeSession(candidate.session),
    },
  };
}

function summarizeSession(session) {
  const stages = Array.isArray(session?.stage_sessions)
    ? session.stage_sessions
    : [];
  const numericTotal = (field) => {
    const values = stages.map((stage) => stage?.[field]).filter(Number.isFinite);
    return values.length ? values.reduce((sum, value) => sum + value, 0) : null;
  };
  return {
    agent_tokens: numericTotal("agent_tokens"),
    context_read_rounds: numericTotal("context_read_rounds"),
    preflight_rounds: numericTotal("preflight_rounds"),
    context_read_files: [
      ...new Set(
        stages.flatMap((stage) =>
          Array.isArray(stage?.context_read_files)
            ? stage.context_read_files
            : [],
        ),
      ),
    ].sort(),
  };
}

function round(value) {
  return Math.round(value * 10000) / 10000;
}

function sessionsOverlap(left, right) {
  const leftIds = sessionIds(left);
  return [...sessionIds(right)].some((id) => leftIds.has(id));
}

function sameInterventions(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}
