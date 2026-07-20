import path from "node:path";
import type {
  CheckExecutionResultV2,
  LongTaskFindingV2,
} from "./long-task-delivery-types.js";
import { compileDeliveryContract } from "./long-task-delivery-compiler.js";
import type {
  AuthorityRevisionDecisionV2,
  AuthorityRevisionProposalV2,
} from "./long-task-authority-revision-types.js";
import { projectAuthorityRevisionDecision } from "./long-task-authority-revision-summary.js";
import {
  activeAuthorityIdentityMatches,
  loadActiveLongTaskAuthority,
} from "./long-task-state.js";
import {
  allCompiledChecks,
  runDeliveryChecks,
  selectChecks,
} from "./long-task-verifier-v2.js";
import {
  createWorkspaceSnapshot,
  repositoryRoot,
} from "./long-task-workspace.js";

export interface AuthorityRevisionDiagnosisV2 {
  schema_version: "long-task-authority-revision-diagnosis-v2";
  status:
    | "no_authority_change"
    | "monotonic_revision_available"
    | "scope_candidate_exercised"
    | "scope_candidate_previewed"
    | "protected_change_previewed"
    | "candidate_stale";
  active_compiled_identity: string;
  candidate_compiled_identity: string;
  revision: AuthorityRevisionDecisionV2 | null;
  acceptance_authorized: false;
  progress_written: false;
  pending_revision_written: false;
  diagnostics_executed: boolean;
  selected_outcome: string | null;
  selected_check: string | null;
  skipped_candidate_checks: string[];
  snapshot_sha256: string | null;
  check_results: CheckExecutionResultV2[];
  findings: LongTaskFindingV2[];
  completed_at: string;
}

export async function diagnoseAuthorityRevision(
  workdirInput: string,
  selection: { outcome?: string; check?: string } = {},
): Promise<AuthorityRevisionDiagnosisV2> {
  const repository = await repositoryRoot(process.cwd());
  const loaded = await loadActiveLongTaskAuthority(repository, {
    migrate_legacy: true,
  });
  const active = loaded.authority;
  if (!active) throw new Error("active_task_missing");
  const workdir = path.resolve(workdirInput);
  if (active.workdir !== workdir)
    throw new Error("active_task_workdir_mismatch");

  const revisionCapture: { proposal: AuthorityRevisionProposalV2 | null } = {
    proposal: null,
  };
  const candidate = await compileDeliveryContract(workdir, repository, {
    revise: true,
    previous_authority: active.authority_snapshot,
    authority_revision_mode: "diagnose",
    on_authority_revision(value) {
      revisionCapture.proposal = value;
    },
  });
  if (candidate.task.id !== active.task_id)
    throw new Error("active_task_id_mismatch");
  if (!(await activeIdentityStillMatches(repository, active)))
    throw new Error("active_authority_changed_during_revision_diagnosis");

  const proposal = revisionCapture.proposal;
  if (!proposal)
    return result({
      status: "no_authority_change",
      activeIdentity: active.active_authority_identity,
      candidateIdentity: candidate.compiled_identity,
      revision: null,
      selection,
    });

  const decision = projectAuthorityRevisionDecision(proposal);
  if (proposal.change_class === "monotonic_evidence_strengthening")
    return result({
      status: "monotonic_revision_available",
      activeIdentity: active.active_authority_identity,
      candidateIdentity: candidate.compiled_identity,
      revision: decision,
      selection,
    });
  if (proposal.change_class !== "scope_only_expansion")
    return result({
      status: "protected_change_previewed",
      activeIdentity: active.active_authority_identity,
      candidateIdentity: candidate.compiled_identity,
      revision: decision,
      selection,
    });

  const selected = selectChecks(candidate, selection);
  const activeCheckIds = new Set(
    allCompiledChecks(active.authority_snapshot).map(
      (check) => check.internal_id,
    ),
  );
  const runnable = selected.filter((check) =>
    activeCheckIds.has(check.internal_id),
  );
  const skipped = selected
    .filter((check) => !activeCheckIds.has(check.internal_id))
    .map((check) => check.internal_id)
    .sort();
  if (!runnable.length)
    return result({
      status: "scope_candidate_previewed",
      activeIdentity: active.active_authority_identity,
      candidateIdentity: candidate.compiled_identity,
      revision: decision,
      selection,
      skipped,
    });

  const snapshot = await createWorkspaceSnapshot(
    candidate.repository_root,
    candidate.workdir,
    `revision-diagnosis-${candidate.task.id}`,
  );
  try {
    const run = await runDeliveryChecks(candidate, snapshot, runnable, true);
    const unchanged = await activeIdentityStillMatches(repository, active);
    if (!unchanged) run.findings.push(activeAuthorityChangedFinding());
    return result({
      status: unchanged ? "scope_candidate_exercised" : "candidate_stale",
      activeIdentity: active.active_authority_identity,
      candidateIdentity: candidate.compiled_identity,
      revision: decision,
      selection,
      skipped,
      diagnosticsExecuted: true,
      snapshotSha256: snapshot.manifest.snapshot_sha256,
      checkResults: run.check_results,
      findings: run.findings,
    });
  } finally {
    await snapshot.dispose();
  }
}

async function activeIdentityStillMatches(
  repository: string,
  active: NonNullable<
    Awaited<ReturnType<typeof loadActiveLongTaskAuthority>>["authority"]
  >,
): Promise<boolean> {
  try {
    const current = (await loadActiveLongTaskAuthority(repository)).authority;
    return (
      current !== null &&
      activeAuthorityIdentityMatches(current, {
        task_id: active.task_id,
        authority_revision: active.authority_revision,
        compiled_identity: active.active_authority_identity,
        worktree_identity: active.worktree_identity,
      })
    );
  } catch {
    return false;
  }
}

function activeAuthorityChangedFinding(): LongTaskFindingV2 {
  return {
    code: "active_authority_changed_during_revision_diagnosis",
    outcome_key: null,
    check_key: null,
    message: "Active Authority changed while candidate diagnosis was running.",
    next_action:
      "Discard these transient results and diagnose the current Contract against the new Active Authority.",
  };
}

function result(input: {
  status: AuthorityRevisionDiagnosisV2["status"];
  activeIdentity: string;
  candidateIdentity: string;
  revision: AuthorityRevisionDecisionV2 | null;
  selection: { outcome?: string; check?: string };
  skipped?: string[];
  diagnosticsExecuted?: boolean;
  snapshotSha256?: string;
  checkResults?: CheckExecutionResultV2[];
  findings?: LongTaskFindingV2[];
}): AuthorityRevisionDiagnosisV2 {
  return {
    schema_version: "long-task-authority-revision-diagnosis-v2",
    status: input.status,
    active_compiled_identity: input.activeIdentity,
    candidate_compiled_identity: input.candidateIdentity,
    revision: input.revision,
    acceptance_authorized: false,
    progress_written: false,
    pending_revision_written: false,
    diagnostics_executed: input.diagnosticsExecuted ?? false,
    selected_outcome: input.selection.outcome ?? null,
    selected_check: input.selection.check ?? null,
    skipped_candidate_checks: input.skipped ?? [],
    snapshot_sha256: input.snapshotSha256 ?? null,
    check_results: input.checkResults ?? [],
    findings: input.findings ?? [],
    completed_at: new Date().toISOString(),
  };
}
