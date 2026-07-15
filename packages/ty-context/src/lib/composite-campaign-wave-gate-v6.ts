import path from "node:path";
import type { CampaignWorkerRuntimeV6 } from "./composite-campaign-exec-worker.js";
import { runWaveIntegrationGate } from "./composite-campaign-final-gate.js";
import {
  analyzeWaveImpactV6,
  campaignFinalInputV6,
  loadCampaignScopeCoverageV6,
} from "./composite-campaign-gates-v6.js";
import {
  assertCampaignNotInterruptedV6,
  runRepairWithinBudgetV6,
} from "./composite-campaign-runtime-helpers-v6.js";
import {
  transitionSliceStatusV6,
  transitionWaveStatusV6,
} from "./composite-campaign-state-transition-v6.js";
import { mutateCampaignV6 } from "./composite-campaign-v6.js";
import { loadCampaignStoreV6 } from "./composite-runtime-v6/campaign-store.js";

export async function verifyWaveAndRepairV6(
  runtime: CampaignWorkerRuntimeV6,
  waveId: string,
): Promise<void> {
  for (let repairCycle = 0; repairCycle <= 4; repairCycle += 1) {
    await assertCampaignNotInterruptedV6(runtime);
    const loaded = await loadCampaignStoreV6(
      runtime.projectRoot,
      runtime.campaignPath,
    );
    const authority = await loadCampaignScopeCoverageV6(loaded.root);
    const impact = await analyzeWaveImpactV6({
      campaignRoot: loaded.root,
      campaign: loaded.campaign,
      integrationWorktree: runtime.integrationWorktree,
      waveId,
      scope: authority.scope,
      coverage: authority.coverage,
    });
    const runGate = () =>
      runWaveIntegrationGate({
        campaignRoot: loaded.root,
        campaignId: loaded.campaign.campaign_id,
        waveId,
        integrationWorktree: runtime.integrationWorktree,
        slices: impact.affected_slice_ids.map((sliceId) =>
          campaignFinalInputV6(loaded.root, loaded.campaign, sliceId),
        ),
        impact,
      });
    const gate = runtime.metrics
      ? await runtime.metrics.measure("gate_wall_ms", runGate)
      : await runGate();
    await assertCampaignNotInterruptedV6(runtime);
    if (gate.workflow_status === "integration_verified") {
      await persistVerifiedWave(runtime, waveId, gate);
      return;
    }
    if (repairCycle === 4)
      throw new Error("wave_integration_gate_repair_limit_exceeded");
    await runRepairWithinBudgetV6(runtime, {
      kind: "integration_regression",
      affectedSliceIds: impact.affected_slice_ids,
      findingsFile: path.join(
        loaded.root,
        "waves",
        waveId,
        "integration-result.json",
      ),
    });
  }
}

async function persistVerifiedWave(
  runtime: CampaignWorkerRuntimeV6,
  waveId: string,
  gate: Awaited<ReturnType<typeof runWaveIntegrationGate>>,
): Promise<void> {
  await mutateCampaignV6(
    runtime.projectRoot,
    runtime.campaignPath,
    "wave_integration_verified",
    async (_root, campaign) => {
      campaign.integration_head = gate.integration_head;
      campaign.waves[waveId].status = transitionWaveStatusV6(
        campaign.waves[waveId].status,
        "integration_verified",
      );
      campaign.waves[waveId].integration_result_sha256 = gate.result_sha256;
      for (const sliceId of campaign.waves[waveId].slice_ids) {
        transitionSliceStatusV6(
          campaign.slices[sliceId],
          "integration_verified",
        );
        campaign.slices[sliceId].integration_result_sha256 = gate.result_sha256;
      }
      return campaign;
    },
    runtime.lock,
  );
}
