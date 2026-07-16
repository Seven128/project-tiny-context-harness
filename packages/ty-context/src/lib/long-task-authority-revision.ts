import type {
  AuthorityHashesV2,
  CompiledCheckV2,
  CompiledDeliveryContractV2,
  CompiledOutcomeV2,
  DeliveryContractV2,
} from "./long-task-delivery-types.js";
import {
  acceptanceSemanticsChanged,
  isMonotonicAcceptanceStrengthening,
} from "./long-task-authority.js";
import { compileProductClaimCoverage } from "./long-task-claims.js";
import {
  addedValues,
  bindingReductions,
  changedRunnerFields,
  checkIndex,
  counterfactualReductions,
  expandedPatterns,
  obligationReductions,
  removedExactValues,
  removedGlobalForbiddenPaths,
  removedOrReplacedVerificationInputs,
  removedStructuredValues,
  removedValues,
  rollbackReductions,
  same,
  sourceClaimReductions,
} from "./long-task-authority-revision-details.js";

export interface AuthorityRevisionDiffV2 {
  product_claims_added: string[];
  product_claims_removed: string[];
  checks_added: string[];
  checks_removed: string[];
  negative_assertions_removed: string[];
  proof_surfaces_changed: string[];
  source_claims_removed_or_changed: string[];
  source_paths_removed_or_replaced: string[];
  owner_paths_expanded: string[];
  owner_context_refs_removed: string[];
  expected_change_paths_expanded: string[];
  allowed_paths_expanded: string[];
  forbidden_paths_removed: string[];
  runner_definitions_changed: string[];
  verification_inputs_removed_or_replaced: string[];
  artifacts_removed: string[];
  environment_requirements_removed: string[];
  bindings_removed_or_expanded: string[];
  obligations_removed_or_weakened: string[];
  rollback_or_recovery_weakened: string[];
  counterfactuals_removed: string[];
  population_weakened: string[];
  source_claims_changed: boolean;
  risk_changed: boolean;
  owner_or_path_boundary_changed: boolean;
  runner_or_verification_inputs_changed: boolean;
  technical_obligations_changed: boolean;
  reduction_reasons: string[];
}

