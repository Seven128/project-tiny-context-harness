import path from "node:path";
import { pathExists, readText } from "./fs.js";
import { findSensitiveEvidence } from "./plan-acceptance-evidence.js";
import { primitiveText, repoRelative, resolveInputDir } from "./plan-validator-common.js";
import { derivedMatchesState } from "./superpowers-task-derive.js";
import { validatePlanCompletionConformance } from "./superpowers-task-conformance.js";
import { scanSuperpowersContradictions } from "./superpowers-task-contradictions.js";
import { evaluateTrustedEvidenceKernel } from "./superpowers-task-evidence-kernel.js";
import { fullPopulationRequired, validateDeliveryContract, validateScopeConflicts } from "./superpowers-task-delivery.js";
import { hasUsableShape, validateShape } from "./superpowers-task-state-shape.js";
import { loadSuperpowersState, sha256 } from "./superpowers-task-state.js";
import { validateCanonicalStatuses } from "./superpowers-task-status.js";
import { isRecord, type SuperpowersEvidenceRecord, type SuperpowersTaskState } from "./superpowers-task-state-schema.js";
import { evaluateProofLayerAssertions, isUiBrowserLayer, proofLayerName } from "./superpowers-task-assertions.js";
import {
  completionOutputContractFromState,
  completionPhraseFindingMessages,
  scanGeneratedCompletionOutputSurfaces
} from "./superpowers-task-completion-output.js";
import type { ValidatorReport } from "./validators.js";
export async function validateSuperpowersState(projectRoot: string, args: string[] = []): Promise<ValidatorReport> {
  const info: string[] = [];
  const warnings: string[] = [];
  const hygiene: string[] = [];
  const errors: string[] = [];
  const targetDir = await resolveInputDir(projectRoot, args[0], "tmp/ty-context/plan-acceptance");
  const statePath = path.join(targetDir, "task-state.json");
  if (!(await pathExists(statePath))) {
    return { info, warnings, hygiene, errors: [`superpowers task state is missing: ${repoRelative(projectRoot, statePath)}`] };
  }
  let state: SuperpowersTaskState;
  try {
    state = await loadSuperpowersState(targetDir);
  } catch (error) {
    return { info, warnings, hygiene, errors: [`${repoRelative(projectRoot, statePath)} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`] };
  }

  validateShape(state, errors);
  if (!hasUsableShape(state)) {
    info.push("checked superpowers task state with unusable or incomplete shape");
    return { info, warnings, hygiene, errors };
  }
  await validateSourceHashes(targetDir, state, errors);
  validateDeliveryContract(state, errors);
  validateCanonicalStatuses(state, errors);
  validateGraphReferences(state, errors);
  validatePlanCompletionConformance(state, errors);
  validateScopeConflicts(state, errors);
  validateEvidenceRecords(state, errors);
  validateProofLayers(state, errors);
  errors.push(...(await evaluateTrustedEvidenceKernel(targetDir, state)).errors);
  errors.push(...(await scanSuperpowersContradictions(targetDir, state)).errors);
  validateAuditor(state, errors);
  validateFinalCompletion(state, errors);
  errors.push(...(await derivedMatchesState(targetDir, state)));
  await validateCompletionOutputConsistency(targetDir, state, errors);

  info.push(
    `checked superpowers task state ${repoRelative(projectRoot, targetDir)} plan_items=${Object.keys(state.graph?.plan_items ?? {}).length} acs=${Object.keys(state.graph?.acceptance_criteria ?? {}).length} evidence=${state.evidence?.length ?? 0}`
  );
  if (errors.length === 0) {
    info.push("Superpowers task state validation passed");
  }
  return { info, warnings, hygiene, errors };
}

