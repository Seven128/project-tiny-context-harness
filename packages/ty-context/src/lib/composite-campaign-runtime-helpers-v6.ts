import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  CampaignWorkerInterruptedError,
  type CampaignWorkerRuntimeV6,
} from "./composite-campaign-exec-worker.js";
import { campaignFinalInputV6 } from "./composite-campaign-gates-v6.js";
import {
  readSliceExecutionReceiptV3,
  type SliceExecutionReceiptV3,
} from "./composite-campaign-receipt.js";
import {
  runSerializedRepairV6,
  type SerializedRepairRequestV6,
} from "./composite-campaign-repair-v6.js";
import type { CampaignV6 } from "./composite-campaign-schema-v6.js";
import { resolveManagedWorktreePathV1 } from "./composite-campaign-worktree-budget.js";
import { mutateCampaignV6 } from "./composite-campaign-v6.js";
import { loadCampaignStoreV6 } from "./composite-runtime-v6/campaign-store.js";

export async function readCampaignSliceReceiptV6(
  campaignRoot: string,
  campaign: CampaignV6,
  sliceId: string,
): Promise<SliceExecutionReceiptV3> {
  const input = campaignFinalInputV6(campaignRoot, campaign, sliceId);
  const receipt = await readSliceExecutionReceiptV3(input.receipt_path);
  if (receipt.receipt_sha256 !== campaign.slices[sliceId].final_receipt_sha256)
    throw new Error(`campaign_slice_receipt_hash_drift:${sliceId}`);
  return receipt;
}

export function campaignSliceContractWorkdirV6(
  projectRoot: string,
  campaign: CampaignV6,
  sliceId: string,
): string {
  const slice = campaign.slices[sliceId];
  if (!slice.worktree_path || !slice.packet_revision)
    throw new Error(`campaign_slice_contract_workdir_missing:${sliceId}`);
  return path.join(
    resolveManagedWorktreePathV1(projectRoot, slice.worktree_path),
    "tmp",
    "ty-context",
    "plan-acceptance",
    campaign.campaign_id,
    `${sliceId}-r${slice.packet_revision}`,
  );
}

export async function runRepairWithinBudgetV6(
  runtime: CampaignWorkerRuntimeV6,
  request: SerializedRepairRequestV6,
) {
  const loaded = await loadCampaignStoreV6(
    runtime.projectRoot,
    runtime.campaignPath,
  );
  const baseline =
    runtime.repairAttemptBaseline ?? loaded.campaign.repair.attempt_count;
  const used = loaded.campaign.repair.attempt_count - baseline;
  const remaining =
    loaded.campaign.campaign_policy.max_repair_attempts_per_run - used;
  if (remaining < 1) {
    await mutateCampaignV6(
      runtime.projectRoot,
      runtime.campaignPath,
      "repair_attempt_limit_exceeded",
      async (_root, campaign) => {
        campaign.repair.status = "blocked";
        campaign.repair.last_error_code = "repair_attempt_limit_exceeded";
        campaign.campaign_status = "blocked";
        campaign.block_reason = "repair_attempt_limit_exceeded";
        return campaign;
      },
      runtime.lock,
    );
    throw new Error("repair_attempt_limit_exceeded");
  }
  return runSerializedRepairV6(runtime, {
    ...request,
    maxAttempts: remaining,
  });
}

export async function assertCampaignNotInterruptedV6(
  runtime: CampaignWorkerRuntimeV6,
): Promise<void> {
  if (runtime.signal?.aborted) throw new CampaignWorkerInterruptedError();
  try {
    await readFile(
      path.join(runtime.campaignRoot, ".interrupt-request.json"),
      "utf8",
    );
    throw new CampaignWorkerInterruptedError();
  } catch (error) {
    if (error instanceof CampaignWorkerInterruptedError) throw error;
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

export function stableIdsV6(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) =>
    left < right ? -1 : left > right ? 1 : 0,
  );
}

export function boundedCampaignErrorV6(error: unknown): string {
  const value = error instanceof Error ? error.message : String(error);
  return value.replace(/[\r\n]+/gu, " ").slice(0, 500) || "campaign_blocked";
}
