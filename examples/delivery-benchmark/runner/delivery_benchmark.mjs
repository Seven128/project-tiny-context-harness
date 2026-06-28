#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFile, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildWorkflowDiagnostics } from "./workflow_diagnostics.mjs";

export { buildWorkflowDiagnostics };

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BENCHMARK_ROOT = path.resolve(HERE, "..");
const REPO_ROOT = path.resolve(BENCHMARK_ROOT, "..", "..");
const SCENARIOS_ROOT = path.join(BENCHMARK_ROOT, "scenarios");
const PROMPTS_ROOT = path.join(BENCHMARK_ROOT, "prompts");
const HARNESS_CLI_PATH = path.join(REPO_ROOT, "packages", "ty-context", "dist", "cli.js");
const VALID_MODES = new Set(["baseline", "harness"]);
const VALID_STAGES = new Set(["recovery", "rfc", "debug"]);
const OBSERVER_IGNORED_DIRS = new Set([".benchmark", ".git", ".npm-cache", "node_modules", "dist", "build", "coverage"]);
const OBSERVER_STATE_FILE = "observer-state.json";
const OBSERVER_STOP_FILE = "observer-stop.json";
const OBSERVATIONS_FILE = "observations.ndjson";
const QUALITY_PROBE_FILE = "quality-probe.json";
const FIRST_PASS_QUALITY_PROBE_FILE = "quality-probe-first-pass.json";
const RECOVERY_SCORE_FILE = "recovery-score.json";
const INTERVENTIONS_FILE = "interventions.ndjson";
const GATE_FINDINGS_FILE = "gate-findings.ndjson";
const PROMPT_LEDGER_FILE = "prompts.ndjson";
const VALID_INTERVENTION_SEVERITIES = new Set(["nudge", "clarification", "correction", "rework", "safety_stop"]);
const VALID_GATE_TYPES = new Set(["product", "workflow"]);
const VALID_PROMPT_KINDS = new Set(["protocol_initial", "protocol_stage", "operator_intervention", "operator_note"]);
const VALID_RUN_TYPES = new Set(["cold", "warm", "unknown"]);
const VALID_PROTOCOL_STATUSES = new Set(["formal", "calibration", "blocked", "unreviewed"]);
const ARTIFACT_IGNORED_DIRS = new Set([".benchmark", ".git", ".npm-cache", "node_modules", "dist", "build", "coverage"]);
const ARTIFACT_CATEGORY_LABELS = {
  managed_runtime: "Harness managed runtime",
  project_facts: "Project facts",
  product_source_tests: "Product source, tests and UI assets",
  product_docs: "Product docs and handoff",
  raw_artifacts: "Raw artifacts",
  scaffold: "Project scaffold",
  other: "Other"
};
const LIFECYCLE_PHASES = {
  initial_delivery_minutes: ["INITIAL_DELIVERY"],
  recovery_orientation_minutes: ["RECOVERY"],
  rfc_fix_minutes: ["RFC"],
  debug_fix_minutes: ["DEBUG"]
};
const VALID_EVENT_KINDS = new Set([
  "workflow_control",
  "requirements",
  "design",
  "coding",
  "test",
  "review",
  "release",
  "rework",
  "handoff"
]);

export function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = { command };
  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--scenario") {
      options.scenario = requireValue(rest, ++index, arg);
    } else if (arg === "--mode") {
      options.mode = requireValue(rest, ++index, arg);
    } else if (arg === "--stage") {
      options.stage = requireValue(rest, ++index, arg);
    } else if (arg === "--out-dir") {
      options.outDir = requireValue(rest, ++index, arg);
    } else if (arg === "--run-dir") {
      options.runDir = requireValue(rest, ++index, arg);
    } else if (arg === "--force") {
      options.force = true;
    } else if (arg === "--event") {
      options.event = requireValue(rest, ++index, arg);
    } else if (arg === "--kind") {
      options.kind = requireValue(rest, ++index, arg);
    } else if (arg === "--phase") {
      options.phase = requireValue(rest, ++index, arg);
    } else if (arg === "--minutes") {
      options.minutes = parseNonNegativeNumber(requireValue(rest, ++index, arg), arg);
    } else if (arg === "--tokens") {
      options.tokens = parseNonNegativeNumber(requireValue(rest, ++index, arg), arg);
    } else if (arg === "--interval-ms") {
      options.intervalMs = parsePositiveNumber(requireValue(rest, ++index, arg), arg);
    } else if (arg === "--notes") {
      options.notes = requireValue(rest, ++index, arg);
    } else if (arg === "--prompt-file") {
      options.promptFile = requireValue(rest, ++index, arg);
    } else if (arg === "--prompt-kind") {
      options.promptKind = requireValue(rest, ++index, arg);
    } else if (arg === "--reason") {
      options.reason = requireValue(rest, ++index, arg);
    } else if (arg === "--severity") {
      options.severity = requireValue(rest, ++index, arg);
    } else if (arg === "--gate-type") {
      options.gateType = requireValue(rest, ++index, arg);
    } else if (arg === "--defects-caught") {
      options.defectsCaught = parseNonNegativeNumber(requireValue(rest, ++index, arg), arg);
    } else if (arg === "--defect-ids") {
      options.defectIds = requireValue(rest, ++index, arg);
    } else if (arg === "--would-escape") {
      options.wouldEscape = parseBoolean(requireValue(rest, ++index, arg), arg);
    } else if (arg === "--out") {
      options.out = requireValue(rest, ++index, arg);
    } else if (arg === "--answer") {
      options.answer = requireValue(rest, ++index, arg);
    } else if (arg === "--baseline-report") {
      options.baselineReport = requireValue(rest, ++index, arg);
    } else if (arg === "--harness-report") {
      options.harnessReport = requireValue(rest, ++index, arg);
    } else if (arg === "--protocol-status") {
      options.protocolStatus = requireProtocolStatus(requireValue(rest, ++index, arg));
    } else if (arg === "--workflow-control-minutes") {
      options.workflowControlMinutes = parseNonNegativeNumber(requireValue(rest, ++index, arg), arg);
    } else if (arg === "--workflow-overhead-ratio") {
      options.workflowOverheadRatio = parseNonNegativeNumber(requireValue(rest, ++index, arg), arg);
    } else if (arg === "--workflow-artifact-count") {
      options.workflowArtifactCount = parseNonNegativeNumber(requireValue(rest, ++index, arg), arg);
    } else if (arg === "--total-artifact-count") {
      options.totalArtifactCount = parseNonNegativeNumber(requireValue(rest, ++index, arg), arg);
    } else if (arg === "--hygiene-issue-count") {
      options.hygieneIssueCount = parseNonNegativeNumber(requireValue(rest, ++index, arg), arg);
    } else if (arg === "--product-defect-count") {
      options.productDefectCount = parseNonNegativeNumber(requireValue(rest, ++index, arg), arg);
    } else if (arg === "--ac-progress-visible-count") {
      options.acProgressVisibleCount = parseNonNegativeNumber(requireValue(rest, ++index, arg), arg);
    } else if (arg === "--ac-progress-total") {
      options.acProgressTotal = parseNonNegativeNumber(requireValue(rest, ++index, arg), arg);
    } else if (arg === "--total-delivery-minutes") {
      options.totalDeliveryMinutes = parseNonNegativeNumber(requireValue(rest, ++index, arg), arg);
    } else if (arg === "--initial-delivery-minutes") {
      options.initialDeliveryMinutes = parseNonNegativeNumber(requireValue(rest, ++index, arg), arg);
    } else if (arg === "--recovery-orientation-minutes") {
      options.recoveryOrientationMinutes = parseNonNegativeNumber(requireValue(rest, ++index, arg), arg);
    } else if (arg === "--rfc-fix-minutes") {
      options.rfcFixMinutes = parseNonNegativeNumber(requireValue(rest, ++index, arg), arg);
    } else if (arg === "--debug-fix-minutes") {
      options.debugFixMinutes = parseNonNegativeNumber(requireValue(rest, ++index, arg), arg);
    } else if (arg === "--context-recovery-score") {
      options.contextRecoveryScore = parseNonNegativeNumber(requireValue(rest, ++index, arg), arg);
    } else if (arg === "--context-recovery-total") {
      options.contextRecoveryTotal = parseNonNegativeNumber(requireValue(rest, ++index, arg), arg);
    } else if (arg === "--wrong-path-count") {
      options.wrongPathCount = parseNonNegativeNumber(requireValue(rest, ++index, arg), arg);
    } else if (arg === "--estimated-vibe-handoff-minutes") {
      options.estimatedVibeHandoffMinutes = parseNonNegativeNumber(requireValue(rest, ++index, arg), arg);
    } else if (arg === "--avoided-rework-minutes") {
      options.avoidedReworkMinutes = parseNonNegativeNumber(requireValue(rest, ++index, arg), arg);
    } else if (arg === "--comparison-confidence") {
      options.comparisonConfidence = requireValue(rest, ++index, arg);
    } else if (arg === "--run-type") {
      options.runType = requireRunType(requireValue(rest, ++index, arg));
    } else if (arg === "--bootstrap-minutes") {
      options.bootstrapMinutes = parseNonNegativeNumber(requireValue(rest, ++index, arg), arg);
    } else if (arg === "--json-report") {
      options.jsonReport = requireValue(rest, ++index, arg);
    } else if (arg === "--markdown-report") {
      options.markdownReport = requireValue(rest, ++index, arg);
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  return options;
}

