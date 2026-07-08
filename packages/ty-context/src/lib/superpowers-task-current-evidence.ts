import { createHash } from "node:crypto";
import path from "node:path";
import { pathExists, readText } from "./fs.js";
import { normalizeProofLayerName } from "./superpowers-task-fields.js";
import type { SuperpowersEvidenceRecord, SuperpowersTaskState } from "./superpowers-task-state-schema.js";

export function evaluateCurrentAttemptEvidence(
  state: SuperpowersTaskState,
  evidence: SuperpowersEvidenceRecord,
  layerId: string
): string[] {
  if (!state.current_attempt_id) {
    return [];
  }
  const failures: string[] = [];
  const label = `proof layer ${layerId} evidence ${evidence.evidence_id}`;
  if (evidence.schema_version !== "evidence-record-v2") {
    failures.push(`${label} must be EvidenceRecordV2 for current-attempt machine completion`);
  }
  if (evidence.task_attempt_id !== state.current_attempt_id) {
    failures.push(`${label} stale evidence from old attempt ${evidence.task_attempt_id || "(missing)"}; expected current attempt ${state.current_attempt_id}`);
  }
  for (const field of [
    "generated_at",
    "source_bundle_hash",
    "product_source_hash",
    "technical_plan_hash",
    "acceptance_checklist_hash",
    "git_head",
    "git_status_short",
    "tracked_diff_hash",
    "relevant_untracked_hash",
    "worktree_fingerprint",
    "command_spec_id",
    "command_run_id",
    "command_line",
    "artifact_path",
    "artifact_sha256",
    "artifact_mtime"
  ] as const) {
    if (!evidence[field]) {
      failures.push(`${label} EvidenceRecordV2 missing ${field}`);
    }
  }
  const attempt = state.attempts?.find((item) => item.task_attempt_id === state.current_attempt_id);
  if (attempt && evidence.source_bundle_hash && evidence.source_bundle_hash !== attempt.source_bundle_hash) {
    failures.push(`${label} stale evidence source_bundle_hash mismatch for current attempt`);
  }
  if (attempt && evidence.product_source_hash && evidence.product_source_hash !== attempt.product_source_hash) {
    failures.push(`${label} stale evidence product_source_hash mismatch for current attempt`);
  }
  if (attempt && evidence.technical_plan_hash && evidence.technical_plan_hash !== attempt.technical_plan_hash) {
    failures.push(`${label} stale evidence technical_plan_hash mismatch for current attempt`);
  }
  if (attempt && evidence.acceptance_checklist_hash && evidence.acceptance_checklist_hash !== attempt.acceptance_checklist_hash) {
    failures.push(`${label} stale evidence acceptance_checklist_hash mismatch for current attempt`);
  }
  if (attempt && evidence.git_head && evidence.git_head !== attempt.git_head) {
    failures.push(`${label} stale evidence git_head mismatch for current attempt`);
  }
  if (attempt && evidence.git_status_short !== undefined && evidence.git_status_short !== attempt.git_status_short) {
    failures.push(`${label} stale evidence git_status_short mismatch for current attempt`);
  }
  if (attempt && evidence.tracked_diff_hash !== undefined && evidence.tracked_diff_hash !== attempt.tracked_diff_hash) {
    failures.push(`${label} stale evidence tracked_diff_hash mismatch for current attempt`);
  }
  if (attempt && evidence.relevant_untracked_hash !== undefined && evidence.relevant_untracked_hash !== attempt.relevant_untracked_hash) {
    failures.push(`${label} stale evidence relevant_untracked_hash mismatch for current attempt`);
  }
  if (attempt && evidence.worktree_fingerprint && evidence.worktree_fingerprint !== attempt.worktree_fingerprint) {
    failures.push(`${label} stale evidence worktree_fingerprint mismatch for current attempt`);
  }
  if (attempt && (attempt.git_status_short || attempt.relevant_untracked_hash !== "none") && evidence.covers_dirty_worktree !== true) {
    failures.push(`${label} dirty worktree evidence must set covers_dirty_worktree=true for current attempt`);
  }
  if (attempt && evidence.generated_at && Date.parse(evidence.generated_at) < Date.parse(attempt.started_at)) {
    failures.push(`${label} stale evidence generated_at predates current attempt`);
  }
  if (attempt && evidence.artifact_mtime && Date.parse(evidence.artifact_mtime) < Date.parse(attempt.started_at)) {
    failures.push(`${label} stale evidence artifact_mtime predates current attempt`);
  }
  const commandRun = state.command_runs?.find((item) => item.command_run_id === evidence.command_run_id);
  if (!commandRun) {
    failures.push(`${label} missing command run ${evidence.command_run_id || "(missing)"}`);
  } else {
    if (commandRun.task_attempt_id !== state.current_attempt_id) {
      failures.push(`${label} command run ${commandRun.command_run_id} is from old attempt ${commandRun.task_attempt_id}`);
    }
    if (commandRun.exit_code !== 0) {
      failures.push(`${label} command run ${commandRun.command_run_id} exit_code=${commandRun.exit_code}; expected 0`);
    }
    if (!commandRun.completed_at) {
      failures.push(`${label} command run ${commandRun.command_run_id} missing completed_at`);
    }
    if (commandRun.command_spec_id !== evidence.command_spec_id) {
      failures.push(`${label} command_spec_id mismatch between evidence and command run`);
    }
  }
  const commandSpec = state.required_command_specs?.find((item) => item.command_spec_id === evidence.command_spec_id);
  if (!commandSpec) {
    failures.push(`${label} missing required command spec ${evidence.command_spec_id || "(missing)"}`);
  } else if (commandSpec.ac_id !== proofLayerAcId(layerId) || !commandSpec.proof_layers.map(normalizeProofLayerName).includes(proofLayerName(layerId))) {
    failures.push(`${label} command spec does not cover ${layerId}`);
  }
  const ac = state.graph.acceptance_criteria?.[proofLayerAcId(layerId)];
  const targetAcIds = evidence.target_ac_ids ?? evidence.assertion_result?.target_ac_ids ?? [];
  if (!targetAcIds.includes(proofLayerAcId(layerId))) {
    failures.push(`${label} target_ac_ids ${targetAcIds.join(", ") || "(none)"} do not include ${proofLayerAcId(layerId)}`);
  }
  const expectedPiIds = ac?.related_plan_items ?? [];
  const targetPiIds = evidence.target_pi_ids ?? evidence.assertion_result?.target_pi_ids ?? [];
  for (const piId of expectedPiIds) {
    if (!targetPiIds.includes(piId)) {
      failures.push(`${label} target_pi_ids ${targetPiIds.join(", ") || "(none)"} do not include related plan item ${piId}`);
    }
  }
  const targetLayers = (evidence.target_proof_layers ?? evidence.assertion_result?.target_proof_layers ?? []).map(normalizeLayerId);
  if (!targetLayers.includes(normalizeLayerId(layerId)) && !targetLayers.includes(proofLayerName(layerId))) {
    failures.push(`${label} target_proof_layers ${targetLayers.join(", ") || "(none)"} do not include ${layerId}`);
  }
  if (evidence.assertion_result?.schema_version !== "assertion-result-v2") {
    failures.push(`${label} assertion_result.schema_version must be assertion-result-v2 for current-attempt machine completion`);
  }
  return failures;
}

