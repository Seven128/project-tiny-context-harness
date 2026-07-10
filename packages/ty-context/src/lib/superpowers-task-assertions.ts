import {
  type AssertionCheck,
  type AssertionResult,
  type SuperpowersEvidenceRecord,
  type SuperpowersTaskState
} from "./superpowers-task-state-schema.js";
import { evaluateCurrentAttemptEvidence } from "./superpowers-task-current-evidence.js";
import {
  MACHINE_VERIFIABLE_PROOF_LAYERS,
  isMachineVerifiableLayer,
  isUiBrowserLayer,
  normalizeProofLayerId,
  proofLayerAcId,
  proofLayerName
} from "./superpowers-task-proof-layers.js";
export { normalizeAssertionResult, normalizeNegativeEvidenceScan } from "./superpowers-task-assertion-normalizers.js";
export {
  MACHINE_VERIFIABLE_PROOF_LAYERS,
  isMachineVerifiableLayer,
  isUiBrowserLayer,
  proofLayerAcId,
  proofLayerName
};

export type AssertionStatus = "passed" | "failed" | "missing" | "stale" | "not_applicable";

export interface ProofLayerAssertionEvaluation {
  assertion_status: AssertionStatus;
  blocking_assertion_failures: string[];
  negative_evidence_findings: string[];
}

export const UI_BROWSER_ASSERTION_TYPES = new Set(["browser_assertion", "playwright_assertion", "ui_browser_assertion"]);
const DEFAULT_UI_FORBIDDEN_FINAL_STATES = ["未验证", "不可用", "暂不可用", "页面无明显变化"];
const GENERIC_INVALID_EVIDENCE_TYPE_PATTERNS = [
  /\bfinal[-_ ]?(?:result[-_ ]?)?card\b/i,
  /\b(?:plan[-_ ]?conformance[-_ ]?)?matrix\b/i,
  /\b(?:final[-_ ]?acceptance[-_ ]?)?verdict\b/i,
  /\bvalidator[-_ ]?pass\b/i,
  /\bauditor[-_ ]?pass\b/i,
  /\bsubagent[-_ ]?summary\b/i,
  /\bagent[-_ ]?summary\b/i,
  /\bprose[-_ ]?summary\b/i,
  /\bfile[-_ ]?exists\b/i,
  /\bartifact[-_ ]?exists\b/i,
  /\btest[-_ ]?name[-_ ]?only\b/i,
  /\bdiagnostic[-_ ]?(?:surface|page)?\b/i,
  /\blocal[-_ ]?audit\b/i,
  /\bcomponent[-_ ]?screenshot\b/i,
  /\bstorybook\b/i,
  /\bdom[-_ ]?snippet\b/i,
  /\bsample[-_ ]?for[-_ ]?full[-_ ]?population\b/i
];

export function evaluateAcEvidence(state: SuperpowersTaskState, acId: string): ProofLayerAssertionEvaluation {
  const ac = state.graph.acceptance_criteria[acId];
  if (!ac) {
    return {
      assertion_status: "missing",
      blocking_assertion_failures: [`AC ${acId} missing from task graph`],
      negative_evidence_findings: []
    };
  }
  const evaluations = ac.required_proof_layers.map((layer) => evaluateProofLayer(state, `${acId}.${layer}`));
  const applicable = evaluations.filter((item) => item.assertion_status !== "not_applicable");
  const blocking_assertion_failures = applicable.flatMap((item) => item.blocking_assertion_failures);
  const negative_evidence_findings = applicable.flatMap((item) => item.negative_evidence_findings);
  const statuses = applicable.map((item) => item.assertion_status);
  const assertion_status: AssertionStatus =
    applicable.length === 0
      ? "not_applicable"
      : statuses.includes("failed")
        ? "failed"
        : statuses.includes("stale")
          ? "stale"
          : statuses.includes("missing")
            ? "missing"
            : "passed";
  return { assertion_status, blocking_assertion_failures, negative_evidence_findings };
}

export function evaluateProofLayer(state: SuperpowersTaskState, layerId: string): ProofLayerAssertionEvaluation {
  return evaluateProofLayerAssertions(state, layerId);
}

