import type {
  DeliveryAssertionV2,
  DeliveryContractV2,
  ProductClaimV2,
  ProofSurface,
} from "./long-task-delivery-types.js";

const PRESENCE_OR_UNARY = new Set(["exists", "truthy", "falsy"]);

export function validateDeclaredCheckSafety(
  contract: DeliveryContractV2,
  report?: (message: string) => void,
): void {
  for (const check of contract.global.acceptance.checks)
    validateCheck(check, null, report);
  for (const outcome of contract.outcomes)
    for (const check of outcome.acceptance.checks)
      validateCheck(check, outcome.key, report);
}

export function validateClaimAssertionOperator(
  claim: ProductClaimV2,
  assertion: DeliveryAssertionV2,
  proofSurface: ProofSurface,
  outcomeKey: string,
  checkKey: string,
): void {
  if (!assertion.claims.length || !PRESENCE_OR_UNARY.has(assertion.operator))
    return;
  const implementationStructureObligation =
    claim.kind === "obligation" &&
    proofSurface === "implementation_structure" &&
    claim.required_proof_surfaces.includes("implementation_structure");
  if (assertion.operator === "exists" && implementationStructureObligation)
    return;
  throw new Error(
    `claim_assertion_explicit_expected_required:${outcomeKey}:${checkKey}:${assertion.key}`,
  );
}

export function validateGlobalAssertionOperator(
  assertion: DeliveryAssertionV2,
  checkKey: string,
): void {
  if (assertion.claims.length && PRESENCE_OR_UNARY.has(assertion.operator))
    throw new Error(
      `claim_assertion_explicit_expected_required:GLOBAL:${checkKey}:${assertion.key}`,
    );
}

function validateCheck(
  check: DeliveryContractV2["global"]["acceptance"]["checks"][number],
  outcomeKey: string | null,
  report?: (message: string) => void,
): void {
  for (const assertion of [
    ...check.positive_assertions,
    ...check.negative_assertions,
  ]) {
    if (!assertion.criterion)
      issue(
        report,
        `assertion_criterion_required:${outcomeKey ?? "GLOBAL"}.${check.key}.${assertion.key}`,
      );
    if (check.runner.type === "playwright_test" && assertion.claims.length) {
      const canonical =
        assertion.observation === `playwright.case.${assertion.key}.passed` &&
        assertion.operator === "equals" &&
        assertion.expected === true;
      if (!canonical)
        issue(
          report,
          `playwright_claim_assertion_invalid:${outcomeKey ?? "GLOBAL"}:${check.key}:${assertion.key}`,
        );
    }
    if (outcomeKey === null)
      captureOrReport(report, () =>
        validateGlobalAssertionOperator(assertion, check.key),
      );
  }
}

function issue(
  report: ((message: string) => void) | undefined,
  message: string,
): void {
  if (!report) throw new Error(message);
  report(message);
}

function captureOrReport(
  report: ((message: string) => void) | undefined,
  action: () => void,
): void {
  if (!report) {
    action();
    return;
  }
  try {
    action();
  } catch (error) {
    report(error instanceof Error ? error.message : String(error));
  }
}
