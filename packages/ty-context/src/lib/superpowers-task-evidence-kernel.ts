import { deriveRequiredCommandSpecs, requiredCommandSpecsHash } from "./superpowers-task-command-specs.js";
import { evaluateAc010Bootstrap } from "./superpowers-task-ac010.js";
import { evaluateCurrentAttemptArtifact } from "./superpowers-task-current-evidence.js";
import { scanSuperpowersContradictions } from "./superpowers-task-contradictions.js";
import { detectHarnessDrift } from "./superpowers-task-harness-drift.js";
import { evaluateProtectedBaseline } from "./superpowers-task-protected-baseline.js";
import { evaluateProofLayerAssertions, isMachineVerifiableLayer } from "./superpowers-task-assertions.js";
import { findUnderSpecifiedAcs } from "./superpowers-task-under-specified.js";
import { loadSuperpowersState, sourceRecords } from "./superpowers-task-state.js";
import {
  isRecord,
  type CommandRunRecord,
  type ExecutionAttempt,
  type RequiredCommandSpec,
  type SuperpowersEvidenceRecord,
  type SuperpowersTaskState
} from "./superpowers-task-state-schema.js";

export interface TrustedEvidenceKernelResult {
  product_goal_complete: boolean;
  acceptance_target_status: "complete" | "partial" | "blocked" | "invalidated" | "under_specified";
  errors: string[];
  ac_statuses: Record<string, string>;
  pi_statuses: Record<string, string>;
  stale_evidence_ids: string[];
  harness_task_final_verdict?: "passed" | "failed";
}

export async function evaluateTrustedEvidenceKernel(workdir: string, providedState?: SuperpowersTaskState): Promise<TrustedEvidenceKernelResult> {
  const state = providedState ?? (await loadSuperpowersState(workdir));
  const errors: string[] = [];
  const acStatuses: Record<string, string> = {};
  const staleEvidenceIds = new Set<string>();
  const attempt = currentAttempt(state);
  const currentSources = await sourceRecords(workdir);

  if (!attempt) {
    errors.push("missing current attempt: final-gate requires current_attempt_id with ExecutionAttempt");
  } else {
    validateAttemptAgainstSources(state, attempt, currentSources, errors);
  }

  const expectedSpecs = deriveRequiredCommandSpecs(state);
  validateRequiredSpecs(state, attempt, expectedSpecs, errors);

  const underSpecified = new Map(findUnderSpecifiedAcs(state).map((item) => [item.ac_id, item.reasons]));
  for (const reasons of underSpecified.values()) {
    errors.push(...reasons);
  }

  const contradictionScan = await scanSuperpowersContradictions(workdir, state);
  errors.push(...contradictionScan.errors);
  const drift = detectHarnessDrift(state);
  errors.push(...drift.errors);
  const baseline = evaluateProtectedBaseline(state);
  errors.push(...baseline.errors);

  const evidenceById = new Map((state.evidence ?? []).map((evidence) => [evidence.evidence_id, evidence]));
  for (const [acId, ac] of Object.entries(state.graph?.acceptance_criteria ?? {})) {
    const acErrors: string[] = [];
    if (underSpecified.has(acId)) {
      acStatuses[acId] = "under_specified";
      continue;
    }
    const requiredLayers = ac.required_proof_layers ?? [];
    const spec = specForAc(state, expectedSpecs, acId);
    if ((ac.machine_blocking === true || ac.assertion_result_required === true) && !spec) {
      acErrors.push(`${acId} missing required_command_spec`);
    }
    if (spec) {
      acErrors.push(...validateCommandRunsForSpec(state, attempt, spec));
    }
    for (const layerName of requiredLayers) {
      const layerId = `${acId}.${layerName}`;
      const layer = state.graph.proof_layers?.[layerId];
      if (!layer || layer.status !== "satisfied") {
        acErrors.push(`${layerId} missing current satisfied proof layer`);
        continue;
      }
      if (isMachineVerifiableLayer(layerId)) {
        const evaluation = evaluateProofLayerAssertions(state, layerId);
        acErrors.push(...evaluation.blocking_assertion_failures, ...evaluation.negative_evidence_findings);
        for (const evidenceId of layer.evidence_ids ?? []) {
          const evidence = evidenceById.get(evidenceId);
          if (!evidence) {
            acErrors.push(`${layerId} references unregistered evidence ${evidenceId}`);
            continue;
          }
          acErrors.push(...validateEvidenceAgainstSpec(state, evidence, spec, layerId));
          acErrors.push(...(await evaluateCurrentAttemptArtifact(workdir, evidence, layerId)));
          if (isStaleEvidenceError(acErrors)) {
            staleEvidenceIds.add(evidence.evidence_id);
          }
        }
      }
    }
    errors.push(...acErrors);
    acStatuses[acId] = statusForAcErrors(acErrors, requiredLayers.length);
  }

  const ac010 = evaluateAc010Bootstrap(state, acStatuses);
  for (const acId of ac010.invalidated_ac_ids) {
    acStatuses[acId] = "invalidated";
  }
  errors.push(...ac010.errors);

  const piStatuses = recomputePlanStatuses(state, acStatuses);
  const allAcsComplete = Object.keys(state.graph?.acceptance_criteria ?? {}).length > 0 &&
    Object.values(acStatuses).every((status) => status === "complete" || status === "out_of_scope_NA");
  const allPisComplete = Object.keys(state.graph?.plan_items ?? {}).length > 0 &&
    Object.values(piStatuses).every((status) => status === "complete" || status === "out_of_scope_NA");
  const uniqueErrors = unique(errors);
  const productComplete = uniqueErrors.length === 0 && allAcsComplete && allPisComplete && drift.product_goal_complete !== false && baseline.product_goal_complete !== false;
  return {
    product_goal_complete: productComplete,
    acceptance_target_status: productComplete ? "complete" : statusForGlobalErrors(uniqueErrors, acStatuses),
    errors: uniqueErrors,
    ac_statuses: acStatuses,
    pi_statuses: piStatuses,
    stale_evidence_ids: [...staleEvidenceIds],
    harness_task_final_verdict: drift.harness_task_final_verdict
  };
}

