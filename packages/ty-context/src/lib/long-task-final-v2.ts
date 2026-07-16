import { compileDeliveryContract } from "./long-task-delivery-compiler.js";
import type {
  CheckExecutionResultV2,
  FinalReceiptV2,
  LongTaskFindingV2,
} from "./long-task-delivery-types.js";
import {
  activeAuthorityIdentityMatches,
  assertMatchingActiveBinding,
  loadActiveLongTaskAuthority,
  writeFinalReceipt,
} from "./long-task-state.js";
import { assertVerifierAuthorityCurrent } from "./long-task-freshness.js";
import {
  allCompiledChecks,
  runDeliveryChecks,
} from "./long-task-verifier-v2.js";
import {
  captureWorkspaceFingerprint,
  createWorkspaceSnapshot,
  currentGitState,
  repositoryRoot,
} from "./long-task-workspace.js";

export async function runDeliveryFinalGate(
  workdirInput: string,
): Promise<FinalReceiptV2> {
  const startedAt = new Date().toISOString();
  const repository = await repositoryRoot(process.cwd());
  const active = (
    await loadActiveLongTaskAuthority(repository, { migrate_legacy: true })
  ).authority;
  if (!active) throw new Error("active_task_missing");
  if (active.workdir !== (await resolved(workdirInput)))
    throw new Error("active_task_workdir_mismatch");
  await assertVerifierAuthorityCurrent(repository, active.verifier_identity);
  const acceptedAuthority = {
    task_id: active.task_id,
    authority_revision: active.authority_revision,
    compiled_identity: active.active_authority_identity,
    worktree_identity: active.worktree_identity,
  };
  const candidate = await currentGitState(repository);
  if (candidate.dirty.length)
    throw new Error(
      `final_gate_requires_clean_candidate_commit:${candidate.dirty.join(",")}`,
    );

  const compiled = await compileDeliveryContract(active.workdir, repository, {
    live_gate: true,
    initial_task_base: active.initial_task_base,
    authority_revision: active.authority_revision,
    require_completion_gate: true,
  });
  await assertMatchingActiveBinding(compiled);
  const before = await captureWorkspaceFingerprint(repository);
  const snapshot = await createWorkspaceSnapshot(
    repository,
    active.workdir,
    `final-${compiled.task.id}`,
  );
  try {
    const run = await runDeliveryChecks(
      compiled,
      snapshot,
      allCompiledChecks(compiled),
      true,
      true,
    );
    const after = await captureWorkspaceFingerprint(repository);
    const gitAfter = await currentGitState(repository);
    if (
      after.identity !== before.identity ||
      gitAfter.head !== candidate.head ||
      gitAfter.tree !== candidate.tree ||
      gitAfter.dirty.length
    )
      run.findings.push({
        code: "workspace_changed_during_final_gate",
        outcome_key: null,
        check_key: null,
        message: "The workspace changed while Live Final Gate was running.",
        next_action:
          "Stop concurrent mutation and rerun the complete Live Final Gate.",
      });
    let activeAuthorityChanged = false;
    try {
      const currentActive = (
        await loadActiveLongTaskAuthority(repository)
      ).authority;
      activeAuthorityChanged =
        !currentActive ||
        !activeAuthorityIdentityMatches(
          currentActive,
          acceptedAuthority,
        );
    } catch {
      activeAuthorityChanged = true;
    }
    if (activeAuthorityChanged)
      run.findings.push({
        code: "active_authority_changed_during_final_gate",
        outcome_key: null,
        check_key: null,
        message:
          "Active Authority changed while Live Final Gate was running.",
        next_action:
          "Review the new Authority Revision and rerun the complete Live Final Gate.",
      });
    const outcomeResults = projectOutcomes(
      compiled.outcomes.map((outcome) => outcome.key),
      run.check_results,
      run.findings,
    );
    const globalChecks = run.check_results.filter(
      (check) => check.outcome_key === null,
    );
    const globalHardFailure = globalChecks.some(
      (check) =>
        check.status !== "passed" &&
        check.status !== "blocked_external",
    );
    const globalBlocked = globalChecks.some(
      (check) => check.status === "blocked_external",
    );
    const failed =
      globalHardFailure ||
      Object.values(outcomeResults).includes("failed") ||
      run.findings.some((finding) => finding.code !== "blocked_external");
    const blocked =
      globalBlocked ||
      Object.values(outcomeResults).includes("blocked_external") ||
      run.findings.some((finding) => finding.code === "blocked_external");
    const workflowStatus: FinalReceiptV2["workflow_status"] = failed
      ? "needs_work"
      : blocked
        ? "blocked_external"
        : compiled.global.acceptance.external_confirmations.length
          ? "machine_accepted_external_pending"
          : "machine_accepted";
    return writeFinalReceipt(repository, active.workdir, {
      schema_version: "long-task-final-receipt-v2",
      authority_scope: "audit_only",
      reusable_for_acceptance: false,
      workflow_status: workflowStatus,
      compiled_identity: compiled.compiled_identity,
      contract_sha256: compiled.contract_sha256,
      snapshot_sha256: snapshot.manifest.snapshot_sha256,
      git_head: candidate.head,
      git_tree: candidate.tree,
      source_hashes: compiled.source_hashes,
      context_hashes: compiled.context_snapshot.sha256,
      verifier_identity: compiled.verifier_identity,
      check_results: run.check_results,
      outcome_results: outcomeResults,
      external_confirmations: compiled.global.acceptance.external_confirmations,
      findings: run.findings,
      snapshot_preparation_ms: snapshot.preparation_ms,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
    });
  } finally {
    await snapshot.dispose();
  }
}

function projectOutcomes(
  outcomeKeys: string[],
  checks: CheckExecutionResultV2[],
  findings: LongTaskFindingV2[],
): Record<string, "passed" | "failed" | "blocked_external"> {
  return Object.fromEntries(
    outcomeKeys.map((outcomeKey) => {
      const owned = checks.filter((check) => check.outcome_key === outcomeKey);
      const ownFindings = findings.filter(
        (finding) =>
          finding.outcome_key === outcomeKey || finding.outcome_key === null,
      );
      const status =
        owned.some(
          (check) =>
            check.status !== "passed" && check.status !== "blocked_external",
        ) || ownFindings.some((finding) => finding.code !== "blocked_external")
          ? "failed"
          : owned.some((check) => check.status === "blocked_external")
            ? "blocked_external"
            : "passed";
      return [outcomeKey, status];
    }),
  );
}

async function resolved(workdir: string): Promise<string> {
  return (await import("node:path")).default.resolve(workdir);
}
