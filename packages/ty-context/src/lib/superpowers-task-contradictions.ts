import path from "node:path";
import { listFiles, pathExists, readText } from "./fs.js";
import type { SuperpowersTaskState } from "./superpowers-task-state-schema.js";

const OWNER_SURFACE_FORBIDDEN_STATES = ["尚未运行自测", "运行未记录", "未验证", "不可用", "暂不可用", "页面无明显变化"];

export interface SuperpowersContradictionScan {
  errors: string[];
  historicalCompleteIgnored: boolean;
}

export async function scanSuperpowersContradictions(workdir: string, state: SuperpowersTaskState): Promise<SuperpowersContradictionScan> {
  const files = await listFiles(workdir);
  const errors = [
    ...scanFinalStateContradictions(state),
    ...(await scanCurrentFailureArtifacts(workdir, files))
  ];
  const historicalCompleteIgnored = errors.length > 0 && (await hasHistoricalCompleteEvent(workdir));
  if (historicalCompleteIgnored) {
    errors.push("historical_complete_ignored: Historical stale completion event detected and ignored. Current recomputed product_goal_complete=false.");
  }
  if (errors.length > 0) {
    errors.push("workflow_gate_bug_prevented: current contradiction scan prevents product_goal_complete=true.");
  }
  return { errors: unique(errors), historicalCompleteIgnored };
}

function scanFinalStateContradictions(state: SuperpowersTaskState): string[] {
  const errors: string[] = [];
  if (state.meta?.product_goal_complete === false && state.final?.product_goal_complete === true) {
    errors.push("current contradiction task_state_product_goal_mismatch: meta product_goal_complete=false but final product_goal_complete=true.");
  }
  if (state.meta?.acceptance_target_status && state.final?.acceptance_target_status && state.meta.acceptance_target_status !== state.final.acceptance_target_status) {
    errors.push(
      `current contradiction task_state_acceptance_status_mismatch: meta=${state.meta.acceptance_target_status} final=${state.final.acceptance_target_status}.`
    );
  }
  for (const commandRun of state.command_runs ?? []) {
    if (Number(commandRun.exit_code) !== 0) {
      errors.push(
        `current contradiction command_run_failed: ${commandRun.command_run_id} ac=${commandRun.ac_id} proof_layer=${commandRun.proof_layer} exit_code=${commandRun.exit_code}.`
      );
    }
  }
  return errors;
}

async function scanCurrentFailureArtifacts(workdir: string, files: string[]): Promise<string[]> {
  const errors: string[] = [];
  for (const file of files) {
    const relative = slash(path.relative(workdir, file));
    if (relative.endsWith(".last-run.json")) {
      errors.push(...(await scanPlaywrightLastRun(file, relative)));
      continue;
    }
    if (/test-results\/.*error-context\.md$/i.test(relative)) {
      errors.push(...(await scanOwnerDomErrorContext(file, relative)));
      continue;
    }
    if (isFailureJsonCandidate(relative)) {
      errors.push(...(await scanFailedJsonArtifact(file, relative)));
    }
  }
  return errors;
}

async function scanPlaywrightLastRun(file: string, relative: string): Promise<string[]> {
  const parsed = await readJsonRecord(file);
  if (!parsed) {
    return [];
  }
  const status = String(parsed.status ?? parsed.outcome ?? "").toLowerCase();
  const failedTests = Array.isArray(parsed.failedTests) ? parsed.failedTests : Array.isArray(parsed.failed_tests) ? parsed.failed_tests : [];
  if (status !== "failed" && failedTests.length === 0) {
    return [];
  }
  return [
    `current contradiction playwright_last_run_failed: ${relative} status=${status || "unknown"} failed_tests=${failedTests
      .map(String)
      .join(", ") || "(unspecified)"}.`
  ];
}

async function scanOwnerDomErrorContext(file: string, relative: string): Promise<string[]> {
  const text = await readText(file);
  const findings = OWNER_SURFACE_FORBIDDEN_STATES.filter((state) => text.includes(state));
  if (findings.length === 0) {
    return [];
  }
  return [`current contradiction owner_dom_forbidden_state: ${relative} contains ${findings.join(", ")}.`];
}

async function scanFailedJsonArtifact(file: string, relative: string): Promise<string[]> {
  const parsed = await readJsonRecord(file);
  if (!parsed) {
    return [];
  }
  const text = JSON.stringify(parsed);
  const status = String(parsed.status ?? parsed.outcome ?? parsed.result ?? "").toLowerCase();
  const failures = Number(parsed.failures ?? parsed.failed ?? parsed.failed_count ?? 0);
  if (status !== "failed" && failures <= 0 && !/"failed"/i.test(text)) {
    return [];
  }
  return [`current contradiction failed_test_result_artifact: ${relative} reports failed status.`];
}

function isFailureJsonCandidate(relative: string): boolean {
  return (
    /\.json$/i.test(relative) &&
    /(^|\/)(test-results|playwright-report|junit|command-runs|negative-evidence|negative_evidence)(\/|$)/i.test(relative)
  );
}

async function hasHistoricalCompleteEvent(workdir: string): Promise<boolean> {
  const eventsPath = path.join(workdir, "events.ndjson");
  if (!(await pathExists(eventsPath))) {
    return false;
  }
  const content = await readText(eventsPath);
  return content
    .split(/\r?\n/)
    .filter(Boolean)
    .some((line) => {
      try {
        const event = JSON.parse(line) as Record<string, unknown>;
        return String(event.event ?? event.event_type ?? event.type ?? "") === "final_gate" && event.product_goal_complete === true;
      } catch {
        return /final_gate/.test(line) && /product_goal_complete["']?\s*:\s*true/.test(line);
      }
    });
}

async function readJsonRecord(file: string): Promise<Record<string, unknown> | undefined> {
  try {
    const parsed = JSON.parse(await readText(file));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : undefined;
  } catch {
    return undefined;
  }
}

function slash(value: string): string {
  return value.split(path.sep).join("/");
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
