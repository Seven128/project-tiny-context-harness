import type {
  ClaimCoverageSummaryV2,
  ClaimProofV2,
  DeliveryContractV2,
  ProductClaimV2,
} from "./long-task-delivery-types.js";
import {
  assertAllClaimsCovered,
  generateClaims,
  validateProofSurface,
} from "./long-task-claim-definitions.js";
import { fail } from "./long-task-delivery-shape.js";

export interface CompiledClaimsV2 {
  by_outcome: Record<string, ProductClaimV2[]>;
  summary: ClaimCoverageSummaryV2;
}

export function compileProductClaimCoverage(
  contract: DeliveryContractV2,
): CompiledClaimsV2 {
  const byOutcome = Object.fromEntries(
    contract.outcomes.map((outcome) => [outcome.key, generateClaims(outcome)]),
  );
  const outcomeKeys = new Set(contract.outcomes.map((outcome) => outcome.key));
  const summaryRows: ClaimCoverageSummaryV2["claims_by_outcome"] = {};
  const uncovered: string[] = [];

  for (const outcome of contract.outcomes) {
    const claims = byOutcome[outcome.key];
    const claimMap = new Map(claims.map((claim) => [claim.local_key, claim]));
    const proofs = new Map<string, ClaimProofV2[]>();
    const addProof = (claimKey: string, proof: ClaimProofV2): void => {
      const claim = claimMap.get(claimKey);
      if (!claim) {
        const first = claimKey.split(".")[0];
        if (outcomeKeys.has(first) && first !== outcome.key)
          fail("assertion_claim_cross_outcome", `${outcome.key}:${claimKey}`);
        fail("assertion_claim_unknown", `${outcome.key}:${claimKey}`);
      }
      validateProofSurface(claim, proof, outcome.key);
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
            addProof(claimKey, {
              check_key: check.key,
              assertion_key: assertion.key,
              polarity,
              proof_surface: check.proof_surface,
            });
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

    const rows: Record<string, { covered: boolean; proofs: ClaimProofV2[] }> =
      {};
    for (const claim of claims) {
      const claimProofs = proofs.get(claim.local_key) ?? [];
      const covered = claimProofs.length > 0;
      rows[claim.local_key] = { covered, proofs: claimProofs };
      if (!covered) uncovered.push(claim.id);
    }
    summaryRows[outcome.key] = rows;
  }

  assertAllClaimsCovered(uncovered);
  const total = Object.values(byOutcome).reduce(
    (sum, claims) => sum + claims.length,
    0,
  );
  return {
    by_outcome: byOutcome,
    summary: {
      claims_total: total,
      claims_covered: total - uncovered.length,
      uncovered_claims: uncovered.sort(),
      claims_by_outcome: summaryRows,
    },
  };
}
