import type {
  ClaimCoverageSummaryV2,
  DeliveryContractV2,
  SourceClaimV2,
} from "./long-task-delivery-types.js";
import { explainAcceptanceLinks } from "./long-task-explain-acceptance-link.js";

export function explainSourceLinks(
  contract: DeliveryContractV2,
  coverage: ClaimCoverageSummaryV2,
  source: SourceClaimV2,
) {
  if (source.disposition.type === "acceptance")
    return explainAcceptanceLinks(contract, source.disposition);
  if (source.disposition.type === "claim")
    return source.disposition.refs.map((reference) => {
      const [outcomeKey, ...parts] = reference.split(".");
      const proof = coverage.claims_by_outcome[outcomeKey]?.[parts.join(".")];
      return {
        type: source.disposition.type,
        reference,
        checks: proof?.proofs.map((item) => item.check_key) ?? [],
        assertions: proof?.proofs.map((item) => item.assertion_key) ?? [],
      };
    });
  if (source.disposition.type === "global_constraint")
    return source.disposition.refs.map((reference) => {
      const proof = coverage.claims_by_global[reference];
      return {
        type: source.disposition.type,
        reference,
        checks: proof?.proofs.map((item) => item.check_key) ?? [],
        assertions: proof?.proofs.map((item) => item.assertion_key) ?? [],
      };
    });
  if (source.disposition.type === "external_confirmation")
    return source.disposition.refs.map((reference) => ({
      type: source.disposition.type,
      reference,
    }));
  return [{ type: source.disposition.type, reason: source.disposition.reason }];
}
