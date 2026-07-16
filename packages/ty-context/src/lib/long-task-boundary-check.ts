export type BoundaryCheckDecisionV2 =
  | "single_contract"
  | "single_contract_bundle"
  | "separate_top_level_contracts"
  | "decision_required"
  | "capacity_blocked";

export interface BoundaryCandidateV2 {
  observable_result: string;
  executable_acceptance: boolean;
  separation_reason: string;
  preserves_atomic_loop: boolean;
}

export interface BoundaryCheckInputV2 {
  atomic_user_loop: boolean;
  capacity_requires_fragments: boolean;
  capacity_available: boolean;
  split_motivations: string[];
  candidates: BoundaryCandidateV2[];
}

const INVALID_SPLIT_MOTIVATIONS = new Set([
  "file_count",
  "token_count",
  "parallelism",
  "different_agents",
  "duration",
  "frontend_backend_layers",
  "model_preference",
]);

export function evaluateContractBoundary(
  input: BoundaryCheckInputV2,
): BoundaryCheckDecisionV2 {
  if (!input.capacity_available) return "capacity_blocked";
  if (
    input.atomic_user_loop ||
    input.candidates.some((item) => !item.preserves_atomic_loop)
  )
    return input.capacity_requires_fragments
      ? "single_contract_bundle"
      : "single_contract";
  if (
    input.split_motivations.length > 0 &&
    input.split_motivations.every((reason) =>
      INVALID_SPLIT_MOTIVATIONS.has(reason),
    )
  )
    return input.capacity_requires_fragments
      ? "single_contract_bundle"
      : "single_contract";
  if (!input.candidates.length) return "decision_required";
  if (
    input.candidates.some(
      (candidate) =>
        !candidate.observable_result.trim() ||
        !candidate.executable_acceptance ||
        !candidate.separation_reason.trim(),
    )
  )
    return "decision_required";
  return "separate_top_level_contracts";
}
