export type BoundaryCheckDecisionV2 = "single_contract" | "decision_required";

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

export function evaluateContractBoundary(
  input: BoundaryCheckInputV2,
): BoundaryCheckDecisionV2 {
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
  return "single_contract";
}