export function authorityRevisionDiff(
  previous: CompiledDeliveryContractV2,
  next: DeliveryContractV2,
  nextHashes: AuthorityHashesV2,
  nextGlobalChecks: CompiledCheckV2[],
  nextOutcomes: CompiledOutcomeV2[],
): AuthorityRevisionDiffV2 {
  const nextClaims = compileProductClaimCoverage(next).by_outcome;
  const beforeClaimIds = new Set(
    previous.outcomes.flatMap((outcome) =>
      outcome.generated_claims.map((claim) => claim.id),
    ),
  );
  const afterClaimIds = new Set(
    Object.values(nextClaims)
      .flat()
      .map((claim) => claim.id),
  );
  const beforeChecks = checkIndex(
    previous.global.acceptance.checks,
    previous.outcomes,
  );
  const afterChecks = checkIndex(nextGlobalChecks, nextOutcomes);
  const productClaimsRemoved = removedValues(beforeClaimIds, afterClaimIds);
  const checksRemoved = removedValues(
    new Set(beforeChecks.keys()),
    new Set(afterChecks.keys()),
  );
  const negativeAssertionsRemoved: string[] = [];
  const proofSurfacesChanged: string[] = [];
  const runnerDefinitionsChanged: string[] = [];
  const verificationInputsRemovedOrReplaced: string[] = [];
  const artifactsRemoved: string[] = [];
  const environmentRequirementsRemoved: string[] = [];
  for (const [identity, before] of beforeChecks) {
    const after = afterChecks.get(identity);
    if (!after) continue;
    for (const assertion of before.negative_assertions)
      if (!after.negative_assertions.some((item) => same(item, assertion)))
        negativeAssertionsRemoved.push(`${identity}:${assertion.key}`);
    if (before.proof_surface !== after.proof_surface)
      proofSurfacesChanged.push(
        `${identity}:${before.proof_surface}->${after.proof_surface}`,
      );
    runnerDefinitionsChanged.push(
      ...changedRunnerFields(identity, before, after),
    );
    verificationInputsRemovedOrReplaced.push(
      ...removedOrReplacedVerificationInputs(identity, before, after),
    );
    artifactsRemoved.push(
      ...removedExactValues(
        identity,
        before.artifact_globs,
        after.artifact_globs,
      ),
    );
    environmentRequirementsRemoved.push(
      ...removedStructuredValues(
        identity,
        before.environment_requirements,
        after.environment_requirements,
      ),
    );
  }

  const sourceClaimsRemovedOrChanged = sourceClaimReductions(
    previous.source_claims,
    next.source_claims,
  );
  const sourcePathsRemovedOrReplaced = removedExactValues(
    "task",
    previous.task.source_paths,
    next.task.source_paths,
  );
  const ownerPathsExpanded: string[] = [];
  const ownerContextRefsRemoved: string[] = [];
  const expectedChangePathsExpanded: string[] = [];
  const allowedPathsExpanded: string[] = [];
  const forbiddenPathsRemoved = removedGlobalForbiddenPaths(previous, next);
  const bindingsRemovedOrExpanded: string[] = [];
  const obligationsRemovedOrWeakened: string[] = [];
  const rollbackOrRecoveryWeakened: string[] = [];
  const counterfactualsRemoved: string[] = [];
  const populationWeakened: string[] = [];
  const previousOutcomes = new Map(
    previous.outcomes.map((outcome) => [outcome.key, outcome]),
  );
  for (const after of next.outcomes) {
    const before = previousOutcomes.get(after.key);
    if (!before) continue;
    ownerPathsExpanded.push(
      ...expandedPatterns(
        after.key,
        before.product.owner.path_globs,
        after.product.owner.path_globs,
      ),
    );
    ownerContextRefsRemoved.push(
      ...removedExactValues(
        after.key,
        before.product.owner.context_refs,
        after.product.owner.context_refs,
      ),
    );
    expectedChangePathsExpanded.push(
      ...expandedPatterns(
        after.key,
        before.technical.expected_change_paths,
        after.technical.expected_change_paths,
      ),
    );
    allowedPathsExpanded.push(
      ...expandedPatterns(
        after.key,
        before.technical.allowed_support_paths,
        after.technical.allowed_support_paths,
      ),
    );
    forbiddenPathsRemoved.push(
      ...removedExactValues(
        after.key,
        before.technical.forbidden_paths,
        after.technical.forbidden_paths,
      ),
    );
    bindingsRemovedOrExpanded.push(...bindingReductions(before, after));
    obligationsRemovedOrWeakened.push(...obligationReductions(before, after));
    rollbackOrRecoveryWeakened.push(...rollbackReductions(before, after));
    counterfactualsRemoved.push(...counterfactualReductions(before, after));
    if (
      before.acceptance.population &&
      (!after.acceptance.population ||
        !same(before.acceptance.population, after.acceptance.population))
    )
      populationWeakened.push(after.key);
  }

  const riskChanged =
    previous.authority_hashes.risk_authority_hash !==
    nextHashes.risk_authority_hash;
  const acceptanceChanged = acceptanceSemanticsChanged(previous, next);
  const monotonic = isMonotonicAcceptanceStrengthening(previous, next);
  const reductionReasons = [
    ...(productClaimsRemoved.length ? ["product_claim_removed"] : []),
    ...(checksRemoved.length ? ["check_removed"] : []),
    ...(negativeAssertionsRemoved.length
      ? ["negative_assertion_removed"]
      : []),
    ...(proofSurfacesChanged.length ? ["proof_surface_changed"] : []),
    ...(sourceClaimsRemovedOrChanged.length
      ? ["source_claim_removed_or_changed"]
      : []),
    ...(sourcePathsRemovedOrReplaced.length
      ? ["source_path_removed_or_replaced"]
      : []),
    ...(ownerPathsExpanded.length ? ["owner_path_expanded"] : []),
    ...(ownerContextRefsRemoved.length ? ["owner_context_ref_removed"] : []),
    ...(expectedChangePathsExpanded.length
      ? ["expected_change_path_expanded"]
      : []),
    ...(allowedPathsExpanded.length ? ["allowed_path_expanded"] : []),
    ...(forbiddenPathsRemoved.length ? ["forbidden_path_removed"] : []),
    ...(runnerDefinitionsChanged.length
      ? ["runner_definition_changed"]
      : []),
    ...(verificationInputsRemovedOrReplaced.length
      ? ["verification_input_removed_or_replaced"]
      : []),
    ...(artifactsRemoved.length ? ["artifact_removed"] : []),
    ...(environmentRequirementsRemoved.length
      ? ["environment_requirement_removed"]
      : []),
    ...(bindingsRemovedOrExpanded.length
      ? ["binding_removed_or_expanded"]
      : []),
    ...(obligationsRemovedOrWeakened.length
      ? ["obligation_removed_or_weakened"]
      : []),
    ...(rollbackOrRecoveryWeakened.length
      ? ["rollback_or_recovery_weakened"]
      : []),
    ...(counterfactualsRemoved.length ? ["counterfactual_removed"] : []),
    ...(populationWeakened.length ? ["population_weakened"] : []),
    ...(riskChanged ? ["risk_changed_requires_review"] : []),
    ...(acceptanceChanged && !monotonic ? ["acceptance_not_monotonic"] : []),
  ];
  return {
    product_claims_added: addedValues(beforeClaimIds, afterClaimIds),
    product_claims_removed: productClaimsRemoved,
    checks_added: addedValues(
      new Set(beforeChecks.keys()),
      new Set(afterChecks.keys()),
    ),
    checks_removed: checksRemoved,
    negative_assertions_removed: negativeAssertionsRemoved,
    proof_surfaces_changed: proofSurfacesChanged,
    source_claims_removed_or_changed: sourceClaimsRemovedOrChanged,
    source_paths_removed_or_replaced: sourcePathsRemovedOrReplaced,
    owner_paths_expanded: ownerPathsExpanded,
    owner_context_refs_removed: ownerContextRefsRemoved,
    expected_change_paths_expanded: expectedChangePathsExpanded,
    allowed_paths_expanded: allowedPathsExpanded,
    forbidden_paths_removed: forbiddenPathsRemoved,
    runner_definitions_changed: runnerDefinitionsChanged,
    verification_inputs_removed_or_replaced:
      verificationInputsRemovedOrReplaced,
    artifacts_removed: artifactsRemoved,
    environment_requirements_removed: environmentRequirementsRemoved,
    bindings_removed_or_expanded: bindingsRemovedOrExpanded,
    obligations_removed_or_weakened: obligationsRemovedOrWeakened,
    rollback_or_recovery_weakened: rollbackOrRecoveryWeakened,
    counterfactuals_removed: counterfactualsRemoved,
    population_weakened: populationWeakened,
    source_claims_changed:
      previous.authority_hashes.source_authority_hash !==
      nextHashes.source_authority_hash,
    risk_changed: riskChanged,
    owner_or_path_boundary_changed:
      ownerPathsExpanded.length > 0 ||
      ownerContextRefsRemoved.length > 0 ||
      expectedChangePathsExpanded.length > 0 ||
      allowedPathsExpanded.length > 0 ||
      forbiddenPathsRemoved.length > 0 ||
      bindingsRemovedOrExpanded.length > 0,
    runner_or_verification_inputs_changed:
      runnerDefinitionsChanged.length > 0 ||
      verificationInputsRemovedOrReplaced.length > 0,
    technical_obligations_changed:
      obligationsRemovedOrWeakened.length > 0 ||
      rollbackOrRecoveryWeakened.length > 0,
    reduction_reasons: [...new Set(reductionReasons)],
  };
}
