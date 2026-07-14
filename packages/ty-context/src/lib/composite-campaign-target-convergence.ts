import { readFile } from "node:fs/promises";
import path from "node:path";
import { canonicalJson, sha256Hex } from "./composite-campaign-codec.js";
import { currentHead, runGit } from "./composite-campaign-git-baseline.js";
import {
  evaluateCampaignSnapshotGate,
  type CampaignFinalResultV1,
} from "./composite-campaign-final-gate.js";
import {
  attemptRemoteFastForward,
  openAutomaticPullRequest,
  type TargetAuthorityV1,
} from "./composite-campaign-target-delivery.js";
import {
  buildTargetFinalizationReceipt,
  buildTargetRevalidationResult,
  writeTargetRevalidationResult,
  type CampaignTargetFinalizationReceiptV1,
  type CampaignTargetRevalidationResultV1,
} from "./composite-campaign-target-receipts.js";
import {
  createTargetWorktree,
  listCampaignWorktrees,
  listRepositoryWorktrees,
  removeCampaignWorktree,
} from "./composite-campaign-worktree.js";
import type {
  TargetFinalizationOptions,
  TargetFinalizeResult,
} from "./composite-campaign-target-finalization.js";

export async function prepareTargetWorktree(options: {
  repositoryRoot: string;
  campaignId: string;
  baseCommit: string;
}) {
  const target = (await listCampaignWorktrees(options)).find((worktree) =>
    worktree.branch?.endsWith("/target"),
  );
  if (target && target.headCommit !== options.baseCommit)
    await removeCampaignWorktree({
      ...options,
      worktreePath: target.path,
      force: true,
      deleteBranch: true,
    });
  return createTargetWorktree(options);
}

export async function deliverBehindTarget(
  options: TargetFinalizationOptions,
  finalResult: CampaignFinalResultV1,
  authority: TargetAuthorityV1,
): Promise<TargetFinalizeResult> {
  if (options.autoPush === false)
    return {
      status: "external_approval_required",
      reason: "auto_push_disabled_explicit_policy_required",
      target_commit: authority.target_commit,
    };
  if (authority.remote && authority.upstream_ref) {
    const delivery = await attemptRemoteFastForward({
      repository: options.integrationWorktree,
      remote: authority.remote,
      targetBranch: options.targetBranch,
      expectedTargetCommit: authority.target_commit,
      integrationCommit: finalResult.integration_head,
    });
    if (delivery.status === "pushed")
      return accepted(
        finalResult,
        options.targetBranch,
        {
          ...authority,
          target_commit: delivery.target_commit,
          target_tree: delivery.target_tree,
        },
        "remote_fast_forward",
        null,
        true,
      );
    if (delivery.status === "target_moved")
      return {
        status: "revalidation_required",
        integration_head: finalResult.integration_head,
        reason: "target_moved",
        target_revalidation_result_path: null,
      };
    if (delivery.status === "approval_required") {
      const pullRequest = await (
        options.pullRequestOpener ?? openAutomaticPullRequest
      )({
        repository: options.integrationWorktree,
        remote: authority.remote,
        targetBranch: options.targetBranch,
        integrationBranch: options.integrationBranch,
        campaignId: options.campaignId,
      });
      return {
        status: "external_approval_required",
        reason: pullRequest
          ? `automatic_pull_request_opened:${pullRequest}`
          : "protected_branch_automatic_pull_request_unavailable",
        target_commit: authority.target_commit,
      };
    }
    return {
      status: "external_approval_required",
      reason: delivery.reason,
      target_commit: authority.target_commit,
    };
  }
  const checkedOut = (
    await listRepositoryWorktrees(options.repositoryRoot)
  ).some((worktree) => worktree.branch === options.targetBranch);
  if (checkedOut)
    return {
      status: "external_approval_required",
      reason: "local_target_checked_out_preserve_primary_worktree",
      target_commit: authority.target_commit,
    };
  await runGit(options.integrationWorktree, [
    "update-ref",
    `refs/heads/${options.targetBranch}`,
    finalResult.integration_head,
    authority.target_commit,
  ]);
  if (
    (await currentHead(options.integrationWorktree, options.targetBranch)) !==
    finalResult.integration_head
  )
    throw new Error("campaign_local_target_fast_forward_identity_mismatch");
  return accepted(
    finalResult,
    options.targetBranch,
    {
      ...authority,
      target_commit: finalResult.integration_head,
      target_tree: finalResult.integration_tree,
    },
    "local_ref_fast_forward",
    null,
    false,
  );
}

export async function revalidateTarget(
  options: TargetFinalizationOptions,
  targetWorktree: string,
  targetCommit: string,
  targetTree: string,
  sourceFinalResultSha256: string,
): Promise<CampaignTargetRevalidationResultV1 | null> {
  let evaluation = null;
  try {
    evaluation = options.snapshotEvaluator
      ? await options.snapshotEvaluator(targetWorktree)
      : options.targetRevalidation
        ? await evaluateCampaignSnapshotGate({
            campaignId: options.campaignId,
            snapshotWorktree: targetWorktree,
            sourceCoverageFile: options.targetRevalidation.sourceCoverageFile,
            sourceCoverageComplete:
              options.targetRevalidation.sourceCoverageComplete,
            slices: options.targetRevalidation.slices,
            globalConstraints: options.targetRevalidation.globalConstraints,
            phase: "target-revalidation",
          })
        : null;
  } catch {
    if (!options.targetRevalidation)
      throw new Error("target_snapshot_gate_failed");
    const sourceCoverageSha256 = sha256Hex(
      await readFile(options.targetRevalidation.sourceCoverageFile),
    );
    evaluation = {
      snapshot_head: targetCommit,
      snapshot_tree: targetTree,
      source_coverage_sha256: sourceCoverageSha256,
      final_snapshot_sha256: sha256Hex(
        canonicalJson({
          schema_version: "campaign-target-snapshot-identity-v1",
          target_commit: targetCommit,
          target_tree: targetTree,
          source_coverage_sha256: sourceCoverageSha256,
        }),
      ),
      slice_results: [],
      global_constraint_results: [],
      workflow_status: "needs_work" as const,
    };
  }
  if (!evaluation) return null;
  const result = buildTargetRevalidationResult({
    campaignId: options.campaignId,
    targetBranch: options.targetBranch,
    targetCommit,
    targetTree,
    sourceCampaignFinalResultSha256: sourceFinalResultSha256,
    evaluation,
  });
  await writeTargetRevalidationResult(
    path.join(options.campaignRoot, "target-revalidation-result.json"),
    result,
  );
  return result;
}

export function accepted(
  finalResult: CampaignFinalResultV1,
  targetBranch: string,
  authority: TargetAuthorityV1,
  basis: CampaignTargetFinalizationReceiptV1["acceptance_basis"],
  revalidation: CampaignTargetRevalidationResultV1 | null,
  pushed: boolean,
): TargetFinalizeResult {
  return {
    status: "accepted",
    target_commit: authority.target_commit,
    target_tree: authority.target_tree,
    pushed,
    receipt: buildTargetFinalizationReceipt({
      finalResult,
      targetBranch,
      targetCommit: authority.target_commit,
      targetTree: authority.target_tree,
      acceptanceBasis: basis,
      targetRevalidation: revalidation,
    }),
  };
}
