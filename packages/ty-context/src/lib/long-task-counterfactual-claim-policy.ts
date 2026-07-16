import type {
  CounterfactualControlV2,
  DeliveryBindingV2,
  DeliveryOutcomeV2,
} from "./long-task-delivery-types.js";

export function validateCounterfactualBindingClaims(
  outcome: DeliveryOutcomeV2,
  control: CounterfactualControlV2,
  binding: DeliveryBindingV2,
): void {
  if (
    binding.verification_check_key &&
    binding.verification_check_key !== control.check_key
  )
    throw new Error(
      `counterfactual_binding_check_mismatch:${outcome.key}:${control.key}:${binding.key}:${control.check_key}`,
    );
  if (
    !control.claims.some(
      (claim) =>
        claim.startsWith("requirement.") || claim.startsWith("obligation."),
    )
  )
    throw new Error(
      `counterfactual_binding_claim_required:${outcome.key}:${control.key}`,
    );
  const check = outcome.acceptance.checks.find(
    (item) => item.key === control.check_key,
  );
  const expectedAssertions = new Set(control.expected_assertion_failures);
  const expectedClaims = new Set(
    [
      ...(check?.positive_assertions ?? []),
      ...(check?.negative_assertions ?? []),
    ]
      .filter((assertion) => expectedAssertions.has(assertion.key))
      .flatMap((assertion) => assertion.claims),
  );
  if (control.claims.some((claim) => !expectedClaims.has(claim)))
    throw new Error(
      `counterfactual_binding_claim_unrelated:${outcome.key}:${control.key}`,
    );
}
