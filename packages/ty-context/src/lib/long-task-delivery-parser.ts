import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseStrictYaml, sha256Hex } from "./strict-codec.js";
import { parseCheck } from "./long-task-check-shape.js";
import { validateDeliveryContractStructure } from "./long-task-delivery-validation.js";
import {
  parseOutcome,
  parseOutcomeFragment,
  safeFragmentPath,
} from "./long-task-outcome-parser.js";
import { assertProtectedRepositoryFile } from "./long-task-protected-files.js";
import {
  array,
  key,
  literal,
  object,
  parseKeyedPaths,
  parseKeyedStatements,
  parseSourceClaims,
  repositoryFiles,
  string,
  strings,
} from "./long-task-delivery-shape.js";
import type {
  DeliveryContractV2,
  DeliveryOutcomeV2,
  LongTaskRiskFacts,
  RiskFactName,
} from "./long-task-delivery-types.js";
import { repositoryRoot } from "./long-task-workspace.js";

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
  repositoryInput?: string,
): Promise<ParsedDeliveryContractV2> {
  const workdir = path.resolve(workdirInput);
  const file = path.join(workdir, DELIVERY_CONTRACT_FILE);
  const repository = repositoryInput
    ? path.resolve(repositoryInput)
    : await repositoryRoot(workdir);
  const raw = await readFile(
    await assertProtectedRepositoryFile(
      repository,
      file,
      "delivery_contract",
    ),
    "utf8",
  );
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
      const protectedFragment = await assertProtectedRepositoryFile(
        repository,
        target,
        `outcome_fragment:${relative}`,
      ).catch((error) => {
        if (
          error instanceof Error &&
          error.message.startsWith("protected_input_not_found:")
        )
          throw new Error(`outcome_fragment_not_found:${relative}`);
        throw error;
      });
      const fragmentRaw = await readFile(protectedFragment, "utf8");
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
    source_paths: repositoryFiles(row.source_paths, "task.source_paths"),
    context_refs: repositoryFiles(row.context_refs, "task.context_refs"),
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
