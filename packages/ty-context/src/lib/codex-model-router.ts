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
import {
  isKnownEffort,
  type ModelProfile,
  type ModelRoutingReason,
} from "./codex-model-profile.js";

export {
  EFFORT_ORDER,
  MODEL_ROUTING_REASONS,
  effortRank,
  isKnownEffort,
  type KnownEffort,
  type ModelProfile,
  type ModelRoutingReason,
} from "./codex-model-profile.js";

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
  policy = MODEL_ROUTING_POLICY,
  policySha256 = MODEL_ROUTING_POLICY_SHA256,
): ModelRoutingDecision {
  const input = profileOrUnknown(controller);
  const rule = policy.rules[0];
  if (!rule)
    return decide(
      input,
      input,
      false,
      "policy_unavailable_passthrough",
      catalog,
      policy,
      policySha256,
    );
  const canonical = canonicalCatalogModel(catalog, input.model);
  if (!canonical || !isKnownEffort(input.effort))
    return decide(
      input,
      input,
      false,
      "unknown_profile_passthrough",
      catalog,
      policy,
      policySha256,
    );
  const authoring = { model: canonical, effort: input.effort };
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
      policy,
      policySha256,
    );
  if (!catalogSupports(catalog, rule.execution.model, rule.execution.effort))
    return decide(
      authoring,
      authoring,
      false,
      "target_unavailable_passthrough",
      catalog,
      policy,
      policySha256,
    );
  const execution = { ...rule.execution };
  return decide(
    authoring,
    execution,
    authoring.model !== execution.model ||
      authoring.effort !== execution.effort,
    successor ? rule.successor_reason : rule.exact_reasons[input.effort],
    catalog,
    policy,
    policySha256,
  );
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
  policy: typeof MODEL_ROUTING_POLICY,
  policySha256: string,
): ModelRoutingDecision {
  const identity = {
    authoring_profile: authoring,
    execution_profile: execution,
    switched,
    reason,
    policy_id: policy.policy_id,
    policy_sha256: policySha256,
    catalog_sha256: catalog.sha256,
  };
  return {
    ...identity,
    decision_sha256: sha256Hex(canonicalValueJson(identity)),
  };
}
