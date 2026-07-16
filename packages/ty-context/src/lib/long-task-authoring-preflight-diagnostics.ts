import type { ParsedDeliveryContractV2 } from "./long-task-delivery-parser.js";
import type { DeliveryContractV2 } from "./long-task-delivery-types.js";
import type {
  AuthoringPreflightDiagnosticV1,
  SourceCoverageV1,
} from "./long-task-authoring-preflight-types.js";

export function addAuthoringDiagnostics(
  contract: DeliveryContractV2,
  parsed: ParsedDeliveryContractV2,
  diagnostics: AuthoringPreflightDiagnosticV1[],
): void {
  if (parsed.outcome_files.length)
    diagnostics.push({
      level: "warning",
      code: "outcome_files_compatibility_only",
      message:
        "outcome_files is supported only as physical compatibility; new authoring should use inline Outcomes.",
    });
  for (const claim of contract.source_claims)
    if (claim.disposition.type === "decision_required")
      diagnostics.push({
        level: "decision_required",
        code: "source_claim_decision_required",
        message: `${claim.key}: ${claim.disposition.reason}`,
      });
}

export function sourceCoverage(contract: DeliveryContractV2): SourceCoverageV1 {
  const counts = {
    claim: 0,
    acceptance: 0,
    outcome_result: 0,
    global_constraint: 0,
    risk_fact: 0,
    external_confirmation: 0,
    decision_required: 0,
  };
  for (const item of contract.source_claims) counts[item.disposition.type] += 1;
  return {
    total: contract.source_claims.length,
    resolved: contract.source_claims.length - counts.decision_required,
    mapped_to_product_claims: counts.claim,
    mapped_to_acceptance: counts.acceptance,
    mapped_to_outcome_results: counts.outcome_result,
    mapped_to_global_constraints: counts.global_constraint,
    mapped_to_risk_facts: counts.risk_fact,
    mapped_to_external_confirmations: counts.external_confirmation,
    decision_required: counts.decision_required,
    unresolved: contract.source_claims
      .filter((item) => item.disposition.type === "decision_required")
      .map((item) => item.key),
  };
}

export async function captureDiagnostic(
  diagnostics: AuthoringPreflightDiagnosticV1[],
  action: () => Promise<unknown>,
): Promise<void> {
  try {
    await action();
  } catch (error) {
    addDiagnosticError(diagnostics, error);
  }
}

export function addDiagnosticError(
  diagnostics: AuthoringPreflightDiagnosticV1[],
  error: unknown,
  outcomeKey?: string | null,
  checkKey?: string,
): void {
  const message = error instanceof Error ? error.message : String(error);
  const rows = message.startsWith("delivery_contract_preflight_failed:\n")
    ? message.split(/\r?\n/u).slice(1)
    : [message];
  for (const row of rows)
    diagnostics.push({
      level: "error",
      code: diagnosticCode(row),
      message: row,
      ...(outcomeKey ? { outcome_key: outcomeKey } : {}),
      ...(checkKey ? { check_key: checkKey } : {}),
    });
}

function diagnosticCode(message: string): string {
  if (message.startsWith("delivery_contract_invalid:"))
    return message.split(":")[1] || "delivery_contract_invalid";
  return message.split(":")[0] || "authoring_preflight_error";
}