export function applyTrustedEvidenceKernelResult(state: SuperpowersTaskState, result: TrustedEvidenceKernelResult): void {
  for (const [acId, status] of Object.entries(result.ac_statuses)) {
    const ac = state.graph.acceptance_criteria[acId];
    if (ac) {
      ac.status = status as typeof ac.status;
    }
  }
  for (const [piId, status] of Object.entries(result.pi_statuses)) {
    const pi = state.graph.plan_items[piId];
    if (pi) {
      pi.status = status as typeof pi.status;
    }
  }
  state.final.product_goal_complete = result.product_goal_complete;
  state.meta.product_goal_complete = result.product_goal_complete;
  state.final.acceptance_target_status = result.acceptance_target_status;
  state.meta.acceptance_target_status = result.acceptance_target_status;
  state.final.audit_task_complete = true;
  state.meta.audit_task_complete = true;
  state.final.completion_basis = result.product_goal_complete
    ? ["trusted_evidence_kernel", "current_attempt_evidence", "negative_evidence_scan_passed", "harness_drift_lock_passed"]
    : [];
  state.final.next_required_actions = result.product_goal_complete ? [] : result.errors.slice(0, 12);
  state.gates.final_gate = {
    status: result.product_goal_complete ? "pass" : result.acceptance_target_status,
    kernel: "trusted_evidence_kernel",
    order: [
      "load_three_inputs",
      "recompute_source_hashes",
      "load_task_state",
      "load_current_attempt",
      "load_command_run_records",
      "load_registered_evidence_records",
      "discard_stale_evidence",
      "contradiction_scan",
      "recompute_every_ac",
      "recompute_every_pi",
      "recompute_acceptance_target_status",
      "recompute_product_goal_complete",
      "regenerate_derived",
      "append_event"
    ],
    errors: result.errors,
    stale_evidence_ids: result.stale_evidence_ids,
    harness_task_final_verdict: result.harness_task_final_verdict,
    next_required_actions: state.final.next_required_actions
  };
}

