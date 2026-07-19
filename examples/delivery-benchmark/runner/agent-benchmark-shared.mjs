import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const BENCHMARK_ROOT = path.resolve(HERE, "..");
export const REPO_ROOT = path.resolve(BENCHMARK_ROOT, "..", "..");
export const DEFAULT_PLAN_PATH = path.join(
  BENCHMARK_ROOT,
  "agent-benchmark",
  "plan.json",
);
export const DEFAULT_GOLD_SET_PATH = path.join(
  BENCHMARK_ROOT,
  "agent-benchmark",
  "gold-set.json",
);
export const DEFAULT_SCENARIOS_ROOT = path.join(BENCHMARK_ROOT, "scenarios");
export const VALID_ROLES = new Set(["control", "candidate"]);
export const VALID_TRACK_STATUSES = new Set([
  "agent_run_ready",
  "fixture_required",
  "profile_only",
]);
export const VALID_STAGES = new Set(["initial", "recovery", "rfc", "debug"]);
export const AGENT_RUN_FILE = "agent-run.json";
export const AGENT_SESSION_FILE = "agent-session.json";
export const AGENT_SESSION_TEMPLATE_FILE = "agent-session-template.json";
export const AGENT_RUNBOOK_FILE = "codex-runbook.md";
export const QUALITY_PROBE_FILE = "quality-probe.json";
export const OBSERVER_STATE_FILE = "observer-state.json";
export const OBSERVATIONS_FILE = "observations.ndjson";
export const RECOVERY_SCORE_FILE = "recovery-score.json";
export const PROMPT_LEDGER_FILE = "prompts.ndjson";
export const INTERVENTIONS_FILE = "interventions.ndjson";
export const SESSION_STAGES = [
  "INITIAL_DELIVERY",
  "RECOVERY",
  "RFC",
  "DEBUG",
];

export function parseAgentBenchmarkArgs(argv) {
  const [command = "help", ...rest] = argv;
  const options = { command };
  const valueFlags = new Map([
    ["--plan", "planPath"],
    ["--gold-set", "goldSetPath"],
    ["--scenarios-root", "scenariosRoot"],
    ["--track", "trackId"],
    ["--variant", "variantId"],
    ["--role", "role"],
    ["--scenario", "scenario"],
    ["--model", "model"],
    ["--reasoning", "reasoning"],
    ["--harness-ref", "harnessRef"],
    ["--harness-root", "harnessRoot"],
    ["--out-dir", "outDir"],
    ["--run-dir", "runDir"],
    ["--control-run", "controlRun"],
    ["--candidate-run", "candidateRun"],
  ]);
  for (let index = 0; index < rest.length; index += 1) {
    const argument = rest[index];
    if (argument === "--help" || argument === "-h") options.help = true;
    else if (argument === "--force") options.force = true;
    else if (argument === "--complete") options.complete = true;
    else if (argument === "--run-index")
      options.runIndex = parsePositiveInteger(
        requireValue(rest, ++index, argument),
        argument,
      );
    else if (valueFlags.has(argument))
      options[valueFlags.get(argument)] = requireValue(rest, ++index, argument);
    else throw new Error(`unknown argument: ${argument}`);
  }
  return options;
}

export function help() {
  return `Agent benchmark commands:\n  validate-assets [--plan <path>] [--gold-set <path>]\n  prepare-run --track <id> --role control|candidate --variant <id> --scenario <id> --run-index <n> --model <id> --reasoning <level> [--harness-root <checkout>] [--harness-ref <sha>] --out-dir <path> [--force]\n  validate-run --run-dir <path> [--complete]\n  validate-pair --control-run <path> --candidate-run <path> [--complete]\n`;
}

export async function readJson(file) {
  return parseJson(await readFile(file, "utf8"), file);
}

export async function writeJson(file, value) {
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function parseJson(value, label) {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(
      `${label} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export function assertUnique(values, field, label, errors) {
  const seen = new Set();
  for (const value of values) {
    const candidate = isRecord(value) ? value[field] : undefined;
    if (!nonEmpty(candidate)) continue;
    if (seen.has(candidate)) errors.push(`${label} id is duplicated: ${candidate}`);
    seen.add(candidate);
  }
}

export function validateReadyTrackEpisodeCoverage(
  tracksValue,
  episodesValue,
  errors,
) {
  const tracks = Array.isArray(tracksValue) ? tracksValue : [];
  const episodes = Array.isArray(episodesValue) ? episodesValue : [];
  const scenarios = new Set(episodes.map((episode) => episode.scenario));
  for (const track of tracks)
    if (isRecord(track) && track.status === "agent_run_ready")
      for (const scenario of track.scenarios ?? [])
        if (!scenarios.has(scenario))
          errors.push(
            `agent-run-ready track ${track.id} has no gold-set episode for ${scenario}`,
          );
}

export function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function nonEmpty(value) {
  return typeof value === "string" && Boolean(value.trim());
}

export function isKey(value) {
  return nonEmpty(value) && /^[a-z0-9][a-z0-9-]*$/u.test(value);
}

export function isCommitSha(value) {
  return typeof value === "string" && /^[0-9a-f]{40}$/u.test(value);
}

export function isSha256(value) {
  return typeof value === "string" && /^[0-9a-f]{64}$/u.test(value);
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function requireString(value, flag) {
  if (!nonEmpty(value)) throw new Error(`${flag} is required`);
  return value.trim();
}

export function requireKey(value, flag) {
  const result = requireString(value, flag);
  if (!isKey(result))
    throw new Error(`${flag} must match ^[a-z0-9][a-z0-9-]*$`);
  return result;
}

export function quote(value) {
  return JSON.stringify(value);
}

function requireValue(args, index, flag) {
  const value = args[index];
  if (!value || value.startsWith("--"))
    throw new Error(`${flag} requires a value`);
  return value;
}

function parsePositiveInteger(value, flag) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1)
    throw new Error(`${flag} must be a positive integer`);
  return parsed;
}
