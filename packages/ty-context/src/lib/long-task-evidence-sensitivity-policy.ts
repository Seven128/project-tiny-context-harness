import type {
  CompiledOutcomeV2,
  DeliveryContractV2,
} from "./long-task-delivery-types.js";

const NON_RESULT_SENSITIVITY_PREFIXES = [
  "requirement.",
  "control.",
  "obligation.",
  "non_completing.",
  "forbidden_shortcut.",
];

export function validateStructuredEvidenceSensitivity(
  contract: DeliveryContractV2,
  outcomes: CompiledOutcomeV2[],
  report?: ValidationReporter,
): void {
  const weakOutcomes = new Set(contract.risk.facts.weak_observability);
  for (const outcome of outcomes) {
    const population = outcome.acceptance.population;
    const counterfactualsByCheck = groupCounterfactuals(outcome);
    for (const check of outcome.acceptance.checks) {
      if (check.evidence_adapter !== "structured_json_v2") continue;
      const assertionClaims = new Set(
        [...check.positive_assertions, ...check.negative_assertions].flatMap(
          (assertion) => assertion.claims,
        ),
      );
      const populationClaims = new Set(
        population?.check_key === check.key ? population.claims : [],
      );
      const declaredClaims = new Set([...assertionClaims, ...populationClaims]);
      const counterfactuals = counterfactualsByCheck.get(check.key) ?? [];
      const counterfactualClaims = new Set(
        counterfactuals.flatMap((control) => control.claims),
      );
      const required = [...declaredClaims].filter(
        (claim) =>
          weakOutcomes.has(outcome.key) || !populationClaims.has(claim),
      );
      const missing = required
        .filter((claim) => !counterfactualClaims.has(claim))
        .sort();
      if (missing.length)
        issue(
          report,
          `structured_evidence_sensitivity_required:${outcome.key}:${check.key}:${missing.join(",")}`,
        );

      for (const assertion of [
        ...check.positive_assertions,
        ...check.negative_assertions,
      ]) {
        if (!assertion.claims.includes("result")) continue;
        const resultSensitive = counterfactuals.some(
          (control) =>
            control.expected_assertion_failures.includes(assertion.key) &&
            control.claims.includes("result") &&
            control.claims.some(isNonResultSensitivityClaim),
        );
        if (!resultSensitive)
          issue(
            report,
            `structured_result_counterfactual_non_result_required:${outcome.key}:${check.key}:${assertion.key}`,
          );
      }
    }
  }
}

function groupCounterfactuals(outcome: CompiledOutcomeV2) {
  const grouped = new Map<
    string,
    CompiledOutcomeV2["acceptance"]["counterfactual_controls"]
  >();
  for (const control of outcome.acceptance.counterfactual_controls) {
    const controls = grouped.get(control.check_key) ?? [];
    controls.push(control);
    grouped.set(control.check_key, controls);
  }
  return grouped;
}

function isNonResultSensitivityClaim(claim: string): boolean {
  return NON_RESULT_SENSITIVITY_PREFIXES.some((prefix) =>
    claim.startsWith(prefix),
  );
}

type ValidationReporter = (message: string) => void;

function issue(report: ValidationReporter | undefined, message: string): void {
  if (!report) throw new Error(message);
  report(message);
}
