import test from "node:test";
import assert from "node:assert/strict";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createCampaignFixtureV6, git } from "./helpers/campaign-v6-fixture.mjs";
import {
  abandonCampaignV6,
} from "../../packages/ty-context/dist/lib/composite-campaign-abandon-v6.js";
import { cleanupCampaignV6 } from "../../packages/ty-context/dist/lib/composite-campaign-control-v6.js";
import { runCampaignV6 } from "../../packages/ty-context/dist/lib/composite-campaign-runner-v6.js";
import { mutateCampaignV6 } from "../../packages/ty-context/dist/lib/composite-campaign-v6.js";
import { loadCampaignStoreV6 } from "../../packages/ty-context/dist/lib/composite-runtime-v6/campaign-store.js";
import {
  createManagedIntegrationWorktreeV1,
  createManagedSliceWorktreeV1,
  managedCampaignWorktreePathsV1,
  managedSliceWorktreePathV1,
  repositoryRelativeWorktreePathV1,
  resetManagedRepairWorktreeV1,
} from "../../packages/ty-context/dist/lib/composite-campaign-worktree-budget.js";
import { currentHead, runGit } from "../../packages/ty-context/dist/lib/composite-campaign-git-baseline.js";
import { listRepositoryWorktrees } from "../../packages/ty-context/dist/lib/composite-campaign-worktree.js";

