import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { continueAcceptedCleanupV6 } from "./composite-campaign-accepted-authority-v6.js";
import {
  ensureIntegrationWorktreeV6,
  freezeOrValidateExecutionEngineV6,
} from "./composite-campaign-bootstrap-v6.js";
import { dryRunCampaignV6 } from "./composite-campaign-dry-run-v6.js";
import {
  authorCampaignPacketsV6,
  CampaignWorkerInterruptedError,
  type CampaignWorkerRuntimeV6,
} from "./composite-campaign-exec-worker.js";
import { finalizeCampaignV6 } from "./composite-campaign-finalizer-v6.js";
import { readConflictProfile } from "./composite-campaign-gates-v6.js";
import { CampaignMutationQueue } from "./composite-campaign-mutation-queue.js";
import { planCampaignNextActionV6 } from "./composite-campaign-planner-v6.js";
import { reconcileCampaignV6 } from "./composite-campaign-reconcile-v6.js";
import {
  assertCampaignNotInterruptedV6,
  boundedCampaignErrorV6,
} from "./composite-campaign-runtime-helpers-v6.js";
import {
  campaignRunResultV6,
  type RunCampaignResultV6,
  type RunCampaignV6Options,
} from "./composite-campaign-runner-types-v6.js";
import { parseCurrentScopeV6 } from "./composite-runtime-v6/campaign-packet-io.js";
import {
  acquireCampaignLockV6,
  loadCampaignStoreV6,
  type CampaignLockHandleV6,
} from "./composite-runtime-v6/campaign-store.js";
import { mutateCampaignV6 } from "./composite-campaign-v6.js";
import {
  runWaveV6,
  scheduleWaveV6,
} from "./composite-campaign-wave-runner-v6.js";

export { dryRunCampaignV6 };
export type {
  CampaignDryRunV6,
  RunCampaignResultV6,
  RunCampaignV6Options,
} from "./composite-campaign-runner-types-v6.js";

export async function runCampaignV6(
  options: RunCampaignV6Options,
): Promise<RunCampaignResultV6> {
  const initial = await loadCampaignStoreV6(
    options.projectRoot,
    options.campaignPath,
  );
  const lock = await acquireCampaignLockV6(initial.root, "run_v6");
  const abort = new AbortController();
  const forwardAbort = () => abort.abort();
  options.signal?.addEventListener("abort", forwardAbort, { once: true });
  process.once("SIGINT", forwardAbort);
  process.once("SIGTERM", forwardAbort);
  try {
    if (initial.campaign.campaign_status === "accepted")
      return resumeAcceptedCampaign(options, lock);
    await rm(path.join(initial.root, ".interrupt-request.json"), {
      force: true,
    });
    await startRunGeneration(options, lock);
    await reconcileCampaignV6({
      projectRoot: options.projectRoot,
      campaignPath: options.campaignPath,
      lock,
    });
    await freezeOrValidateExecutionEngineV6(options, lock);
    const integration = await ensureIntegrationWorktreeV6(options, lock);
    const current = await loadCampaignStoreV6(
      options.projectRoot,
      options.campaignPath,
    );
    const runtime: CampaignWorkerRuntimeV6 = {
      projectRoot: options.projectRoot,
      campaignPath: options.campaignPath,
      campaignRoot: initial.root,
      integrationWorktree: integration,
      lock,
      queue: new CampaignMutationQueue(),
      signal: abort.signal,
      codexExecutable: options.codexExecutable,
      repairAttemptBaseline: current.campaign.repair.attempt_count,
    };
    return await foregroundLoop(runtime);
  } catch (error) {
    if (abort.signal.aborted || error instanceof CampaignWorkerInterruptedError)
      await markCampaignInterrupted(options, lock, error);
    else await markCampaignBlocked(options, lock, error);
    const campaign = await loadCampaignStoreV6(
      options.projectRoot,
      options.campaignPath,
    );
    return campaignRunResultV6(campaign.campaign, null);
  } finally {
    options.signal?.removeEventListener("abort", forwardAbort);
    process.removeListener("SIGINT", forwardAbort);
    process.removeListener("SIGTERM", forwardAbort);
    await lock.close();
  }
}

