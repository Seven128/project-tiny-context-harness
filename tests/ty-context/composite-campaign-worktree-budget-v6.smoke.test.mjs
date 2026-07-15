import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  cleanupManagedCampaignWorktreesV1,
  createManagedIntegrationWorktreeV1,
  createManagedSliceWorktreeV1,
  managedCampaignWorktreePathsV1,
  managedSliceWorktreePathV1,
  removeManagedWorktreeV1,
  resetManagedRepairWorktreeV1,
  assertManagedWorktreeBudgetV1,
} from "../../packages/ty-context/dist/lib/composite-campaign-worktree-budget.js";
import {
  currentHead,
  runGit,
} from "../../packages/ty-context/dist/lib/composite-campaign-git-baseline.js";
import { listRepositoryWorktrees } from "../../packages/ty-context/dist/lib/composite-campaign-worktree.js";

test("managed V6 worktrees are fixed, detached, bounded, merged by SHA, and fully cleaned", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "campaign-worktree-v6-"));
  const campaignId = "smoke";
  const integrationRef = "tyctx/campaign/smoke/integration";
  try {
    await git(root, ["init", "-b", "main"]);
    await git(root, ["config", "user.email", "test@example.com"]);
    await git(root, ["config", "user.name", "Test"]);
    await writeFile(path.join(root, "base.txt"), "base\n", "utf8");
    await git(root, ["add", "base.txt"]);
    await git(root, ["commit", "-m", "base"]);
    const base = await currentHead(root);
    const paths = managedCampaignWorktreePathsV1(root, campaignId);
    const sfc1 = managedSliceWorktreePathV1(root, campaignId, "SFC-001");
    const sfc2 = managedSliceWorktreePathV1(root, campaignId, "SFC-002");
    const expected = [paths.integration, sfc1, sfc2];
    const integration = await createManagedIntegrationWorktreeV1({
      repositoryRoot: root,
      campaignId,
      baseCommit: base,
      integrationRef,
      expectedWorktrees: [paths.integration],
    });
    const left = await createManagedSliceWorktreeV1({
      repositoryRoot: root,
      campaignId,
      sliceId: "SFC-001",
      baseCommit: base,
      expectedWorktrees: expected,
    });
    const right = await createManagedSliceWorktreeV1({
      repositoryRoot: root,
      campaignId,
      sliceId: "SFC-002",
      baseCommit: base,
      expectedWorktrees: expected,
    });
    assert.equal(left.detached, true);
    assert.equal(right.detached, true);
    assert.equal(left.branch, null);
    assert.equal(right.branch, null);
    await commitFile(left.path, "left.txt", "left\n", "left");
    await commitFile(right.path, "right.txt", "right\n", "right");
    const leftHead = await currentHead(left.path);
    const rightHead = await currentHead(right.path);
    await git(integration.path, ["merge", "--no-ff", "--no-edit", leftHead]);
    await removeManagedWorktreeV1({ repositoryRoot: root, campaignId, worktreePath: left.path });
    await git(integration.path, ["merge", "--no-ff", "--no-edit", rightHead]);
    await removeManagedWorktreeV1({ repositoryRoot: root, campaignId, worktreePath: right.path });

    const repair1 = await resetManagedRepairWorktreeV1({
      repositoryRoot: root,
      campaignId,
      baseCommit: await currentHead(integration.path),
      expectedWorktrees: [paths.integration, paths.repair],
    });
    await commitFile(repair1.path, "repair.txt", "repair\n", "repair");
    await git(integration.path, ["merge", "--no-ff", "--no-edit", await currentHead(repair1.path)]);
    const repair2 = await resetManagedRepairWorktreeV1({
      repositoryRoot: root,
      campaignId,
      baseCommit: await currentHead(integration.path),
      expectedWorktrees: [paths.integration, paths.repair],
    });
    assert.equal(repair2.path, repair1.path);
    assert.equal(repair2.resumed, true);
    assert.equal(repair2.head_commit, await currentHead(integration.path));

    await assert.rejects(
      () =>
        assertManagedWorktreeBudgetV1({
          repositoryRoot: root,
          campaignId,
          expectedWorktrees: [
            paths.integration,
            ...Array.from({ length: 5 }, (_, index) =>
              managedSliceWorktreePathV1(
                root,
                campaignId,
                `SFC-${String(index + 10).padStart(3, "0")}`,
              ),
            ),
          ],
        }),
      /managed_worktree_sfc_budget_exceeded/,
    );
    const branches = (await runGit(root, ["branch", "--format=%(refname:short)"])).stdout
      .trim()
      .split(/\r?\n/u)
      .filter(Boolean);
    assert.deepEqual(
      branches.filter((branch) => branch.startsWith("tyctx/campaign/")),
      [integrationRef],
    );
    await cleanupManagedCampaignWorktreesV1({
      repositoryRoot: root,
      campaignId,
      integrationRef,
    });
    const worktrees = await listRepositoryWorktrees(root);
    assert.equal(worktrees.length, 1);
    assert.equal(path.resolve(worktrees[0].path), path.resolve(root));
    const finalBranches = (
      await runGit(root, ["branch", "--format=%(refname:short)"])
    ).stdout;
    assert.doesNotMatch(finalBranches, /tyctx\/campaign\//u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function commitFile(root, relative, content, message) {
  const target = path.join(root, relative);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content, "utf8");
  await git(root, ["add", relative]);
  await git(root, ["commit", "-m", message]);
}
async function git(root, args) {
  const result = await runGit(root, ["-c", "commit.gpgSign=false", ...args], {
    timeoutMs: 120_000,
  });
  return result;
}
