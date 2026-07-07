import { isMachineVerifiableLayer } from "./superpowers-task-assertions.js";
import type { SuperpowersAcceptanceCriterion, SuperpowersTaskState } from "./superpowers-task-state-schema.js";

export interface UnderSpecifiedAc {
  ac_id: string;
  reasons: string[];
}

const GENERATED_ONLY_EVIDENCE = /\b(matrix|verdict|validator|final[-_ ]?card|final[-_ ]?summary|evidence[-_ ]?index|derived\/)/i;
const MACHINE_UI_PROOF = /\b(browser|ui_browser|e2e|smoke|trace|playwright|route|owner surface)\b/i;
const MANUAL_ONLY_TEST = /\b(查看页面|人工确认|manual confirm|manually inspect|visual check only)\b/i;

export function findUnderSpecifiedAcs(state: SuperpowersTaskState): UnderSpecifiedAc[] {
  return Object.entries(state.graph?.acceptance_criteria ?? {})
    .map(([acId, ac]) => ({ ac_id: acId, reasons: underSpecifiedReasons(acId, ac) }))
    .filter((item) => item.reasons.length > 0);
}

export function underSpecifiedReasons(acId: string, ac: SuperpowersAcceptanceCriterion): string[] {
  if (ac.machine_blocking !== true && ac.assertion_result_required !== true) {
    return [];
  }
  const reasons: string[] = [];
  if (!trimmed(ac.assertion_command)) {
    reasons.push(`${acId} under_specified: assertion_command is required for machine_blocking AC`);
  }
  if ((ac.assertion_artifacts ?? []).length === 0) {
    reasons.push(`${acId} under_specified: assertion_artifacts are required for machine_blocking AC`);
  }
  if ((ac.positive_assertions ?? []).length === 0) {
    reasons.push(`${acId} under_specified: positive_assertions are required for machine_blocking AC`);
  }
  if ((ac.negative_assertions ?? []).length === 0) {
    reasons.push(`${acId} under_specified: negative_assertions are required for machine_blocking AC`);
  }
  if ((ac.invalid_completion_signals ?? []).length === 0) {
    reasons.push(`${acId} under_specified: invalid_completion_signals are required for machine_blocking AC`);
  }
  if (ac.assertion_result_required !== true) {
    reasons.push(`${acId} under_specified: machine_blocking AC must require assertion_result`);
  }
  const requiredLayers = ac.required_proof_layers ?? [];
  if (requiredLayers.some((layer) => isMachineVerifiableLayer(`${acId}.${layer}`)) && !trimmed(ac.assertion_command)) {
    reasons.push(`${acId} under_specified: machine proof layers cannot produce assertion_result without assertion_command`);
  }
  if (requiredLayers.includes("ui_browser") && !MACHINE_UI_PROOF.test(acEvidenceText(ac))) {
    reasons.push(`${acId} under_specified: ui_browser AC requires browser/e2e/smoke/trace-backed proof`);
  }
  const finalEvidence = ac.final_evidence_expected ?? [];
  if (finalEvidence.length > 0 && finalEvidence.every((item) => GENERATED_ONLY_EVIDENCE.test(item))) {
    reasons.push(`${acId} under_specified: final_evidence_expected only names generated summary artifacts`);
  }
  const testCases = ac.test_cases ?? [];
  if (testCases.length > 0 && testCases.every((item) => MANUAL_ONLY_TEST.test(item))) {
    reasons.push(`${acId} under_specified: test_cases are manual-only`);
  }
  return reasons;
}

function acEvidenceText(ac: SuperpowersAcceptanceCriterion): string {
  return [
    ac.assertion_command ?? "",
    ...(ac.assertion_artifacts ?? []),
    ...(ac.verification_method ?? []),
    ...(ac.test_cases ?? []),
    ...(ac.final_evidence_expected ?? [])
  ].join("\n");
}

function trimmed(value: string | undefined): boolean {
  return Boolean(value && value.trim());
}