async function foregroundLoop(
  runtime: CampaignWorkerRuntimeV6,
): Promise<RunCampaignResultV6> {
  for (let step = 0; step < 10_000; step += 1) {
    await assertCampaignNotInterruptedV6(runtime);
    const loaded = await loadCampaignStoreV6(
      runtime.projectRoot,
      runtime.campaignPath,
    );
    if (loaded.campaign.campaign_status === "accepted") {
      const authority = await continueAcceptedCleanupV6({
        projectRoot: runtime.projectRoot,
        campaignPath: runtime.campaignPath,
        lock: runtime.lock,
      });
      const current = await loadCampaignStoreV6(
        runtime.projectRoot,
        runtime.campaignPath,
      );
      return campaignRunResultV6(current.campaign, authority.target_commit);
    }
    const scope = parseCurrentScopeV6(
      await readFile(path.join(loaded.root, "scope-fit.json"), "utf8"),
    );
    let action = planCampaignNextActionV6({
      campaign: loaded.campaign,
      scope,
    });
    if (
      action.action === "inconsistent_state" &&
      action.reason === "ready_conflict_profiles_required"
    )
      action = await planReadyWave(loaded.root, loaded.campaign, scope);
    if (action.action === "author_packets") {
      const authored = await authorCampaignPacketsV6(runtime, action.slice_ids);
      if (
        !authored.scope_revised &&
        authored.authored_slice_ids.length !== action.slice_ids.length
      )
        throw new Error("campaign_packet_authoring_incomplete_without_blocker");
      continue;
    }
    if (action.action === "launch_wave") {
      const waveId = await scheduleWaveV6(runtime, action.schedule.slice_ids);
      await runWaveV6(runtime, waveId);
      continue;
    }
    if (action.action === "resume_wave") {
      await runWaveV6(runtime, action.wave_id);
      continue;
    }
    if (action.action === "finalize") return finalizeCampaignV6(runtime);
    if (
      action.action === "decision_required" ||
      action.action === "wait_external" ||
      action.action === "blocked"
    )
      return campaignRunResultV6(loaded.campaign, null);
    throw new Error(`campaign_v6_inconsistent_state:${action.reason}`);
  }
  throw new Error("campaign_v6_mechanical_step_limit_exceeded");
}

async function planReadyWave(
  campaignRoot: string,
  campaign: Awaited<ReturnType<typeof loadCampaignStoreV6>>["campaign"],
  scope: ReturnType<typeof parseCurrentScopeV6>,
) {
  const integrated = new Set(
    Object.entries(campaign.slices)
      .filter(([, slice]) => slice.status === "integration_verified")
      .map(([sliceId]) => sliceId),
  );
  const ready = scope.slices
    .filter(
      (slice) =>
        !integrated.has(slice.slice_id) &&
        slice.depends_on.every((dependency) => integrated.has(dependency)) &&
        ["packet_ready", "interrupted", "needs_work", "accepted"].includes(
          campaign.slices[slice.slice_id]?.status ?? "planned",
        ),
    )
    .map((slice) => slice.slice_id);
  const profiles = await Promise.all(
    ready.map(
      async (sliceId) =>
        [
          sliceId,
          await readConflictProfile(campaignRoot, campaign, sliceId),
        ] as const,
    ),
  );
  return planCampaignNextActionV6({
    campaign,
    scope,
    readyConflictProfiles: Object.fromEntries(profiles),
  });
}

async function startRunGeneration(
  options: RunCampaignV6Options,
  lock: CampaignLockHandleV6,
): Promise<void> {
  await mutateCampaignV6(
    options.projectRoot,
    options.campaignPath,
    "campaign_run_started",
    async (_root, campaign) => {
      campaign.run_generation += 1;
      if (
        campaign.campaign_status === "interrupted" ||
        (campaign.campaign_status === "blocked" &&
          [
            "worker_attempt_limit_exceeded",
            "packet_authoring_attempt_limit_exceeded",
            "repair_attempt_limit_exceeded",
          ].includes(campaign.block_reason ?? ""))
      ) {
        campaign.campaign_status = "executing";
        campaign.block_reason = null;
      }
      return campaign;
    },
    lock,
  );
}

async function resumeAcceptedCampaign(
  options: RunCampaignV6Options,
  lock: CampaignLockHandleV6,
): Promise<RunCampaignResultV6> {
  const authority = await continueAcceptedCleanupV6({
    projectRoot: options.projectRoot,
    campaignPath: options.campaignPath,
    lock,
  });
  const campaign = await loadCampaignStoreV6(
    options.projectRoot,
    options.campaignPath,
  );
  return campaignRunResultV6(campaign.campaign, authority.target_commit);
}

async function markCampaignInterrupted(
  options: RunCampaignV6Options,
  lock: CampaignLockHandleV6,
  error: unknown,
): Promise<void> {
  await mutateCampaignV6(
    options.projectRoot,
    options.campaignPath,
    "campaign_interrupted",
    async (_root, campaign) => {
      campaign.campaign_status = "interrupted";
      campaign.block_reason = boundedCampaignErrorV6(error);
      if (campaign.active_wave)
        campaign.waves[campaign.active_wave].status = "interrupted";
      for (const slice of Object.values(campaign.slices))
        if (slice.status === "worker_running") slice.status = "interrupted";
      if (campaign.repair.status === "running")
        campaign.repair.status = "interrupted";
      return campaign;
    },
    lock,
  );
}

async function markCampaignBlocked(
  options: RunCampaignV6Options,
  lock: CampaignLockHandleV6,
  error: unknown,
): Promise<void> {
  try {
    await mutateCampaignV6(
      options.projectRoot,
      options.campaignPath,
      "campaign_failed_closed",
      async (_root, campaign) => {
        if (
          !["blocked", "decision_blocked", "externally_blocked"].includes(
            campaign.campaign_status,
          )
        ) {
          campaign.campaign_status = "blocked";
          campaign.block_reason = boundedCampaignErrorV6(error);
        }
        return campaign;
      },
      lock,
    );
  } catch {}
}
