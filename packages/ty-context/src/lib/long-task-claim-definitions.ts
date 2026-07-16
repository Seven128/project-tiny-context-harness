import type {
  ClaimProofV2,
  DeliveryOutcomeV2,
  ProductClaimV2,
  ProofSurface,
} from "./long-task-delivery-types.js";
import { fail } from "./long-task-delivery-shape.js";

export function generateClaims(outcome: DeliveryOutcomeV2): ProductClaimV2[] {
  const claims: ProductClaimV2[] = [claim(outcome.key, "result", "result")];
  for (const control of outcome.product.controls) {
    const fields: Array<[string, string]> = [
      ["trigger", control.trigger],
      ["input", control.input],
      ["loading", control.loading_state],
      ["empty", control.empty_state],
      ["success", control.success_state],
      ["failure", control.failure_state],
      ["feedback", control.feedback],
    ];
    for (const [field, value] of fields)
      if (value.trim())
        claims.push(
          claim(outcome.key, `control.${control.key}.${field}`, "control", [
            "ui_browser",
          ]),
        );
  }
  for (const item of outcome.product.non_completing_outcomes)
    claims.push(
      claim(outcome.key, `non_completing.${item.key}`, "non_completing"),
    );
  for (const item of outcome.technical.obligations)
    claims.push(
      claim(
        outcome.key,
        `obligation.${item.key}`,
        "obligation",
        item.required_proof_surfaces,
      ),
    );
  for (const item of outcome.technical.forbidden_shortcuts)
    claims.push(
      claim(
        outcome.key,
        `forbidden_shortcut.${item.key}`,
        "forbidden_shortcut",
      ),
    );
  return claims;
}

export function validateProofSurface(
  claim: ProductClaimV2,
  proof: ClaimProofV2,
  outcomeKey: string,
): void {
  if (claim.kind === "control" && proof.proof_surface !== "ui_browser")
    fail("ui_claim_requires_ui_browser", `${outcomeKey}:${claim.local_key}`);
  if (
    (claim.kind === "non_completing" || claim.kind === "forbidden_shortcut") &&
    proof.polarity !== "negative" &&
    proof.polarity !== "counterfactual"
  )
    fail(
      "negative_or_counterfactual_claim_proof_required",
      `${outcomeKey}:${claim.local_key}`,
    );
  if (
    claim.kind === "obligation" &&
    claim.required_proof_surfaces.length > 0 &&
    !claim.required_proof_surfaces.includes(proof.proof_surface)
  )
    fail(
      "obligation_proof_surface_mismatch",
      `${outcomeKey}:${claim.local_key}:${proof.proof_surface}`,
    );
}

export function assertAllClaimsCovered(uncovered: string[]): void {
  if (uncovered.length)
    fail("product_claim_uncovered", uncovered.sort().join(","));
}

function claim(
  outcomeKey: string,
  localKey: string,
  kind: ProductClaimV2["kind"],
  requiredProofSurfaces: ProofSurface[] = [],
): ProductClaimV2 {
  return {
    id: `${outcomeKey}.${localKey}`,
    outcome_key: outcomeKey,
    local_key: localKey,
    kind,
    required_proof_surfaces: requiredProofSurfaces,
  };
}