test("abandon removes only package-owned local runtime and preserves Campaign audit", async () => {
  const fixture = await createCampaignFixtureV6({ campaignId: "abandon" });
  const userWorktree = path.join(
    os.tmpdir(),
    `campaign-user-worktree-${process.pid}-${Date.now()}`,
  );
  try {
    const loaded = await loadCampaignStoreV6(fixture.root, fixture.campaignPath);
    const base = await currentHead(fixture.root);
    const paths = managedCampaignWorktreePathsV1(fixture.root, fixture.campaignId);
    const sfc = managedSliceWorktreePathV1(
      fixture.root,
      fixture.campaignId,
      "SFC-001",
    );
    await createManagedIntegrationWorktreeV1({
      repositoryRoot: fixture.root,
      campaignId: fixture.campaignId,
      baseCommit: base,
      integrationRef: loaded.campaign.integration_ref,
      expectedWorktrees: [paths.integration],
    });
    await createManagedSliceWorktreeV1({
      repositoryRoot: fixture.root,
      campaignId: fixture.campaignId,
      sliceId: "SFC-001",
      frozenBaseCommit: base,
      checkoutCommit: base,
      expectedWorktrees: [paths.integration, sfc],
    });
    await resetManagedRepairWorktreeV1({
      repositoryRoot: fixture.root,
      campaignId: fixture.campaignId,
      baseCommit: base,
      expectedWorktrees: [paths.integration, sfc, paths.repair],
    });
    await mutateCampaignV6(
      fixture.root,
      fixture.campaignPath,
      "test_runtime_bound",
      async (_root, campaign) => {
        campaign.base_commit = base;
        campaign.integration_head = base;
        campaign.campaign_status = "executing";
        const slice = campaign.slices["SFC-001"];
        slice.status = "scheduled";
        slice.base_commit = base;
        slice.worktree_path = repositoryRelativeWorktreePathV1(
          fixture.root,
          sfc,
        );
        campaign.repair.status = "running";
        campaign.repair.base_commit = base;
        campaign.repair.head_commit = base;
        return campaign;
      },
    );

    await git(fixture.root, ["branch", "user/keep", base]);
    await git(fixture.root, ["branch", "user/other", base]);
    await git(fixture.root, ["worktree", "add", userWorktree, "user/keep"]);
    await git(fixture.root, ["update-ref", "refs/remotes/origin/keep", base]);
    const remoteBefore = (
      await runGit(fixture.root, ["rev-parse", "refs/remotes/origin/keep"])
    ).stdout.trim();
    const auditMarker = path.join(loaded.root, "slices", "SFC-001", "receipts", "audit.keep");
    await mkdir(path.dirname(auditMarker), { recursive: true });
    await writeFile(auditMarker, "preserved\n", "utf8");
    const packetMarker = path.join(
      loaded.root,
      "slices",
      "SFC-001",
      "revisions",
      "r1",
      "packet.keep",
    );
    const gateMarker = path.join(loaded.root, "gates", "result.keep");
    await mkdir(path.dirname(packetMarker), { recursive: true });
    await mkdir(path.dirname(gateMarker), { recursive: true });
    await writeFile(packetMarker, "packet preserved\n", "utf8");
    await writeFile(gateMarker, "gate preserved\n", "utf8");
    const runtime = path.join(
      fixture.root,
      "tmp",
      "ty-context",
      "composite-runtime",
      fixture.campaignId,
    );
    await mkdir(runtime, { recursive: true });
    await writeFile(path.join(runtime, "worker.stderr.log"), "runtime\n", "utf8");
    await writeFile(path.join(loaded.root, ".interrupt-request.json"), "{}\n", "utf8");

    const ordinaryCleanup = await cleanupCampaignV6(
      fixture.root,
      fixture.campaignPath,
    );
    assert.equal(
      ordinaryCleanup.blocker,
      "campaign_cleanup_requires_abandon",
    );
    const beforeAbandon = await listRepositoryWorktrees(fixture.root);
    for (const managed of [paths.integration, sfc, paths.repair])
      assert.equal(
        beforeAbandon.some((item) => samePath(item.path, managed)),
        true,
      );

    const result = await abandonCampaignV6(fixture.root, fixture.campaignPath);
    assert.equal(result.campaign_status, "abandoned");
    assert.equal(result.remote_changed, false);
    const worktrees = await listRepositoryWorktrees(fixture.root);
    assert.equal(worktrees.some((item) => samePath(item.path, userWorktree)), true);
    assert.equal(worktrees.some((item) => samePath(item.path, paths.integration)), false);
    assert.equal(worktrees.some((item) => samePath(item.path, sfc)), false);
    assert.equal(worktrees.some((item) => samePath(item.path, paths.repair)), false);
    const branches = (
      await runGit(fixture.root, ["branch", "--format=%(refname:short)"])
    ).stdout;
    assert.doesNotMatch(branches, /tyctx\/campaign\/abandon\/integration/u);
    assert.match(branches, /user\/keep/u);
    assert.match(branches, /user\/other/u);
    assert.equal(
      (
        await runGit(fixture.root, ["rev-parse", "refs/remotes/origin/keep"])
      ).stdout.trim(),
      remoteBefore,
    );
    assert.equal(await readFile(auditMarker, "utf8"), "preserved\n");
    assert.equal(await readFile(packetMarker, "utf8"), "packet preserved\n");
    assert.equal(await readFile(gateMarker, "utf8"), "gate preserved\n");
    await assert.rejects(() => access(runtime));
    await assert.rejects(() => access(path.join(loaded.root, ".interrupt-request.json")));
    const abandoned = await loadCampaignStoreV6(fixture.root, fixture.campaignPath);
    assert.equal(abandoned.campaign.campaign_status, "abandoned");
    assert.equal(abandoned.campaign.block_reason, "user_abandoned");
    assert.equal(abandoned.campaign.active_wave, null);
    assert.equal(abandoned.campaign.slices["SFC-001"].worktree_path, null);
    assert.equal(abandoned.campaign.slices["SFC-001"].current_worker_run, null);
    assert.equal(abandoned.campaign.repair.status, "idle");

    await abandonCampaignV6(fixture.root, fixture.campaignPath);
    const cleanup = await cleanupCampaignV6(fixture.root, fixture.campaignPath);
    assert.equal(cleanup.campaign_status, "abandoned");
    await assert.rejects(
      () =>
        runCampaignV6({
          projectRoot: fixture.root,
          campaignPath: fixture.campaignPath,
          controllerProfile: null,
        }),
      /campaign_abandoned_run_forbidden/,
    );
    const events = await readFile(path.join(loaded.root, "events.ndjson"), "utf8");
    assert.equal((events.match(/campaign_abandoned/gu) ?? []).length, 1);
  } finally {
    await git(fixture.root, ["worktree", "remove", "--force", userWorktree], {
      throwOnError: false,
    }).catch(() => undefined);
    await rm(userWorktree, { recursive: true, force: true });
    await rm(fixture.root, { recursive: true, force: true });
  }
});

function samePath(left, right) {
  const normalize = (value) =>
    process.platform === "win32"
      ? path.resolve(value).toLowerCase()
      : path.resolve(value);
  return normalize(left) === normalize(right);
}
