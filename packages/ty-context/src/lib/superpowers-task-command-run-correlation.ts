import { isMachineVerifiableLayer } from "./superpowers-task-assertions.js";
import { normalizeProofLayerName } from "./superpowers-task-fields.js";
import { requiredCommandSpecsHash } from "./superpowers-task-command-specs.js";
import type { CommandRunRecord, ExecutionAttempt, RequiredCommandSpec, SuperpowersEvidenceRecord, SuperpowersTaskState } from "./superpowers-task-state-schema.js";

export interface CommandRunCorrelationResult {
  errors: string[];
  invalidated_evidence_ids: string[];
}

export function validateRequiredCommandCorrelation(
  state: SuperpowersTaskState,
  attempt: ExecutionAttempt | undefined,
  expectedSpecs: RequiredCommandSpec[]
): CommandRunCorrelationResult {
  const errors: string[] = [];
  const invalidated = new Set<string>();
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

  for (const spec of expectedSpecs) {
    errors.push(...validateCommandRunsForSpec(state, attempt, spec));
  }

  for (const finding of findFailedCommandInvalidations(state)) {
    invalidated.add(finding.evidence_id);
    errors.push(
      `${finding.evidence_id} newer failed command invalidates older passed evidence for ${finding.ac_id}.${finding.proof_layer}: ${finding.command_run_id}`
    );
  }

  return { errors: unique(errors), invalidated_evidence_ids: [...invalidated] };
}

export function validateCommandRunsForSpec(state: SuperpowersTaskState, attempt: ExecutionAttempt | undefined, spec: RequiredCommandSpec): string[] {
  const errors: string[] = [];
  for (const proofLayer of spec.proof_layers.filter((layer) => isMachineVerifiableLayer(`${spec.ac_id}.${layer}`))) {
    const run = (state.command_runs ?? []).find(
      (item) =>
        item.task_attempt_id === state.current_attempt_id &&
        item.command_spec_id === spec.command_spec_id &&
        item.ac_id === spec.ac_id &&
        normalizeProofLayerName(item.proof_layer) === normalizeProofLayerName(proofLayer)
    );
    if (!run) {
      errors.push(`${spec.ac_id}.${proofLayer} missing current attempt command-run record for command_spec_id ${spec.command_spec_id}`);
      continue;
    }
    errors.push(...validateCommandRun(run, attempt));
  }
  return errors;
}

export function validateCommandRun(run: CommandRunRecord, attempt: ExecutionAttempt | undefined): string[] {
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
  if (!run.started_at) {
    errors.push(`${run.command_run_id} missing started_at`);
  }
  if (!run.completed_at) {
    errors.push(`${run.command_run_id} missing completed_at`);
  }
  if (!run.task_attempt_id) {
    errors.push(`${run.command_run_id} missing attempt_id`);
  }
  return errors;
}

function findFailedCommandInvalidations(state: SuperpowersTaskState): Array<{
  evidence_id: string;
  command_run_id: string;
  ac_id: string;
  proof_layer: string;
}> {
  const evidence = state.evidence ?? [];
  const failedRuns = (state.command_runs ?? []).filter((run) => run.task_attempt_id === state.current_attempt_id && Number(run.exit_code) !== 0);
  return failedRuns.flatMap((run) =>
    evidence
      .filter((item) => evidenceTargetsRunLayer(item, run) && evidencePredatesRun(item, run))
      .map((item) => ({
        evidence_id: item.evidence_id,
        command_run_id: run.command_run_id,
        ac_id: run.ac_id,
        proof_layer: run.proof_layer
      }))
  );
}

function evidenceTargetsRunLayer(evidence: SuperpowersEvidenceRecord, run: CommandRunRecord): boolean {
  const layerId = `${run.ac_id}.${normalizeProofLayerName(run.proof_layer)}`;
  const targetLayers = (evidence.target_proof_layers ?? evidence.assertion_result?.target_proof_layers ?? []).map((item) =>
    item.includes(".") ? item : `${run.ac_id}.${normalizeProofLayerName(item)}`
  );
  return (
    evidence.task_attempt_id === run.task_attempt_id &&
    (evidence.target_ac_ids ?? evidence.assertion_result?.target_ac_ids ?? []).includes(run.ac_id) &&
    (targetLayers.includes(layerId) || evidence.proves.includes(layerId))
  );
}

function evidencePredatesRun(evidence: SuperpowersEvidenceRecord, run: CommandRunRecord): boolean {
  const evidenceTime = Date.parse(evidence.generated_at ?? evidence.freshness?.created_at ?? evidence.artifact_mtime ?? "");
  const runTime = Date.parse(run.started_at || run.completed_at || run.ended_at || "");
  if (Number.isNaN(evidenceTime) || Number.isNaN(runTime)) {
    return true;
  }
  return evidenceTime <= runTime;
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
