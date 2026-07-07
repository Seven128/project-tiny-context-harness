import type { SuperpowersTaskState } from "./superpowers-task-state-schema.js";

export interface Ac010BootstrapResult {
  invalidated_ac_ids: string[];
  errors: string[];
}

const SUMMARY_ONLY = /\b(AC[-_ ]?010|final[-_ ]?gate|summary|final[-_ ]?acceptance[-_ ]?verdict|final[-_ ]?summary|matrix|validator)\b/i;

export function evaluateAc010Bootstrap(
  state: SuperpowersTaskState,
  acStatuses: Record<string, string>
): Ac010BootstrapResult {
  const invalidated: string[] = [];
  const errors: string[] = [];
  for (const [acId, ac] of Object.entries(state.graph?.acceptance_criteria ?? {})) {
    if (!isSummaryAc(acId, ac)) {
      continue;
    }
    if (acStatuses[acId] !== "complete" && ac.status !== "complete") {
      continue;
    }
    const incomplete = Object.keys(state.graph.acceptance_criteria).filter(
      (otherId) => otherId !== acId && acIsRequired(otherId) && acStatuses[otherId] !== "complete" && acStatuses[otherId] !== "out_of_scope_NA"
    );
    if (incomplete.length === 0) {
      continue;
    }
    invalidated.push(acId);
    errors.push(
      `${acId} final_gate_cannot_bootstrap_from_summary_only: summary AC cannot prove incomplete ACs ${incomplete.join(", ")}`
    );
  }
  return { invalidated_ac_ids: invalidated, errors };
}

function isSummaryAc(acId: string, ac: { assertion_command?: string; final_evidence_expected?: string[]; scope?: string }): boolean {
  return /^AC-?0?10$/i.test(acId) || SUMMARY_ONLY.test([ac.scope ?? "", ac.assertion_command ?? "", ...(ac.final_evidence_expected ?? [])].join("\n"));
}

function acIsRequired(acId: string): boolean {
  return !/^AC-?0?10$/i.test(acId);
}
