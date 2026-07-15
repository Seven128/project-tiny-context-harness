import type {
  DeliveryCheckV1,
  DeliveryContractV1,
  DeliveryOutcomeV1,
  EffectiveRiskLevel,
} from "./long-task-delivery-types.js";

export interface RiskDecisionV1 {
  effective_level: EffectiveRiskLevel;
  minimum_level: EffectiveRiskLevel;
  reasons: string[];
}

export function classifyLongTaskRisk(
  contract: DeliveryContractV1,
): RiskDecisionV1 {
  const facts = contract.risk.facts;
  const reasons = [
    [facts.public_api_or_schema_change, "public_api_or_schema_change"],
    [facts.persistent_data_change, "persistent_data_change"],
    [facts.data_migration, "data_migration"],
    [facts.security_boundary_change, "security_boundary_change"],
    [facts.permission_boundary_change, "permission_boundary_change"],
    [facts.irreversible_external_effect, "irreversible_external_effect"],
    [facts.full_population_operation, "full_population_operation"],
    [facts.multi_repository_change, "multi_repository_change"],
    [
      facts.critical_user_path && facts.weak_observability,
      "critical_user_path_with_weak_observability",
    ],
  ]
    .filter(([hit]) => hit)
    .map(([, reason]) => String(reason));
  const minimum: EffectiveRiskLevel = reasons.length ? "strict" : "standard";
  if (contract.risk.requested_level === "standard" && minimum === "strict")
    throw new Error(`risk_level_below_required:${reasons.join(",")}`);
  return {
    minimum_level: minimum,
    effective_level:
      contract.risk.requested_level === "strict" ? "strict" : minimum,
    reasons,
  };
}

export function validateRiskProof(
  contract: DeliveryContractV1,
  decision: RiskDecisionV1,
): void {
  const errors: string[] = [];
  if (!contract.outcomes.length) errors.push("outcome_required");
  for (const check of contract.global.acceptance.checks)
    validateCheck(check, "global", errors);
  for (const outcome of contract.outcomes) validateOutcome(outcome, errors);
  if (decision.effective_level === "strict") validateStrict(contract, errors);
  if (errors.length)
    throw new Error(
      `delivery_contract_preflight_failed:\n${errors.join("\n")}`,
    );
}

function validateOutcome(outcome: DeliveryOutcomeV1, errors: string[]): void {
  const checks = new Map(
    outcome.acceptance.checks.map((check) => [check.key, check]),
  );
  if (!checks.size)
    errors.push(`outcome_without_executable_check:${outcome.key}`);
  if (!outcome.acceptance.validates.length)
    errors.push(`outcome_validates_empty:${outcome.key}`);
  if (!outcome.technical.expected_change_paths.length)
    errors.push(`expected_change_paths_empty:${outcome.key}`);
  for (const check of checks.values())
    validateCheck(check, outcome.key, errors);
  if (
    (outcome.product.owner_surfaces.length ||
      outcome.product.controls.length) &&
    ![...checks.values()].some((check) => check.proof_surface === "ui_browser")
  )
    errors.push(`ui_outcome_requires_ui_browser_proof:${outcome.key}`);
  const referenced = [
    ...(outcome.acceptance.population
      ? [outcome.acceptance.population.check_key]
      : []),
    ...outcome.acceptance.counterfactual_controls.map(
      (control) => control.check_key,
    ),
    ...(outcome.technical.rollback_and_recovery?.verification_check_keys ?? []),
  ];
  for (const checkKey of referenced)
    if (!checks.has(checkKey))
      errors.push(`outcome_check_reference_unknown:${outcome.key}:${checkKey}`);
}

function validateStrict(contract: DeliveryContractV1, errors: string[]): void {
  const allChecks = [
    ...contract.global.acceptance.checks,
    ...contract.outcomes.flatMap((outcome) => outcome.acceptance.checks),
  ];
  const negative = allChecks.some((check) => check.negative_assertions.length);
  const counterfactual = contract.outcomes.some(
    (outcome) => outcome.acceptance.counterfactual_controls.length,
  );
  if (!negative) errors.push("strict_negative_assertion_required");
  if (!counterfactual) errors.push("strict_counterfactual_control_required");
  validateStrictSurfaces(contract, allChecks, errors);
  validateStrictPopulation(contract, allChecks, errors);
  validateStrictRecovery(contract, errors);
  validateStrictForbiddenShortcuts(contract, negative, counterfactual, errors);
}

function validateStrictSurfaces(
  contract: DeliveryContractV1,
  allChecks: DeliveryCheckV1[],
  errors: string[],
): void {
  const facts = contract.risk.facts;
  const any = (surface: DeliveryCheckV1["proof_surface"]) =>
    allChecks.some((check) => check.proof_surface === surface);

  if (
    (facts.security_boundary_change || facts.permission_boundary_change) &&
    !any("security_boundary")
  )
    errors.push("strict_security_boundary_proof_required");
  if (facts.public_api_or_schema_change && !any("api_contract"))
    errors.push("strict_api_contract_proof_required");
  if (
    (facts.persistent_data_change || facts.data_migration) &&
    !any("data_state")
  )
    errors.push("strict_data_state_proof_required");
  if (
    facts.critical_user_path &&
    facts.weak_observability &&
    !allChecks.some(
      (check) =>
        check.proof_surface === "ui_browser" ||
        check.proof_surface === "runtime_behavior",
    )
  )
    errors.push("strict_critical_path_observable_proof_required");
}

function validateStrictPopulation(
  contract: DeliveryContractV1,
  allChecks: DeliveryCheckV1[],
  errors: string[],
): void {
  if (!contract.risk.facts.full_population_operation) return;
  if (!allChecks.some((check) => check.proof_surface === "population_coverage"))
    errors.push("strict_population_coverage_proof_required");
  if (
    contract.outcomes.some((outcome) => outcome.acceptance.population === null)
  )
    errors.push("strict_population_declaration_required");
}

function validateStrictRecovery(
  contract: DeliveryContractV1,
  errors: string[],
): void {
  const facts = contract.risk.facts;
  const required =
    facts.persistent_data_change ||
    facts.data_migration ||
    facts.irreversible_external_effect ||
    facts.multi_repository_change;
  const complete = contract.outcomes.every(
    (outcome) => outcome.technical.rollback_and_recovery !== null,
  );
  if (required && !complete)
    errors.push("strict_rollback_and_recovery_required");
}

function validateStrictForbiddenShortcuts(
  contract: DeliveryContractV1,
  negative: boolean,
  counterfactual: boolean,
  errors: string[],
): void {
  if (
    contract.global.technical.forbidden_shortcuts.length &&
    (!negative || !counterfactual)
  )
    errors.push("strict_forbidden_shortcut_proof_required");
}

function validateCheck(
  check: DeliveryCheckV1,
  owner: string,
  errors: string[],
): void {
  if (!check.positive_assertions.length)
    errors.push(`check_without_positive_assertion:${owner}:${check.key}`);
}
