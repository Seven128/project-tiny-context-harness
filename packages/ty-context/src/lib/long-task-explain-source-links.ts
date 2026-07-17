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
import { buildCanonicalSourceTargetIndex } from "./long-task-source-target-index.js";

export function explainSourceLinks(
  contract: DeliveryContractV2,
  coverage: ClaimCoverageSummaryV2,
  source: SourceClaimV2,
) {
  const disposition = source.disposition;
  const targets = buildCanonicalSourceTargetIndex(contract);
  let links;
  if (disposition.type === "acceptance")
    links = explainAcceptanceLinks(contract, coverage, disposition);
  if (disposition.type === "claim")
    links = explainOutcomeClaimLinks(contract, coverage, disposition);
  if (disposition.type === "outcome_result")
    links = explainOutcomeResultLinks(contract, coverage, disposition);
  if (disposition.type === "global_constraint")
    links = explainGlobalClaimLinks(contract, coverage, disposition);
  if (
    disposition.type === "external_confirmation" ||
    disposition.type === "risk_fact"
  )
    links = disposition.refs.map((reference) => ({
      type: disposition.type,
      reference,
    }));
  links ??= [
    {
      type: disposition.type,
      reason: "reason" in disposition ? disposition.reason : null,
    },
  ];
  return links.map((link) => {
    if (!("reference" in link)) return link;
    const target = targets.get(link.reference);
    return {
      ...link,
      canonical_target: target ?? null,
    };
  });
}
