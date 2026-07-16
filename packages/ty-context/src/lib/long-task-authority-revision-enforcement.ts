import { changedAuthoritySections } from "./long-task-authority.js";
import {
  authorityMaterialHashes,
  compiledAuthorityMaterials,
} from "./long-task-authority-materials.js";
import {
  authorityRevisionDiff,
  type AuthorityRevisionDiffV2,
} from "./long-task-authority-revision.js";
import type {
  AuthorityHashesV2,
  CompiledDeliveryContractV2,
  CompiledOutcomeV2,
  DeliveryContractV2,
  NextAuthorityMaterialsV2,
  VerifierIdentityV2,
} from "./long-task-delivery-types.js";
import {
  authorityRevisionApproved,
  writePendingAuthorityRevision,
} from "./long-task-state.js";
import { canonicalValueJson, sha256Hex } from "./strict-codec.js";

export function assertRiskNotDowngraded(
  previous: CompiledDeliveryContractV2,
  nextLevel: "standard" | "strict",
  nextReasons: string[],
): void {
  if (previous.effective_risk === "strict" && nextLevel !== "strict")
    throw new Error("authority_risk_downgrade_rejected:strict_to_standard");
  const next = new Set(nextReasons);
  const removed = previous.risk_reasons.filter((reason) => !next.has(reason));
  if (removed.length)
    throw new Error(`authority_risk_downgrade_rejected:${removed.join(",")}`);
}

export async function enforceAuthorityRevision(
  previous: CompiledDeliveryContractV2,
  nextContract: DeliveryContractV2,
  nextHashes: AuthorityHashesV2,
  nextMaterials: NextAuthorityMaterialsV2,
  nextGlobalChecks: CompiledDeliveryContractV2["global"]["acceptance"]["checks"],
  nextOutcomes: CompiledOutcomeV2[],
  nextVerifier: VerifierIdentityV2,
  workdir: string,
  riskFloor: "standard" | "strict",
): Promise<void> {
  const previousMaterials = compiledAuthorityMaterials(previous);
  const diff = authorityRevisionDiff(
    previous,
    nextContract,
    nextHashes,
    nextMaterials,
    nextGlobalChecks,
    nextOutcomes,
    nextVerifier,
  );
  if (!diff.reduction_reasons.length) return;
  const unsignedRevision = {
    previous_hashes: previous.authority_hashes,
    next_hashes: nextHashes,
    previous_materials: previousMaterials,
    next_materials: nextMaterials,
    previous_material_hashes: authorityMaterialHashes(previousMaterials),
    next_material_hashes: authorityMaterialHashes(nextMaterials),
    changed_authority_sections: changedAuthoritySections(
      previous.authority_hashes,
      nextHashes,
    ),
    revision_diff: diff as AuthorityRevisionDiffV2 &
      Record<string, unknown>,
    new_risk_floor: riskFloor,
    affected_outcomes_or_contracts: nextContract.outcomes.map(
      (outcome) => outcome.key,
    ),
  };
  const revisionIdentity = sha256Hex(canonicalValueJson(unsignedRevision));
  if (!(await authorityRevisionApproved(workdir, revisionIdentity))) {
    await writePendingAuthorityRevision(workdir, {
      schema_version: "long-task-authority-revision-pending-v2",
      ...unsignedRevision,
      revision_identity: revisionIdentity,
      created_at: new Date().toISOString(),
    });
    throw new Error(
      `authority_change_requires_user_decision:${revisionIdentity}`,
    );
  }
}
