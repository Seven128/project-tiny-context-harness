import { readFile } from "node:fs/promises";
import path from "node:path";
import { canonicalJson, sha256Hex } from "./composite-campaign-codec.js";
import {
  currentHead,
  gitStatus,
  runGit,
} from "./composite-campaign-git-baseline.js";
import {
  assertSliceReceiptCurrent,
  type SliceExecutionReceiptV2,
  type SliceExecutionReceiptV3,
} from "./composite-campaign-receipt.js";
import { atomic } from "./long-task-status.js";

export {
  finalizeCampaignTarget,
  type TargetFinalizeResult,
} from "./composite-campaign-target-finalization.js";

export interface WaveMergeSliceInput {
  receipt: SliceExecutionReceiptV2 | SliceExecutionReceiptV3;
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
  | {
      status: "merged";
      integration_head: string;
      merges: WaveMergeRecordV1[];
      result_sha256: string;
    }
  | {
      status: "repair_required";
      integration_head: string;
      conflict_manifest: MergeConflictManifestV1;
      conflict_manifest_path: string;
    };

export async function mergeWaveIntoIntegration(options: {
  campaignRoot: string;
  campaignId: string;
  waveId: string;
  integrationWorktree: string;
  slices: WaveMergeSliceInput[];
}): Promise<WaveMergeResult> {
  const integration = path.resolve(options.integrationWorktree);
  if (!(await gitStatus(integration)).clean)
    throw new Error("campaign_integration_worktree_not_clean_before_merge");
  const ordered = [...options.slices].sort((left, right) =>
    asciiCompare(left.receipt.slice_id, right.receipt.slice_id),
  );
  const records: WaveMergeRecordV1[] = [];
  for (const slice of ordered) {
    const receipt = slice.receipt;
    if (
      receipt.campaign_id !== options.campaignId ||
      receipt.wave_id !== options.waveId
    )
      throw new Error("campaign_merge_receipt_identity_mismatch");
    await assertSliceReceiptCurrent(
      slice.worktree,
      receipt,
      slice.contract_workdir,
    );
    const mergeTarget =
      receipt.schema_version === "slice-execution-receipt-v3"
        ? receipt.head_commit
        : receipt.branch;
    const branchHead = (
      await runGit(integration, [
        "rev-parse",
        "--verify",
        `${mergeTarget}^{commit}`,
      ])
    ).stdout.trim();
    if (branchHead !== receipt.head_commit)
      throw new Error(
        `campaign_merge_branch_head_mismatch:${receipt.slice_id}`,
      );
    const descendant = await runGit(
      integration,
      ["merge-base", "--is-ancestor", receipt.base_commit, branchHead],
      { throwOnError: false },
    );
    if (descendant.exitCode !== 0)
      throw new Error(
        `campaign_merge_branch_not_descendant:${receipt.slice_id}`,
      );
    const before = await currentHead(integration);
    const message = `merge(ty-context): campaign ${options.campaignId} wave ${options.waveId} slice ${receipt.slice_id}\n\nCampaign-Id: ${options.campaignId}\nWave-Id: ${options.waveId}\nSlice-Id: ${receipt.slice_id}\nSlice-Head: ${receipt.head_commit}\nContract-SHA256: ${receipt.contract_sha256}\nFinal-Receipt-SHA256: ${receipt.receipt_sha256}`;
    const merge = await runGit(
      integration,
      [
        "-c",
        "commit.gpgSign=false",
        "merge",
        "--no-ff",
        "--no-edit",
        "-m",
        message,
        mergeTarget,
      ],
      { timeoutMs: 120_000, throwOnError: false },
    );
    if (merge.exitCode !== 0) {
      const conflicts = await conflictedPaths(integration);
      await runGit(integration, ["merge", "--abort"], { throwOnError: false });
      const afterAbort = await currentHead(integration);
      if (afterAbort !== before)
        throw new Error("campaign_merge_abort_did_not_restore_head");
      const manifestBase = {
        schema_version: "campaign-merge-conflict-v1" as const,
        campaign_id: options.campaignId,
        wave_id: options.waveId,
        integration_head: before,
        failed_slice_id: receipt.slice_id,
        failed_slice_branch: mergeTarget,
        accepted_receipt_sha256: receipt.receipt_sha256,
        conflicted_paths: conflicts,
        involved_slice_ids: ordered
          .map((item) => item.receipt.slice_id)
          .sort(asciiCompare),
      };
      const manifest: MergeConflictManifestV1 = {
        ...manifestBase,
        manifest_sha256: sha256Hex(canonicalJson(manifestBase)),
      };
      const manifestPath = path.join(
        path.resolve(options.campaignRoot),
        "waves",
        options.waveId,
        "repairs",
        `merge-${receipt.slice_id}.json`,
      );
      await atomic(manifestPath, manifest);
      return {
        status: "repair_required",
        integration_head: before,
        conflict_manifest: manifest,
        conflict_manifest_path: manifestPath,
      };
    }
    const mergeCommit = await currentHead(integration);
    records.push({
      slice_id: receipt.slice_id,
      slice_head: receipt.head_commit,
      contract_sha256: receipt.contract_sha256,
      final_receipt_sha256: receipt.receipt_sha256,
      merge_commit: mergeCommit,
    });
  }
  const integrationHead = await currentHead(integration);
  const resultBase = {
    status: "merged" as const,
    integration_head: integrationHead,
    merges: records,
  };
  return { ...resultBase, result_sha256: sha256Hex(canonicalJson(resultBase)) };
}

export async function assertMergeConflictManifest(
  file: string,
): Promise<MergeConflictManifestV1> {
  const value = JSON.parse(
    await readFile(file, "utf8"),
  ) as MergeConflictManifestV1;
  if (value.schema_version !== "campaign-merge-conflict-v1")
    throw new Error("campaign_merge_conflict_manifest_invalid");
  const { manifest_sha256, ...identity } = value;
  if (manifest_sha256 !== sha256Hex(canonicalJson(identity)))
    throw new Error("campaign_merge_conflict_manifest_hash_mismatch");
  return value;
}

async function conflictedPaths(root: string): Promise<string[]> {
  const output = (
    await runGit(root, ["diff", "--name-only", "--diff-filter=U", "-z"], {
      throwOnError: false,
    })
  ).stdout;
  return output
    .split("\0")
    .map((item) => item.trim())
    .filter(Boolean)
    .sort(asciiCompare);
}

function asciiCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
