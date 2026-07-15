import {
  executeCampaignSliceV6,
  materializeSliceContractV6,
  type CampaignWorkerRuntimeV6,
} from "./composite-campaign-exec-worker.js";
import { canonicalJson, sha256Hex } from "./composite-campaign-codec.js";
import { currentHead } from "./composite-campaign-git-baseline.js";
import { mergeWaveIntoIntegration } from "./composite-campaign-integration.js";
import {
  boundedCampaignErrorV6,
  assertCampaignNotInterruptedV6,
  campaignSliceContractWorkdirV6,
  readCampaignSliceReceiptV6,
  runRepairWithinBudgetV6,
  stableIdsV6,
} from "./composite-campaign-runtime-helpers-v6.js";
import type { CampaignV6 } from "./composite-campaign-schema-v6.js";
import { verifyWaveAndRepairV6 } from "./composite-campaign-wave-gate-v6.js";
import {
  assertManagedWorktreeBudgetV1,
  createManagedSliceWorktreeV1,
  managedCampaignWorktreePathsV1,
  managedSliceWorktreePathV1,
  removeManagedWorktreeV1,
  repositoryRelativeWorktreePathV1,
} from "./composite-campaign-worktree-budget.js";
import { mutateCampaignV6 } from "./composite-campaign-v6.js";
import { loadCampaignStoreV6 } from "./composite-runtime-v6/campaign-store.js";

export async function scheduleWaveV6(
  runtime: CampaignWorkerRuntimeV6,
  sliceIds: string[],
): Promise<string> {
  const loaded = await loadCampaignStoreV6(
    runtime.projectRoot,
    runtime.campaignPath,
  );
  if (loaded.campaign.active_wave)
    throw new Error("campaign_active_wave_already_exists");
  const base = await currentHead(runtime.integrationWorktree);
  if (base !== loaded.campaign.integration_head)
    throw new Error("campaign_integration_head_drift_before_wave");
  const waveId = nextWaveId(loaded.campaign);
  const ordered = stableIdsV6(sliceIds);
  const scheduleHash = sha256Hex(
    canonicalJson({
      schema_version: "campaign-wave-schedule-v6",
      campaign_id: loaded.campaign.campaign_id,
      wave_id: waveId,
      base_commit: base,
      slice_ids: ordered,
    }),
  );
  await mutateCampaignV6(
    runtime.projectRoot,
    runtime.campaignPath,
    "wave_scheduled",
    async (_root, campaign) => {
      campaign.waves[waveId] = {
        base_commit: base,
        slice_ids: ordered,
        status: "scheduled",
        schedule_sha256: scheduleHash,
        integration_result_sha256: null,
      };
      campaign.active_wave = waveId;
      campaign.campaign_status = "executing";
      for (const sliceId of ordered) {
        const slice = campaign.slices[sliceId];
        slice.status = "scheduled";
        slice.wave_id = waveId;
        slice.base_commit = base;
        slice.worktree_path = repositoryRelativeWorktreePathV1(
          runtime.projectRoot,
          managedSliceWorktreePathV1(
            runtime.projectRoot,
            campaign.campaign_id,
            sliceId,
          ),
        );
        slice.last_error_code = null;
      }
      return campaign;
    },
    runtime.lock,
  );
  return waveId;
}

export async function runWaveV6(
  runtime: CampaignWorkerRuntimeV6,
  waveId: string,
): Promise<void> {
  let loaded = await loadCampaignStoreV6(
    runtime.projectRoot,
    runtime.campaignPath,
  );
  const wave = loaded.campaign.waves[waveId];
  if (!wave || loaded.campaign.active_wave !== waveId)
    throw new Error(`campaign_wave_not_active:${waveId}`);
  if (wave.status === "integration_verified")
    return cleanupCompletedWaveV6(runtime, loaded.campaign, waveId);
  if (wave.status === "merged") {
    await verifyWaveAndRepairV6(runtime, waveId);
    loaded = await loadCampaignStoreV6(
      runtime.projectRoot,
      runtime.campaignPath,
    );
    return cleanupCompletedWaveV6(runtime, loaded.campaign, waveId);
  }
  await ensureWaveWorktrees(runtime, loaded.campaign, waveId);
  const failures = await executePendingWaveSlices(runtime, loaded, waveId);
  if (failures.length) {
    await blockWorkerGroup(runtime, waveId, failures[0].reason);
    throw new Error("campaign_wave_worker_group_failed", {
      cause: failures[0].reason,
    });
  }
  loaded = await loadCampaignStoreV6(runtime.projectRoot, runtime.campaignPath);
  await integrateAcceptedWave(runtime, loaded, waveId);
  await verifyWaveAndRepairV6(runtime, waveId);
  loaded = await loadCampaignStoreV6(runtime.projectRoot, runtime.campaignPath);
  await cleanupCompletedWaveV6(runtime, loaded.campaign, waveId);
}

