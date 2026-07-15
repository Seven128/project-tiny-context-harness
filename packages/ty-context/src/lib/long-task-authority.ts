import type {
  AuthorityHashesV1,
  CompiledDeliveryContractV1,
  DeliveryContractV1,
  DeliveryOutcomeV1,
} from "./long-task-delivery-types.js";
import { canonicalValueJson, sha256Hex } from "./strict-codec.js";

export function computeAuthorityHashes(
  contract: DeliveryContractV1,
): AuthorityHashesV1 {
  return {
    source_authority_hash: hash({
      source_paths: contract.task.source_paths,
      source_claims: contract.source_claims,
    }),
    product_authority_hash: hash({
      goal: contract.task.goal,
      global: contract.global.product,
      outcomes: contract.outcomes.map((outcome) => ({
        key: outcome.key,
        product: outcome.product,
      })),
    }),
    acceptance_authority_hash: hash({
      external_confirmations: contract.global.acceptance.external_confirmations,
      global_checks: contract.global.acceptance.checks.map(acceptanceCheck),
      outcomes: contract.outcomes.map((outcome) => ({
        key: outcome.key,
        validates: outcome.acceptance.validates,
        does_not_validate: outcome.acceptance.does_not_validate,
        checks: outcome.acceptance.checks.map(acceptanceCheck),
        population: outcome.acceptance.population,
        counterfactual_controls: outcome.acceptance.counterfactual_controls,
      })),
    }),
    risk_authority_hash: hash(contract.risk),
    technical_authority_hash: hash({
      global: contract.global.technical,
      outcomes: contract.outcomes.map((outcome) => ({
        key: outcome.key,
        technical: outcome.technical,
        checks: [...outcome.acceptance.checks.map(technicalCheck)],
      })),
      global_checks: contract.global.acceptance.checks.map(technicalCheck),
    }),
  };
}

export function outcomeAuthorityHash(outcome: DeliveryOutcomeV1): string {
  return hash({
    product: outcome.product,
    acceptance: {
      validates: outcome.acceptance.validates,
      does_not_validate: outcome.acceptance.does_not_validate,
      checks: outcome.acceptance.checks.map(acceptanceCheck),
      population: outcome.acceptance.population,
      counterfactual_controls: outcome.acceptance.counterfactual_controls,
    },
  });
}

export function changedAuthoritySections(
  previous: AuthorityHashesV1,
  next: AuthorityHashesV1,
): string[] {
  return (Object.keys(previous) as (keyof AuthorityHashesV1)[])
    .filter((key) => previous[key] !== next[key])
    .map((key) => key.replace(/_authority_hash$/u, ""));
}

export function protectedAuthorityChanged(
  previous: CompiledDeliveryContractV1,
  next: AuthorityHashesV1,
): string[] {
  return changedAuthoritySections(previous.authority_hashes, next).filter(
    (section) => section !== "technical",
  );
}

export function acceptanceSemanticsChanged(
  previous: CompiledDeliveryContractV1,
  next: DeliveryContractV1,
): boolean {
  return !same(acceptanceSemantics(previous), acceptanceSemantics(next));
}

export function isMonotonicAcceptanceStrengthening(
  previous: CompiledDeliveryContractV1,
  next: DeliveryContractV1,
): boolean {
  if (!acceptanceSemanticsChanged(previous, next)) return false;
  if (
    !subset(
      previous.global.acceptance.external_confirmations,
      next.global.acceptance.external_confirmations,
    ) ||
    !checksStrengthened(
      previous.global.acceptance.checks,
      next.global.acceptance.checks,
    )
  )
    return false;
  const nextOutcomes = new Map(
    next.outcomes.map((outcome) => [outcome.key, outcome]),
  );
  if (nextOutcomes.size !== previous.outcomes.length) return false;
  for (const previousOutcome of previous.outcomes) {
    const nextOutcome = nextOutcomes.get(previousOutcome.key);
    if (!nextOutcome) return false;
    if (
      !subset(
        previousOutcome.acceptance.validates,
        nextOutcome.acceptance.validates,
      ) ||
      !subset(
        previousOutcome.acceptance.does_not_validate,
        nextOutcome.acceptance.does_not_validate,
      ) ||
      !checksStrengthened(
        previousOutcome.acceptance.checks,
        nextOutcome.acceptance.checks,
      ) ||
      !optionalStrengthened(
        previousOutcome.acceptance.population,
        nextOutcome.acceptance.population,
      ) ||
      !subset(
        previousOutcome.acceptance.counterfactual_controls,
        nextOutcome.acceptance.counterfactual_controls,
      )
    )
      return false;
  }
  return true;
}

function acceptanceCheck(
  check: DeliveryContractV1["global"]["acceptance"]["checks"][number],
): unknown {
  return {
    key: check.key,
    proof_surface: check.proof_surface,
    positive_assertions: check.positive_assertions,
    negative_assertions: check.negative_assertions,
  };
}

function technicalCheck(
  check: DeliveryContractV1["global"]["acceptance"]["checks"][number],
): unknown {
  return {
    key: check.key,
    runner: check.runner,
    verification_sources: check.verification_sources,
    input_paths: check.input_paths,
    expected_output_paths: check.expected_output_paths,
    artifact_globs: check.artifact_globs,
    environment_requirements: check.environment_requirements,
  };
}

function acceptanceSemantics(
  contract: Pick<DeliveryContractV1, "outcomes" | "global">,
): unknown {
  return {
    external_confirmations: contract.global.acceptance.external_confirmations,
    global_checks: contract.global.acceptance.checks.map(acceptanceCheck),
    outcomes: contract.outcomes.map((outcome) => ({
      key: outcome.key,
      validates: outcome.acceptance.validates,
      does_not_validate: outcome.acceptance.does_not_validate,
      checks: outcome.acceptance.checks.map(acceptanceCheck),
      population: outcome.acceptance.population,
      counterfactual_controls: outcome.acceptance.counterfactual_controls,
    })),
  };
}

function checksStrengthened(
  previous: DeliveryContractV1["global"]["acceptance"]["checks"],
  next: DeliveryContractV1["global"]["acceptance"]["checks"],
): boolean {
  const nextChecks = new Map(next.map((check) => [check.key, check]));
  for (const previousCheck of previous) {
    const nextCheck = nextChecks.get(previousCheck.key);
    if (
      !nextCheck ||
      previousCheck.proof_surface !== nextCheck.proof_surface ||
      !subset(
        previousCheck.positive_assertions,
        nextCheck.positive_assertions,
      ) ||
      !subset(previousCheck.negative_assertions, nextCheck.negative_assertions)
    )
      return false;
  }
  return true;
}

function subset(previous: unknown[], next: unknown[]): boolean {
  const available = new Set(next.map((item) => canonicalValueJson(item)));
  return previous.every((item) => available.has(canonicalValueJson(item)));
}

function optionalStrengthened(previous: unknown, next: unknown): boolean {
  return previous === null || previous === undefined
    ? true
    : same(previous, next);
}

function same(left: unknown, right: unknown): boolean {
  return canonicalValueJson(left) === canonicalValueJson(right);
}

function hash(value: unknown): string {
  return sha256Hex(canonicalValueJson(value));
}
