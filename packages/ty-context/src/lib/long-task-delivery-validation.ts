import type { DeliveryContractV2 } from "./long-task-delivery-types.js";
import { compileProductClaimCoverage } from "./long-task-claims.js";
import { fail } from "./long-task-delivery-shape.js";

export function validateDeliveryContractStructure(
  contract: DeliveryContractV2,
): void {
  validateUniqueKeys(contract);
  validateDependencies(contract);
  validateOwnerAndBindings(contract);
  const claims = compileProductClaimCoverage(contract);
  validateSourceClaims(contract, claims);
}

function validateUniqueKeys(contract: DeliveryContractV2): void {
  unique(
    contract.outcomes.map((outcome) => outcome.key),
    "outcome_key_duplicate",
  );
  unique(
    contract.global.acceptance.checks.map((check) => check.key),
    "global_check_key_duplicate",
  );
  unique(
    contract.source_claims.map((claim) => claim.key),
    "source_claim_key_duplicate",
  );
  unique(
    contract.global.acceptance.external_confirmations.map((item) => item.key),
    "external_confirmation_key_duplicate",
  );
  unique(
    [
      ...contract.global.product.non_goals,
      ...contract.global.technical.constraints,
      ...contract.global.technical.forbidden_paths,
      ...contract.global.technical.forbidden_shortcuts,
    ].map((item) => item.key),
    "global_constraint_key_duplicate",
  );
  for (const outcome of contract.outcomes) {
    unique(
      outcome.acceptance.checks.map((check) => check.key),
      `check_key_duplicate:${outcome.key}`,
    );
    unique(
      outcome.product.controls.map((control) => control.key),
      `control_key_duplicate:${outcome.key}`,
    );
    unique(
      outcome.product.non_completing_outcomes.map((item) => item.key),
      `non_completing_key_duplicate:${outcome.key}`,
    );
    unique(
      outcome.technical.obligations.map((item) => item.key),
      `obligation_key_duplicate:${outcome.key}`,
    );
    unique(
      outcome.technical.forbidden_shortcuts.map((item) => item.key),
      `forbidden_shortcut_key_duplicate:${outcome.key}`,
    );
    unique(
      outcome.technical.bindings.map((item) => item.key),
      `binding_key_duplicate:${outcome.key}`,
    );
    unique(
      outcome.acceptance.counterfactual_controls.map((item) => item.key),
      `counterfactual_key_duplicate:${outcome.key}`,
    );
    for (const check of outcome.acceptance.checks) {
      unique(
        check.environment_requirements.map((item) => item.key),
        `environment_requirement_key_duplicate:${outcome.key}:${check.key}`,
      );
      unique(
        [...check.positive_assertions, ...check.negative_assertions].map(
          (assertion) => assertion.key,
        ),
        `assertion_key_duplicate:${outcome.key}:${check.key}`,
      );
    }
  }
}

function validateSourceClaims(
  contract: DeliveryContractV2,
  compiledClaims: ReturnType<typeof compileProductClaimCoverage>,
): void {
  const sources = new Set(contract.task.source_paths);
  const productClaims = new Set(
    Object.values(compiledClaims.by_outcome)
      .flat()
      .map((claim) => claim.id),
  );
  const globals = new Set<string>([
    ...contract.global.product.non_goals.map((item) => `non_goal.${item.key}`),
    ...contract.global.technical.constraints.map(
      (item) => `constraint.${item.key}`,
    ),
    ...contract.global.technical.forbidden_paths.map(
      (item) => `forbidden_path.${item.key}`,
    ),
    ...contract.global.technical.forbidden_shortcuts.map(
      (item) => `forbidden_shortcut.${item.key}`,
    ),
  ]);
  for (const claim of contract.source_claims) {
    if (
      sources.size &&
      ![...sources].some(
        (source) =>
          claim.source_ref === source ||
          claim.source_ref.startsWith(`${source}#`),
      )
    )
      fail("source_claim_ref_unknown", `${claim.key}:${claim.source_ref}`);
    if (
      (claim.disposition.type === "claim" ||
        claim.disposition.type === "global_constraint") &&
      !claim.disposition.refs.length
    )
      fail("source_claim_disposition_refs_empty", claim.key);
    if (claim.disposition.type === "claim")
      for (const reference of claim.disposition.refs)
        if (!productClaims.has(reference))
          fail("source_claim_product_ref_unknown", `${claim.key}:${reference}`);
    if (claim.disposition.type === "global_constraint")
      for (const reference of claim.disposition.refs)
        if (!globals.has(reference))
          fail("source_claim_global_ref_unknown", `${claim.key}:${reference}`);
  }
}

