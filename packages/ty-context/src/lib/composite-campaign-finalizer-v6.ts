import path from "node:path";
import {
  commitCampaignAcceptanceV6,
  continueAcceptedCleanupV6,
} from "./composite-campaign-accepted-authority-v6.js";
import type { CampaignWorkerRuntimeV6 } from "./composite-campaign-exec-worker.js";
import { runCampaignFinalGate } from "./composite-campaign-final-gate.js";
import { loadCampaignGateAuthorityV6 } from "./composite-campaign-gates-v6.js";
import {
  assertCampaignNotInterruptedV6,
  runRepairWithinBudgetV6,
} from "./composite-campaign-runtime-helpers-v6.js";
import {
  campaignRunResultV6,
  type RunCampaignResultV6,
} from "./composite-campaign-runner-types-v6.js";
import { finalizeCampaignTarget } from "./composite-campaign-target-finalization.js";
import {
  inspectManagedWorktreeStateV1,
  managedCampaignWorktreePathsV1,
  resetManagedRepairWorktreeV1,
} from "./composite-campaign-worktree-budget.js";
import { mutateCampaignV6 } from "./composite-campaign-v6.js";
import { loadCampaignStoreV6 } from "./composite-runtime-v6/campaign-store.js";

export async function finalizeCampaignV6(
  runtime: CampaignWorkerRuntimeV6,
): Promise<RunCampaignResultV6> {
  for (let finalCycle = 0; finalCycle < 10; finalCycle += 1) {
    await assertCampaignNotInterruptedV6(runtime);
    let loaded = await loadCampaignStoreV6(
      runtime.projectRoot,
      runtime.campaignPath,
    );
    await mutateCampaignV6(
      runtime.projectRoot,
      runtime.campaignPath,
      "campaign_final_gate_intent",
      async (_root, campaign) => {
        campaign.campaign_status = "finalizing";
        return campaign;
      },
      runtime.lock,
    );
    loaded = await loadCampaignStoreV6(
      runtime.projectRoot,
      runtime.campaignPath,
    );
    await assertCampaignNotInterruptedV6(runtime);
    const authority = await loadCampaignGateAuthorityV6(
      loaded.root,
      loaded.campaign,
    );
    const runGate = () =>
      runCampaignFinalGate({
        campaignRoot: loaded.root,
        campaignId: loaded.campaign.campaign_id,
        integrationWorktree: runtime.integrationWorktree,
        integrationBranch: loaded.campaign.integration_ref,
        sourcePlanSha256: loaded.campaign.source_plan_sha256,
        sourceCoverageFile: path.join(loaded.root, "source-coverage.json"),
        sourceCoverageComplete: authority.source_coverage_complete,
        slices: authority.slice_inputs,
        globalConstraints: authority.global_constraints,
      });
    const gate = runtime.metrics
      ? await runtime.metrics.measure("gate_wall_ms", runGate)
      : await runGate();
    await assertCampaignNotInterruptedV6(runtime);
    if (gate.workflow_status === "needs_work") {
      await runRepairWithinBudgetV6(runtime, {
        kind: "campaign_final_regression",
        affectedSliceIds: Object.keys(loaded.campaign.slices),
        findingsFile: path.join(loaded.root, "campaign-final-result.json"),
      });
      continue;
    }
    const finalized = await finalizeTargetV6(runtime, loaded, authority);
    if (finalized) return finalized;
  }
  throw new Error("campaign_finalization_bounded_cycle_limit_exceeded");
}

