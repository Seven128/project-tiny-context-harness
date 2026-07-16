import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseStrictYaml, sha256Hex } from "./strict-codec.js";
import { parseCheck } from "./long-task-check-shape.js";
import { validateDeliveryContractStructure } from "./long-task-delivery-validation.js";
import {
  array,
  key,
  literal,
  nullable,
  object,
  parseBindings,
  parseControls,
  parseCounterfactuals,
  parseKeyedPaths,
  parseKeyedStatements,
  parseObligations,
  parseOwner,
  parsePopulation,
  parseRollback,
  parseSourceClaims,
  string,
  strings,
} from "./long-task-delivery-shape.js";
import type {
  DeliveryContractV2,
  DeliveryOutcomeV2,
  LongTaskRiskFacts,
  RiskFactName,
} from "./long-task-delivery-types.js";

export const DELIVERY_CONTRACT_FILE = "delivery-contract.yaml";
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

export interface ParsedDeliveryContractV2 {
  contract: DeliveryContractV2;
  contract_files: Record<string, string>;
  outcome_files: string[];
}

export async function parseDeliveryContract(
  workdir: string,
): Promise<DeliveryContractV2> {
  return (await parseDeliveryContractBundle(workdir)).contract;
}

export async function parseDeliveryContractBundle(
  workdirInput: string,
): Promise<ParsedDeliveryContractV2> {
  const workdir = path.resolve(workdirInput);
  const file = path.join(workdir, DELIVERY_CONTRACT_FILE);
  const raw = await readFile(file, "utf8");
  const root = parseRoot(raw, true);
  const hasInline = Object.hasOwn(root, "outcomes");
  const hasFiles = Object.hasOwn(root, "outcome_files");
  if (hasInline === hasFiles)
    throw new Error(
      "delivery_contract_invalid:$:exactly one of outcomes or outcome_files is required",
    );
  const files: Record<string, string> = {};
  let outcomes: DeliveryOutcomeV2[];
  let outcomeFiles: string[] = [];
  if (hasInline) {
    outcomes = array(root.outcomes, "outcomes").map((item, index) =>
      parseOutcome(item, `outcomes[${index}]`),
    );
  } else {
    outcomeFiles = strings(root.outcome_files, "outcome_files")
      .map((item, index) => safeFragmentPath(item, index))
      .sort();
    if (new Set(outcomeFiles).size !== outcomeFiles.length)
      throw new Error("delivery_contract_invalid:outcome_files:duplicate path");
    outcomes = [];
    for (const relative of outcomeFiles) {
      const target = path.resolve(workdir, ...relative.split("/"));
      if (!target.startsWith(`${workdir}${path.sep}`))
        throw new Error(`unsafe_path:outcome_files:${relative}`);
      const fragmentRaw = await readFile(target, "utf8").catch(() => {
        throw new Error(`outcome_fragment_not_found:${relative}`);
      });
      files[relative] = sha256Hex(fragmentRaw);
      outcomes.push(...parseOutcomeFragment(fragmentRaw, relative));
    }
    outcomes.sort((left, right) => left.key.localeCompare(right.key));
  }
  const contract = parseContractRoot(root, outcomes);
  validateDeliveryContractStructure(contract);
  return {
    contract,
    contract_files: Object.fromEntries(
      Object.entries(files).sort(([a], [b]) => a.localeCompare(b)),
    ),
    outcome_files: outcomeFiles,
  };
}

export function parseDeliveryContractText(raw: string): DeliveryContractV2 {
  const root = parseRoot(raw, false);
  const contract = parseContractRoot(
    root,
    array(root.outcomes, "outcomes").map((item, index) =>
      parseOutcome(item, `outcomes[${index}]`),
    ),
  );
  validateDeliveryContractStructure(contract);
  return contract;
}

function parseRoot(raw: string, bundle: boolean): Record<string, unknown> {
  const decoded = parseStrictYaml(raw);
  if (
    decoded &&
    typeof decoded === "object" &&
    !Array.isArray(decoded) &&
    (decoded as Record<string, unknown>).schema_version ===
      "long-task-delivery-v1"
  )
    throw new Error("long_task_delivery_v1_retired_use_v2");
  return object(
    decoded,
    "$",
    ["schema_version", "task", "risk", "global"],
    bundle
      ? ["source_claims", "outcomes", "outcome_files"]
      : ["source_claims", "outcomes"],
  );
}

function parseContractRoot(
  root: Record<string, unknown>,
  outcomes: DeliveryOutcomeV2[],
): DeliveryContractV2 {
  literal(
    root.schema_version,
    ["long-task-delivery-v2"] as const,
    "schema_version",
  );
  return {
    schema_version: "long-task-delivery-v2",
    task: parseTask(root.task),
    source_claims: Object.hasOwn(root, "source_claims")
      ? parseSourceClaims(root.source_claims, "source_claims")
      : [],
    risk: parseRisk(root.risk),
    global: parseGlobal(root.global),
    outcomes,
  };
}

function parseTask(value: unknown): DeliveryContractV2["task"] {
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

function parseRisk(value: unknown): DeliveryContractV2["risk"] {
  const row = object(value, "risk", ["requested_level", "facts"]);
  const facts = object(row.facts, "risk.facts", [...RISK_FACTS]);
  return {
    requested_level: literal(
      row.requested_level,
      ["auto", "standard", "strict"] as const,
      "risk.requested_level",
    ),
    facts: Object.fromEntries(
      RISK_FACTS.map((name) => [
        name,
        strings(facts[name], `risk.facts.${name}`).map((item, index) =>
          key(item, `risk.facts.${name}[${index}]`),
        ),
      ]),
    ) as LongTaskRiskFacts,
  };
}

function parseGlobal(value: unknown): DeliveryContractV2["global"] {
  const row = object(value, "global", ["product", "technical", "acceptance"]);
  const product = object(row.product, "global.product", ["non_goals"]);
  const technical = object(row.technical, "global.technical", [
    "constraints",
    "forbidden_paths",
    "forbidden_shortcuts",
  ]);
  const acceptance = object(
    row.acceptance,
    "global.acceptance",
    ["checks"],
    ["external_confirmations"],
  );
  return {
    product: {
      non_goals: parseKeyedStatements(
        product.non_goals,
        "global.product.non_goals",
      ),
    },
    technical: {
      constraints: parseKeyedStatements(
        technical.constraints,
        "global.technical.constraints",
      ),
      forbidden_paths: parseKeyedPaths(
        technical.forbidden_paths,
        "global.technical.forbidden_paths",
      ),
      forbidden_shortcuts: parseKeyedStatements(
        technical.forbidden_shortcuts,
        "global.technical.forbidden_shortcuts",
      ),
    },
    acceptance: {
      checks: array(acceptance.checks, "global.acceptance.checks").map(
        (item, index) => parseCheck(item, `global.acceptance.checks[${index}]`),
      ),
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

function parseOutcome(value: unknown, label: string): DeliveryOutcomeV2 {
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

function parseOutcomeFragment(
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

function safeFragmentPath(value: string, index: number): string {
  const normalized = value.replace(/\\/gu, "/").replace(/^\.\//u, "");
  if (
    !normalized ||
    path.posix.isAbsolute(normalized) ||
    normalized.split("/").includes("..") ||
    !normalized.endsWith(".yaml")
  )
    throw new Error(`unsafe_path:outcome_files[${index}]:${value}`);
  return normalized;
}
