import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseStrictYaml, sha256Hex } from "./strict-codec.js";
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
  parseSourceClaims,
  string,
  strings,
} from "./long-task-delivery-shape.js";
import type {
  DeliveryContractV1,
  DeliveryOutcomeV1,
  LongTaskRiskFacts,
} from "./long-task-delivery-types.js";

export const DELIVERY_CONTRACT_FILE = "delivery-contract.yaml";

export interface ParsedDeliveryContractV1 {
  contract: DeliveryContractV1;
  contract_files: Record<string, string>;
  outcome_files: string[];
}

export async function parseDeliveryContract(
  workdir: string,
): Promise<DeliveryContractV1> {
  return (await parseDeliveryContractBundle(workdir)).contract;
}

export async function parseDeliveryContractBundle(
  workdirInput: string,
): Promise<ParsedDeliveryContractV1> {
  const workdir = path.resolve(workdirInput);
  const file = path.join(workdir, DELIVERY_CONTRACT_FILE);
  const raw = await readFile(file, "utf8");
  const root = object(
    parseStrictYaml(raw),
    "$",
    ["schema_version", "task", "risk", "global"],
    ["source_claims", "outcomes", "outcome_files"],
  );
  const hasInline = Object.hasOwn(root, "outcomes");
  const hasFiles = Object.hasOwn(root, "outcome_files");
  if (hasInline === hasFiles)
    throw new Error(
      "delivery_contract_invalid:$:exactly one of outcomes or outcome_files is required",
    );
  const files: Record<string, string> = {};
  let outcomes: DeliveryOutcomeV1[];
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

export function parseDeliveryContractText(raw: string): DeliveryContractV1 {
  const root = object(
    parseStrictYaml(raw),
    "$",
    ["schema_version", "task", "risk", "global", "outcomes"],
    ["source_claims"],
  );
  const contract = parseContractRoot(
    root,
    array(root.outcomes, "outcomes").map((item, index) =>
      parseOutcome(item, `outcomes[${index}]`),
    ),
  );
  validateDeliveryContractStructure(contract);
  return contract;
}

function parseContractRoot(
  root: Record<string, unknown>,
  outcomes: DeliveryOutcomeV1[],
): DeliveryContractV1 {
  literal(
    root.schema_version,
    ["long-task-delivery-v1"] as const,
    "schema_version",
  );
  const contract: DeliveryContractV1 = {
    schema_version: "long-task-delivery-v1",
    task: parseTask(root.task),
    source_claims: Object.hasOwn(root, "source_claims")
      ? parseSourceClaims(root.source_claims, "source_claims")
      : [],
    risk: parseRisk(root.risk),
    global: parseGlobal(root.global),
    outcomes,
  };
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
  const row = object(value, "risk", ["requested_level", "facts"], ["evidence"]);
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
  const evidence = Object.hasOwn(row, "evidence")
    ? array(row.evidence, "risk.evidence").map((item, index) => {
        const label = `risk.evidence[${index}]`;
        const entry = object(item, label, [
          "fact",
          "source_claim_refs",
          "context_refs",
          "affected_paths",
          "rationale",
        ]);
        return {
          fact: literal(
            entry.fact,
            Object.keys(facts) as (keyof LongTaskRiskFacts)[],
            `${label}.fact`,
          ),
          source_claim_refs: strings(
            entry.source_claim_refs,
            `${label}.source_claim_refs`,
          ),
          context_refs: strings(entry.context_refs, `${label}.context_refs`),
          affected_paths: strings(
            entry.affected_paths,
            `${label}.affected_paths`,
          ),
          rationale: string(entry.rationale, `${label}.rationale`),
        };
      })
    : [];
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
    evidence,
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
  const acceptance = object(
    row.acceptance,
    "global.acceptance",
    ["checks"],
    ["external_confirmations"],
  );
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

function parseOutcomeFragment(
  raw: string,
  relative: string,
): DeliveryOutcomeV1[] {
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
        ["long-task-outcomes-v1"] as const,
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
