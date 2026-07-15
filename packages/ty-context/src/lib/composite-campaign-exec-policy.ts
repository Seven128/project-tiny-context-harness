import {
  MODEL_ROUTING_POLICY,
  MODEL_ROUTING_POLICY_SHA256,
  MODEL_ROUTING_POLICY_STATUS,
  type CodexModelRoutingPolicyV1,
} from "./codex-model-routing-policy.js";
import {
  effortRank,
  isKnownEffort,
  type ModelProfile,
  type ModelRoutingReason,
} from "./codex-model-profile.js";
import { canonicalValueJson, sha256Hex } from "./composite-campaign-codec.js";

export interface CodexExecRoutingDecisionV1 {
  authoring_profile: ModelProfile;
  execution_profile: ModelProfile;
  switched: boolean;
  reason: ModelRoutingReason;
  policy_id: string;
  policy_sha256: string;
  decision_sha256: string;
}

export function routeCodexExecProfileV1(
  controller: Partial<ModelProfile> | null | undefined,
  options: {
    policy?: CodexModelRoutingPolicyV1;
    policySha256?: string;
    policyAvailable?: boolean;
  } = {},
): CodexExecRoutingDecisionV1 {
  const policy = options.policy ?? MODEL_ROUTING_POLICY;
  const policySha256 = options.policySha256 ?? MODEL_ROUTING_POLICY_SHA256;
  const policyAvailable =
    options.policyAvailable ?? MODEL_ROUTING_POLICY_STATUS === "loaded";
  const authoring = profileOrUnknown(controller);
  const rule = policy.rules[0];
  if (!policyAvailable || !rule)
    return decision(
      authoring,
      authoring,
      "policy_unavailable_passthrough",
      policy,
      policySha256,
    );
  if (!isKnownEffort(authoring.effort) || authoring.model === "unknown")
    return decision(
      authoring,
      authoring,
      "unknown_profile_passthrough",
      policy,
      policySha256,
    );
  const canonicalControllerModel = canonicalModel(
    authoring.model,
    policy.aliases,
  );
  if (
    canonicalControllerModel !== rule.controller_family ||
    effortRank(authoring.effort) < effortRank(rule.minimum_effort) ||
    !rule.accepted_efforts.includes(authoring.effort)
  )
    return decision(
      authoring,
      authoring,
      "below_threshold_passthrough",
      policy,
      policySha256,
    );
  const reason = rule.exact_reasons[authoring.effort];
  if (!reason)
    return decision(
      authoring,
      authoring,
      "unknown_profile_passthrough",
      policy,
      policySha256,
    );
  return decision(
    authoring,
    { ...rule.execution },
    reason,
    policy,
    policySha256,
  );
}

function canonicalModel(
  model: string,
  aliases: Readonly<Record<string, string>>,
): string {
  let current = model;
  const visited = new Set<string>();
  while (Object.hasOwn(aliases, current) && !visited.has(current)) {
    visited.add(current);
    current = aliases[current];
  }
  return current;
}

export function isCodexTargetUnavailable(output: string): boolean {
  return /(?:model|reasoning effort).{0,80}(?:unavailable|not available|unsupported|not enabled|does not support)|(?:unknown|invalid) (?:model|reasoning effort)/iu.test(
    output,
  );
}

function decision(
  authoring: ModelProfile,
  execution: ModelProfile,
  reason: ModelRoutingReason,
  policy: CodexModelRoutingPolicyV1,
  policySha256: string,
): CodexExecRoutingDecisionV1 {
  const identity = {
    authoring_profile: authoring,
    execution_profile: execution,
    switched:
      authoring.model !== execution.model ||
      authoring.effort !== execution.effort,
    reason,
    policy_id: policy.policy_id,
    policy_sha256: policySha256,
  };
  return {
    ...identity,
    decision_sha256: sha256Hex(canonicalValueJson(identity)),
  };
}

function profileOrUnknown(
  value: Partial<ModelProfile> | null | undefined,
): ModelProfile {
  return {
    model:
      typeof value?.model === "string" && value.model.trim()
        ? value.model.trim()
        : "unknown",
    effort:
      typeof value?.effort === "string" && value.effort.trim()
        ? value.effort.trim()
        : "unknown",
  };
}
