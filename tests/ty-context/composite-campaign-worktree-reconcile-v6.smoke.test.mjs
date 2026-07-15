import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  assertManagedWorktreeBudgetV1,
  cleanupManagedCampaignWorktreesV1,
  createManagedIntegrationWorktreeV1,
  createManagedSliceWorktreeV1,
  inspectManagedWorktreeStateV1,
  managedCampaignWorktreePathsV1,
  managedSliceWorktreePathV1,
  reconcileManagedCampaignWorktreesV1,
  removeManagedWorktreeV1,
  repositoryRelativeWorktreePathV1,
} from "../../packages/ty-context/dist/lib/composite-campaign-worktree-budget.js";
import { deriveExpectedManagedWorktreesV6 } from "../../packages/ty-context/dist/lib/composite-campaign-worktree-expectation-v6.js";
import { currentHead, runGit } from "../../packages/ty-context/dist/lib/composite-campaign-git-baseline.js";
import { listRepositoryWorktrees } from "../../packages/ty-context/dist/lib/composite-campaign-worktree.js";
import { ensureIntegrationWorktreeV6 } from "../../packages/ty-context/dist/lib/composite-campaign-bootstrap-v6.js";
import { reconcileCampaignV6 } from "../../packages/ty-context/dist/lib/composite-campaign-reconcile-v6.js";
import { mutateCampaignV6 } from "../../packages/ty-context/dist/lib/composite-campaign-v6.js";
import {
  acquireCampaignLockV6,
  loadCampaignStoreV6,
} from "../../packages/ty-context/dist/lib/composite-runtime-v6/campaign-store.js";
import {
  createCampaignFixtureV6,
} from "./helpers/campaign-v6-fixture.mjs";

test("budget inspection is pure and explicit reconcile preserves state-owned committed work", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "campaign-reconcile-v6-"));
  const campaignId = "reconcile";
  const integrationRef = "tyctx/campaign/reconcile/integration";
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
    const orphan = managedSliceWorktreePathV1(root, campaignId, "SFC-999");
    await createManagedIntegrationWorktreeV1({
      repositoryRoot: root,
      campaignId,
      baseCommit: base,
      integrationRef,
      expectedWorktrees: [paths.integration],
    });
    await createManagedSliceWorktreeV1({
      repositoryRoot: root,
      campaignId,
      sliceId: "SFC-001",
      frozenBaseCommit: base,
      checkoutCommit: base,
      expectedWorktrees: [paths.integration, sfc1],
    });
    await createManagedSliceWorktreeV1({
      repositoryRoot: root,
      campaignId,
      sliceId: "SFC-999",
      frozenBaseCommit: base,
      checkoutCommit: base,
      expectedWorktrees: [paths.integration, sfc1, orphan],
    });
    await commitFile(sfc1, "progress.txt", "committed progress\n", "progress");
    const progressHead = await currentHead(sfc1);
    const expected = [paths.integration, sfc1];
    const before = (await listRepositoryWorktrees(root)).map((item) => item.path).sort();
    const inspected = await assertManagedWorktreeBudgetV1({
      repositoryRoot: root,
      campaignId,
      expectedWorktrees: expected,
    });
    assert.deepEqual(
      (await listRepositoryWorktrees(root)).map((item) => item.path).sort(),
      before,
    );
    assert.deepEqual(inspected.orphan_managed_worktrees, [
      repositoryRelativeWorktreePathV1(root, orphan),
    ]);

    const reconciled = await reconcileManagedCampaignWorktreesV1({
      repositoryRoot: root,
      campaignId,
      expectedWorktrees: expected,
    });
    assert.deepEqual(reconciled.orphan_managed_worktrees, []);
    assert.equal(
      (await listRepositoryWorktrees(root)).some((item) => samePath(item.path, sfc1)),
      true,
    );
    assert.equal(
      (await listRepositoryWorktrees(root)).some((item) => samePath(item.path, orphan)),
      false,
    );

    await removeManagedWorktreeV1({
      repositoryRoot: root,
      campaignId,
      worktreePath: sfc1,
    });
    const restored = await createManagedSliceWorktreeV1({
      repositoryRoot: root,
      campaignId,
      sliceId: "SFC-001",
      frozenBaseCommit: base,
      checkoutCommit: progressHead,
      expectedWorktrees: expected,
    });
    assert.equal(restored.head_commit, progressHead);
    assert.equal(
      (await readFile(path.join(restored.path, "progress.txt"), "utf8")).trim(),
      "committed progress",
    );

    const campaign = {
      campaign_id: campaignId,
      base_commit: base,
      campaign_status: "executing",
      finalization: null,
      slices: {
        "SFC-001": {
          status: "needs_work",
          worktree_path: repositoryRelativeWorktreePathV1(root, sfc1),
        },
      },
      repair: {
        status: "idle",
        worktree_path: repositoryRelativeWorktreePathV1(root, paths.repair),
      },
    };
    assert.deepEqual(
      deriveExpectedManagedWorktreesV6({ repositoryRoot: root, campaign }).all,
      expected.sort(),
    );
    const status = await inspectManagedWorktreeStateV1({
      repositoryRoot: root,
      campaignId,
      expectedWorktrees: expected,
    });
    assert.deepEqual(status.missing_expected_worktrees, []);
  } finally {
    await cleanupManagedCampaignWorktreesV1({
      repositoryRoot: root,
      campaignId,
      integrationRef,
    }).catch(() => undefined);
    await rm(root, { recursive: true, force: true });
  }
});