export async function evaluateCurrentAttemptArtifact(
  workdir: string,
  evidence: SuperpowersEvidenceRecord,
  layerId: string
): Promise<string[]> {
  const label = `proof layer ${layerId} evidence ${evidence.evidence_id}`;
  return validateArtifact(workdir, evidence, label);
}

async function validateArtifact(workdir: string, evidence: SuperpowersEvidenceRecord, label: string): Promise<string[]> {
  const failures: string[] = [];
  if (!evidence.artifact_path) {
    failures.push(`${label} EvidenceRecordV2 missing artifact_path`);
    return failures;
  }
  const artifact = await resolveArtifactPath(workdir, evidence.artifact_path);
  if (!artifact) {
    failures.push(`${label} artifact_path does not exist: ${evidence.artifact_path}`);
    return failures;
  }
  if (evidence.artifact_sha256) {
    const actual = createHash("sha256").update(await readText(artifact)).digest("hex");
    if (actual !== evidence.artifact_sha256) {
      failures.push(`${label} stale evidence artifact_sha256 mismatch for ${evidence.artifact_path}`);
    }
  }
  return failures;
}

async function resolveArtifactPath(workdir: string, artifactPath: string): Promise<string | undefined> {
  const candidates = path.isAbsolute(artifactPath) ? [artifactPath] : [path.join(workdir, artifactPath), path.join(projectRootFromWorkdir(workdir), artifactPath)];
  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

function proofLayerName(layerId: string): string {
  const raw = layerId.includes(".") ? layerId.slice(layerId.lastIndexOf(".") + 1) : layerId;
  return normalizeProofLayerName(raw);
}

function proofLayerAcId(layerId: string): string {
  return layerId.includes(".") ? layerId.slice(0, layerId.lastIndexOf(".")) : "";
}

function normalizeLayerId(layerId: string): string {
  if (!layerId.includes(".")) {
    return normalizeProofLayerName(layerId);
  }
  const acId = proofLayerAcId(layerId);
  return `${acId}.${proofLayerName(layerId)}`;
}

function projectRootFromWorkdir(workdir: string): string {
  const normalized = workdir.replace(/\\/g, "/");
  const marker = "/tmp/ty-context/plan-acceptance/";
  const index = normalized.lastIndexOf(marker);
  if (index < 0) {
    return workdir;
  }
  return normalized.slice(0, index);
}
