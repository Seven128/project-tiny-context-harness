#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { appendFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BENCHMARK_ROOT = path.resolve(HERE, "..");
const SCENARIOS_ROOT = path.join(BENCHMARK_ROOT, "scenarios");
const PROMPTS_ROOT = path.join(BENCHMARK_ROOT, "prompts");
const VALID_MODES = new Set(["baseline", "harness"]);
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
    } else if (arg === "--notes") {
      options.notes = requireValue(rest, ++index, arg);
    } else if (arg === "--workflow-control-minutes") {
      options.workflowControlMinutes = parseNonNegativeNumber(requireValue(rest, ++index, arg), arg);
    } else if (arg === "--total-delivery-minutes") {
      options.totalDeliveryMinutes = parseNonNegativeNumber(requireValue(rest, ++index, arg), arg);
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
    recovery: await readOptional(path.join(scenarioDir, "recovery_checkpoint.md"))
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
    notes: options.notes ?? ""
  };
  await mkdir(path.join(runDir, ".benchmark"), { recursive: true });
  await appendFile(path.join(runDir, ".benchmark", "events.ndjson"), `${JSON.stringify(event)}\n`, "utf8");
  return event;
}

export async function scoreRun(options) {
  const mode = requireMode(options.mode);
  const scenario = await loadScenario(options.scenario);
  const runDir = path.resolve(requireString(options.runDir, "--run-dir is required"));
  const files = await collectFiles(runDir);
  const events = await readEvents(runDir);
  const sections = {};
  for (const [sectionName, checks] of Object.entries(scenario.rubric.sections ?? {})) {
    sections[sectionName] = evaluateChecks(checks, files);
  }
  const costs = buildCostSummary(events, options);
  const report = {
    scenario_id: scenario.id,
    mode,
    scored_at: new Date().toISOString(),
    run_dir: runDir,
    summary: summarizeSections(sections),
    workflow_cost: costs,
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
      if (relative === ".benchmark/events.ndjson") continue;
      files.push({ relative, text: await readFile(fullPath, "utf8").catch(() => "") });
    }
  }
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

function buildCostSummary(events, options) {
  const eventMinutes = events.reduce((sum, event) => sum + (Number.isFinite(event.minutes) ? event.minutes : 0), 0);
  const workflowMinutes = events
    .filter((event) => event.kind === "workflow_control")
    .reduce((sum, event) => sum + (Number.isFinite(event.minutes) ? event.minutes : 0), 0);
  const workflowControlMinutes = options.workflowControlMinutes ?? (workflowMinutes > 0 ? workflowMinutes : null);
  const totalDeliveryMinutes = options.totalDeliveryMinutes ?? (eventMinutes > 0 ? eventMinutes : null);
  return {
    workflow_control_minutes: workflowControlMinutes,
    total_delivery_minutes: totalDeliveryMinutes,
    estimated_vibe_handoff_minutes: options.estimatedVibeHandoffMinutes ?? null,
    avoided_rework_minutes: options.avoidedReworkMinutes ?? null,
    comparison_confidence: options.comparisonConfidence ?? "low",
    events
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
  return [
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
  ].join("\n");
}

function renderRunReadme(scenario, mode) {
  return [
    `# ${scenario.id} ${mode} benchmark run`,
    "",
    "This directory is generated by `examples/delivery-benchmark/runner/delivery_benchmark.mjs`.",
    "",
    "Read `.benchmark/prompt.md`, execute the scenario, record workflow events in `.benchmark/events.ndjson`, then score the run.",
    "",
    "Useful commands:",
    "",
    "```sh",
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

function formatValue(value) {
  return value === null || value === undefined ? "unavailable" : String(value);
}

function round(value) {
  return Math.round(value * 100) / 100;
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
  score --scenario <id> --mode <baseline|harness> --run-dir <dir> [--json-report <path>] [--markdown-report <path>]
  inspect --run-dir <dir> [inspect-workflow outcome arguments]
`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
