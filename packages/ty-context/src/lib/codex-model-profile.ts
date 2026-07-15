export const EFFORT_ORDER = [
  "none",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
  "ultra",
] as const;

export type KnownEffort = (typeof EFFORT_ORDER)[number];

export interface ModelProfile {
  model: string;
  effort: string;
}

export const MODEL_ROUTING_REASONS = [
  "sol_xhigh_to_medium",
  "sol_max_to_medium",
  "sol_ultra_to_medium",
  "catalog_upgrade_to_sol_medium",
  "below_threshold_passthrough",
  "unknown_profile_passthrough",
  "target_unavailable_passthrough",
  "policy_unavailable_passthrough",
] as const;

export type ModelRoutingReason = (typeof MODEL_ROUTING_REASONS)[number];

export function isKnownEffort(value: string): value is KnownEffort {
  return (EFFORT_ORDER as readonly string[]).includes(value);
}

export function effortRank(value: string): number {
  return EFFORT_ORDER.indexOf(value as KnownEffort);
}
