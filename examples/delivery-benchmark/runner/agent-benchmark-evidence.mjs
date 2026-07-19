import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import {
  INTERVENTIONS_FILE,
  OBSERVATIONS_FILE,
  OBSERVER_STATE_FILE,
  PROMPT_LEDGER_FILE,
  RECOVERY_SCORE_FILE,
  isRecord,
  nonEmpty,
  parseJson,
  readJson,
} from "./agent-benchmark-shared.mjs";

const exec = promisify(execFile);

export function validateSessionReport(metadata, session, errors) {
  if (!isRecord(session)) {
    errors.push("agent-session.json must be an object");
    return;
  }
  if (session.schema_version !== "tiny-context-agent-session-v1")
    errors.push("agent-session.json has unsupported schema_version");
  if (session.stage_prompt_timing_confirmed !== true)
    errors.push("stage_prompt_timing_confirmed must be true");
  if (!Array.isArray(session.stage_sessions)) {
    errors.push("session stage_sessions must be an array");
    return;
  }
  const actualStages = session.stage_sessions.map((item) => item?.stage);
  if (JSON.stringify(actualStages) !== JSON.stringify(metadata.expected_stages))
    errors.push("session stage order does not match prepared run");
  const ids = new Set();
  for (const stage of session.stage_sessions) {
    if (!isRecord(stage)) {
      errors.push("every stage session must be an object");
      continue;
    }
    if (!nonEmpty(stage.session_id)) errors.push(`${stage.stage}: session_id is required`);
    else if (ids.has(stage.session_id))
      errors.push(`session_id reused across stages: ${stage.session_id}`);
    else ids.add(stage.session_id);
    if (stage.fresh_session_confirmed !== true)
      errors.push(`${stage.stage}: fresh_session_confirmed must be true`);
    if (stage.model !== metadata.model)
      errors.push(`${stage.stage}: model does not match prepared run`);
    if (stage.reasoning !== metadata.reasoning)
      errors.push(`${stage.stage}: reasoning does not match prepared run`);
    if (stage.status !== "completed")
      errors.push(`${stage.stage}: status must be completed`);
    const started = Date.parse(stage.started_at);
    const ended = Date.parse(stage.ended_at);
    if (!Number.isFinite(started) || !Number.isFinite(ended) || ended < started)
      errors.push(`${stage.stage}: started_at/ended_at must be valid ordered timestamps`);
  }
  if (!isRecord(session.measurement_confidence))
    errors.push("session measurement_confidence must be an object");
}

export function sessionIds(session) {
  return new Set(
    Array.isArray(session?.stage_sessions)
      ? session.stage_sessions
          .map((item) => item?.session_id)
          .filter(nonEmpty)
      : [],
  );
}

export async function readObserverEvidence(
  runDir,
  expectedStages,
  errors,
  calibrationReasons,
) {
  const benchmarkDir = path.join(runDir, ".benchmark");
  const statePath = path.join(benchmarkDir, OBSERVER_STATE_FILE);
  let state = null;
  if (!existsSync(statePath)) errors.push(`${OBSERVER_STATE_FILE} is missing`);
  else {
    state = await readJson(statePath);
    if (state.active !== false)
      errors.push("external observer is still active or did not close cleanly");
  }
  const observationsPath = path.join(benchmarkDir, OBSERVATIONS_FILE);
  if (!existsSync(observationsPath)) {
    errors.push(`${OBSERVATIONS_FILE} is missing`);
    return { state, starts: 0, stops: 0, observed_minutes: null };
  }
  const observations = (await readFile(observationsPath, "utf8"))
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => parseJson(line, observationsPath));
  const starts = observations.filter((item) => item.event === "observer_start");
  const stops = observations.filter((item) => item.event === "observer_stop");
  if (stops.some((item) => !Number.isFinite(item.duration_ms) || item.duration_ms <= 0))
    errors.push("observer_stop events must contain positive duration_ms");
  if (starts.length !== expectedStages.length || stops.length !== expectedStages.length)
    calibrationReasons.push(
      `observer stage count differs from protocol: expected=${expectedStages.length} starts=${starts.length} stops=${stops.length}`,
    );
  return {
    state,
    starts: starts.length,
    stops: stops.length,
    observed_minutes:
      stops.length > 0
        ? Math.round(
            (stops.reduce((sum, item) => sum + (item.duration_ms ?? 0), 0) /
              60000) *
              10000,
          ) / 10000
        : null,
  };
}

