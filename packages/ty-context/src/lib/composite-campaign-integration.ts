import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { canonicalJson, sha256Hex } from "./composite-campaign-codec.js";
import { assertNoApparentSecretsInDirtyFiles, currentBranch, currentHead, gitStatus, runGit } from "./composite-campaign-git-baseline.js";
import { assertSliceReceiptCurrent, type SliceExecutionReceiptV1 } from "./composite-campaign-receipt.js";
import { readCampaignFinalResult } from "./composite-campaign-final-gate.js";
import { atomic } from "./long-task-status.js";

export interface WaveMergeSliceInput {
  receipt: SliceExecutionReceiptV1;
  worktree: string;
  contract_workdir: string;
}

export interface WaveMergeRecordV1 {
  slice_id: string;
  slice_head: string;
  contract_sha256: string;
  final_receipt_sha256: string;
  merge_commit: string;
}

export interface MergeConflictManifestV1 {
  schema_version: "campaign-merge-conflict-v1";
  campaign_id: string;
  wave_id: string;
  integration_head: string;
  failed_slice_id: string;
  failed_slice_branch: string;
  accepted_receipt_sha256: string;
  conflicted_paths: string[];
  involved_slice_ids: string[];
  manifest_sha256: string;
}

export type WaveMergeResult =
  | { status: "merged"; integration_head: string; merges: WaveMergeRecordV1[]; result_sha256: string }
  | { status: "repair_required"; integration_head: string; conflict_manifest: MergeConflictManifestV1; conflict_manifest_path: string };

export type TargetFinalizeResult =
  | { status: "accepted"; target_commit: string; pushed: boolean }
  | { status: "revalidation_required"; integration_head: string; reason: "target_moved" | "campaign_checkpoint" }
  | { status: "repair_required"; reason: "target_rebase_conflict"; conflicted_paths: string[] }
  | { status: "external_approval_required"; reason: string; target_commit: string };

export async function mergeWaveIntoIntegration(options: {
  campaignRoot: string;
  campaignId: string;
  waveId: string;
  integrationWorktree: string;
  slices: WaveMergeSliceInput[];
}): Promise<WaveMergeResult> {
  const integration = path.resolve(options.integrationWorktree);
  if (!(await gitStatus(integration)).clean) throw new Error("campaign_integration_worktree_not_clean_before_merge");
  const ordered = [...options.slices].sort((left, right) => asciiCompare(left.receipt.slice_id, right.receipt.slice_id));
  const records: WaveMergeRecordV1[] = [];
  for (const slice of ordered) {
    const receipt = slice.receipt;
    if (receipt.campaign_id !== options.campaignId || receipt.wave_id !== options.waveId) throw new Error("campaign_merge_receipt_identity_mismatch");
    await assertSliceReceiptCurrent(slice.worktree, receipt, slice.contract_workdir);
    const branchHead = (await runGit(integration, ["rev-parse", "--verify", `${receipt.branch}^{commit}`])).stdout.trim();
    if (branchHead !== receipt.head_commit) throw new Error(`campaign_merge_branch_head_mismatch:${receipt.slice_id}`);
    const descendant = await runGit(integration, ["merge-base", "--is-ancestor", receipt.base_commit, branchHead], { throwOnError: false });
    if (descendant.exitCode !== 0) throw new Error(`campaign_merge_branch_not_descendant:${receipt.slice_id}`);
    const before = await currentHead(integration);
    const message = `merge(ty-context): campaign ${options.campaignId} wave ${options.waveId} slice ${receipt.slice_id}\n\nCampaign-Id: ${options.campaignId}\nWave-Id: ${options.waveId}\nSlice-Id: ${receipt.slice_id}\nSlice-Head: ${receipt.head_commit}\nContract-SHA256: ${receipt.contract_sha256}\nFinal-Receipt-SHA256: ${receipt.receipt_sha256}`;
    const merge = await runGit(integration, ["-c", "commit.gpgSign=false", "merge", "--no-ff", "--no-edit", "-m", message, receipt.branch], { timeoutMs: 120_000, throwOnError: false });
    if (merge.exitCode !== 0) {
      const conflicts = await conflictedPaths(integration);
      await runGit(integration, ["merge", "--abort"], { throwOnError: false });
      const afterAbort = await currentHead(integration);
      if (afterAbort !== before) throw new Error("campaign_merge_abort_did_not_restore_head");
      const manifestBase = {
        schema_version: "campaign-merge-conflict-v1" as const,
        campaign_id: options.campaignId,
        wave_id: options.waveId,
        integration_head: before,
        failed_slice_id: receipt.slice_id,
        failed_slice_branch: receipt.branch,
        accepted_receipt_sha256: receipt.receipt_sha256,
        conflicted_paths: conflicts,
        involved_slice_ids: ordered.map((item) => item.receipt.slice_id).sort(asciiCompare)
      };
      const manifest: MergeConflictManifestV1 = { ...manifestBase, manifest_sha256: sha256Hex(canonicalJson(manifestBase)) };
      const manifestPath = path.join(path.resolve(options.campaignRoot), "waves", options.waveId, "repairs", `merge-${receipt.slice_id}.json`);
      await atomic(manifestPath, manifest);
      return { status: "repair_required", integration_head: before, conflict_manifest: manifest, conflict_manifest_path: manifestPath };
    }
    const mergeCommit = await currentHead(integration);
    records.push({ slice_id: receipt.slice_id, slice_head: receipt.head_commit, contract_sha256: receipt.contract_sha256, final_receipt_sha256: receipt.receipt_sha256, merge_commit: mergeCommit });
  }
  const integrationHead = await currentHead(integration);
  const resultBase = { status: "merged" as const, integration_head: integrationHead, merges: records };
  return { ...resultBase, result_sha256: sha256Hex(canonicalJson(resultBase)) };
}

