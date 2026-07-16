import type {
  DeliveryContractV2,
  SourceClaimV2,
} from "./long-task-delivery-types.js";

type AcceptanceDisposition = Extract<
  SourceClaimV2["disposition"],
  { type: "acceptance" }
>;

export function explainAcceptanceLinks(
  contract: DeliveryContractV2,
  disposition: AcceptanceDisposition,
) {
  return disposition.refs.map((reference) => {
    const [outcomeKey, checkKey, assertionKey] = reference.split(".");
    const outcome = contract.outcomes.find((item) => item.key === outcomeKey);
    const check = outcome?.acceptance.checks.find(
      (item) => item.key === checkKey,
    );
    const assertion = [
      ...(check?.positive_assertions ?? []),
      ...(check?.negative_assertions ?? []),
    ].find((item) => item.key === assertionKey);
    return {
      type: disposition.type,
      reference,
      criterion: assertion?.criterion ?? null,
      claims: assertion?.claims ?? [],
      observation: assertion?.observation ?? null,
    };
  });
}
