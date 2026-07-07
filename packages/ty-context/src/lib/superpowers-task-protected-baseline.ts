import { isHarnessPath } from "./superpowers-task-harness-drift.js";
import { isRecord, type ExecutionAttempt, type SuperpowersTaskState } from "./superpowers-task-state-schema.js";

export interface ProtectedBaselineResult {
  protected_baseline_changed: boolean;
  product_goal_complete: boolean;
  changed_files: string[];
  errors: string[];
}

export const PROTECTED_BASELINE_PATHS = [
  "packages/ty-context/assets/protected-harness-baseline.json",
  ".codex/ty-context-managed/protected-harness-baseline.json",
  "packages/ty-context/source-mappings.yaml",
  "packages/ty-context/src/lib/superpowers-task-gates.ts",
  "packages/ty-context/src/lib/superpowers-task-validator.ts",
  "packages/ty-context/src/lib/superpowers-task-derive.ts",
  "packages/ty-context/src/lib/superpowers-task-evidence.ts",
  "packages/ty-context/src/lib/superpowers-task-evidence-kernel.ts",
  "packages/ty-context/src/lib/superpowers-task-state-schema.ts",
  ".codex/ty-context-managed/skills/composite-long-task-workflow/SKILL.md",
  ".codex/ty-context-managed/skills/composite-long-task-workflow/references/composite-long-task-workflow-protocol.md",
  "packages/ty-context/assets/skills/composite-long-task-workflow/SKILL.md",
  "packages/ty-context/assets/skills/composite-long-task-workflow/references/composite-long-task-workflow-protocol.md"
];

export function evaluateProtectedBaseline(state: SuperpowersTaskState): ProtectedBaselineResult {
  const attempt = currentAttempt(state);
  const changedFiles = [...new Set((attempt?.changed_files ?? []).map((file) => file.replace(/\\/g, "/")).filter(Boolean))];
  const protectedChanges = changedFiles.filter(isProtectedBaselinePath);
  const mode = attempt?.mode ?? "product_task";
  const errors: string[] = [];
  if (mode === "product_task" && protectedChanges.length > 0) {
    errors.push(`protected_baseline_changed: product_task cannot change protected harness baseline paths: ${protectedChanges.join(", ")}`);
  }
  if (mode === "harness_task" && protectedChanges.length > 0 && !protectedBaselineReason(state)) {
    errors.push("protected_baseline_reason_required: harness_task baseline changes must record gates.protected_baseline.reason");
  }
  return {
    protected_baseline_changed: protectedChanges.length > 0,
    product_goal_complete: errors.length === 0,
    changed_files: protectedChanges,
    errors
  };
}

export function isProtectedBaselinePath(file: string): boolean {
  const normalized = file.replace(/\\/g, "/");
  return PROTECTED_BASELINE_PATHS.includes(normalized) || isHarnessPath(normalized);
}

function protectedBaselineReason(state: SuperpowersTaskState): boolean {
  const baseline = state.gates?.protected_baseline;
  return isRecord(baseline) && typeof baseline.reason === "string" && baseline.reason.trim().length > 0;
}

function currentAttempt(state: SuperpowersTaskState): ExecutionAttempt | undefined {
  return (state.attempts ?? []).find((item) => item.task_attempt_id === state.current_attempt_id) ?? (state.attempts ?? []).at(-1);
}
