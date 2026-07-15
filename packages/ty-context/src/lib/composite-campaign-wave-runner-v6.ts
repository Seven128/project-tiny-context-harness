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
import {
  isExecutableSliceStatusV6,
  transitionSliceStatusV6,
  transitionWaveStatusV6,
} from "./composite-campaign-state-transition-v6.js";
import { verifyWaveAndRepairV6 } from "./composite-campaign-wave-gate-v6.js";
import {
  assertManagedWorktreeBudgetV1,
  createManagedSliceWorktreeV1,
  managedSliceWorktreePathV1,
  removeManagedWorktreeV1,
  repositoryRelativeWorktreePathV1,
} from "./composite-campaign-worktree-budget.js";
import { deriveExpectedManagedWorktreesV6 } from "./composite-campaign-worktree-expectation-v6.js";
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
  for (const sliceId of stableIdsV6(sliceIds)) {
    const slice = loaded.campaign.slices[sliceId];
    if (!slice) throw new Error(`campaign_slice_unknown:${sliceId}`);
    if (slice.status === "accepted")
      throw new Error(
        `campaign_accepted_slice_requires_wave_resume:${sliceId}`,
      );
    if (slice.status === "merged" || slice.status === "integration_verified")
      throw new Error(`campaign_slice_cannot_join_new_wave:${sliceId}`);
    if (!isExecutableSliceStatusV6(slice.status))
      throw new Error(
        `campaign_slice_not_schedulable:${sliceId}:${slice.status}`,
      );
  }
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
        transitionSliceStatusV6(slice, "scheduled");
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
  await assertCampaignNotInterruptedV6(runtime);
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
  if (wave.status === "accepted") {
    await assertCampaignNotInterruptedV6(runtime);
    await integrateAcceptedWave(runtime, loaded, waveId);
    await verifyWaveAndRepairV6(runtime, waveId);
    loaded = await loadCampaignStoreV6(
      runtime.projectRoot,
      runtime.campaignPath,
    );
    return cleanupCompletedWaveV6(runtime, loaded.campaign, waveId);
  }
  await ensureWaveWorktrees(runtime, loaded.campaign, waveId);
  await assertCampaignNotInterruptedV6(runtime);
  const failures = await executePendingWaveSlices(runtime, loaded, waveId);
  if (failures.length) {
    await blockWorkerGroup(runtime, waveId, failures[0].reason);
    throw new Error("campaign_wave_worker_group_failed", {
      cause: failures[0].reason,
    });
  }
  loaded = await loadCampaignStoreV6(runtime.projectRoot, runtime.campaignPath);
  await assertCampaignNotInterruptedV6(runtime);
  await integrateAcceptedWave(runtime, loaded, waveId);
  await assertCampaignNotInterruptedV6(runtime);
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
  const expected = deriveExpectedManagedWorktreesV6({
    repositoryRoot: runtime.projectRoot,
    campaign,
  });
  await assertManagedWorktreeBudgetV1({
    repositoryRoot: runtime.projectRoot,
    campaignId: campaign.campaign_id,
    expectedWorktrees: expected.all,
  });
  for (const sliceId of wave.slice_ids) {
    const slice = campaign.slices[sliceId];
    const frozenBase = slice.base_commit ?? wave.base_commit;
    if (frozenBase !== wave.base_commit)
      throw new Error(`campaign_slice_wave_base_drift:${sliceId}`);
    const receipt = slice.final_receipt_sha256
      ? await readCampaignSliceReceiptV6(
          runtime.campaignRoot,
          campaign,
          sliceId,
        )
      : null;
    if (
      receipt &&
      (receipt.campaign_id !== campaign.campaign_id ||
        receipt.slice_id !== sliceId ||
        receipt.wave_id !== waveId ||
        receipt.base_commit !== frozenBase ||
        receipt.packet_sha256 !== slice.packet_sha256)
    )
      throw new Error(`campaign_slice_receipt_identity_drift:${sliceId}`);
    if ((slice.status === "accepted" || slice.status === "merged") && !receipt)
      throw new Error(`campaign_slice_receipt_missing_for_resume:${sliceId}`);
    if (
      slice.head_commit &&
      receipt &&
      slice.head_commit !== receipt.head_commit
    )
      throw new Error(`campaign_slice_head_receipt_drift:${sliceId}`);
    const checkoutCommit =
      slice.head_commit ?? receipt?.head_commit ?? frozenBase;
    const managed = await createManagedSliceWorktreeV1({
      repositoryRoot: runtime.projectRoot,
      campaignId: campaign.campaign_id,
      sliceId,
      frozenBaseCommit: frozenBase,
      checkoutCommit,
      expectedWorktrees: expected.all,
    });
    if (!managed.resumed) runtime.metrics?.increment("worktree_create_count");
  }
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
      campaign.waves[waveId].status = transitionWaveStatusV6(
        campaign.waves[waveId].status,
        "running",
      );
      return campaign;
    },
    runtime.lock,
  );
  const executions = pending.map(async (sliceId) => {
    await assertCampaignNotInterruptedV6(runtime);
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
  if (runtime.metrics)
    return runtime.metrics.measure("integration_wall_ms", () =>
      integrateAcceptedWaveUnmeasured(runtime, loaded, waveId),
    );
  return integrateAcceptedWaveUnmeasured(runtime, loaded, waveId);
}

async function integrateAcceptedWaveUnmeasured(
  runtime: CampaignWorkerRuntimeV6,
  loaded: Awaited<ReturnType<typeof loadCampaignStoreV6>>,
  waveId: string,
): Promise<void> {
  await assertCampaignNotInterruptedV6(runtime);
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
      campaign.waves[waveId].status = transitionWaveStatusV6(
        campaign.waves[waveId].status,
        "accepted",
      );
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
      campaign.waves[waveId].status = transitionWaveStatusV6(
        campaign.waves[waveId].status,
        "merged",
      );
      for (const record of merged.merges) {
        transitionSliceStatusV6(campaign.slices[record.slice_id], "merged");
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
      campaign.waves[waveId].status = transitionWaveStatusV6(
        campaign.waves[waveId].status,
        "blocked",
      );
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
    }).then(() => runtime.metrics?.increment("worktree_remove_count"));
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