export async function assertMergeConflictManifest(file: string): Promise<MergeConflictManifestV1> {
  const value = JSON.parse(await readFile(file, "utf8")) as MergeConflictManifestV1;
  if (value.schema_version !== "campaign-merge-conflict-v1") throw new Error("campaign_merge_conflict_manifest_invalid");
  const { manifest_sha256, ...identity } = value;
  if (manifest_sha256 !== sha256Hex(canonicalJson(identity))) throw new Error("campaign_merge_conflict_manifest_hash_mismatch");
  return value;
}

export async function finalizeCampaignTarget(options: {
  repositoryRoot: string;
  campaignId: string;
  campaignRoot: string;
  integrationWorktree: string;
  integrationBranch: string;
  targetBranch: string;
  campaignFinalResultFile: string;
  push?: boolean;
}): Promise<TargetFinalizeResult> {
  const repository = path.resolve(options.repositoryRoot);
  const integration = path.resolve(options.integrationWorktree);
  if (await currentBranch(repository) !== options.targetBranch) throw new Error("campaign_target_branch_not_checked_out");
  if (await currentBranch(integration) !== options.integrationBranch) throw new Error("campaign_integration_branch_mismatch");
  const finalResult = await readCampaignFinalResult(options.campaignFinalResultFile);
  if (finalResult.workflow_status !== "ready_to_merge") throw new Error("campaign_final_gate_not_ready");
  if (await currentHead(integration) !== finalResult.integration_head) throw new Error("campaign_integration_changed_after_final_gate");
  const campaignRelative = path.relative(repository, path.resolve(options.campaignRoot)).replace(/\\/gu, "/");
  if (campaignRelative.startsWith("..") || path.isAbsolute(campaignRelative)) throw new Error("campaign_root_outside_target_repository");
  const stash = await stashCampaignState(repository, campaignRelative, options.campaignId);
  try {
    const remaining = await gitStatus(repository);
    if (!remaining.clean) {
      await assertNoApparentSecretsInDirtyFiles(repository, remaining);
      await runGit(repository, ["add", "-A"]);
      await runGit(repository, ["commit", "--no-gpg-sign", "-m", `chore(ty-context): checkpoint before campaign ${options.campaignId} finalization`], { timeoutMs: 120_000 });
      const rebased = await rebaseIntegrationOntoTarget(integration, options.targetBranch);
      if (rebased.status === "repair_required") return rebased;
      return { status: "revalidation_required", integration_head: await currentHead(integration), reason: "campaign_checkpoint" };
    }
    await fetchTargetUpstream(repository, options.targetBranch);
    const upstream = await upstreamRef(repository, options.targetBranch);
    if (upstream) {
      const behind = await runGit(repository, ["merge-base", "--is-ancestor", options.targetBranch, upstream], { throwOnError: false });
      if (behind.exitCode === 0 && await currentHead(repository, options.targetBranch) !== await currentHead(repository, upstream)) await runGit(repository, ["merge", "--ff-only", upstream], { timeoutMs: 120_000 });
    }
    const targetHead = await currentHead(repository, options.targetBranch);
    const targetIsAncestor = await runGit(integration, ["merge-base", "--is-ancestor", targetHead, finalResult.integration_head], { throwOnError: false });
    if (targetIsAncestor.exitCode !== 0) {
      const rebased = await rebaseIntegrationOntoTarget(integration, options.targetBranch);
      if (rebased.status === "repair_required") return rebased;
      return { status: "revalidation_required", integration_head: await currentHead(integration), reason: "target_moved" };
    }
    await runGit(repository, ["merge", "--ff-only", options.integrationBranch], { timeoutMs: 120_000 });
    const targetCommit = await currentHead(repository);
    if (targetCommit !== finalResult.integration_head) throw new Error("campaign_target_fast_forward_identity_mismatch");
    let pushed = false;
    if (options.push !== false && upstream) {
      const push = await runGit(repository, ["push"], { timeoutMs: 120_000, throwOnError: false });
      if (push.exitCode !== 0) {
        const reason = classifyPushFailure(push.stderr);
        if (reason === "protected_branch_external_approval_required") {
          const remote = (await runGit(repository, ["config", "--get", `branch.${options.targetBranch}.remote`], { throwOnError: false })).stdout.trim();
          const pullRequest = remote && remote !== "." ? await openAutomaticPullRequest(repository, remote, options.targetBranch, options.integrationBranch, options.campaignId) : null;
          return { status: "external_approval_required", reason: pullRequest ? `automatic_pull_request_opened:${pullRequest}` : "protected_branch_automatic_pull_request_unavailable", target_commit: targetCommit };
        }
        return { status: "external_approval_required", reason, target_commit: targetCommit };
      }
      pushed = true;
    }
    return { status: "accepted", target_commit: targetCommit, pushed };
  } finally {
    if (stash) await runGit(repository, ["stash", "pop", "--index", stash], { timeoutMs: 120_000 });
  }
}