async function finalizeTargetV6(
  runtime: CampaignWorkerRuntimeV6,
  loaded: Awaited<ReturnType<typeof loadCampaignStoreV6>>,
  authority: Awaited<ReturnType<typeof loadCampaignGateAuthorityV6>>,
): Promise<RunCampaignResultV6 | null> {
  await assertCampaignNotInterruptedV6(runtime);
  const campaign = loaded.campaign;
  const paths = managedCampaignWorktreePathsV1(
    runtime.projectRoot,
    campaign.campaign_id,
  );
  const finalized = await finalizeCampaignTarget({
    repositoryRoot: runtime.projectRoot,
    campaignId: campaign.campaign_id,
    campaignRoot: loaded.root,
    integrationWorktree: runtime.integrationWorktree,
    integrationBranch: campaign.integration_ref,
    targetBranch: campaign.target_branch,
    campaignFinalResultFile: path.join(
      loaded.root,
      "campaign-final-result.json",
    ),
    autoPush: campaign.campaign_policy.auto_push,
    protectedBranchMode: campaign.campaign_policy.protected_branch_mode,
    preservePrimaryWorktree: true,
    targetRevalidation: {
      sourceCoverageFile: path.join(loaded.root, "source-coverage.json"),
      sourceCoverageComplete: authority.source_coverage_complete,
      slices: authority.slice_inputs,
      globalConstraints: authority.global_constraints,
    },
    targetWorktreePreparer: async (baseCommit) => {
      await assertCampaignNotInterruptedV6(runtime);
      assertNoActiveSliceWorkers(campaign);
      const worktree = await resetManagedRepairWorktreeV1({
        repositoryRoot: runtime.projectRoot,
        campaignId: campaign.campaign_id,
        baseCommit,
        expectedWorktrees: [paths.integration, paths.repair],
      });
      if (!worktree.resumed)
        runtime.metrics?.increment("worktree_create_count");
      return { path: worktree.path };
    },
  });
  if (finalized.status === "accepted") {
    await commitCampaignAcceptanceV6({
      projectRoot: runtime.projectRoot,
      campaignPath: runtime.campaignPath,
      lock: runtime.lock,
      receipt: finalized.receipt,
    });
    const cleanupCount = (
      await inspectManagedWorktreeStateV1({
        repositoryRoot: runtime.projectRoot,
        campaignId: campaign.campaign_id,
      })
    ).actual_managed_worktrees.length;
    const accepted = await continueAcceptedCleanupV6({
      projectRoot: runtime.projectRoot,
      campaignPath: runtime.campaignPath,
      lock: runtime.lock,
    });
    runtime.metrics?.increment("worktree_remove_count", cleanupCount);
    const current = await loadCampaignStoreV6(
      runtime.projectRoot,
      runtime.campaignPath,
    );
    return campaignRunResultV6(current.campaign, accepted.target_commit);
  }
  if (finalized.status === "revalidation_required") {
    await mutateCampaignV6(
      runtime.projectRoot,
      runtime.campaignPath,
      "target_revalidation_required",
      async (_root, current) => {
        current.integration_head = finalized.integration_head;
        current.campaign_status = "finalizing";
        return current;
      },
      runtime.lock,
    );
    return null;
  }
  if (finalized.status === "repair_required") {
    await runRepairWithinBudgetV6(runtime, {
      kind: "merge_conflict",
      affectedSliceIds: Object.keys(campaign.slices),
      mergeTarget: finalized.target_ref,
      explicitConflictPaths: finalized.conflicted_paths,
    });
    return null;
  }
  await mutateCampaignV6(
    runtime.projectRoot,
    runtime.campaignPath,
    "target_external_approval_required",
    async (_root, current) => {
      current.campaign_status = "externally_blocked";
      current.block_reason = finalized.reason;
      return current;
    },
    runtime.lock,
  );
  return campaignRunResultV6(
    (await loadCampaignStoreV6(runtime.projectRoot, runtime.campaignPath))
      .campaign,
    null,
  );
}

function assertNoActiveSliceWorkers(
  campaign: Awaited<ReturnType<typeof loadCampaignStoreV6>>["campaign"],
): void {
  if (
    Object.values(campaign.slices).some(
      (slice) => slice.current_worker_run?.status === "running",
    )
  )
    throw new Error("target_revalidation_forbidden_while_slice_worker_active");
}
