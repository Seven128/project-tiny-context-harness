import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { appendSuperpowersEvent } from "./superpowers-task-events.js";
import { requiredCommandSpecsHash } from "./superpowers-task-command-specs.js";
import { loadSuperpowersState, saveSuperpowersState, sha256, stableJson } from "./superpowers-task-state.js";
import type { ExecutionAttempt, SuperpowersAttemptMode, SuperpowersTaskState } from "./superpowers-task-state-schema.js";

const execFileAsync = promisify(execFile);

export async function startSuperpowersAttempt(
  workdir: string,
  state: SuperpowersTaskState,
  mode: SuperpowersAttemptMode = "product_task"
): Promise<ExecutionAttempt> {
  const now = new Date().toISOString();
  const specsHash = requiredCommandSpecsHash(state.required_command_specs ?? []);
  const sourceBundleHash = computeSourceBundleHash(state, specsHash);
  const git = await readGitIdentity(workdir);
  const worktreeFingerprint = sha256(stableJson(git));
  const attemptOrdinal = (state.attempts ?? []).length + 1;
  const attempt: ExecutionAttempt = {
    task_attempt_id: `ATT-${compactDate(now)}-${attemptOrdinal}-${sourceBundleHash.slice(0, 8)}`,
    source_bundle_hash: sourceBundleHash,
    product_source_hash: state.sources.product_architecture_source?.sha256 ?? "",
    technical_plan_hash: state.sources.technical_realization_plan?.sha256 ?? "",
    acceptance_checklist_hash: state.sources.acceptance_checklist?.sha256 ?? "",
    git_head: git.git_head,
    git_status_short: git.git_status_short,
    tracked_diff_hash: git.tracked_diff_hash,
    relevant_untracked_hash: git.relevant_untracked_hash,
    untracked_relevant_hash: git.relevant_untracked_hash,
    worktree_fingerprint: worktreeFingerprint,
    started_at: now,
    ended_at: null,
    finalized_at: null,
    required_command_specs_hash: specsHash,
    mode,
    changed_files: git.changed_files
  };
  state.attempts = [...(state.attempts ?? []).filter((item) => item.task_attempt_id !== attempt.task_attempt_id), attempt];
  state.current_attempt_id = attempt.task_attempt_id;
  return attempt;
}

export async function startAndSaveSuperpowersAttempt(workdir: string, mode: SuperpowersAttemptMode = "product_task"): Promise<ExecutionAttempt> {
  const state = await loadSuperpowersState(workdir);
  const attempt = await startSuperpowersAttempt(workdir, state, mode);
  await saveSuperpowersState(workdir, state);
  await appendSuperpowersEvent(workdir, "attempt_started", { task_attempt_id: attempt.task_attempt_id });
  return attempt;
}

export function computeSourceBundleHash(state: SuperpowersTaskState, specsHash = requiredCommandSpecsHash(state.required_command_specs ?? [])): string {
  return sha256(
    stableJson({
      product_source_hash: state.sources.product_architecture_source?.sha256 ?? "",
      technical_plan_hash: state.sources.technical_realization_plan?.sha256 ?? "",
      acceptance_checklist_hash: state.sources.acceptance_checklist?.sha256 ?? "",
      required_command_specs_hash: specsHash
    })
  );
}

async function readGitIdentity(workdir: string): Promise<{
  git_head: string;
  git_status_short: string;
  tracked_diff_hash: string;
  relevant_untracked_hash: string;
  changed_files: string[];
}> {
  const head = await git(workdir, ["rev-parse", "HEAD"]);
  if (!head.ok) {
    return {
      git_head: "no-git",
      git_status_short: "no-git",
      tracked_diff_hash: sha256("no-git-tracked-diff"),
      relevant_untracked_hash: "ignored:no-git",
      changed_files: []
    };
  }
  const status = await git(workdir, ["status", "--short"]);
  const diff = await git(workdir, ["diff", "--binary"]);
  const stagedDiff = await git(workdir, ["diff", "--cached", "--binary"]);
  const untracked = await git(workdir, ["ls-files", "--others", "--exclude-standard"]);
  const trackedNames = await git(workdir, ["diff", "--name-only"]);
  const stagedNames = await git(workdir, ["diff", "--cached", "--name-only"]);
  const changedFiles = unique([
    ...lines(trackedNames.ok ? trackedNames.stdout : ""),
    ...lines(stagedNames.ok ? stagedNames.stdout : ""),
    ...lines(untracked.ok ? untracked.stdout : "")
  ]);
  return {
    git_head: head.stdout.trim(),
    git_status_short: status.ok ? status.stdout.trim() : "git-status-unavailable",
    tracked_diff_hash: sha256(`${diff.ok ? diff.stdout : "git-diff-unavailable"}\n${stagedDiff.ok ? stagedDiff.stdout : ""}`),
    relevant_untracked_hash: untracked.ok && untracked.stdout.trim() ? sha256(untracked.stdout.trim()) : "none",
    changed_files: changedFiles
  };
}

async function git(workdir: string, args: string[]): Promise<{ ok: boolean; stdout: string }> {
  try {
    const result = await execFileAsync("git", args, { cwd: workdir, windowsHide: true, timeout: 10000 });
    return { ok: true, stdout: result.stdout };
  } catch {
    return { ok: false, stdout: "" };
  }
}

function compactDate(value: string): string {
  return value.replace(/[-:.TZ]/g, "").slice(0, 14);
}

function lines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim().replace(/\\/g, "/"))
    .filter(Boolean);
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
