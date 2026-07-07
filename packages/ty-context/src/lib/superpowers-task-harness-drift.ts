import { isRecord, type ExecutionAttempt, type SuperpowersTaskState } from "./superpowers-task-state-schema.js";

export interface HarnessDriftResult {
  harness_drift_detected: boolean;
  acceptance_target_status: "complete" | "partial" | "blocked";
  product_goal_complete: boolean;
  harness_task_final_verdict?: "passed" | "failed";
  changed_files: string[];
  errors: string[];
}

const HARNESS_PATH_PATTERNS = [
  /(^|\/)tests\/.*\.(spec|test)\.[cm]?[jt]sx?$/i,
  /(^|\/)playwright\.config\./i,
  /(^|\/).*\.spec\.[cm]?[jt]sx?$/i,
  /(^|\/).*\.test\.[cm]?[jt]sx?$/i,
  /superpowers-task-(assertions|evidence|evidence-kernel|current-evidence|command-specs|ac010|gates|validator|derive|state|state-schema|state-shape|under-specified|protected-baseline|harness-drift)\.ts$/i,
  /(^|\/)(\.codex\/ty-context-managed|packages\/ty-context\/assets)\/skills\/composite-long-task-workflow\//i,
  /composite-long-task-workflow-protocol\.md$/i,
  /(^|\/)Makefile$/i,
  /(^|\/)package\.json$/i
];

const REQUIRED_NEGATIVE_FIXTURES = [
  "stale_evidence",
  "historical_complete",
  "derived_contradiction",
  "ac010_summary_only",
  "target_mismatch",
  "api_only_for_ui",
  "negative_evidence_after_pass",
  "source_hash_mismatch",
  "dirty_worktree_mismatch",
  "missing_assertion_result",
  "test_weakening"
];

export function detectHarnessDrift(state: SuperpowersTaskState): HarnessDriftResult {
  const attempt = currentAttempt(state);
  const changedFiles = changedFilesFor(attempt);
  const harnessFiles = changedFiles.filter(isHarnessPath);
  const mode = attempt?.mode ?? "product_task";
  if (mode === "product_task" && harnessFiles.length > 0) {
    return {
      harness_drift_detected: true,
      acceptance_target_status: "blocked",
      product_goal_complete: false,
      changed_files: harnessFiles,
      errors: [
        `harness_drift_detected: ${harnessFiles.join(", ")}`,
        "本轮修改了验收工具链或测试本身，不能用被修改后的验收证明同一轮产品完成。请拆成独立 harness_task。"
      ]
    };
  }
  if (mode === "harness_task") {
    return harnessTaskFixtureVerdict(state, changedFiles);
  }
  return { harness_drift_detected: false, acceptance_target_status: "complete", product_goal_complete: true, changed_files: [], errors: [] };
}

export function isHarnessPath(file: string): boolean {
  const normalized = file.replace(/\\/g, "/");
  return HARNESS_PATH_PATTERNS.some((pattern) => pattern.test(normalized));
}

function harnessTaskFixtureVerdict(state: SuperpowersTaskState, changedFiles: string[]): HarnessDriftResult {
  const fixtureState = isRecord(state.gates?.harness_task_fixtures) ? state.gates.harness_task_fixtures : undefined;
  const errors: string[] = [];
  if (!fixtureState) {
    errors.push("harness_task_missing_adversarial_fixtures: harness_task must declare adversarial fixture outcomes");
  } else {
    for (const fixture of REQUIRED_NEGATIVE_FIXTURES) {
      if (fixtureState[fixture] !== false) {
        errors.push(`harness_task_missing_adversarial_fixtures: ${fixture} must have expected product_goal_complete=false`);
      }
    }
    if (fixtureState.happy_path !== true) {
      errors.push("harness_task_missing_happy_path_fixture: happy_path must have expected product_goal_complete=true");
    }
  }
  const fixtureChanges = changedFiles.filter((file) => /(^|\/)tests\/ty-context\/.*fixture/i.test(file.replace(/\\/g, "/")));
  if (fixtureChanges.length > 0) {
    errors.push(`fixture_changed_requires_review: ${fixtureChanges.join(", ")}`);
  }
  return {
    harness_drift_detected: false,
    acceptance_target_status: errors.length > 0 ? "blocked" : "complete",
    product_goal_complete: false,
    harness_task_final_verdict: errors.length > 0 ? "failed" : "passed",
    changed_files: changedFiles,
    errors
  };
}

function currentAttempt(state: SuperpowersTaskState): ExecutionAttempt | undefined {
  return (state.attempts ?? []).find((item) => item.task_attempt_id === state.current_attempt_id) ?? (state.attempts ?? []).at(-1);
}

function changedFilesFor(attempt: ExecutionAttempt | undefined): string[] {
  return [...new Set((attempt?.changed_files ?? []).map((file) => file.replace(/\\/g, "/")).filter(Boolean))];
}
