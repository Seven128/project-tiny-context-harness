import { normalizeAssertionResult, normalizeNegativeEvidenceScan } from "./superpowers-task-assertion-normalizers.js";
import { normalizeProofLayerId } from "./superpowers-task-fields.js";
import { asStringArray, isRecord, type SuperpowersEvidenceRecord } from "./superpowers-task-state-schema.js";

export function readEvidenceRecords(value: unknown): SuperpowersEvidenceRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isRecord).map((item) => ({
    evidence_id: String(item.evidence_id ?? item.evidenceId ?? ""),
    schema_version: item.schema_version === undefined ? undefined : String(item.schema_version),
    task_attempt_id: item.task_attempt_id === undefined ? undefined : String(item.task_attempt_id),
    source_bundle_hash: item.source_bundle_hash === undefined ? undefined : String(item.source_bundle_hash),
    product_source_hash: item.product_source_hash === undefined ? undefined : String(item.product_source_hash),
    technical_plan_hash: item.technical_plan_hash === undefined ? undefined : String(item.technical_plan_hash),
    acceptance_checklist_hash: item.acceptance_checklist_hash === undefined ? undefined : String(item.acceptance_checklist_hash),
    git_head: item.git_head === undefined ? undefined : String(item.git_head),
    worktree_fingerprint: item.worktree_fingerprint === undefined ? undefined : String(item.worktree_fingerprint),
    command_spec_id: item.command_spec_id === undefined ? undefined : String(item.command_spec_id),
    command_run_id: item.command_run_id === undefined ? undefined : String(item.command_run_id),
    command_line: item.command_line === undefined ? undefined : String(item.command_line),
    artifact_path: item.artifact_path === undefined ? undefined : String(item.artifact_path),
    artifact_sha256: item.artifact_sha256 === undefined ? undefined : String(item.artifact_sha256),
    artifact_mtime: item.artifact_mtime === undefined ? undefined : String(item.artifact_mtime),
    target_ac_ids: asStringArray(item.target_ac_ids),
    target_pi_ids: asStringArray(item.target_pi_ids),
    target_proof_layers: asStringArray(item.target_proof_layers).map(normalizeProofLayerId),
    slice_id: String(item.slice_id ?? item.sliceId ?? ""),
    type: String(item.type ?? ""),
    freshness: isRecord(item.freshness)
      ? {
          created_at: String(item.freshness.created_at ?? ""),
          valid_for: String(item.freshness.valid_for ?? ""),
          stale_after: item.freshness.stale_after === null ? null : item.freshness.stale_after === undefined ? null : String(item.freshness.stale_after)
        }
      : { created_at: "", valid_for: "", stale_after: null },
    command: item.command === undefined ? undefined : String(item.command),
    command_exit_code: item.command_exit_code === undefined ? undefined : Number(item.command_exit_code),
    artifact_paths: asStringArray(item.artifact_paths),
    proves: asStringArray(item.proves).map(normalizeProofLayerId),
    does_not_prove: asStringArray(item.does_not_prove).map((claim) => (claim.includes(".") ? normalizeProofLayerId(claim) : claim)),
    redaction: isRecord(item.redaction)
      ? { checked: item.redaction.checked === true, contains_secret: item.redaction.contains_secret === true }
      : { checked: false, contains_secret: false },
    reviewability: isRecord(item.reviewability)
      ? {
          external_reviewer_can_reproduce: item.reviewability.external_reviewer_can_reproduce === true,
          reproduction_steps: String(item.reviewability.reproduction_steps ?? "")
        }
      : { external_reviewer_can_reproduce: false, reproduction_steps: "" },
    assertion_result: normalizeAssertionResult(item.assertion_result),
    negative_evidence_scan: normalizeNegativeEvidenceScan(item.negative_evidence_scan),
    sibling_substitution_used: item.sibling_substitution_used === true,
    sibling_substitution_approval_source:
      item.sibling_substitution_approval_source === undefined ? undefined : String(item.sibling_substitution_approval_source)
  }));
}
