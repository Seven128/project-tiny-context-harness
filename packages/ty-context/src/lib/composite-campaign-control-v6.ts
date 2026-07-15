import path from "node:path";
import { terminateKnownProcessTree } from "./codex-exec-client.js";
import { atomic } from "./long-task-status.js";
import {
  inspectManagedWorktreeBudgetV1,
  managedCampaignWorktreePathsV1,
  resolveManagedWorktreePathV1,
} from "./composite-campaign-worktree-budget.js";
import { listRepositoryWorktrees } from "./composite-campaign-worktree.js";
import { continueAcceptedCleanupV6 } from "./composite-campaign-accepted-authority-v6.js";
import {
  acquireCampaignLockV6,
  campaignLockOwnerMatchesV6,
  loadCampaignStoreV6,
  optionalCampaignLockV6,
} from "./composite-runtime-v6/campaign-store.js";
import { mutateCampaignV6 } from "./composite-campaign-v6.js";

export async function statusCampaignV6(
  projectRoot: string,
  campaignPath: string,
) {
  const loaded = await loadCampaignStoreV6(projectRoot, campaignPath);
  const budget = await currentBudget(
    projectRoot,
    loaded.campaign.campaign_id,
    loaded.campaign,
  );
  return {
    schema_version: "composite-campaign-status-v6",
    execution_mode: "foreground_scheduler",
    execution_engine: loaded.campaign.execution_engine,
    campaign: loaded.campaign,
    ...budget,
  };
}

export async function listCampaignWorkersV6(
  projectRoot: string,
  campaignPath: string,
) {
  const { campaign } = await loadCampaignStoreV6(projectRoot, campaignPath);
  const now = Date.now();
  const workers = Object.entries(campaign.slices).flatMap(
    ([sliceId, slice]) => {
      const run = slice.current_worker_run;
      return run && (run.status === "starting" || run.status === "running")
        ? [
            {
              identity: sliceId,
              ...run,
              elapsed_ms: Math.max(0, now - Date.parse(run.started_at)),
            },
          ]
        : [];
    },
  );
  const repair = campaign.repair.current_worker_run;
  if (repair && (repair.status === "starting" || repair.status === "running"))
    workers.push({
      identity: `repair:${campaign.repair.kind ?? "unknown"}`,
      ...repair,
      elapsed_ms: Math.max(0, now - Date.parse(repair.started_at)),
    });
  return {
    schema_version: "composite-campaign-workers-v6",
    campaign_id: campaign.campaign_id,
    workers,
  };
}

