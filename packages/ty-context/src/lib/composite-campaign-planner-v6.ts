import { computeReadyFrontierV4 } from "./composite-campaign-graph.js";
import {
  selectDeterministicWaveV4,
  type ScheduledWaveV4,
} from "./composite-campaign-scheduler.js";
import type { ConflictProfileV4 } from "./composite-campaign-conflicts.js";
import type { CampaignV6 } from "./composite-campaign-schema-v6.js";
import type { ScopeFitResultV4 } from "./scope-fit-v4.js";

export type CampaignPlannerActionV6 =
  | { action: "author_packets"; slice_ids: string[] }
  | { action: "resume_wave"; wave_id: string }
  | { action: "launch_wave"; schedule: ScheduledWaveV4 }
  | { action: "finalize" }
  | { action: "decision_required"; reason: string }
  | { action: "wait_external"; reason: string }
  | { action: "blocked"; reason: string }
  | { action: "inconsistent_state"; reason: string };

export function planCampaignNextActionV6(options: {
  campaign: CampaignV6;
  scope: ScopeFitResultV4;
  readyConflictProfiles?: Record<string, ConflictProfileV4>;
}): CampaignPlannerActionV6 {
  const { campaign, scope } = options;
  if (campaign.active_wave) {
    const wave = campaign.waves[campaign.active_wave];
    if (!wave)
      return { action: "inconsistent_state", reason: "active_wave_missing" };
    return { action: "resume_wave", wave_id: campaign.active_wave };
  }
  if (campaign.campaign_status === "decision_blocked")
    return {
      action: "decision_required",
      reason: campaign.block_reason ?? "scope_decision_required",
    };
  if (campaign.campaign_status === "externally_blocked")
    return {
      action: "wait_external",
      reason: campaign.block_reason ?? "external_authority_required",
    };
  if (
    campaign.campaign_status === "blocked" &&
    campaign.block_reason &&
    ![
      "worker_attempt_limit_exceeded",
      "packet_authoring_attempt_limit_exceeded",
      "repair_attempt_limit_exceeded",
    ].includes(campaign.block_reason)
  )
    return { action: "blocked", reason: campaign.block_reason };
  const integrated = Object.entries(campaign.slices)
    .filter(([, slice]) => slice.status === "integration_verified")
    .map(([sliceId]) => sliceId);
  if (integrated.length === Object.keys(campaign.slices).length)
    return Object.keys(campaign.slices).length
      ? { action: "finalize" }
      : { action: "inconsistent_state", reason: "campaign_scope_empty" };
  const frontier = computeReadyFrontierV4(scope, integrated);
  if (!frontier.length)
    return {
      action: "inconsistent_state",
      reason: "no_ready_frontier_before_all_slices_integrated",
    };
  const missingPackets = frontier
    .filter((item) => {
      const slice = campaign.slices[item.slice_id];
      return !slice?.packet_revision || !slice.packet_sha256;
    })
    .filter(
      (item) =>
        !["accepted", "merged", "integration_verified"].includes(
          campaign.slices[item.slice_id]?.status ?? "planned",
        ),
    )
    .map((item) => item.slice_id);
  if (missingPackets.length)
    return { action: "author_packets", slice_ids: missingPackets };
  const executable = frontier.filter((item) =>
    ["packet_ready", "interrupted", "needs_work", "accepted"].includes(
      campaign.slices[item.slice_id]?.status ?? "planned",
    ),
  );
  if (!executable.length)
    return {
      action: "inconsistent_state",
      reason: "ready_frontier_has_no_executable_slice",
    };
  if (!options.readyConflictProfiles)
    return {
      action: "inconsistent_state",
      reason: "ready_conflict_profiles_required",
    };
  const profiles = executable.map((item) => {
    const profile = options.readyConflictProfiles![item.slice_id];
    if (!profile)
      throw new Error(
        `campaign_ready_conflict_profile_missing:${item.slice_id}`,
      );
    return profile;
  });
  return {
    action: "launch_wave",
    schedule: selectDeterministicWaveV4(profiles, {
      max_concurrency: campaign.execution_engine.max_parallelism.sfc,
    }),
  };
}
