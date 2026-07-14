import {
  canonicalCatalogModel,
  catalogSupports,
  isCatalogSuccessor,
  type CodexModelCatalog,
} from "./codex-model-catalog.js";
import { canonicalValueJson, sha256Hex } from "./composite-campaign-codec.js";
import {
  MODEL_ROUTING_POLICY,
  MODEL_ROUTING_POLICY_SHA256,
} from "./codex-model-routing-policy.js";

export const EFFORT_ORDER = [
  "none",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
] as const;
export type KnownEffort = (typeof EFFORT_ORDER)[number];

export interface ModelProfile {
  model: string;
  effort: string;
}

export type ModelRoutingReason =
  | "sol_xhigh_to_medium"
  | "sol_max_to_medium"
  | "catalog_upgrade_to_sol_medium"
  | "below_threshold_passthrough"
  | "unknown_profile_passthrough"
  | "target_unavailable_passthrough";

export interface ModelRoutingDecision {
  authoring_profile: ModelProfile;
  execution_profile: ModelProfile;
  switched: boolean;
  reason: ModelRoutingReason;
  policy_id: string;
  policy_sha256: string;
  catalog_sha256: string;
  decision_sha256: string;
}

export function routeCodexModel(
  controller: Partial<ModelProfile> | null | undefined,
  catalog: CodexModelCatalog,
): ModelRoutingDecision {
  const input = profileOrUnknown(controller);
  const canonical = canonicalCatalogModel(catalog, input.model);
  if (!canonical || !isKnownEffort(input.effort))
    return decide(input, input, false, "unknown_profile_passthrough", catalog);
  const authoring = { model: canonical, effort: input.effort };
  const rule = MODEL_ROUTING_POLICY.rules[0];
  const eligibleEffort = rule.accepted_efforts.includes(input.effort);
  const exactSol = canonical === rule.controller_family;
  const successor =
    rule.successor_allowed &&
    isCatalogSuccessor(catalog, canonical, rule.controller_family);
  if (!eligibleEffort || (!exactSol && !successor))
    return decide(
      authoring,
      authoring,
      false,
      "below_threshold_passthrough",
      catalog,
    );
  if (!catalogSupports(catalog, rule.execution.model, rule.execution.effort))
    return decide(
      authoring,
      authoring,
      false,
      "target_unavailable_passthrough",
      catalog,
    );
  const execution = { ...rule.execution };
  return decide(
    authoring,
    execution,
    authoring.model !== execution.model ||
      authoring.effort !== execution.effort,
    successor ? rule.successor_reason : rule.exact_reasons[input.effort],
    catalog,
  );
}

export function isKnownEffort(value: string): value is KnownEffort {
  return (EFFORT_ORDER as readonly string[]).includes(value);
}

export function effortRank(value: string): number {
  return EFFORT_ORDER.indexOf(value as KnownEffort);
}

function profileOrUnknown(
  value: Partial<ModelProfile> | null | undefined,
): ModelProfile {
  return {
    model: typeof value?.model === "string" ? value.model : "unknown",
    effort: typeof value?.effort === "string" ? value.effort : "unknown",
  };
}

function decide(
  authoring: ModelProfile,
  execution: ModelProfile,
  switched: boolean,
  reason: ModelRoutingReason,
  catalog: CodexModelCatalog,
): ModelRoutingDecision {
  const identity = {
    authoring_profile: authoring,
    execution_profile: execution,
    switched,
    reason,
    policy_id: MODEL_ROUTING_POLICY.policy_id,
    policy_sha256: MODEL_ROUTING_POLICY_SHA256,
    catalog_sha256: catalog.sha256,
  };
  return {
    ...identity,
    decision_sha256: sha256Hex(canonicalValueJson(identity)),
  };
}