export async function listScenarios(scenariosRoot = SCENARIOS_ROOT) {
  const entries = await readdir(scenariosRoot, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
}

export async function loadScenario(id, scenariosRoot = SCENARIOS_ROOT) {
  if (!id) throw new Error("--scenario is required");
  const scenarioDir = path.join(scenariosRoot, id);
  const rubricPath = path.join(scenarioDir, "rubric.json");
  if (!existsSync(rubricPath)) {
    throw new Error(`unknown scenario or missing rubric: ${id}`);
  }
  const rubric = JSON.parse(await readFile(rubricPath, "utf8"));
  return {
    id,
    dir: scenarioDir,
    rubric,
    qualityProbePath: existsSync(path.join(scenarioDir, "quality_probe.mjs")) ? path.join(scenarioDir, "quality_probe.mjs") : null,
    recoveryAnswerKeyPath: existsSync(path.join(scenarioDir, "recovery_answer_key.json"))
      ? path.join(scenarioDir, "recovery_answer_key.json")
      : null,
    requirements: await readOptional(path.join(scenarioDir, "requirements.md")),
    acceptance: await readOptional(path.join(scenarioDir, "acceptance_criteria.md")),
    rfc: await readOptional(path.join(scenarioDir, "rfc_change.md")),
    recovery: await readOptional(path.join(scenarioDir, "recovery_checkpoint.md")),
    debugFix: await readOptional(path.join(scenarioDir, "debug_fix.md")),
    lifecycleProbe: await readOptional(path.join(scenarioDir, "lifecycle_probe.md")),
    gateProfile: await readOptional(path.join(scenarioDir, "gate_profile.md"))
  };
}

export async function prepareRunDirectory(options) {
  const mode = requireMode(options.mode);
  const scenario = await loadScenario(options.scenario);
  const outDir = path.resolve(requireString(options.outDir, "--out-dir is required"));
  if (existsSync(outDir)) {
    const existing = await readdir(outDir);
    if (existing.length > 0 && !options.force) {
      throw new Error(`${outDir} is not empty; pass --force to recreate it`);
    }
    if (options.force) {
      await rm(outDir, { recursive: true, force: true });
    }
  }
  await mkdir(path.join(outDir, ".benchmark"), { recursive: true });
  await mkdir(path.join(outDir, "src"), { recursive: true });
  await mkdir(path.join(outDir, "tests"), { recursive: true });

  await writeFile(
    path.join(outDir, "package.json"),
    `${JSON.stringify(
      {
        name: `${scenario.id}-${mode}-run`,
        private: true,
        type: "module",
        scripts: { test: "node --test" },
        benchmark: { scenario: scenario.id, mode }
      },
      null,
      2
    )}\n`,
    "utf8"
  );
  await writeFile(path.join(outDir, "README.md"), renderRunReadme(scenario, mode), "utf8");
  const promptText = await renderPrompt(scenario, mode);
  await writeFile(path.join(outDir, ".benchmark", "scenario.md"), renderInitialScenarioBundle(scenario), "utf8");
  await writeFile(path.join(outDir, ".benchmark", "prompt.md"), promptText, "utf8");
  await writeFile(path.join(outDir, ".benchmark", "events.ndjson"), "", "utf8");
  await appendBenchmarkNdjson(
    outDir,
    PROMPT_LEDGER_FILE,
    buildPromptLedgerRecord(promptText, {
      stage: "INITIAL_DELIVERY",
      promptKind: "protocol_initial",
      reason: "prepared initial delivery prompt",
      dataSource: "runner_recorded_prompt"
    })
  );
  if (mode === "harness") {
    materializeHarnessWarmScaffold(outDir);
  }
  await initializeRunGitRepository(outDir);
  return { outDir, scenario: scenario.id, mode, git: { initialized: true, branch: "main", remote: ".benchmark/remote.git" } };
}

export async function renderStagePrompt(options) {
  const mode = requireMode(options.mode);
  const stage = requireStage(options.stage);
  const scenario = await loadScenario(options.scenario);
  return renderStagePromptContent(scenario, mode, stage);
}

export async function recordPrompt(options) {
  const runDir = path.resolve(requireString(options.runDir, "--run-dir is required"));
  const promptKind = requirePromptKind(options.promptKind);
  const promptPath = path.resolve(requireString(options.promptFile, "--prompt-file is required"));
  const promptText = await readFile(promptPath, "utf8");
  const record = buildPromptLedgerRecord(promptText, {
    stage: options.stage ?? "unspecified",
    promptKind,
    reason: options.reason ?? "",
    notes: options.notes ?? "",
    dataSource: promptKind.startsWith("protocol_") ? "runner_recorded_prompt" : "operator_recorded_prompt"
  });
  await appendBenchmarkNdjson(runDir, PROMPT_LEDGER_FILE, record);
  return record;
}

export async function recordEvent(options) {
  const runDir = path.resolve(requireString(options.runDir, "--run-dir is required"));
  const kind = options.kind ?? "workflow_control";
  if (!VALID_EVENT_KINDS.has(kind)) {
    throw new Error(`--kind must be one of: ${Array.from(VALID_EVENT_KINDS).join(", ")}`);
  }
  const event = {
    at: new Date().toISOString(),
    event: requireString(options.event, "--event is required"),
    kind,
    phase: options.phase ?? "",
    minutes: options.minutes ?? null,
    tokens: options.tokens ?? null,
    notes: options.notes ?? "",
    timing_source: options.minutes === undefined ? null : "agent_recorded_estimate",
    timing_confidence: options.minutes === undefined ? null : "low"
  };
  await mkdir(path.join(runDir, ".benchmark"), { recursive: true });
  await appendFile(path.join(runDir, ".benchmark", "events.ndjson"), `${JSON.stringify(event)}\n`, "utf8");
  return event;
}

export async function startTimer(options) {
  const runDir = path.resolve(requireString(options.runDir, "--run-dir is required"));
  const kind = requireString(options.kind, "--kind is required for timer-start");
  if (!VALID_EVENT_KINDS.has(kind)) {
    throw new Error(`--kind must be one of: ${Array.from(VALID_EVENT_KINDS).join(", ")}`);
  }
  const benchmarkDir = path.join(runDir, ".benchmark");
  const timerPath = path.join(benchmarkDir, "timer.json");
  if (existsSync(timerPath)) {
    throw new Error(`timer already active for ${runDir}; stop or cancel it first`);
  }
  const startedAtEpochMs = Date.now();
  const state = {
    run_dir: runDir,
    event: requireString(options.event, "--event is required"),
    kind,
    phase: requireString(options.phase, "--phase is required for timer-start"),
    notes: options.notes ?? "",
    tokens: options.tokens ?? null,
    started_at: new Date(startedAtEpochMs).toISOString(),
    started_at_epoch_ms: startedAtEpochMs,
    start_monotonic_ns: process.hrtime.bigint().toString(),
    timing_source: "system_timer",
    timing_confidence: "system_timed_manual_boundary"
  };
  await mkdir(benchmarkDir, { recursive: true });
  await writeFile(timerPath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  return { active: true, ...state };
}

export async function stopTimer(options) {
  const runDir = path.resolve(requireString(options.runDir, "--run-dir is required"));
  const timerPath = path.join(runDir, ".benchmark", "timer.json");
  if (!existsSync(timerPath)) {
    throw new Error(`no active timer for ${runDir}`);
  }
  const state = JSON.parse(await readFile(timerPath, "utf8"));
  const endedAtEpochMs = Date.now();
  const endedAt = new Date(endedAtEpochMs).toISOString();
  const durationMs = calculateDurationMs(state, endedAtEpochMs);
  const notes = mergeNotes(state.notes, options.notes);
  const event = {
    at: endedAt,
    event: state.event,
    kind: state.kind,
    phase: state.phase ?? "",
    minutes: roundDurationMinutes(durationMs / 60000),
    tokens: state.tokens ?? null,
    notes,
    timing_source: "system_timer",
    timing_confidence: "system_timed_manual_boundary",
    started_at: state.started_at,
    ended_at: endedAt,
    duration_ms: roundDurationMs(durationMs)
  };
  await appendFile(path.join(runDir, ".benchmark", "events.ndjson"), `${JSON.stringify(event)}\n`, "utf8");
  await rm(timerPath, { force: true });
  return { active: false, event };
}

export async function getTimerStatus(options) {
  const runDir = path.resolve(requireString(options.runDir, "--run-dir is required"));
  const timerPath = path.join(runDir, ".benchmark", "timer.json");
  if (!existsSync(timerPath)) {
    return { active: false, run_dir: runDir };
  }
  const state = JSON.parse(await readFile(timerPath, "utf8"));
  const durationMs = calculateDurationMs(state, Date.now());
  return {
    active: true,
    ...state,
    elapsed_ms: roundDurationMs(durationMs),
    elapsed_minutes: roundDurationMinutes(durationMs / 60000)
  };
}

export async function cancelTimer(options) {
  const runDir = path.resolve(requireString(options.runDir, "--run-dir is required"));
  const timerPath = path.join(runDir, ".benchmark", "timer.json");
  if (!existsSync(timerPath)) {
    return { active: false, run_dir: runDir, cancelled: false };
  }
  const state = JSON.parse(await readFile(timerPath, "utf8"));
  await rm(timerPath, { force: true });
  return { active: false, run_dir: runDir, cancelled: true, timer: state };
}

export async function startObserver(options) {
  const runDir = path.resolve(requireString(options.runDir, "--run-dir is required"));
  const benchmarkDir = path.join(runDir, ".benchmark");
  const intervalMs = Math.max(25, Math.round(options.intervalMs ?? 1000));
  await mkdir(benchmarkDir, { recursive: true });

  const status = await getObserverStatus({ runDir });
  if (status.active) {
    throw new Error(`observer already active for ${runDir}; stop it first`);
  }
  await rm(path.join(benchmarkDir, OBSERVER_STOP_FILE), { force: true });

  const child = spawn(
    process.execPath,
    [fileURLToPath(import.meta.url), "observe-worker", "--run-dir", runDir, "--interval-ms", String(intervalMs)],
    { detached: true, stdio: "ignore" }
  );
  child.unref();

  const startedAtEpochMs = Date.now();
  const state = {
    active: true,
    pid: child.pid,
    run_dir: runDir,
    interval_ms: intervalMs,
    started_at: new Date(startedAtEpochMs).toISOString(),
    started_at_epoch_ms: startedAtEpochMs,
    data_source: "observer_measured"
  };
  await writeObserverState(runDir, state);
  return state;
}

export async function stopObserver(options) {
  const runDir = path.resolve(requireString(options.runDir, "--run-dir is required"));
  const status = await getObserverStatus({ runDir });
  if (!status.active) {
    return { ...status, stopped: false };
  }
  await writeFile(
    path.join(runDir, ".benchmark", OBSERVER_STOP_FILE),
    `${JSON.stringify({ requested_at: new Date().toISOString() }, null, 2)}\n`,
    "utf8"
  );

  for (let attempt = 0; attempt < 80; attempt += 1) {
    await sleep(100);
    const nextStatus = await getObserverStatus({ runDir });
    if (!nextStatus.active) {
      return { ...nextStatus, stopped: true };
    }
  }
  throw new Error(`observer did not stop within timeout for ${runDir}`);
}

export async function getObserverStatus(options) {
  const runDir = path.resolve(requireString(options.runDir, "--run-dir is required"));
  const statePath = path.join(runDir, ".benchmark", OBSERVER_STATE_FILE);
  if (!existsSync(statePath)) {
    return { active: false, run_dir: runDir };
  }
  const state = JSON.parse(await readFile(statePath, "utf8"));
  const active = Boolean(state.active && isProcessAlive(state.pid));
  const observations = await readObservations(runDir);
  const summary = buildObserverSummary(observations);
  return {
    ...state,
    active,
    stale: Boolean(state.active && !active),
    observation_count: observations.length,
    observed_total_delivery_minutes: summary.observed_total_delivery_minutes,
    file_activity_summary: summary.file_activity_summary
  };
}

export async function runQualityProbe(options) {
  const scenario = await loadScenario(options.scenario);
  const runDir = path.resolve(requireString(options.runDir, "--run-dir is required"));
  const report = await executeQualityProbe(scenario, runDir, options.stage ?? "final");
  const outPath = path.resolve(options.out ?? path.join(runDir, ".benchmark", QUALITY_PROBE_FILE));
  await writeJsonFile(outPath, report);
  return report;
}

export async function scoreRecoveryAnswer(options) {
  const scenario = await loadScenario(options.scenario);
  const runDir = path.resolve(requireString(options.runDir, "--run-dir is required"));
  const answerPath = path.resolve(requireString(options.answer, "--answer is required"));
  const answerText = await readFile(answerPath, "utf8");
  const answerKey = await readRecoveryAnswerKey(scenario);
  const report = evaluateRecoveryAnswer(answerKey, answerText, runDir);
  const outPath = path.resolve(options.out ?? path.join(runDir, ".benchmark", RECOVERY_SCORE_FILE));
  await writeJsonFile(outPath, report);
  return report;
}

export async function recordIntervention(options) {
  const runDir = path.resolve(requireString(options.runDir, "--run-dir is required"));
  const severity = requireString(options.severity, "--severity is required");
  if (!VALID_INTERVENTION_SEVERITIES.has(severity)) {
    throw new Error(`--severity must be one of: ${Array.from(VALID_INTERVENTION_SEVERITIES).join(", ")}`);
  }
  const promptPath = path.resolve(requireString(options.promptFile, "--prompt-file is required"));
  const promptText = await readFile(promptPath, "utf8");
  const promptLedgerRecord = buildPromptLedgerRecord(promptText, {
    stage: requireString(options.stage, "--stage is required"),
    promptKind: "operator_intervention",
    reason: requireString(options.reason, "--reason is required"),
    notes: options.notes ?? "",
    severity,
    dataSource: "operator_recorded_prompt"
  });
  const record = {
    at: new Date().toISOString(),
    stage: promptLedgerRecord.stage,
    severity,
    reason: promptLedgerRecord.reason,
    prompt_chars: countPromptChars(promptText),
    prompt_words: countPromptWords(promptText),
    prompt_sha256: createHash("sha256").update(promptText).digest("hex"),
    prompt_ledger_id: promptLedgerRecord.prompt_id,
    notes: options.notes ?? "",
    data_source: "operator_recorded"
  };
  await appendBenchmarkNdjson(runDir, INTERVENTIONS_FILE, record);
  await appendBenchmarkNdjson(runDir, PROMPT_LEDGER_FILE, promptLedgerRecord);
  return record;
}

export async function recordGateFinding(options) {
  const runDir = path.resolve(requireString(options.runDir, "--run-dir is required"));
  const gateType = requireString(options.gateType, "--gate-type is required");
  if (!VALID_GATE_TYPES.has(gateType)) {
    throw new Error(`--gate-type must be product or workflow`);
  }
  const record = {
    at: new Date().toISOString(),
    gate_event: requireString(options.event, "--event is required"),
    stage: requireString(options.stage, "--stage is required"),
    gate_type: gateType,
    defects_caught: options.defectsCaught ?? 0,
    defect_ids: parseCsv(options.defectIds),
    would_escape_without_gate: options.wouldEscape ?? null,
    notes: options.notes ?? "",
    data_source: "operator_recorded"
  };
  await appendBenchmarkNdjson(runDir, GATE_FINDINGS_FILE, record);
  return record;
}

export async function scoreRun(options) {
  const mode = requireMode(options.mode);
  const scenario = await loadScenario(options.scenario);
  const runDir = path.resolve(requireString(options.runDir, "--run-dir is required"));
  const files = await collectFiles(runDir);
  const events = await readEvents(runDir);
  const observations = await readObservations(runDir);
  const qualityProbe = await readJsonReport(path.join(runDir, ".benchmark", QUALITY_PROBE_FILE));
  const firstPassQualityProbe = await readJsonReport(path.join(runDir, ".benchmark", FIRST_PASS_QUALITY_PROBE_FILE));
  const recoveryScore = await readJsonReport(path.join(runDir, ".benchmark", RECOVERY_SCORE_FILE));
  const interventions = await readInterventions(runDir);
  const gateFindings = await readGateFindings(runDir);
  const promptLedger = await readPromptLedger(runDir);
  const artifactInventory = await buildArtifactInventory(runDir);
  const sections = {};
  for (const [sectionName, checks] of Object.entries(scenario.rubric.sections ?? {})) {
    sections[sectionName] = evaluateChecks(checks, files);
  }
  const costs = buildCostSummary(events, options, observations);
  const staticSummary = summarizeSections(sections);
  const qualityAssessment = buildQualityAssessment(staticSummary, qualityProbe);
  const summary = qualityAssessment.primary_summary;
  const outcome = calculateOutcome(costs, options);
  const gateValue = buildGateValue(gateFindings, interventions, firstPassQualityProbe ?? qualityProbe);
  const workflowDiagnostics = buildWorkflowDiagnostics({
    workflowOverheadRatio: options.workflowOverheadRatio ?? outcome.workflow_overhead_ratio,
    workflowArtifactCount: options.workflowArtifactCount ?? defaultWorkflowArtifactCount(artifactInventory),
    totalArtifactCount: options.totalArtifactCount ?? artifactInventory.total.files,
    productDefectCount: options.productDefectCount ?? gateValue.product_gate_defects_caught,
    hygieneIssueCount: options.hygieneIssueCount ?? gateValue.workflow_gate_defects_caught,
    acProgressVisibleCount: options.acProgressVisibleCount,
    acProgressTotal: options.acProgressTotal
  });
  const report = {
    scenario_id: scenario.id,
    mode,
    scored_at: new Date().toISOString(),
    run_dir: runDir,
    summary,
    quality_assessment: qualityAssessment,
    workflow_cost: costs,
    lifecycle: buildLifecycleSummary(events, options, summary, recoveryScore),
    automation_burden: buildAutomationBurden(interventions, promptLedger),
    gate_value: gateValue,
    artifact_inventory: artifactInventory,
    workflow_diagnostics: workflowDiagnostics,
    outcome,
    metric_confidence: buildMetricConfidence(
      costs,
      qualityProbe,
      recoveryScore,
      options,
      interventions,
      gateFindings,
      promptLedger,
      workflowDiagnostics
    ),
    sections
  };
  return report;
}

export async function checkEvidence(options) {
  const baselinePath = path.resolve(requireString(options.baselineReport, "--baseline-report is required"));
  const harnessPath = path.resolve(requireString(options.harnessReport, "--harness-report is required"));
  const baselineReport = JSON.parse(await readFile(baselinePath, "utf8"));
  const harnessReport = JSON.parse(await readFile(harnessPath, "utf8"));
  return buildEvidenceCheck(baselineReport, harnessReport, {
    protocolStatus: options.protocolStatus ?? "unreviewed"
  });
}

export function buildEvidenceCheck(baselineReport, harnessReport, options = {}) {
  const protocolStatus = options.protocolStatus ?? "unreviewed";
  const baselineHidden = hiddenQualitySummary(baselineReport);
  const harnessHidden = hiddenQualitySummary(harnessReport);
  const baselineElapsed = baselineReport.workflow_cost?.observed_total_delivery_minutes ?? null;
  const harnessElapsed = harnessReport.workflow_cost?.observed_total_delivery_minutes ?? null;
  const baselineCostBoundary = costBoundaryEvidence(baselineReport);
  const harnessCostBoundary = costBoundaryEvidence(harnessReport);
  const elapsedDelta =
    Number.isFinite(baselineElapsed) && Number.isFinite(harnessElapsed) ? roundDurationMinutes(harnessElapsed - baselineElapsed) : null;
  const elapsedRatio =
    Number.isFinite(baselineElapsed) && baselineElapsed > 0 && Number.isFinite(harnessElapsed)
      ? roundDurationMinutes(harnessElapsed / baselineElapsed)
      : null;
  const checks = {
    same_scenario: evidenceCheckItem(
      baselineReport.scenario_id === harnessReport.scenario_id,
      "Both reports must use the same scenario id.",
      `${baselineReport.scenario_id ?? "unknown"} vs ${harnessReport.scenario_id ?? "unknown"}`
    ),
    expected_modes: evidenceCheckItem(
      baselineReport.mode === "baseline" && harnessReport.mode === "harness",
      "Reports must compare baseline mode against harness mode.",
      `${baselineReport.mode ?? "unknown"} vs ${harnessReport.mode ?? "unknown"}`
    ),
    protocol_status: evidenceCheckItem(
      protocolStatus === "formal",
      "Operator must mark the run pair formal after checking fresh sessions, staged injection, no cross-path copying and observer coverage.",
      protocolStatus
    ),
    same_hidden_quality: evidenceCheckItem(
      Boolean(
        baselineHidden.available &&
          harnessHidden.available &&
          baselineHidden.decision === "PASS" &&
          harnessHidden.decision === "PASS" &&
          baselineHidden.passed === harnessHidden.passed &&
          baselineHidden.total === harnessHidden.total
      ),
      "Both paths must pass the same hidden quality probe before elapsed-time comparison is conclusion-grade.",
      `${formatScore(baselineHidden.passed, baselineHidden.total)} ${baselineHidden.decision} vs ${formatScore(harnessHidden.passed, harnessHidden.total)} ${harnessHidden.decision}`
    ),
    observer_elapsed: evidenceCheckItem(
      isMetricConclusionEligible(baselineReport, "elapsed_time") &&
        isMetricConclusionEligible(harnessReport, "elapsed_time") &&
        Number.isFinite(baselineElapsed) &&
        Number.isFinite(harnessElapsed),
      "Both paths need observer-measured elapsed time with high confidence.",
      `${formatValue(baselineElapsed)} vs ${formatValue(harnessElapsed)}`
    ),
    cost_boundary: evidenceCheckItem(
      baselineReport.workflow_cost?.run_type &&
        harnessReport.workflow_cost?.run_type &&
        baselineReport.workflow_cost.run_type === harnessReport.workflow_cost.run_type &&
        baselineReport.workflow_cost.run_type !== "unknown" &&
        !baselineCostBoundary.warm_bootstrap_observed &&
        !harnessCostBoundary.warm_bootstrap_observed,
      "Both reports must declare the same non-unknown cold/warm run type, and warm runs must not include observed Harness bootstrap/scaffold creation.",
      `${baselineReport.workflow_cost?.run_type ?? "unknown"} vs ${harnessReport.workflow_cost?.run_type ?? "unknown"}; warm bootstrap observed baseline=${baselineCostBoundary.warm_bootstrap_observed} harness=${harnessCostBoundary.warm_bootstrap_observed}`
    ),
    artifact_inventory: evidenceCheckItem(
      Boolean(baselineReport.artifact_inventory && harnessReport.artifact_inventory),
      "Artifact inventory is high-confidence diagnostic evidence for output volume, not value proof.",
      `${Boolean(baselineReport.artifact_inventory)} vs ${Boolean(harnessReport.artifact_inventory)}`
    )
  };
  const elapsedComparisonEligible = [
    checks.same_scenario,
    checks.expected_modes,
    checks.protocol_status,
    checks.same_hidden_quality,
    checks.observer_elapsed,
    checks.cost_boundary
  ].every((item) => item.passed);
  const conclusion = buildEvidenceConclusion(elapsedComparisonEligible, elapsedDelta, elapsedRatio);
  const missingForDesignPurpose = buildMissingDesignPurposeEvidence(baselineReport, harnessReport);
  return {
    scenario_id: baselineReport.scenario_id ?? harnessReport.scenario_id ?? null,
    checked_at: new Date().toISOString(),
    protocol_status: protocolStatus,
    elapsed_comparison: {
      conclusion_eligible: elapsedComparisonEligible,
      baseline_minutes: baselineElapsed,
      harness_minutes: harnessElapsed,
      delta_minutes: elapsedDelta,
      ratio: elapsedRatio
    },
    checks,
    allowed_conclusions: conclusion.allowed_conclusions,
    design_purpose_status: conclusion.design_purpose_status,
    missing_for_design_purpose: missingForDesignPurpose,
    diagnostic: {
      context_recovery: compareDiagnosticMetric(baselineReport, harnessReport, "context_recovery"),
      gate_value: compareDiagnosticMetric(baselineReport, harnessReport, "gate_value"),
      human_intervention: compareDiagnosticMetric(baselineReport, harnessReport, "human_intervention"),
      workflow_diagnostics: compareDiagnosticMetric(baselineReport, harnessReport, "workflow_diagnostics"),
      prompt_ledger: comparePromptLedger(baselineReport, harnessReport),
      artifact_inventory: compareArtifactInventory(baselineReport, harnessReport)
    }
  };
}

export function renderMarkdownReport(report) {
  const lines = [
    `# Delivery Benchmark Report: ${report.scenario_id} (${report.mode})`,
    "",
    `- Decision: ${report.summary.decision}`,
    `- Total score: ${report.summary.passed}/${report.summary.total}`,
    `- Workflow control minutes: ${formatValue(report.workflow_cost.workflow_control_minutes)}`,
    `- Total delivery minutes: ${formatValue(report.workflow_cost.total_delivery_minutes)}`,
    `- Observed total delivery minutes: ${formatValue(report.workflow_cost.observed_total_delivery_minutes)}`,
    `- Run type: ${report.workflow_cost.run_type}`,
    `- Bootstrap minutes: ${formatValue(report.workflow_cost.bootstrap_minutes)}`,
    `- Lifecycle total minutes: ${formatValue(report.lifecycle?.total_lifecycle_minutes)}`,
    `- Context recovery score: ${formatScore(report.lifecycle?.context_recovery_score, report.lifecycle?.context_recovery_total)}`,
    `- Wrong-path count: ${formatValue(report.lifecycle?.wrong_path_count)}`,
    `- Cost data source: ${report.workflow_cost.cost_data_source}`,
    `- Net value minutes: ${formatValue(report.outcome.net_value_minutes)}`,
    `- Quality confidence: ${report.quality_assessment?.confidence ?? "low"}`,
    `- Context recovery confidence: ${report.lifecycle?.recovery_score_confidence ?? "unavailable"}`,
    "",
    "## Section Summary",
    "",
    "| Section | Passed | Total | Result |",
    "|---|---:|---:|---|"
  ];
  for (const [sectionName, section] of Object.entries(report.sections)) {
    lines.push(`| ${sectionName} | ${section.passed} | ${section.total} | ${section.passed === section.total ? "PASS" : "WARN"} |`);
  }
  lines.push(
    "",
    report.quality_assessment?.primary_source === "hidden_quality_probe"
      ? "## Supplemental Static Failed Checks"
      : "## Failed Checks",
    ""
  );
  const failed = Object.entries(report.sections).flatMap(([sectionName, section]) =>
    section.checks.filter((check) => !check.passed).map((check) => ({ sectionName, check }))
  );
  if (failed.length === 0) {
    lines.push("- None");
  } else {
    for (const item of failed) {
      lines.push(`- ${item.sectionName}/${item.check.id}: ${item.check.label}`);
    }
  }
  lines.push("", "## Outcome", "");
  lines.push(`- workflow_overhead_ratio: ${formatValue(report.outcome.workflow_overhead_ratio)}`);
  lines.push(`- vibe_handoff_delta_minutes: ${formatValue(report.outcome.vibe_handoff_delta_minutes)}`);
  lines.push(`- net_value_minutes: ${formatValue(report.outcome.net_value_minutes)}`);
  lines.push(`- comparison_confidence: ${report.outcome.comparison_confidence}`);
  if (report.workflow_diagnostics) {
    lines.push("", "## Workflow Diagnostics", "");
    lines.push(`- conclusion_eligible: ${report.workflow_diagnostics.conclusion_eligible ? "yes" : "no"}`);
    lines.push(`- workflow_overhead_ratio: ${formatValue(report.workflow_diagnostics.workflow_overhead_ratio)}`);
    lines.push(`- workflow_artifact_count: ${formatValue(report.workflow_diagnostics.workflow_artifact_count)}`);
    lines.push(`- total_artifact_count: ${formatValue(report.workflow_diagnostics.total_artifact_count)}`);
    lines.push(`- workflow_artifact_ratio: ${formatValue(report.workflow_diagnostics.workflow_artifact_ratio)}`);
    lines.push(`- gate_true_product_defect_count: ${formatValue(report.workflow_diagnostics.gate_true_product_defect_count)}`);
    lines.push(`- gate_hygiene_issue_count: ${formatValue(report.workflow_diagnostics.gate_hygiene_issue_count)}`);
    lines.push(`- ac_progress_visible_count: ${formatValue(report.workflow_diagnostics.ac_progress_visibility.visible_count)}`);
    lines.push(`- ac_progress_total: ${formatValue(report.workflow_diagnostics.ac_progress_visibility.total_count)}`);
    lines.push(`- ac_progress_visibility_ratio: ${formatValue(report.workflow_diagnostics.ac_progress_visibility.ratio)}`);
  }
  if (report.quality_assessment) {
    lines.push("", "## Quality Assessment Confidence", "");
    lines.push(`- primary_source: ${report.quality_assessment.primary_source}`);
    lines.push(`- confidence: ${report.quality_assessment.confidence}`);
    lines.push(`- hidden_quality_probe: ${report.quality_assessment.hidden_probe?.available ? "available" : "unavailable"}`);
    if (report.quality_assessment.hidden_probe?.available) {
      lines.push(
        `- hidden_quality_probe_score: ${formatScore(report.quality_assessment.hidden_probe.passed, report.quality_assessment.hidden_probe.total)}`
      );
    }
    lines.push(
      `- static_rubric_score: ${formatScore(report.quality_assessment.static_rubric.passed, report.quality_assessment.static_rubric.total)}`
    );
  }
  if (report.artifact_inventory) {
    lines.push("", "## Artifact Inventory", "");
    lines.push(`- data_source: ${report.artifact_inventory.data_source}`);
    lines.push(`- confidence: ${report.artifact_inventory.confidence}`);
    lines.push(`- conclusion_eligible: ${report.artifact_inventory.conclusion_eligible ? "yes" : "no"}`);
    lines.push(`- total_files: ${report.artifact_inventory.total.files}`);
    lines.push(`- total_lines: ${report.artifact_inventory.total.lines}`);
    lines.push(`- total_bytes: ${report.artifact_inventory.total.bytes}`);
    lines.push("", "| Category | Files | Lines | Bytes |");
    lines.push("|---|---:|---:|---:|");
    for (const category of Object.values(report.artifact_inventory.categories)) {
      lines.push(`| ${category.label} | ${category.files} | ${category.lines} | ${category.bytes} |`);
    }
    if (report.artifact_inventory.top_files.length > 0) {
      lines.push("", "| Top File | Category | Lines | Bytes |");
      lines.push("|---|---|---:|---:|");
      for (const file of report.artifact_inventory.top_files) {
        lines.push(`| ${file.path} | ${file.category} | ${file.lines} | ${file.bytes} |`);
      }
    }
  }
  if (report.metric_confidence) {
    lines.push("", "## Metric Confidence", "");
    lines.push("| Metric | Confidence | Data Source | Conclusion Eligible | Explanation |");
    lines.push("|---|---|---|---|---|");
    for (const [metricId, metric] of Object.entries(report.metric_confidence)) {
      lines.push(
        `| ${metricId} | ${metric.level} | ${metric.data_source} | ${metric.conclusion_eligible ? "yes" : "no"} | ${metric.explanation} |`
      );
    }
  }
  if (report.automation_burden) {
    lines.push("", "## Automation Burden", "");
    lines.push(`- data_source: ${report.automation_burden.data_source}`);
    lines.push(`- intervention_count: ${report.automation_burden.intervention_count}`);
    lines.push(`- operator_prompt_chars: ${report.automation_burden.operator_prompt_chars}`);
    lines.push(`- operator_prompt_words: ${report.automation_burden.operator_prompt_words}`);
    lines.push(`- protocol_prompt_chars: ${report.automation_burden.protocol_prompt_chars}`);
    lines.push(`- prompt_ledger_confidence: ${report.automation_burden.prompt_ledger.confidence}`);
    lines.push(`- repair_loop_count: ${report.automation_burden.repair_loop_count}`);
    if (report.automation_burden.prompt_ledger.records.length > 0) {
      lines.push("", "### Prompt Ledger", "");
      lines.push(`- prompt_count: ${report.automation_burden.prompt_ledger.prompt_count}`);
      lines.push(`- protocol_prompt_count: ${report.automation_burden.prompt_ledger.protocol_prompt_count}`);
      lines.push(`- intervention_prompt_count: ${report.automation_burden.prompt_ledger.intervention_prompt_count}`);
      lines.push(`- operator_note_prompt_count: ${report.automation_burden.prompt_ledger.operator_note_prompt_count}`);
      lines.push("", "| Prompt Kind | Count | Prompt Chars |");
      lines.push("|---|---:|---:|");
      for (const [promptKind, item] of Object.entries(report.automation_burden.prompt_ledger.by_kind)) {
        lines.push(`| ${promptKind} | ${item.count} | ${item.prompt_chars} |`);
      }
    }
    if (Object.keys(report.automation_burden.by_severity).length > 0) {
      lines.push("", "| Severity | Count | Prompt Chars |");
      lines.push("|---|---:|---:|");
      for (const [severity, item] of Object.entries(report.automation_burden.by_severity)) {
        lines.push(`| ${severity} | ${item.count} | ${item.prompt_chars} |`);
      }
    }
  }
  if (report.gate_value) {
    lines.push("", "## Gate Value", "");
    lines.push(`- data_source: ${report.gate_value.data_source}`);
    lines.push(`- defects_caught: ${report.gate_value.defects_caught}`);
    lines.push(`- workflow_gate_defects_caught: ${report.gate_value.workflow_gate_defects_caught}`);
    lines.push(`- product_gate_defects_caught: ${report.gate_value.product_gate_defects_caught}`);
    lines.push(`- first_pass_quality_score: ${formatScore(report.gate_value.first_pass_quality_score?.passed, report.gate_value.first_pass_quality_score?.total)}`);
    lines.push(`- escaped_defect_count: ${formatValue(report.gate_value.escaped_defect_count)}`);
    lines.push(`- repair_loop_count: ${report.gate_value.repair_loop_count}`);
  }
  if (report.lifecycle?.has_lifecycle_data) {
    lines.push("", "## Lifecycle Efficiency", "");
    lines.push(`- initial_delivery_minutes: ${formatValue(report.lifecycle.initial_delivery_minutes)}`);
    lines.push(`- recovery_orientation_minutes: ${formatValue(report.lifecycle.recovery_orientation_minutes)}`);
    lines.push(`- rfc_fix_minutes: ${formatValue(report.lifecycle.rfc_fix_minutes)}`);
    lines.push(`- debug_fix_minutes: ${formatValue(report.lifecycle.debug_fix_minutes)}`);
    lines.push(`- total_lifecycle_minutes: ${formatValue(report.lifecycle.total_lifecycle_minutes)}`);
    lines.push(`- context_recovery_score: ${formatScore(report.lifecycle.context_recovery_score, report.lifecycle.context_recovery_total)}`);
    lines.push(`- context_recovery_source: ${report.lifecycle.recovery_score_source}`);
    lines.push(`- context_recovery_confidence: ${report.lifecycle.recovery_score_confidence}`);
    lines.push(`- wrong_path_count: ${formatValue(report.lifecycle.wrong_path_count)}`);
    lines.push(`- final_quality_score: ${formatScore(report.lifecycle.final_quality_score.passed, report.lifecycle.final_quality_score.total)}`);
  }
  if (report.workflow_cost.gate_breakdown?.has_gate_data) {
    lines.push("", "## Gate Cost Breakdown", "");
    lines.push(`- total_gate_minutes: ${formatValue(report.workflow_cost.gate_breakdown.total_gate_minutes)}`);
    lines.push(`- workflow_gate_minutes: ${formatValue(report.workflow_cost.gate_breakdown.workflow_gate_minutes)}`);
    lines.push(`- product_gate_minutes: ${formatValue(report.workflow_cost.gate_breakdown.product_gate_minutes)}`);
    lines.push("", "| Event | Kind | Count | Minutes |");
    lines.push("|---|---|---:|---:|");
    for (const item of report.workflow_cost.gate_breakdown.by_event) {
      lines.push(`| ${item.event} | ${item.kind} | ${item.count} | ${formatValue(item.minutes)} |`);
    }
  }
  return `${lines.join("\n")}\n`;
}

async function executeQualityProbe(scenario, runDir, stage = "final") {
  if (!scenario.qualityProbePath) {
    return {
      scenario_id: scenario.id,
      stage,
      run_dir: runDir,
      available: false,
      confidence: "unavailable",
      data_source: "unavailable",
      passed: 0,
      total: 0,
      decision: "UNAVAILABLE",
      checks: []
    };
  }
  const result = spawnSync(process.execPath, [scenario.qualityProbePath, runDir], {
    cwd: runDir,
    env: { ...process.env, BENCHMARK_PROBE_STAGE: stage },
    encoding: "utf8",
    timeout: 30000
  });
  if (result.status !== 0) {
    return {
      scenario_id: scenario.id,
      stage,
      run_dir: runDir,
      available: true,
      confidence: "high",
      data_source: "hidden_quality_probe",
      passed: 0,
      total: 1,
      decision: "WARN",
      checks: [
        {
          id: "QUALITY-PROBE-RUNTIME",
          label: "Hidden quality probe runtime",
          passed: false,
          detail: result.stderr || result.stdout || `probe exited with ${result.status}`
        }
      ]
    };
  }
  const parsed = JSON.parse(result.stdout);
  const checks = parsed.checks ?? [];
  const passed = checks.filter((check) => check.passed).length;
  return {
    scenario_id: scenario.id,
    stage: parsed.stage ?? stage,
    run_dir: runDir,
    available: true,
    confidence: parsed.confidence ?? "high",
    data_source: "hidden_quality_probe",
    passed,
    total: checks.length,
    decision: checks.length > 0 && passed === checks.length ? "PASS" : "WARN",
    checks
  };
}

async function readRecoveryAnswerKey(scenario) {
  if (!scenario.recoveryAnswerKeyPath) {
    throw new Error(`scenario ${scenario.id} does not define recovery_answer_key.json`);
  }
  return JSON.parse(await readFile(scenario.recoveryAnswerKeyPath, "utf8"));
}

function evaluateRecoveryAnswer(answerKey, answerText, runDir) {
  const normalizedAnswer = answerText.toLowerCase();
  const items = (answerKey.items ?? []).map((item) => {
    const requiredTermGroups = item.required_term_groups ?? (item.required_terms ?? []).map((term) => [term]);
    const requiredReferenceGroups = item.required_reference_groups ?? (item.required_references ?? []).map((reference) => [reference]);
    const missing_terms = requiredTermGroups
      .filter((group) => !group.some((term) => normalizedAnswer.includes(String(term).toLowerCase())))
      .map((group) => group.join(" OR "));
    const missing_references = requiredReferenceGroups
      .filter((group) => !group.some((reference) => answerMentionsReference(answerText, runDir, reference)))
      .map((group) => group.join(" OR "));
    const passed = missing_terms.length === 0 && missing_references.length === 0;
    return {
      id: item.id,
      label: item.label,
      points: item.points ?? 1,
      passed,
      missing_terms,
      missing_references
    };
  });
  const total = items.reduce((sum, item) => sum + item.points, 0);
  const passed = items.filter((item) => item.passed).reduce((sum, item) => sum + item.points, 0);
  return {
    data_source: "hidden_answer_key_with_file_references",
    confidence: passed === total && total > 0 ? "medium-high" : "medium",
    passed,
    total,
    decision: total > 0 && passed === total ? "PASS" : "WARN",
    items
  };
}

function answerMentionsReference(answerText, runDir, reference) {
  const normalizedReference = String(reference).split(path.sep).join("/");
  const candidates = new Set([
    normalizedReference,
    `./${normalizedReference}`,
    path.join(runDir, normalizedReference).split(path.sep).join("/")
  ]);
  return Array.from(candidates).some((candidate) => answerText.includes(candidate));
}

function buildQualityAssessment(staticSummary, qualityProbe) {
  const hiddenProbeAvailable = Boolean(qualityProbe?.available);
  const primarySummary = hiddenProbeAvailable
    ? {
        passed: qualityProbe.passed,
        total: qualityProbe.total,
        decision: qualityProbe.decision
      }
    : staticSummary;
  return {
    primary_source: hiddenProbeAvailable ? "hidden_quality_probe" : "static_keyword_rubric",
    confidence: hiddenProbeAvailable ? "high" : "low",
    primary_summary: primarySummary,
    static_rubric: {
      data_source: "static_keyword_path_rubric",
      confidence: "low",
      passed: staticSummary.passed,
      total: staticSummary.total,
      decision: staticSummary.decision
    },
    hidden_probe: qualityProbe ?? {
      available: false,
      confidence: "unavailable",
      data_source: "unavailable",
      passed: 0,
      total: 0,
      decision: "UNAVAILABLE",
      checks: []
    }
  };
}

function buildMetricConfidence(
  costs,
  qualityProbe,
  recoveryScore,
  options,
  interventions = [],
  gateFindings = [],
  promptLedger = [],
  workflowDiagnostics = null
) {
  const elapsedLevel = confidenceForCostSource(costs.cost_data_source);
  const qualityLevel = qualityProbe?.available ? "high" : "low";
  const recoveryLevel = recoveryScore ? recoveryScore.confidence : options.contextRecoveryScore !== undefined ? "medium" : "unavailable";
  const gateValueLevel = gateFindings.length > 0 ? "medium" : "unavailable";
  const humanInterventionLevel = interventions.length > 0 ? "medium" : "unavailable";
  const promptLedgerLevel = promptLedger.length > 0 ? "high" : "unavailable";
  return {
    elapsed_time: {
      level: elapsedLevel,
      data_source: costs.cost_data_source,
      conclusion_eligible: isConclusionEligible(elapsedLevel),
      explanation:
        costs.cost_data_source === "observer_measured"
          ? "External observer measured elapsed time outside the agent prompt."
          : "Elapsed time is not fully observer-measured."
    },
    quality_score: {
      level: qualityLevel,
      data_source: qualityProbe?.available ? "hidden_quality_probe" : "static_keyword_path_rubric",
      conclusion_eligible: isConclusionEligible(qualityLevel),
      explanation: qualityProbe?.available
        ? "Scenario-owned hidden probe ran after delivery and was not included in the prompt."
        : "Current score is based on static keyword/path evidence and should be treated as supplemental."
    },
    context_recovery: {
      level: recoveryLevel,
      data_source: recoveryScore ? recoveryScore.data_source : options.contextRecoveryScore !== undefined ? "operator_recorded" : "unavailable",
      conclusion_eligible: isConclusionEligible(recoveryLevel),
      explanation: recoveryScore
        ? "Recovery answer was scored against a hidden answer key and required file references."
        : "Recovery score is unavailable or operator-recorded without hidden answer-key verification."
    },
    gate_value: {
      level: gateValueLevel,
      data_source: gateFindings.length > 0 ? "operator_recorded" : "unavailable",
      conclusion_eligible: isConclusionEligible(gateValueLevel),
      explanation:
        gateFindings.length > 0
          ? "Gate findings were recorded by the benchmark operator after gate execution."
          : "Gate value requires first-pass quality, gate finding, escaped defect and repair-loop records."
    },
    human_intervention: {
      level: humanInterventionLevel,
      data_source: interventions.length > 0 ? "operator_recorded" : "unavailable",
      conclusion_eligible: isConclusionEligible(humanInterventionLevel),
      explanation:
        interventions.length > 0
          ? "Only out-of-protocol operator prompts recorded with intervention-record are counted."
          : "No operator interventions were recorded; initial and staged benchmark prompts are not counted."
    },
    prompt_ledger: {
      level: promptLedgerLevel,
      data_source: promptLedger.length > 0 ? "runner_prompt_ledger" : "unavailable",
      conclusion_eligible: isConclusionEligible(promptLedgerLevel),
      explanation:
        promptLedger.length > 0
          ? "Runner recorded hashes and character counts for saved benchmark protocol prompts and recorded operator prompts."
          : "Prompt ledger is unavailable; prompt burden can only be inferred from intervention records."
    },
    workflow_diagnostics: {
      level: workflowDiagnostics ? "diagnostic" : "unavailable",
      data_source: workflowDiagnostics ? workflowDiagnostics.data_source : "unavailable",
      conclusion_eligible: false,
      explanation:
        "Workflow overhead ratio, artifact counts, gate true-defect versus hygiene counts and AC progress visibility are diagnostic only."
    }
  };
}

function isConclusionEligible(level) {
  return level === "high";
}

function buildAutomationBurden(interventions, promptLedger = []) {
  const byStage = {};
  const bySeverity = {};
  let promptChars = 0;
  let promptWords = 0;
  for (const intervention of interventions) {
    promptChars += intervention.prompt_chars ?? 0;
    promptWords += intervention.prompt_words ?? 0;
    incrementAutomationBucket(byStage, intervention.stage || "unspecified", intervention);
    incrementAutomationBucket(bySeverity, intervention.severity || "unspecified", intervention);
  }
  const promptLedgerSummary = buildPromptLedgerSummary(promptLedger);
  return {
    data_source:
      interventions.length > 0 && promptLedger.length > 0
        ? "operator_recorded_and_runner_prompt_ledger"
        : interventions.length > 0
          ? "operator_recorded"
          : promptLedger.length > 0
            ? "runner_prompt_ledger"
            : "unavailable",
    intervention_count: interventions.length,
    operator_prompt_chars: promptChars,
    operator_prompt_words: promptWords,
    protocol_prompt_chars: promptLedgerSummary.protocol_prompt_chars,
    protocol_prompt_words: promptLedgerSummary.protocol_prompt_words,
    intervention_prompt_chars: promptLedgerSummary.intervention_prompt_chars,
    intervention_prompt_words: promptLedgerSummary.intervention_prompt_words,
    repair_loop_count: interventions.filter((intervention) => intervention.severity === "rework").length,
    by_stage: byStage,
    by_severity: bySeverity,
    prompt_ledger: promptLedgerSummary,
    interventions
  };
}

function buildPromptLedgerSummary(records = []) {
  const byKind = {};
  let protocolPromptChars = 0;
  let protocolPromptWords = 0;
  let interventionPromptChars = 0;
  let interventionPromptWords = 0;
  let operatorNotePromptChars = 0;
  let operatorNotePromptWords = 0;
  for (const record of records) {
    const promptKind = record.prompt_kind ?? "unknown";
    const item = byKind[promptKind] ?? { count: 0, prompt_chars: 0, prompt_words: 0 };
    item.count += 1;
    item.prompt_chars += record.prompt_chars ?? 0;
    item.prompt_words += record.prompt_words ?? 0;
    byKind[promptKind] = item;
    if (record.counts_as_protocol) {
      protocolPromptChars += record.prompt_chars ?? 0;
      protocolPromptWords += record.prompt_words ?? 0;
    }
    if (record.counts_as_intervention) {
      interventionPromptChars += record.prompt_chars ?? 0;
      interventionPromptWords += record.prompt_words ?? 0;
    }
    if (promptKind === "operator_note") {
      operatorNotePromptChars += record.prompt_chars ?? 0;
      operatorNotePromptWords += record.prompt_words ?? 0;
    }
  }
  return {
    data_source: records.length > 0 ? "runner_prompt_ledger" : "unavailable",
    confidence: records.length > 0 ? "high_for_recorded_prompt_text" : "unavailable",
    prompt_count: records.length,
    protocol_prompt_count: records.filter((record) => record.counts_as_protocol).length,
    intervention_prompt_count: records.filter((record) => record.counts_as_intervention).length,
    operator_note_prompt_count: records.filter((record) => record.prompt_kind === "operator_note").length,
    protocol_prompt_chars: protocolPromptChars,
    protocol_prompt_words: protocolPromptWords,
    intervention_prompt_chars: interventionPromptChars,
    intervention_prompt_words: interventionPromptWords,
    operator_note_prompt_chars: operatorNotePromptChars,
    operator_note_prompt_words: operatorNotePromptWords,
    by_kind: byKind,
    records
  };
}

function incrementAutomationBucket(summary, key, intervention) {
  const item = summary[key] ?? { count: 0, prompt_chars: 0, prompt_words: 0 };
  item.count += 1;
  item.prompt_chars += intervention.prompt_chars ?? 0;
  item.prompt_words += intervention.prompt_words ?? 0;
  summary[key] = item;
}

function buildGateValue(gateFindings, interventions, qualityProbe) {
  const defectsCaught = gateFindings.reduce((sum, finding) => sum + (finding.defects_caught ?? 0), 0);
  const workflowGateDefectsCaught = gateFindings
    .filter((finding) => finding.gate_type === "workflow")
    .reduce((sum, finding) => sum + (finding.defects_caught ?? 0), 0);
  const productGateDefectsCaught = gateFindings
    .filter((finding) => finding.gate_type === "product")
    .reduce((sum, finding) => sum + (finding.defects_caught ?? 0), 0);
  const wouldEscapeDefectCount = gateFindings
    .filter((finding) => finding.would_escape_without_gate === true)
    .reduce((sum, finding) => sum + (finding.defects_caught ?? 0), 0);
  const firstPassQualityScore = qualityProbe?.available
    ? {
        passed: qualityProbe.passed,
        total: qualityProbe.total,
        decision: qualityProbe.decision,
        data_source: qualityProbe.data_source,
        confidence: qualityProbe.confidence
      }
    : null;
  return {
    data_source: gateFindings.length > 0 ? "operator_recorded" : "unavailable",
    finding_count: gateFindings.length,
    defects_caught: defectsCaught,
    workflow_gate_defects_caught: workflowGateDefectsCaught,
    product_gate_defects_caught: productGateDefectsCaught,
    would_escape_without_gate_defect_count: wouldEscapeDefectCount,
    first_pass_quality_score: firstPassQualityScore,
    escaped_defect_count: null,
    repair_loop_count: interventions.filter((intervention) => intervention.severity === "rework").length,
    findings: gateFindings
  };
}

function defaultWorkflowArtifactCount(artifactInventory) {
  const categories = artifactInventory.categories ?? {};
  return (categories.managed_runtime?.files ?? 0) + (categories.project_facts?.files ?? 0);
}

function confidenceForCostSource(costSource) {
  if (costSource === "observer_measured") return "high";
  if (String(costSource).startsWith("mixed_")) return "mixed";
  if (costSource === "system_timed_manual_boundary") return "medium";
  if (costSource === "agent_recorded_estimate") return "low";
  return "unavailable";
}

function evaluateChecks(checks, files) {
  const evaluated = (checks ?? []).map((check) => {
    const evidence = (check.evidence ?? []).map((evidenceSpec) => evaluateEvidence(evidenceSpec, files));
    const evidenceMode = check.evidence_mode === "any" ? "any" : "all";
    return {
      id: check.id,
      label: check.label,
      passed:
        evidence.length > 0 &&
        (evidenceMode === "any" ? evidence.some((result) => result.passed) : evidence.every((result) => result.passed)),
      evidence
    };
  });
  return {
    total: evaluated.length,
    passed: evaluated.filter((check) => check.passed).length,
    checks: evaluated
  };
}

function evaluateEvidence(spec, files) {
  const matchedFiles = files.filter((file) => matchesEvidencePattern(file.relative, spec.path ?? "**"));
  const text = matchedFiles.map((file) => file.text).join("\n").toLowerCase();
  const containsAll = spec.contains_all ?? [];
  const containsAny = spec.contains_any ?? [];
  const normalizedAll = containsAll.map((needle) => String(needle).toLowerCase());
  const normalizedAny = containsAny.map((needle) => String(needle).toLowerCase());
  const allPassed = normalizedAll.every((needle) => text.includes(needle));
  const anyPassed = normalizedAny.length === 0 || normalizedAny.some((needle) => text.includes(needle));
  return {
    path: spec.path ?? "**",
    passed: matchedFiles.length > 0 && allPassed && anyPassed,
    matched_files: matchedFiles.map((file) => file.relative),
    missing_all: containsAll.filter((needle) => !text.includes(String(needle).toLowerCase())),
    matched_any: containsAny.filter((needle) => text.includes(String(needle).toLowerCase()))
  };
}

function matchesEvidencePattern(relative, pattern) {
  if (matchesPattern(relative, pattern)) return true;
  if (pattern === "tests/**" || pattern.startsWith("tests/")) {
    return matchesPattern(relative, pattern.replace(/^tests(\/|$)/, "test$1"));
  }
  if (pattern === "test/**" || pattern.startsWith("test/")) {
    return matchesPattern(relative, pattern.replace(/^test(\/|$)/, "tests$1"));
  }
  return false;
}

async function collectFiles(rootDir) {
  const files = [];
  await walk(rootDir, rootDir, files);
  return files;
}

async function walk(rootDir, currentDir, files) {
  const entries = await readdir(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    if ([".git", ".npm-cache", "node_modules", "dist", "build", "coverage"].includes(entry.name)) continue;
    const fullPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      await walk(rootDir, fullPath, files);
    } else if (entry.isFile()) {
      const relative = path.relative(rootDir, fullPath).split(path.sep).join("/");
      if (isBenchmarkInternalEvidence(relative)) continue;
      files.push({ relative, text: await readFile(fullPath, "utf8").catch(() => "") });
    }
  }
}

function isBenchmarkInternalEvidence(relative) {
  return [
    ".benchmark/events.ndjson",
    ".benchmark/observations.ndjson",
    ".benchmark/observer-state.json",
    ".benchmark/observer-stop.json",
    ".benchmark/timer.json",
    ".benchmark/quality-probe.json",
    ".benchmark/quality-probe-first-pass.json",
    ".benchmark/recovery-score.json",
    ".benchmark/interventions.ndjson",
    ".benchmark/gate-findings.ndjson"
  ].includes(relative);
}

async function buildArtifactInventory(runDir) {
  const files = await collectArtifactFiles(runDir);
  const categories = Object.fromEntries(
    Object.entries(ARTIFACT_CATEGORY_LABELS).map(([id, label]) => [
      id,
      {
        id,
        label,
        files: 0,
        lines: 0,
        bytes: 0
      }
    ])
  );
  for (const file of files) {
    const bucket = categories[file.category] ?? categories.other;
    bucket.files += 1;
    bucket.lines += file.lines;
    bucket.bytes += file.bytes;
  }
  const total = Object.values(categories).reduce(
    (summary, category) => ({
      files: summary.files + category.files,
      lines: summary.lines + category.lines,
      bytes: summary.bytes + category.bytes
    }),
    { files: 0, lines: 0, bytes: 0 }
  );
  return {
    data_source: "filesystem_scan",
    confidence: "high",
    conclusion_eligible: false,
    excluded_dirs: Array.from(ARTIFACT_IGNORED_DIRS).sort(),
    total,
    categories,
    artifact_type_coverage: Object.fromEntries(Object.entries(categories).map(([id, category]) => [id, category.files > 0])),
    top_files: files
      .slice()
      .sort((left, right) => right.lines - left.lines || right.bytes - left.bytes || left.path.localeCompare(right.path))
      .slice(0, 10)
  };
}

async function collectArtifactFiles(rootDir) {
  const files = [];
  await walkArtifactDirectory(rootDir, rootDir, files);
  return files;
}

async function walkArtifactDirectory(rootDir, currentDir, files) {
  const entries = await readdir(currentDir, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (entry.isDirectory() && ARTIFACT_IGNORED_DIRS.has(entry.name)) continue;
    const fullPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      await walkArtifactDirectory(rootDir, fullPath, files);
    } else if (entry.isFile()) {
      const relative = path.relative(rootDir, fullPath).split(path.sep).join("/");
      const bytes = await readFile(fullPath).catch(() => null);
      if (!bytes) continue;
      const text = bytes.toString("utf8");
      files.push({
        path: relative,
        category: categorizeArtifact(relative),
        lines: countLines(text),
        bytes: bytes.length
      });
    }
  }
}

