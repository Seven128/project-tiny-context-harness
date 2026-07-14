import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { canonicalJson, sha256Hex } from "./composite-campaign-codec.js";
import {
  currentBranch,
  currentHead,
  gitStatus,
  runGit,
} from "./composite-campaign-git-baseline.js";
import {
  assertLongTaskContractFresh,
  readCompiledLongTaskContract,
} from "./long-task-contract-compiler.js";
import { assertLongTaskFinalAuthority } from "./long-task-final-receipt.js";
import type { FinalResultV3 } from "./long-task-run-result.js";
import { hashLongTaskWorkspace } from "./long-task-snapshot.js";
import {
  assertChangedPathsWithinEnvelopeV1,
  type ChangeEnvelopeV1,
} from "./composite-campaign-change-envelope.js";

export interface SliceExecutionReceiptV1 {
  schema_version: "slice-execution-receipt-v1";
  campaign_id: string;
  slice_id: string;
  wave_id: string;
  goal_id: string;
  branch: string;
  base_commit: string;
  head_commit: string;
  commit_oids: string[];
  changed_paths: string[];
  contract_sha256: string;
  final_result_sha256: string;
  final_snapshot_sha256: string;
  workflow_status: "accepted";
  worktree_clean: true;
  recorded_at: string;
  receipt_sha256: string;
}

export interface RecordSliceReceiptInput {
  campaignRoot: string;
  campaignId: string;
  sliceId: string;
  waveId: string;
  goalId: string;
  worktree: string;
  contractWorkdir: string;
  branch: string;
  baseCommit: string;
  forbiddenChangedPaths: string[];
  changeEnvelope: ChangeEnvelopeV1;
}

export async function recordSliceExecutionReceipt(
  input: RecordSliceReceiptInput,
): Promise<{ receipt: SliceExecutionReceiptV1; receipt_path: string }> {
  const worktree = path.resolve(input.worktree);
  const contractWorkdir = path.resolve(input.contractWorkdir);
  const contract = await readCompiledLongTaskContract(contractWorkdir);
  if (
    !samePath(contract.repository_root, worktree) ||
    !samePath(contract.workdir, contractWorkdir)
  )
    throw new Error("slice_receipt_contract_worktree_mismatch");
  await assertLongTaskContractFresh(contract);
  const finalPath = path.join(contractWorkdir, "final-result.json");
  const finalText = await readFile(finalPath, "utf8");
  const finalResult = JSON.parse(finalText) as FinalResultV3;
  await assertLongTaskFinalAuthority(contract, finalText, finalResult);
  if (
    finalResult.schema_version !== "long-task-final-result-v3" ||
    finalResult.workflow_status !== "accepted" ||
    finalResult.atomic_write_complete !== true
  )
    throw new Error("slice_receipt_final_result_not_accepted");
  if (finalResult.contract_sha256 !== contract.contract_sha256)
    throw new Error("slice_receipt_contract_hash_mismatch");
  const currentSnapshot = await hashLongTaskWorkspace(worktree, contract);
  if (
    currentSnapshot !== finalResult.final_snapshot_sha256 ||
    currentSnapshot !== finalResult.workspace_hash_after
  )
    throw new Error("slice_receipt_workspace_changed_after_final_gate");
  if ((await currentBranch(worktree)) !== input.branch)
    throw new Error("slice_receipt_branch_mismatch");
  const head = await currentHead(worktree);
  const base = await currentHead(worktree, input.baseCommit);
  const descendant = await runGit(
    worktree,
    ["merge-base", "--is-ancestor", base, head],
    { throwOnError: false },
  );
  if (descendant.exitCode !== 0)
    throw new Error("slice_receipt_head_not_descendant_of_wave_base");
  const status = await gitStatus(worktree);
  const meaningfulDirty = status.entries.filter(
    (entry) => !isVerifierRuntimePath(worktree, contractWorkdir, entry.path),
  );
  if (meaningfulDirty.length)
    throw new Error(
      `slice_receipt_worktree_not_clean:${meaningfulDirty
        .map((entry) => entry.path)
        .sort(asciiCompare)
        .join(",")}`,
    );
  const commitOids = splitLines(
    (await runGit(worktree, ["rev-list", "--reverse", `${base}..${head}`]))
      .stdout,
  );
  if (!commitOids.length)
    throw new Error("slice_receipt_requires_committed_implementation");
  const changedPaths = splitLines(
    (
      await runGit(worktree, [
        "diff",
        "--name-only",
        "--no-renames",
        base,
        head,
      ])
    ).stdout,
  ).sort(asciiCompare);
  const forbidden = input.forbiddenChangedPaths.map(normalizeRepositoryPath);
  const forbiddenChanges = changedPaths.filter((candidate) =>
    forbidden.some(
      (prefix) => candidate === prefix || candidate.startsWith(`${prefix}/`),
    ),
  );
  if (forbiddenChanges.length)
    throw new Error(
      `slice_receipt_forbidden_campaign_state_change:${forbiddenChanges.join(",")}`,
    );
  assertChangedPathsWithinEnvelopeV1(changedPaths, input.changeEnvelope);
  const receiptPath = path.join(
    path.resolve(input.campaignRoot),
    "slices",
    input.sliceId,
    "receipts",
    `${input.waveId}-${head.slice(0, 12)}.json`,
  );
  const existing = await optionalReceipt(receiptPath);
  if (existing) {
    if (
      existing.campaign_id !== input.campaignId ||
      existing.slice_id !== input.sliceId ||
      existing.wave_id !== input.waveId ||
      existing.goal_id !== input.goalId ||
      existing.branch !== input.branch ||
      existing.base_commit !== base ||
      existing.head_commit !== head ||
      existing.contract_sha256 !== contract.contract_sha256 ||
      existing.final_result_sha256 !== sha256Hex(finalText)
    )
      throw new Error("slice_receipt_existing_identity_conflict");
    return { receipt: existing, receipt_path: receiptPath };
  }
  const identity = {
    schema_version: "slice-execution-receipt-v1" as const,
    campaign_id: input.campaignId,
    slice_id: input.sliceId,
    wave_id: input.waveId,
    goal_id: input.goalId,
    branch: input.branch,
    base_commit: base,
    head_commit: head,
    commit_oids: commitOids,
    changed_paths: changedPaths,
    contract_sha256: contract.contract_sha256,
    final_result_sha256: sha256Hex(finalText),
    final_snapshot_sha256: finalResult.final_snapshot_sha256,
    workflow_status: "accepted" as const,
    worktree_clean: true as const,
    recorded_at: new Date().toISOString(),
  };
  const receipt: SliceExecutionReceiptV1 = {
    ...identity,
    receipt_sha256: sha256Hex(canonicalJson(identity)),
  };
  await writeImmutableOrSame(receiptPath, receipt);
  return { receipt, receipt_path: receiptPath };
}

