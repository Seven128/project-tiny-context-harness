import type {
  DeliveryAssertionV2,
  PopulationRequirementV2,
} from "./long-task-delivery-types.js";
import { canonicalValueJson } from "./strict-codec.js";

export function evaluateDeliveryAssertion(
  assertion: DeliveryAssertionV2,
  observations: Record<string, unknown>,
): boolean {
  const { found, value } = observationValue(
    observations,
    assertion.observation,
  );
  if (assertion.operator === "not_exists") return !found;
  if (!found) return false;
  if (assertion.operator === "exists") return true;
  const expected = assertion.expected;
  switch (assertion.operator) {
    case "truthy":
      return Boolean(value);
    case "falsy":
      return !value;
    case "equals":
      return canonicalValueJson(value) === canonicalValueJson(expected);
    case "not_equals":
      return canonicalValueJson(value) !== canonicalValueJson(expected);
    case "contains":
      return contains(value, expected);
    case "not_contains":
      return !contains(value, expected);
    case "matches":
      return (
        typeof value === "string" &&
        typeof expected === "string" &&
        new RegExp(expected, "u").test(value)
      );
    case "not_matches":
      return (
        typeof value === "string" &&
        typeof expected === "string" &&
        !new RegExp(expected, "u").test(value)
      );
    case "greater_than":
      return numbers(value, expected, (a, b) => a > b);
    case "greater_or_equal":
      return numbers(value, expected, (a, b) => a >= b);
    case "less_than":
      return numbers(value, expected, (a, b) => a < b);
    case "less_or_equal":
      return numbers(value, expected, (a, b) => a <= b);
    case "set_equals":
      return sets(
        value,
        expected,
        (a, b) => a.size === b.size && [...a].every((item) => b.has(item)),
      );
    case "subset_of":
      return sets(value, expected, (a, b) =>
        [...a].every((item) => b.has(item)),
      );
    case "superset_of":
      return sets(value, expected, (a, b) =>
        [...b].every((item) => a.has(item)),
      );
  }
}

export function evaluatePopulation(
  requirement: PopulationRequirementV2,
  observations: Record<string, unknown>,
): { passed: boolean; actual: unknown; reason: string | null } {
  const eligible = observationValue(
    observations,
    requirement.observations.eligible_ids,
  ).value;
  const observed = observationValue(
    observations,
    requirement.observations.observed_ids,
  ).value;
  const excluded = observationValue(
    observations,
    requirement.observations.excluded_items,
  ).value;
  const actual = {
    eligible_ids: eligible,
    observed_ids: observed,
    excluded_items: excluded,
  };
  if (!validIds(eligible)) return failure(actual, "eligible_ids_invalid");
  if (!validIds(observed)) return failure(actual, "observed_ids_invalid");
  if (!Array.isArray(excluded))
    return failure(actual, "excluded_items_invalid");
  const eligibleSet = new Set(eligible);
  const observedSet = new Set(observed);
  const excludedIds: string[] = [];
  const rules = new Set(requirement.exclusion_rules.map((item) => item.key));
  for (const item of excluded) {
    if (
      !item ||
      typeof item !== "object" ||
      Array.isArray(item) ||
      typeof (item as Record<string, unknown>).id !== "string" ||
      !(item as Record<string, unknown>).id ||
      typeof (item as Record<string, unknown>).rule !== "string"
    )
      return failure(actual, "excluded_item_invalid");
    const id = (item as { id: string }).id;
    const rule = (item as { rule: string }).rule;
    if (!rules.has(rule))
      return failure(actual, `exclusion_rule_unknown:${rule}`);
    excludedIds.push(id);
  }
  if (new Set(excludedIds).size !== excludedIds.length)
    return failure(actual, "excluded_ids_duplicate");
  const excludedSet = new Set(excludedIds);
  if (![...observedSet].every((id) => eligibleSet.has(id)))
    return failure(actual, "observed_not_eligible_subset");
  if (![...excludedSet].every((id) => eligibleSet.has(id)))
    return failure(actual, "excluded_not_eligible_subset");
  if ([...observedSet].some((id) => excludedSet.has(id)))
    return failure(actual, "observed_excluded_overlap");
  const covered = new Set([...observedSet, ...excludedSet]);
  if (
    covered.size !== eligibleSet.size ||
    [...eligibleSet].some((id) => !covered.has(id))
  )
    return failure(actual, "eligible_population_incomplete");
  return {
    passed: true,
    actual: { ...actual, coverage_percent: 100 },
    reason: null,
  };
}

export function observationValue(
  observations: Record<string, unknown>,
  name: string,
): { found: boolean; value: unknown } {
  if (Object.hasOwn(observations, name))
    return { found: true, value: observations[name] };
  let current: unknown = observations;
  for (const part of name.split(".")) {
    if (
      !current ||
      typeof current !== "object" ||
      Array.isArray(current) ||
      !Object.hasOwn(current, part)
    )
      return { found: false, value: undefined };
    current = (current as Record<string, unknown>)[part];
  }
  return { found: true, value: current };
}

function validIds(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === "string" && item.length > 0) &&
    new Set(value).size === value.length
  );
}

function failure(actual: unknown, reason: string) {
  return { passed: false, actual, reason };
}

function contains(value: unknown, expected: unknown): boolean {
  if (typeof value === "string" && typeof expected === "string")
    return value.includes(expected);
  if (Array.isArray(value))
    return value.some(
      (item) => canonicalValueJson(item) === canonicalValueJson(expected),
    );
  return false;
}

function numbers(
  left: unknown,
  right: unknown,
  compare: (left: number, right: number) => boolean,
): boolean {
  return (
    typeof left === "number" &&
    typeof right === "number" &&
    compare(left, right)
  );
}

function sets(
  left: unknown,
  right: unknown,
  compare: (left: Set<string>, right: Set<string>) => boolean,
): boolean {
  if (!Array.isArray(left) || !Array.isArray(right)) return false;
  return compare(
    new Set(left.map(canonicalValueJson)),
    new Set(right.map(canonicalValueJson)),
  );
}
