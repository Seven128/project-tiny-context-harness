import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { currentHead, runGit } from "./composite-campaign-git-baseline.js";
import {
  listRepositoryWorktrees,
  portablePathSlug,
  type ListedCampaignWorktree,
} from "./composite-campaign-worktree.js";

export const MANAGED_WORKTREE_BUDGET_V1 = {
  integration_worktrees: 1,
  max_sfc_worktrees: 4,
  repair_worktrees: 1,
  max_total_worktrees: 6,
} as const;

export interface ManagedWorktreePathsV1 {
  root: string;
  integration: string;
  sfcRoot: string;
  repair: string;
}

export interface ManagedWorktreeBudgetStatusV1 {
  managed_worktree_budget: typeof MANAGED_WORKTREE_BUDGET_V1;
  expected_worktrees: string[];
  actual_managed_worktrees: string[];
  orphan_managed_worktrees: string[];
}

export interface ManagedWorktreeV1 {
  kind: "integration" | "sfc" | "repair";
  path: string;
  relative_path: string;
  base_commit: string;
  head_commit: string;
  branch: string | null;
  detached: boolean;
  resumed: boolean;
}

export function managedCampaignWorktreePathsV1(
  repositoryRoot: string,
  campaignId: string,
): ManagedWorktreePathsV1 {
  const repository = path.resolve(repositoryRoot);
  const root = path.join(
    repository,
    "tmp",
    "ty-context",
    "composite-worktrees",
    portablePathSlug(campaignId),
  );
  return {
    root,
    integration: path.join(root, "integration"),
    sfcRoot: path.join(root, "sfc"),
    repair: path.join(root, "repair"),
  };
}

export function managedSliceWorktreePathV1(
  repositoryRoot: string,
  campaignId: string,
  sliceId: string,
): string {
  return path.join(
    managedCampaignWorktreePathsV1(repositoryRoot, campaignId).sfcRoot,
    portablePathSlug(sliceId),
  );
}

export function repositoryRelativeWorktreePathV1(
  repositoryRoot: string,
  worktree: string,
): string {
  const repository = path.resolve(repositoryRoot);
  const candidate = path.resolve(worktree);
  if (!inside(repository, candidate) || samePath(repository, candidate))
    throw new Error("managed_worktree_path_outside_repository");
  return path.relative(repository, candidate).split(path.sep).join("/");
}

export function resolveManagedWorktreePathV1(
  repositoryRoot: string,
  relativePath: string,
): string {
  if (
    path.isAbsolute(relativePath) ||
    relativePath.split(/[\\/]/u).includes("..")
  )
    throw new Error("managed_worktree_relative_path_invalid");
  const repository = path.resolve(repositoryRoot);
  const candidate = path.resolve(repository, relativePath);
  if (!inside(repository, candidate) || samePath(repository, candidate))
    throw new Error("managed_worktree_relative_path_escapes_repository");
  return candidate;
}

export async function inspectManagedWorktreeBudgetV1(options: {
  repositoryRoot: string;
  campaignId: string;
  expectedWorktrees?: string[];
  activeWorkerPaths?: string[];
  reconcileOrphans?: boolean;
}): Promise<ManagedWorktreeBudgetStatusV1> {
  const repository = path.resolve(options.repositoryRoot);
  const paths = managedCampaignWorktreePathsV1(repository, options.campaignId);
  const expected = normalizedOwnedSet(
    paths.root,
    options.expectedWorktrees ?? [],
  );
  const active = normalizedOwnedSet(
    paths.root,
    options.activeWorkerPaths ?? [],
  );
  let actual = (await listRepositoryWorktrees(repository)).filter((item) =>
    strictlyInside(paths.root, item.path),
  );
  let orphan = actual.filter((item) => !expected.has(normalizePath(item.path)));
  if (options.reconcileOrphans) {
    for (const item of orphan) {
      if (active.has(normalizePath(item.path))) continue;
      assertPackageOwnedRecord(paths, item, options.campaignId);
      await runGit(repository, ["worktree", "remove", "--force", item.path], {
        timeoutMs: 120_000,
      });
    }
    await runGit(repository, ["worktree", "prune", "--expire", "now"]);
    actual = (await listRepositoryWorktrees(repository)).filter((item) =>
      strictlyInside(paths.root, item.path),
    );
    orphan = actual.filter((item) => !expected.has(normalizePath(item.path)));
  }
  return {
    managed_worktree_budget: MANAGED_WORKTREE_BUDGET_V1,
    expected_worktrees: [...expected]
      .map((item) => repositoryRelativeWorktreePathV1(repository, item))
      .sort(asciiCompare),
    actual_managed_worktrees: actual
      .map((item) => repositoryRelativeWorktreePathV1(repository, item.path))
      .sort(asciiCompare),
    orphan_managed_worktrees: orphan
      .map((item) => repositoryRelativeWorktreePathV1(repository, item.path))
      .sort(asciiCompare),
  };
}