export async function readSliceExecutionReceipt(
  file: string,
): Promise<SliceExecutionReceiptV1> {
  const receipt = JSON.parse(
    await readFile(file, "utf8"),
  ) as SliceExecutionReceiptV1;
  if (
    receipt.schema_version !== "slice-execution-receipt-v1" ||
    receipt.workflow_status !== "accepted" ||
    receipt.worktree_clean !== true
  )
    throw new Error("slice_receipt_invalid");
  const { receipt_sha256, ...identity } = receipt;
  if (receipt_sha256 !== sha256Hex(canonicalJson(identity)))
    throw new Error("slice_receipt_hash_mismatch");
  return receipt;
}

async function optionalReceipt(
  file: string,
): Promise<SliceExecutionReceiptV1 | null> {
  try {
    return await readSliceExecutionReceipt(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function assertSliceReceiptCurrent(
  worktree: string,
  receipt: SliceExecutionReceiptV1,
  contractWorkdir?: string,
): Promise<void> {
  const root = path.resolve(worktree);
  if ((await currentBranch(root)) !== receipt.branch)
    throw new Error("slice_receipt_branch_changed");
  if ((await currentHead(root)) !== receipt.head_commit)
    throw new Error("slice_receipt_head_changed");
  const currentCommits = splitLines(
    (
      await runGit(root, [
        "rev-list",
        "--reverse",
        `${receipt.base_commit}..${receipt.head_commit}`,
      ])
    ).stdout,
  );
  if (canonicalJson(currentCommits) !== canonicalJson(receipt.commit_oids))
    throw new Error("slice_receipt_commit_range_changed");
  const status = await gitStatus(root);
  const meaningfulDirty = status.entries.filter(
    (entry) =>
      !contractWorkdir ||
      !isVerifierRuntimePath(root, path.resolve(contractWorkdir), entry.path),
  );
  if (meaningfulDirty.length)
    throw new Error("slice_receipt_worktree_became_dirty");
  if (contractWorkdir) {
    const workdir = path.resolve(contractWorkdir);
    const contract = await readCompiledLongTaskContract(workdir);
    await assertLongTaskContractFresh(contract);
    const finalText = await readFile(
      path.join(workdir, "final-result.json"),
      "utf8",
    );
    const finalResult = JSON.parse(finalText) as FinalResultV3;
    await assertLongTaskFinalAuthority(contract, finalText, finalResult);
    if (
      finalResult.workflow_status !== "accepted" ||
      finalResult.contract_sha256 !== receipt.contract_sha256 ||
      sha256Hex(finalText) !== receipt.final_result_sha256
    )
      throw new Error("slice_receipt_final_authority_changed");
    if (
      (await hashLongTaskWorkspace(root, contract)) !==
      receipt.final_snapshot_sha256
    )
      throw new Error("slice_receipt_snapshot_changed");
  }
}

async function writeImmutableOrSame(
  file: string,
  value: unknown,
): Promise<void> {
  const content = canonicalJson(value);
  try {
    const current = await readFile(file, "utf8");
    if (current === content) return;
    throw new Error(`immutable_slice_receipt_conflict:${file}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content, { flag: "wx" });
}

function isVerifierRuntimePath(
  worktree: string,
  contractWorkdir: string,
  candidate: string,
): boolean {
  const normalized = candidate.replace(/\\/gu, "/");
  if (
    normalized === ".codex/ty-context-active-long-task.json" ||
    normalized === ".codex/ty-context-final-result-receipt.json"
  )
    return true;
  const relativeWorkdir = path
    .relative(worktree, contractWorkdir)
    .replace(/\\/gu, "/");
  return (
    normalized === relativeWorkdir ||
    normalized.startsWith(`${relativeWorkdir}/`)
  );
}

function splitLines(value: string): string[] {
  return value
    .split(/\r?\n/gu)
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizeRepositoryPath(value: string): string {
  const normalized = value
    .replace(/\\/gu, "/")
    .replace(/^\.\//u, "")
    .replace(/\/+$/u, "");
  if (
    !normalized ||
    normalized.startsWith("../") ||
    path.isAbsolute(normalized)
  )
    throw new Error("slice_receipt_forbidden_path_invalid");
  return normalized;
}

function samePath(left: string, right: string): boolean {
  const normalize = (value: string) =>
    process.platform === "win32"
      ? path.resolve(value).toLowerCase()
      : path.resolve(value);
  return normalize(left) === normalize(right);
}

function asciiCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
