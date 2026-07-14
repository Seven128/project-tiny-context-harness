import { RE2JS } from "re2js";
import { canonicalValueJson } from "./composite-campaign-codec.js";
import type {
  NegativeAssertionV3,
  PositiveAssertionV3,
} from "./long-task-contract-schema.js";
import type { ObservationV2Record } from "./long-task-observation-v2.js";

export interface OperatorEvaluation {
  passed: boolean;
  code?: "assertion_failed" | "assertion_type_mismatch" | "unsafe_regex";
  actual: unknown;
  expected: unknown;
}

export function evaluateAssertion(
  assertion: PositiveAssertionV3 | NegativeAssertionV3,
  observation: ObservationV2Record | undefined,
): OperatorEvaluation {
  const present = observation !== undefined;
  const actual = observation?.actual;
  const expected = assertion.expected;
  if (assertion.operator === "exists" || assertion.operator === "not_exists")
    return result(
      assertion.operator === "exists" ? present : !present,
      actual,
      expected,
    );
  if (!observation)
    return result(false, undefined, expected, "assertion_failed");
  if (observation.kind !== assertion.observation_kind)
    return result(false, actual, expected, "assertion_type_mismatch");
  try {
    switch (assertion.operator) {
      case "equals":
      case "not_equals": {
        if (jsonType(actual) !== jsonType(expected))
          return result(false, actual, expected, "assertion_type_mismatch");
        const equal =
          canonicalValueJson(actual) === canonicalValueJson(expected);
        return result(
          assertion.operator === "equals" ? equal : !equal,
          actual,
          expected,
        );
      }
      case "contains":
      case "not_contains": {
        const contained = contains(actual, expected);
        if (contained === undefined)
          return result(false, actual, expected, "assertion_type_mismatch");
        return result(
          assertion.operator === "contains" ? contained : !contained,
          actual,
          expected,
        );
      }
      case "matches":
      case "not_matches": {
        if (typeof actual !== "string" || !isRegexExpected(expected))
          return result(false, actual, expected, "assertion_type_mismatch");
        let matched: boolean;
        try {
          matched = RE2JS.compile(expected.pattern, flags(expected.flags)).test(
            actual,
          );
        } catch {
          return result(false, actual, expected, "unsafe_regex");
        }
        return result(
          assertion.operator === "matches" ? matched : !matched,
          actual,
          expected,
        );
      }
      case "greater_than":
      case "greater_or_equal":
      case "less_than":
      case "less_or_equal": {
        if (!finite(actual) || !finite(expected))
          return result(false, actual, expected, "assertion_type_mismatch");
        const passed =
          assertion.operator === "greater_than"
            ? actual > expected
            : assertion.operator === "greater_or_equal"
              ? actual >= expected
              : assertion.operator === "less_than"
                ? actual < expected
                : actual <= expected;
        return result(passed, actual, expected);
      }
      case "truthy":
      case "falsy": {
        if (typeof actual !== "boolean")
          return result(false, actual, expected, "assertion_type_mismatch");
        return result(
          assertion.operator === "truthy" ? actual : !actual,
          actual,
          expected,
        );
      }
      case "set_equals":
      case "subset_of":
      case "superset_of": {
        const left = scalarSet(actual);
        const right = scalarSet(expected);
        if (!left || !right)
          return result(false, actual, expected, "assertion_type_mismatch");
        const subset = [...left].every((item) => right.has(item));
        const superset = [...right].every((item) => left.has(item));
        return result(
          assertion.operator === "set_equals"
            ? subset && superset
            : assertion.operator === "subset_of"
              ? subset
              : superset,
          actual,
          expected,
        );
      }
    }
  } catch {
    return result(false, actual, expected, "assertion_type_mismatch");
  }
}
function result(
  passed: boolean,
  actual: unknown,
  expected: unknown,
  code?: OperatorEvaluation["code"],
): OperatorEvaluation {
  return {
    passed,
    actual,
    expected,
    ...(!passed ? { code: code ?? "assertion_failed" } : {}),
  };
}
function contains(actual: unknown, expected: unknown): boolean | undefined {
  if (typeof actual === "string")
    return typeof expected === "string" ? actual.includes(expected) : undefined;
  if (Array.isArray(actual))
    return actual.some(
      (item) => canonicalValueJson(item) === canonicalValueJson(expected),
    );
  return undefined;
}
function jsonType(value: unknown): string {
  return value === null
    ? "null"
    : Array.isArray(value)
      ? "array"
      : typeof value;
}
function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
function scalarSet(value: unknown): Set<string> | undefined {
  if (!Array.isArray(value)) return;
  const encoded: string[] = [];
  for (const item of value) {
    if (
      (item !== null &&
        !["string", "number", "boolean"].includes(typeof item)) ||
      (typeof item === "number" && !Number.isFinite(item))
    )
      return;
    encoded.push(canonicalValueJson(item));
  }
  if (new Set(encoded).size !== encoded.length) return;
  return new Set(encoded);
}
function isRegexExpected(
  value: unknown,
): value is { pattern: string; flags: string } {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).sort().join(",") === "flags,pattern" &&
    typeof (value as { pattern?: unknown }).pattern === "string" &&
    Buffer.byteLength((value as { pattern: string }).pattern, "utf8") <= 4096 &&
    typeof (value as { flags?: unknown }).flags === "string" &&
    ["", "i", "m", "s", "im", "is", "ms", "ims"].includes(
      (value as { flags: string }).flags,
    )
  );
}
function flags(value: string): number {
  let result = 0;
  if (value.includes("i")) result |= RE2JS.CASE_INSENSITIVE;
  if (value.includes("m")) result |= RE2JS.MULTILINE;
  if (value.includes("s")) result |= RE2JS.DOTALL;
  return result;
}
