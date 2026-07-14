import {
  analyzeConflictV4,
  type ConflictDecisionV4,
  type ConflictProfileV4,
  type ConflictReasonCodeV4,
} from "./composite-campaign-conflicts.js";

export interface DeferredSliceV4 {
  slice_id: string;
  conflicts_with: string[];
  reason_codes: Array<ConflictReasonCodeV4 | "capacity_limit">;
}

export interface ScheduledWaveV4 {
  slice_ids: string[];
  capacity: number;
  pair_decisions: ConflictDecisionV4[];
  deferred: DeferredSliceV4[];
}

export interface SchedulerOptionsV4 {
  max_concurrency?: number;
}

export function selectDeterministicWaveV4(
  profilesValue: ConflictProfileV4[],
  options: SchedulerOptionsV4 = {},
): ScheduledWaveV4 {
  const requested = options.max_concurrency ?? 4;
  if (!Number.isInteger(requested) || requested < 1) invalid("max_concurrency");
  const capacity = Math.min(4, requested);
  const profiles = [...profilesValue].sort(compareProfiles);
  const ids = profiles.map((profile) => profile.slice_id);
  if (new Set(ids).size !== ids.length) invalid("duplicate_slice_id");
  const decisions = conflictMatrix(profiles);
  const lookup = new Map(
    decisions.map((decision) => [
      pairKey(decision.left_slice_id, decision.right_slice_id),
      decision,
    ]),
  );
  let best: number[] = [];
  function search(start: number, selected: number[]): void {
    if (better(selected, best)) best = [...selected];
    if (
      selected.length === capacity ||
      selected.length + profiles.length - start < best.length
    )
      return;
    for (let index = start; index < profiles.length; index += 1) {
      if (
        selected.every(
          (chosen) =>
            decision(
              lookup,
              profiles[chosen].slice_id,
              profiles[index].slice_id,
            ).can_parallel,
        )
      )
        search(index + 1, [...selected, index]);
    }
  }
  search(0, []);
  const selectedIds = best.map((index) => profiles[index].slice_id);
  const selected = new Set(selectedIds);
  const deferred = profiles
    .filter((profile) => !selected.has(profile.slice_id))
    .map((profile) => {
      const conflicts = selectedIds
        .map((sliceId) => decision(lookup, sliceId, profile.slice_id))
        .filter((item) => !item.can_parallel);
      return {
        slice_id: profile.slice_id,
        conflicts_with: conflicts
          .flatMap((item) => [
            item.left_slice_id === profile.slice_id
              ? item.right_slice_id
              : item.left_slice_id,
          ])
          .sort(asciiCompare),
        reason_codes: conflicts.length
          ? [
              ...new Set(
                conflicts.flatMap((item) =>
                  item.reasons.map((reason) => reason.code),
                ),
              ),
            ].sort(asciiCompare)
          : ["capacity_limit" as const],
      };
    });
  return {
    slice_ids: selectedIds,
    capacity,
    pair_decisions: decisions,
    deferred,
  };
}

export function conflictMatrixV4(
  profilesValue: ConflictProfileV4[],
): ConflictDecisionV4[] {
  const profiles = [...profilesValue].sort(compareProfiles);
  const decisions: ConflictDecisionV4[] = [];
  for (let left = 0; left < profiles.length; left += 1)
    for (let right = left + 1; right < profiles.length; right += 1)
      decisions.push(analyzeConflictV4(profiles[left], profiles[right]));
  return decisions;
}

export function compareConflictProfilesV4(
  left: ConflictProfileV4,
  right: ConflictProfileV4,
): number {
  return compareProfiles(left, right);
}

function conflictMatrix(profiles: ConflictProfileV4[]): ConflictDecisionV4[] {
  return conflictMatrixV4(profiles);
}
function decision(
  lookup: Map<string, ConflictDecisionV4>,
  left: string,
  right: string,
): ConflictDecisionV4 {
  const value = lookup.get(pairKey(left, right));
  if (!value) invalid(`missing_pair:${left}:${right}`);
  return value;
}
function pairKey(left: string, right: string): string {
  return [left, right].sort(asciiCompare).join("\0");
}
function compareProfiles(
  left: ConflictProfileV4,
  right: ConflictProfileV4,
): number {
  return (
    left.priority - right.priority ||
    asciiCompare(left.stable_key, right.stable_key) ||
    asciiCompare(left.slice_id, right.slice_id)
  );
}
function better(candidate: number[], current: number[]): boolean {
  if (candidate.length !== current.length)
    return candidate.length > current.length;
  for (let index = 0; index < candidate.length; index += 1) {
    if (candidate[index] !== current[index])
      return candidate[index] < current[index];
  }
  return false;
}
function invalid(reason: string): never {
  throw new Error(`composite_campaign_scheduler_invalid:${reason}`);
}
function asciiCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
