import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { pathExists, readText } from "./fs.js";
import { appendSuperpowersEvent } from "./superpowers-task-events.js";
import { computeSourceBundleHash } from "./superpowers-task-attempt.js";
import { normalizeAssertionResult, normalizeNegativeEvidenceScan } from "./superpowers-task-assertions.js";
import { normalizeProofLayerId, normalizeProofLayerName } from "./superpowers-task-fields.js";
import { loadSuperpowersState, saveSuperpowersState, sha256 } from "./superpowers-task-state.js";
import { asStringArray, isRecord, type CommandRunRecord, type SuperpowersEvidenceRecord } from "./superpowers-task-state-schema.js";

export async function runSuperpowersAssertion(
  workdir: string,
  options: { acId: string; proofLayer: string; commandArgs: string[] }
): Promise<CommandRunRecord> {
  if (!options.acId || !options.proofLayer) {
    throw new Error("run-assertion requires --ac <AC-ID> and --proof-layer <layer>");
  }
  if (options.commandArgs.length === 0) {
    throw new Error("run-assertion requires a command after --");
  }
  const state = await loadSuperpowersState(workdir);
  const proofLayer = normalizeProofLayerName(options.proofLayer);
  const spec = (state.required_command_specs ?? []).find(
    (item) => item.ac_id === options.acId && item.proof_layers.map(normalizeProofLayerName).includes(proofLayer)
  );
  if (!spec) {
    throw new Error(`no required command spec for ${options.acId}.${proofLayer}`);
  }
  const startedAt = new Date().toISOString();
  const exitCode = await runCommand(options.commandArgs);
  const endedAt = new Date().toISOString();
  const commandLine = options.commandArgs.join(" ");
  const commandRun: CommandRunRecord = {
    command_run_id: `CR-${compactDate(startedAt)}-${sha256(commandLine).slice(0, 8)}`,
    task_attempt_id: state.current_attempt_id,
    command_spec_id: spec.command_spec_id,
    ac_id: options.acId,
    proof_layer: proofLayer,
    command_line: commandLine,
    exit_code: exitCode,
    started_at: startedAt,
    completed_at: endedAt,
    ended_at: endedAt,
    artifact_paths: []
  };
  state.command_runs = [...(state.command_runs ?? []), commandRun];
  await saveSuperpowersState(workdir, state);
  await appendSuperpowersEvent(workdir, "assertion_command_run", {
    command_run_id: commandRun.command_run_id,
    command_spec_id: commandRun.command_spec_id,
    exit_code: commandRun.exit_code
  });
  return commandRun;
}

