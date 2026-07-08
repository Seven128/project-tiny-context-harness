import { appendSuperpowersEvent } from "./superpowers-task-events.js";
import { deriveSuperpowersArtifacts } from "./superpowers-task-derive.js";
import { validatePlanAcceptance } from "./plan-acceptance-validator.js";
import { loadSuperpowersState, saveSuperpowersState } from "./superpowers-task-state.js";
import {
  applyCompletionOutputContract,
  completionPhraseFindingMessages,
  resolveCompletionOutputStatus,
  scanGeneratedCompletionOutputSurfaces,
  type CompletionOutputContract
} from "./superpowers-task-completion-output.js";
import { applyTrustedEvidenceKernelResult, evaluateTrustedEvidenceKernel, type TrustedEvidenceKernelResult } from "./superpowers-task-evidence-kernel.js";
import { isRecord } from "./superpowers-task-state-schema.js";
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

export async function runFinalGate(workdir: string): Promise<CompletionOutputContract & { errors: string[] }> {
  const state = await loadSuperpowersState(workdir);
  const kernel = await evaluateTrustedEvidenceKernel(workdir, state);
  applyTrustedEvidenceKernelResult(state, kernel);
  state.gates.validator = { status: "not_run", kernel: "trusted_evidence_kernel" };
  await saveSuperpowersState(workdir, state);
  await deriveSuperpowersArtifacts(workdir);
  const report = await validateSuperpowersState(workdir, [workdir]);
  const acceptanceReport = await validatePlanAcceptance(workdir, [workdir]);
  const latest = await loadSuperpowersState(workdir);
  let errors = [...new Set([...kernel.errors, ...report.errors, ...acceptanceReport.errors])];
  let complete = kernel.product_goal_complete && errors.length === 0;
  const acceptanceStatus = complete ? "complete" : acceptanceStatusForErrors(errors, kernel);
  const nextRequiredActions = complete ? [] : nextActionsForErrors(errors);
  let contract = resolveCompletionOutputStatus({
    final_gate_ran: true,
    product_goal_complete: complete,
    acceptance_target_status: acceptanceStatus,
    audit_task_complete: true,
    validator_errors: report.errors,
    acceptance_validator_errors: acceptanceReport.errors,
    rejection_reasons: complete ? [] : nextRequiredActions
  });
  applyCompletionOutputContract(latest, contract);
  latest.final.completion_basis = complete
    ? ["trusted_evidence_kernel", "current_attempt_evidence", "negative_evidence_scan_passed", "harness_drift_lock_passed"]
    : [];
  latest.final.next_required_actions = nextRequiredActions;
  latest.gates.validator = { status: errors.length === 0 ? "pass" : "blocked", errors };
  latest.gates.final_gate = {
    status: complete ? "pass" : acceptanceStatus,
    kernel: "trusted_evidence_kernel",
    order: kernel.kernel_order,
    errors,
    stale_evidence_ids: kernel.stale_evidence_ids,
    ignored_unregistered_evidence: kernel.ignored_unregistered_evidence,
    invalidated_evidence_ids: kernel.invalidated_evidence_ids,
    ac_findings: kernel.ac_findings,
    pi_findings: kernel.pi_findings,
    harness_task_final_verdict: kernel.harness_task_final_verdict,
    next_required_actions: nextRequiredActions,
    completion_output_status: contract.completion_output_status,
    final_answer_allowed: contract.final_answer_allowed,
    required_user_visible_status: contract.required_user_visible_status,
    exit_code: contract.exit_code,
    blocked_reasons: contract.blocked_reasons,
    rejection_reasons: contract.rejection_reasons,
    generated_output_mismatch: contract.generated_output_mismatch
  };
  await saveSuperpowersState(workdir, latest);
  await deriveSuperpowersArtifacts(workdir);
  const outputFindings = await scanGeneratedCompletionOutputSurfaces(workdir, contract);
  if (outputFindings.length > 0) {
    errors = [...new Set([...errors, ...completionPhraseFindingMessages(outputFindings)])];
    complete = false;
    contract = resolveCompletionOutputStatus({
      final_gate_ran: true,
      product_goal_complete: false,
      acceptance_target_status: acceptanceStatusForErrors(errors, kernel),
      audit_task_complete: true,
      validator_errors: errors,
      generated_output_mismatch: true
    });
    const blockedLatest = await loadSuperpowersState(workdir);
    applyCompletionOutputContract(blockedLatest, contract);
    blockedLatest.final.completion_basis = [];
    blockedLatest.final.next_required_actions = nextActionsForErrors(errors);
    blockedLatest.gates.validator = { status: "blocked", errors };
    blockedLatest.gates.final_gate = {
      ...(isRecord(blockedLatest.gates.final_gate) ? blockedLatest.gates.final_gate : {}),
      status: contract.completion_output_status,
      errors,
      next_required_actions: blockedLatest.final.next_required_actions,
      completion_output_status: contract.completion_output_status,
      final_answer_allowed: contract.final_answer_allowed,
      required_user_visible_status: contract.required_user_visible_status,
      exit_code: contract.exit_code,
      blocked_reasons: contract.blocked_reasons,
      rejection_reasons: contract.rejection_reasons,
      generated_output_mismatch: contract.generated_output_mismatch,
      false_completion_phrase_findings: outputFindings
    };
    blockedLatest.final.false_completion_phrase_findings = outputFindings;
    await saveSuperpowersState(workdir, blockedLatest);
    await deriveSuperpowersArtifacts(workdir);
  }
  await appendSuperpowersEvent(workdir, "final_gate", {
    product_goal_complete: contract.product_goal_complete,
    completion_output_status: contract.completion_output_status
  });
  return { ...contract, errors };
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
