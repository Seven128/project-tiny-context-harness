import { createHash } from "node:crypto";
import { mkdir, rmdir } from "node:fs/promises";
import path from "node:path";
import { currentHead, runGit } from "./composite-campaign-git-baseline.js";

export type CampaignWorktreeKind = "integration" | "slice" | "repair";

export interface CampaignWorktreeOptions {
  repositoryRoot: string;
  campaignId: string;
  baseCommit: string;
  worktreesRoot?: string;
  branchName?: string;
}

export interface SliceWorktreeOptions extends CampaignWorktreeOptions {
  sliceId: string;
}

export interface RepairWorktreeOptions extends CampaignWorktreeOptions {
  repairId: string;
}

export interface CampaignWorktree {
  kind: CampaignWorktreeKind;
  path: string;
  branch: string;
  baseCommit: string;
  headCommit: string;
  resumed: boolean;
}

export interface ListedCampaignWorktree {
  path: string;
  headCommit: string;
  branch: string | null;
  bare: boolean;
  detached: boolean;
  locked: boolean;
  prunable: boolean;
}

export interface ListCampaignWorktreesOptions {
  repositoryRoot: string;
  campaignId: string;
  worktreesRoot?: string;
}

export interface RemoveCampaignWorktreeOptions extends ListCampaignWorktreesOptions {
  worktreePath: string;
  force?: boolean;
  deleteBranch?: boolean;
}

export function portablePathSlug(value: string, maximumLength = 48): string {
  if (!Number.isInteger(maximumLength) || maximumLength < 12 || maximumLength > 96) throw new Error("portable_slug_length_invalid");
  const normalized = value.normalize("NFKC").toLowerCase();
  let slug = normalized.replace(/[^a-z0-9._-]+/gu, "-").replace(/-+/gu, "-").replace(/^[._-]+|[._-]+$/gu, "");
  const reserved = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/iu.test(slug);
  const transformed = slug !== normalized || reserved || !slug;
  if (reserved) slug = `x-${slug}`;
  if (!slug) slug = "item";
  const suffix = createHash("sha256").update(value).digest("hex").slice(0, 8);
  const reservedForSuffix = transformed ? suffix.length + 1 : 0;
  slug = slug.slice(0, maximumLength - reservedForSuffix).replace(/[._-]+$/gu, "") || "item";
  return transformed ? `${slug}-${suffix}` : slug;
}

function asciiCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function campaignWorktreesRoot(options: ListCampaignWorktreesOptions): string {
  const repositoryRoot = path.resolve(options.repositoryRoot);
  const container = options.worktreesRoot
    ? path.resolve(options.worktreesRoot)
    : path.join(path.dirname(repositoryRoot), ".ty-context-worktrees", portablePathSlug(path.basename(repositoryRoot)));
  return path.join(container, portablePathSlug(options.campaignId));
}

export async function createIntegrationWorktree(options: CampaignWorktreeOptions): Promise<CampaignWorktree> {
  const campaignSlug = portablePathSlug(options.campaignId);
  return createManagedWorktree(options, "integration", "integration", options.branchName ?? `tyctx/campaign/${campaignSlug}/integration`);
}

export async function createSliceWorktree(options: SliceWorktreeOptions): Promise<CampaignWorktree> {
  const campaignSlug = portablePathSlug(options.campaignId);
  const sliceSlug = portablePathSlug(options.sliceId);
  return createManagedWorktree(options, "slice", path.join("slices", sliceSlug), options.branchName ?? `tyctx/campaign/${campaignSlug}/${sliceSlug}`);
}

export async function createRepairWorktree(options: RepairWorktreeOptions): Promise<CampaignWorktree> {
  const campaignSlug = portablePathSlug(options.campaignId);
  const repairSlug = portablePathSlug(options.repairId);
  return createManagedWorktree(options, "repair", path.join("repair", repairSlug), options.branchName ?? `tyctx/campaign/${campaignSlug}/repair/${repairSlug}`);
}

export async function listCampaignWorktrees(options: ListCampaignWorktreesOptions): Promise<ListedCampaignWorktree[]> {
  const ownedRoot = campaignWorktreesRoot(options);
  return (await listRepositoryWorktrees(options.repositoryRoot))
    .filter((item) => isInside(ownedRoot, item.path))
    .sort((left, right) => asciiCompare(left.path, right.path));
}

