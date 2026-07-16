import path from "node:path";
import { compileDeliveryContract } from "./long-task-delivery-compiler.js";
import type {
  LongTaskFindingV2,
  OutcomeStatusV2,
} from "./long-task-delivery-types.js";
import { runDeliveryFinalGate } from "./long-task-final-v2.js";
import { deliveryCompileFreshness } from "./long-task-freshness.js";
import {
  clearActiveBinding,
  readActiveLongTaskBinding,
  readCompiledDeliveryContract,
  readFinalReceipt,
  readProgressRecords,
} from "./long-task-state.js";
import {
  type AuditGateStatusV2,
  projectDeliveryStatus,
} from "./long-task-status-projection.js";
import {
  captureWorkspaceManifest,
  currentGitState,
  repositoryRoot,
} from "./long-task-workspace.js";

export interface DeliveryStatusV2 {
  schema_version: "long-task-status-v2";
  task_id: string;
  compiled_identity: string;
  effective_risk: "standard" | "strict";
  workspace_snapshot_sha256: string;
  acceptance_authority: "live_final_gate_required";
  final_result: AuditGateStatusV2;
  outcomes: Record<string, OutcomeStatusV2>;
  ready_outcomes: string[];
  ready_for_implementation: string[];
  needs_reverify: string[];
  progress_passing: string[];
  progress_failing: string[];
  findings: LongTaskFindingV2[];
}

export async function readDeliveryStatus(
  workdir: string,
): Promise<DeliveryStatusV2> {
  const compiled = await readCompiledDeliveryContract(workdir);
  const current = await captureWorkspaceManifest(
    compiled.repository_root,
    compiled.workdir,
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
    schema_version: "long-task-status-v2",
    task_id: compiled.task.id,
    compiled_identity: compiled.compiled_identity,
    effective_risk: compiled.effective_risk,
    workspace_snapshot_sha256: current.snapshot_sha256,
    acceptance_authority: "live_final_gate_required",
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
    schema_version: "long-task-resume-v2",
    task: {
      id: compiled.task.id,
      title: compiled.task.title,
      goal: compiled.task.goal,
    },
    contract_identity: compiled.compiled_identity,
    authority_revision: compiled.authority_revision,
    effective_risk: compiled.effective_risk,
    context_refs: compiled.task.context_refs,
    git,
    acceptance_authority: "live_final_gate_required",
    last_gate: status.final_result,
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

export async function doctorDeliveryTask(
  workdirInput: string,
): Promise<Record<string, unknown>> {
  const root = await repositoryRoot(process.cwd());
  const active = await readActiveLongTaskBinding(root);
  if (!active) return { status: "no_active_task", healthy: true };
  if (active.workdir !== path.resolve(workdirInput))
    throw new Error("active_task_workdir_mismatch");
  const compiled = await compileDeliveryContract(active.workdir, root, {
    live_gate: true,
    initial_task_base: active.initial_task_base,
    authority_revision: active.authority_revision,
    require_completion_gate: true,
  });
  const findings: string[] = [];
  if (compiled.compiled_identity !== active.active_authority_identity)
    findings.push("active_authority_identity_mismatch");
  let cache = "available";
  try {
    await readCompiledDeliveryContract(active.workdir);
  } catch {
    cache = "missing_or_invalid";
  }
  return {
    schema_version: "long-task-doctor-v2",
    healthy: findings.length === 0,
    task_id: active.task_id,
    authority_revision: active.authority_revision,
    marker_and_record: "matched",
    contract: "available",
    current_authority_identity: compiled.compiled_identity,
    verifier_identity: compiled.verifier_identity.bundle_sha256,
    hook: "available",
    source_context_fresh: findings.length === 0,
    compiled_cache: cache,
    findings,
  };
}

export async function stopCheckDeliveryTask(
  workdirInput: string,
  messageText = "",
): Promise<{ continue: boolean; reason: string; message?: string }> {
  const root = await repositoryRoot(process.cwd());
  let active;
  try {
    active = await readActiveLongTaskBinding(root);
  } catch (error) {
    return {
      continue: false,
      reason: "long_task_state_invalid",
      message: message(error),
    };
  }
  if (!active) return { continue: true, reason: "no_active_task" };
  if (active.workdir !== path.resolve(workdirInput))
    return { continue: false, reason: "active_task_workdir_mismatch" };
  try {
    const result = await runDeliveryFinalGate(active.workdir);
    if (
      result.workflow_status === "machine_accepted" ||
      result.workflow_status === "machine_accepted_external_pending"
    ) {
      await clearActiveBinding(root, active.workdir);
      return {
        continue: true,
        reason: result.workflow_status,
        ...(result.external_confirmations.length
          ? {
              message: `External confirmations pending: ${result.external_confirmations
                .map((item) => item.key)
                .join(",")}`,
            }
          : {}),
      };
    }
    return {
      continue: false,
      reason: `live_final_gate_${result.workflow_status}`,
      message:
        messageText ||
        result.findings.at(-1)?.next_action ||
        "Repair the failing Check and rerun Stop.",
    };
  } catch (error) {
    return {
      continue: false,
      reason: "live_final_gate_error",
      message: message(error),
    };
  }
}

export async function closeDeliveryTask(workdir: string): Promise<void> {
  const root = await repositoryRoot(process.cwd());
  const active = await readActiveLongTaskBinding(root);
  if (!active || active.workdir !== path.resolve(workdir))
    throw new Error("active_task_missing_or_mismatched");
  const result = await runDeliveryFinalGate(active.workdir);
  if (
    result.workflow_status !== "machine_accepted" &&
    result.workflow_status !== "machine_accepted_external_pending"
  )
    throw new Error(`close_live_final_gate_failed:${result.workflow_status}`);
  await clearActiveBinding(root, active.workdir);
}

function nextAction(status: DeliveryStatusV2): string {
  if (status.findings.length) return status.findings.at(-1)!.next_action;
  if (status.ready_outcomes.length)
    return `Implement and verify ready Outcome: ${status.ready_outcomes[0]}.`;
  return "Create a clean candidate commit; Stop will run the authoritative Live Final Gate.";
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
