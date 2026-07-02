import { appendSuperpowersEvent } from "./superpowers-task-events.js";
import { deriveSuperpowersArtifacts } from "./superpowers-task-derive.js";
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
  const latest = await loadSuperpowersState(workdir);
  const completionErrors = completionConditionErrors(latest);
  const errors = [...new Set([...report.errors, ...completionErrors])];
  const complete = errors.length === 0;
  latest.final.product_goal_complete = complete;
  latest.meta.product_goal_complete = complete;
  latest.final.acceptance_target_status = complete ? "complete" : "partial";
  latest.meta.acceptance_target_status = latest.final.acceptance_target_status;
  latest.final.audit_task_complete = true;
  latest.meta.audit_task_complete = true;
  latest.final.completion_basis = complete ? ["all_required_acs_complete", "validator_passed", "auditor_no_blocker"] : [];
  latest.gates.validator = { status: errors.length === 0 ? "pass" : "blocked", errors };
  await saveSuperpowersState(workdir, latest);
  await deriveSuperpowersArtifacts(workdir);
  await appendSuperpowersEvent(workdir, "final_gate", { product_goal_complete: complete });
  return { product_goal_complete: complete, errors };
}

