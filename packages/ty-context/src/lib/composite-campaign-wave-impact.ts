import {
  pathPatternsMayOverlapV4,
  type ConflictProfileV4,
} from "./composite-campaign-conflicts.js";
import {
  pathMatchesEnvelope,
  type ChangeEnvelopeV1,
} from "./composite-campaign-change-envelope.js";

export interface WaveImpactInputV1 {
  wave_slice_ids: string[];
  candidate_slice_ids: string[];
  changed_paths: string[];
  profiles: Record<string, ConflictProfileV4>;
  envelopes: Record<string, ChangeEnvelopeV1>;
  global_constraint_slice_sets: string[][];
}

export interface WaveImpactDecisionV1 {
  schema_version: "campaign-wave-impact-v1";
  mode: "targeted" | "full";
  affected_slice_ids: string[];
  reason: string;
  evidence: string[];
}

export function decideWaveImpactV1(
  input: WaveImpactInputV1,
): WaveImpactDecisionV1 {
  const all = stable([...input.wave_slice_ids, ...input.candidate_slice_ids]);
  const wave = new Set(input.wave_slice_ids);
  if (input.changed_paths.length === 0)
    return full(all, "unknown_empty_merge_diff", []);
  if (
    all.some(
      (sliceId) =>
        !input.profiles[sliceId] ||
        !input.envelopes[sliceId] ||
        !input.profiles[sliceId].positive_evidence_complete,
    )
  ) {
    return full(
      all,
      "unknown_incomplete_impact_evidence",
      all.filter(
        (sliceId) => !input.profiles[sliceId]?.positive_evidence_complete,
      ),
    );
  }
  const wavePatterns = input.wave_slice_ids.flatMap((sliceId) => {
    const envelope = input.envelopes[sliceId];
    return [
      ...envelope.allowed_write_paths,
      ...envelope.allowed_supporting_paths,
    ];
  });
  const unknownPaths = input.changed_paths.filter(
    (changed) =>
      !wavePatterns.some((pattern) => pathMatchesEnvelope(changed, pattern)),
  );
  if (unknownPaths.length)
    return full(all, "unknown_changed_path", stable(unknownPaths));
  const waveContractKeys = new Set(
    input.wave_slice_ids.flatMap(
      (sliceId) => input.profiles[sliceId].contract_keys,
    ),
  );
  const waveContextRefs = new Set(
    input.wave_slice_ids.flatMap(
      (sliceId) => input.profiles[sliceId].context_refs,
    ),
  );
  const affected = new Set(input.wave_slice_ids);
  const evidence: string[] = [];
  for (const sliceId of input.candidate_slice_ids) {
    if (wave.has(sliceId)) continue;
    const profile = input.profiles[sliceId];
    const pathHit = input.changed_paths.some((changed) =>
      [...profile.read_paths, ...profile.write_paths].some((pattern) =>
        pathPatternsMayOverlapV4(changed, pattern),
      ),
    );
    const contractHit = profile.contract_keys.some((key) =>
      waveContractKeys.has(key),
    );
    const contextHit = profile.context_refs.some(
      (ref) =>
        waveContextRefs.has(ref) ||
        input.changed_paths.some((changed) =>
          pathPatternsMayOverlapV4(changed, ref),
        ),
    );
    if (pathHit || contractHit || contextHit) {
      affected.add(sliceId);
      evidence.push(
        `${sliceId}:${pathHit ? "path" : contractHit ? "contract" : "context"}`,
      );
    }
  }
  for (const sliceSet of input.global_constraint_slice_sets) {
    if (sliceSet.some((sliceId) => affected.has(sliceId)))
      for (const sliceId of sliceSet)
        if (all.includes(sliceId)) {
          affected.add(sliceId);
          evidence.push(`${sliceId}:global_constraint`);
        }
  }
  return {
    schema_version: "campaign-wave-impact-v1",
    mode: "targeted",
    affected_slice_ids: stable([...affected]),
    reason: "actual_merge_diff_and_frozen_bindings",
    evidence: stable(evidence),
  };
}

function full(
  sliceIds: string[],
  reason: string,
  evidence: string[],
): WaveImpactDecisionV1 {
  return {
    schema_version: "campaign-wave-impact-v1",
    mode: "full",
    affected_slice_ids: stable(sliceIds),
    reason,
    evidence: stable(evidence),
  };
}
function stable(values: string[]): string[] {
  return [...new Set(values)].sort(ascii);
}
function ascii(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
