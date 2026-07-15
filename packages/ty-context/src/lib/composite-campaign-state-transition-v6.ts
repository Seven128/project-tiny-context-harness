import type {
  CampaignSliceV6,
  CampaignV6,
  CampaignWaveStatusV6,
  SliceStatusV6,
} from "./composite-campaign-schema-v6.js";

const SLICE_TRANSITIONS: Record<SliceStatusV6, readonly SliceStatusV6[]> = {
  planned: ["packet_pending"],
  packet_pending: ["packet_ready"],
  packet_ready: ["packet_pending", "scheduled"],
  scheduled: ["worker_running"],
  worker_running: ["accepted", "needs_work", "needs_attention", "interrupted"],
  needs_work: ["scheduled"],
  needs_attention: ["scheduled"],
  interrupted: ["scheduled"],
  accepted: ["merged"],
  merged: ["integration_verified"],
  integration_verified: [],
  decision_blocked: ["packet_pending"],
  externally_blocked: ["packet_pending"],
};

const WAVE_TRANSITIONS: Record<
  CampaignWaveStatusV6,
  readonly CampaignWaveStatusV6[]
> = {
  scheduled: ["running", "interrupted", "blocked"],
  running: ["accepted", "interrupted", "blocked", "repair_required"],
  accepted: ["merged", "repair_required"],
  repair_required: ["accepted", "merged", "blocked", "interrupted"],
  blocked: ["running", "interrupted"],
  interrupted: ["running", "blocked"],
  merged: ["integration_verified", "repair_required"],
  integration_verified: [],
};

export const EXECUTABLE_SLICE_STATUSES_V6 = [
  "packet_ready",
  "needs_work",
  "needs_attention",
  "interrupted",
] as const satisfies readonly SliceStatusV6[];

export function isExecutableSliceStatusV6(status: SliceStatusV6): boolean {
  return (EXECUTABLE_SLICE_STATUSES_V6 as readonly SliceStatusV6[]).includes(
    status,
  );
}

export function transitionSliceStatusV6(
  slice: CampaignSliceV6,
  next: SliceStatusV6,
): void {
  const current = slice.status;
  if (current === next) return;
  if (!SLICE_TRANSITIONS[current].includes(next))
    throw new Error(`campaign_slice_transition_invalid:${current}->${next}`);
  slice.status = next;
}

export function transitionWaveStatusV6(
  current: CampaignWaveStatusV6,
  next: CampaignWaveStatusV6,
): CampaignWaveStatusV6 {
  if (current === next) return current;
  if (!WAVE_TRANSITIONS[current].includes(next))
    throw new Error(`campaign_wave_transition_invalid:${current}->${next}`);
  return next;
}

export function bindAcceptedSliceFromReceiptV6(slice: CampaignSliceV6): void {
  if (slice.status === "accepted") return;
  if (slice.status === "merged" || slice.status === "integration_verified")
    return;
  if (
    ![
      "scheduled",
      "worker_running",
      "needs_work",
      "needs_attention",
      "interrupted",
    ].includes(slice.status)
  )
    throw new Error(`campaign_receipt_bind_invalid:${slice.status}->accepted`);
  slice.status = "accepted";
}

export function reconcileActiveWaveIdentityV6(campaign: CampaignV6): {
  changed: boolean;
  active_wave: string | null;
} {
  const incomplete = Object.entries(campaign.waves)
    .filter(([, wave]) => wave.status !== "integration_verified")
    .map(([waveId]) => waveId)
    .sort(asciiCompare);
  if (incomplete.length > 1) throw new Error("multiple_incomplete_waves");
  for (const waveId of incomplete) assertWaveSliceIdentity(campaign, waveId);
  const sole = incomplete[0] ?? null;
  if (campaign.active_wave) {
    const active = campaign.waves[campaign.active_wave];
    if (!active) throw new Error("active_wave_missing");
    if (active.status === "integration_verified") {
      if (sole) throw new Error("active_wave_not_unique_incomplete_wave");
      campaign.active_wave = null;
      return { changed: true, active_wave: null };
    }
    if (campaign.active_wave !== sole)
      throw new Error("active_wave_not_unique_incomplete_wave");
    return { changed: false, active_wave: campaign.active_wave };
  }
  if (sole) {
    campaign.active_wave = sole;
    return { changed: true, active_wave: sole };
  }
  return { changed: false, active_wave: null };
}

function assertWaveSliceIdentity(campaign: CampaignV6, waveId: string): void {
  const wave = campaign.waves[waveId];
  const members = new Set(wave.slice_ids);
  for (const sliceId of wave.slice_ids) {
    const slice = campaign.slices[sliceId];
    if (!slice || slice.wave_id !== waveId)
      throw new Error(
        `campaign_wave_slice_identity_drift:${waveId}:${sliceId}`,
      );
  }
  for (const [sliceId, slice] of Object.entries(campaign.slices))
    if (slice.wave_id === waveId && !members.has(sliceId))
      throw new Error(
        `campaign_wave_slice_identity_drift:${waveId}:${sliceId}`,
      );
}

function asciiCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
