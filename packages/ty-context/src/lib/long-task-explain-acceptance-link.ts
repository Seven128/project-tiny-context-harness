import type {
  ClaimCoverageSummaryV2,
  DeliveryContractV2,
  SourceClaimV2,
} from "./long-task-delivery-types.js";
import { evidenceAdapterForRunner } from "./long-task-evidence-adapter-policy.js";

type AcceptanceDisposition = Extract<
  SourceClaimV2["disposition"],
  { type: "acceptance" }
>;

export function explainAcceptanceLinks(
  contract: DeliveryContractV2,
  coverage: ClaimCoverageSummaryV2,
  disposition: AcceptanceDisposition,
) {
  return disposition.refs.map((reference) => {
    const [outcomeKey, checkKey, assertionKey] = reference.split(".");
    const outcome = contract.outcomes.find((item) => item.key === outcomeKey);
    if (!outcome) return missingAcceptanceLink(reference);
    const check = outcome.acceptance.checks.find(
      (item) => item.key === checkKey,
    );
    if (!check) return missingAcceptanceLink(reference);
    const assertion = [
      ...check.positive_assertions,
      ...check.negative_assertions,
    ].find((item) => item.key === assertionKey);
    if (!assertion) return missingAcceptanceLink(reference);
    const required: Record<string, string[]> = {};
    const covered: Record<string, string[]> = {};
    for (const claim of assertion.claims) {
      const proof = coverage.claims_by_outcome[outcomeKey]?.[claim];
      required[claim] = proof ? proof.required_surfaces : [];
      covered[claim] = proof ? proof.covered_surfaces : [];
    }
    return {
      type: disposition.type,
      reference,
      criterion: assertion.criterion ?? null,
      claims: assertion.claims,
      source_backed_claims: assertion.claims.filter((claim) =>
        sourceBacked(contract, outcomeKey, claim),
      ),
      required_proof_surfaces: required,
      covered_proof_surfaces: covered,
      proof_surface: check.proof_surface,
      evidence_adapter: evidenceAdapterForRunner(check.runner.type),
      observation: assertion.observation,
    };
  });
}

function missingAcceptanceLink(reference: string) {
  return {
    type: "acceptance",
    reference,
    criterion: null,
    claims: [],
    source_backed_claims: [],
    required_proof_surfaces: {},
    covered_proof_surfaces: {},
    proof_surface: null,
    evidence_adapter: null,
    observation: null,
  };
}

function sourceBacked(
  contract: DeliveryContractV2,
  outcomeKey: string,
  claim: string,
) {
  const reference = `${outcomeKey}.${claim}`;
  return contract.source_claims.some((source) => {
    const disposition = source.disposition;
    return (
      (disposition.type === "claim" || disposition.type === "outcome_result") &&
      (disposition.type === "outcome_result"
        ? disposition.ref === reference
        : disposition.refs.includes(reference))
    );
  });
}