function categorizeArtifact(relative) {
  if (
    relative.startsWith(".codex/") ||
    relative.startsWith(".agent/") ||
    relative.startsWith(".claude/") ||
    relative.startsWith(".cursor/") ||
    relative.startsWith(".cline/") ||
    relative.startsWith(".roo/") ||
    relative.startsWith(".gemini/") ||
    relative.startsWith("tools/") ||
    relative === "AGENTS.md" ||
    relative === "Makefile" ||
    relative === ".github/workflows/harness.yml"
  ) {
    return "managed_runtime";
  }
  if (relative.startsWith("project_context/")) return "project_facts";
  if (
    relative.startsWith("src/") ||
    relative.startsWith("test/") ||
    relative.startsWith("tests/") ||
    relative.startsWith("lib/") ||
    relative.startsWith("bin/") ||
    relative.startsWith("public/")
  ) {
    return "product_source_tests";
  }
  if (
    relative === "README.md" ||
    relative === "DESIGN.md" ||
    relative.startsWith("docs/") ||
    relative.endsWith("-answer.md") ||
    relative.endsWith("-memo.md") ||
    relative.endsWith("-runbook.md")
  ) {
    return "product_docs";
  }
  if (relative.startsWith(".artifacts/")) return "raw_artifacts";
  if (
    relative === "package.json" ||
    relative === "package-lock.json" ||
    relative === "pnpm-lock.yaml" ||
    relative === "yarn.lock" ||
    relative === ".gitignore" ||
    relative === "tsconfig.json" ||
    relative === "eslint.config.js" ||
    relative.startsWith("vite.config.") ||
    relative.startsWith("vitest.config.")
  ) {
    return "scaffold";
  }
  return "other";
}

