import type {
  AuthorityRevisionApprovalSummaryV2,
  AuthorityRevisionChangeClassV2,
  AuthorityRevisionDecisionV2,
  AuthorityRevisionDiffV2,
} from "./long-task-authority-revision-types.js";

const SCOPE_EXPANSION_REASONS = new Set([
  "owner_path_expanded",
  "expected_change_path_expanded",
  "allowed_path_expanded",
]);

const PROOF_REDUCTION_REASONS = new Set([
  "check_removed",
  "negative_assertion_removed",
  "proof_surface_changed",
  "runner_definition_changed",
  "verification_input_removed_or_replaced",
  "input_path_coverage_reduced",
  "expected_output_requirement_weakened",
  "artifact_removed",
  "environment_requirement_removed",
  "binding_removed_or_expanded",
  "obligation_removed_or_weakened",
  "rollback_or_recovery_weakened",
  "counterfactual_removed",
  "population_weakened",
  "verifier_content_changed",
  "acceptance_not_monotonic",
]);

export function classifyAuthorityRevision(
  diff: AuthorityRevisionDiffV2,
): AuthorityRevisionChangeClassV2 {
  if (!diff.reduction_reasons.length) return "monotonic_evidence_strengthening";
  if (
    diff.reduction_reasons.every((reason) =>
      SCOPE_EXPANSION_REASONS.has(reason),
    )
  )
    return "scope_only_expansion";
  return "protected_semantic_or_proof_change";
}

export function summarizeAuthorityRevision(
  diff: AuthorityRevisionDiffV2,
  outcomeKeys: string[],
): AuthorityRevisionApprovalSummaryV2 {
  const affectedOutcomes = scopeAffectedOutcomes(diff);
  const changeClass = classifyAuthorityRevision(diff);
  return {
    product_semantics_changed:
      diff.product_claims_added.length > 0 ||
      diff.product_claims_removed.length > 0 ||
      diff.product_claims_changed.length > 0 ||
      diff.product_semantics_changed.length > 0,
    global_or_technical_semantics_changed:
      diff.global_semantics_changed.length > 0 ||
      diff.technical_obligations_changed,
    source_or_claims_changed:
      diff.source_claims_changed ||
      diff.source_claims_added.length > 0 ||
      diff.source_claims_removed_or_changed.length > 0 ||
      diff.source_paths_removed_or_replaced.length > 0 ||
      diff.source_files_added.length > 0 ||
      diff.source_files_removed.length > 0 ||
      diff.source_files_changed.length > 0,
    context_authority_changed:
      diff.context_snapshot_mode_changed ||
      diff.context_topology_changed ||
      diff.context_files_added.length > 0 ||
      diff.context_files_removed.length > 0 ||
      diff.context_files_changed.length > 0,
    acceptance_or_proof_weakened: diff.reduction_reasons.some((reason) =>
      PROOF_REDUCTION_REASONS.has(reason),
    ),
    verifier_or_runner_changed:
      diff.verifier_content_changed ||
      diff.verifier_runtime_locator_changed ||
      diff.runner_definitions_changed.length > 0,
    write_scope_expanded: diff.owner_or_path_boundary_changed,
    risk_changed: diff.risk_changed,
    external_confirmations_changed: diff.external_confirmations_changed,
    semantic_fields_changed: uniqueSorted([
      ...diff.product_semantics_changed,
      ...diff.global_semantics_changed,
    ]),
    source_claim_changes: uniqueSorted([
      ...diff.source_claims_added,
      ...diff.source_claims_removed_or_changed,
    ]),
    product_claim_changes: uniqueSorted([
      ...diff.product_claims_added.map((claim) => `${claim}:added`),
      ...diff.product_claims_removed.map((claim) => `${claim}:removed`),
      ...diff.product_claims_changed.map((claim) => `${claim}:changed`),
    ]),
    proof_reductions: uniqueSorted(
      diff.reduction_reasons.filter((reason) =>
        PROOF_REDUCTION_REASONS.has(reason),
      ),
    ),
    external_confirmation_changes: uniqueSorted(
      diff.external_confirmation_changes,
    ),
    added_verification_dependencies: uniqueSorted([
      ...diff.verification_inputs_added,
      ...diff.input_paths_added,
    ]),
    expanded_owner_paths: uniqueSorted(diff.owner_paths_expanded),
    expanded_expected_change_paths: uniqueSorted(
      diff.expected_change_paths_expanded,
    ),
    expanded_allowed_support_paths: uniqueSorted(diff.allowed_paths_expanded),
    protected_reasons: uniqueSorted(diff.reduction_reasons),
    affected_outcomes:
      changeClass === "scope_only_expansion" && affectedOutcomes.length > 0
        ? affectedOutcomes
        : uniqueSorted(outcomeKeys),
  };
}

export function projectAuthorityRevisionDecision(value: {
  revision_identity: string;
  revision_diff: AuthorityRevisionDiffV2;
  affected_outcomes_or_contracts: string[];
  change_class?: AuthorityRevisionChangeClassV2;
  approval_required?: boolean;
  approval_summary?: AuthorityRevisionApprovalSummaryV2;
}): AuthorityRevisionDecisionV2 {
  const diff = {
    ...value.revision_diff,
    verification_inputs_added:
      value.revision_diff.verification_inputs_added ?? [],
    input_paths_added: value.revision_diff.input_paths_added ?? [],
    external_confirmations_changed:
      value.revision_diff.external_confirmations_changed ?? false,
    external_confirmation_changes:
      value.revision_diff.external_confirmation_changes ?? [],
  } as AuthorityRevisionDiffV2;
  const computedSummary = summarizeAuthorityRevision(
    diff,
    value.affected_outcomes_or_contracts,
  );
  const storedSummary = value.approval_summary as
    Partial<AuthorityRevisionApprovalSummaryV2> | undefined;
  return {
    revision_identity: value.revision_identity,
    change_class: value.change_class ?? classifyAuthorityRevision(diff),
    approval_required: value.approval_required ?? true,
    approval_summary: storedSummary
      ? {
          ...computedSummary,
          ...storedSummary,
          semantic_fields_changed:
            storedSummary.semantic_fields_changed ??
            computedSummary.semantic_fields_changed,
          source_claim_changes:
            storedSummary.source_claim_changes ??
            computedSummary.source_claim_changes,
          product_claim_changes:
            storedSummary.product_claim_changes ??
            computedSummary.product_claim_changes,
          proof_reductions:
            storedSummary.proof_reductions ?? computedSummary.proof_reductions,
          external_confirmation_changes:
            storedSummary.external_confirmation_changes ??
            computedSummary.external_confirmation_changes,
        }
      : computedSummary,
  };
}

function scopeAffectedOutcomes(diff: AuthorityRevisionDiffV2): string[] {
  return uniqueSorted(
    [
      ...diff.owner_paths_expanded,
      ...diff.expected_change_paths_expanded,
      ...diff.allowed_paths_expanded,
    ]
      .map((entry) => entry.split(":", 1)[0])
      .filter((key) => key.length > 0 && key !== "GLOBAL"),
  );
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}
