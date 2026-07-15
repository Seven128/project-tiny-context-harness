import path from "node:path";
import type { CampaignV6 } from "./composite-campaign-schema-v6.js";
import {
  managedCampaignWorktreePathsV1,
  managedSliceWorktreePathV1,
  repositoryRelativeWorktreePathV1,
} from "./composite-campaign-worktree-budget.js";

const EXPECTED_SLICE_STATUSES = new Set([
  "scheduled",
  "worker_running",
  "needs_work",
  "needs_attention",
  "interrupted",
  "accepted",
  "merged",
]);
const EXPECTED_REPAIR_STATUSES = new Set([
  "running",
  "needs_work",
  "blocked",
  "interrupted",
]);

export interface ExpectedManagedWorktreesV6 {
  integration: string | null;
  sfc_by_id: Record<string, string>;
  repair: string | null;
  all: string[];
  stale_slice_path_ids: string[];
}

export function deriveExpectedManagedWorktreesV6(options: {
  repositoryRoot: string;
  campaign: CampaignV6;
}): ExpectedManagedWorktreesV6 {
  const repository = path.resolve(options.repositoryRoot);
  const { campaign } = options;
  const paths = managedCampaignWorktreePathsV1(
    repository,
    campaign.campaign_id,
  );
  if (campaign.campaign_status === "abandoned")
    return {
      integration: null,
      sfc_by_id: {},
      repair: null,
      all: [],
      stale_slice_path_ids: [],
    };
  const integration =
    campaign.base_commit && campaign.finalization?.cleanup_status !== "complete"
      ? paths.integration
      : null;
  const sfcEntries: Array<[string, string]> = [];
  const staleSlicePathIds: string[] = [];
  for (const sliceId of Object.keys(campaign.slices).sort(asciiCompare)) {
    const slice = campaign.slices[sliceId];
    const fixed = managedSliceWorktreePathV1(
      repository,
      campaign.campaign_id,
      sliceId,
    );
    if (slice.worktree_path) {
      const persisted = path.resolve(repository, slice.worktree_path);
      if (!samePath(persisted, fixed))
        throw new Error(`campaign_slice_worktree_path_drift:${sliceId}`);
    }
    if (EXPECTED_SLICE_STATUSES.has(slice.status)) {
      if (!slice.worktree_path)
        throw new Error(
          `campaign_slice_expected_worktree_path_missing:${sliceId}`,
        );
      sfcEntries.push([sliceId, fixed]);
    } else if (slice.worktree_path && slice.status === "integration_verified") {
      staleSlicePathIds.push(sliceId);
    } else if (slice.worktree_path) {
      throw new Error(
        `campaign_slice_unexpected_worktree_path:${sliceId}:${slice.status}`,
      );
    }
  }
  const repairFixed = paths.repair;
  const persistedRepair = path.resolve(
    repository,
    campaign.repair.worktree_path,
  );
  if (!samePath(persistedRepair, repairFixed))
    throw new Error("campaign_repair_worktree_path_drift");
  const repair = EXPECTED_REPAIR_STATUSES.has(campaign.repair.status)
    ? repairFixed
    : null;
  const all = [
    ...(integration ? [integration] : []),
    ...sfcEntries.map(([, worktree]) => worktree),
    ...(repair ? [repair] : []),
  ].sort(asciiCompare);
  return {
    integration,
    sfc_by_id: Object.fromEntries(sfcEntries),
    repair,
    all,
    stale_slice_path_ids: staleSlicePathIds.sort(asciiCompare),
  };
}

export function expectedManagedWorktreeRelativePathsV6(options: {
  repositoryRoot: string;
  campaign: CampaignV6;
}): string[] {
  return deriveExpectedManagedWorktreesV6(options).all.map((worktree) =>
    repositoryRelativeWorktreePathV1(options.repositoryRoot, worktree),
  );
}

function samePath(left: string, right: string): boolean {
  const normalize = (value: string) => {
    const resolved = path.resolve(value);
    return process.platform === "win32" ? resolved.toLowerCase() : resolved;
  };
  return normalize(left) === normalize(right);
}

function asciiCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