async function ensureWaveWorktrees(
  runtime: CampaignWorkerRuntimeV6,
  campaign: CampaignV6,
  waveId: string,
): Promise<void> {
  const wave = campaign.waves[waveId];
  const paths = managedCampaignWorktreePathsV1(
    runtime.projectRoot,
    campaign.campaign_id,
  );
  const slices = wave.slice_ids.map((sliceId) =>
    managedSliceWorktreePathV1(
      runtime.projectRoot,
      campaign.campaign_id,
      sliceId,
    ),
  );
  const expected = [paths.integration, ...slices];
  await assertManagedWorktreeBudgetV1({
    repositoryRoot: runtime.projectRoot,
    campaignId: campaign.campaign_id,
    expectedWorktrees: expected,
  });
  for (const sliceId of wave.slice_ids)
    await createManagedSliceWorktreeV1({
      repositoryRoot: runtime.projectRoot,
      campaignId: campaign.campaign_id,
      sliceId,
      baseCommit: wave.base_commit,
      expectedWorktrees: expected,
    });
}

async function executePendingWaveSlices(
  runtime: CampaignWorkerRuntimeV6,
  loaded: Awaited<ReturnType<typeof loadCampaignStoreV6>>,
  waveId: string,
): Promise<PromiseRejectedResult[]> {
  const wave = loaded.campaign.waves[waveId];
  const pending = wave.slice_ids.filter(
    (sliceId) => loaded.campaign.slices[sliceId].status !== "accepted",
  );
  const prepared = new Map(
    await Promise.all(
      pending.map(async (sliceId) => {
        const worktree = managedSliceWorktreePathV1(
          runtime.projectRoot,
          loaded.campaign.campaign_id,
          sliceId,
        );
        return [
          sliceId,
          await materializeSliceContractV6({
            campaignRoot: loaded.root,
            campaign: loaded.campaign,
            sliceId,
            worktree,
          }),
        ] as const;
      }),
    ),
  );
  await mutateCampaignV6(
    runtime.projectRoot,
    runtime.campaignPath,
    "wave_workers_dispatched",
    async (_root, campaign) => {
      campaign.waves[waveId].status = "running";
      return campaign;
    },
    runtime.lock,
  );
  const executions = pending.map(async (sliceId) => {
    const worktree = managedSliceWorktreePathV1(
      runtime.projectRoot,
      loaded.campaign.campaign_id,
      sliceId,
    );
    const authority = prepared.get(sliceId)!;
    return executeCampaignSliceV6({
      runtime,
      sliceId,
      waveId,
      worktree,
      baseCommit: wave.base_commit,
      ...authority,
    });
  });
  const settled = await Promise.allSettled(executions);
  await assertCampaignNotInterruptedV6(runtime);
  return settled.filter(
    (item): item is PromiseRejectedResult => item.status === "rejected",
  );
}

async function integrateAcceptedWave(
  runtime: CampaignWorkerRuntimeV6,
  loaded: Awaited<ReturnType<typeof loadCampaignStoreV6>>,
  waveId: string,
): Promise<void> {
  const wave = loaded.campaign.waves[waveId];
  const inputs = await Promise.all(
    wave.slice_ids.map(async (sliceId) => {
      if (loaded.campaign.slices[sliceId].status !== "accepted")
        throw new Error(`campaign_slice_not_accepted_after_worker:${sliceId}`);
      return {
        receipt: await readCampaignSliceReceiptV6(
          loaded.root,
          loaded.campaign,
          sliceId,
        ),
        worktree: managedSliceWorktreePathV1(
          runtime.projectRoot,
          loaded.campaign.campaign_id,
          sliceId,
        ),
        contract_workdir: campaignSliceContractWorkdirV6(
          runtime.projectRoot,
          loaded.campaign,
          sliceId,
        ),
      };
    }),
  );
  await persistIntegrationIntent(runtime, waveId);
  let merge = await mergeWaveIntoIntegration({
    campaignRoot: loaded.root,
    campaignId: loaded.campaign.campaign_id,
    waveId,
    integrationWorktree: runtime.integrationWorktree,
    slices: inputs,
  });
  if (merge.status === "repair_required") {
    await runRepairWithinBudgetV6(runtime, {
      kind: "merge_conflict",
      affectedSliceIds: merge.conflict_manifest.involved_slice_ids,
      findingsFile: merge.conflict_manifest_path,
      mergeTarget: merge.conflict_manifest.failed_slice_branch,
      explicitConflictPaths: merge.conflict_manifest.conflicted_paths,
    });
    merge = await mergeWaveIntoIntegration({
      campaignRoot: loaded.root,
      campaignId: loaded.campaign.campaign_id,
      waveId,
      integrationWorktree: runtime.integrationWorktree,
      slices: inputs,
    });
  }
  if (merge.status !== "merged")
    throw new Error("campaign_merge_conflict_persisted_after_bounded_repair");
  await persistMergedWave(runtime, waveId, merge);
}

