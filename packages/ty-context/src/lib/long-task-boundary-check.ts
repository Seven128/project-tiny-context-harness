import type {
  BoundaryCheckDecisionV1,
  BoundaryCheckInputV1,
} from "./long-task-delivery-set-types.js";

const INVALID_SPLIT_MOTIVATIONS = new Set([
  "file_count",
  "token_count",
  "parallelism",
  "different_agents",
  "duration",
  "frontend_backend_layers",
]);

export function evaluateContractBoundary(
  input: BoundaryCheckInputV1,
): BoundaryCheckDecisionV1 {
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
        !candidate.separation_reason,
    )
  )
    return "decision_required";
  return "delivery_set";
}
