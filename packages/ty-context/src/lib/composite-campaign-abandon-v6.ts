import { readdir, rm } from "node:fs/promises";
import path from "node:path";
import { reconcileCampaignV6 } from "./composite-campaign-reconcile-v6.js";
import { cleanupManagedCampaignWorktreesV1 } from "./composite-campaign-worktree-budget.js";
import { deriveExpectedManagedWorktreesV6 } from "./composite-campaign-worktree-expectation-v6.js";
import { portablePathSlug } from "./composite-campaign-worktree.js";
import { mutateCampaignV6 } from "./composite-campaign-v6.js";
import {
  acquireCampaignLockV6,
  campaignLockOwnerMatchesV6,
  loadCampaignStoreV6,
  optionalCampaignLockV6,
  type CampaignLockHandleV6,
} from "./composite-runtime-v6/campaign-store.js";

export interface AbandonCampaignResultV6 {
  schema_version: "composite-campaign-abandon-v6";
  campaign_id: string;
  campaign_status: "abandoned";
  worktrees_removed: true;
  integration_branch_removed: true;
  runtime_removed: true;
  audit_preserved: true;
  remote_changed: false;
}

export async function abandonCampaignV6(
  projectRoot: string,
  campaignPath: string,
): Promise<AbandonCampaignResultV6> {
  const loaded = await loadCampaignStoreV6(projectRoot, campaignPath);
  if (loaded.campaign.campaign_status === "accepted")
    throw new Error("campaign_abandon_forbidden_after_acceptance");
  const existingLock = await optionalCampaignLockV6(loaded.root);
  if (existingLock && (await campaignLockOwnerMatchesV6(existingLock)))
    throw new Error("campaign_abandon_requires_interrupt:live_scheduler_lock");
  const lock = await acquireCampaignLockV6(loaded.root, "abandon_v6");
  try {
    let current = loaded.campaign;
    if (current.campaign_status !== "abandoned") {
      const reconciled = await reconcileCampaignV6({
        projectRoot,
        campaignPath,
        lock,
      });
      const blockers = [
        ...reconciled.worker_process_blockers,
        ...reconciled.managed_worktree_budget.active_worker_worktrees.map(
          (worktree) => `active_worker_worktree:${worktree}`,
        ),
      ];
      if (blockers.length)
        throw new Error(
          `campaign_abandon_requires_interrupt:${blockers.sort().join(",")}`,
        );
      current = await mutateCampaignV6(
        projectRoot,
        campaignPath,
        "campaign_abandoned",
        async (_root, campaign) => {
          campaign.campaign_status = "abandoned";
          campaign.block_reason = "user_abandoned";
          campaign.active_wave = null;
          for (const slice of Object.values(campaign.slices)) {
            slice.worktree_path = null;
            slice.current_worker_run = null;
          }
          campaign.repair.status = "idle";
          campaign.repair.kind = null;
          campaign.repair.attempt_count = 0;
          campaign.repair.base_commit = null;
          campaign.repair.head_commit = null;
          campaign.repair.affected_slice_ids = [];
          campaign.repair.manifest_path = null;
          campaign.repair.manifest_sha256 = null;
          campaign.repair.current_worker_run = null;
          campaign.repair.last_error_code = null;
          return campaign;
        },
        lock,
      );
    }
    return continueAbandonedCleanupV6({
      projectRoot,
      campaignPath,
      campaignRoot: loaded.root,
      campaignId: current.campaign_id,
      integrationRef: current.integration_ref,
      lock,
    });
  } finally {
    await lock.close();
  }
}

export async function continueAbandonedCleanupV6(options: {
  projectRoot: string;
  campaignPath: string;
  campaignRoot: string;
  campaignId: string;
  integrationRef: string;
  lock: CampaignLockHandleV6;
}): Promise<AbandonCampaignResultV6> {
  await options.lock.assertOwned();
  const loaded = await loadCampaignStoreV6(
    options.projectRoot,
    options.campaignPath,
  );
  const expected = deriveExpectedManagedWorktreesV6({
    repositoryRoot: options.projectRoot,
    campaign: loaded.campaign,
  });
  if (expected.all.length)
    throw new Error("abandoned_campaign_expected_worktrees_not_empty");
  await cleanupManagedCampaignWorktreesV1({
    repositoryRoot: options.projectRoot,
    campaignId: options.campaignId,
    integrationRef: options.integrationRef,
  });
  const runtime = path.join(
    path.resolve(options.projectRoot),
    "tmp",
    "ty-context",
    "composite-runtime",
    portablePathSlug(options.campaignId),
  );
  await rm(runtime, { recursive: true, force: true });
  await cleanupCampaignTemporaryFiles(options.campaignRoot);
  return {
    schema_version: "composite-campaign-abandon-v6",
    campaign_id: options.campaignId,
    campaign_status: "abandoned",
    worktrees_removed: true,
    integration_branch_removed: true,
    runtime_removed: true,
    audit_preserved: true,
    remote_changed: false,
  };
}

async function cleanupCampaignTemporaryFiles(
  campaignRoot: string,
): Promise<void> {
  await rm(path.join(campaignRoot, ".interrupt-request.json"), { force: true });
  await removeTemporaryChildren(campaignRoot);
  const parent = path.dirname(campaignRoot);
  const prefix = `${path.basename(campaignRoot)}.tmp-`;
  for (const entry of await readdir(parent, { withFileTypes: true }))
    if (entry.name.startsWith(prefix))
      await rm(path.join(parent, entry.name), { recursive: true, force: true });
}

async function removeTemporaryChildren(directory: string): Promise<void> {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.name.includes(".tmp-")) {
      await rm(target, { recursive: true, force: true });
      continue;
    }
    if (entry.isDirectory()) await removeTemporaryChildren(target);
  }
}