async function persistIntegrationIntent(
  runtime: CampaignWorkerRuntimeV6,
  waveId: string,
) {
  await mutateCampaignV6(
    runtime.projectRoot,
    runtime.campaignPath,
    "wave_integration_intent",
    async (_root, campaign) => {
      campaign.waves[waveId].status = "accepted";
      campaign.campaign_status = "integrating";
      return campaign;
    },
    runtime.lock,
  );
}

async function persistMergedWave(
  runtime: CampaignWorkerRuntimeV6,
  waveId: string,
  merged: Extract<
    Awaited<ReturnType<typeof mergeWaveIntoIntegration>>,
    { status: "merged" }
  >,
) {
  await mutateCampaignV6(
    runtime.projectRoot,
    runtime.campaignPath,
    "wave_merged",
    async (_root, campaign, artifacts) => {
      artifacts.stageFile(
        `waves/${waveId}/merge-result.json`,
        canonicalJson(merged),
      );
      campaign.integration_head = merged.integration_head;
      campaign.waves[waveId].status = "merged";
      for (const record of merged.merges) {
        campaign.slices[record.slice_id].status = "merged";
        campaign.slices[record.slice_id].merge_commit = record.merge_commit;
      }
      campaign.campaign_status = "integrating";
      return campaign;
    },
    runtime.lock,
  );
}

async function blockWorkerGroup(
  runtime: CampaignWorkerRuntimeV6,
  waveId: string,
  error: unknown,
) {
  await mutateCampaignV6(
    runtime.projectRoot,
    runtime.campaignPath,
    "wave_worker_group_blocked",
    async (_root, campaign) => {
      campaign.waves[waveId].status = "blocked";
      if (campaign.campaign_status !== "blocked") {
        campaign.campaign_status = "blocked";
        campaign.block_reason = boundedCampaignErrorV6(error);
      }
      return campaign;
    },
    runtime.lock,
  );
}

async function cleanupCompletedWaveV6(
  runtime: CampaignWorkerRuntimeV6,
  campaign: CampaignV6,
  waveId: string,
): Promise<void> {
  const wave = campaign.waves[waveId];
  if (!wave || wave.status !== "integration_verified")
    throw new Error(`campaign_wave_cleanup_before_gate:${waveId}`);
  for (const sliceId of wave.slice_ids)
    await removeManagedWorktreeV1({
      repositoryRoot: runtime.projectRoot,
      campaignId: campaign.campaign_id,
      worktreePath: managedSliceWorktreePathV1(
        runtime.projectRoot,
        campaign.campaign_id,
        sliceId,
      ),
    });
  await mutateCampaignV6(
    runtime.projectRoot,
    runtime.campaignPath,
    "wave_worktrees_removed",
    async (_root, current) => {
      for (const sliceId of wave.slice_ids)
        current.slices[sliceId].worktree_path = null;
      current.active_wave = null;
      current.campaign_status = "executing";
      return current;
    },
    runtime.lock,
  );
}

function nextWaveId(campaign: CampaignV6): string {
  const values = Object.keys(campaign.waves)
    .map((value) => /^WAVE-(\d+)$/u.exec(value))
    .filter((value): value is RegExpExecArray => Boolean(value))
    .map((value) => Number(value[1]));
  return `WAVE-${String(Math.max(0, ...values) + 1).padStart(3, "0")}`;
}