export async function listRepositoryWorktrees(repositoryRoot: string): Promise<ListedCampaignWorktree[]> {
  const output = (await runGit(repositoryRoot, ["worktree", "list", "--porcelain", "-z"])).stdout;
  const records: ListedCampaignWorktree[] = [];
  let current: Partial<ListedCampaignWorktree> = {};
  for (const field of output.split("\0")) {
    if (!field) {
      if (current.path && current.headCommit) records.push(complete(current));
      current = {};
      continue;
    }
    const separator = field.indexOf(" ");
    const key = separator < 0 ? field : field.slice(0, separator);
    const value = separator < 0 ? "" : field.slice(separator + 1);
    if (key === "worktree") current.path = path.resolve(value);
    else if (key === "HEAD") current.headCommit = value;
    else if (key === "branch") current.branch = value.replace(/^refs\/heads\//u, "");
    else if (key === "bare") current.bare = true;
    else if (key === "detached") current.detached = true;
    else if (key === "locked") current.locked = true;
    else if (key === "prunable") current.prunable = true;
  }
  if (current.path && current.headCommit) records.push(complete(current));
  return records;
}

export async function removeCampaignWorktree(options: RemoveCampaignWorktreeOptions): Promise<void> {
  const ownedRoot = campaignWorktreesRoot(options);
  const candidate = path.resolve(options.worktreePath);
  if (!isInside(ownedRoot, candidate) || samePath(ownedRoot, candidate)) throw new Error("worktree_cleanup_path_not_owned");
  const registered = (await listRepositoryWorktrees(options.repositoryRoot)).find((item) => samePath(item.path, candidate));
  if (!registered) throw new Error("worktree_cleanup_not_registered");
  const branchPrefix = `tyctx/campaign/${portablePathSlug(options.campaignId)}/`;
  if (!registered.branch?.startsWith(branchPrefix)) throw new Error("worktree_cleanup_branch_not_owned");
  const args = ["worktree", "remove"];
  if (options.force) args.push("--force");
  args.push(candidate);
  await runGit(options.repositoryRoot, args, { timeoutMs: 120_000 });
  if (options.deleteBranch) await runGit(options.repositoryRoot, ["branch", "-D", registered.branch]);
  await removeEmptyParents(path.dirname(candidate), path.dirname(ownedRoot));
}

export async function removeAllCampaignWorktrees(options: ListCampaignWorktreesOptions & { force?: boolean; deleteBranches?: boolean }): Promise<void> {
  const worktrees = await listCampaignWorktrees(options);
  for (const worktree of worktrees.sort((left, right) => right.path.length - left.path.length)) {
    await removeCampaignWorktree({ ...options, worktreePath: worktree.path, force: options.force, deleteBranch: options.deleteBranches });
  }
}

async function createManagedWorktree(options: CampaignWorktreeOptions, kind: CampaignWorktreeKind, relativePath: string, branch: string): Promise<CampaignWorktree> {
  const repositoryRoot = path.resolve(options.repositoryRoot);
  const branchPrefix = `tyctx/campaign/${portablePathSlug(options.campaignId)}/`;
  if (!branch.startsWith(branchPrefix)) throw new Error("worktree_branch_not_campaign_owned");
  await runGit(repositoryRoot, ["check-ref-format", "--branch", branch]);
  const baseCommit = await currentHead(repositoryRoot, options.baseCommit);
  const ownedRoot = campaignWorktreesRoot(options);
  const target = path.resolve(ownedRoot, relativePath);
  if (!isInside(ownedRoot, target) || samePath(ownedRoot, target)) throw new Error("worktree_target_not_owned");
  const records = await listRepositoryWorktrees(repositoryRoot);
  const byPath = records.find((item) => samePath(item.path, target));
  const byBranch = records.find((item) => item.branch === branch);
  if (byPath || byBranch) {
    if (!byPath || !byBranch || !samePath(byPath.path, byBranch.path)) throw new Error("worktree_resume_identity_mismatch");
    await assertDescendant(repositoryRoot, baseCommit, byPath.headCommit);
    return { kind, path: byPath.path, branch, baseCommit, headCommit: byPath.headCommit, resumed: true };
  }
  const branchExists = (await runGit(repositoryRoot, ["show-ref", "--verify", "--quiet", `refs/heads/${branch}`], { throwOnError: false })).exitCode === 0;
  if (branchExists) await assertDescendant(repositoryRoot, baseCommit, await currentHead(repositoryRoot, branch));
  else await runGit(repositoryRoot, ["branch", branch, baseCommit]);
  await mkdir(path.dirname(target), { recursive: true });
  await runGit(repositoryRoot, ["worktree", "add", target, branch], { timeoutMs: 120_000 });
  const headCommit = await currentHead(target);
  if (!branchExists && headCommit !== baseCommit) throw new Error("worktree_exact_base_mismatch");
  return { kind, path: target, branch, baseCommit, headCommit, resumed: false };
}

async function assertDescendant(root: string, base: string, head: string): Promise<void> {
  const result = await runGit(root, ["merge-base", "--is-ancestor", base, head], { throwOnError: false });
  if (result.exitCode !== 0) throw new Error("worktree_branch_not_descendant_of_base");
}

function complete(value: Partial<ListedCampaignWorktree>): ListedCampaignWorktree {
  return {
    path: path.resolve(value.path!), headCommit: value.headCommit!, branch: value.branch ?? null,
    bare: value.bare ?? false, detached: value.detached ?? false, locked: value.locked ?? false, prunable: value.prunable ?? false
  };
}

async function removeEmptyParents(start: string, stop: string): Promise<void> {
  let current = path.resolve(start);
  const boundary = path.resolve(stop);
  while (isInside(boundary, current) && !samePath(current, boundary)) {
    try { await rmdir(current); }
    catch { return; }
    current = path.dirname(current);
  }
}

function isInside(root: string, candidate: string): boolean {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function samePath(left: string, right: string): boolean {
  const normalize = (value: string) => process.platform === "win32" ? path.resolve(value).toLowerCase() : path.resolve(value);
  return normalize(left) === normalize(right);
}
