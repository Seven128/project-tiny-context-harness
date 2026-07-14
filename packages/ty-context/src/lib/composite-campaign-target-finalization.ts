import path from "node:path";
import {
  currentBranch,
  currentHead,
  gitStatus,
  runGit,
} from "./composite-campaign-git-baseline.js";
import {
  readCampaignFinalResult,
  type CampaignFinalSliceInput,
  type CampaignGlobalConstraintBindingV1,
  type CampaignSnapshotGateEvaluationV1,
} from "./composite-campaign-final-gate.js";
import {
  fastForwardIntegrationToTarget,
  isAncestor,
  openAutomaticPullRequest,
  rebaseIntegrationOntoTarget,
  resolveTargetAuthority,
} from "./composite-campaign-target-delivery.js";
import {
  accepted,
  deliverBehindTarget,
  prepareTargetWorktree,
  revalidateTarget,
} from "./composite-campaign-target-convergence.js";
import type { CampaignTargetFinalizationReceiptV1 } from "./composite-campaign-target-receipts.js";

export interface TargetRevalidationInputV1 {
  sourceCoverageFile: string;
  sourceCoverageComplete: boolean;
  slices: CampaignFinalSliceInput[];
  globalConstraints: CampaignGlobalConstraintBindingV1[];
}

export type TargetFinalizeResult =
  | {
      status: "accepted";
      target_commit: string;
      target_tree: string;
      pushed: boolean;
      receipt: CampaignTargetFinalizationReceiptV1;
    }
  | {
      status: "revalidation_required";
      integration_head: string;
      reason: "target_moved" | "target_contains_integration_but_invalid";
      target_revalidation_result_path: string | null;
    }
  | {
      status: "repair_required";
      reason: "target_rebase_conflict";
      conflicted_paths: string[];
      target_ref: string;
    }
  | {
      status: "external_approval_required";
      reason: string;
      target_commit: string;
    };

export interface TargetFinalizationOptions {
  repositoryRoot: string;
  campaignId: string;
  campaignRoot: string;
  integrationWorktree: string;
  integrationBranch: string;
  targetBranch: string;
  campaignFinalResultFile: string;
  autoPush?: boolean;
  protectedBranchMode?: "pull_request";
  preservePrimaryWorktree?: true;
  targetRevalidation?: TargetRevalidationInputV1;
  snapshotEvaluator?: (
    targetWorktree: string,
  ) => Promise<CampaignSnapshotGateEvaluationV1>;
  pullRequestOpener?: typeof openAutomaticPullRequest;
}

export async function finalizeCampaignTarget(
  options: TargetFinalizationOptions,
): Promise<TargetFinalizeResult> {
  const repository = path.resolve(options.repositoryRoot);
  const integration = path.resolve(options.integrationWorktree);
  const primary = {
    branch: await currentBranch(repository),
    head: await currentHead(repository),
    status: primaryStatusIdentity(
      await gitStatus(repository),
      options.campaignId,
    ),
  };
  if (options.preservePrimaryWorktree !== true)
    throw new Error("campaign_policy_preserve_primary_worktree_required");
  if ((options.protectedBranchMode ?? "pull_request") !== "pull_request")
    throw new Error("campaign_policy_protected_branch_mode_invalid");
  try {
    const finalResult = await readCampaignFinalResult(
      options.campaignFinalResultFile,
    );
    if (finalResult.workflow_status !== "ready_to_merge")
      throw new Error("campaign_final_gate_not_ready");
    if ((await currentBranch(integration)) !== options.integrationBranch)
      throw new Error("campaign_integration_branch_mismatch");
    if ((await currentHead(integration)) !== finalResult.integration_head)
      throw new Error("campaign_integration_changed_after_final_gate");
    const liveIntegrationTree = (
      await runGit(integration, [
        "rev-parse",
        `${finalResult.integration_head}^{tree}`,
      ])
    ).stdout.trim();
    if (liveIntegrationTree !== finalResult.integration_tree)
      throw new Error("campaign_integration_tree_changed_after_final_gate");
    const authority = await resolveTargetAuthority({
      repository: integration,
      targetBranch: options.targetBranch,
    });
    if (authority.target_commit === finalResult.integration_head)
      return accepted(
        finalResult,
        options.targetBranch,
        authority,
        "exact_commit",
        null,
        false,
      );
    if (authority.target_tree === finalResult.integration_tree)
      return accepted(
        finalResult,
        options.targetBranch,
        authority,
        "exact_tree",
        null,
        false,
      );

    const targetWorktree = await prepareTargetWorktree({
      repositoryRoot: repository,
      campaignId: options.campaignId,
      baseCommit: authority.target_commit,
    });
    const revalidation = await revalidateTarget(
      options,
      targetWorktree.path,
      authority.target_commit,
      authority.target_tree,
      finalResult.result_sha256,
    );
    if (revalidation?.workflow_status === "target_verified")
      return accepted(
        finalResult,
        options.targetBranch,
        authority,
        "target_snapshot_revalidated",
        revalidation,
        false,
      );

    if (
      await isAncestor(
        integration,
        authority.target_commit,
        finalResult.integration_head,
      )
    )
      return deliverBehindTarget(options, finalResult, authority, revalidation);

    if (
      await isAncestor(
        integration,
        finalResult.integration_head,
        authority.target_commit,
      )
    ) {
      const integrationHead = await fastForwardIntegrationToTarget(
        integration,
        authority.authoritative_ref,
      );
      return {
        status: "revalidation_required",
        integration_head: integrationHead,
        reason: "target_contains_integration_but_invalid",
        target_revalidation_result_path: revalidation
          ? path.join(options.campaignRoot, "target-revalidation-result.json")
          : null,
      };
    }

    const rebased = await rebaseIntegrationOntoTarget(
      integration,
      authority.authoritative_ref,
    );
    if (rebased.status === "repair_required")
      return {
        status: "repair_required",
        reason: "target_rebase_conflict",
        conflicted_paths: rebased.conflicted_paths,
        target_ref: rebased.target_ref,
      };
    return {
      status: "revalidation_required",
      integration_head: rebased.integration_head,
      reason: "target_moved",
      target_revalidation_result_path: revalidation
        ? path.join(options.campaignRoot, "target-revalidation-result.json")
        : null,
    };
  } finally {
    if (
      (await currentBranch(repository)) !== primary.branch ||
      (await currentHead(repository)) !== primary.head ||
      primaryStatusIdentity(await gitStatus(repository), options.campaignId) !==
        primary.status
    )
      throw new Error("campaign_primary_worktree_changed_during_finalization");
  }
}

function primaryStatusIdentity(
  status: Awaited<ReturnType<typeof gitStatus>>,
  campaignId: string,
): string {
  const campaignPrefix = `.codex/composite-long-task/campaigns/${campaignId}/`;
  return JSON.stringify({
    ...status,
    clean: status.entries.every((entry) =>
      entry.path.replace(/\\/gu, "/").startsWith(campaignPrefix),
    ),
    entries: status.entries.filter(
      (entry) => !entry.path.replace(/\\/gu, "/").startsWith(campaignPrefix),
    ),
  });
}