function countLines(text) {
  if (!text) return 0;
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return normalized.split("\n").length - (normalized.endsWith("\n") ? 1 : 0);
}

function matchesPattern(relative, pattern) {
  if (pattern === "**") return true;
  if (pattern.endsWith("/**")) {
    return relative.startsWith(pattern.slice(0, -3));
  }
  if (!pattern.includes("*")) {
    return relative === pattern || relative.startsWith(`${pattern}/`);
  }
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "__DOUBLE_STAR__")
    .replace(/\*/g, "[^/]*")
    .replace(/__DOUBLE_STAR__/g, ".*");
  return new RegExp(`^${escaped}$`).test(relative);
}

async function readEvents(runDir) {
  const eventsPath = path.join(runDir, ".benchmark", "events.ndjson");
  if (!existsSync(eventsPath)) return [];
  const text = await readFile(eventsPath, "utf8");
  return text
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

async function readObservations(runDir) {
  const observationsPath = path.join(runDir, ".benchmark", OBSERVATIONS_FILE);
  if (!existsSync(observationsPath)) return [];
  const text = await readFile(observationsPath, "utf8");
  return text
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

async function readInterventions(runDir) {
  return readBenchmarkNdjson(runDir, INTERVENTIONS_FILE);
}

async function readGateFindings(runDir) {
  return readBenchmarkNdjson(runDir, GATE_FINDINGS_FILE);
}

async function readPromptLedger(runDir) {
  return readBenchmarkNdjson(runDir, PROMPT_LEDGER_FILE);
}

async function readBenchmarkNdjson(runDir, fileName) {
  const filePath = path.join(runDir, ".benchmark", fileName);
  if (!existsSync(filePath)) return [];
  const text = await readFile(filePath, "utf8");
  return text
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

async function appendBenchmarkNdjson(runDir, fileName, value) {
  await mkdir(path.join(runDir, ".benchmark"), { recursive: true });
  await appendFile(path.join(runDir, ".benchmark", fileName), `${JSON.stringify(value)}\n`, "utf8");
}

function buildCostSummary(events, options, observations = []) {
  const eventMinutes = events.reduce((sum, event) => sum + (Number.isFinite(event.minutes) ? event.minutes : 0), 0);
  const workflowMinutes = events
    .filter((event) => event.kind === "workflow_control")
    .reduce((sum, event) => sum + (Number.isFinite(event.minutes) ? event.minutes : 0), 0);
  const observerSummary = buildObserverSummary(observations);
  const workflowControlMinutes = options.workflowControlMinutes ?? (workflowMinutes > 0 ? workflowMinutes : null);
  const totalDeliveryMinutes =
    options.totalDeliveryMinutes ?? observerSummary.observed_total_delivery_minutes ?? (eventMinutes > 0 ? eventMinutes : null);
  const timingSummary = summarizeTiming(events, observerSummary);
  const runType = options.runType ?? "unknown";
  return {
    run_type: runType,
    bootstrap_minutes: options.bootstrapMinutes ?? null,
    cost_boundary: buildCostBoundary(runType, options.bootstrapMinutes, observations),
    workflow_control_minutes: workflowControlMinutes,
    total_delivery_minutes: totalDeliveryMinutes,
    observed_total_delivery_minutes: observerSummary.observed_total_delivery_minutes,
    file_activity_summary: observerSummary.file_activity_summary,
    gate_breakdown: buildGateBreakdown(events),
    estimated_vibe_handoff_minutes: options.estimatedVibeHandoffMinutes ?? null,
    avoided_rework_minutes: options.avoidedReworkMinutes ?? null,
    cost_data_source: timingSummary.costDataSource,
    timing_sources: timingSummary.sources,
    comparison_confidence: options.comparisonConfidence ?? timingSummary.comparisonConfidence,
    events,
    observations
  };
}

function buildCostBoundary(runType, bootstrapMinutes, observations = []) {
  const observedHarnessBootstrap = findObservedHarnessBootstrap(observations);
  return {
    run_type: runType,
    bootstrap_minutes: bootstrapMinutes ?? null,
    bootstrap_included_in_delivery:
      runType === "cold"
        ? true
        : runType === "warm"
          ? false
          : null,
    observed_harness_bootstrap: observedHarnessBootstrap,
    warm_bootstrap_observed: runType === "warm" && observedHarnessBootstrap.detected,
    explanation:
      runType === "cold"
        ? "Cold run includes Harness adoption/bootstrap and the measured delivery task."
        : runType === "warm"
          ? observedHarnessBootstrap.detected
            ? "Warm run is expected to exclude Harness bootstrap, but observer saw Harness scaffold creation inside the measured window."
            : "Warm run excludes already-committed Harness bootstrap and measures the current delivery task."
          : "Run type was not declared; do not infer whether bootstrap cost is included."
  };
}

function costBoundaryEvidence(report) {
  const boundary = report.workflow_cost?.cost_boundary ?? {};
  const observedHarnessBootstrap =
    boundary.observed_harness_bootstrap ?? findObservedHarnessBootstrap(report.workflow_cost?.observations ?? []);
  return {
    observed_harness_bootstrap: observedHarnessBootstrap,
    warm_bootstrap_observed: Boolean(
      boundary.warm_bootstrap_observed ?? (report.workflow_cost?.run_type === "warm" && observedHarnessBootstrap.detected)
    )
  };
}

function findObservedHarnessBootstrap(observations = []) {
  const addedManagedRuntime = observations
    .filter((observation) => observation.event === "file_added" && observation.path)
    .map((observation) => observation.path)
    .filter((observationPath) => categorizeArtifact(observationPath) === "managed_runtime");
  return {
    detected: addedManagedRuntime.length > 0,
    file_added_count: addedManagedRuntime.length,
    sample_paths: addedManagedRuntime.slice(0, 8)
  };
}

function hiddenQualitySummary(report) {
  const hidden = report.quality_assessment?.hidden_probe;
  return {
    available: Boolean(hidden?.available),
    passed: hidden?.passed ?? null,
    total: hidden?.total ?? null,
    decision: hidden?.decision ?? "UNAVAILABLE",
    confidence: hidden?.confidence ?? "unavailable"
  };
}

function evidenceCheckItem(passed, requirement, evidence) {
  return {
    passed: Boolean(passed),
    requirement,
    evidence
  };
}

function isMetricConclusionEligible(report, metricId) {
  const metric = report.metric_confidence?.[metricId];
  if (!metric) return false;
  return Boolean(metric.conclusion_eligible ?? metric.conclusionEligible ?? metric.level === "high");
}

function buildEvidenceConclusion(elapsedComparisonEligible, elapsedDelta, elapsedRatio) {
  if (!elapsedComparisonEligible) {
    return {
      design_purpose_status: "not_evaluable",
      allowed_conclusions: [
        "This run pair is not conclusion-grade for same-quality elapsed efficiency; use it only as diagnostic or calibration evidence."
      ]
    };
  }
  if (elapsedDelta < 0) {
    return {
      design_purpose_status: "supports_direct_efficiency",
      allowed_conclusions: [
        `Harness reached the same hidden quality bar with lower observer elapsed time (${elapsedDelta} min delta, ${elapsedRatio}x ratio).`
      ]
    };
  }
  if (elapsedDelta > 0) {
    return {
      design_purpose_status: "negative_elapsed_signal",
      allowed_conclusions: [
        `Harness reached the same hidden quality bar but took more observer elapsed time (+${elapsedDelta} min, ${elapsedRatio}x ratio).`,
        "This is conclusion-grade evidence against a direct faster-or-more-efficient claim for this scenario."
      ]
    };
  }
  return {
    design_purpose_status: "neutral_elapsed_signal",
    allowed_conclusions: [
      "Harness reached the same hidden quality bar with equal observer elapsed time for this scenario."
    ]
  };
}

function buildMissingDesignPurposeEvidence(baselineReport, harnessReport) {
  const missing = [];
  if (!isMetricConclusionEligible(baselineReport, "context_recovery") || !isMetricConclusionEligible(harnessReport, "context_recovery")) {
    missing.push("context_recovery_high_confidence");
  }
  if (!isMetricConclusionEligible(baselineReport, "human_intervention") || !isMetricConclusionEligible(harnessReport, "human_intervention")) {
    missing.push("automation_burden_high_confidence");
  }
  if (!isMetricConclusionEligible(baselineReport, "gate_value") || !isMetricConclusionEligible(harnessReport, "gate_value")) {
    missing.push("gate_value_high_confidence");
  }
  if (!baselineReport.artifact_inventory || !harnessReport.artifact_inventory) {
    missing.push("artifact_inventory_diagnostic_breakdown");
  }
  if (baselineReport.scenario_id !== "webhook-provider-bridge" && harnessReport.scenario_id !== "webhook-provider-bridge") {
    missing.push("high_risk_provider_boundary_sample");
  }
  return missing;
}

function compareDiagnosticMetric(baselineReport, harnessReport, metricId) {
  const baselineMetric = baselineReport.metric_confidence?.[metricId] ?? null;
  const harnessMetric = harnessReport.metric_confidence?.[metricId] ?? null;
  return {
    baseline: baselineMetric
      ? {
          level: baselineMetric.level,
          data_source: baselineMetric.data_source,
          conclusion_eligible: Boolean(baselineMetric.conclusion_eligible ?? baselineMetric.conclusionEligible)
        }
      : null,
    harness: harnessMetric
      ? {
          level: harnessMetric.level,
          data_source: harnessMetric.data_source,
          conclusion_eligible: Boolean(harnessMetric.conclusion_eligible ?? harnessMetric.conclusionEligible)
        }
      : null
  };
}

function comparePromptLedger(baselineReport, harnessReport) {
  const baselineLedger = baselineReport.automation_burden?.prompt_ledger;
  const harnessLedger = harnessReport.automation_burden?.prompt_ledger;
  return {
    available: Boolean(baselineLedger || harnessLedger),
    data_source: baselineLedger || harnessLedger ? "runner_prompt_ledger" : "unavailable",
    baseline: baselineLedger
      ? {
          prompt_count: baselineLedger.prompt_count,
          protocol_prompt_chars: baselineLedger.protocol_prompt_chars,
          intervention_prompt_chars: baselineLedger.intervention_prompt_chars,
          confidence: baselineLedger.confidence
        }
      : null,
    harness: harnessLedger
      ? {
          prompt_count: harnessLedger.prompt_count,
          protocol_prompt_chars: harnessLedger.protocol_prompt_chars,
          intervention_prompt_chars: harnessLedger.intervention_prompt_chars,
          confidence: harnessLedger.confidence
        }
      : null
  };
}

function compareArtifactInventory(baselineReport, harnessReport) {
  if (!baselineReport.artifact_inventory || !harnessReport.artifact_inventory) {
    return {
      available: false
    };
  }
  return {
    available: true,
    data_source: "filesystem_scan",
    baseline_total: baselineReport.artifact_inventory.total,
    harness_total: harnessReport.artifact_inventory.total,
    baseline_product_source_test_lines: baselineReport.artifact_inventory.categories?.product_source_tests?.lines ?? null,
    harness_product_source_test_lines: harnessReport.artifact_inventory.categories?.product_source_tests?.lines ?? null,
    harness_managed_runtime_lines: harnessReport.artifact_inventory.categories?.managed_runtime?.lines ?? null,
    harness_project_fact_lines: harnessReport.artifact_inventory.categories?.project_facts?.lines ?? null
  };
}

function buildLifecycleSummary(events, options, scoreSummary, recoveryScore = null) {
  const initialDeliveryMinutes =
    options.initialDeliveryMinutes ?? sumEventMinutesByPhase(events, LIFECYCLE_PHASES.initial_delivery_minutes);
  const recoveryOrientationMinutes =
    options.recoveryOrientationMinutes ?? sumEventMinutesByPhase(events, LIFECYCLE_PHASES.recovery_orientation_minutes);
  const rfcFixMinutes = options.rfcFixMinutes ?? sumEventMinutesByPhase(events, LIFECYCLE_PHASES.rfc_fix_minutes);
  const debugFixMinutes = options.debugFixMinutes ?? sumEventMinutesByPhase(events, LIFECYCLE_PHASES.debug_fix_minutes);
  const stageMinutes = [initialDeliveryMinutes, recoveryOrientationMinutes, rfcFixMinutes, debugFixMinutes].filter((value) =>
    Number.isFinite(value)
  );
  const totalLifecycleMinutes = stageMinutes.length > 0 ? round(stageMinutes.reduce((sum, value) => sum + value, 0)) : null;
  const hasOperatorRecoveryScore = options.contextRecoveryScore !== undefined || options.contextRecoveryTotal !== undefined;
  const contextRecoveryScore = options.contextRecoveryScore ?? recoveryScore?.passed ?? null;
  const contextRecoveryTotal = options.contextRecoveryTotal ?? recoveryScore?.total ?? null;
  const wrongPathCount = options.wrongPathCount ?? null;
  const hasLifecycleData =
    totalLifecycleMinutes !== null ||
    contextRecoveryScore !== null ||
    contextRecoveryTotal !== null ||
    wrongPathCount !== null;
  return {
    has_lifecycle_data: hasLifecycleData,
    initial_delivery_minutes: initialDeliveryMinutes,
    recovery_orientation_minutes: recoveryOrientationMinutes,
    rfc_fix_minutes: rfcFixMinutes,
    debug_fix_minutes: debugFixMinutes,
    total_lifecycle_minutes: totalLifecycleMinutes,
    context_recovery_score: contextRecoveryScore,
    context_recovery_total: contextRecoveryTotal,
    recovery_score_source: hasOperatorRecoveryScore
      ? "operator_recorded"
      : recoveryScore
        ? "hidden_answer_key_with_file_references"
        : "unavailable",
    recovery_score_confidence: hasOperatorRecoveryScore ? "medium" : recoveryScore ? recoveryScore.confidence : "unavailable",
    recovery_score_report: recoveryScore,
    wrong_path_count: wrongPathCount,
    final_quality_score: {
      passed: scoreSummary.passed,
      total: scoreSummary.total,
      decision: scoreSummary.decision
    }
  };
}

function buildGateBreakdown(events) {
  const gateEvents = events.filter((event) => isGateEvent(event) && Number.isFinite(event.minutes));
  const totalGateMinutes = gateEvents.reduce((sum, event) => sum + event.minutes, 0);
  const workflowGateMinutes = gateEvents
    .filter((event) => event.kind === "workflow_control")
    .reduce((sum, event) => sum + event.minutes, 0);
  const productGateMinutes = totalGateMinutes - workflowGateMinutes;
  const byEvent = Array.from(
    gateEvents
      .reduce((summary, event) => {
        const key = `${event.event}\0${event.kind}`;
        const item = summary.get(key) ?? { event: event.event, kind: event.kind, count: 0, minutes: 0 };
        item.count += 1;
        item.minutes = round(item.minutes + event.minutes);
        summary.set(key, item);
        return summary;
      }, new Map())
      .values()
  ).sort((left, right) => left.event.localeCompare(right.event) || left.kind.localeCompare(right.kind));
  return {
    has_gate_data: gateEvents.length > 0,
    total_gate_minutes: gateEvents.length > 0 ? round(totalGateMinutes) : null,
    workflow_gate_minutes: gateEvents.length > 0 ? round(workflowGateMinutes) : null,
    product_gate_minutes: gateEvents.length > 0 ? round(productGateMinutes) : null,
    by_event: byEvent
  };
}

function isGateEvent(event) {
  return event.phase === "GATE" || String(event.event ?? "").startsWith("gate:");
}

function sumEventMinutesByPhase(events, phases) {
  const phaseSet = new Set(phases);
  const minutes = events
    .filter((event) => phaseSet.has(event.phase))
    .reduce((sum, event) => sum + (Number.isFinite(event.minutes) ? event.minutes : 0), 0);
  return minutes > 0 ? round(minutes) : null;
}

function buildObserverSummary(observations) {
  const totalObservedDurationMs = observations
    .filter((observation) => observation.event === "observer_stop" && Number.isFinite(observation.duration_ms))
    .reduce((sum, observation) => sum + observation.duration_ms, 0);
  const fileEvents = observations.filter((observation) =>
    ["file_added", "file_modified", "file_deleted"].includes(observation.event)
  );
  const counts = fileEvents.reduce(
    (summary, observation) => {
      summary[observation.event] += 1;
      if (observation.path) summary.paths.add(observation.path);
      return summary;
    },
    { file_added: 0, file_modified: 0, file_deleted: 0, paths: new Set() }
  );
  return {
    hasObserver: observations.length > 0,
    observed_total_delivery_minutes: totalObservedDurationMs > 0
      ? roundDurationMinutes(totalObservedDurationMs / 60000)
      : null,
    file_activity_summary: {
      file_added: counts.file_added,
      file_modified: counts.file_modified,
      file_deleted: counts.file_deleted,
      touched_files: counts.paths.size
    }
  };
}

function summarizeTiming(events, observerSummary = { hasObserver: false }) {
  const sources = events.reduce((summary, event) => {
    const source = event.timing_source ?? (Number.isFinite(event.minutes) ? "agent_recorded_estimate" : "unavailable");
    summary[source] = (summary[source] ?? 0) + 1;
    return summary;
  }, {});
  if (observerSummary.hasObserver) {
    sources.observer_measured = (sources.observer_measured ?? 0) + 1;
  }
  const hasObserver = (sources.observer_measured ?? 0) > 0;
  const hasSystemTimer = (sources.system_timer ?? 0) > 0;
  const hasManualEstimate = (sources.agent_recorded_estimate ?? 0) > 0;
  if (hasObserver) {
    return {
      sources,
      costDataSource: hasManualEstimate ? "mixed_observer_and_agent_estimate" : "observer_measured",
      comparisonConfidence: hasManualEstimate ? "medium" : "high"
    };
  }
  if (hasSystemTimer) {
    return {
      sources,
      costDataSource: hasManualEstimate ? "mixed_system_timer_and_agent_estimate" : "system_timed_manual_boundary",
      comparisonConfidence: "medium"
    };
  }
  if (hasManualEstimate) {
    return {
      sources,
      costDataSource: "agent_recorded_estimate",
      comparisonConfidence: "low"
    };
  }
  return {
    sources,
    costDataSource: "unavailable",
    comparisonConfidence: "low"
  };
}

function calculateOutcome(costs) {
  const total = costs.total_delivery_minutes;
  const workflowControl = costs.workflow_control_minutes;
  const estimatedVibe = costs.estimated_vibe_handoff_minutes;
  const avoidedRework = costs.avoided_rework_minutes;
  return {
    workflow_overhead_ratio: workflowControl !== null && total ? round(workflowControl / total) : null,
    vibe_handoff_delta_minutes: total !== null && estimatedVibe !== null ? round(total - estimatedVibe) : null,
    net_value_minutes:
      total !== null && estimatedVibe !== null && avoidedRework !== null ? round(estimatedVibe + avoidedRework - total) : null,
    comparison_confidence: costs.comparison_confidence
  };
}

function summarizeSections(sections) {
  const totals = Object.values(sections).reduce(
    (summary, section) => ({
      passed: summary.passed + section.passed,
      total: summary.total + section.total
    }),
    { passed: 0, total: 0 }
  );
  return {
    ...totals,
    decision: totals.total > 0 && totals.passed === totals.total ? "PASS" : "WARN"
  };
}

async function renderPrompt(scenario, mode) {
  const common = await readFile(path.join(PROMPTS_ROOT, `${mode}.md`), "utf8");
  return [common.trim(), "", renderInitialScenarioBundle(scenario)].join("\n");
}

function renderInitialScenarioBundle(scenario) {
  const sections = [
    `# Scenario: ${scenario.id}`,
    "",
    "This initial prompt intentionally includes only the base delivery contract. Later recovery, change and repair materials are injected by the benchmark operator at their measured stage.",
    "",
    "## Requirements",
    "",
    scenario.requirements.trim(),
    "",
    "## Acceptance Criteria",
    "",
    scenario.acceptance.trim()
  ];
  if (scenario.gateProfile.trim()) {
    sections.push("", "## Gate Profile", "", scenario.gateProfile.trim());
  }
  return sections.join("\n");
}

function renderStagePromptContent(scenario, mode, stage) {
  const modeRule =
    mode === "baseline"
      ? "Baseline mode: do not use Harness context files or validators."
      : "Harness mode: maintain Minimal Context facts and run only relevant product/context gates for this stage.";
  const mutationCompletionRule =
    mode === "baseline"
      ? "At the end of this mutating stage, after product tests/smoke pass, create one normal product commit and push `main` to the existing local `origin`. Do not commit `.benchmark/**`. If commit or push fails, stop and report `BLOCKED`."
      : "At the end of this mutating stage, after required product and context gates pass, create one normal product/context commit and push `main` to the existing local `origin`. Do not commit `.benchmark/**`. If commit or push fails, stop and report `BLOCKED`.";
  const sections = [
    `# Delivery Benchmark Stage Prompt: ${scenario.id} (${mode}/${stage})`,
    "",
    "You are continuing the same benchmark scenario in a fresh measured context.",
    "Use only this run directory's source, tests, README/docs and mode-appropriate durable deliverables.",
    "Do not inspect another mode's artifacts, raw benchmark observer logs or earlier chat history.",
    modeRule
  ];
  if (stage === "recovery") {
    sections.push(
      "",
      "## Stage: RECOVERY",
      "",
      "Inspect the current repository and answer the checkpoint. Do not make source changes until the operator starts the next measured stage.",
      "Write the takeover memo to `.benchmark/takeover-answer.md` so the operator can score it with the hidden answer key.",
      "",
      scenario.recovery.trim()
    );
  } else if (stage === "rfc") {
    sections.push(
      "",
      "## Stage: RFC",
      "",
      "Apply the staged change request to the current implementation. Update code, tests and docs needed for the same final quality bar.",
      mutationCompletionRule,
      "",
      scenario.rfc.trim()
    );
  } else {
    sections.push(
      "",
      "## Stage: DEBUG",
      "",
      "Diagnose and fix the staged repair condition without losing the latest repository context. Add regression coverage for the fixed boundary.",
      mutationCompletionRule,
      "",
      scenario.debugFix.trim()
    );
  }
  if (scenario.gateProfile.trim()) {
    sections.push("", "## Gate Profile", "", scenario.gateProfile.trim());
  }
  return `${sections.join("\n")}\n`;
}

function renderRunReadme(scenario, mode) {
  return [
    `# ${scenario.id} ${mode} benchmark run`,
    "",
    "This directory is generated by `examples/delivery-benchmark/runner/delivery_benchmark.mjs`.",
    "",
    "The directory is prepared as an independent local git repository with a local bare `origin` under `.benchmark/remote.git`. This keeps Harness task commit/push gates inside the run directory instead of accidentally targeting the source repository.",
    "",
    "The agent under test should follow `.benchmark/prompt.md`. The benchmark operator can start the observer, add optional semantic event labels and score the run.",
    "",
    "Prefer the external observer for new benchmark runs. It records elapsed time and file activity outside the agent prompt, so the measured path stays invisible to the agent under test. Use the lightweight system timer only when an observer cannot be used.",
    "",
    "Useful commands:",
    "",
    "```sh",
    "node examples/delivery-benchmark/runner/delivery_benchmark.mjs observe-start --run-dir <this-dir>",
    "node examples/delivery-benchmark/runner/delivery_benchmark.mjs observe-stop --run-dir <this-dir>",
    "node examples/delivery-benchmark/runner/delivery_benchmark.mjs timer-start --run-dir <this-dir> --event implementation --kind coding --phase SPRINTING",
    "node examples/delivery-benchmark/runner/delivery_benchmark.mjs timer-stop --run-dir <this-dir> --notes \"implementation block complete\"",
    "node examples/delivery-benchmark/runner/delivery_benchmark.mjs record --run-dir <this-dir> --event sync --kind workflow_control --minutes 3",
    "node examples/delivery-benchmark/runner/delivery_benchmark.mjs score --scenario <scenario> --mode <baseline|harness> --run-dir <this-dir>",
    "```"
  ].join("\n");
}

function materializeHarnessWarmScaffold(outDir) {
  if (!existsSync(HARNESS_CLI_PATH)) {
    throw new Error(`Harness CLI is not built at ${HARNESS_CLI_PATH}; run package build before preparing harness mode`);
  }
  runCommand(process.execPath, [HARNESS_CLI_PATH, "init", "--harness-folder", ".codex"], outDir, {
    env: {
      ...process.env,
      npm_config_cache: path.join(outDir, ".npm-cache")
    }
  });
}

async function initializeRunGitRepository(outDir) {
  await writeFile(
    path.join(outDir, ".gitignore"),
    [".benchmark/", ".npm-cache/", "node_modules/", "coverage/", "dist/", "build/", ""].join("\n"),
    "utf8"
  );
  runCommand("git", ["init", "-b", "main"], outDir, { fallback: ["init"] });
  const branch = runCommand("git", ["branch", "--show-current"], outDir).trim();
  if (branch !== "main") {
    runCommand("git", ["checkout", "-B", "main"], outDir);
  }
  runCommand("git", ["config", "user.name", "Delivery Benchmark Operator"], outDir);
  runCommand("git", ["config", "user.email", "delivery-benchmark@example.invalid"], outDir);
  runCommand("git", ["init", "--bare", path.join(outDir, ".benchmark", "remote.git")], outDir);
  runCommand("git", ["add", "."], outDir);
  runCommand("git", ["commit", "-m", "Initial benchmark scaffold"], outDir);
  runCommand("git", ["remote", "add", "origin", path.join(outDir, ".benchmark", "remote.git")], outDir);
  runCommand("git", ["push", "-u", "origin", "main"], outDir);
}

function runCommand(command, args, cwd, options = {}) {
  const spawnOptions = { cwd, encoding: "utf8", env: options.env ?? process.env };
  const result = spawnSync(command, args, spawnOptions);
  if (result.status !== 0 && options.fallback) {
    const fallbackResult = spawnSync(command, options.fallback, spawnOptions);
    if (fallbackResult.status === 0) {
      return fallbackResult.stdout;
    }
    throw new Error(`${command} ${options.fallback.join(" ")} failed: ${fallbackResult.stderr || fallbackResult.stdout}`);
  }
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed: ${result.stderr || result.stdout}`);
  }
  return result.stdout;
}

async function readOptional(filePath) {
  return existsSync(filePath) ? readFile(filePath, "utf8") : "";
}

function requireValue(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function requireString(value, message) {
  if (!value) throw new Error(message);
  return value;
}

function requireMode(mode) {
  if (!VALID_MODES.has(mode)) {
    throw new Error("--mode must be baseline or harness");
  }
  return mode;
}

function requireStage(stage) {
  if (!VALID_STAGES.has(stage)) {
    throw new Error("--stage must be recovery, rfc or debug");
  }
  return stage;
}

function requirePromptKind(promptKind) {
  if (!VALID_PROMPT_KINDS.has(promptKind)) {
    throw new Error(`--prompt-kind must be one of: ${Array.from(VALID_PROMPT_KINDS).join(", ")}`);
  }
  return promptKind;
}

function requireRunType(runType) {
  if (!VALID_RUN_TYPES.has(runType)) {
    throw new Error("--run-type must be cold, warm or unknown");
  }
  return runType;
}

function requireProtocolStatus(protocolStatus) {
  if (!VALID_PROTOCOL_STATUSES.has(protocolStatus)) {
    throw new Error("--protocol-status must be formal, calibration, blocked or unreviewed");
  }
  return protocolStatus;
}

function parseNonNegativeNumber(value, flag) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${flag} must be a non-negative number`);
  }
  return parsed;
}

function parsePositiveNumber(value, flag) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${flag} must be a positive number`);
  }
  return parsed;
}

function parseBoolean(value, flag) {
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${flag} must be true or false`);
}

