import type { SuperpowersTaskState } from "./superpowers-task-state-schema.js";

const CANONICAL_PLAN_STATUSES = new Set(["not_started", "in_progress", "partial", "blocked", "invalidated", "complete", "out_of_scope_NA"]);
const CANONICAL_AC_STATUSES = new Set(["not_started", "not_run", "in_progress", "partial", "blocked", "invalidated", "complete", "out_of_scope_NA"]);

export function validateCanonicalStatuses(state: SuperpowersTaskState, errors: string[]): void {
  for (const [planId, item] of Object.entries(state.graph?.plan_items ?? {})) {
    if (!CANONICAL_PLAN_STATUSES.has(item.status)) {
      errors.push(`plan item ${planId} has non-canonical status: ${item.status}`);
    }
  }
  for (const [acId, ac] of Object.entries(state.graph?.acceptance_criteria ?? {})) {
    if (!CANONICAL_AC_STATUSES.has(ac.status)) {
      errors.push(`AC ${acId} has non-canonical status: ${ac.status}`);
    }
  }
}
