import type {
  CompiledDeliveryContractV2,
  DeliveryAssertionV2,
  DeliveryCheckV2,
  DeliveryContractV2,
} from "./long-task-delivery-types.js";

export type AcceptanceReference =
  | {
      scope: "global";
      check_key: string;
      assertion_key: string;
    }
  | {
      scope: "outcome";
      outcome_key: string;
      check_key: string;
      assertion_key: string;
    };

export interface ResolvedAcceptanceAssertion {
  ref: string;
  scope: AcceptanceReference["scope"];
  outcome_key: string | null;
  check_key: string;
  assertion_key: string;
  check: DeliveryCheckV2;
  assertion: DeliveryAssertionV2;
}

interface AcceptanceContractLike {
  global: { acceptance: { checks: DeliveryCheckV2[] } };
  outcomes: Array<{
    key: string;
    acceptance: { checks: DeliveryCheckV2[] };
  }>;
}

export function parseAcceptanceReference(ref: string): AcceptanceReference {
  const parts = ref.split(".");
  if (parts.length !== 3 || parts.some((part) => !part))
    throw new Error(`acceptance_reference_invalid:${ref}`);
  const [owner, checkKey, assertionKey] = parts;
  return owner === "GLOBAL"
    ? {
        scope: "global",
        check_key: checkKey,
        assertion_key: assertionKey,
      }
    : {
        scope: "outcome",
        outcome_key: owner,
        check_key: checkKey,
        assertion_key: assertionKey,
      };
}

export function resolveAcceptanceAssertion(
  contract: DeliveryContractV2 | CompiledDeliveryContractV2,
  ref: string,
): ResolvedAcceptanceAssertion | null {
  let reference: AcceptanceReference;
  try {
    reference = parseAcceptanceReference(ref);
  } catch {
    return null;
  }
  const contractLike = contract as unknown as AcceptanceContractLike;
  const checks =
    reference.scope === "global"
      ? contractLike.global.acceptance.checks
      : contractLike.outcomes.find(
          (outcome) => outcome.key === reference.outcome_key,
        )?.acceptance.checks;
  const check = checks?.find((item) => item.key === reference.check_key);
  const assertion = check
    ? [...check.positive_assertions, ...check.negative_assertions].find(
        (item) => item.key === reference.assertion_key,
      )
    : null;
  if (!check || !assertion) return null;
  return {
    ref,
    scope: reference.scope,
    outcome_key: reference.scope === "outcome" ? reference.outcome_key : null,
    check_key: reference.check_key,
    assertion_key: reference.assertion_key,
    check,
    assertion,
  };
}
