import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseCheck } from "./long-task-check-shape.js";
import {
  array,
  boolean,
  fail,
  key,
  literal,
  object,
  parseSourceClaims,
  string,
  strings,
} from "./long-task-delivery-shape.js";
import type {
  DeliverySetV1,
  BoundarySeparationReasonV1,
} from "./long-task-delivery-set-types.js";
import { parseStrictYaml } from "./strict-codec.js";

export const DELIVERY_SET_FILE = "delivery-set.yaml";

export async function parseDeliverySet(setdir: string): Promise<DeliverySetV1> {
  return parseDeliverySetText(
    await readFile(path.join(path.resolve(setdir), DELIVERY_SET_FILE), "utf8"),
  );
}

export function parseDeliverySetText(raw: string): DeliverySetV1 {
  const root = object(
    parseStrictYaml(raw),
    "$",
    ["schema_version", "set", "source_claims", "global", "contracts"],
    ["multi_repository_change"],
  );
  literal(
    root.schema_version,
    ["long-task-delivery-set-v1"] as const,
    "schema_version",
  );
  const set = object(
    root.set,
    "set",
    [
      "id",
      "title",
      "goal",
      "source_paths",
      "context_refs",
      "context_snapshot_mode",
    ],
    ["risk_floor"],
  );
  const global = object(root.global, "global", [
    "product",
    "technical",
    "acceptance",
  ]);
  const product = object(global.product, "global.product", [
    "non_goals",
    "owner_boundaries",
  ]);
  const technical = object(global.technical, "global.technical", [
    "constraints",
    "forbidden_paths",
    "forbidden_shortcuts",
  ]);
  const acceptance = object(
    global.acceptance,
    "global.acceptance",
    ["integration_checks"],
    ["external_confirmations"],
  );
  const definition: DeliverySetV1 = {
    schema_version: "long-task-delivery-set-v1",
    multi_repository_change: Object.hasOwn(root, "multi_repository_change")
      ? boolean(root.multi_repository_change, "multi_repository_change")
      : false,
    set: {
      id: key(set.id, "set.id"),
      title: string(set.title, "set.title"),
      goal: string(set.goal, "set.goal"),
      source_paths: strings(set.source_paths, "set.source_paths"),
      context_refs: strings(set.context_refs, "set.context_refs"),
      context_snapshot_mode: literal(
        set.context_snapshot_mode,
        ["referenced", "full"] as const,
        "set.context_snapshot_mode",
      ),
      risk_floor: Object.hasOwn(set, "risk_floor")
        ? literal(
            set.risk_floor,
            ["standard", "strict"] as const,
            "set.risk_floor",
          )
        : "standard",
    },
    source_claims: parseSourceClaims(root.source_claims, "source_claims"),
    global: {
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
        integration_checks: array(
          acceptance.integration_checks,
          "global.acceptance.integration_checks",
        ).map((item, index) =>
          parseCheck(item, `global.acceptance.integration_checks[${index}]`),
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
              const row = object(item, label, ["key", "description", "owner"]);
              return {
                key: key(row.key, `${label}.key`),
                description: string(row.description, `${label}.description`),
                owner: string(row.owner, `${label}.owner`),
              };
            })
          : [],
      },
    },
    contracts: array(root.contracts, "contracts").map((item, index) => {
      const label = `contracts[${index}]`;
      const row = object(item, label, [
        "key",
        "workdir",
        "depends_on",
        "source_claim_refs",
        "boundary",
      ]);
      const boundary = object(row.boundary, `${label}.boundary`, [
        "observable_result",
        "separation_reason",
        "evidence",
      ]);
      return {
        key: key(row.key, `${label}.key`),
        workdir: string(row.workdir, `${label}.workdir`),
        depends_on: strings(row.depends_on, `${label}.depends_on`).map(
          (dependency, dependencyIndex) =>
            key(dependency, `${label}.depends_on[${dependencyIndex}]`),
        ),
        source_claim_refs: strings(
          row.source_claim_refs,
          `${label}.source_claim_refs`,
        ),
        boundary: {
          observable_result: string(
            boundary.observable_result,
            `${label}.boundary.observable_result`,
          ),
          separation_reason: literal(
            boundary.separation_reason,
            [
              "independent_release",
              "independent_rollback",
              "different_owner_or_authority",
              "different_risk_or_approval_boundary",
              "independent_product_capability",
            ] as const satisfies readonly BoundarySeparationReasonV1[],
            `${label}.boundary.separation_reason`,
          ),
          evidence: string(boundary.evidence, `${label}.boundary.evidence`),
        },
      };
    }),
  };
  validateDeliverySetStructure(definition);
  return definition;
}

function validateDeliverySetStructure(definition: DeliverySetV1): void {
  if (definition.multi_repository_change)
    throw new Error("multi_repository_delivery_not_supported_v1");
  unique(
    definition.contracts.map((contract) => contract.key),
    "delivery_set_contract_key_duplicate",
  );
  unique(
    definition.contracts.map((contract) =>
      contract.workdir.replace(/\\/gu, "/"),
    ),
    "delivery_set_workdir_duplicate",
  );
  unique(
    definition.source_claims.map((claim) => claim.key),
    "delivery_set_source_claim_key_duplicate",
  );
  unique(
    definition.global.acceptance.integration_checks.map((check) => check.key),
    "delivery_set_integration_check_key_duplicate",
  );
  const contracts = new Map(
    definition.contracts.map((contract) => [contract.key, contract]),
  );
  const claims = new Set(definition.source_claims.map((claim) => claim.key));
  for (const contract of definition.contracts) {
    for (const dependency of contract.depends_on) {
      if (dependency === contract.key)
        fail("delivery_set_dependency_self", contract.key);
      if (!contracts.has(dependency))
        fail(
          "delivery_set_dependency_unknown",
          `${contract.key}:${dependency}`,
        );
    }
    for (const claim of contract.source_claim_refs)
      if (!claims.has(claim))
        fail(
          "delivery_set_source_claim_ref_unknown",
          `${contract.key}:${claim}`,
        );
  }
  for (const claim of definition.source_claims)
    if (claim.disposition.type === "contract")
      for (const reference of claim.disposition.refs)
        if (!contracts.has(reference))
          fail(
            "delivery_set_claim_contract_unknown",
            `${claim.key}:${reference}`,
          );
  validateCycles(contracts);
}

function validateCycles(
  contracts: Map<string, DeliverySetV1["contracts"][number]>,
): void {
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (keyValue: string): void => {
    if (visiting.has(keyValue)) fail("delivery_set_dependency_cycle", keyValue);
    if (visited.has(keyValue)) return;
    visiting.add(keyValue);
    for (const dependency of contracts.get(keyValue)!.depends_on)
      visit(dependency);
    visiting.delete(keyValue);
    visited.add(keyValue);
  };
  for (const contract of contracts.keys()) visit(contract);
}

function unique(values: string[], code: string): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) fail(code, value);
    seen.add(value);
  }
}