function parseCsv(value) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function countPromptChars(text) {
  return Array.from(text).length;
}

function countPromptWords(text) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function buildPromptLedgerRecord(promptText, options) {
  const promptKind = requirePromptKind(options.promptKind);
  const promptSha256 = createHash("sha256").update(promptText).digest("hex");
  const countsAsProtocol = promptKind === "protocol_initial" || promptKind === "protocol_stage";
  const countsAsIntervention = promptKind === "operator_intervention";
  return {
    at: new Date().toISOString(),
    prompt_id: `${promptKind}:${options.stage ?? "unspecified"}:${promptSha256.slice(0, 12)}`,
    stage: options.stage ?? "unspecified",
    prompt_kind: promptKind,
    prompt_chars: countPromptChars(promptText),
    prompt_words: countPromptWords(promptText),
    prompt_sha256: promptSha256,
    reason: options.reason ?? "",
    severity: options.severity ?? null,
    notes: options.notes ?? "",
    counts_as_protocol: countsAsProtocol,
    counts_as_intervention: countsAsIntervention,
    data_source: options.dataSource ?? "runner_recorded_prompt"
  };
}

function formatValue(value) {
  return value === null || value === undefined ? "unavailable" : String(value);
}

function formatScore(passed, total) {
  if (passed === null || passed === undefined) return "unavailable";
  return total === null || total === undefined ? String(passed) : `${passed}/${total}`;
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function roundDurationMinutes(value) {
  return Math.round(value * 10000) / 10000;
}

function roundDurationMs(value) {
  return Math.round(value * 1000) / 1000;
}

function calculateDurationMs(state, endedAtEpochMs) {
  const startedAtEpochMs = Number(state.started_at_epoch_ms);
  if (Number.isFinite(startedAtEpochMs)) {
    return Math.max(0, endedAtEpochMs - startedAtEpochMs);
  }
  return Math.max(0, endedAtEpochMs - new Date(state.started_at).getTime());
}

async function runObserverWorker(options) {
  const runDir = path.resolve(requireString(options.runDir, "--run-dir is required"));
  const intervalMs = Math.max(25, Math.round(options.intervalMs ?? 1000));
  const startedAtEpochMs = Date.now();
  const state = {
    active: true,
    pid: process.pid,
    run_dir: runDir,
    interval_ms: intervalMs,
    started_at: new Date(startedAtEpochMs).toISOString(),
    started_at_epoch_ms: startedAtEpochMs,
    data_source: "observer_measured"
  };
  await mkdir(path.join(runDir, ".benchmark"), { recursive: true });
  await writeObserverState(runDir, state);

  let previous = await scanObservedFiles(runDir);
  await appendObservation(runDir, observerEvent("observer_start", null, { atEpochMs: startedAtEpochMs }));
  while (!existsSync(path.join(runDir, ".benchmark", OBSERVER_STOP_FILE))) {
    await sleep(intervalMs);
    const current = await scanObservedFiles(runDir);
    await appendObservationDiff(runDir, previous, current);
    previous = current;
  }

  const current = await scanObservedFiles(runDir);
  await appendObservationDiff(runDir, previous, current);
  const endedAtEpochMs = Date.now();
  await appendObservation(
    runDir,
    observerEvent("observer_stop", null, {
      atEpochMs: endedAtEpochMs,
      extra: {
        started_at: state.started_at,
        ended_at: new Date(endedAtEpochMs).toISOString(),
        duration_ms: roundDurationMs(endedAtEpochMs - startedAtEpochMs)
      }
    })
  );
  await rm(path.join(runDir, ".benchmark", OBSERVER_STOP_FILE), { force: true });
  await writeObserverState(runDir, {
    ...state,
    active: false,
    ended_at: new Date(endedAtEpochMs).toISOString(),
    duration_ms: roundDurationMs(endedAtEpochMs - startedAtEpochMs)
  });
}

async function appendObservationDiff(runDir, previous, current) {
  for (const [relative, file] of current.entries()) {
    const old = previous.get(relative);
    if (!old) {
      await appendObservation(runDir, observerEvent("file_added", relative, { file }));
    } else if (old.sha256 !== file.sha256 || old.size !== file.size || old.mtime_ms !== file.mtime_ms) {
      await appendObservation(runDir, observerEvent("file_modified", relative, { file }));
    }
  }
  for (const [relative, old] of previous.entries()) {
    if (!current.has(relative)) {
      await appendObservation(runDir, observerEvent("file_deleted", relative, { file: old, deleted: true }));
    }
  }
}

function observerEvent(event, relativePath, options = {}) {
  const file = options.file ?? {};
  const atEpochMs = options.atEpochMs ?? Date.now();
  return {
    at: new Date(atEpochMs).toISOString(),
    event,
    path: relativePath,
    size: options.deleted ? null : file.size ?? null,
    mtime_ms: options.deleted ? null : file.mtime_ms ?? null,
    sha256: options.deleted ? null : file.sha256 ?? null,
    data_source: "observer_measured",
    ...(options.extra ?? {})
  };
}

async function scanObservedFiles(runDir) {
  const snapshot = new Map();
  await scanObservedDirectory(runDir, runDir, snapshot);
  return snapshot;
}

async function scanObservedDirectory(rootDir, currentDir, snapshot) {
  const entries = await readdir(currentDir, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (entry.isDirectory() && OBSERVER_IGNORED_DIRS.has(entry.name)) continue;
    const fullPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      await scanObservedDirectory(rootDir, fullPath, snapshot);
    } else if (entry.isFile()) {
      const relative = path.relative(rootDir, fullPath).split(path.sep).join("/");
      const fileStat = await stat(fullPath).catch(() => null);
      if (!fileStat) continue;
      const bytes = await readFile(fullPath).catch(() => null);
      if (!bytes) continue;
      snapshot.set(relative, {
        size: fileStat.size,
        mtime_ms: fileStat.mtimeMs,
        sha256: createHash("sha256").update(bytes).digest("hex")
      });
    }
  }
}

