import type { DeliveryContractV2 } from "./long-task-delivery-types.js";
import {
  assertCompiledClaimsCovered,
  compileProductClaimCoverage,
} from "./long-task-claims.js";
import { fail } from "./long-task-delivery-shape.js";
import { proveRepositoryPatternSubset } from "./long-task-paths.js";
import { validateSourceClaimMappings } from "./long-task-source-claim-validation.js";

export function validateDeliveryContractStructure(
  contract: DeliveryContractV2,
): void {
  validateUniqueKeys(contract);
  validateDependencies(contract);
  validateOwnerAndBindings(contract);
  const claims = compileProductClaimCoverage(contract, {
    allow_uncovered: true,
  });
  validateSourceClaimMappings(contract, claims);
  assertCompiledClaimsCovered(claims);
}

export function deliveryContractStructureDiagnostics(
  contract: DeliveryContractV2,
): string[] {
  const diagnostics: string[] = [];
  capture(diagnostics, () => validateUniqueKeys(contract));
  capture(diagnostics, () => validateDependencies(contract));
  capture(diagnostics, () => validateOwnerAndBindings(contract));
  let claims: ReturnType<typeof compileProductClaimCoverage> | null = null;
  capture(diagnostics, () => {
    claims = compileProductClaimCoverage(contract, { allow_uncovered: true });
  });
  if (claims) {
    capture(diagnostics, () => validateSourceClaimMappings(contract, claims!));
    capture(diagnostics, () => assertCompiledClaimsCovered(claims!));
  }
  return [...new Set(diagnostics)];
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
      outcome.product.requirements.map((item) => item.key),
      `requirement_key_duplicate:${outcome.key}`,
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
      unique(
        [...check.positive_assertions, ...check.negative_assertions].map(
          (assertion) => assertion.observation,
        ),
        `assertion_observation_duplicate:${outcome.key}:${check.key}`,
      );
    }
  }
  for (const check of contract.global.acceptance.checks)
    unique(
      [...check.positive_assertions, ...check.negative_assertions].map(
        (assertion) => assertion.observation,
      ),
      `assertion_observation_duplicate:GLOBAL:${check.key}`,
    );
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
          isProvenSubset(candidate, owner),
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
            isProvenSubset(carrier, owner),
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

function isProvenSubset(candidate: string, owner: string): boolean {
  return (
    proveRepositoryPatternSubset(candidate, owner).status === "proven_subset"
  );
}

function unique(values: string[], code: string): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) fail(code, value);
    seen.add(value);
  }
}

function capture(diagnostics: string[], action: () => void): void {
  try {
    action();
  } catch (error) {
    diagnostics.push(error instanceof Error ? error.message : String(error));
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
