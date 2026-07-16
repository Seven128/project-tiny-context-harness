import path from "node:path";
import { parseCheck } from "./long-task-check-shape.js";
import { normalizeRepositoryFile } from "./long-task-paths.js";
import type { DeliveryOutcomeV2 } from "./long-task-delivery-types.js";
import {
  array,
  key,
  literal,
  nullable,
  object,
  parseBindings,
  parseControls,
  parseCounterfactuals,
  parseKeyedStatements,
  parseObligations,
  parseOwner,
  parsePopulation,
  parseRollback,
  repositoryPatterns,
  string,
  strings,
} from "./long-task-delivery-shape.js";
import { parseStrictYaml } from "./strict-codec.js";

export function parseOutcome(
  value: unknown,
  label: string,
): DeliveryOutcomeV2 {
  const row = object(value, label, [
    "key",
    "title",
    "depends_on",
    "product",
    "technical",
    "acceptance",
  ]);
  const product = object(row.product, `${label}.product`, [
    "observable_result",
    "owner",
    "owner_surfaces",
    "controls",
    "non_completing_outcomes",
  ]);
  const technical = object(row.technical, `${label}.technical`, [
    "obligations",
    "expected_change_paths",
    "allowed_support_paths",
    "forbidden_paths",
    "forbidden_shortcuts",
    "bindings",
    "rollback_and_recovery",
  ]);
  const acceptance = object(row.acceptance, `${label}.acceptance`, [
    "checks",
    "population",
    "counterfactual_controls",
  ]);
  return {
    key: key(row.key, `${label}.key`),
    title: string(row.title, `${label}.title`),
    depends_on: strings(row.depends_on, `${label}.depends_on`).map(
      (item, index) => key(item, `${label}.depends_on[${index}]`),
    ),
    product: {
      observable_result: string(
        product.observable_result,
        `${label}.product.observable_result`,
      ),
      owner: parseOwner(product.owner, `${label}.product.owner`),
      owner_surfaces: strings(
        product.owner_surfaces,
        `${label}.product.owner_surfaces`,
      ),
      controls: parseControls(product.controls, `${label}.product.controls`),
      non_completing_outcomes: parseKeyedStatements(
        product.non_completing_outcomes,
        `${label}.product.non_completing_outcomes`,
      ),
    },
    technical: {
      obligations: parseObligations(
        technical.obligations,
        `${label}.technical.obligations`,
      ),
      expected_change_paths: repositoryPatterns(
        technical.expected_change_paths,
        `${label}.technical.expected_change_paths`,
      ),
      allowed_support_paths: repositoryPatterns(
        technical.allowed_support_paths,
        `${label}.technical.allowed_support_paths`,
      ),
      forbidden_paths: repositoryPatterns(
        technical.forbidden_paths,
        `${label}.technical.forbidden_paths`,
      ),
      forbidden_shortcuts: parseKeyedStatements(
        technical.forbidden_shortcuts,
        `${label}.technical.forbidden_shortcuts`,
      ),
      bindings: parseBindings(
        technical.bindings,
        `${label}.technical.bindings`,
      ),
      rollback_and_recovery: nullable(technical.rollback_and_recovery, (item) =>
        parseRollback(item, `${label}.technical.rollback_and_recovery`),
      ),
    },
    acceptance: {
      checks: array(acceptance.checks, `${label}.acceptance.checks`).map(
        (item, index) =>
          parseCheck(item, `${label}.acceptance.checks[${index}]`),
      ),
      population: nullable(acceptance.population, (item) =>
        parsePopulation(item, `${label}.acceptance.population`),
      ),
      counterfactual_controls: parseCounterfactuals(
        acceptance.counterfactual_controls,
        `${label}.acceptance.counterfactual_controls`,
      ),
    },
  };
}

export function parseOutcomeFragment(
  raw: string,
  relative: string,
): DeliveryOutcomeV2[] {
  const value = parseStrictYaml(raw);
  if (Array.isArray(value))
    return value.map((item, index) =>
      parseOutcome(item, `${relative}[${index}]`),
    );
  const row = object(
    value,
    relative,
    [],
    [
      "schema_version",
      "outcomes",
      "key",
      "title",
      "depends_on",
      "product",
      "technical",
      "acceptance",
    ],
  );
  if (Object.hasOwn(row, "outcomes")) {
    if (
      Object.keys(row).some(
        (name) => !["schema_version", "outcomes"].includes(name),
      )
    )
      throw new Error(
        `delivery_contract_invalid:${relative}:fragment cannot mix root or Outcome keys`,
      );
    if (Object.hasOwn(row, "schema_version"))
      literal(
        row.schema_version,
        ["long-task-outcomes-v2"] as const,
        `${relative}.schema_version`,
      );
    return array(row.outcomes, `${relative}.outcomes`).map((item, index) =>
      parseOutcome(item, `${relative}.outcomes[${index}]`),
    );
  }
  return [parseOutcome(value, relative)];
}

export function safeFragmentPath(value: string, index: number): string {
  const normalized = normalizeRepositoryFile(
    value,
    `outcome_files[${index}]`,
  );
  if (!normalized.endsWith(".yaml"))
    throw new Error(`unsafe_path:outcome_files[${index}]:${value}`);
  return normalized;
}
