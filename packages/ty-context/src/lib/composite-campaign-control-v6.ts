import path from "node:path";
import { readFile } from "node:fs/promises";
import { terminateKnownProcessTree } from "./codex-exec-client.js";
import { atomic } from "./long-task-status.js";
import {
  inspectManagedWorktreeStateV1,
  managedCampaignWorktreePathsV1,
  reconcileManagedCampaignWorktreesV1,
} from "./composite-campaign-worktree-budget.js";
import { deriveExpectedManagedWorktreesV6 } from "./composite-campaign-worktree-expectation-v6.js";
import {
  transitionSliceStatusV6,
  transitionWaveStatusV6,
} from "./composite-campaign-state-transition-v6.js";
import { inspectIntegrationHeadAuthorityV6 } from "./composite-campaign-integration-head-v6.js";
import { listRepositoryWorktrees } from "./composite-campaign-worktree.js";
import { continueAcceptedCleanupV6 } from "./composite-campaign-accepted-authority-v6.js";
import {
  acquireCampaignLockV6,
  campaignLockOwnerMatchesV6,
  loadCampaignStoreV6,
  optionalCampaignLockV6,
} from "./composite-runtime-v6/campaign-store.js";
import { mutateCampaignV6 } from "./composite-campaign-v6.js";
import { inspectWorkerProcessV6 } from "./composite-campaign-worker-process-v6.js";
import { isProcessAlive } from "./process-identity.js";
import { continueAbandonedCleanupV6 } from "./composite-campaign-abandon-v6.js";
import { readLatestCampaignRunSummaryV6 } from "./composite-campaign-run-metrics-v6.js";

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
  const paths = managedCampaignWorktreePathsV1(
    projectRoot,
    loaded.campaign.campaign_id,
  );
  const integrationExists = (await listRepositoryWorktrees(projectRoot)).some(
    (record) => samePath(record.path, paths.integration),
  );
  const integration = await inspectIntegrationHeadAuthorityV6({
    integrationWorktree: integrationExists ? paths.integration : null,
    campaign: loaded.campaign,
  });
  return {
    schema_version: "composite-campaign-status-v6",
    execution_mode: "foreground_scheduler",
    execution_engine: loaded.campaign.execution_engine,
    campaign: loaded.campaign,
    run_summary: await readLatestCampaignRunSummaryV6(loaded.root),
    ...budget,
    ...integration,
  };
}