async function conflictedPaths(root: string): Promise<string[]> {
  const output = (await runGit(root, ["diff", "--name-only", "--diff-filter=U", "-z"], { throwOnError: false })).stdout;
  return output.split("\0").map((item) => item.trim()).filter(Boolean).sort(asciiCompare);
}

async function stashCampaignState(repository: string, campaignRelative: string, campaignId: string): Promise<string | null> {
  const before = await runGit(repository, ["rev-parse", "--verify", "refs/stash"], { throwOnError: false });
  await runGit(repository, ["stash", "push", "--include-untracked", "--message", `ty-context campaign ${campaignId} finalization`, "--", campaignRelative], { throwOnError: false });
  const after = await runGit(repository, ["rev-parse", "--verify", "refs/stash"], { throwOnError: false });
  if (after.exitCode !== 0 || !after.stdout.trim() || (before.exitCode === 0 && before.stdout.trim() === after.stdout.trim())) return null;
  return "stash@{0}";
}

async function rebaseIntegrationOntoTarget(integration: string, targetBranch: string): Promise<{ status: "rebased" } | { status: "repair_required"; reason: "target_rebase_conflict"; conflicted_paths: string[] }> {
  const rebase = await runGit(integration, ["rebase", "--rebase-merges", targetBranch], { timeoutMs: 120_000, throwOnError: false });
  if (rebase.exitCode === 0) return { status: "rebased" };
  const conflicts = await conflictedPaths(integration);
  await runGit(integration, ["rebase", "--abort"], { throwOnError: false });
  return { status: "repair_required", reason: "target_rebase_conflict", conflicted_paths: conflicts };
}