function validateAttemptAgainstSources(
  state: SuperpowersTaskState,
  attempt: ExecutionAttempt,
  currentSources: SuperpowersTaskState["sources"],
  errors: string[]
): void {
  const productHash = currentSources.product_architecture_source?.sha256 ?? "";
  const planHash = currentSources.technical_realization_plan?.sha256 ?? "";
  const checklistHash = currentSources.acceptance_checklist?.sha256 ?? "";
  for (const [key, source] of Object.entries(currentSources)) {
    const expected = state.sources[key]?.sha256;
    if (expected && source.sha256 !== expected) {
      errors.push(`source hash mismatch for ${key}: expected ${expected}, actual ${source.sha256}; recompile graph before final-gate`);
    }
  }
  if (attempt.product_source_hash !== productHash) {
    errors.push("source hash mismatch: current attempt product_source_hash does not match product-architecture-source.md");
  }
  if (attempt.technical_plan_hash !== planHash) {
    errors.push("source hash mismatch: current attempt technical_plan_hash does not match technical-realization-plan.md");
  }
  if (attempt.acceptance_checklist_hash !== checklistHash) {
    errors.push("source hash mismatch: current attempt acceptance_checklist_hash does not match acceptance-checklist.md");
  }
  for (const field of [
    "task_attempt_id",
    "source_bundle_hash",
    "product_source_hash",
    "technical_plan_hash",
    "acceptance_checklist_hash",
    "git_head",
    "git_status_short",
    "tracked_diff_hash",
    "relevant_untracked_hash",
    "worktree_fingerprint",
    "started_at",
    "required_command_specs_hash",
    "mode"
  ] as const) {
    if (!attempt[field]) {
      errors.push(`current attempt missing required field ${field}`);
    }
  }
}

function validateRequiredSpecs(
  state: SuperpowersTaskState,
  attempt: ExecutionAttempt | undefined,
  expectedSpecs: RequiredCommandSpec[],
  errors: string[]
): void {
  const expectedByAc = new Map(expectedSpecs.map((spec) => [spec.ac_id, spec]));
  for (const [acId, ac] of Object.entries(state.graph?.acceptance_criteria ?? {})) {
    if (ac.machine_blocking !== true && ac.assertion_result_required !== true) {
      continue;
    }
    const expected = expectedByAc.get(acId);
    const actual = (state.required_command_specs ?? []).find((spec) => spec.ac_id === acId);
    if (!expected || !actual) {
      errors.push(`${acId} missing required_command_spec`);
      continue;
    }
    if (actual.command_spec_id !== expected.command_spec_id) {
      errors.push(`${acId} command_spec_id mismatch; required command specs must be recompiled from Acceptance Checklist`);
    }
  }
  if (attempt) {
    const specsHash = requiredCommandSpecsHash(state.required_command_specs ?? []);
    if (attempt.required_command_specs_hash !== specsHash) {
      errors.push("required_command_specs_hash mismatch for current attempt");
    }
  }
}

function validateCommandRunsForSpec(state: SuperpowersTaskState, attempt: ExecutionAttempt | undefined, spec: RequiredCommandSpec): string[] {
  const errors: string[] = [];
  for (const proofLayer of spec.proof_layers.filter((layer) => isMachineVerifiableLayer(`${spec.ac_id}.${layer}`))) {
    const run = (state.command_runs ?? []).find(
      (item) =>
        item.task_attempt_id === state.current_attempt_id &&
        item.command_spec_id === spec.command_spec_id &&
        item.ac_id === spec.ac_id &&
        item.proof_layer === proofLayer
    );
    if (!run) {
      errors.push(`${spec.ac_id}.${proofLayer} missing current attempt command-run record for command_spec_id ${spec.command_spec_id}`);
      continue;
    }
    errors.push(...validateCommandRun(run, attempt));
  }
  return errors;
}

function validateCommandRun(run: CommandRunRecord, attempt: ExecutionAttempt | undefined): string[] {
  const errors: string[] = [];
  if (attempt && run.task_attempt_id !== attempt.task_attempt_id) {
    errors.push(`${run.command_run_id} stale command run from ${run.task_attempt_id}; expected ${attempt.task_attempt_id}`);
  }
  if (run.exit_code !== 0) {
    errors.push(`${run.command_run_id} command_exit_code=${run.exit_code}; expected 0`);
  }
  if (!run.command_line.trim()) {
    errors.push(`${run.command_run_id} missing command_line`);
  }
  return errors;
}