export async function recordSuperpowersEvidence(
  workdir: string,
  options: { artifactPath: string; commandRunId: string }
): Promise<SuperpowersEvidenceRecord> {
  const state = await loadSuperpowersState(workdir);
  const commandRun = (state.command_runs ?? []).find((item) => item.command_run_id === options.commandRunId);
  if (!commandRun) {
    throw new Error(`command run not found: ${options.commandRunId}`);
  }
  const artifactPath = path.resolve(options.artifactPath);
  if (!(await pathExists(artifactPath))) {
    throw new Error(`evidence artifact not found: ${options.artifactPath}`);
  }
  const artifactText = await readText(artifactPath);
  const artifact = JSON.parse(artifactText) as unknown;
  const artifactRecord = isRecord(artifact) ? artifact : {};
  const assertion = normalizeAssertionResult(artifactRecord.assertion_result ?? artifactRecord);
  if (!assertion) {
    throw new Error(`evidence artifact is missing assertion_result: ${options.artifactPath}`);
  }
  const stats = await fs.stat(artifactPath);
  const attempt = (state.attempts ?? []).find((item) => item.task_attempt_id === commandRun.task_attempt_id);
  const commandSpec = (state.required_command_specs ?? []).find((item) => item.command_spec_id === commandRun.command_spec_id);
  const layerId = normalizeProofLayerId(`${commandRun.ac_id}.${commandRun.proof_layer}`);
  const relativeArtifactPath = slash(path.relative(workdir, artifactPath));
  const targetPiIds = commandSpec ? (state.graph.acceptance_criteria[commandSpec.ac_id]?.related_plan_items ?? []) : [];
  const negativeScan = normalizeNegativeEvidenceScan(artifactRecord.negative_evidence_scan);
  if (assertion.schema_version === "assertion-result-v2") {
    assertion.target_pi_ids = assertion.target_pi_ids ?? targetPiIds;
    assertion.invalid_completion_signals = assertion.invalid_completion_signals ?? [];
    assertion.required_test_ids = assertion.required_test_ids ?? commandSpec?.required_test_ids ?? [];
    assertion.negative_evidence_scan = assertion.negative_evidence_scan ?? negativeScan;
  }
  const evidence: SuperpowersEvidenceRecord = {
    schema_version: "evidence-record-v2",
    evidence_id: `EV2-${compactDate(new Date().toISOString())}-${sha256(options.commandRunId + artifactText).slice(0, 8)}`,
    task_attempt_id: commandRun.task_attempt_id,
    generated_at: new Date().toISOString(),
    source_bundle_hash: attempt?.source_bundle_hash ?? computeSourceBundleHash(state),
    product_source_hash: attempt?.product_source_hash ?? state.sources.product_architecture_source?.sha256 ?? "",
    technical_plan_hash: attempt?.technical_plan_hash ?? state.sources.technical_realization_plan?.sha256 ?? "",
    acceptance_checklist_hash: attempt?.acceptance_checklist_hash ?? state.sources.acceptance_checklist?.sha256 ?? "",
    git_head: attempt?.git_head ?? "",
    git_status_short: attempt?.git_status_short ?? "",
    tracked_diff_hash: attempt?.tracked_diff_hash ?? "",
    relevant_untracked_hash: attempt?.relevant_untracked_hash ?? "",
    covers_dirty_worktree: Boolean(attempt?.git_status_short?.trim()),
    worktree_fingerprint: attempt?.worktree_fingerprint ?? "",
    command_spec_id: commandRun.command_spec_id,
    command_run_id: commandRun.command_run_id,
    command_line: commandRun.command_line,
    command_exit_code: commandRun.exit_code,
    artifact_path: relativeArtifactPath,
    artifact_sha256: createHash("sha256").update(artifactText).digest("hex"),
    artifact_mtime: stats.mtime.toISOString(),
    target_ac_ids: [commandRun.ac_id],
    target_pi_ids: targetPiIds,
    target_proof_layers: [layerId],
    slice_id: String(artifactRecord.slice_id ?? "attempt-evidence"),
    type: String(artifactRecord.type ?? `${commandRun.proof_layer}_assertion`),
    freshness: { created_at: commandRun.completed_at ?? commandRun.ended_at, valid_for: "current_attempt", stale_after: null },
    command: commandRun.command_line,
    artifact_paths: [relativeArtifactPath],
    proves: [layerId],
    does_not_prove: asStringArray(artifactRecord.does_not_prove).length > 0 ? asStringArray(artifactRecord.does_not_prove) : ["unrelated proof layer"],
    redaction: isRecord(artifactRecord.redaction)
      ? { checked: artifactRecord.redaction.checked === true, contains_secret: artifactRecord.redaction.contains_secret === true }
      : { checked: true, contains_secret: false },
    reviewability: isRecord(artifactRecord.reviewability)
      ? {
          external_reviewer_can_reproduce: artifactRecord.reviewability.external_reviewer_can_reproduce === true,
          reproduction_steps: String(artifactRecord.reviewability.reproduction_steps ?? commandRun.command_line)
        }
      : { external_reviewer_can_reproduce: true, reproduction_steps: commandRun.command_line },
    assertion_result: assertion,
    negative_evidence_scan: negativeScan
  };
  state.evidence = [...(state.evidence ?? []), evidence];
  const proofLayer = state.graph.proof_layers[layerId];
  if (proofLayer && commandRun.exit_code === 0 && assertion.status === "passed") {
    proofLayer.status = "satisfied";
    proofLayer.evidence_ids = [...new Set([...(proofLayer.evidence_ids ?? []), evidence.evidence_id])];
  }
  await saveSuperpowersState(workdir, state);
  await appendSuperpowersEvent(workdir, "evidence_recorded", { evidence_id: evidence.evidence_id, command_run_id: commandRun.command_run_id });
  return evidence;
}

function runCommand(args: string[]): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(args[0], args.slice(1), { cwd: process.cwd(), stdio: "ignore", windowsHide: true });
    child.on("error", () => resolve(1));
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

function compactDate(value: string): string {
  return value.replace(/[-:.TZ]/g, "").slice(0, 17);
}

function slash(value: string): string {
  return value.split(path.sep).join("/");
}
