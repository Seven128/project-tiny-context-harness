import path from "node:path";
import type {
  CheckExecutionResultV1,
  LongTaskFindingV1,
} from "./long-task-delivery-types.js";
import type { DeliverySetReceiptV1 } from "./long-task-delivery-set-types.js";
import {
  clearActiveBinding,
  readActiveLongTaskBinding,
  readCompiledDeliveryContract,
} from "./long-task-state.js";
import {
  clearDeliverySetReceipt,
  readCompiledDeliverySet,
  writeDeliverySetReceipt,
} from "./long-task-delivery-set-state.js";
import {
  deliverySetCompileFreshness,
  readDeliverySetStatus,
} from "./long-task-delivery-set-status.js";
import {
  allCompiledChecks,
  runDeliveryChecks,
} from "./long-task-verifier-v1.js";
import {
  captureWorkspaceManifest,
  createWorkspaceSnapshot,
  currentGitState,
  repositoryRoot,
} from "./long-task-workspace.js";
import { runDeliverySetIntegrationChecks } from "./long-task-delivery-set-integration.js";

export type DeliverySetFinalOutputV1 =
  | DeliverySetReceiptV1
  | {
      schema_version: "long-task-delivery-set-final-result-v1";
      workflow_status: "needs_work" | "blocked_external";
      compiled_set_identity: string;
      snapshot_sha256: string;
      findings: LongTaskFindingV1[];
      child_check_results: Record<string, CheckExecutionResultV1[]>;
      integration_check_results: CheckExecutionResultV1[];
      started_at: string;
      completed_at: string;
    };

export async function runDeliverySetFinalGate(
  setdir: string,
): Promise<DeliverySetFinalOutputV1> {
  const startedAt = new Date().toISOString();
  const compiled = await readCompiledDeliverySet(setdir);
  const active = await readActiveLongTaskBinding(compiled.repository_root);
  if (
    active?.mode !== "delivery_set" ||
    active.set_workdir !== compiled.set_workdir ||
    active.compiled_set_identity !== compiled.compiled_set_identity
  )
    throw new Error("active_delivery_set_identity_mismatch");
  const status = await readDeliverySetStatus(setdir);
  if (status.remaining_contracts.length || status.stale_contracts.length)
    throw new Error("delivery_set_child_gates_incomplete_or_stale");
  const candidate = await currentGitState(compiled.repository_root);
  if (candidate.dirty.length)
    throw new Error(
      `final_gate_requires_clean_candidate_commit:${candidate.dirty.join(",")}`,
    );
  const exclusions = compiled.contracts.map(
    (contract) => contract.resolved_workdir,
  );
  const snapshot = await createWorkspaceSnapshot(
    compiled.repository_root,
    compiled.set_workdir,
    `delivery-set-final-${compiled.definition.set.id}`,
    exclusions,
  );
  try {
    const findings: LongTaskFindingV1[] = (
      await deliverySetCompileFreshness(compiled)
    ).map((code) => ({
      code,
      outcome_key: null,
      check_key: null,
      message: "A compiled Delivery Set authority input changed.",
      next_action: "Review the change and recompile the Delivery Set.",
    }));
    const childResults: Record<string, CheckExecutionResultV1[]> = {};
    const childIdentities: Record<string, string> = {};
    const children = await Promise.all(
      compiled.contracts.map(async (entry) => ({
        entry,
        child: await readCompiledDeliveryContract(entry.resolved_workdir),
      })),
    );
    const setScope = {
      allowed: children.flatMap(({ child }) =>
        child.outcomes.flatMap((outcome) => [
          ...outcome.technical.expected_change_paths,
          ...outcome.technical.allowed_support_paths,
        ]),
      ),
      forbidden: [
        ...compiled.definition.global.technical.forbidden_paths,
        ...children.flatMap(({ child }) => [
          ...child.global.technical.forbidden_paths,
          ...child.outcomes.flatMap(
            (outcome) => outcome.technical.forbidden_paths,
          ),
        ]),
      ],
    };
    for (const { entry, child } of children) {
      if (
        child.delivery_set?.set_identity !== compiled.compiled_set_identity ||
        child.delivery_set.contract_key !== entry.key
      ) {
        findings.push({
          code: "delivery_set_child_identity_mismatch",
          outcome_key: null,
          check_key: null,
          message: `Child Contract is not bound to this Delivery Set: ${entry.key}`,
          next_action:
            "Recompile the Child Contract under the active Delivery Set.",
        });
        continue;
      }
      const run = await runDeliveryChecks(
        child,
        snapshot,
        allCompiledChecks(child),
        true,
        true,
        setScope,
      );
      childResults[entry.key] = run.check_results;
      childIdentities[entry.key] = child.compiled_identity;
      findings.push(...run.findings);
    }
    const integration = await runDeliverySetIntegrationChecks(
      compiled.integration_checks,
      snapshot.manifest,
      snapshot.root,
    );
    const integrationResults = integration.results;
    findings.push(...integration.findings);
    const afterManifest = await captureWorkspaceManifest(
      compiled.repository_root,
      compiled.set_workdir,
      undefined,
      exclusions,
    );
    const gitAfter = await currentGitState(compiled.repository_root);
    if (
      afterManifest.snapshot_sha256 !== snapshot.manifest.snapshot_sha256 ||
      gitAfter.head !== candidate.head ||
      gitAfter.tree !== candidate.tree ||
      gitAfter.dirty.length
    )
      findings.push({
        code: "workspace_changed_during_final_gate",
        outcome_key: null,
        check_key: null,
        message:
          "The workspace changed while Delivery Set Final Gate was running.",
        next_action:
          "Stop concurrent mutation and rerun the complete Final Gate.",
      });
    const blocked = [
      ...Object.values(childResults).flat(),
      ...integrationResults,
    ].some((result) => result.status === "blocked_external");
    const failed = [
      ...Object.values(childResults).flat(),
      ...integrationResults,
    ].some((result) => result.status === "failed");
    const completedAt = new Date().toISOString();
    if (!failed && !blocked && findings.length === 0) {
      return writeDeliverySetReceipt(compiled, {
        schema_version: "long-task-delivery-set-receipt-v1",
        workflow_status:
          compiled.definition.global.acceptance.external_confirmations.length >
          0
            ? "machine_accepted_external_pending"
            : "delivery_set_accepted",
        compiled_set_identity: compiled.compiled_set_identity,
        snapshot_sha256: snapshot.manifest.snapshot_sha256,
        git_head: candidate.head,
        git_tree: candidate.tree,
        source_hashes: compiled.source_hashes,
        context_hashes: compiled.context_snapshot.sha256,
        verifier_identity: compiled.verifier_identity,
        child_contract_identities: childIdentities,
        child_check_results: childResults,
        integration_check_results: integrationResults,
        findings: [],
        started_at: startedAt,
        completed_at: completedAt,
      });
    }
    await clearDeliverySetReceipt(compiled);
    return {
      schema_version: "long-task-delivery-set-final-result-v1",
      workflow_status: blocked && !failed ? "blocked_external" : "needs_work",
      compiled_set_identity: compiled.compiled_set_identity,
      snapshot_sha256: snapshot.manifest.snapshot_sha256,
      findings,
      child_check_results: childResults,
      integration_check_results: integrationResults,
      started_at: startedAt,
      completed_at: completedAt,
    };
  } finally {
    await snapshot.dispose();
  }
}

