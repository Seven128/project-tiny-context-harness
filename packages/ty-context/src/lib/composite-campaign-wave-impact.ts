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

export interface WaveVerificationSpecProfileV2 {
  slice_id: string;
  spec_id: string;
  binding_paths: string[];
  verification_paths: string[];
  contract_keys: string[];
  context_refs: string[];
}

export interface WaveImpactInputV2 {
  wave_slice_ids: string[];
  candidate_slice_ids: string[];
  changed_paths: string[];
  profiles: Record<string, ConflictProfileV4>;
  envelopes: Record<string, ChangeEnvelopeV1>;
  spec_profiles: Record<string, WaveVerificationSpecProfileV2[]>;
  global_constraint_spec_ids: string[];
}

export interface WaveImpactDecisionV2 {
  schema_version: "campaign-wave-impact-v2";
  mode: "targeted" | "full";
  affected_slice_ids: string[];
  affected_spec_ids: string[];
  reason: string;
  reason_evidence: string[];
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

export function decideWaveImpactV2(
  input: WaveImpactInputV2,
): WaveImpactDecisionV2 {
  const allSlices = stable([
    ...input.wave_slice_ids,
    ...input.candidate_slice_ids,
  ]);
  const allSpecs = allSpecIds(input, allSlices);
  if (input.changed_paths.length === 0)
    return fullV2(allSlices, allSpecs, "unknown_empty_merge_diff", []);
  const incomplete = allSlices.filter(
    (sliceId) =>
      !input.profiles[sliceId] ||
      !input.envelopes[sliceId] ||
      !input.profiles[sliceId].positive_evidence_complete,
  );
  if (incomplete.length)
    return fullV2(
      allSlices,
      allSpecs,
      "unknown_incomplete_impact_evidence",
      incomplete,
    );

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
    return fullV2(
      allSlices,
      allSpecs,
      "unknown_changed_path",
      stable(unknownPaths),
    );

  const waveSpecProfiles = input.wave_slice_ids.flatMap(
    (sliceId) => input.spec_profiles[sliceId],
  );
  const pathsWithoutSpecEvidence = input.changed_paths.filter(
    (changed) =>
      !waveSpecProfiles.some((spec) =>
        [...spec.binding_paths, ...spec.verification_paths].some((pattern) =>
          pathPatternsMayOverlapV4(changed, pattern),
        ),
      ),
  );
  if (pathsWithoutSpecEvidence.length)
    return fullV2(
      allSlices,
      allSpecs,
      "unknown_spec_impact",
      stable(pathsWithoutSpecEvidence),
    );

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
  const globalSpecs = new Set(input.global_constraint_spec_ids);
  for (const specId of globalSpecs)
    if (!allSpecs.includes(specId))
      throw new Error(`wave_impact_global_spec_unknown:${specId}`);

  const affectedSpecs = new Set<string>();
  const evidence: string[] = [];
  for (const sliceId of allSlices) {
    for (const spec of input.spec_profiles[sliceId]) {
      const ref = waveSpecId(spec.slice_id, spec.spec_id);
      const pathHits = input.changed_paths.filter((changed) =>
        [...spec.binding_paths, ...spec.verification_paths].some((pattern) =>
          pathPatternsMayOverlapV4(changed, pattern),
        ),
      );
      const contractHits = spec.contract_keys.filter((key) =>
        waveContractKeys.has(key),
      );
      const contextHits = spec.context_refs.filter(
        (refPath) =>
          waveContextRefs.has(refPath) ||
          input.changed_paths.some((changed) =>
            pathPatternsMayOverlapV4(changed, refPath),
          ),
      );
      if (
        pathHits.length ||
        contractHits.length ||
        contextHits.length ||
        globalSpecs.has(ref)
      ) {
        affectedSpecs.add(ref);
        evidence.push(
          ...pathHits.map((value) => `${ref}:path:${value}`),
          ...contractHits.map((value) => `${ref}:contract:${value}`),
          ...contextHits.map((value) => `${ref}:context:${value}`),
        );
        if (globalSpecs.has(ref)) evidence.push(`${ref}:global_constraint`);
      }
    }
  }
  if (!affectedSpecs.size)
    return fullV2(allSlices, allSpecs, "unknown_no_affected_spec", []);
  const affectedSpecIds = stable([...affectedSpecs]);
  return {
    schema_version: "campaign-wave-impact-v2",
    mode: "targeted",
    affected_slice_ids: slicesForSpecs(affectedSpecIds),
    affected_spec_ids: affectedSpecIds,
    reason: "actual_merge_diff_and_frozen_spec_identity",
    reason_evidence: stable(evidence),
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

function fullV2(
  sliceIds: string[],
  specIds: string[],
  reason: string,
  evidence: string[],
): WaveImpactDecisionV2 {
  return {
    schema_version: "campaign-wave-impact-v2",
    mode: "full",
    affected_slice_ids: stable(sliceIds),
    affected_spec_ids: stable(specIds),
    reason,
    reason_evidence: stable(evidence),
  };
}

function allSpecIds(input: WaveImpactInputV2, sliceIds: string[]): string[] {
  return stable(
    sliceIds.flatMap((sliceId) => {
      const specs = input.spec_profiles[sliceId];
      if (!specs?.length)
        throw new Error(`wave_impact_spec_profiles_missing:${sliceId}`);
      return specs.map((spec) => {
        if (spec.slice_id !== sliceId)
          throw new Error(`wave_impact_spec_slice_mismatch:${sliceId}`);
        return waveSpecId(sliceId, spec.spec_id);
      });
    }),
  );
}

export function waveSpecId(sliceId: string, specId: string): string {
  return `${sliceId}:${specId}`;
}

export function splitWaveSpecId(value: string): {
  slice_id: string;
  spec_id: string;
} {
  const split = value.indexOf(":");
  if (split <= 0 || split === value.length - 1)
    throw new Error(`wave_spec_id_invalid:${value}`);
  return { slice_id: value.slice(0, split), spec_id: value.slice(split + 1) };
}

function slicesForSpecs(specIds: string[]): string[] {
  return stable(specIds.map((value) => splitWaveSpecId(value).slice_id));
}
function stable(values: string[]): string[] {
  return [...new Set(values)].sort(ascii);
}
function ascii(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
