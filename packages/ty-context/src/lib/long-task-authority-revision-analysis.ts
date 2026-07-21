import type {
  CompiledCheckV2,
  CompiledDeliveryContractV2,
  DeliveryContractV2,
} from "./long-task-delivery-types.js";
import {
  addedInputPaths,
  addedVerificationInputs,
  bindingReductions,
  changedRunnerFields,
  counterfactualReductions,
  expandedPatterns,
  globalCounterfactualReductions,
  obligationReductions,
  removedExactValues,
  removedGlobalForbiddenPaths,
  removedOrNarrowedInputPaths,
  removedOrReplacedVerificationInputs,
  removedOrWeakenedExpectedOutputPaths,
  removedStructuredValues,
  rollbackReductions,
  same,
} from "./long-task-authority-revision-details.js";

export interface CheckRevisionAnalysis {
  negative_assertions_removed: string[];
  proof_surfaces_changed: string[];
  runner_definitions_changed: string[];
  verification_inputs_added: string[];
  verification_inputs_removed_or_replaced: string[];
  input_paths_added: string[];
  input_paths_removed_or_narrowed: string[];
  expected_output_paths_removed_or_weakened: string[];
  artifacts_removed: string[];
  environment_requirements_removed: string[];
}

export function analyzeCheckRevisions(
  beforeChecks: Map<string, CompiledCheckV2>,
  afterChecks: Map<string, CompiledCheckV2>,
): CheckRevisionAnalysis {
  const result: CheckRevisionAnalysis = {
    negative_assertions_removed: [],
    proof_surfaces_changed: [],
    runner_definitions_changed: [],
    verification_inputs_added: [],
    verification_inputs_removed_or_replaced: [],
    input_paths_added: [],
    input_paths_removed_or_narrowed: [],
    expected_output_paths_removed_or_weakened: [],
    artifacts_removed: [],
    environment_requirements_removed: [],
  };
  for (const [identity, before] of beforeChecks) {
    const after = afterChecks.get(identity);
    if (!after) continue;
    for (const assertion of before.negative_assertions)
      if (!after.negative_assertions.some((item) => same(item, assertion)))
        result.negative_assertions_removed.push(`${identity}:${assertion.key}`);
    if (before.proof_surface !== after.proof_surface)
      result.proof_surfaces_changed.push(
        `${identity}:${before.proof_surface}->${after.proof_surface}`,
      );
    result.runner_definitions_changed.push(
      ...changedRunnerFields(identity, before, after),
    );
    result.verification_inputs_added.push(
      ...addedVerificationInputs(identity, before, after),
    );
    result.verification_inputs_removed_or_replaced.push(
      ...removedOrReplacedVerificationInputs(identity, before, after),
    );
    result.input_paths_added.push(...addedInputPaths(identity, before, after));
    result.input_paths_removed_or_narrowed.push(
      ...removedOrNarrowedInputPaths(identity, before, after),
    );
    result.expected_output_paths_removed_or_weakened.push(
      ...removedOrWeakenedExpectedOutputPaths(identity, before, after),
    );
    result.artifacts_removed.push(
      ...removedExactValues(
        identity,
        before.artifact_globs,
        after.artifact_globs,
      ),
    );
    result.environment_requirements_removed.push(
      ...removedStructuredValues(
        identity,
        before.environment_requirements,
        after.environment_requirements,
      ),
    );
  }
  return result;
}

export interface OutcomeRevisionAnalysis {
  owner_paths_expanded: string[];
  owner_context_refs_removed: string[];
  expected_change_paths_expanded: string[];
  allowed_paths_expanded: string[];
  forbidden_paths_removed: string[];
  bindings_removed_or_expanded: string[];
  obligations_removed_or_weakened: string[];
  rollback_or_recovery_weakened: string[];
  counterfactuals_removed: string[];
  population_weakened: string[];
}

export function analyzeOutcomeRevisions(
  previous: CompiledDeliveryContractV2,
  next: DeliveryContractV2,
): OutcomeRevisionAnalysis {
  const result: OutcomeRevisionAnalysis = {
    owner_paths_expanded: [],
    owner_context_refs_removed: [],
    expected_change_paths_expanded: [],
    allowed_paths_expanded: [],
    forbidden_paths_removed: removedGlobalForbiddenPaths(previous, next),
    bindings_removed_or_expanded: [],
    obligations_removed_or_weakened: [],
    rollback_or_recovery_weakened: [],
    counterfactuals_removed: globalCounterfactualReductions(previous, next),
    population_weakened: [],
  };
  const previousOutcomes = new Map(
    previous.outcomes.map((outcome) => [outcome.key, outcome]),
  );
  for (const after of next.outcomes) {
    const before = previousOutcomes.get(after.key);
    if (!before) continue;
    result.owner_paths_expanded.push(
      ...expandedPatterns(
        after.key,
        before.product.owner.path_globs,
        after.product.owner.path_globs,
      ),
    );
    result.owner_context_refs_removed.push(
      ...removedExactValues(
        after.key,
        before.product.owner.context_refs,
        after.product.owner.context_refs,
      ),
    );
    result.expected_change_paths_expanded.push(
      ...expandedPatterns(
        after.key,
        before.technical.expected_change_paths,
        after.technical.expected_change_paths,
      ),
    );
    result.allowed_paths_expanded.push(
      ...expandedPatterns(
        after.key,
        before.technical.allowed_support_paths,
        after.technical.allowed_support_paths,
      ),
    );
    result.forbidden_paths_removed.push(
      ...removedExactValues(
        after.key,
        before.technical.forbidden_paths,
        after.technical.forbidden_paths,
      ),
    );
    result.bindings_removed_or_expanded.push(
      ...bindingReductions(before, after),
    );
    result.obligations_removed_or_weakened.push(
      ...obligationReductions(before, after),
    );
    result.rollback_or_recovery_weakened.push(
      ...rollbackReductions(before, after),
    );
    result.counterfactuals_removed.push(
      ...counterfactualReductions(before, after),
    );
    if (
      before.acceptance.population &&
      (!after.acceptance.population ||
        !same(before.acceptance.population, after.acceptance.population))
    )
      result.population_weakened.push(after.key);
  }
  return result;
}

export function keyedAuthorityChanges(
  before: Array<{ key: string }>,
  after: Array<{ key: string }>,
): string[] {
  const beforeByKey = new Map(before.map((item) => [item.key, item]));
  const afterByKey = new Map(after.map((item) => [item.key, item]));
  return [
    ...before
      .filter((item) => !afterByKey.has(item.key))
      .map((item) => `${item.key}:removed`),
    ...after
      .filter((item) => !beforeByKey.has(item.key))
      .map((item) => `${item.key}:added`),
    ...before
      .filter((item) => {
        const candidate = afterByKey.get(item.key);
        return candidate !== undefined && !same(item, candidate);
      })
      .map((item) => `${item.key}:changed`),
  ].sort();
}

export function selectedRevisionReasons(
  entries: Array<[reason: string, changed: boolean | unknown[]]>,
): string[] {
  return entries
    .filter(([, changed]) =>
      Array.isArray(changed) ? changed.length > 0 : changed,
    )
    .map(([reason]) => reason);
}
