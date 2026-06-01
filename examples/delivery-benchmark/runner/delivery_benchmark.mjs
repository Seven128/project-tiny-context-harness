#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFile, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BENCHMARK_ROOT = path.resolve(HERE, "..");
const SCENARIOS_ROOT = path.join(BENCHMARK_ROOT, "scenarios");
const PROMPTS_ROOT = path.join(BENCHMARK_ROOT, "prompts");
const VALID_MODES = new Set(["baseline", "harness"]);
const OBSERVER_IGNORED_DIRS = new Set([".benchmark", ".git", "node_modules", "dist", "build", "coverage"]);
const OBSERVER_STATE_FILE = "observer-state.json";
const OBSERVER_STOP_FILE = "observer-stop.json";
const OBSERVATIONS_FILE = "observations.ndjson";
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
    } else if (arg === "--workflow-control-minutes") {
      options.workflowControlMinutes = parseNonNegativeNumber(requireValue(rest, ++index, arg), arg);
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
    requirements: await readOptional(path.join(scenarioDir, "requirements.md")),
    acceptance: await readOptional(path.join(scenarioDir, "acceptance_criteria.md")),
    rfc: await readOptional(path.join(scenarioDir, "rfc_change.md")),
    recovery: await readOptional(path.join(scenarioDir, "recovery_checkpoint.md")),
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
  await writeFile(path.join(outDir, ".benchmark", "scenario.md"), renderScenarioBundle(scenario), "utf8");
  await writeFile(path.join(outDir, ".benchmark", "prompt.md"), await renderPrompt(scenario, mode), "utf8");
  await writeFile(path.join(outDir, ".benchmark", "events.ndjson"), "", "utf8");
  return { outDir, scenario: scenario.id, mode };
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

export async function scoreRun(options) {
  const mode = requireMode(options.mode);
  const scenario = await loadScenario(options.scenario);
  const runDir = path.resolve(requireString(options.runDir, "--run-dir is required"));
  const files = await collectFiles(runDir);
  const events = await readEvents(runDir);
  const observations = await readObservations(runDir);
  const sections = {};
  for (const [sectionName, checks] of Object.entries(scenario.rubric.sections ?? {})) {
    sections[sectionName] = evaluateChecks(checks, files);
  }
  const costs = buildCostSummary(events, options, observations);
  const summary = summarizeSections(sections);
  const report = {
    scenario_id: scenario.id,
    mode,
    scored_at: new Date().toISOString(),
    run_dir: runDir,
    summary,
    workflow_cost: costs,
    lifecycle: buildLifecycleSummary(events, options, summary),
    outcome: calculateOutcome(costs, options),
    sections
  };
  return report;
}

export async function inspectWorkflow(options) {
  const runDir = path.resolve(requireString(options.runDir, "--run-dir is required"));
  const args = ["sdlc-harness", "inspect-workflow", "--json"];
  addOptionalMetricArgs(args, options);
  const result = spawnSync("npx", args, { cwd: runDir, encoding: "utf8" });
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    report: result.status === 0 ? JSON.parse(result.stdout) : null
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
    `- Lifecycle total minutes: ${formatValue(report.lifecycle?.total_lifecycle_minutes)}`,
    `- Context recovery score: ${formatScore(report.lifecycle?.context_recovery_score, report.lifecycle?.context_recovery_total)}`,
    `- Wrong-path count: ${formatValue(report.lifecycle?.wrong_path_count)}`,
    `- Cost data source: ${report.workflow_cost.cost_data_source}`,
    `- Net value minutes: ${formatValue(report.outcome.net_value_minutes)}`,
    "",
    "## Section Summary",
    "",
    "| Section | Passed | Total | Result |",
    "|---|---:|---:|---|"
  ];
  for (const [sectionName, section] of Object.entries(report.sections)) {
    lines.push(`| ${sectionName} | ${section.passed} | ${section.total} | ${section.passed === section.total ? "PASS" : "WARN"} |`);
  }
  lines.push("", "## Failed Checks", "");
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
  if (report.lifecycle?.has_lifecycle_data) {
    lines.push("", "## Lifecycle Efficiency", "");
    lines.push(`- initial_delivery_minutes: ${formatValue(report.lifecycle.initial_delivery_minutes)}`);
    lines.push(`- recovery_orientation_minutes: ${formatValue(report.lifecycle.recovery_orientation_minutes)}`);
    lines.push(`- rfc_fix_minutes: ${formatValue(report.lifecycle.rfc_fix_minutes)}`);
    lines.push(`- debug_fix_minutes: ${formatValue(report.lifecycle.debug_fix_minutes)}`);
    lines.push(`- total_lifecycle_minutes: ${formatValue(report.lifecycle.total_lifecycle_minutes)}`);
    lines.push(`- context_recovery_score: ${formatScore(report.lifecycle.context_recovery_score, report.lifecycle.context_recovery_total)}`);
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
  const matchedFiles = files.filter((file) => matchesPattern(file.relative, spec.path ?? "**"));
  const text = matchedFiles.map((file) => file.text).join("\n");
  const containsAll = spec.contains_all ?? [];
  const containsAny = spec.contains_any ?? [];
  const allPassed = containsAll.every((needle) => text.includes(needle));
  const anyPassed = containsAny.length === 0 || containsAny.some((needle) => text.includes(needle));
  return {
    path: spec.path ?? "**",
    passed: matchedFiles.length > 0 && allPassed && anyPassed,
    matched_files: matchedFiles.map((file) => file.relative),
    missing_all: containsAll.filter((needle) => !text.includes(needle)),
    matched_any: containsAny.filter((needle) => text.includes(needle))
  };
}

async function collectFiles(rootDir) {
  const files = [];
  await walk(rootDir, rootDir, files);
  return files;
}

async function walk(rootDir, currentDir, files) {
  const entries = await readdir(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    if ([".git", "node_modules", "dist", "build", "coverage"].includes(entry.name)) continue;
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
    ".benchmark/timer.json"
  ].includes(relative);
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
  return {
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

function buildLifecycleSummary(events, options, scoreSummary) {
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
  const contextRecoveryScore = options.contextRecoveryScore ?? null;
  const contextRecoveryTotal = options.contextRecoveryTotal ?? null;
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
  return [common.trim(), "", renderScenarioBundle(scenario)].join("\n");
}

function renderScenarioBundle(scenario) {
  const sections = [
    `# Scenario: ${scenario.id}`,
    "",
    "## Requirements",
    "",
    scenario.requirements.trim(),
    "",
    "## Acceptance Criteria",
    "",
    scenario.acceptance.trim(),
    "",
    "## Midstream Change",
    "",
    scenario.rfc.trim(),
    "",
    "## Recovery Checkpoint",
    "",
    scenario.recovery.trim()
  ];
  if (scenario.lifecycleProbe.trim()) {
    sections.push("", "## Lifecycle Probe", "", scenario.lifecycleProbe.trim());
  }
  if (scenario.gateProfile.trim()) {
    sections.push("", "## Gate Profile", "", scenario.gateProfile.trim());
  }
  return sections.join("\n");
}

function renderRunReadme(scenario, mode) {
  return [
    `# ${scenario.id} ${mode} benchmark run`,
    "",
    "This directory is generated by `examples/delivery-benchmark/runner/delivery_benchmark.mjs`.",
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

async function readOptional(filePath) {
  return existsSync(filePath) ? readFile(filePath, "utf8") : "";
}

function addOptionalMetricArgs(args, options) {
  const entries = [
    ["--workflow-control-minutes", options.workflowControlMinutes],
    ["--total-delivery-minutes", options.totalDeliveryMinutes],
    ["--estimated-vibe-handoff-minutes", options.estimatedVibeHandoffMinutes],
    ["--avoided-rework-minutes", options.avoidedReworkMinutes],
    ["--comparison-confidence", options.comparisonConfidence]
  ];
  for (const [flag, value] of entries) {
    if (value !== undefined) args.push(flag, String(value));
  }
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
  } else if (options.command === "record") {
    console.log(JSON.stringify(await recordEvent(options), null, 2));
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
  } else if (options.command === "score") {
    const report = await scoreRun(options);
    await writeReportOutputs(report, options);
    console.log(JSON.stringify(report, null, 2));
  } else if (options.command === "inspect") {
    const result = await inspectWorkflow(options);
    process.stdout.write(result.stdout);
    process.stderr.write(result.stderr);
    if (result.status !== 0) process.exitCode = result.status ?? 1;
  } else {
    throw new Error(`unknown command: ${options.command}`);
  }
}

function printHelp() {
  console.log(`delivery_benchmark.mjs

Commands:
  list
  prepare --scenario <id> --mode <baseline|harness> --out-dir <dir> [--force]
  record --run-dir <dir> --event <name> [--kind workflow_control|requirements|design|coding|test|review|release|rework|handoff] [--minutes <n>] [--tokens <n>] [--notes <text>]
  observe-start --run-dir <dir> [--interval-ms <n>]
  observe-stop --run-dir <dir>
  observe-status --run-dir <dir>
  timer-start --run-dir <dir> --event <name> --kind workflow_control|requirements|design|coding|test|review|release|rework|handoff --phase <phase> [--notes <text>]
  timer-stop --run-dir <dir> [--notes <text>]
  timer-status --run-dir <dir>
  timer-cancel --run-dir <dir>
  score --scenario <id> --mode <baseline|harness> --run-dir <dir> [--initial-delivery-minutes <n>] [--recovery-orientation-minutes <n>] [--rfc-fix-minutes <n>] [--debug-fix-minutes <n>] [--context-recovery-score <n>] [--context-recovery-total <n>] [--wrong-path-count <n>] [--json-report <path>] [--markdown-report <path>]
  inspect --run-dir <dir> [inspect-workflow outcome arguments]
`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