test("Integration bootstrap preserves two state-owned SFC worktrees and reconcile clears stale verified state", async () => {
  const fixture = await createCampaignFixtureV6({
    campaignId: "bootstrap-reconcile",
    sliceCount: 2,
  });
  const loaded = await loadCampaignStoreV6(fixture.root, fixture.campaignPath);
  const base = await currentHead(fixture.root);
  const paths = managedCampaignWorktreePathsV1(
    fixture.root,
    fixture.campaignId,
  );
  const first = managedSliceWorktreePathV1(
    fixture.root,
    fixture.campaignId,
    "SFC-001",
  );
  const second = managedSliceWorktreePathV1(
    fixture.root,
    fixture.campaignId,
    "SFC-002",
  );
  const orphan = managedSliceWorktreePathV1(
    fixture.root,
    fixture.campaignId,
    "SFC-999",
  );
  try {
    await mutateCampaignV6(
      fixture.root,
      fixture.campaignPath,
      "test_state_owned_worktrees",
      async (_root, campaign) => {
        campaign.base_commit = base;
        campaign.integration_head = base;
        campaign.campaign_status = "executing";
        for (const [sliceId, status, worktree] of [
          ["SFC-001", "needs_work", first],
          ["SFC-002", "scheduled", second],
        ]) {
          const slice = campaign.slices[sliceId];
          slice.status = status;
          slice.base_commit = base;
          slice.head_commit = base;
          slice.worktree_path = repositoryRelativeWorktreePathV1(
            fixture.root,
            worktree,
          );
        }
        return campaign;
      },
    );
    const stateExpected = [paths.integration, first, second];
    for (const [sliceId, worktree] of [
      ["SFC-001", first],
      ["SFC-002", second],
    ])
      await createManagedSliceWorktreeV1({
        repositoryRoot: fixture.root,
        campaignId: fixture.campaignId,
        sliceId,
        frozenBaseCommit: base,
        checkoutCommit: base,
        expectedWorktrees: stateExpected,
      });
    await commitFile(first, "progress.txt", "preserved progress\n", "progress");
    const progressHead = await currentHead(first);
    await mutateCampaignV6(
      fixture.root,
      fixture.campaignPath,
      "test_committed_worker_progress",
      async (_root, campaign) => {
        campaign.slices["SFC-001"].head_commit = progressHead;
        return campaign;
      },
    );

    let lock = await acquireCampaignLockV6(loaded.root, "test_bootstrap");
    try {
      await ensureIntegrationWorktreeV6(
        {
          projectRoot: fixture.root,
          campaignPath: fixture.campaignPath,
          controllerProfile: null,
        },
        lock,
      );
    } finally {
      await lock.close();
    }
    let records = await listRepositoryWorktrees(fixture.root);
    assert.equal(records.some((item) => samePath(item.path, first)), true);
    assert.equal(records.some((item) => samePath(item.path, second)), true);

    await createManagedSliceWorktreeV1({
      repositoryRoot: fixture.root,
      campaignId: fixture.campaignId,
      sliceId: "SFC-999",
      frozenBaseCommit: base,
      checkoutCommit: base,
      expectedWorktrees: [...stateExpected, orphan],
    });
    const pure = await inspectManagedWorktreeStateV1({
      repositoryRoot: fixture.root,
      campaignId: fixture.campaignId,
      expectedWorktrees: stateExpected,
    });
    assert.deepEqual(pure.orphan_managed_worktrees, [
      repositoryRelativeWorktreePathV1(fixture.root, orphan),
    ]);
    assert.equal(
      (await listRepositoryWorktrees(fixture.root)).some((item) =>
        samePath(item.path, orphan),
      ),
      true,
    );
    await reconcileManagedCampaignWorktreesV1({
      repositoryRoot: fixture.root,
      campaignId: fixture.campaignId,
      expectedWorktrees: stateExpected,
    });
    assert.equal(
      (await listRepositoryWorktrees(fixture.root)).some((item) =>
        samePath(item.path, orphan),
      ),
      false,
    );

    await removeManagedWorktreeV1({
      repositoryRoot: fixture.root,
      campaignId: fixture.campaignId,
      worktreePath: first,
    });
    const restored = await createManagedSliceWorktreeV1({
      repositoryRoot: fixture.root,
      campaignId: fixture.campaignId,
      sliceId: "SFC-001",
      frozenBaseCommit: base,
      checkoutCommit: progressHead,
      expectedWorktrees: stateExpected,
    });
    assert.equal(restored.head_commit, progressHead);
    assert.equal(
      (await readFile(path.join(first, "progress.txt"), "utf8")).trim(),
      "preserved progress",
    );

    await mutateCampaignV6(
      fixture.root,
      fixture.campaignPath,
      "test_stale_verified_worktree_path",
      async (_root, campaign) => {
        campaign.slices["SFC-002"].status = "integration_verified";
        return campaign;
      },
    );
    lock = await acquireCampaignLockV6(loaded.root, "test_reconcile");
    try {
      await reconcileCampaignV6({
        projectRoot: fixture.root,
        campaignPath: fixture.campaignPath,
        lock,
      });
    } finally {
      await lock.close();
    }
    const reconciled = await loadCampaignStoreV6(
      fixture.root,
      fixture.campaignPath,
    );
    assert.equal(
      reconciled.campaign.slices["SFC-002"].worktree_path,
      null,
    );
    records = await listRepositoryWorktrees(fixture.root);
    assert.equal(records.some((item) => samePath(item.path, second)), false);
  } finally {
    await cleanupManagedCampaignWorktreesV1({
      repositoryRoot: fixture.root,
      campaignId: fixture.campaignId,
      integrationRef: loaded.campaign.integration_ref,
    }).catch(() => undefined);
    await rm(fixture.root, { recursive: true, force: true });
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
  return runGit(root, ["-c", "commit.gpgSign=false", ...args], {
    timeoutMs: 120_000,
  });
}
function samePath(left, right) {
  const normalize = (value) =>
    process.platform === "win32"
      ? path.resolve(value).toLowerCase()
      : path.resolve(value);
  return normalize(left) === normalize(right);
}
