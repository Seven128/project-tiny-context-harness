import type {
  AuthorityHashesV2,
  CompiledDeliveryContractV2,
  DeliveryContractV2,
  DeliveryOutcomeV2,
} from "./long-task-delivery-types.js";
import {
  type AuthorityFieldPolicy,
  CHECK_AUTHORITY_POLICY,
  projectFieldsByPolicy,
} from "./long-task-authority-policy.js";
import { evidenceAdapterForRunner } from "./long-task-evidence-adapter-policy.js";
import { canonicalValueJson, sha256Hex } from "./strict-codec.js";

const ACCEPTANCE_CHECK_POLICIES = new Set<AuthorityFieldPolicy>([
  "identity",
  "semantic_user_review",
  "proof_additive",
  "output_requirement",
]);
const TECHNICAL_CHECK_POLICIES = new Set<AuthorityFieldPolicy>([
  "identity",
  "runner_authority",
  "input_coverage",
]);

export function computeAuthorityHashes(
  contract: DeliveryContractV2,
): AuthorityHashesV2 {
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

export function outcomeAuthorityHash(outcome: DeliveryOutcomeV2): string {
  return hash({
    product: outcome.product,
    acceptance: {
      checks: outcome.acceptance.checks.map(acceptanceCheck),
      population: outcome.acceptance.population,
      counterfactual_controls: outcome.acceptance.counterfactual_controls,
    },
  });
}

export function changedAuthoritySections(
  previous: AuthorityHashesV2,
  next: AuthorityHashesV2,
): string[] {
  return (Object.keys(previous) as (keyof AuthorityHashesV2)[])
    .filter((key) => previous[key] !== next[key])
    .map((key) => key.replace(/_authority_hash$/u, ""));
}

export function protectedAuthorityChanged(
  previous: CompiledDeliveryContractV2,
  next: AuthorityHashesV2,
): string[] {
  return changedAuthoritySections(previous.authority_hashes, next).filter(
    (section) => section !== "technical",
  );
}

export function acceptanceSemanticsChanged(
  previous: CompiledDeliveryContractV2,
  next: DeliveryContractV2,
): boolean {
  return !same(acceptanceSemantics(previous), acceptanceSemantics(next));
}

export function isMonotonicAcceptanceStrengthening(
  previous: CompiledDeliveryContractV2,
  next: DeliveryContractV2,
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
  check: DeliveryContractV2["global"]["acceptance"]["checks"][number],
): unknown {
  return {
    ...projectFieldsByPolicy(
      check,
      CHECK_AUTHORITY_POLICY,
      ACCEPTANCE_CHECK_POLICIES,
    ),
    evidence_adapter: evidenceAdapterForRunner(check.runner.type),
  };
}

function technicalCheck(
  check: DeliveryContractV2["global"]["acceptance"]["checks"][number],
): unknown {
  return projectFieldsByPolicy(
    check,
    CHECK_AUTHORITY_POLICY,
    TECHNICAL_CHECK_POLICIES,
  );
}

function acceptanceSemantics(
  contract: Pick<DeliveryContractV2, "outcomes" | "global">,
): unknown {
  return {
    external_confirmations: contract.global.acceptance.external_confirmations,
    global_checks: contract.global.acceptance.checks.map(acceptanceCheck),
    outcomes: contract.outcomes.map((outcome) => ({
      key: outcome.key,
      checks: outcome.acceptance.checks.map(acceptanceCheck),
      population: outcome.acceptance.population,
      counterfactual_controls: outcome.acceptance.counterfactual_controls,
    })),
  };
}

function checksStrengthened(
  previous: DeliveryContractV2["global"]["acceptance"]["checks"],
  next: DeliveryContractV2["global"]["acceptance"]["checks"],
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
