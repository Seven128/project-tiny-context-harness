import { canonicalCatalogModel, catalogSupports, isCatalogSuccessor, type CodexModelCatalog } from "./codex-model-catalog.js";

export const EFFORT_ORDER = ["none", "low", "medium", "high", "xhigh", "max"] as const;
export type KnownEffort = typeof EFFORT_ORDER[number];

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
}

export function routeCodexModel(controller: Partial<ModelProfile> | null | undefined, catalog: CodexModelCatalog): ModelRoutingDecision {
  const input = profileOrUnknown(controller);
  const canonical = canonicalCatalogModel(catalog, input.model);
  if (!canonical || !isKnownEffort(input.effort)) return passthrough(input, "unknown_profile_passthrough");
  const authoring = { model: canonical, effort: input.effort };
  const eligibleEffort = input.effort === "xhigh" || input.effort === "max";
  const exactSol = canonical === "gpt-5.6-sol";
  const successor = isCatalogSuccessor(catalog, canonical, "gpt-5.6-sol");
  if (!eligibleEffort || (!exactSol && !successor)) return passthrough(authoring, "below_threshold_passthrough");
  if (!catalogSupports(catalog, "gpt-5.6-sol", "medium")) return passthrough(authoring, "target_unavailable_passthrough");
  return {
    authoring_profile: authoring,
    execution_profile: { model: "gpt-5.6-sol", effort: "medium" },
    switched: authoring.model !== "gpt-5.6-sol" || authoring.effort !== "medium",
    reason: successor ? "catalog_upgrade_to_sol_medium" : input.effort === "max" ? "sol_max_to_medium" : "sol_xhigh_to_medium"
  };
}

export function isKnownEffort(value: string): value is KnownEffort {
  return (EFFORT_ORDER as readonly string[]).includes(value);
}

export function effortRank(value: string): number {
  return EFFORT_ORDER.indexOf(value as KnownEffort);
}

function profileOrUnknown(value: Partial<ModelProfile> | null | undefined): ModelProfile {
  return {
    model: typeof value?.model === "string" ? value.model : "unknown",
    effort: typeof value?.effort === "string" ? value.effort : "unknown"
  };
}

function passthrough(profile: ModelProfile, reason: ModelRoutingReason): ModelRoutingDecision {
  return { authoring_profile: profile, execution_profile: { ...profile }, switched: false, reason };
}
