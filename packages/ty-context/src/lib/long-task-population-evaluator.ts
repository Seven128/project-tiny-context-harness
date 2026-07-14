import type { PopulationEnumeratorV3 } from "./long-task-contract-schema.js";
import type { ObservationV2Record } from "./long-task-observation-v2.js";

interface PopulationActual {
  enumerated_ids: string[];
  validated_ids: string[];
  exclusions: Array<{ id: string; rule_id: string }>;
}
export interface PopulationEvaluationV3 {
  status: "passed" | "failed";
  enumerated_ids: string[];
  validated_ids: string[];
  valid_exclusions: Array<{ id: string; rule_id: string }>;
  effective_population_ids: string[];
  missing_ids: string[];
  unknown_validated_ids: string[];
  unknown_exclusion_ids: string[];
  coverage_percent: number;
  finding_codes: string[];
}

export function evaluatePopulation(
  rule: PopulationEnumeratorV3,
  observation: ObservationV2Record | undefined,
): PopulationEvaluationV3 {
  const findings: string[] = [];
  if (
    !observation ||
    observation.kind !== "population_coverage" ||
    !validActual(observation.actual)
  )
    return failed(["observation_kind_mismatch"]);
  const actual = observation.actual;
  const enumerated = [...actual.enumerated_ids];
  const validated = [...actual.validated_ids];
  const exclusions = [...actual.exclusions];
  if (enumerated.length === 0) findings.push("population_empty");
  if (
    duplicates(enumerated) ||
    duplicates(validated) ||
    duplicates(exclusions.map((item) => item.id))
  )
    findings.push("population_duplicate_ids");
  const universe = new Set(enumerated);
  const validatedSet = new Set(validated);
  const unknownValidated = unique(validated.filter((id) => !universe.has(id)));
  if (unknownValidated.length) findings.push("population_unknown_validated");
  const allowedRules = new Set(rule.exclusion_rule_ids);
  const unknownExclusions = unique(
    exclusions.filter((item) => !universe.has(item.id)).map((item) => item.id),
  );
  if (unknownExclusions.length) findings.push("population_unknown_exclusion");
  const validExclusions = exclusions.filter(
    (item) =>
      universe.has(item.id) &&
      allowedRules.has(item.rule_id) &&
      !validatedSet.has(item.id),
  );
  if (validExclusions.length !== exclusions.length)
    findings.push("population_invalid_exclusion");
  const excluded = new Set(validExclusions.map((item) => item.id));
  const effective = unique(enumerated.filter((id) => !excluded.has(id)));
  if (effective.length === 0) findings.push("population_empty");
  const missing = effective.filter((id) => !validatedSet.has(id));
  if (missing.length) findings.push("population_missing_objects");
  const validCount = effective.filter((id) => validatedSet.has(id)).length;
  const coverage =
    effective.length === 0 ? 0 : (validCount / effective.length) * 100;
  if (
    coverage !== rule.required_coverage_percent ||
    missing.length ||
    unknownValidated.length ||
    unknownExclusions.length
  )
    findings.push("population_not_full");
  const codes = unique(findings);
  return {
    status: codes.length ? "failed" : "passed",
    enumerated_ids: unique(enumerated),
    validated_ids: unique(validated),
    valid_exclusions: validExclusions.sort((a, b) => a.id.localeCompare(b.id)),
    effective_population_ids: effective,
    missing_ids: missing,
    unknown_validated_ids: unknownValidated,
    unknown_exclusion_ids: unknownExclusions,
    coverage_percent: coverage,
    finding_codes: codes,
  };
}
function validActual(value: unknown): value is PopulationActual {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return (
    Array.isArray(row.enumerated_ids) &&
    row.enumerated_ids.every((item) => typeof item === "string") &&
    Array.isArray(row.validated_ids) &&
    row.validated_ids.every((item) => typeof item === "string") &&
    Array.isArray(row.exclusions) &&
    row.exclusions.every(
      (item) =>
        !!item &&
        typeof item === "object" &&
        !Array.isArray(item) &&
        typeof (item as { id?: unknown }).id === "string" &&
        typeof (item as { rule_id?: unknown }).rule_id === "string",
    )
  );
}
function duplicates(values: string[]): boolean {
  return new Set(values).size !== values.length;
}
function unique(values: string[]): string[] {
  return [...new Set(values)].sort();
}
function failed(codes: string[]): PopulationEvaluationV3 {
  return {
    status: "failed",
    enumerated_ids: [],
    validated_ids: [],
    valid_exclusions: [],
    effective_population_ids: [],
    missing_ids: [],
    unknown_validated_ids: [],
    unknown_exclusion_ids: [],
    coverage_percent: 0,
    finding_codes: codes,
  };
}
