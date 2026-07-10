import type { CompositeCampaignSliceV1 } from "./composite-campaign-types.js";

export function validateCampaignBindingInjectivity(slices: Record<string, CompositeCampaignSliceV1>): void {
  const identities: Array<[string, (slice: CompositeCampaignSliceV1) => string | null]> = [
    ["binding_id", (slice) => slice.binding?.binding_id ?? null],
    ["workdir", (slice) => slice.binding?.workdir ?? null],
    ["task_id", (slice) => slice.binding?.task.task_id ?? null],
    ["task_attempt_id", (slice) => slice.binding?.task.task_attempt_id ?? null],
    ["goal_id", (slice) => slice.binding?.goal?.goal_id ?? null]
  ];
  for (const [label, select] of identities) {
    const owners = new Map<string, string>();
    for (const slice of Object.values(slices)) {
      const identity = select(slice);
      if (identity === null) continue;
      const previous = owners.get(identity);
      if (previous) {
        throw new Error(`campaign ${label} must be unique across bindings; ${previous} and ${slice.slice_id} duplicate ${identity}`);
      }
      owners.set(identity, slice.slice_id);
    }
  }
}

export function validateCampaignPacketHashInjectivity(slices: Record<string, CompositeCampaignSliceV1>): void {
  const owners = new Map<string, string>();
  for (const slice of Object.values(slices)) {
    for (const revision of slice.revisions) {
      const owner = `${slice.slice_id} revision ${revision.revision}`;
      const previous = owners.get(revision.packet_sha256);
      if (previous) {
        throw new Error(`campaign packet_sha256 must be globally unique; ${previous} and ${owner} duplicate one packet hash`);
      }
      owners.set(revision.packet_sha256, owner);
    }
  }
}

export function validateHistoricalSelectionOrder(slices: Record<string, CompositeCampaignSliceV1>): void {
  const selected = Object.values(slices).find((slice) =>
    slice.selection_status === "selected" && isTerminal(slice)
  );
  if (!selected) return;
  const selectedRecordedAt = Date.parse(selected.binding!.result!.recorded_at);
  for (const descendant of Object.values(slices)) {
    if (!isTerminal(descendant) || descendant.slice_id === selected.slice_id) continue;
    if (Date.parse(descendant.binding!.result!.recorded_at) > selectedRecordedAt) {
      throw new Error(
        `selected terminal historical selection ${selected.slice_id} recorded_at predates newer terminal result ${descendant.slice_id}`
      );
    }
    if (dependsTransitivelyOn(descendant, selected.slice_id, slices, new Set())) {
      throw new Error(
        `selected terminal historical selection ${selected.slice_id} has later terminal descendant ${descendant.slice_id}`
      );
    }
  }
}

export function validateCampaignProvenanceChronology(
  createdAt: string,
  updatedAt: string,
  slices: Record<string, CompositeCampaignSliceV1>
): void {
  const campaignCreated = Date.parse(createdAt);
  const campaignUpdated = Date.parse(updatedAt);
  for (const slice of Object.values(slices)) {
    if (slice.revisions.length > 0) {
      const firstRevisionCreated = Date.parse(slice.revisions[0].created_at);
      for (const dependencyId of slice.depends_on) {
        const dependency = slices[dependencyId];
        if (dependency.result_projection !== "accept" || dependency.binding?.result?.status !== "accept") {
          throw new Error(`${slice.slice_id} authoring history requires accepted dependency ${dependencyId}`);
        }
        assertAtOrAfter(
          firstRevisionCreated,
          Date.parse(dependency.binding.result.recorded_at),
          `${slice.slice_id} first revision.created_at`,
          `${dependencyId} accepted dependency result.recorded_at`
        );
      }
    }
    let previousRevision = campaignCreated;
    let previousProjection: number | null = null;
    for (const revision of slice.revisions) {
      const revisionCreated = Date.parse(revision.created_at);
      assertAtOrAfter(revisionCreated, campaignCreated, `${slice.slice_id} revision.created_at`, "campaign.created_at");
      assertAtOrAfter(revisionCreated, previousRevision, `${slice.slice_id} revision.created_at`, "previous revision.created_at");
      if (previousProjection !== null) {
        assertAtOrAfter(
          revisionCreated,
          previousProjection,
          `${slice.slice_id} revision.created_at`,
          "previous projection.rendered_at"
        );
      }
      assertAtOrBefore(revisionCreated, campaignUpdated, `${slice.slice_id} revision.created_at`, "campaign.updated_at");
      if (revision.projections) {
        const rendered = Date.parse(revision.projections.rendered_at);
        assertAtOrAfter(rendered, revisionCreated, `${slice.slice_id} projection.rendered_at`, "revision.created_at");
        assertAtOrBefore(rendered, campaignUpdated, `${slice.slice_id} projection.rendered_at`, "campaign.updated_at");
      }
      previousRevision = revisionCreated;
      previousProjection = revision.projections ? Date.parse(revision.projections.rendered_at) : null;
    }
    const binding = slice.binding;
    if (!binding) continue;
    const currentProjection = slice.revisions.at(-1)?.projections;
    const handedOff = Date.parse(binding.handed_off_at);
    if (currentProjection) {
      assertAtOrAfter(handedOff, Date.parse(currentProjection.rendered_at), `${slice.slice_id} binding.handed_off_at`, "current projection.rendered_at");
    }
    assertAtOrBefore(handedOff, campaignUpdated, `${slice.slice_id} binding.handed_off_at`, "campaign.updated_at");
    if (!binding.goal) continue;
    const started = Date.parse(binding.goal.started_at);
    assertAtOrAfter(started, handedOff, `${slice.slice_id} goal.started_at`, "binding.handed_off_at");
    assertAtOrBefore(started, campaignUpdated, `${slice.slice_id} goal.started_at`, "campaign.updated_at");
    if (!binding.result) continue;
    const recorded = Date.parse(binding.result.recorded_at);
    assertAtOrAfter(recorded, started, `${slice.slice_id} result.recorded_at`, "goal.started_at");
    assertAtOrBefore(recorded, campaignUpdated, `${slice.slice_id} result.recorded_at`, "campaign.updated_at");
  }
}

function assertAtOrAfter(value: number, floor: number, label: string, floorLabel: string): void {
  if (value < floor) throw new Error(`${label} precedes ${floorLabel}; campaign provenance chronology must be nondecreasing`);
}

function assertAtOrBefore(value: number, ceiling: number, label: string, ceilingLabel: string): void {
  if (value > ceiling) throw new Error(`${label} is later than ${ceilingLabel}; campaign provenance chronology must be bounded`);
}

function isTerminal(slice: CompositeCampaignSliceV1): boolean {
  return ["accept", "blocked", "reject"].includes(slice.result_projection);
}

function dependsTransitivelyOn(
  slice: CompositeCampaignSliceV1,
  target: string,
  slices: Record<string, CompositeCampaignSliceV1>,
  visited: Set<string>
): boolean {
  if (visited.has(slice.slice_id)) return false;
  visited.add(slice.slice_id);
  return slice.depends_on.some((dependency) =>
    dependency === target || dependsTransitivelyOn(slices[dependency], target, slices, visited)
  );
}