async function appendObservation(runDir, observation) {
  await appendFile(path.join(runDir, ".benchmark", OBSERVATIONS_FILE), `${JSON.stringify(observation)}\n`, "utf8");
}

async function writeObserverState(runDir, state) {
  await mkdir(path.join(runDir, ".benchmark"), { recursive: true });
  await writeFile(path.join(runDir, ".benchmark", OBSERVER_STATE_FILE), `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function isProcessAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mergeNotes(startNotes, stopNotes) {
  const parts = [startNotes, stopNotes].filter((value) => value && String(value).trim());
  return parts.join("; ");
}

async function writeReportOutputs(report, options) {
  if (options.jsonReport) {
    await mkdir(path.dirname(path.resolve(options.jsonReport)), { recursive: true });
    await writeFile(path.resolve(options.jsonReport), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }
  if (options.markdownReport) {
    await mkdir(path.dirname(path.resolve(options.markdownReport)), { recursive: true });
    await writeFile(path.resolve(options.markdownReport), renderMarkdownReport(report), "utf8");
  }
}

async function writeJsonFile(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function readJsonReport(filePath) {
  if (!existsSync(filePath)) return null;
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (!options.command || options.help) {
    printHelp();
    return;
  }
  if (options.command === "list") {
    console.log((await listScenarios()).join("\n"));
  } else if (options.command === "prepare") {
    console.log(JSON.stringify(await prepareRunDirectory(options), null, 2));
  } else if (options.command === "stage-prompt") {
    const promptText = await renderStagePrompt(options);
    if (options.runDir) {
      await appendBenchmarkNdjson(
        path.resolve(options.runDir),
        PROMPT_LEDGER_FILE,
        buildPromptLedgerRecord(promptText, {
          stage: requireStage(options.stage).toUpperCase(),
          promptKind: "protocol_stage",
          reason: `staged ${options.stage} prompt rendered`,
          dataSource: "runner_recorded_prompt"
        })
      );
    }
    process.stdout.write(promptText);
  } else if (options.command === "record") {
    console.log(JSON.stringify(await recordEvent(options), null, 2));
  } else if (options.command === "prompt-record") {
    console.log(JSON.stringify(await recordPrompt(options), null, 2));
  } else if (options.command === "intervention-record") {
    console.log(JSON.stringify(await recordIntervention(options), null, 2));
  } else if (options.command === "gate-record") {
    console.log(JSON.stringify(await recordGateFinding(options), null, 2));
  } else if (options.command === "timer-start") {
    console.log(JSON.stringify(await startTimer(options), null, 2));
  } else if (options.command === "timer-stop") {
    console.log(JSON.stringify(await stopTimer(options), null, 2));
  } else if (options.command === "timer-status") {
    console.log(JSON.stringify(await getTimerStatus(options), null, 2));
  } else if (options.command === "timer-cancel") {
    console.log(JSON.stringify(await cancelTimer(options), null, 2));
  } else if (options.command === "observe-start") {
    console.log(JSON.stringify(await startObserver(options), null, 2));
  } else if (options.command === "observe-stop") {
    console.log(JSON.stringify(await stopObserver(options), null, 2));
  } else if (options.command === "observe-status") {
    console.log(JSON.stringify(await getObserverStatus(options), null, 2));
  } else if (options.command === "observe-worker") {
    await runObserverWorker(options);
  } else if (options.command === "quality-probe") {
    console.log(JSON.stringify(await runQualityProbe(options), null, 2));
  } else if (options.command === "recovery-score") {
    console.log(JSON.stringify(await scoreRecoveryAnswer(options), null, 2));
  } else if (options.command === "score") {
    const report = await scoreRun(options);
    await writeReportOutputs(report, options);
    console.log(JSON.stringify(report, null, 2));
  } else if (options.command === "evidence-check") {
    const result = await checkEvidence(options);
    if (options.out) {
      await writeJsonFile(path.resolve(options.out), result);
    }
    console.log(JSON.stringify(result, null, 2));
  } else {
    throw new Error(`unknown command: ${options.command}`);
  }
}

function printHelp() {
  console.log(`delivery_benchmark.mjs

Commands:
  list
  prepare --scenario <id> --mode <baseline|harness> --out-dir <dir> [--force]
  stage-prompt --scenario <id> --mode <baseline|harness> --stage <recovery|rfc|debug> [--run-dir <dir>]
  record --run-dir <dir> --event <name> [--kind workflow_control|requirements|design|coding|test|review|release|rework|handoff] [--minutes <n>] [--tokens <n>] [--notes <text>]
  prompt-record --run-dir <dir> --stage <stage> --prompt-kind <protocol_initial|protocol_stage|operator_intervention|operator_note> --prompt-file <path> [--reason <text>] [--notes <text>]
  intervention-record --run-dir <dir> --stage <stage> --severity <nudge|clarification|correction|rework|safety_stop> --prompt-file <path> --reason <text> [--notes <text>]
  gate-record --run-dir <dir> --event <gate:name> --stage <stage> --gate-type <product|workflow> --defects-caught <n> [--defect-ids <csv>] [--would-escape true|false] [--notes <text>]
  observe-start --run-dir <dir> [--interval-ms <n>]
  observe-stop --run-dir <dir>
  observe-status --run-dir <dir>
  timer-start --run-dir <dir> --event <name> --kind workflow_control|requirements|design|coding|test|review|release|rework|handoff --phase <phase> [--notes <text>]
  timer-stop --run-dir <dir> [--notes <text>]
  timer-status --run-dir <dir>
  timer-cancel --run-dir <dir>
  quality-probe --scenario <id> --run-dir <dir> [--stage initial|rfc|debug|final] [--out <json>]
  recovery-score --scenario <id> --run-dir <dir> --answer <file> [--out <json>]
  score --scenario <id> --mode <baseline|harness> --run-dir <dir> [--run-type cold|warm|unknown] [--bootstrap-minutes <n>] [--initial-delivery-minutes <n>] [--recovery-orientation-minutes <n>] [--rfc-fix-minutes <n>] [--debug-fix-minutes <n>] [--context-recovery-score <n>] [--context-recovery-total <n>] [--wrong-path-count <n>] [--workflow-overhead-ratio <n>] [--workflow-artifact-count <n>] [--total-artifact-count <n>] [--product-defect-count <n>] [--hygiene-issue-count <n>] [--ac-progress-visible-count <n>] [--ac-progress-total <n>] [--json-report <path>] [--markdown-report <path>]
  evidence-check --baseline-report <json> --harness-report <json> --protocol-status formal|calibration|blocked|unreviewed [--out <json>]
`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