export async function listCampaignWorkersV6(
  projectRoot: string,
  campaignPath: string,
) {
  const { campaign } = await loadCampaignStoreV6(projectRoot, campaignPath);
  const now = Date.now();
  const recorded = Object.entries(campaign.slices).flatMap(
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
    recorded.push({
      identity: `repair:${campaign.repair.kind ?? "unknown"}`,
      ...repair,
      elapsed_ms: Math.max(0, now - Date.parse(repair.started_at)),
    });
  const interruptRequested = await hasInterruptRequest(
    projectRoot,
    campaignPath,
  );
  const workers = await Promise.all(
    recorded.map(async (worker) => {
      const observation = await inspectWorkerProcessV6(worker);
      return {
        ...worker,
        process_alive: observation.alive,
        process_identity_matches: observation.identity_matches,
        interrupt_requested: interruptRequested,
      };
    }),
  );
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
  const schedulerLock = await optionalCampaignLockV6(loaded.root);
  const schedulerOperationId =
    schedulerLock && (await campaignLockOwnerMatchesV6(schedulerLock))
      ? schedulerLock.operation_id
      : null;
  const request = {
    schema_version: "campaign-interrupt-request-v1",
    campaign_id: loaded.campaign.campaign_id,
    requested_at: new Date().toISOString(),
    requested_by_pid: process.pid,
    scheduler_operation_id: schedulerOperationId,
    worker_run_ids: workers.workers.map((worker) => worker.run_id).sort(),
  };
  await atomic(path.join(loaded.root, ".interrupt-request.json"), request);
  const ownedWorkers = workers.workers.filter(
    (worker) =>
      worker.pid &&
      worker.process_start_identity &&
      worker.process_identity_matches === true,
  );
  const blockers = workers.workers
    .filter(
      (worker) =>
        worker.process_alive && worker.process_identity_matches !== true,
    )
    .map((worker) => `worker_process_identity_unverified:${worker.run_id}`)
    .sort();
  await Promise.allSettled(
    ownedWorkers.map((worker) =>
      terminateKnownProcessTree(
        worker.pid!,
        worker.process_start_identity,
        false,
      ),
    ),
  );
  const grace = loaded.campaign.campaign_policy.worker_termination_grace_ms;
  const deadline = Date.now() + grace;
  while (
    ownedWorkers.some((worker) => isProcessAlive(worker.pid!)) &&
    Date.now() < deadline
  )
    await new Promise((resolve) =>
      setTimeout(resolve, Math.min(100, deadline - Date.now())),
    );
  const remaining = ownedWorkers.filter((worker) =>
    isProcessAlive(worker.pid!),
  );
  await Promise.allSettled(
    remaining.map((worker) =>
      terminateKnownProcessTree(
        worker.pid!,
        worker.process_start_identity,
        true,
      ),
    ),
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
          if (campaign.active_wave) {
            const wave = campaign.waves[campaign.active_wave];
            if (["scheduled", "running", "blocked"].includes(wave.status))
              wave.status = transitionWaveStatusV6(wave.status, "interrupted");
          }
          for (const slice of Object.values(campaign.slices)) {
            if (slice.current_worker_run?.status === "running") {
              slice.current_worker_run.status = "interrupted";
              slice.current_worker_run.completed_at = new Date().toISOString();
              slice.current_worker_run.exit_code = null;
              if (slice.current_worker_run.kind === "execution")
                transitionSliceStatusV6(slice, "interrupted");
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
    graceful_pids: stableNumbers(
      ownedWorkers
        .filter((worker) => !remaining.includes(worker))
        .map((worker) => worker.pid!),
    ),
    force_terminated_pids: stableNumbers(
      remaining.map((worker) => worker.pid!),
    ),
    blockers,
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
    if (loaded.campaign.campaign_status === "abandoned")
      return continueAbandonedCleanupV6({
        projectRoot,
        campaignPath,
        campaignRoot: loaded.root,
        campaignId: loaded.campaign.campaign_id,
        integrationRef: loaded.campaign.integration_ref,
        lock,
      });
    const budget = await currentBudget(
      projectRoot,
      loaded.campaign.campaign_id,
      loaded.campaign,
      true,
    );
    return {
      schema_version: "composite-campaign-cleanup-v6",
      campaign_id: loaded.campaign.campaign_id,
      blocker: "campaign_cleanup_requires_abandon",
      ...budget,
    };
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
  const expected = deriveExpectedManagedWorktreesV6({
    repositoryRoot: projectRoot,
    campaign,
  });
  const options = {
    repositoryRoot: projectRoot,
    campaignId,
    expectedWorktrees: expected.all,
    ...(await workerPathProtection(campaign)),
  };
  return reconcileOrphans
    ? reconcileManagedCampaignWorktreesV1(options)
    : inspectManagedWorktreeStateV1(options);
}

async function hasInterruptRequest(
  projectRoot: string,
  campaignPath: string,
): Promise<boolean> {
  try {
    const loaded = await loadCampaignStoreV6(projectRoot, campaignPath);
    await readFile(path.join(loaded.root, ".interrupt-request.json"), "utf8");
    return true;
  } catch {
    return false;
  }
}
async function workerPathProtection(
  campaign: Awaited<ReturnType<typeof loadCampaignStoreV6>>["campaign"],
): Promise<{
  activeWorkerPaths: string[];
  protectedWorkerPaths: string[];
}> {
  const activeWorkerPaths: string[] = [];
  const protectedWorkerPaths: string[] = [];
  const runs = [
    ...Object.values(campaign.slices).map((slice) => slice.current_worker_run),
    campaign.repair.current_worker_run,
  ].filter((run) => run && ["starting", "running"].includes(run.status));
  for (const run of runs) {
    const observation = await inspectWorkerProcessV6(run!);
    if (observation.state === "identity_match")
      activeWorkerPaths.push(run!.cwd);
    if (observation.state === "identity_unavailable")
      protectedWorkerPaths.push(run!.cwd);
  }
  return { activeWorkerPaths, protectedWorkerPaths };
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