export async function assertManagedWorktreeBudgetV1(options: {
  repositoryRoot: string;
  campaignId: string;
  expectedWorktrees: string[];
  activeWorkerPaths?: string[];
  requestedWorktree?: string;
}): Promise<ManagedWorktreeBudgetStatusV1> {
  const expected = new Set(
    [
      ...options.expectedWorktrees,
      ...(options.requestedWorktree ? [options.requestedWorktree] : []),
    ].map((item) => path.resolve(item)),
  );
  const paths = managedCampaignWorktreePathsV1(
    options.repositoryRoot,
    options.campaignId,
  );
  for (const item of expected)
    if (!strictlyInside(paths.root, item))
      throw new Error("managed_worktree_expected_path_not_owned");
  const sfcCount = [...expected].filter((item) =>
    strictlyInside(paths.sfcRoot, item),
  ).length;
  if (sfcCount > MANAGED_WORKTREE_BUDGET_V1.max_sfc_worktrees)
    throw new Error("managed_worktree_sfc_budget_exceeded");
  if (expected.size > MANAGED_WORKTREE_BUDGET_V1.max_total_worktrees)
    throw new Error("managed_worktree_total_budget_exceeded");
  const status = await inspectManagedWorktreeBudgetV1({
    ...options,
    expectedWorktrees: [...expected],
    reconcileOrphans: true,
  });
  if (
    status.actual_managed_worktrees.length >
      MANAGED_WORKTREE_BUDGET_V1.max_total_worktrees ||
    status.orphan_managed_worktrees.length
  )
    throw new Error("managed_worktree_budget_reconcile_failed");
  return status;
}

export async function createManagedIntegrationWorktreeV1(options: {
  repositoryRoot: string;
  campaignId: string;
  baseCommit: string;
  integrationRef: string;
  expectedWorktrees: string[];
  activeWorkerPaths?: string[];
}): Promise<ManagedWorktreeV1> {
  const repository = path.resolve(options.repositoryRoot);
  const target = managedCampaignWorktreePathsV1(
    repository,
    options.campaignId,
  ).integration;
  await assertManagedWorktreeBudgetV1({
    ...options,
    expectedWorktrees: options.expectedWorktrees,
    requestedWorktree: target,
  });
  await runGit(repository, [
    "check-ref-format",
    "--branch",
    options.integrationRef,
  ]);
  const base = await currentHead(repository, options.baseCommit);
  const records = await listRepositoryWorktrees(repository);
  const byPath = records.find((item) => samePath(item.path, target));
  const byBranch = records.find(
    (item) => item.branch === options.integrationRef,
  );
  if (byPath || byBranch) {
    if (
      !byPath ||
      !byBranch ||
      !samePath(byPath.path, byBranch.path) ||
      byPath.detached
    )
      throw new Error("managed_integration_resume_identity_mismatch");
    await assertDescendant(repository, base, byPath.headCommit);
    return managed(
      repository,
      "integration",
      target,
      base,
      byPath.headCommit,
      options.integrationRef,
      false,
      true,
    );
  }
  const exists = await branchExists(repository, options.integrationRef);
  if (!exists)
    await runGit(repository, ["branch", options.integrationRef, base]);
  await mkdir(path.dirname(target), { recursive: true });
  await runGit(
    repository,
    ["worktree", "add", target, options.integrationRef],
    {
      timeoutMs: 120_000,
    },
  );
  const head = await currentHead(target);
  await assertDescendant(repository, base, head);
  return managed(
    repository,
    "integration",
    target,
    base,
    head,
    options.integrationRef,
    false,
    false,
  );
}

export async function createManagedSliceWorktreeV1(options: {
  repositoryRoot: string;
  campaignId: string;
  sliceId: string;
  baseCommit: string;
  expectedWorktrees: string[];
  activeWorkerPaths?: string[];
}): Promise<ManagedWorktreeV1> {
  const target = managedSliceWorktreePathV1(
    options.repositoryRoot,
    options.campaignId,
    options.sliceId,
  );
  return createDetached({ ...options, target, kind: "sfc" });
}