export function evaluateProofLayerAssertions(state: SuperpowersTaskState, layerId: string): ProofLayerAssertionEvaluation {
  if (!isMachineVerifiableLayer(layerId)) {
    return { assertion_status: "not_applicable", blocking_assertion_failures: [], negative_evidence_findings: [] };
  }
  if (!state.current_attempt_id) {
    return {
      assertion_status: "missing",
      blocking_assertion_failures: [`proof layer ${layerId} missing current attempt; current attempt is required for machine-backed completion`],
      negative_evidence_findings: []
    };
  }
  const layer = state.graph.proof_layers[layerId];
  const evidenceById = new Map((state.evidence ?? []).map((item) => [item.evidence_id, item]));
  const evidenceRecords = (layer?.evidence_ids ?? []).map((id) => evidenceById.get(id)).filter((item): item is SuperpowersEvidenceRecord => Boolean(item));
  if (!layer || evidenceRecords.length === 0) {
    return {
      assertion_status: "missing",
      blocking_assertion_failures: [`proof layer ${layerId} missing assertion result`],
      negative_evidence_findings: []
    };
  }

  const blocking: string[] = [];
  const negative: string[] = [];
  for (const evidence of evidenceRecords) {
    blocking.push(...evaluateCurrentAttemptEvidence(state, evidence, layerId));
    blocking.push(...evaluateAssertionEvidence(evidence, layerId));
    negative.push(...evaluateNegativeEvidence(evidence, layerId));
  }
  const combined = [...blocking, ...negative];
  if (combined.length === 0) {
    return { assertion_status: "passed", blocking_assertion_failures: [], negative_evidence_findings: [] };
  }
  const text = combined.join("\n");
  const status: AssertionStatus = /missing assertion result/i.test(text)
    ? "missing"
    : /\bstale\b/i.test(text)
      ? "stale"
      : "failed";
  return { assertion_status: status, blocking_assertion_failures: blocking, negative_evidence_findings: negative };
}

export function assertionFailuresForState(state: SuperpowersTaskState): string[] {
  return Object.keys(state.graph?.proof_layers ?? {}).flatMap((layerId) => {
    const evaluation = evaluateProofLayerAssertions(state, layerId);
    return [...evaluation.blocking_assertion_failures, ...evaluation.negative_evidence_findings];
  });
}

export function evaluateAssertionEvidence(evidence: SuperpowersEvidenceRecord, layerId: string): string[] {
  const failures: string[] = [];
  const acId = proofLayerAcId(layerId);
  const layerName = proofLayerName(layerId);
  const assertion = evidence.assertion_result;
  const label = `proof layer ${layerId} evidence ${evidence.evidence_id}`;
  const invalidEvidence = invalidEvidenceReason(evidence, layerName);
  if (invalidEvidence) {
    failures.push(`${label} invalid evidence forbidden shortcut ${evidence.type || "(missing)"} cannot satisfy ${layerName}: ${invalidEvidence}`);
  }
  if (!assertion) {
    failures.push(`${label} missing assertion result; ${layerName} proof not machine-backed`);
    return failures;
  }
  if (assertion.schema_version !== "assertion-result-v1" && assertion.schema_version !== "assertion-result-v2") {
    failures.push(`${label} assertion_result.schema_version must be assertion-result-v1 or assertion-result-v2`);
  }
  if (assertion.status !== "passed") {
    failures.push(`${label} assertion_result.status=${assertion.status}; expected passed`);
  }
  if (assertion.exit_code !== 0) {
    failures.push(`${label} assertion exit_code=${assertion.exit_code}; expected 0`);
  }
  if (evidence.command_exit_code !== undefined && evidence.command_exit_code !== 0) {
    failures.push(`${label} command_exit_code=${evidence.command_exit_code}; expected 0`);
  }
  if (!assertion.target_ac_ids.includes(acId)) {
    failures.push(`${label} assertion target ACs ${assertion.target_ac_ids.join(", ") || "(none)"} do not include ${acId}`);
  }
  const assertionTargetLayers = assertion.target_proof_layers.map(normalizeProofLayerId);
  const normalizedLayerId = normalizeProofLayerId(layerId);
  if (!assertionTargetLayers.includes(normalizedLayerId) && !assertionTargetLayers.includes(layerName)) {
    failures.push(`${label} assertion target_proof_layers ${assertion.target_proof_layers.join(", ") || "(none)"} do not include ${layerId} or ${layerName}`);
  }
  failures.push(...checkAssertions(`${label} positive assertion`, assertion.positive_assertions));
  failures.push(...checkAssertions(`${label} negative assertion`, assertion.negative_assertions));
  failures.push(...checkAssertions(`${label} invalid completion signal`, assertion.invalid_completion_signals ?? []));
  const missingRequiredTests = (assertion.required_test_ids ?? []).filter((testId) => !testId);
  if (missingRequiredTests.length > 0) {
    failures.push(`${label} assertion_result.required_test_ids contains empty test ids`);
  }
  if ((assertion.artifacts?.length ?? 0) === 0 && evidence.artifact_paths.length === 0) {
    failures.push(`${label} assertion-backed evidence must include artifacts`);
  }
  if (isUiBrowserLayer(layerId)) {
    failures.push(...validateUiBrowserAssertion(evidence, assertion, layerId));
  }
  return failures;
}

