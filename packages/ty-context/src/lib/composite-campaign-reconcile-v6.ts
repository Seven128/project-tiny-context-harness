import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { parseStrictJson, sha256Hex } from "./composite-campaign-codec.js";
import { reconcileIntegrationHeadAuthorityV6 } from "./composite-campaign-integration-head-v6.js";
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
  inspectManagedWorktreeStateV1,
  managedCampaignWorktreePathsV1,
  reconcileManagedCampaignWorktreesV1,
  resolveManagedWorktreePathV1,
} from "./composite-campaign-worktree-budget.js";
import { deriveExpectedManagedWorktreesV6 } from "./composite-campaign-worktree-expectation-v6.js";
import { listRepositoryWorktrees } from "./composite-campaign-worktree.js";
import type { CampaignV6 } from "./composite-campaign-schema-v6.js";
import {
  bindAcceptedSliceFromReceiptV6,
  reconcileActiveWaveIdentityV6,
  transitionSliceStatusV6,
} from "./composite-campaign-state-transition-v6.js";
import {
  loadCampaignStoreV6,
  type CampaignLockHandleV6,
} from "./composite-runtime-v6/campaign-store.js";
import { currentPacketRevisionPathV6 } from "./composite-runtime-v6/campaign-packet-io.js";
import { mutateCampaignV6 } from "./composite-campaign-v6.js";
import {
  inspectWorkerProcessV6,
  type WorkerProcessObservationV6,
} from "./composite-campaign-worker-process-v6.js";

export interface CampaignReconcileResultV6 {
  schema_version: "composite-campaign-reconcile-v6";
  interrupted_worker_run_ids: string[];
  worker_process_blockers: string[];
  rebound_receipt_slice_ids: string[];
  integration_head: string | null;
  managed_worktree_budget: Awaited<
    ReturnType<typeof inspectManagedWorktreeStateV1>
  >;
}

