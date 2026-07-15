import {
  currentHead,
  gitStatus,
  runGit,
} from "./composite-campaign-git-baseline.js";
import type { CampaignV6 } from "./composite-campaign-schema-v6.js";

export type IntegrationHeadReconcileEventV6 =
  | "integration_unpersisted_effect_rolled_back"
  | "integration_worktree_restored_to_persisted_head"
  | null;

export interface IntegrationHeadReconcileResultV6 {
  persisted_head: string;
  actual_head_before: string;
  actual_head_after: string;
  event: IntegrationHeadReconcileEventV6;
}

export async function reconcileIntegrationHeadAuthorityV6(options: {
  repositoryRoot: string;
  integrationWorktree: string;
  campaign: CampaignV6;
}): Promise<IntegrationHeadReconcileResultV6> {
  const persisted =
    options.campaign.integration_head ?? options.campaign.base_commit;
  if (!persisted) throw new Error("integration_persisted_head_missing");
  try {
    await currentHead(options.repositoryRoot, persisted);
  } catch {
    throw new Error("integration_persisted_head_missing");
  }
  const actual = await currentHead(options.integrationWorktree);
  const dirty = !(await gitStatus(options.integrationWorktree)).clean;
  if (dirty) {
    if (!mechanicalRecoveryAllowed(options.campaign))
      throw new Error("integration_worktree_dirty_during_reconcile");
    await rollbackMechanicalEffect(options.integrationWorktree, persisted);
    return result(
      persisted,
      actual,
      "integration_unpersisted_effect_rolled_back",
    );
  }
  if (actual === persisted) return result(persisted, actual, null);
  if (await ancestor(options.repositoryRoot, persisted, actual)) {
    if (!mechanicalRecoveryAllowed(options.campaign))
      throw new Error("integration_head_unexpected_drift");
    await rollbackMechanicalEffect(options.integrationWorktree, persisted);
    return result(
      persisted,
      actual,
      "integration_unpersisted_effect_rolled_back",
    );
  }
  if (await ancestor(options.repositoryRoot, actual, persisted)) {
    await runGit(options.integrationWorktree, ["reset", "--hard", persisted]);
    return result(
      persisted,
      actual,
      "integration_worktree_restored_to_persisted_head",
    );
  }
  throw new Error("integration_head_unexpected_drift");
}

export async function inspectIntegrationHeadAuthorityV6(options: {
  integrationWorktree: string | null;
  campaign: CampaignV6;
}): Promise<{
  integration_head_expected: string | null;
  integration_head_actual: string | null;
  integration_head_matches: boolean;
}> {
  const expected =
    options.campaign.integration_head ?? options.campaign.base_commit;
  const actual = options.integrationWorktree
    ? await currentHead(options.integrationWorktree)
    : null;
  return {
    integration_head_expected: expected,
    integration_head_actual: actual,
    integration_head_matches: expected !== null && actual === expected,
  };
}

async function rollbackMechanicalEffect(
  worktree: string,
  persisted: string,
): Promise<void> {
  await runGit(worktree, ["merge", "--abort"], { throwOnError: false });
  await runGit(worktree, ["reset", "--hard", persisted]);
  await runGit(worktree, ["clean", "-fd"]);
  if ((await currentHead(worktree)) !== persisted)
    throw new Error("integration_head_rollback_failed");
}

async function ancestor(
  repositoryRoot: string,
  ancestorCommit: string,
  descendantCommit: string,
): Promise<boolean> {
  return (
    (
      await runGit(
        repositoryRoot,
        ["merge-base", "--is-ancestor", ancestorCommit, descendantCommit],
        { throwOnError: false },
      )
    ).exitCode === 0
  );
}

function mechanicalRecoveryAllowed(campaign: CampaignV6): boolean {
  return (
    campaign.active_wave !== null ||
    campaign.repair.status !== "idle" ||
    campaign.campaign_status === "integrating"
  );
}

function result(
  persisted: string,
  actualBefore: string,
  event: IntegrationHeadReconcileEventV6,
): IntegrationHeadReconcileResultV6 {
  return {
    persisted_head: persisted,
    actual_head_before: actualBefore,
    actual_head_after: persisted,
    event,
  };
}