function validateUiBrowserAssertion(evidence: SuperpowersEvidenceRecord, assertion: AssertionResult, layerId: string): string[] {
  const failures: string[] = [];
  const label = `proof layer ${layerId} evidence ${evidence.evidence_id}`;
  if (!UI_BROWSER_ASSERTION_TYPES.has(evidence.type)) {
    const apiOnly = /\bapi\b/i.test(evidence.type) ? "; API-only cannot satisfy UI Path AC" : "";
    failures.push(`${label} ui_browser evidence type ${evidence.type || "(missing)"} is not allowed${apiOnly}`);
  }
  if (!assertion.owner_surface) {
    failures.push(`${label} missing owner_surface`);
  }
  if (!assertion.route) {
    failures.push(`${label} missing route`);
  }
  if (!assertion.action) {
    failures.push(`${label} missing action-level UI proof`);
  }
  const artifacts = [...(assertion.artifacts ?? []), ...evidence.artifact_paths];
  if (!artifacts.some((artifact) => /\.(png|jpe?g|zip|json)$/i.test(artifact) || /\b(trace|screenshot|report)\b/i.test(artifact))) {
    failures.push(`${label} ui_browser assertion must include screenshot, trace or report artifact`);
  }
  const negativeCoverage = assertion.negative_assertions.map((item) => `${item.id} ${item.forbidden_text ?? ""}`).join("\n");
  for (const forbidden of DEFAULT_UI_FORBIDDEN_FINAL_STATES) {
    if (!negativeCoverage.includes(forbidden)) {
      failures.push(`${label} missing negative assertion coverage for forbidden final state ${forbidden}`);
    }
  }
  if (!evidence.negative_evidence_scan) {
    failures.push(`${label} missing negative_evidence_scan for ui_browser layer`);
  }
  return failures;
}

function checkAssertions(prefix: string, checks: AssertionCheck[]): string[] {
  return checks
    .filter((check) => check.status !== "passed")
    .map((check) => `${prefix} ${check.id || "(unnamed)"} status=${check.status}; expected passed${check.forbidden_text ? ` forbidden_text=${check.forbidden_text}` : ""}`);
}

export function evaluateNegativeEvidence(evidence: SuperpowersEvidenceRecord, layerId: string): string[] {
  const scan = evidence.assertion_result?.negative_evidence_scan ?? evidence.negative_evidence_scan;
  if (!scan) {
    return [`proof layer ${layerId} evidence ${evidence.evidence_id} missing negative_evidence_scan`];
  }
  const acId = proofLayerAcId(layerId);
  const label = `proof layer ${layerId} evidence ${evidence.evidence_id}`;
  const findings: string[] = [];
  if (scan.schema_version !== "negative-evidence-scan-v1") {
    findings.push(`${label} negative_evidence_scan.schema_version must be negative-evidence-scan-v1`);
  }
  if (scan.status !== "passed") {
    findings.push(`${label} negative evidence scan status=${scan.status}; expected passed`);
  }
  if (!scan.target_ac_ids.includes(acId)) {
    findings.push(`${label} negative evidence scan target ACs ${scan.target_ac_ids.join(", ") || "(none)"} do not include ${acId}`);
  }
  const targetLayers = (scan.target_proof_layers ?? []).map(normalizeProofLayerId);
  const normalizedLayerId = normalizeProofLayerId(layerId);
  if (targetLayers.length === 0) {
    findings.push(`${label} negative evidence scan target proof layers are missing; expected ${normalizedLayerId}`);
  } else if (!targetLayers.includes(normalizedLayerId) && !targetLayers.includes(proofLayerName(layerId))) {
    findings.push(`${label} negative evidence scan target proof layers ${targetLayers.join(", ") || "(none)"} do not include ${normalizedLayerId}`);
  }
  for (const finding of scan.forbidden_findings ?? []) {
    if (finding.status === "found") {
      findings.push(`${label} negative evidence found forbidden text ${finding.forbidden_text ?? finding.id}: ${finding.actual ?? ""}`.trim());
    }
  }
  for (const required of scan.required_findings ?? []) {
    if (required.status !== "passed") {
      findings.push(`${label} negative evidence required finding ${required.id} status=${required.status}; expected passed`);
    }
  }
  if ((scan.artifacts ?? []).length === 0) {
    findings.push(`${label} negative evidence scan must include artifacts`);
  }
  return findings;
}

function invalidEvidenceReason(evidence: SuperpowersEvidenceRecord, layerName: string): string | undefined {
  const evidenceText = [evidence.type, evidence.command, ...evidence.artifact_paths, ...evidence.proves, ...evidence.does_not_prove].join("\n");
  const genericShortcut = GENERIC_INVALID_EVIDENCE_TYPE_PATTERNS.find((pattern) => pattern.test(evidenceText));
  if (genericShortcut) {
    return `matches invalid completion evidence ${genericShortcut}`;
  }
  if ((layerName === "worker_runtime" || layerName === "integration" || layerName === "ui_browser") && /\b(unit|mock|viewmodel)\b/i.test(evidence.type)) {
    return "unit, mock or viewmodel evidence is auxiliary only for runtime, worker, integration and UI layers";
  }
  if (layerName === "ui_browser" && /\b(api|schema)\b/i.test(evidence.type)) {
    return "API-only evidence cannot satisfy UI Path AC";
  }
  if (layerName === "ui_browser" && /^screenshot$/i.test(evidence.type)) {
    return "screenshot-only evidence cannot satisfy UI Path AC";
  }
  if ((layerName === "worker_runtime" || layerName === "data_artifact" || layerName === "security_redaction") && /\b(ui|browser|playwright|screenshot)\b/i.test(evidence.type)) {
    return "UI-only evidence cannot satisfy runtime, data or security proof layers";
  }
  return undefined;
}