export async function reconcileCampaignV6(options: {
  projectRoot: string;
  campaignPath: string;
  lock: CampaignLockHandleV6;
}): Promise<CampaignReconcileResultV6> {
  let loaded = await loadCampaignStoreV6(
    options.projectRoot,
    options.campaignPath,
  );
  let expected = deriveExpectedManagedWorktreesV6({
    repositoryRoot: options.projectRoot,
    campaign: loaded.campaign,
  });
  if (expected.stale_slice_path_ids.length) {
    const stale = new Set(expected.stale_slice_path_ids);
    await mutateCampaignV6(
      options.projectRoot,
      options.campaignPath,
      "integration_verified_worktree_paths_cleared",
      async (_root, campaign) => {
        for (const sliceId of stale)
          campaign.slices[sliceId].worktree_path = null;
        return campaign;
      },
      options.lock,
    );
    loaded = await loadCampaignStoreV6(
      options.projectRoot,
      options.campaignPath,
    );
    expected = deriveExpectedManagedWorktreesV6({
      repositoryRoot: options.projectRoot,
      campaign: loaded.campaign,
    });
  }
  const paths = managedCampaignWorktreePathsV1(
    options.projectRoot,
    loaded.campaign.campaign_id,
  );
  let repositoryWorktrees = await listRepositoryWorktrees(options.projectRoot);
  let integrationRecord = repositoryWorktrees.find((item) =>
    samePath(item.path, paths.integration),
  );
  if (
    integrationRecord &&
    (integrationRecord.detached ||
      integrationRecord.branch !== loaded.campaign.integration_ref)
  )
    throw new Error("campaign_v6_integration_worktree_identity_drift");

  const observations = new Map<string, WorkerProcessObservationV6>();
  const activeWorkerPaths: string[] = [];
  const protectedWorkerPaths: string[] = [];
  for (const slice of Object.values(loaded.campaign.slices)) {
    const run = slice.current_worker_run;
    if (run && ["starting", "running"].includes(run.status)) {
      const observed = await inspectWorkerProcessV6(run);
      observations.set(run.run_id, observed);
      if (observed.state === "identity_match") activeWorkerPaths.push(run.cwd);
      if (observed.state === "identity_unavailable")
        protectedWorkerPaths.push(run.cwd);
    }
  }
  const repairRun = loaded.campaign.repair.current_worker_run;
  if (repairRun && ["starting", "running"].includes(repairRun.status)) {
    const observed = await inspectWorkerProcessV6(repairRun);
    observations.set(repairRun.run_id, observed);
    if (observed.state === "identity_match")
      activeWorkerPaths.push(repairRun.cwd);
    if (observed.state === "identity_unavailable")
      protectedWorkerPaths.push(repairRun.cwd);
  }
  const budget = await reconcileManagedCampaignWorktreesV1({
    repositoryRoot: options.projectRoot,
    campaignId: loaded.campaign.campaign_id,
    expectedWorktrees: expected.all,
    activeWorkerPaths,
    protectedWorkerPaths,
  });
  repositoryWorktrees = await listRepositoryWorktrees(options.projectRoot);
  integrationRecord = repositoryWorktrees.find((item) =>
    samePath(item.path, paths.integration),
  );
  const integrationAuthority = integrationRecord
    ? await reconcileIntegrationHeadAuthorityV6({
        repositoryRoot: options.projectRoot,
        integrationWorktree: paths.integration,
        campaign: loaded.campaign,
      })
    : null;
  if (integrationAuthority?.event)
    await mutateCampaignV6(
      options.projectRoot,
      options.campaignPath,
      integrationAuthority.event,
      async (_root, campaign) => campaign,
      options.lock,
    );

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
  const workerProcessBlockers = [...observations.entries()]
    .filter(([, observed]) =>
      ["identity_match", "identity_unavailable"].includes(observed.state),
    )
    .map(([runId, observed]) =>
      observed.state === "identity_match"
        ? `worker_process_still_active:${runId}`
        : `worker_process_identity_unverified:${runId}`,
    )
    .sort(ascii);
  const hasIdentityMismatch = [...observations.values()].some(
    (observed) => observed.state === "identity_mismatch",
  );
  const integrationHead = integrationAuthority
    ? integrationAuthority.actual_head_after
    : loaded.campaign.integration_head;
  await mutateCampaignV6(
    options.projectRoot,
    options.campaignPath,
    hasIdentityMismatch
      ? "worker_pid_reused_or_identity_mismatch"
      : "campaign_reconciled",
    async (_root, campaign) => {
      reconcileActiveWaveIdentityV6(campaign);
      if (integrationRecord && campaign.integration_head !== integrationHead)
        throw new Error("campaign_v6_integration_persisted_head_mismatch");
      for (const [sliceId, slice] of Object.entries(campaign.slices)) {
        const run = slice.current_worker_run;
        if (
          run &&
          (run.status === "starting" || run.status === "running") &&
          ["not_started", "not_alive", "identity_mismatch"].includes(
            observations.get(run.run_id)?.state ?? "not_started",
          )
        ) {
          run.status = "interrupted";
          run.completed_at = new Date().toISOString();
          run.exit_code = null;
          if (run.kind === "execution")
            transitionSliceStatusV6(slice, "interrupted");
          slice.last_error_code =
            observations.get(run.run_id)?.state === "identity_mismatch"
              ? "worker_pid_reused_or_identity_mismatch"
              : "worker_process_absent_reconciled";
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
          bindAcceptedSliceFromReceiptV6(slice);
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
        ["not_started", "not_alive", "identity_mismatch"].includes(
          observations.get(currentRepair.run_id)?.state ?? "not_started",
        )
      ) {
        currentRepair.status = "interrupted";
        currentRepair.completed_at = new Date().toISOString();
        currentRepair.exit_code = null;
        campaign.repair.status = "interrupted";
        campaign.repair.last_error_code =
          observations.get(currentRepair.run_id)?.state === "identity_mismatch"
            ? "worker_pid_reused_or_identity_mismatch"
            : "worker_process_absent_reconciled";
        interrupted.push(currentRepair.run_id);
      }
      return campaign;
    },
    options.lock,
  );
  return {
    schema_version: "composite-campaign-reconcile-v6",
    interrupted_worker_run_ids: interrupted.sort(ascii),
    worker_process_blockers: workerProcessBlockers,
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
