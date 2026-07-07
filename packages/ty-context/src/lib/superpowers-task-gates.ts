import { appendSuperpowersEvent } from "./superpowers-task-events.js";
import { deriveSuperpowersArtifacts } from "./superpowers-task-derive.js";
import { validatePlanAcceptance } from "./plan-acceptance-validator.js";
import { loadSuperpowersState, saveSuperpowersState } from "./superpowers-task-state.js";
import { applyTrustedEvidenceKernelResult, evaluateTrustedEvidenceKernel, type TrustedEvidenceKernelResult } from "./superpowers-task-evidence-kernel.js";
import { validateSuperpowersState } from "./superpowers-task-validator.js";

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
  const kernel = await evaluateTrustedEvidenceKernel(workdir, state);
  applyTrustedEvidenceKernelResult(state, kernel);
  state.gates.validator = { status: "not_run", kernel: "trusted_evidence_kernel" };
  await saveSuperpowersState(workdir, state);
  await deriveSuperpowersArtifacts(workdir);
  const report = await validateSuperpowersState(workdir, [workdir]);
  const acceptanceReport = await validatePlanAcceptance(workdir, [workdir]);
  const latest = await loadSuperpowersState(workdir);
  const errors = [...new Set([...kernel.errors, ...report.errors, ...acceptanceReport.errors])];
  const complete = kernel.product_goal_complete && errors.length === 0;
  const acceptanceStatus = complete ? "complete" : acceptanceStatusForErrors(errors, kernel);
  const nextRequiredActions = complete ? [] : nextActionsForErrors(errors);
  latest.final.product_goal_complete = complete;
  latest.meta.product_goal_complete = complete;
  latest.final.acceptance_target_status = acceptanceStatus;
  latest.meta.acceptance_target_status = latest.final.acceptance_target_status;
  latest.final.audit_task_complete = true;
  latest.meta.audit_task_complete = true;
  latest.final.completion_basis = complete
    ? ["trusted_evidence_kernel", "current_attempt_evidence", "negative_evidence_scan_passed", "harness_drift_lock_passed"]
    : [];
  latest.final.next_required_actions = nextRequiredActions;
  latest.gates.validator = { status: errors.length === 0 ? "pass" : "blocked", errors };
  latest.gates.final_gate = {
    status: complete ? "pass" : acceptanceStatus,
    kernel: "trusted_evidence_kernel",
    order: [
      "load_three_inputs",
      "recompute_source_hashes",
      "load_task_state",
      "load_current_attempt",
      "load_command_run_records",
      "load_registered_evidence_records",
      "discard_stale_evidence",
      "contradiction_scan",
      "recompute_every_ac",
      "recompute_every_pi",
      "recompute_acceptance_target_status",
      "recompute_product_goal_complete",
      "regenerate_derived",
      "append_event"
    ],
    errors,
    stale_evidence_ids: kernel.stale_evidence_ids,
    harness_task_final_verdict: kernel.harness_task_final_verdict,
    next_required_actions: nextRequiredActions
  };
  await saveSuperpowersState(workdir, latest);
  await deriveSuperpowersArtifacts(workdir);
  await appendSuperpowersEvent(workdir, "final_gate", { product_goal_complete: complete });
  return { product_goal_complete: complete, errors };
}

function acceptanceStatusForErrors(errors: string[], kernel?: TrustedEvidenceKernelResult): "partial" | "blocked" | "invalidated" | "under_specified" {
  const text = errors.join("\n");
  if (kernel?.acceptance_target_status === "under_specified" || /under_specified/i.test(text)) {
    return "under_specified";
  }
  if (/source hash mismatch|source_changed_requires_recompile|scope_conflict_requires_decision|auditor blocker|Context Delta coverage is unresolved|harness_drift|protected_baseline|harness_task_missing|required_command_specs_hash/i.test(text)) {
    return "blocked";
  }
  if (
    /invalid evidence|forbidden shortcut|negative evidence|stale evidence|raw secret|contains_secret|sibling substitution|assertion_result\.status=failed|assertion exit_code=|command_exit_code=|forbidden text|current contradiction|workflow_gate_bug_prevented|playwright_last_run_failed|owner_dom_forbidden_state|failed_test_result_artifact/i.test(
      text
    )
  ) {
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
    if (/current contradiction|playwright_last_run_failed|owner_dom_forbidden_state|failed_test_result_artifact/i.test(error)) {
      return `${error}; rerun the required current assertion command after fixing the current failure`;
    }
    if (/derived\/.*does not match/i.test(error)) {
      return `${error}; rerun ty-context composite-long-task derive <workdir>`;
    }
    return error;
  });
}

