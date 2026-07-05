import { appendSuperpowersEvent } from "./superpowers-task-events.js";
import { deriveSuperpowersArtifacts } from "./superpowers-task-derive.js";
import { validatePlanAcceptance } from "./plan-acceptance-validator.js";
import { loadSuperpowersState, recomputeStatuses, saveSuperpowersState } from "./superpowers-task-state.js";
import { completionConditionErrors, validateSuperpowersState } from "./superpowers-task-validator.js";

export async function runSliceGate(workdir: string, sliceId: string): Promise<{ passed: boolean; messages: string[] }> {
  const state = await loadSuperpowersState(workdir);
  const slice = state.slices.find((item) => item.slice_id === sliceId);
  const messages: string[] = [];
  if (!slice) {
    messages.push(`slice not found: ${sliceId}`);
  } else if (!slice.progress_value?.type || slice.progress_value.closed_items.length === 0) {
    messages.push(`slice ${sliceId} has no progress_value`);
  }
  await deriveSuperpowersArtifacts(workdir);
  await appendSuperpowersEvent(workdir, "slice_gate", { slice_id: sliceId, passed: messages.length === 0 });
  return { passed: messages.length === 0, messages };
}

export async function runEpochGate(workdir: string, epochId: string): Promise<{ passed: boolean; messages: string[] }> {
  await deriveSuperpowersArtifacts(workdir);
  await appendSuperpowersEvent(workdir, "epoch_gate", { epoch_id: epochId, passed: true });
  return { passed: true, messages: ["epoch derived artifacts refreshed"] };
}

export async function runFinalGate(workdir: string): Promise<{ product_goal_complete: boolean; errors: string[] }> {
  const state = await loadSuperpowersState(workdir);
  recomputeStatuses(state);
  state.final.audit_task_complete = true;
  state.meta.audit_task_complete = true;
  state.gates.validator = { status: "not_run" };
  await saveSuperpowersState(workdir, state);
  await deriveSuperpowersArtifacts(workdir);
  const report = await validateSuperpowersState(workdir, [workdir]);
  const acceptanceReport = await validatePlanAcceptance(workdir, [workdir]);
  const latest = await loadSuperpowersState(workdir);
  const completionErrors = completionConditionErrors(latest);
  const errors = [...new Set([...report.errors, ...acceptanceReport.errors, ...completionErrors])];
  const complete = errors.length === 0;
  const acceptanceStatus = complete ? "complete" : acceptanceStatusForErrors(errors);
  const nextRequiredActions = complete ? [] : nextActionsForErrors(errors);
  latest.final.product_goal_complete = complete;
  latest.meta.product_goal_complete = complete;
  latest.final.acceptance_target_status = acceptanceStatus;
  latest.meta.acceptance_target_status = latest.final.acceptance_target_status;
  latest.final.audit_task_complete = true;
  latest.meta.audit_task_complete = true;
  latest.final.completion_basis = complete
    ? ["all_required_acs_complete", "validator_passed", "assertion_evidence_passed", "negative_evidence_scan_passed", "auditor_no_blocker"]
    : [];
  latest.final.next_required_actions = nextRequiredActions;
  latest.gates.validator = { status: errors.length === 0 ? "pass" : "blocked", errors };
  latest.gates.final_gate = {
    status: complete ? "pass" : acceptanceStatus,
    order: [
      "derive",
      "verification_before_completion_expected",
      "validate_state",
      "validate_derived",
      "validate_plan_acceptance",
      "auditor_blocker_scan",
      "stale_overclaim_scope_scan",
      "ac_evidence_assertion_gate",
      "negative_evidence_scan_gate",
      "compute_completion"
    ],
    errors,
    next_required_actions: nextRequiredActions
  };
  await saveSuperpowersState(workdir, latest);
  await deriveSuperpowersArtifacts(workdir);
  await appendSuperpowersEvent(workdir, "final_gate", { product_goal_complete: complete });
  return { product_goal_complete: complete, errors };
}

function acceptanceStatusForErrors(errors: string[]): "partial" | "blocked" | "invalidated" {
  const text = errors.join("\n");
  if (/source hash mismatch|source_changed_requires_recompile|scope_conflict_requires_decision|auditor blocker|Context Delta coverage is unresolved/i.test(text)) {
    return "blocked";
  }
  if (/invalid evidence|forbidden shortcut|negative evidence|stale evidence|raw secret|contains_secret|sibling substitution|assertion_result\.status=failed|assertion exit_code=|command_exit_code=|forbidden text/i.test(text)) {
    return "invalidated";
  }
  return "partial";
}

function nextActionsForErrors(errors: string[]): string[] {
  return errors.slice(0, 12).map((error) => {
    if (/source hash mismatch/i.test(error)) {
      return `${error}; rerun ty-context composite-long-task compile <workdir> after approving source changes`;
    }
    if (/scope_conflict_requires_decision/i.test(error)) {
      return `${error}; clarify Product / Plan / Checklist delivery scope before more implementation`;
    }
    if (/missing assertion result|not machine-backed/i.test(error)) {
      return `${error}; add assertion_result evidence for the target AC/proof layer`;
    }
    if (/negative evidence|forbidden/i.test(error)) {
      return `${error}; rerun the negative evidence scan and fix the contradictory owner-surface state`;
    }
    if (/derived\/.*does not match/i.test(error)) {
      return `${error}; rerun ty-context composite-long-task derive <workdir>`;
    }
    return error;
  });
}

