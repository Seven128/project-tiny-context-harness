import type {
  ClaimCoverageSummaryV2,
  DeliveryContractV2,
  SourceClaimV2,
} from "./long-task-delivery-types.js";
import { explainAcceptanceLinks } from "./long-task-explain-acceptance-link.js";
import {
  explainGlobalClaimLinks,
  explainOutcomeClaimLinks,
  explainOutcomeResultLinks,
} from "./long-task-explain-claim-links.js";

export function explainSourceLinks(
  contract: DeliveryContractV2,
  coverage: ClaimCoverageSummaryV2,
  source: SourceClaimV2,
) {
  const disposition = source.disposition;
  if (disposition.type === "acceptance")
    return explainAcceptanceLinks(contract, coverage, disposition);
  if (disposition.type === "claim")
    return explainOutcomeClaimLinks(contract, coverage, disposition);
  if (disposition.type === "outcome_result")
    return explainOutcomeResultLinks(coverage, disposition);
  if (disposition.type === "global_constraint")
    return explainGlobalClaimLinks(contract, coverage, disposition);
  if (
    disposition.type === "external_confirmation" ||
    disposition.type === "risk_fact"
  )
    return disposition.refs.map((reference) => ({
      type: disposition.type,
      reference,
    }));
  return [{ type: disposition.type, reason: disposition.reason }];
}
