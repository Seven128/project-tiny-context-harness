import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { parseStrictJson, sha256Hex } from "./composite-campaign-codec.js";
import { currentHead, runGit } from "./composite-campaign-git-baseline.js";
import {
  recordSliceExecutionReceiptV3,
  readSliceExecutionReceiptV3,
  type SliceExecutionReceiptV3,
} from "./composite-campaign-receipt.js";
import {
  validateChangeEnvelopeV1,
  type ChangeEnvelopeV1,
} from "./composite-campaign-change-envelope.js";
import {
  inspectManagedWorktreeBudgetV1,
  managedCampaignWorktreePathsV1,
  resolveManagedWorktreePathV1,
} from "./composite-campaign-worktree-budget.js";
import { listRepositoryWorktrees } from "./composite-campaign-worktree.js";
import type { CampaignV6 } from "./composite-campaign-schema-v6.js";
import {
  loadCampaignStoreV6,
  type CampaignLockHandleV6,
} from "./composite-runtime-v6/campaign-store.js";
import { currentPacketRevisionPathV6 } from "./composite-runtime-v6/campaign-packet-io.js";
import { mutateCampaignV6 } from "./composite-campaign-v6.js";

export interface CampaignReconcileResultV6 {
  schema_version: "composite-campaign-reconcile-v6";
  interrupted_worker_run_ids: string[];
  rebound_receipt_slice_ids: string[];
  integration_head: string | null;
  managed_worktree_budget: Awaited<
    ReturnType<typeof inspectManagedWorktreeBudgetV1>
  >;
}

export async function reconcileCampaignV6(options: {
  projectRoot: string;
  campaignPath: string;
  lock: CampaignLockHandleV6;
}): Promise<CampaignReconcileResultV6> {
  const loaded = await loadCampaignStoreV6(
    options.projectRoot,
    options.campaignPath,
  );
  const paths = managedCampaignWorktreePathsV1(
    options.projectRoot,
    loaded.campaign.campaign_id,
  );
  const repositoryWorktrees = await listRepositoryWorktrees(
    options.projectRoot,
  );
  const integrationRecord = repositoryWorktrees.find((item) =>
    samePath(item.path, paths.integration),
  );
  if (
    integrationRecord &&
    (integrationRecord.detached ||
      integrationRecord.branch !== loaded.campaign.integration_ref)
  )
    throw new Error("campaign_v6_integration_worktree_identity_drift");

  const activeWorkerPaths: string[] = [];
  for (const slice of Object.values(loaded.campaign.slices)) {
    const run = slice.current_worker_run;
    if (run?.status === "running" && run.pid && processAlive(run.pid))
      activeWorkerPaths.push(run.cwd);
  }
  const repairRun = loaded.campaign.repair.current_worker_run;
  if (
    repairRun?.status === "running" &&
    repairRun.pid &&
    processAlive(repairRun.pid)
  )
    activeWorkerPaths.push(repairRun.cwd);
  const expected = [
    ...(integrationRecord ? [paths.integration] : []),
    ...Object.values(loaded.campaign.slices)
      .map((slice) => slice.worktree_path)
      .filter((value): value is string => Boolean(value))
      .map((value) => resolveManagedWorktreePathV1(options.projectRoot, value)),
    ...((loaded.campaign.repair.status !== "idle" ||
      loaded.campaign.campaign_status === "finalizing") &&
    repositoryWorktrees.some((item) => samePath(item.path, paths.repair))
      ? [paths.repair]
      : []),
  ];
  const budget = await inspectManagedWorktreeBudgetV1({
    repositoryRoot: options.projectRoot,
    campaignId: loaded.campaign.campaign_id,
    expectedWorktrees: expected,
    activeWorkerPaths,
    reconcileOrphans: true,
  });

  const receiptBindings = new Map<string, SliceExecutionReceiptV3>();
  for (const sliceId of Object.keys(loaded.campaign.slices)) {
    const receipt = await findCurrentReceipt(loaded.root, sliceId);
    if (receipt) receiptBindings.set(sliceId, receipt);
  }
  for (const [sliceId, slice] of Object.entries(loaded.campaign.slices)) {
    if (receiptBindings.has(sliceId) || !slice.worktree_path || !slice.wave_id)
      continue;
    const worktree = resolveManagedWorktreePathV1(
      options.projectRoot,
      slice.worktree_path,
    );
    if (!repositoryWorktrees.some((item) => samePath(item.path, worktree)))
      continue;
    const rebound = await tryBindAcceptedFinalResult({
      projectRoot: options.projectRoot,
      campaignRoot: loaded.root,
      campaign: loaded.campaign,
      sliceId,
      worktree,
    });
    if (rebound) receiptBindings.set(sliceId, rebound);
  }

  const interrupted: string[] = [];
  const rebound: string[] = [];
  const integrationHead = integrationRecord
    ? await currentHead(paths.integration)
    : loaded.campaign.integration_head;
  await mutateCampaignV6(
    options.projectRoot,
    options.campaignPath,
    "campaign_reconciled",
    async (_root, campaign) => {
      if (integrationRecord) {
        if (campaign.base_commit) {
          const descendant = await runGit(
            options.projectRoot,
            [
              "merge-base",
              "--is-ancestor",
              campaign.base_commit,
              integrationHead!,
            ],
            { throwOnError: false },
          );
          if (descendant.exitCode !== 0)
            throw new Error("campaign_v6_integration_not_descendant_of_base");
        }
        campaign.integration_head = integrationHead;
      }
      for (const [sliceId, slice] of Object.entries(campaign.slices)) {
        const run = slice.current_worker_run;
        if (
          run &&
          (run.status === "starting" || run.status === "running") &&
          (!run.pid || !processAlive(run.pid))
        ) {
          run.status = "interrupted";
          run.completed_at = new Date().toISOString();
          run.exit_code = null;
          slice.status = "interrupted";
          slice.last_error_code = "worker_process_absent_reconciled";
          interrupted.push(run.run_id);
        }
        const receipt = receiptBindings.get(sliceId);
        if (receipt) {
          if (
            receipt.campaign_id !== campaign.campaign_id ||
            receipt.packet_sha256 !== slice.packet_sha256 ||
            (slice.wave_id && receipt.wave_id !== slice.wave_id)
          )
            throw new Error(`campaign_v6_receipt_identity_drift:${sliceId}`);
          if (!["merged", "integration_verified"].includes(slice.status))
            slice.status = "accepted";
          slice.base_commit = receipt.base_commit;
          slice.head_commit = receipt.head_commit;
          slice.final_receipt_sha256 = receipt.receipt_sha256;
          slice.last_error_code = null;
          rebound.push(sliceId);
        }
      }
      const currentRepair = campaign.repair.current_worker_run;
      if (
        currentRepair &&
        (currentRepair.status === "starting" ||
          currentRepair.status === "running") &&
        (!currentRepair.pid || !processAlive(currentRepair.pid))
      ) {
        currentRepair.status = "interrupted";
        currentRepair.completed_at = new Date().toISOString();
        currentRepair.exit_code = null;
        campaign.repair.status = "interrupted";
        campaign.repair.last_error_code = "worker_process_absent_reconciled";
        interrupted.push(currentRepair.run_id);
      }
      return campaign;
    },
    options.lock,
  );
  return {
    schema_version: "composite-campaign-reconcile-v6",
    interrupted_worker_run_ids: interrupted.sort(ascii),
    rebound_receipt_slice_ids: [...new Set(rebound)].sort(ascii),
    integration_head: integrationHead,
    managed_worktree_budget: budget,
  };
}