async function upstreamRef(repository: string, branch: string): Promise<string | null> {
  const result = await runGit(repository, ["rev-parse", "--abbrev-ref", "--symbolic-full-name", `${branch}@{upstream}`], { throwOnError: false });
  return result.exitCode === 0 && result.stdout.trim() ? result.stdout.trim() : null;
}

async function fetchTargetUpstream(repository: string, branch: string): Promise<void> {
  const upstream = await upstreamRef(repository, branch);
  if (!upstream) return;
  const remote = (await runGit(repository, ["config", "--get", `branch.${branch}.remote`], { throwOnError: false })).stdout.trim();
  if (remote && remote !== ".") await runGit(repository, ["fetch", "--prune", remote], { timeoutMs: 120_000 });
}

function classifyPushFailure(stderr: string): string {
  if (/authentication|permission denied|could not read|credential|mfa/iu.test(stderr)) return "git_auth_or_mfa_required";
  if (/protected branch|pre-receive hook declined|pull request|required review/iu.test(stderr)) return "protected_branch_external_approval_required";
  if (/non-fast-forward|fetch first|rejected/iu.test(stderr)) return "target_moved_during_push";
  return "git_push_failed_external_action_required";
}

async function openAutomaticPullRequest(repository: string, remote: string, targetBranch: string, integrationBranch: string, campaignId: string): Promise<string | null> {
  const published = await runGit(repository, ["push", "--set-upstream", remote, integrationBranch], { timeoutMs: 120_000, throwOnError: false });
  if (published.exitCode !== 0) return null;
  const existing = await runGh(repository, ["pr", "view", integrationBranch, "--json", "url", "--jq", ".url"]);
  if (existing.exitCode === 0 && /^https:\/\//u.test(existing.stdout.trim())) return existing.stdout.trim();
  const created = await runGh(repository, [
    "pr", "create", "--base", targetBranch, "--head", integrationBranch,
    "--title", `ty-context Campaign ${campaignId}`,
    "--body", `Automated integration pull request for ty-context Campaign ${campaignId}. Campaign acceptance remains pending until the target branch contains this integration and the final gate is rerun.`
  ]);
  return created.exitCode === 0 ? created.stdout.split(/\r?\n/u).map((line) => line.trim()).find((line) => /^https:\/\//u.test(line)) ?? null : null;
}

async function runGh(cwd: string, args: string[]): Promise<{ exitCode: number; stdout: string }> {
  return new Promise((resolve) => {
    const child = spawn("gh", args, { cwd, shell: false, windowsHide: true, env: { ...process.env, GH_PROMPT_DISABLED: "1", GIT_TERMINAL_PROMPT: "0" }, stdio: ["ignore", "pipe", "ignore"] });
    const chunks: Buffer[] = []; let bytes = 0; let settled = false;
    const finish = (exitCode: number) => { if (settled) return; settled = true; clearTimeout(timer); resolve({ exitCode, stdout: Buffer.concat(chunks).toString("utf8").slice(0, 64 * 1024) }); };
    child.stdout.on("data", (chunk: Buffer) => { bytes += chunk.length; if (bytes <= 64 * 1024) chunks.push(Buffer.from(chunk)); else child.kill("SIGKILL"); });
    child.on("error", () => finish(-1)); child.on("close", (code) => finish(code ?? -1));
    const timer = setTimeout(() => { child.kill("SIGKILL"); finish(-1); }, 120_000);
  });
}

function asciiCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
