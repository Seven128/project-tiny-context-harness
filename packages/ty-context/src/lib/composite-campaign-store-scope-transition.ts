import type {
  CompositeCampaignSliceV1,
  CompositeCampaignV1,
  CompositeSfcIdV1,
  ScopeFitResultV1
} from "./composite-campaign-types.js";

export function assertStableScopeIdentity(current: CompositeCampaignV1, scope: ScopeFitResultV1): void {
  const byId = new Map(scope.slices.map((slice) => [slice.slice_id, slice]));
  const byKey = new Map(scope.slices.map((slice) => [slice.stable_key, slice.slice_id]));
  const oldIds = Object.keys(current.slices) as CompositeSfcIdV1[];
  const oldMaximum = oldIds.reduce((maximum, id) => Math.max(maximum, Number(id.slice(4))), 0);
  for (const old of campaignSlices(current)) {
    const candidate = byId.get(old.slice_id);
    if (!candidate) throw new Error(`Scope Fit must retain existing slice identity ${old.slice_id}`);
    if (candidate.stable_key !== old.stable_key || byKey.get(old.stable_key) !== old.slice_id) {
      throw new Error(`Scope Fit cannot remap stable identity ${old.slice_id}/${old.stable_key}`);
    }
  }
  for (const slice of scope.slices) {
    if (!current.slices[slice.slice_id] && Number(slice.slice_id.slice(4)) <= oldMaximum) {
      throw new Error(`New Scope Fit slice ${slice.slice_id} must use an ID higher than all allocated SFC IDs`);
    }
  }
}

export function mergeScopeSlices(
  current: CompositeCampaignV1,
  scope: ScopeFitResultV1,
  terminal: ReadonlySet<CompositeSfcIdV1>
): Record<string, CompositeCampaignSliceV1> {
  const result: Record<string, CompositeCampaignSliceV1> = {};
  for (const source of scope.slices) {
    const existing = current.slices[source.slice_id];
    const selected = source.slice_id === scope.selected_slice_id;
    if (existing?.selection_status === "selected" && !selected && !terminal.has(source.slice_id)) {
      throw new Error(`Cannot deselect nonterminal authored or active slice ${source.slice_id}`);
    }
    const selection = selected ? "selected" : existing?.selection_status === "superseded" || terminal.has(source.slice_id)
      ? "superseded" : "candidate";
    result[source.slice_id] = existing ? {
      ...existing, title: source.title, depends_on: source.depends_on, priority: source.priority, selection_status: selection
    } : {
      slice_id: source.slice_id,
      stable_key: source.stable_key,
      title: source.title,
      depends_on: source.depends_on,
      priority: source.priority,
      selection_status: selection,
      authoring_status: "draft",
      handoff_status: "none",
      result_projection: "unrecorded",
      current_revision: null,
      revisions: [],
      binding: null
    };
  }
  return result;
}

export function statusIds(current: CompositeCampaignV1, statuses: string[]): Set<CompositeSfcIdV1> {
  return new Set(campaignSlices(current)
    .filter((slice) => statuses.includes(slice.result_projection))
    .map((slice) => slice.slice_id));
}

function campaignSlices(current: CompositeCampaignV1): CompositeCampaignSliceV1[] {
  return Object.values(current.slices).filter((slice): slice is CompositeCampaignSliceV1 => slice !== undefined);
}
