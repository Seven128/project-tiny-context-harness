import type {
  ClaimCoverageSummaryV2,
  ClaimProofV2,
  DeliveryContractV2,
  GlobalClaimV2,
  ProductClaimV2,
} from "./long-task-delivery-types.js";
import {
  assertAllClaimsCovered,
  assertAllGlobalClaimsCovered,
  generateClaims,
  generateGlobalClaims,
  validateGlobalProofPolarity,
  validateProofSurface,
} from "./long-task-claim-definitions.js";
import { fail } from "./long-task-delivery-shape.js";
import {
  validateClaimAssertionOperator,
  validateGlobalAssertionOperator,
} from "./long-task-claim-proof-policy.js";

export interface CompiledClaimsV2 {
  by_global: GlobalClaimV2[];
  by_outcome: Record<string, ProductClaimV2[]>;
  summary: ClaimCoverageSummaryV2;
}

export function compileProductClaimCoverage(
  contract: DeliveryContractV2,
  options: { allow_uncovered?: boolean } = {},
): CompiledClaimsV2 {
  const byGlobal = generateGlobalClaims(contract.global);
  const byOutcome = Object.fromEntries(
    contract.outcomes.map((outcome) => [outcome.key, generateClaims(outcome)]),
  );
  for (const [outcomeKey, claims] of Object.entries(byOutcome))
    if (!claims.some((claim) => claim.kind !== "result"))
      fail("outcome_atomic_claim_required", outcomeKey);
  const globalClaimMap = new Map(
    byGlobal.map((claim) => [claim.local_key, claim]),
  );
  const outcomeClaimIds = new Set(
    Object.values(byOutcome)
      .flat()
      .map((claim) => claim.id),
  );
  const globalProofs = new Map<string, ClaimProofV2[]>();
  const addGlobalProof = (claimKey: string, proof: ClaimProofV2): void => {
    const claim = globalClaimMap.get(claimKey);
    if (!claim) {
      if (outcomeClaimIds.has(claimKey))
        fail("global_assertion_claim_cross_scope", claimKey);
      fail("global_assertion_claim_unknown", claimKey);
    }
    validateGlobalProofPolarity(claim, proof);
    const rows = globalProofs.get(claimKey) ?? [];
    rows.push(proof);
    globalProofs.set(claimKey, rows);
  };
  for (const check of contract.global.acceptance.checks) {
    const assertionKeys = new Set<string>();
    for (const [polarity, assertions] of [
      ["positive", check.positive_assertions],
      ["negative", check.negative_assertions],
    ] as const)
      for (const assertion of assertions) {
        if (assertionKeys.has(assertion.key))
          fail(
            "assertion_key_duplicate",
            `GLOBAL:${check.key}:${assertion.key}`,
          );
        assertionKeys.add(assertion.key);
        validateGlobalAssertionOperator(assertion, check.key);
        for (const claimKey of assertion.claims)
          addGlobalProof(claimKey, {
            check_key: check.key,
            assertion_key: assertion.key,
            polarity,
            proof_surface: check.proof_surface,
          });
      }
  }

  const globalRows: ClaimCoverageSummaryV2["claims_by_global"] = {};
  const uncoveredGlobal: string[] = [];
  for (const claim of byGlobal) {
    const proofs = globalProofs.get(claim.local_key) ?? [];
    const covered = proofs.length > 0;
    globalRows[claim.local_key] = { covered, proofs };
    if (!covered) uncoveredGlobal.push(claim.id);
  }

  const outcomeKeys = new Set(contract.outcomes.map((outcome) => outcome.key));
  const globalLocalKeys = new Set(byGlobal.map((claim) => claim.local_key));
  const summaryRows: ClaimCoverageSummaryV2["claims_by_outcome"] = {};
  const uncoveredOutcome: string[] = [];

  for (const outcome of contract.outcomes) {
    const claims = byOutcome[outcome.key];
    const claimMap = new Map(claims.map((claim) => [claim.local_key, claim]));
    const proofs = new Map<string, ClaimProofV2[]>();
    const addProof = (
      claimKey: string,
      proof: ClaimProofV2,
      observation?: string,
      assertion?: DeliveryContractV2["outcomes"][number]["acceptance"]["checks"][number]["positive_assertions"][number],
    ): void => {
      const claim = claimMap.get(claimKey);
      if (!claim) {
        if (globalLocalKeys.has(claimKey))
          fail("assertion_claim_cross_scope", `${outcome.key}:${claimKey}`);
        const first = claimKey.split(".")[0];
        if (outcomeKeys.has(first) && first !== outcome.key)
          fail("assertion_claim_cross_outcome", `${outcome.key}:${claimKey}`);
        fail("assertion_claim_unknown", `${outcome.key}:${claimKey}`);
      }
      if (
        observation === "playwright.passed" &&
        (claim.kind === "requirement" || claim.kind === "control")
      )
        fail(
          "fine_grained_claim_requires_ac_observation",
          `${outcome.key}:${claim.local_key}`,
        );
      validateProofSurface(claim, proof, outcome.key);
      if (assertion)
        validateClaimAssertionOperator(
          claim,
          assertion,
          proof.proof_surface,
          outcome.key,
          proof.check_key,
        );
      const rows = proofs.get(claimKey) ?? [];
      rows.push(proof);
      proofs.set(claimKey, rows);
    };

    for (const check of outcome.acceptance.checks) {
      const assertionKeys = new Set<string>();
      for (const [polarity, assertions] of [
        ["positive", check.positive_assertions],
        ["negative", check.negative_assertions],
      ] as const) {
        for (const assertion of assertions) {
          if (assertionKeys.has(assertion.key))
            fail(
              "assertion_key_duplicate",
              `${outcome.key}:${check.key}:${assertion.key}`,
            );
          assertionKeys.add(assertion.key);
          for (const claimKey of assertion.claims)
            addProof(
              claimKey,
              {
                check_key: check.key,
                assertion_key: assertion.key,
                polarity,
                proof_surface: check.proof_surface,
              },
              assertion.observation,
              assertion,
            );
        }
      }
    }

    if (outcome.acceptance.population) {
      const population = outcome.acceptance.population;
      const check = outcome.acceptance.checks.find(
        (candidate) => candidate.key === population.check_key,
      );
      if (!check)
        fail(
          "outcome_check_reference_unknown",
          `${outcome.key}:${population.check_key}`,
        );
      for (const claimKey of population.claims)
        addProof(claimKey, {
          check_key: check.key,
          assertion_key: null,
          polarity: "population",
          proof_surface: check.proof_surface,
        });
    }

    for (const counterfactual of outcome.acceptance.counterfactual_controls) {
      const check = outcome.acceptance.checks.find(
        (candidate) => candidate.key === counterfactual.check_key,
      );
      if (!check)
        fail(
          "outcome_check_reference_unknown",
          `${outcome.key}:${counterfactual.check_key}`,
        );
      const assertionKeys = new Set(
        [...check.positive_assertions, ...check.negative_assertions].map(
          (assertion) => assertion.key,
        ),
      );
      if (!counterfactual.expected_assertion_failures.length)
        fail(
          "counterfactual_expected_assertion_required",
          `${outcome.key}:${counterfactual.key}`,
        );
      for (const assertionKey of counterfactual.expected_assertion_failures)
        if (!assertionKeys.has(assertionKey))
          fail(
            "counterfactual_assertion_unknown",
            `${outcome.key}:${counterfactual.key}:${assertionKey}`,
          );
      for (const claimKey of counterfactual.claims)
        addProof(claimKey, {
          check_key: check.key,
          assertion_key: counterfactual.expected_assertion_failures.join(","),
          polarity: "counterfactual",
          proof_surface: check.proof_surface,
        });
    }

    const rows: ClaimCoverageSummaryV2["claims_by_outcome"][string] = {};
    for (const claim of claims) {
      const claimProofs = proofs.get(claim.local_key) ?? [];
      const requiredSurfaces = [...claim.required_proof_surfaces].sort();
      const coveredSurfaces = [
        ...new Set(claimProofs.map((proof) => proof.proof_surface)),
      ].sort();
      const missingSurfaces = requiredSurfaces.filter(
        (surface) => !coveredSurfaces.includes(surface),
      );
      const covered =
        claimProofs.length > 0 &&
        (requiredSurfaces.length === 0 || missingSurfaces.length === 0);
      rows[claim.local_key] = {
        required_surfaces: requiredSurfaces,
        covered_surfaces: coveredSurfaces,
        missing_surfaces: missingSurfaces,
        covered,
        proofs: claimProofs,
      };
      if (claimProofs.length && missingSurfaces.length)
        fail(
          "product_claim_required_surfaces_missing",
          `${outcome.key}:${claim.local_key}:${missingSurfaces.join(",")}`,
        );
      if (!covered) uncoveredOutcome.push(claim.id);
    }
    summaryRows[outcome.key] = rows;
  }

  const uncovered = [...uncoveredGlobal, ...uncoveredOutcome].sort();
  const total =
    byGlobal.length +
    Object.values(byOutcome).reduce((sum, claims) => sum + claims.length, 0);
  const compiled = {
    by_global: byGlobal,
    by_outcome: byOutcome,
    summary: {
      claims_total: total,
      claims_covered: total - uncovered.length,
      uncovered_claims: uncovered,
      claims_by_global: globalRows,
      claims_by_outcome: summaryRows,
    },
  };
  if (!options.allow_uncovered) assertCompiledClaimsCovered(compiled);
  return compiled;
}

export function assertCompiledClaimsCovered(compiled: CompiledClaimsV2): void {
  const uncoveredGlobal = compiled.by_global
    .filter(
      (claim) => !compiled.summary.claims_by_global[claim.local_key]?.covered,
    )
    .map((claim) => claim.id);
  const uncoveredOutcome = Object.values(compiled.by_outcome)
    .flat()
    .filter(
      (claim) =>
        !compiled.summary.claims_by_outcome[claim.outcome_key]?.[
          claim.local_key
        ]?.covered,
    )
    .map((claim) => claim.id);
  assertAllGlobalClaimsCovered(uncoveredGlobal);
  assertAllClaimsCovered(uncoveredOutcome);
}