async function validateCompletionOutputConsistency(workdir: string, state: SuperpowersTaskState, errors: string[]): Promise<void> {
  const contract = completionOutputContractFromState(state);
  const finalRecord = state.final as SuperpowersTaskState["final"] & {
    completion_output_status?: string;
    final_answer_allowed?: boolean;
    required_user_visible_status?: string;
    exit_code?: number;
  };
  const gate = isRecord(state.gates?.final_gate) ? state.gates.final_gate : {};
  const storedStatus = finalRecord.completion_output_status ?? (typeof gate.completion_output_status === "string" ? gate.completion_output_status : undefined);
  if (storedStatus && storedStatus !== contract.completion_output_status) {
    errors.push(`completion_output_status mismatch: expected ${contract.completion_output_status}, found ${storedStatus}`);
  }
  if (contract.completion_output_status === "accept" && state.final.product_goal_complete !== true) {
    errors.push("completion_output_status=accept but product_goal_complete is not true");
  }
  if (finalRecord.final_answer_allowed !== undefined && finalRecord.final_answer_allowed !== contract.final_answer_allowed) {
    errors.push(`final_answer_allowed mismatch: expected ${contract.final_answer_allowed}, found ${finalRecord.final_answer_allowed}`);
  }
  if (finalRecord.required_user_visible_status && finalRecord.required_user_visible_status !== contract.required_user_visible_status) {
    errors.push(
      `required_user_visible_status mismatch: expected ${contract.required_user_visible_status}, found ${finalRecord.required_user_visible_status}`
    );
  }
  if (finalRecord.exit_code !== undefined && finalRecord.exit_code !== contract.exit_code) {
    errors.push(`completion output exit_code mismatch: expected ${contract.exit_code}, found ${finalRecord.exit_code}`);
  }
  errors.push(...completionPhraseFindingMessages(await scanGeneratedCompletionOutputSurfaces(workdir, contract)));
  await validateMarkdownCompletionStatus(workdir, contract.completion_output_status, errors);
}

async function validateMarkdownCompletionStatus(workdir: string, expectedStatus: string, errors: string[]): Promise<void> {
  for (const relative of ["derived/final-summary.md", "derived/final-card.md", "derived/local-audit.md"]) {
    const file = path.join(workdir, ...relative.split("/"));
    if (!(await pathExists(file))) {
      continue;
    }
    const text = await readText(file);
    const match = /^completion_output_status:\s*(\S+)\s*$/im.exec(text);
    if (match && match[1] !== expectedStatus) {
      errors.push(`${relative} completion_output_status mismatch: expected ${expectedStatus}, found ${match[1]}`);
    }
  }
}

async function validateSourceHashes(workdir: string, state: SuperpowersTaskState, errors: string[]): Promise<void> {
  for (const [key, source] of Object.entries(state.sources ?? {})) {
    const file = path.join(workdir, source.path);
    if (!(await pathExists(file))) {
      errors.push(`source file is missing for ${key}: ${source.path}`);
      continue;
    }
    const actual = sha256(await readText(file));
    if (actual !== source.sha256) {
      errors.push(`source hash mismatch for ${key}: expected ${source.sha256}, actual ${actual}; recompile graph before continuing`);
    }
  }
}

function validateGraphReferences(state: SuperpowersTaskState, errors: string[]): void {
  const planIds = new Set(Object.keys(state.graph?.plan_items ?? {}));
  const acIds = new Set(Object.keys(state.graph?.acceptance_criteria ?? {}));
  for (const [planId, item] of Object.entries(state.graph?.plan_items ?? {})) {
    for (const acId of item.related_acs ?? []) {
      if (!acIds.has(acId)) {
        errors.push(`plan item ${planId} references unknown AC: ${acId}`);
      }
    }
    for (const layerId of item.required_proof_layers ?? []) {
      if (!state.graph.proof_layers[layerId]) {
        errors.push(`plan item ${planId} references unknown proof layer: ${layerId}`);
      }
    }
  }
  for (const [acId, ac] of Object.entries(state.graph?.acceptance_criteria ?? {})) {
    for (const planId of ac.related_plan_items ?? []) {
      if (!planIds.has(planId)) {
        errors.push(`AC ${acId} references unknown plan item: ${planId}`);
      }
    }
    for (const layer of ac.required_proof_layers ?? []) {
      const layerId = `${acId}.${layer}`;
      if (!state.graph.proof_layers[layerId]) {
        errors.push(`AC ${acId} references unknown proof layer: ${layerId}`);
      }
    }
  }
}

