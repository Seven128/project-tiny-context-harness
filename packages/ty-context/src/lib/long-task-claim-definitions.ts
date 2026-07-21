import type {
  ClaimProofV2,
  DeliveryContractV2,
  DeliveryOutcomeV2,
  GlobalClaimV2,
  ProductClaimV2,
  ProofSurface,
} from "./long-task-delivery-types.js";
import { fail } from "./long-task-delivery-shape.js";

export function generateClaims(outcome: DeliveryOutcomeV2): ProductClaimV2[] {
  const claims: ProductClaimV2[] = [claim(outcome.key, "result", "result")];
  for (const requirement of outcome.product.requirements)
    claims.push(
      claim(
        outcome.key,
        `requirement.${requirement.key}`,
        "requirement",
        requirement.required_proof_surfaces,
      ),
    );
  for (const control of outcome.product.controls) {
    const fields: Array<[string, string]> = [
      ["surface", control.surface],
      ["region", control.region],
      ["location", control.location],
      ["control_type", control.control_type],
      ["label_content", control.label_content],
      ["user_task", control.user_task],
      ["visibility", control.visibility],
      ["availability", control.availability],
      ["trigger", control.trigger],
      ["input", control.input],
      ["validation", control.validation],
      ["default_value", control.default_value],
      ["interaction", control.interaction],
      ["navigation_result", control.navigation_result],
      ["loading", control.loading_state],
      ["empty", control.empty_state],
      ["success", control.success_state],
      ["failure", control.failure_state],
      ["recovery", control.recovery],
      ["permission", control.permission],
      ["feedback", control.feedback],
      ["accessibility", control.accessibility],
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

export function generateGlobalClaims(
  global: DeliveryContractV2["global"],
): GlobalClaimV2[] {
  return [
    ...global.product.non_goals.map((item) =>
      globalClaim(`non_goal.${item.key}`, "global_non_goal", "negative"),
    ),
    ...global.technical.constraints.map((item) =>
      globalClaim(`constraint.${item.key}`, "global_constraint", "any"),
    ),
    ...global.technical.forbidden_shortcuts.map((item) =>
      globalClaim(
        `forbidden_shortcut.${item.key}`,
        "global_forbidden_shortcut",
        "negative",
      ),
    ),
  ].sort((left, right) => left.id.localeCompare(right.id));
}

export function validateGlobalProofPolarity(
  claim: GlobalClaimV2,
  proof: ClaimProofV2,
): void {
  if (claim.required_polarity === "negative" && proof.polarity !== "negative")
    fail(
      "global_negative_claim_proof_required",
      `${claim.local_key}:${proof.check_key}`,
    );
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
    (claim.kind === "requirement" || claim.kind === "obligation") &&
    claim.required_proof_surfaces.length > 0 &&
    !claim.required_proof_surfaces.includes(proof.proof_surface)
  )
    fail(
      `${claim.kind}_proof_surface_mismatch`,
      `${outcomeKey}:${claim.local_key}:${proof.proof_surface}`,
    );
}

export function assertAllClaimsCovered(uncovered: string[]): void {
  if (uncovered.length)
    fail("product_claim_uncovered", uncovered.sort().join(","));
}

export function assertAllGlobalClaimsCovered(uncovered: string[]): void {
  if (uncovered.length)
    fail("global_claim_uncovered", uncovered.sort().join(","));
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

function globalClaim(
  localKey: string,
  kind: GlobalClaimV2["kind"],
  requiredPolarity: GlobalClaimV2["required_polarity"],
): GlobalClaimV2 {
  return {
    id: `GLOBAL.${localKey}`,
    local_key: localKey,
    kind,
    required_polarity: requiredPolarity,
  };
}