export async function resetManagedRepairWorktreeV1(options: {
  repositoryRoot: string;
  campaignId: string;
  baseCommit: string;
  expectedWorktrees: string[];
  activeWorkerPaths?: string[];
}): Promise<ManagedWorktreeV1> {
  const repository = path.resolve(options.repositoryRoot);
  const target = managedCampaignWorktreePathsV1(
    repository,
    options.campaignId,
  ).repair;
  const base = await currentHead(repository, options.baseCommit);
  await assertManagedWorktreeBudgetV1({
    ...options,
    expectedWorktrees: options.expectedWorktrees,
    requestedWorktree: target,
  });
  const existing = (await listRepositoryWorktrees(repository)).find((item) =>
    samePath(item.path, target),
  );
  let created: ManagedWorktreeV1;
  if (existing) {
    if (!existing.detached || existing.branch !== null)
      throw new Error("managed_repair_resume_identity_mismatch");
    created = managed(
      repository,
      "repair",
      target,
      base,
      existing.headCommit,
      null,
      true,
      true,
    );
  } else {
    created = await createDetached({ ...options, target, kind: "repair" });
  }
  await runGit(target, ["reset", "--hard", base]);
  await runGit(target, ["clean", "-fdx"]);
  const head = await currentHead(target);
  if (head !== base) throw new Error("managed_repair_reset_head_mismatch");
  return { ...created, base_commit: base, head_commit: head };
}

export async function assertDetachedManagedWorktreeV1(options: {
  repositoryRoot: string;
  campaignId: string;
  worktreePath: string;
  baseCommit?: string;
}): Promise<ListedCampaignWorktree> {
  const repository = path.resolve(options.repositoryRoot);
  const paths = managedCampaignWorktreePathsV1(repository, options.campaignId);
  const candidate = path.resolve(options.worktreePath);
  if (!strictlyInside(paths.root, candidate))
    throw new Error("managed_detached_worktree_path_not_owned");
  const record = (await listRepositoryWorktrees(repository)).find((item) =>
    samePath(item.path, candidate),
  );
  if (!record || !record.detached || record.branch !== null)
    throw new Error("managed_detached_worktree_identity_mismatch");
  if (options.baseCommit)
    await assertDescendant(
      repository,
      await currentHead(repository, options.baseCommit),
      record.headCommit,
    );
  return record;
}

export async function removeManagedWorktreeV1(options: {
  repositoryRoot: string;
  campaignId: string;
  worktreePath: string;
}): Promise<void> {
  const repository = path.resolve(options.repositoryRoot);
  const paths = managedCampaignWorktreePathsV1(repository, options.campaignId);
  const candidate = path.resolve(options.worktreePath);
  if (!strictlyInside(paths.root, candidate))
    throw new Error("managed_worktree_remove_path_not_owned");
  const record = (await listRepositoryWorktrees(repository)).find((item) =>
    samePath(item.path, candidate),
  );
  if (record) {
    assertPackageOwnedRecord(paths, record, options.campaignId);
    await runGit(repository, ["worktree", "remove", "--force", candidate], {
      timeoutMs: 120_000,
    });
  }
  await runGit(repository, ["worktree", "prune", "--expire", "now"]);
}

export async function cleanupManagedCampaignWorktreesV1(options: {
  repositoryRoot: string;
  campaignId: string;
  integrationRef: string;
}): Promise<void> {
  const repository = path.resolve(options.repositoryRoot);
  const paths = managedCampaignWorktreePathsV1(repository, options.campaignId);
  const owned = (await listRepositoryWorktrees(repository))
    .filter((item) => strictlyInside(paths.root, item.path))
    .sort((left, right) => right.path.length - left.path.length);
  for (const record of owned) {
    assertPackageOwnedRecord(paths, record, options.campaignId);
    await runGit(repository, ["worktree", "remove", "--force", record.path], {
      timeoutMs: 120_000,
    });
  }
  await runGit(repository, ["worktree", "prune", "--expire", "now"]);
  const branch = await branchExists(repository, options.integrationRef);
  if (branch) {
    const checkedOut = (await listRepositoryWorktrees(repository)).find(
      (item) => item.branch === options.integrationRef,
    );
    if (checkedOut)
      throw new Error("managed_integration_branch_checked_out_after_cleanup");
    await runGit(repository, ["branch", "-D", options.integrationRef]);
  }
  if (!inside(repository, paths.root) || samePath(repository, paths.root))
    throw new Error("managed_worktree_cleanup_root_invalid");
  await rm(paths.root, { recursive: true, force: true });
}

