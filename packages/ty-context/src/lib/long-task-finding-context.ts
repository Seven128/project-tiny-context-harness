import type {
  CheckExecutionResultV2,
  CompiledDeliveryContractV2,
  LongTaskFindingV2,
} from "./long-task-delivery-types.js";

export function enrichCheckResultFindings(
  compiled: CompiledDeliveryContractV2,
  result: CheckExecutionResultV2,
): CheckExecutionResultV2 {
  return {
    ...result,
    findings: result.findings.map((finding) =>
      enrichFinding(compiled, finding),
    ),
  };
}

export function enrichFinding(
  compiled: CompiledDeliveryContractV2,
  finding: LongTaskFindingV2,
): LongTaskFindingV2 {
  const outcome = finding.outcome_key
    ? compiled.outcomes.find((item) => item.key === finding.outcome_key)
    : null;
  const sourceClaims = sourceClaimsForFinding(compiled, finding);
  return {
    ...finding,
    ...(sourceClaims.length ? { source_claim_keys: sourceClaims } : {}),
    ...(outcome && !finding.owner_paths
      ? { owner_paths: outcome.product.owner.path_globs }
      : {}),
  };
}

function sourceClaimsForFinding(
  compiled: CompiledDeliveryContractV2,
  finding: LongTaskFindingV2,
): string[] {
  const acceptanceRef =
    finding.outcome_key && finding.check_key && finding.assertion_key
      ? `${finding.outcome_key}.${finding.check_key}.${finding.assertion_key}`
      : null;
  const productRefs = new Set(
    (finding.claim_keys ?? []).map((claim) =>
      finding.outcome_key ? `${finding.outcome_key}.${claim}` : claim,
    ),
  );
  return compiled.source_claims
    .filter((source) => {
      if (
        source.disposition.type === "acceptance" &&
        acceptanceRef &&
        source.disposition.refs.includes(acceptanceRef)
      )
        return true;
      if (
        source.disposition.type === "claim" &&
        source.disposition.refs.some((reference) => productRefs.has(reference))
      )
        return true;
      if (
        source.disposition.type === "outcome_result" &&
        productRefs.has(source.disposition.ref)
      )
        return true;
      return (
        source.disposition.type === "global_constraint" &&
        source.disposition.refs.some((reference) => productRefs.has(reference))
      );
    })
    .map((source) => source.key)
    .sort();
}
