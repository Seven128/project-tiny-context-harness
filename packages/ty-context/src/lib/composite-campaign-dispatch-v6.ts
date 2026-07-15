import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  loadCampaignStoreV6,
  type CampaignLockHandleV6,
} from "./composite-runtime-v6/campaign-store.js";

export class CampaignWorkerInterruptedError extends Error {
  constructor(reason = "campaign_worker_interrupted") {
    super(reason);
    this.name = "CampaignWorkerInterruptedError";
  }
}

export async function assertCampaignDispatchAllowedV6(options: {
  projectRoot: string;
  campaignPath: string;
  campaignRoot: string;
  lock: CampaignLockHandleV6;
  expectedRunGeneration: number;
  signal?: AbortSignal;
}): Promise<void> {
  if (options.signal?.aborted)
    throw new CampaignWorkerInterruptedError("campaign_abort_signal_received");
  await options.lock.assertOwned();
  try {
    await readFile(
      path.join(options.campaignRoot, ".interrupt-request.json"),
      "utf8",
    );
    throw new CampaignWorkerInterruptedError("campaign_interrupt_requested");
  } catch (error) {
    if (error instanceof CampaignWorkerInterruptedError) throw error;
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const { campaign } = await loadCampaignStoreV6(
    options.projectRoot,
    options.campaignPath,
  );
  if (campaign.run_generation !== options.expectedRunGeneration)
    throw new CampaignWorkerInterruptedError("campaign_run_generation_changed");
  if (campaign.campaign_status === "interrupted")
    throw new CampaignWorkerInterruptedError("campaign_status_interrupted");
  if (campaign.campaign_status === "accepted")
    throw new Error("campaign_dispatch_forbidden_after_acceptance");
  if (campaign.campaign_status === "abandoned")
    throw new Error("campaign_dispatch_forbidden_after_abandon");
  if (
    campaign.campaign_status === "blocked" ||
    campaign.campaign_status === "decision_blocked" ||
    campaign.campaign_status === "externally_blocked"
  )
    throw new Error(`campaign_dispatch_forbidden:${campaign.campaign_status}`);
  await options.lock.assertOwned();
}
