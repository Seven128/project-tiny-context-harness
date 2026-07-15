import type {
  DeliveryAssertionV1,
  PopulationRequirementV1,
} from "./long-task-delivery-types.js";
import { canonicalValueJson } from "./strict-codec.js";

export function evaluateDeliveryAssertion(
  assertion: DeliveryAssertionV1,
  observations: Record<string, unknown>,
): boolean {
  const { found, value } = observationValue(
    observations,
    assertion.observation,
  );
  const expected = assertion.expected;
  switch (assertion.operator) {
    case "exists":
      return found;
    case "not_exists":
      return !found;
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
  requirement: PopulationRequirementV1,
  observations: Record<string, unknown>,
): { passed: boolean; actual: unknown } {
  const { value } = observationValue(observations, requirement.observation);
  if (!value || typeof value !== "object" || Array.isArray(value))
    return { passed: false, actual: value };
  const row = value as Record<string, unknown>;
  const eligible = row.eligible;
  const observed = row.observed;
  const excluded = row.excluded ?? 0;
  if (
    ![eligible, observed, excluded].every(
      (item) => Number.isInteger(item) && Number(item) >= 0,
    )
  )
    return { passed: false, actual: value };
  const denominator = Number(eligible) - Number(excluded);
  const percent =
    denominator <= 0 ? 100 : (Number(observed) / denominator) * 100;
  return {
    passed: percent >= requirement.required_coverage_percent,
    actual: { eligible, observed, excluded, coverage_percent: percent },
  };
}

function observationValue(
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
