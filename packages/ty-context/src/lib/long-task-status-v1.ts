import path from "node:path";
import type {
  LongTaskFindingV1,
  OutcomeStatusV1,
} from "./long-task-delivery-types.js";
import { deliveryCompileFreshness } from "./long-task-freshness.js";
import {
  clearActiveBinding,
  readActiveLongTaskBinding,
  readCompiledDeliveryContract,
  readFinalReceipt,
  readProgressRecords,
} from "./long-task-state.js";
import { projectDeliveryStatus } from "./long-task-status-projection.js";
import { deliverySetWorkspaceExclusions } from "./long-task-delivery-set-state.js";
import {
  captureWorkspaceManifest,
  currentGitState,
  repositoryRoot,
} from "./long-task-workspace.js";

export interface DeliveryStatusV1 {
  schema_version: "long-task-status-v1";
  task_id: string;
  compiled_identity: string;
  effective_risk: "standard" | "strict";
  workspace_snapshot_sha256: string;
  final_result:
    | "none"
    | "machine_accepted_fresh"
    | "machine_accepted_external_pending_fresh"
    | "accepted_stale"
    | "needs_work";
  outcomes: Record<string, OutcomeStatusV1>;
  ready_outcomes: string[];
  ready_for_implementation: string[];
  needs_reverify: string[];
  progress_passing: string[];
  progress_failing: string[];
  findings: LongTaskFindingV1[];
}

export async function readDeliveryStatus(
  workdir: string,
): Promise<DeliveryStatusV1> {
  const compiled = await readCompiledDeliveryContract(workdir);
  const exclusions = await deliverySetWorkspaceExclusions(compiled);
  const current = await captureWorkspaceManifest(
    compiled.repository_root,
    compiled.workdir,
    undefined,
    exclusions,
  );
  const stale = await deliveryCompileFreshness(compiled);
  const progress = await readProgressRecords(workdir);
  let receipt = null;
  let receiptError: string | null = null;
  try {
    receipt = await readFinalReceipt(
      compiled.repository_root,
      compiled.workdir,
    );
  } catch (error) {
    receiptError = message(error);
  }
  const projection = projectDeliveryStatus({
    compiled,
    manifest: current,
    stale,
    progress,
    receipt,
    receiptError,
  });
  return {
    schema_version: "long-task-status-v1",
    task_id: compiled.task.id,
    compiled_identity: compiled.compiled_identity,
    effective_risk: compiled.effective_risk,
    workspace_snapshot_sha256: current.snapshot_sha256,
    final_result: projection.finalResult,
    outcomes: projection.outcomes,
    ready_outcomes: projection.readyOutcomes,
    ready_for_implementation: projection.readyOutcomes,
    needs_reverify: projection.needsReverify,
    progress_passing: projection.progressPassing,
    progress_failing: projection.progressFailing,
    findings: projection.findings,
  };
}

export async function resumeDeliveryTask(
  workdir: string,
): Promise<Record<string, unknown>> {
  const compiled = await readCompiledDeliveryContract(workdir);
  const [status, git] = await Promise.all([
    readDeliveryStatus(workdir),
    currentGitState(compiled.repository_root),
  ]);
  return {
    schema_version: "long-task-resume-v1",
    task: {
      id: compiled.task.id,
      title: compiled.task.title,
      goal: compiled.task.goal,
    },
    contract_identity: compiled.compiled_identity,
    effective_risk: compiled.effective_risk,
    context_refs: compiled.task.context_refs,
    git,
    final_result: status.final_result,
    outcomes: status.outcomes,
    ready_outcomes: status.ready_outcomes,
    ready_for_implementation: status.ready_for_implementation,
    needs_reverify: status.needs_reverify,
    progress_passing: status.progress_passing,
    progress_failing: status.progress_failing,
    recent_findings: status.findings,
    next_safe_action: nextAction(status),
  };
}

export async function stopCheckDeliveryTask(
  workdirInput: string,
  messageText = "",
): Promise<{ continue: boolean; reason: string; message?: string }> {
  const root = await repositoryRoot(process.cwd());
  const active = await readActiveLongTaskBinding(root);
  if (!active) return { continue: true, reason: "no_active_task" };
  if (active.mode === "delivery_set")
    return { continue: false, reason: "delivery_set_requires_set_stop_check" };
  if (active.workdir !== path.resolve(workdirInput))
    return { continue: false, reason: "active_task_workdir_mismatch" };
  try {
    const status = await readDeliveryStatus(active.workdir);
    if (
      status.final_result === "machine_accepted_fresh" ||
      status.final_result === "machine_accepted_external_pending_fresh"
    )
      return { continue: true, reason: status.final_result };
    return {
      continue: false,
      reason: `long_task_${status.final_result}`,
      message:
        messageText ||
        status.findings.at(-1)?.next_action ||
        "Run the complete Final Gate.",
    };
  } catch (error) {
    return {
      continue: false,
      reason: "long_task_state_invalid",
      message: message(error),
    };
  }
}

export async function closeDeliveryTask(workdir: string): Promise<void> {
  const compiled = await readCompiledDeliveryContract(workdir);
  const status = await readDeliveryStatus(workdir);
  if (
    status.final_result !== "machine_accepted_fresh" &&
    status.final_result !== "machine_accepted_external_pending_fresh"
  )
    throw new Error(`close_requires_fresh_accepted:${status.final_result}`);
  await clearActiveBinding(compiled.repository_root, compiled.workdir);
}

function nextAction(status: DeliveryStatusV1): string {
  if (
    status.final_result === "machine_accepted_fresh" ||
    status.final_result === "machine_accepted_external_pending_fresh"
  )
    return "Run ty-context long-task close when external delivery handoff is ready.";
  if (status.findings.length) return status.findings.at(-1)!.next_action;
  if (status.ready_outcomes.length)
    return `Implement and verify ready Outcome: ${status.ready_outcomes[0]}.`;
  return "Review Outcome dependencies and current findings.";
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