function validateEvidenceRecords(state: SuperpowersTaskState, errors: string[]): void {
  const ids = new Set<string>();
  for (const [index, evidence] of (state.evidence ?? []).entries()) {
    const label = `evidence ${evidence.evidence_id || index + 1}`;
    if (!evidence.evidence_id) {
      errors.push(`${label} is missing evidence_id`);
    } else if (ids.has(evidence.evidence_id)) {
      errors.push(`${label} duplicates evidence_id`);
    }
    ids.add(evidence.evidence_id);
    if (!evidence.slice_id) {
      errors.push(`${label} is missing slice_id`);
    }
    if ((evidence.proves ?? []).length === 0) {
      errors.push(`${label} is missing proves`);
    }
    if ((evidence.does_not_prove ?? []).length === 0) {
      errors.push(`${label} is missing does_not_prove`);
    }
    if (!evidence.freshness?.created_at || !evidence.freshness.valid_for) {
      errors.push(`${label} is missing freshness`);
    }
    if (evidence.freshness?.stale_after && Date.parse(evidence.freshness.stale_after) < Date.now()) {
      errors.push(`${label} is stale evidence: ${evidence.freshness.stale_after}`);
    }
    if (evidence.redaction?.checked !== true) {
      errors.push(`${label} redaction.checked must be true`);
    }
    if (evidence.redaction?.contains_secret === true) {
      errors.push(`${label} redaction contains_secret is true`);
    }
    if (evidence.reviewability?.external_reviewer_can_reproduce !== true || !evidence.reviewability.reproduction_steps) {
      errors.push(`${label} is not reviewable by an external reviewer`);
    }
    const sensitive = findSensitiveEvidence(primitiveText(evidence));
    if (sensitive) {
      errors.push(`${label} contains raw secret/token/cookie material: ${sensitive}`);
    }
    if (evidence.sibling_substitution_used === true && !evidence.sibling_substitution_approval_source) {
      errors.push(`${label} uses sibling substitution without approval`);
    }
    for (const proofLayer of evidence.proves ?? []) {
      const layerName = proofLayerName(proofLayer);
      if (layerName === "worker_runtime" && /\b(mock|unit|viewmodel)\b/i.test(evidence.type)) {
        errors.push(`${label} worker_runtime proof cannot be mock/unit/viewmodel only`);
      }
      if (layerName === "ui_browser" && !/(browser|ui_browser|screenshot|playwright)/i.test(evidence.type)) {
        errors.push(`${label} UI proof must use browser owner surface evidence`);
      }
    }
  }
}

function validateProofLayers(state: SuperpowersTaskState, errors: string[]): void {
  const evidenceById = new Map((state.evidence ?? []).map((item) => [item.evidence_id, item]));
  for (const [layerId, layer] of Object.entries(state.graph?.proof_layers ?? {})) {
    if (layer.status === "satisfied" && layer.evidence_ids.length === 0) {
      errors.push(`proof layer ${layerId} is satisfied but has no evidence_ids`);
    }
    for (const evidenceId of layer.evidence_ids ?? []) {
      const evidence = evidenceById.get(evidenceId);
      if (!evidence) {
        errors.push(`proof layer ${layerId} references unknown evidence_id: ${evidenceId}`);
        continue;
      }
      if (!evidence.proves.includes(layerId)) {
        errors.push(`proof layer ${layerId} references ${evidenceId} but that evidence does not prove it`);
      }
    }
    if (layer.status === "satisfied") {
      const evaluation = evaluateProofLayerAssertions(state, layerId);
      errors.push(...evaluation.blocking_assertion_failures, ...evaluation.negative_evidence_findings);
      if (isUiBrowserLayer(layerId) && evaluation.assertion_status !== "passed") {
        errors.push(`proof layer ${layerId} ui_browser proof not machine-backed`);
      }
    }
  }
}

function validateAuditor(state: SuperpowersTaskState, errors: string[]): void {
  const auditor = state.gates?.auditor;
  if (!isRecord(auditor)) {
    return;
  }
  const status = String(auditor.auditor_status ?? "").toLowerCase();
  const findings = Array.isArray(auditor.findings) ? auditor.findings : [];
  if (status === "blocking_gap" || findings.some((finding) => isRecord(finding) && String(finding.severity ?? "").toLowerCase() === "blocking")) {
    errors.push(`auditor blocker remains: ${findings.map((finding) => (isRecord(finding) ? finding.id : "")).filter(Boolean).join(", ") || status}`);
  }
}

