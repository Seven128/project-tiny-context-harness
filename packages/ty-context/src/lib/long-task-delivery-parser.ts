import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseStrictYaml } from "./strict-codec.js";
import { parseCheck } from "./long-task-check-shape.js";
import { validateDeliveryContractStructure } from "./long-task-delivery-validation.js";
import {
  array,
  boolean,
  key,
  literal,
  nullable,
  object,
  parseBindings,
  parseControls,
  parseCounterfactuals,
  parsePopulation,
  parseRollback,
  string,
  strings,
} from "./long-task-delivery-shape.js";
import type {
  DeliveryContractV1,
  DeliveryOutcomeV1,
  LongTaskRiskFacts,
} from "./long-task-delivery-types.js";

export const DELIVERY_CONTRACT_FILE = "delivery-contract.yaml";

export async function parseDeliveryContract(
  workdir: string,
): Promise<DeliveryContractV1> {
  const file = path.join(path.resolve(workdir), DELIVERY_CONTRACT_FILE);
  const raw = await readFile(file, "utf8");
  return parseDeliveryContractText(raw);
}

export function parseDeliveryContractText(raw: string): DeliveryContractV1 {
  const root = object(parseStrictYaml(raw), "$", [
    "schema_version",
    "task",
    "risk",
    "global",
    "outcomes",
  ]);
  literal(
    root.schema_version,
    ["long-task-delivery-v1"] as const,
    "schema_version",
  );
  const contract: DeliveryContractV1 = {
    schema_version: "long-task-delivery-v1",
    task: parseTask(root.task),
    risk: parseRisk(root.risk),
    global: parseGlobal(root.global),
    outcomes: array(root.outcomes, "outcomes").map((item, index) =>
      parseOutcome(item, `outcomes[${index}]`),
    ),
  };
  validateDeliveryContractStructure(contract);
  return contract;
}

function parseTask(value: unknown): DeliveryContractV1["task"] {
  const row = object(value, "task", [
    "id",
    "title",
    "goal",
    "source_paths",
    "context_refs",
    "context_snapshot_mode",
  ]);
  return {
    id: key(row.id, "task.id"),
    title: string(row.title, "task.title"),
    goal: string(row.goal, "task.goal"),
    source_paths: strings(row.source_paths, "task.source_paths"),
    context_refs: strings(row.context_refs, "task.context_refs"),
    context_snapshot_mode: literal(
      row.context_snapshot_mode,
      ["referenced", "full"] as const,
      "task.context_snapshot_mode",
    ),
  };
}

function parseRisk(value: unknown): DeliveryContractV1["risk"] {
  const row = object(value, "risk", ["requested_level", "facts"]);
  const facts = object(row.facts, "risk.facts", [
    "public_api_or_schema_change",
    "persistent_data_change",
    "data_migration",
    "security_boundary_change",
    "permission_boundary_change",
    "irreversible_external_effect",
    "critical_user_path",
    "full_population_operation",
    "multi_repository_change",
    "weak_observability",
  ]);
  return {
    requested_level: literal(
      row.requested_level,
      ["auto", "standard", "strict"] as const,
      "risk.requested_level",
    ),
    facts: Object.fromEntries(
      Object.keys(facts).map((name) => [
        name,
        boolean(facts[name], `risk.facts.${name}`),
      ]),
    ) as unknown as LongTaskRiskFacts,
  };
}

function parseGlobal(value: unknown): DeliveryContractV1["global"] {
  const row = object(value, "global", ["product", "technical", "acceptance"]);
  const product = object(row.product, "global.product", [
    "non_goals",
    "owner_boundaries",
  ]);
  const technical = object(row.technical, "global.technical", [
    "constraints",
    "forbidden_paths",
    "forbidden_shortcuts",
  ]);
  const acceptance = object(row.acceptance, "global.acceptance", ["checks"]);
  return {
    product: {
      non_goals: strings(product.non_goals, "global.product.non_goals"),
      owner_boundaries: strings(
        product.owner_boundaries,
        "global.product.owner_boundaries",
      ),
    },
    technical: {
      constraints: strings(
        technical.constraints,
        "global.technical.constraints",
      ),
      forbidden_paths: strings(
        technical.forbidden_paths,
        "global.technical.forbidden_paths",
      ),
      forbidden_shortcuts: strings(
        technical.forbidden_shortcuts,
        "global.technical.forbidden_shortcuts",
      ),
    },
    acceptance: {
      checks: array(acceptance.checks, "global.acceptance.checks").map(
        (item, index) => parseCheck(item, `global.acceptance.checks[${index}]`),
      ),
    },
  };
}

function parseOutcome(value: unknown, label: string): DeliveryOutcomeV1 {
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
    "owner_boundary",
    "owner_surfaces",
    "controls",
    "non_completing_outcomes",
  ]);
  const technical = object(row.technical, `${label}.technical`, [
    "obligations",
    "expected_change_paths",
    "allowed_support_paths",
    "forbidden_paths",
    "bindings",
    "forbidden_shortcuts",
    "rollback_and_recovery",
  ]);
  const acceptance = object(row.acceptance, `${label}.acceptance`, [
    "validates",
    "does_not_validate",
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
      owner_boundary: string(
        product.owner_boundary,
        `${label}.product.owner_boundary`,
      ),
      owner_surfaces: strings(
        product.owner_surfaces,
        `${label}.product.owner_surfaces`,
      ),
      controls: parseControls(product.controls, `${label}.product.controls`),
      non_completing_outcomes: strings(
        product.non_completing_outcomes,
        `${label}.product.non_completing_outcomes`,
      ),
    },
    technical: {
      obligations: strings(
        technical.obligations,
        `${label}.technical.obligations`,
      ),
      expected_change_paths: strings(
        technical.expected_change_paths,
        `${label}.technical.expected_change_paths`,
      ),
      allowed_support_paths: strings(
        technical.allowed_support_paths,
        `${label}.technical.allowed_support_paths`,
      ),
      forbidden_paths: strings(
        technical.forbidden_paths,
        `${label}.technical.forbidden_paths`,
      ),
      bindings: parseBindings(
        technical.bindings,
        `${label}.technical.bindings`,
      ),
      forbidden_shortcuts: strings(
        technical.forbidden_shortcuts,
        `${label}.technical.forbidden_shortcuts`,
      ),
      rollback_and_recovery: nullable(technical.rollback_and_recovery, (item) =>
        parseRollback(item, `${label}.technical.rollback_and_recovery`),
      ),
    },
    acceptance: {
      validates: strings(acceptance.validates, `${label}.acceptance.validates`),
      does_not_validate: strings(
        acceptance.does_not_validate,
        `${label}.acceptance.does_not_validate`,
      ),
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