async function createDetached(options: {
  repositoryRoot: string;
  campaignId: string;
  baseCommit: string;
  target: string;
  kind: "sfc" | "repair";
  expectedWorktrees: string[];
  activeWorkerPaths?: string[];
}): Promise<ManagedWorktreeV1> {
  const repository = path.resolve(options.repositoryRoot);
  await assertManagedWorktreeBudgetV1({
    ...options,
    expectedWorktrees: options.expectedWorktrees,
    requestedWorktree: options.target,
  });
  const base = await currentHead(repository, options.baseCommit);
  const records = await listRepositoryWorktrees(repository);
  const byPath = records.find((item) => samePath(item.path, options.target));
  if (byPath) {
    if (!byPath.detached || byPath.branch !== null)
      throw new Error("managed_detached_resume_identity_mismatch");
    await assertDescendant(repository, base, byPath.headCommit);
    return managed(
      repository,
      options.kind,
      options.target,
      base,
      byPath.headCommit,
      null,
      true,
      true,
    );
  }
  await mkdir(path.dirname(options.target), { recursive: true });
  await runGit(
    repository,
    ["worktree", "add", "--detach", options.target, base],
    {
      timeoutMs: 120_000,
    },
  );
  const head = await currentHead(options.target);
  if (head !== base) throw new Error("managed_detached_exact_base_mismatch");
  return managed(
    repository,
    options.kind,
    options.target,
    base,
    head,
    null,
    true,
    false,
  );
}

function managed(
  repository: string,
  kind: ManagedWorktreeV1["kind"],
  worktree: string,
  base: string,
  head: string,
  branch: string | null,
  detached: boolean,
  resumed: boolean,
): ManagedWorktreeV1 {
  return {
    kind,
    path: path.resolve(worktree),
    relative_path: repositoryRelativeWorktreePathV1(repository, worktree),
    base_commit: base,
    head_commit: head,
    branch,
    detached,
    resumed,
  };
}

function assertPackageOwnedRecord(
  paths: ManagedWorktreePathsV1,
  record: ListedCampaignWorktree,
  campaignId: string,
): void {
  if (!strictlyInside(paths.root, record.path))
    throw new Error("managed_worktree_record_not_owned");
  const allowedPath =
    samePath(record.path, paths.integration) ||
    samePath(record.path, paths.repair) ||
    strictlyInside(paths.sfcRoot, record.path);
  if (!allowedPath) throw new Error("managed_worktree_record_path_unknown");
  const integrationRef = `tyctx/campaign/${portablePathSlug(campaignId)}/integration`;
  if (record.branch !== null && record.branch !== integrationRef)
    throw new Error("managed_worktree_record_branch_not_owned");
}

async function assertDescendant(
  repository: string,
  base: string,
  head: string,
): Promise<void> {
  const result = await runGit(
    repository,
    ["merge-base", "--is-ancestor", base, head],
    { throwOnError: false },
  );
  if (result.exitCode !== 0)
    throw new Error("managed_worktree_head_not_descendant_of_base");
}

async function branchExists(
  repository: string,
  branch: string,
): Promise<boolean> {
  return (
    (
      await runGit(
        repository,
        ["show-ref", "--verify", "--quiet", `refs/heads/${branch}`],
        { throwOnError: false },
      )
    ).exitCode === 0
  );
}

function normalizedOwnedSet(root: string, values: string[]): Set<string> {
  const result = new Set<string>();
  for (const value of values) {
    const candidate = path.resolve(value);
    if (!strictlyInside(root, candidate))
      throw new Error("managed_worktree_set_path_not_owned");
    result.add(normalizePath(candidate));
  }
  return result;
}

function strictlyInside(root: string, candidate: string): boolean {
  return inside(root, candidate) && !samePath(root, candidate);
}
function inside(root: string, candidate: string): boolean {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}
function samePath(left: string, right: string): boolean {
  return normalizePath(left) === normalizePath(right);
}
function normalizePath(value: string): string {
  const resolved = path.resolve(value);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}
function asciiCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
