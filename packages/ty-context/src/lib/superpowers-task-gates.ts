import { appendSuperpowersEvent } from "./superpowers-task-events.js";
import { deriveSuperpowersArtifacts } from "./superpowers-task-derive.js";
import { validatePlanAcceptance } from "./plan-acceptance-validator.js";
import { loadSuperpowersState, saveSuperpowersState } from "./superpowers-task-state.js";
import {
  applyCompletionOutputContract,
  completionPhraseFindingMessages,
  resolveCompletionOutputStatus,
  scanGeneratedCompletionOutputSurfacesDetailed,
  triageFinalGateBlockers,
  type CompletionOutputContract,
  type FinalGateBlockerTriage,
  type FinalGateCandidateState
} from "./superpowers-task-completion-output.js";
import { applyTrustedEvidenceKernelResult, evaluateTrustedEvidenceKernel, type TrustedEvidenceKernelResult } from "./superpowers-task-evidence-kernel.js";
import { isRecord, type SuperpowersTaskState } from "./superpowers-task-state-schema.js";
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
  return runFinalGateOnce(workdir, { recoveryAttempted: false, recoveryAction: "" });
}

async function runFinalGateOnce(
  workdir: string,
  options: { recoveryAttempted: boolean; recoveryAction: string }
): Promise<CompletionOutputContract & { errors: string[] }> {
  const state = await loadSuperpowersState(workdir);
  const previousTransientFindings = previousTransientBookkeepingFindings(state);
  const kernel = await evaluateTrustedEvidenceKernel(workdir, state);
  applyTrustedEvidenceKernelResult(state, kernel);
  state.gates.validator = { status: "not_run", kernel: "trusted_evidence_kernel" };
  const candidateContract = resolveCompletionOutputStatus({
    final_gate_ran: true,
    product_goal_complete: kernel.product_goal_complete && kernel.errors.length === 0,
    acceptance_target_status: kernel.product_goal_complete && kernel.errors.length === 0 ? "complete" : kernel.acceptance_target_status,
    audit_task_complete: true,
    validator_errors: kernel.errors,
    rejection_reasons: kernel.product_goal_complete ? [] : kernel.errors.slice(0, 12)
  });
  const candidateState = candidateStateFromContract(candidateContract);
  candidateContract.candidate_state = candidateState;
  applyCompletionOutputContract(state, candidateContract);
  state.final.completion_basis = candidateContract.product_goal_complete
    ? ["trusted_evidence_kernel", "current_attempt_evidence", "negative_evidence_scan_passed", "harness_drift_lock_passed"]
    : [];
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
  contract.candidate_state = candidateState;
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
    generated_output_mismatch: contract.generated_output_mismatch,
    candidate_state: candidateState,
    previous_bookkeeping_snapshot: previousTransientFindings
  };
  await saveSuperpowersState(workdir, latest);
  await deriveSuperpowersArtifacts(workdir);
  const outputFindings = await scanGeneratedCompletionOutputSurfacesDetailed(workdir, contract);
  let triage = triageFinalGateBlockers({
    errors,
    output_findings: outputFindings,
    previous_transient_findings: previousTransientFindings,
    candidate_state: candidateState,
    recovery_attempted: options.recoveryAttempted || previousTransientFindings.length > 0,
    recovery_action: options.recoveryAction || (previousTransientFindings.length > 0 ? "cleared previous transient bookkeeping" : "")
  });
  if (outputFindings.length > 0 && triage.self_recoverable && !options.recoveryAttempted) {
    await deriveSuperpowersArtifacts(workdir);
    return runFinalGateOnce(workdir, { recoveryAttempted: true, recoveryAction: "regenerated_derived_outputs" });
  }
  if (outputFindings.length > 0) {
    errors = [...new Set([...errors, ...completionPhraseFindingMessages(outputFindings)])];
    complete = false;
    triage = triageFinalGateBlockers({
      errors,
      output_findings: outputFindings,
      previous_transient_findings: previousTransientFindings,
      candidate_state: candidateState,
      recovery_attempted: options.recoveryAttempted,
      recovery_action: options.recoveryAction
    });
    contract = resolveCompletionOutputStatus({
      final_gate_ran: true,
      product_goal_complete: false,
      acceptance_target_status: acceptanceStatusForErrors(errors, kernel),
      audit_task_complete: true,
      validator_errors: errors,
      generated_output_mismatch: true
    });
    contract.candidate_state = candidateState;
    contract.blocker_triage = triage;
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
      false_completion_phrase_findings: outputFindings,
      candidate_state: candidateState,
      blocker_triage: triage,
      previous_bookkeeping_snapshot: previousTransientFindings
    };
    blockedLatest.final.false_completion_phrase_findings = outputFindings;
    await saveSuperpowersState(workdir, blockedLatest);
    await deriveSuperpowersArtifacts(workdir);
  } else {
    if (triage.category === "environment_blocked" || triage.category === "contract_blocked" || triage.category === "harness_drift_blocked") {
      contract = resolveCompletionOutputStatus({
        final_gate_ran: true,
        product_goal_complete: false,
        acceptance_target_status: "blocked",
        audit_task_complete: true,
        validator_errors: errors,
        blocked_reasons: [triage.category],
        rejection_reasons: []
      });
      contract.candidate_state = candidateState;
    }
    contract.blocker_triage = triage;
    const triagedLatest = await loadSuperpowersState(workdir);
    applyCompletionOutputContract(triagedLatest, contract);
    triagedLatest.final.next_required_actions = contract.completion_output_status === "accept" ? [] : nextActionsForErrors(errors);
    triagedLatest.gates.final_gate = {
      ...(isRecord(triagedLatest.gates.final_gate) ? triagedLatest.gates.final_gate : {}),
      completion_output_status: contract.completion_output_status,
      final_answer_allowed: contract.final_answer_allowed,
      required_user_visible_status: contract.required_user_visible_status,
      exit_code: contract.exit_code,
      blocked_reasons: contract.blocked_reasons,
      rejection_reasons: contract.rejection_reasons,
      generated_output_mismatch: contract.generated_output_mismatch,
      candidate_state: candidateState,
      blocker_triage: triage,
      previous_bookkeeping_snapshot: previousTransientFindings
    };
    await saveSuperpowersState(workdir, triagedLatest);
    await deriveSuperpowersArtifacts(workdir);
  }
  const finalState = await loadSuperpowersState(workdir);
  const finalAttempt = finalState.attempts.find((attempt) => attempt.task_attempt_id === finalState.current_attempt_id);
  await appendSuperpowersEvent(workdir, "final_gate", {
    ...(finalAttempt ? {
      task_id: finalState.meta.task_id,
      task_attempt_id: finalAttempt.task_attempt_id,
      source_bundle_hash: finalAttempt.source_bundle_hash,
      product_source_hash: finalAttempt.product_source_hash,
      technical_plan_hash: finalAttempt.technical_plan_hash,
      acceptance_checklist_hash: finalAttempt.acceptance_checklist_hash
    } : {}),
    product_goal_complete: contract.product_goal_complete,
    completion_output_status: contract.completion_output_status,
    blocker_triage: contract.blocker_triage
  });
  return { ...contract, blocker_triage: contract.blocker_triage ?? triage, errors };
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

