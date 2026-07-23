import { changedAuthoritySections } from "./long-task-authority.js";
import {
  authorityMaterialHashes,
  compiledAuthorityMaterials,
} from "./long-task-authority-materials.js";
import { authorityRevisionDiff } from "./long-task-authority-revision.js";
import {
  authorityRevisionUserDecisionReasons,
  classifyAuthorityRevision,
  summarizeAuthorityRevision,
} from "./long-task-authority-revision-summary.js";
import type { AuthorityRevisionProposalV2 } from "./long-task-authority-revision-types.js";
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

export function buildAuthorityRevisionProposal(
  previous: CompiledDeliveryContractV2,
  nextContract: DeliveryContractV2,
  nextHashes: AuthorityHashesV2,
  nextMaterials: NextAuthorityMaterialsV2,
  nextGlobalChecks: CompiledDeliveryContractV2["global"]["acceptance"]["checks"],
  nextOutcomes: CompiledOutcomeV2[],
  nextVerifier: VerifierIdentityV2,
  riskFloor: "standard" | "strict",
): AuthorityRevisionProposalV2 {
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
  const changeClass = classifyAuthorityRevision(diff);
  const userDecisionReasons = authorityRevisionUserDecisionReasons(diff);
  const userDecisionRequired = userDecisionReasons.length > 0;
  const approvalSummary = summarizeAuthorityRevision(
    diff,
    nextContract.outcomes.map((outcome) => outcome.key),
  );
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
    revision_diff: diff,
    new_risk_floor: riskFloor,
    affected_outcomes_or_contracts: approvalSummary.affected_outcomes,
    change_class: changeClass,
    user_decision_required: userDecisionRequired,
    user_decision_reasons: userDecisionReasons,
    approval_required: userDecisionRequired,
    approval_summary: approvalSummary,
  };
  const revisionIdentity = sha256Hex(canonicalValueJson(unsignedRevision));
  return { ...unsignedRevision, revision_identity: revisionIdentity };
}

export async function enforceAuthorityRevision(
  proposal: AuthorityRevisionProposalV2,
  workdir: string,
): Promise<void> {
  if (!proposal.user_decision_required) return;
  if (!(await authorityRevisionApproved(workdir, proposal.revision_identity))) {
    await writePendingAuthorityRevision(workdir, {
      schema_version: "long-task-authority-revision-pending-v2",
      ...proposal,
      created_at: new Date().toISOString(),
    });
    throw new Error(
      `authority_change_requires_user_decision:${proposal.revision_identity}`,
    );
  }
}