export async function interruptCampaignV6(
  projectRoot: string,
  campaignPath: string,
) {
  const loaded = await loadCampaignStoreV6(projectRoot, campaignPath);
  const workers = await listCampaignWorkersV6(projectRoot, campaignPath);
  const request = {
    schema_version: "campaign-interrupt-request-v1",
    campaign_id: loaded.campaign.campaign_id,
    requested_at: new Date().toISOString(),
    requested_by_pid: process.pid,
    worker_run_ids: workers.workers.map((worker) => worker.run_id).sort(),
  };
  await atomic(path.join(loaded.root, ".interrupt-request.json"), request);
  const pids = stableNumbers(
    workers.workers
      .map((worker) => worker.pid)
      .filter(
        (pid): pid is number => Number.isInteger(pid) && (pid as number) > 0,
      ),
  );
  await Promise.allSettled(
    pids.map((pid) => terminateKnownProcessTree(pid, false)),
  );
  const grace = loaded.campaign.campaign_policy.worker_termination_grace_ms;
  const deadline = Date.now() + grace;
  while (pids.some(alive) && Date.now() < deadline)
    await new Promise((resolve) =>
      setTimeout(resolve, Math.min(100, deadline - Date.now())),
    );
  const remaining = pids.filter(alive);
  await Promise.allSettled(
    remaining.map((pid) => terminateKnownProcessTree(pid, true)),
  );
  const currentLock = await optionalCampaignLockV6(loaded.root);
  if (!currentLock || !(await campaignLockOwnerMatchesV6(currentLock))) {
    const lock = await acquireCampaignLockV6(loaded.root, "interrupt_v6");
    try {
      await mutateCampaignV6(
        projectRoot,
        campaignPath,
        "campaign_interrupted",
        async (_root, campaign) => {
          campaign.campaign_status = "interrupted";
          campaign.block_reason = "user_interrupt";
          if (campaign.active_wave)
            campaign.waves[campaign.active_wave].status = "interrupted";
          for (const slice of Object.values(campaign.slices)) {
            if (slice.current_worker_run?.status === "running") {
              slice.current_worker_run.status = "interrupted";
              slice.current_worker_run.completed_at = new Date().toISOString();
              slice.current_worker_run.exit_code = null;
              slice.status = "interrupted";
            }
          }
          if (campaign.repair.current_worker_run?.status === "running") {
            campaign.repair.current_worker_run.status = "interrupted";
            campaign.repair.current_worker_run.completed_at =
              new Date().toISOString();
            campaign.repair.current_worker_run.exit_code = null;
            campaign.repair.status = "interrupted";
          }
          return campaign;
        },
        lock,
      );
    } finally {
      await lock.close();
    }
  }
  return {
    schema_version: "composite-campaign-interrupt-v6",
    campaign_id: loaded.campaign.campaign_id,
    interrupted_run_ids: request.worker_run_ids,
    graceful_pids: pids.filter((pid) => !remaining.includes(pid)),
    force_terminated_pids: remaining,
    background_workers_expected: 0,
  };
}

export async function cleanupCampaignV6(
  projectRoot: string,
  campaignPath: string,
) {
  const loaded = await loadCampaignStoreV6(projectRoot, campaignPath);
  const lock = await acquireCampaignLockV6(loaded.root, "cleanup_v6");
  try {
    if (loaded.campaign.campaign_status === "accepted")
      return continueAcceptedCleanupV6({ projectRoot, campaignPath, lock });
    const active = (await listCampaignWorkersV6(projectRoot, campaignPath))
      .workers;
    if (active.length)
      throw new Error("campaign_cleanup_forbidden_with_active_workers");
    return currentBudget(
      projectRoot,
      loaded.campaign.campaign_id,
      loaded.campaign,
      true,
    );
  } finally {
    await lock.close();
  }
}

async function currentBudget(
  projectRoot: string,
  campaignId: string,
  campaign: Awaited<ReturnType<typeof loadCampaignStoreV6>>["campaign"],
  reconcileOrphans = false,
) {
  const paths = managedCampaignWorktreePathsV1(projectRoot, campaignId);
  const records = await listRepositoryWorktrees(projectRoot);
  const expected = [
    ...(records.some((record) => samePath(record.path, paths.integration))
      ? [paths.integration]
      : []),
    ...Object.values(campaign.slices)
      .map((slice) => slice.worktree_path)
      .filter((value): value is string => Boolean(value))
      .map((value) => resolveManagedWorktreePathV1(projectRoot, value)),
    ...((campaign.repair.status !== "idle" ||
      campaign.campaign_status === "finalizing") &&
    records.some((record) => samePath(record.path, paths.repair))
      ? [paths.repair]
      : []),
  ];
  return inspectManagedWorktreeBudgetV1({
    repositoryRoot: projectRoot,
    campaignId,
    expectedWorktrees: expected,
    activeWorkerPaths: [],
    reconcileOrphans,
  });
}

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}
function stableNumbers(values: number[]): number[] {
  return [...new Set(values)].sort((left, right) => left - right);
}
function samePath(left: string, right: string): boolean {
  const normalize = (value: string) => {
    const resolved = path.resolve(value);
    return process.platform === "win32" ? resolved.toLowerCase() : resolved;
  };
  return normalize(left) === normalize(right);
}
