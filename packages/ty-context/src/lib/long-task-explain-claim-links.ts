import type {
  ClaimCoverageSummaryV2,
  DeliveryContractV2,
  SourceClaimV2,
} from "./long-task-delivery-types.js";
import { evidenceAdapterForRunner } from "./long-task-evidence-adapter-policy.js";

type ClaimDisposition = Extract<
  SourceClaimV2["disposition"],
  { type: "claim" }
>;
type GlobalDisposition = Extract<
  SourceClaimV2["disposition"],
  { type: "global_constraint" }
>;
type ResultDisposition = Extract<
  SourceClaimV2["disposition"],
  { type: "outcome_result" }
>;

export function explainOutcomeClaimLinks(
  contract: DeliveryContractV2,
  coverage: ClaimCoverageSummaryV2,
  disposition: ClaimDisposition,
) {
  return disposition.refs.map((reference) => {
    const [outcomeKey, ...parts] = reference.split(".");
    const proof = coverage.claims_by_outcome[outcomeKey]?.[parts.join(".")];
    return {
      type: disposition.type,
      reference,
      source_backed: sourceBacked(contract, reference),
      checks: proof ? unique(proof.proofs.map((item) => item.check_key)) : [],
      assertions: proof
        ? unique(proof.proofs.map((item) => item.assertion_key))
        : [],
      required_proof_surfaces: proof ? proof.required_surfaces : [],
      covered_proof_surfaces: proof ? proof.covered_surfaces : [],
      evidence_adapters: proof
        ? unique(
            proof.proofs.map((item) =>
              outcomeAdapter(contract, outcomeKey, item.check_key),
            ),
          )
        : [],
    };
  });
}

export function explainOutcomeResultLinks(
  contract: DeliveryContractV2,
  coverage: ClaimCoverageSummaryV2,
  disposition: ResultDisposition,
) {
  const proof =
    coverage.claims_by_outcome[disposition.ref.split(".")[0]]?.result;
  return [
    {
      type: disposition.type,
      reference: disposition.ref,
      source_backed: sourceBacked(contract, disposition.ref),
      checks: proof ? unique(proof.proofs.map((item) => item.check_key)) : [],
    },
  ];
}

export function explainGlobalClaimLinks(
  contract: DeliveryContractV2,
  coverage: ClaimCoverageSummaryV2,
  disposition: GlobalDisposition,
) {
  return disposition.refs.map((reference) => {
    const proof = coverage.claims_by_global[reference];
    return {
      type: disposition.type,
      reference,
      source_backed: sourceBacked(contract, reference),
      checks: proof ? unique(proof.proofs.map((item) => item.check_key)) : [],
      assertions: proof
        ? unique(proof.proofs.map((item) => item.assertion_key))
        : [],
      evidence_adapters: proof
        ? unique(
            proof.proofs.map((item) => globalAdapter(contract, item.check_key)),
          )
        : [],
    };
  });
}

function unique<T>(values: T[]): T[] {
  return values.filter((value, index) => values.indexOf(value) === index);
}

function sourceBacked(contract: DeliveryContractV2, reference: string) {
  return contract.source_claims.some((source) => {
    const disposition = source.disposition;
    if (disposition.type === "outcome_result")
      return disposition.ref === reference;
    return (
      (disposition.type === "claim" ||
        disposition.type === "global_constraint") &&
      disposition.refs.includes(reference)
    );
  });
}

function outcomeAdapter(
  contract: DeliveryContractV2,
  outcomeKey: string,
  checkKey: string,
) {
  const outcome = contract.outcomes.find((item) => item.key === outcomeKey);
  const check = outcome?.acceptance.checks.find(
    (candidate) => candidate.key === checkKey,
  );
  return check ? evidenceAdapterForRunner(check.runner.type) : null;
}

function globalAdapter(contract: DeliveryContractV2, checkKey: string) {
  const check = contract.global.acceptance.checks.find(
    (candidate) => candidate.key === checkKey,
  );
  return check ? evidenceAdapterForRunner(check.runner.type) : null;
}