function validateFinalCompletion(state: SuperpowersTaskState, errors: string[]): void {
  const finalComplete = state.final?.product_goal_complete === true || state.meta?.product_goal_complete === true;
  if (!finalComplete) {
    return;
  }
  const planEntries = Object.entries(state.graph.plan_items);
  const acEntries = Object.entries(state.graph.acceptance_criteria);
  const layerEntries = Object.entries(state.graph.proof_layers);
  if (planEntries.length === 0 || acEntries.length === 0 || layerEntries.length === 0) {
    errors.push("product_goal_complete=true but task graph is empty or uncompiled");
  }
  const incompleteAcs = acEntries.filter(([, ac]) => ac.status !== "complete" && ac.status !== "out_of_scope_NA");
  const incompletePlans = planEntries.filter(([, item]) => item.status !== "complete" && item.status !== "out_of_scope_NA");
  const incompleteLayers = layerEntries.filter(([, layer]) => layer.required && layer.status !== "satisfied");
  if (incompleteAcs.length > 0 || incompletePlans.length > 0 || incompleteLayers.length > 0) {
    errors.push("product_goal_complete=true but required plan items, ACs or proof layers are incomplete");
  }
  if (state.context.product_context_delta === "required" || state.context.technical_context_delta === "required") {
    const unresolvedCoverage = (state.context.source_to_context_coverage ?? []).filter((row) =>
      /\b(new_context_required|needs_user_decision|under_scoped)\b/i.test(primitiveText(row))
    );
    if (unresolvedCoverage.length > 0) {
      errors.push("product_goal_complete=true but Context Delta coverage is unresolved");
    }
  }
  validateFullPopulationEvidence(state, errors);
}

function validateFullPopulationEvidence(state: SuperpowersTaskState, errors: string[]): void {
  if (fullPopulationRequired(state)) {
    const sampleOnlyEvidence = state.evidence.filter((evidence) =>
      evidence.does_not_prove.some((claim) => /\b(full[-_ ]?population|all[-_ ]?provider|all[-_ ]?interface|all[-_ ]?platform)\b/i.test(claim))
    );
    if (sampleOnlyEvidence.length > 0) {
      errors.push(
        `product_goal_complete=true but full-population completion relies on evidence that explicitly does not prove full population coverage: ${sampleOnlyEvidence
          .map((evidence) => evidence.evidence_id)
          .join(", ")}`
      );
    }
  }
}

export function completionConditionErrors(state: SuperpowersTaskState): string[] {
  const errors: string[] = [];
  validateShape(state, errors);
  if (!hasUsableShape(state)) {
    return errors;
  }
  validateDeliveryContract(state, errors);
  validateScopeConflicts(state, errors);
  validateGraphReferences(state, errors);
  validatePlanCompletionConformance(state, errors);
  validateEvidenceRecords(state, errors);
  validateProofLayers(state, errors);
  validateAuditor(state, errors);
  validateFullPopulationEvidence(state, errors);
  const planItems = Object.values(state.graph.plan_items);
  const acceptanceCriteria = Object.values(state.graph.acceptance_criteria);
  const proofLayers = Object.values(state.graph.proof_layers);
  const allPlansComplete = planItems.every((item) => item.status === "complete" || item.status === "out_of_scope_NA");
  const allAcsComplete = acceptanceCriteria.every((ac) => ac.status === "complete" || ac.status === "out_of_scope_NA");
  const allLayersSatisfied = proofLayers.every((layer) => !layer.required || layer.status === "satisfied");
  if (planItems.length === 0 || acceptanceCriteria.length === 0 || proofLayers.length === 0) {
    errors.push("completion conditions require a compiled task graph with plan items, ACs and proof layers");
  }
  if (!allPlansComplete || !allAcsComplete || !allLayersSatisfied) {
    errors.push("completion conditions require all required plan items, ACs and proof layers to be complete");
  }
  return errors;
}

export function allCompletionConditionsSatisfied(state: SuperpowersTaskState): boolean {
  return completionConditionErrors(state).length === 0;
}
