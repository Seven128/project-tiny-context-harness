import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  canonicalValueJson,
  parseStrictYaml,
  sha256Hex,
} from "./composite-campaign-codec.js";
import type { ModelRoutingReason } from "./codex-model-router.js";

export interface CodexModelRoutingPolicyV1 {
  schema_version: "model-routing-policy-v1";
  policy_id: string;
  catalog_limits: {
    max_models: number;
    max_model_identifier_length: number;
    max_efforts_per_model: number;
  };
  aliases: Record<string, string>;
  rules: Array<{
    controller_family: string;
    minimum_effort: string;
    accepted_efforts: string[];
    successor_allowed: boolean;
    execution: {
      model: string;
      effort: string;
    };
    exact_reasons: Record<string, ModelRoutingReason>;
    successor_reason: ModelRoutingReason;
  }>;
  default: "passthrough";
}

const POLICY_FILE = fileURLToPath(
  new URL("../../assets/composite/model-routing-policy.yaml", import.meta.url),
);
export const MODEL_ROUTING_POLICY = validatePolicy(
  parseStrictYaml(readFileSync(POLICY_FILE, "utf8")),
);
export const MODEL_ROUTING_POLICY_SHA256 = sha256Hex(
  canonicalValueJson(MODEL_ROUTING_POLICY),
);

function validatePolicy(value: unknown): CodexModelRoutingPolicyV1 {
  const root = object(value, "policy", [
    "schema_version",
    "policy_id",
    "catalog_limits",
    "aliases",
    "rules",
    "default",
  ]);
  if (root.schema_version !== "model-routing-policy-v1")
    invalid("schema_version");
  text(root.policy_id, "policy_id");
  if (root.default !== "passthrough") invalid("default");
  const limits = object(root.catalog_limits, "catalog_limits", [
    "max_models",
    "max_model_identifier_length",
    "max_efforts_per_model",
  ]);
  integer(limits.max_models, 1, 1024, "max_models");
  integer(
    limits.max_model_identifier_length,
    16,
    512,
    "max_model_identifier_length",
  );
  integer(limits.max_efforts_per_model, 1, 64, "max_efforts_per_model");
  const aliases = object(
    root.aliases,
    "aliases",
    Object.keys(root.aliases as object),
  );
  for (const [alias, target] of Object.entries(aliases)) {
    text(alias, "alias");
    text(target, "alias_target");
  }
  if (!Array.isArray(root.rules) || root.rules.length !== 1) invalid("rules");
  for (const value of root.rules) {
    const rule = object(value, "rule", [
      "controller_family",
      "minimum_effort",
      "accepted_efforts",
      "successor_allowed",
      "execution",
      "exact_reasons",
      "successor_reason",
    ]);
    for (const key of [
      "controller_family",
      "minimum_effort",
      "successor_reason",
    ] as const)
      text(rule[key], key);
    if (rule.successor_allowed !== true) invalid("successor_allowed");
    if (
      !Array.isArray(rule.accepted_efforts) ||
      rule.accepted_efforts.length === 0 ||
      rule.accepted_efforts.some((item) => typeof item !== "string") ||
      new Set(rule.accepted_efforts).size !== rule.accepted_efforts.length ||
      !rule.accepted_efforts.includes(rule.minimum_effort)
    )
      invalid("accepted_efforts");
    const execution = object(rule.execution, "execution", ["model", "effort"]);
    text(execution.model, "execution.model");
    text(execution.effort, "execution.effort");
    const reasons = object(
      rule.exact_reasons,
      "exact_reasons",
      rule.accepted_efforts as string[],
    );
    for (const effort of rule.accepted_efforts as string[])
      text(reasons[effort], `reason:${effort}`);
  }
  return root as unknown as CodexModelRoutingPolicyV1;
}

function object(
  value: unknown,
  label: string,
  expected: string[],
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    invalid(label);
  const row = value as Record<string, unknown>;
  for (const key of expected)
    if (!Object.hasOwn(row, key)) invalid(`${label}:missing:${key}`);
  for (const key of Object.keys(row))
    if (!expected.includes(key)) invalid(`${label}:unknown:${key}`);
  return row;
}
function text(value: unknown, label: string): void {
  if (typeof value !== "string" || !value.trim()) invalid(label);
}
function integer(
  value: unknown,
  min: number,
  max: number,
  label: string,
): void {
  if (
    !Number.isInteger(value) ||
    (value as number) < min ||
    (value as number) > max
  )
    invalid(label);
}
function invalid(reason: string): never {
  throw new Error(`codex_model_routing_policy_invalid:${reason}`);
}