export async function stopCheckDeliverySet(
  setdirInput: string,
  messageText = "",
): Promise<{ continue: boolean; reason: string; message?: string }> {
  const root = await repositoryRoot(process.cwd());
  const active = await readActiveLongTaskBinding(root);
  if (!active) return { continue: true, reason: "no_active_task" };
  if (
    active.mode !== "delivery_set" ||
    active.set_workdir !== path.resolve(setdirInput)
  )
    return { continue: false, reason: "active_delivery_set_workdir_mismatch" };
  try {
    const status = await readDeliverySetStatus(active.set_workdir);
    if (
      status.final_result === "delivery_set_accepted_fresh" ||
      status.final_result === "machine_accepted_external_pending_fresh"
    )
      return { continue: true, reason: status.final_result };
    return {
      continue: false,
      reason: `delivery_set_${status.final_result}`,
      message:
        messageText ||
        status.findings.at(-1)?.next_action ||
        "Complete every Child Gate and run the Delivery Set Final Gate.",
    };
  } catch (error) {
    return {
      continue: false,
      reason: "delivery_set_state_invalid",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function closeDeliverySet(setdir: string): Promise<void> {
  const compiled = await readCompiledDeliverySet(setdir);
  const active = await readActiveLongTaskBinding(compiled.repository_root);
  if (!active) return;
  if (
    active.mode !== "delivery_set" ||
    active.set_workdir !== compiled.set_workdir ||
    active.compiled_set_identity !== compiled.compiled_set_identity
  )
    throw new Error("active_delivery_set_identity_mismatch");
  const status = await readDeliverySetStatus(setdir);
  if (
    status.final_result !== "delivery_set_accepted_fresh" &&
    status.final_result !== "machine_accepted_external_pending_fresh"
  )
    throw new Error(`close_requires_fresh_delivery_set:${status.final_result}`);
  await clearActiveBinding(compiled.repository_root, compiled.set_workdir);
}