export async function readProtocolPromptEvidence(
  runDir,
  metadata,
  errors,
  calibrationReasons,
) {
  const expectedStages = metadata.expected_stages ?? [];
  const file = path.join(runDir, ".benchmark", PROMPT_LEDGER_FILE);
  if (!existsSync(file)) {
    errors.push(`${PROMPT_LEDGER_FILE} is missing`);
    return { hashes_by_stage: {}, record_count: 0 };
  }
  const rows = (await readFile(file, "utf8"))
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => parseJson(line, file))
    .filter((row) =>
      ["protocol_initial", "protocol_stage"].includes(row.prompt_kind),
    );
  const byStage = new Map();
  for (const row of rows) {
    const records = byStage.get(row.stage) ?? [];
    records.push(row);
    byStage.set(row.stage, records);
  }
  const hashes = {};
  for (const stage of expectedStages) {
    const records = byStage.get(stage) ?? [];
    if (records.length === 0) errors.push(`protocol prompt record missing: ${stage}`);
    else {
      hashes[stage] = records[0].prompt_sha256 ?? null;
      if (!nonEmpty(hashes[stage]))
        errors.push(`protocol prompt hash missing: ${stage}`);
      if (
        stage === "INITIAL_DELIVERY" &&
        hashes[stage] !== metadata.prompt_sha256
      )
        errors.push("initial protocol prompt hash does not match prepared prompt");
    }
    if (records.length > 1)
      calibrationReasons.push(
        `protocol prompt rendered more than once for ${stage}: ${records.length}`,
      );
  }
  for (const stage of byStage.keys())
    if (!expectedStages.includes(stage))
      calibrationReasons.push(`unexpected protocol prompt stage recorded: ${stage}`);
  return { hashes_by_stage: hashes, record_count: rows.length };
}

export async function readRecoveryEvidence(runDir, metadata, errors) {
  if (!metadata.expected_stages.includes("RECOVERY")) return null;
  const file = path.join(runDir, ".benchmark", RECOVERY_SCORE_FILE);
  if (!existsSync(file)) {
    errors.push(`${RECOVERY_SCORE_FILE} is missing`);
    return null;
  }
  const recovery = await readJson(file);
  if (recovery.decision !== "PASS")
    errors.push(`recovery score did not pass: ${recovery.decision}`);
  return recovery;
}

export async function readFinalRepositoryEvidence(
  runDir,
  preparedCommit,
  errors,
) {
  if (!existsSync(path.join(runDir, ".git"))) {
    errors.push("prepared run is not a Git repository");
    return null;
  }
  try {
    const [status, branch, head, tree, originMain] = await Promise.all([
      git(runDir, ["status", "--porcelain=v1", "--untracked-files=all"]),
      git(runDir, ["branch", "--show-current"]),
      git(runDir, ["rev-parse", "HEAD"]),
      git(runDir, ["rev-parse", "HEAD^{tree}"]),
      git(runDir, ["rev-parse", "refs/remotes/origin/main"]),
    ]);
    const clean = status.length === 0;
    if (!clean) errors.push("final repository is dirty");
    if (branch !== "main") errors.push(`final repository branch is ${branch}, not main`);
    if (head !== originMain)
      errors.push("final repository HEAD is not pushed to origin/main");
    const preparedAncestor = await isAncestor(runDir, preparedCommit, head);
    if (!preparedAncestor)
      errors.push("final repository history does not descend from the prepared commit");
    return {
      clean,
      branch,
      head,
      tree,
      origin_main: originMain,
      prepared_commit_ancestor: preparedAncestor,
    };
  } catch (error) {
    errors.push(
      `final repository state is unavailable: ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  }
}

async function git(cwd, args) {
  const { stdout } = await exec("git", args, { cwd, windowsHide: true });
  return stdout.trim();
}

async function isAncestor(cwd, ancestor, descendant) {
  if (!nonEmpty(ancestor) || !nonEmpty(descendant)) return false;
  try {
    await exec(
      "git",
      ["merge-base", "--is-ancestor", ancestor, descendant],
      { cwd, windowsHide: true },
    );
    return true;
  } catch (error) {
    if (error?.code === 1) return false;
    throw error;
  }
}

export async function readInterventionSummary(runDir) {
  const file = path.join(runDir, ".benchmark", INTERVENTIONS_FILE);
  if (!existsSync(file)) return { count: 0, by_severity: {}, records: [] };
  const rows = (await readFile(file, "utf8"))
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => parseJson(line, file));
  const bySeverity = {};
  const records = rows.map((row) => {
    const severity = nonEmpty(row.severity) ? row.severity : "unknown";
    bySeverity[severity] = (bySeverity[severity] ?? 0) + 1;
    return {
      stage: nonEmpty(row.stage) ? row.stage : null,
      severity,
      reason: nonEmpty(row.reason) ? row.reason : null,
      prompt_sha256: nonEmpty(row.prompt_sha256) ? row.prompt_sha256 : null,
      prompt_chars: Number.isFinite(row.prompt_chars) ? row.prompt_chars : null,
      prompt_words: Number.isFinite(row.prompt_words) ? row.prompt_words : null,
    };
  });
  records.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  return {
    count: rows.length,
    by_severity: Object.fromEntries(
      Object.entries(bySeverity).sort(([left], [right]) => left.localeCompare(right)),
    ),
    records,
  };
}