function validateEvidenceAgainstSpec(
  state: SuperpowersTaskState,
  evidence: SuperpowersEvidenceRecord,
  spec: RequiredCommandSpec | undefined,
  layerId: string
): string[] {
  if (!spec) {
    return [];
  }
  const errors: string[] = [];
  const assertion = evidence.assertion_result;
  const label = `proof layer ${layerId} evidence ${evidence.evidence_id}`;
  const expectedPiIds = state.graph.acceptance_criteria[spec.ac_id]?.related_plan_items ?? [];
  const targetPiIds = evidence.target_pi_ids ?? assertion?.target_pi_ids ?? [];
  for (const piId of expectedPiIds) {
    if (!targetPiIds.includes(piId)) {
      errors.push(`${label} target_pi_ids ${targetPiIds.join(", ") || "(none)"} do not include ${piId}`);
    }
  }
  if (assertion) {
    const assertionIds = new Set(assertion.positive_assertions.map((item) => item.id));
    for (const id of spec.positive_assertions ?? []) {
      if (!assertionIds.has(id)) {
        errors.push(`${label} missing positive assertion ${id}`);
      }
    }
    const negativeIds = new Set(assertion.negative_assertions.map((item) => item.id));
    for (const id of spec.negative_assertions ?? []) {
      if (!negativeIds.has(id)) {
        errors.push(`${label} missing negative assertion ${id}`);
      }
    }
    const requiredTests = new Set(assertion.required_test_ids ?? []);
    for (const testId of spec.required_test_ids ?? []) {
      if (!requiredTests.has(testId)) {
        errors.push(`${label} assertion_result.required_test_ids missing ${testId}`);
      }
    }
    const invalidChecks = [
      ...((assertion.invalid_completion_signals ?? []).map((item) => `${item.id} ${item.forbidden_text ?? ""}`)),
      ...((assertion.negative_evidence_scan?.invalid_completion_signals_checked ?? []).map((item) => String(item)))
    ].join("\n");
    for (const signal of spec.invalid_completion_signals ?? []) {
      if (!invalidChecks.includes(signal)) {
        errors.push(`${label} invalid_completion_signals did not check ${signal}`);
      }
    }
  }
  return errors;
}

function specForAc(state: SuperpowersTaskState, expectedSpecs: RequiredCommandSpec[], acId: string): RequiredCommandSpec | undefined {
  const actual = (state.required_command_specs ?? []).find((spec) => spec.ac_id === acId);
  if (actual) {
    return actual;
  }
  return expectedSpecs.find((spec) => spec.ac_id === acId);
}

function statusForAcErrors(errors: string[], requiredLayerCount: number): string {
  if (requiredLayerCount === 0) {
    return "not_run";
  }
  const text = errors.join("\n");
  if (!text) {
    return "complete";
  }
  if (/under_specified/i.test(text)) {
    return "under_specified";
  }
  if (/stale|failed|invalid|contradiction|negative evidence|forbidden|bootstrap/i.test(text)) {
    return "invalidated";
  }
  if (/blocked|harness_drift|protected_baseline|source hash mismatch/i.test(text)) {
    return "blocked";
  }
  return "partial";
}

function recomputePlanStatuses(state: SuperpowersTaskState, acStatuses: Record<string, string>): Record<string, string> {
  const statuses: Record<string, string> = {};
  for (const [planId, item] of Object.entries(state.graph?.plan_items ?? {})) {
    const relatedStatuses = (item.related_acs ?? []).map((acId) => acStatuses[acId] ?? state.graph.acceptance_criteria[acId]?.status ?? "not_run");
    if (relatedStatuses.length > 0 && relatedStatuses.every((status) => status === "complete" || status === "out_of_scope_NA")) {
      statuses[planId] = "complete";
    } else if (relatedStatuses.some((status) => status === "under_specified" || status === "blocked")) {
      statuses[planId] = "blocked";
    } else if (relatedStatuses.some((status) => status === "invalidated")) {
      statuses[planId] = "invalidated";
    } else if (relatedStatuses.some((status) => status === "partial")) {
      statuses[planId] = "partial";
    } else {
      statuses[planId] = "not_started";
    }
  }
  return statuses;
}

function statusForGlobalErrors(errors: string[], acStatuses: Record<string, string>): TrustedEvidenceKernelResult["acceptance_target_status"] {
  const text = errors.join("\n");
  if (Object.values(acStatuses).includes("under_specified") || /under_specified/i.test(text)) {
    return "under_specified";
  }
  if (/harness_drift|protected_baseline|source hash mismatch|missing current attempt|required_command_specs_hash|harness_task_missing/i.test(text)) {
    return "blocked";
  }
  if (/stale|failed|invalid|contradiction|negative evidence|forbidden|bootstrap/i.test(text)) {
    return "invalidated";
  }
  return "partial";
}

function currentAttempt(state: SuperpowersTaskState): ExecutionAttempt | undefined {
  return (state.attempts ?? []).find((item) => item.task_attempt_id === state.current_attempt_id) ?? (state.attempts ?? []).at(-1);
}

function isStaleEvidenceError(errors: string[]): boolean {
  return errors.some((error) => /stale evidence|source_bundle_hash mismatch|artifact_sha256 mismatch|artifact_mtime/i.test(error));
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
