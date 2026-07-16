import type { DeliveryContractV2 } from "./long-task-delivery-types.js";
import type { compileProductClaimCoverage } from "./long-task-claims.js";
import { fail } from "./long-task-delivery-shape.js";

export function validateSourceClaimMappings(
  contract: DeliveryContractV2,
  compiledClaims: ReturnType<typeof compileProductClaimCoverage>,
): void {
  validateSourcePresence(contract);
  const sources = new Set(contract.task.source_paths);
  const productClaims = new Set(
    Object.values(compiledClaims.by_outcome)
      .flat()
      .map((claim) => claim.id),
  );
  const globalClaims = new Map(
    compiledClaims.by_global.map((claim) => [claim.local_key, claim]),
  );
  const coveredGlobalClaims = new Set(
    Object.entries(compiledClaims.summary.claims_by_global)
      .filter(([, value]) => value.covered)
      .map(([key]) => key),
  );
  const forbiddenPaths = new Set(
    contract.global.technical.forbidden_paths.map(
      (item) => `forbidden_path.${item.key}`,
    ),
  );
  const acceptanceRefs = new Set(
    contract.outcomes.flatMap((outcome) =>
      outcome.acceptance.checks.flatMap((check) =>
        [...check.positive_assertions, ...check.negative_assertions].map(
          (assertion) => `${outcome.key}.${check.key}.${assertion.key}`,
        ),
      ),
    ),
  );
  const externalConfirmations = new Set(
    contract.global.acceptance.external_confirmations.map((item) => item.key),
  );
  for (const claim of contract.source_claims) {
    validateSourceReference(claim.key, claim.source_ref, sources);
    const disposition = claim.disposition;
    if ("refs" in disposition && !disposition.refs.length)
      fail("source_claim_disposition_refs_empty", claim.key);
    if (disposition.type === "claim")
      for (const reference of disposition.refs) {
        if (reference.endsWith(".result"))
          fail(
            "source_claim_result_overcompression",
            `${claim.key}:${reference}`,
          );
        if (!productClaims.has(reference))
          fail("source_claim_product_ref_unknown", `${claim.key}:${reference}`);
      }
    if (disposition.type === "acceptance")
      validateRefs(
        claim.key,
        disposition.refs,
        acceptanceRefs,
        "source_claim_acceptance_ref_unknown",
      );
    if (disposition.type === "external_confirmation")
      validateRefs(
        claim.key,
        disposition.refs,
        externalConfirmations,
        "source_claim_external_confirmation_ref_unknown",
      );
    if (disposition.type === "global_constraint")
      validateGlobalRefs(
        claim.key,
        disposition.refs,
        forbiddenPaths,
        globalClaims,
        coveredGlobalClaims,
      );
  }
}

function validateSourcePresence(contract: DeliveryContractV2): void {
  if (contract.source_claims.length && !contract.task.source_paths.length)
    fail(
      "source_paths_required_for_source_claims",
      "source_claims require at least one source file",
    );
  if (contract.task.source_paths.length && !contract.source_claims.length)
    fail(
      "source_claims_required_for_source_paths",
      contract.task.source_paths.join(","),
    );
}

function validateSourceReference(
  key: string,
  sourceRef: string,
  sources: Set<string>,
): void {
  const [sourceFile, anchor, ...extra] = sourceRef.split("#");
  if (!sourceFile || extra.length || (anchor !== undefined && !anchor))
    fail("source_claim_ref_invalid", `${key}:${sourceRef}`);
  if (!sources.has(sourceFile))
    fail("source_claim_ref_unknown", `${key}:${sourceRef}`);
}

function validateRefs(
  claimKey: string,
  refs: string[],
  known: Set<string>,
  code: string,
): void {
  for (const reference of refs)
    if (!known.has(reference)) fail(code, `${claimKey}:${reference}`);
}

function validateGlobalRefs(
  claimKey: string,
  refs: string[],
  forbiddenPaths: Set<string>,
  globalClaims: Map<string, unknown>,
  coveredGlobalClaims: Set<string>,
): void {
  for (const reference of refs)
    if (reference.startsWith("forbidden_path.")) {
      if (!forbiddenPaths.has(reference))
        fail("source_claim_global_ref_unknown", `${claimKey}:${reference}`);
    } else if (!globalClaims.has(reference))
      fail("source_claim_global_ref_unknown", `${claimKey}:${reference}`);
    else if (!coveredGlobalClaims.has(reference))
      fail("source_claim_global_ref_uncovered", `${claimKey}:${reference}`);
}
