import { parseGlobalCounterfactuals } from "./long-task-acceptance-shape.js";
import { parseCheck } from "./long-task-check-shape.js";
import {
  array,
  key,
  literal,
  object,
  parseKeyedPaths,
  parseKeyedStatements,
  repositoryFiles,
  string,
  strings,
} from "./long-task-delivery-shape.js";
import type {
  DeliveryContractV2,
  LongTaskRiskFacts,
  RiskFactName,
} from "./long-task-delivery-types.js";

const RISK_FACTS = [
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
] as const satisfies readonly RiskFactName[];

export function parseTask(value: unknown): DeliveryContractV2["task"] {
  const row = object(
    value,
    "task",
    ["id", "title", "goal", "source_paths", "context_refs"],
    ["context_snapshot_mode"],
  );
  return {
    id: key(row.id, "task.id"),
    title: string(row.title, "task.title"),
    goal: string(row.goal, "task.goal"),
    source_paths: repositoryFiles(row.source_paths, "task.source_paths"),
    context_refs: repositoryFiles(row.context_refs, "task.context_refs"),
    context_snapshot_mode: Object.hasOwn(row, "context_snapshot_mode")
      ? literal(
          row.context_snapshot_mode,
          ["referenced", "full"] as const,
          "task.context_snapshot_mode",
        )
      : "referenced",
  };
}

export function parseRisk(value: unknown): DeliveryContractV2["risk"] {
  const row = object(value, "risk", ["facts"], ["requested_level"]);
  const facts = object(row.facts, "risk.facts", [], [...RISK_FACTS]);
  return {
    requested_level: Object.hasOwn(row, "requested_level")
      ? literal(
          row.requested_level,
          ["auto", "standard", "strict"] as const,
          "risk.requested_level",
        )
      : "auto",
    facts: Object.fromEntries(
      RISK_FACTS.map((name) => [
        name,
        Object.hasOwn(facts, name)
          ? strings(facts[name], `risk.facts.${name}`).map((item, index) =>
              key(item, `risk.facts.${name}[${index}]`),
            )
          : [],
      ]),
    ) as LongTaskRiskFacts,
  };
}

export function parseGlobal(value: unknown): DeliveryContractV2["global"] {
  const row = object(
    value,
    "global",
    [],
    ["product", "technical", "acceptance"],
  );
  const product = object(
    Object.hasOwn(row, "product") ? row.product : {},
    "global.product",
    [],
    ["non_goals"],
  );
  const technical = object(
    Object.hasOwn(row, "technical") ? row.technical : {},
    "global.technical",
    [],
    ["constraints", "forbidden_paths", "forbidden_shortcuts"],
  );
  const acceptance = object(
    Object.hasOwn(row, "acceptance") ? row.acceptance : {},
    "global.acceptance",
    [],
    ["checks", "counterfactual_controls", "external_confirmations"],
  );
  return {
    product: {
      non_goals: Object.hasOwn(product, "non_goals")
        ? parseKeyedStatements(product.non_goals, "global.product.non_goals")
        : [],
    },
    technical: {
      constraints: Object.hasOwn(technical, "constraints")
        ? parseKeyedStatements(
            technical.constraints,
            "global.technical.constraints",
          )
        : [],
      forbidden_paths: Object.hasOwn(technical, "forbidden_paths")
        ? parseKeyedPaths(
            technical.forbidden_paths,
            "global.technical.forbidden_paths",
          )
        : [],
      forbidden_shortcuts: Object.hasOwn(technical, "forbidden_shortcuts")
        ? parseKeyedStatements(
            technical.forbidden_shortcuts,
            "global.technical.forbidden_shortcuts",
          )
        : [],
    },
    acceptance: {
      checks: Object.hasOwn(acceptance, "checks")
        ? array(acceptance.checks, "global.acceptance.checks").map(
            (item, index) =>
              parseCheck(item, `global.acceptance.checks[${index}]`),
          )
        : [],
      counterfactual_controls: Object.hasOwn(
        acceptance,
        "counterfactual_controls",
      )
        ? parseGlobalCounterfactuals(
            acceptance.counterfactual_controls,
            "global.acceptance.counterfactual_controls",
          )
        : [],
      external_confirmations: Object.hasOwn(
        acceptance,
        "external_confirmations",
      )
        ? array(
            acceptance.external_confirmations,
            "global.acceptance.external_confirmations",
          ).map((item, index) => {
            const label = `global.acceptance.external_confirmations[${index}]`;
            const entry = object(item, label, ["key", "description", "owner"]);
            return {
              key: key(entry.key, `${label}.key`),
              description: string(entry.description, `${label}.description`),
              owner: string(entry.owner, `${label}.owner`),
            };
          })
        : [],
    },
  };
}