function validateOwnerAndBindings(contract: DeliveryContractV2): void {
  const contextRefs = new Set(contract.task.context_refs);
  for (const outcome of contract.outcomes) {
    for (const reference of outcome.product.owner.context_refs)
      if (!contextRefs.has(reference))
        fail("owner_context_ref_unknown", `${outcome.key}:${reference}`);
    if (!outcome.product.owner.path_globs.length)
      fail("owner_path_globs_empty", outcome.key);
    for (const candidate of [
      ...outcome.technical.expected_change_paths,
      ...outcome.technical.allowed_support_paths,
    ])
      if (
        !outcome.product.owner.path_globs.some((owner) =>
          patternWithin(candidate, owner),
        )
      )
        fail("path_outside_owner_boundary", `${outcome.key}:${candidate}`);
    const checks = new Map(
      outcome.acceptance.checks.map((check) => [check.key, check]),
    );
    for (const binding of outcome.technical.bindings) {
      for (const carrier of binding.carrier_paths)
        if (
          !outcome.product.owner.path_globs.some((owner) =>
            patternWithin(carrier, owner),
          )
        )
          fail(
            "binding_carrier_outside_owner_boundary",
            `${outcome.key}:${binding.key}:${carrier}`,
          );
      if (binding.kind === "verified") {
        const check = checks.get(binding.verification_check_key ?? "");
        if (!check)
          fail(
            "verified_binding_check_unknown",
            `${outcome.key}:${binding.key}`,
          );
        const obligationClaim = `obligation.${binding.key}`;
        const covered = [
          ...check.positive_assertions,
          ...check.negative_assertions,
        ].some((assertion) => assertion.claims.includes(obligationClaim));
        if (!covered)
          fail(
            "verified_binding_obligation_uncovered",
            `${outcome.key}:${binding.key}`,
          );
      }
    }
  }
}

function patternWithin(candidate: string, owner: string): boolean {
  const prefix = (value: string): string =>
    value
      .replace(/\\/gu, "/")
      .split(/[?*{[]/u, 1)[0]
      .replace(/\/$/u, "");
  const child = prefix(candidate);
  const parent = prefix(owner);
  return Boolean(
    child &&
    parent &&
    (child === parent || child.startsWith(`${parent}/`) || owner === "**"),
  );
}

function unique(values: string[], code: string): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) fail(code, value);
    seen.add(value);
  }
}

function validateDependencies(contract: DeliveryContractV2): void {
  const outcomes = new Map(
    contract.outcomes.map((outcome) => [outcome.key, outcome]),
  );
  for (const outcome of contract.outcomes)
    for (const dependency of outcome.depends_on) {
      if (dependency === outcome.key)
        fail("outcome_dependency_self", outcome.key);
      if (!outcomes.has(dependency))
        fail("outcome_dependency_unknown", `${outcome.key}:${dependency}`);
    }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (value: string): void => {
    if (visiting.has(value)) fail("outcome_dependency_cycle", value);
    if (visited.has(value)) return;
    visiting.add(value);
    for (const dependency of outcomes.get(value)!.depends_on) visit(dependency);
    visiting.delete(value);
    visited.add(value);
  };
  for (const outcome of outcomes.keys()) visit(outcome);
}