function candidateStateFromContract(contract: CompletionOutputContract): FinalGateCandidateState {
  return {
    final_gate_ran: contract.final_gate_ran,
    product_goal_complete: contract.product_goal_complete,
    acceptance_target_status: contract.acceptance_target_status,
    completion_output_status: contract.completion_output_status,
    generated_output_mismatch: false,
    source: "trusted_evidence_kernel"
  };
}

function previousTransientBookkeepingFindings(state: SuperpowersTaskState): string[] {
  const findings: string[] = [];
  const finalRecord = state.final as SuperpowersTaskState["final"] & Record<string, unknown>;
  const metaRecord = state.meta as SuperpowersTaskState["meta"] & Record<string, unknown>;
  const gate = isRecord(state.gates?.final_gate) ? state.gates.final_gate : {};
  collectTransient(findings, "final", finalRecord);
  collectTransient(findings, "meta", metaRecord);
  collectTransient(findings, "gates.final_gate", gate);
  return [...new Set(findings)];
}

function collectTransient(findings: string[], label: string, record: Record<string, unknown>): void {
  const status = typeof record.completion_output_status === "string" ? record.completion_output_status : "";
  if (status === "blocked" || status === "reject") {
    findings.push(`${label}.completion_output_status=${status}`);
  }
  if (record.generated_output_mismatch === true) {
    findings.push(`${label}.generated_output_mismatch=true`);
  }
  if (Array.isArray(record.false_completion_phrase_findings) && record.false_completion_phrase_findings.length > 0) {
    findings.push(`${label}.false_completion_phrase_findings=${record.false_completion_phrase_findings.length}`);
  }
}