async function tryBindAcceptedFinalResult(options: {
  projectRoot: string;
  campaignRoot: string;
  campaign: CampaignV6;
  sliceId: string;
  worktree: string;
}): Promise<SliceExecutionReceiptV3 | null> {
  const slice = options.campaign.slices[options.sliceId];
  if (
    !slice.packet_revision ||
    !slice.packet_sha256 ||
    !slice.wave_id ||
    !slice.base_commit
  )
    return null;
  const contractWorkdir = path.join(
    options.worktree,
    "tmp",
    "ty-context",
    "plan-acceptance",
    options.campaign.campaign_id,
    `${options.sliceId}-r${slice.packet_revision}`,
  );
  try {
    const result = parseStrictJson(
      await readFile(path.join(contractWorkdir, "final-result.json"), "utf8"),
    ) as { workflow_status?: unknown };
    if (result.workflow_status !== "accepted") return null;
    const revision = currentPacketRevisionPathV6(
      options.campaignRoot,
      options.campaign,
      options.sliceId,
    );
    const envelope = validateChangeEnvelopeV1(
      parseStrictJson(
        await readFile(path.join(revision, "change-envelope.json"), "utf8"),
      ) as ChangeEnvelopeV1,
    );
    const recorded = await recordSliceExecutionReceiptV3({
      campaignRoot: options.campaignRoot,
      campaignId: options.campaign.campaign_id,
      sliceId: options.sliceId,
      waveId: slice.wave_id,
      worktree: options.worktree,
      contractWorkdir,
      baseCommit: slice.base_commit,
      packetSha256: slice.packet_sha256,
      forbiddenChangedPaths: ["project_context", ".codex/composite-long-task"],
      changeEnvelope: envelope,
    });
    return recorded.receipt;
  } catch {
    return null;
  }
}

async function findCurrentReceipt(
  campaignRoot: string,
  sliceId: string,
): Promise<SliceExecutionReceiptV3 | null> {
  const directory = path.join(campaignRoot, "slices", sliceId, "receipts");
  try {
    const files = (await readdir(directory))
      .filter((file) => file.endsWith(".json"))
      .sort()
      .reverse();
    for (const file of files) {
      try {
        return await readSliceExecutionReceiptV3(path.join(directory, file));
      } catch {}
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  return null;
}

function processAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}
function samePath(left: string, right: string): boolean {
  const normalize = (value: string) => {
    const resolved = path.resolve(value);
    return process.platform === "win32" ? resolved.toLowerCase() : resolved;
  };
  return normalize(left) === normalize(right);
}
function ascii(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
