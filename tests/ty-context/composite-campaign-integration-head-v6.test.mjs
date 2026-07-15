import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  reconcileIntegrationHeadAuthorityV6,
} from "../../packages/ty-context/dist/lib/composite-campaign-integration-head-v6.js";
import {
  isExecutableSliceStatusV6,
  reconcileActiveWaveIdentityV6,
  transitionSliceStatusV6,
  transitionWaveStatusV6,
} from "../../packages/ty-context/dist/lib/composite-campaign-state-transition-v6.js";
import {
  cleanupManagedCampaignWorktreesV1,
  createManagedIntegrationWorktreeV1,
  managedCampaignWorktreePathsV1,
} from "../../packages/ty-context/dist/lib/composite-campaign-worktree-budget.js";
import { currentHead, runGit } from "../../packages/ty-context/dist/lib/composite-campaign-git-baseline.js";

test("persisted Integration HEAD is authoritative and only mechanical effects roll back", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "campaign-head-v6-"));
  const campaignId = "head";
  const integrationRef = "tyctx/campaign/head/integration";
  try {
    await git(root, ["init", "-b", "main"]);
    await git(root, ["config", "user.email", "test@example.com"]);
    await git(root, ["config", "user.name", "Test"]);
    await writeFile(path.join(root, "base.txt"), "base\n", "utf8");
    await git(root, ["add", "base.txt"]);
    await git(root, ["commit", "-m", "base"]);
    const base = await currentHead(root);
    const paths = managedCampaignWorktreePathsV1(root, campaignId);
    await createManagedIntegrationWorktreeV1({
      repositoryRoot: root,
      campaignId,
      baseCommit: base,
      integrationRef,
      expectedWorktrees: [paths.integration],
    });
    const matching = campaign(base, base, "executing", null);
    const unchanged = await reconcileIntegrationHeadAuthorityV6({
      repositoryRoot: root,
      integrationWorktree: paths.integration,
      campaign: matching,
    });
    assert.equal(unchanged.event, null);
    assert.equal(unchanged.actual_head_after, base);
    await writeFile(path.join(paths.integration, "ahead.txt"), "ahead\n", "utf8");
    await git(paths.integration, ["add", "ahead.txt"]);
    await git(paths.integration, ["commit", "-m", "unpersisted"]);
    const ahead = await currentHead(paths.integration);
    const mechanical = campaign(base, base, "integrating", "WAVE-001");
    const rolledBack = await reconcileIntegrationHeadAuthorityV6({
      repositoryRoot: root,
      integrationWorktree: paths.integration,
      campaign: mechanical,
    });
    assert.equal(rolledBack.event, "integration_unpersisted_effect_rolled_back");
    assert.equal(await currentHead(paths.integration), base);

    mechanical.integration_head = ahead;
    const restored = await reconcileIntegrationHeadAuthorityV6({
      repositoryRoot: root,
      integrationWorktree: paths.integration,
      campaign: mechanical,
    });
    assert.equal(restored.event, "integration_worktree_restored_to_persisted_head");
    assert.equal(await currentHead(paths.integration), ahead);

    await writeFile(path.join(root, "other.txt"), "other\n", "utf8");
    await git(root, ["add", "other.txt"]);
    await git(root, ["commit", "-m", "other"]);
    const unrelated = await currentHead(root);
    mechanical.integration_head = unrelated;
    await assert.rejects(
      () =>
        reconcileIntegrationHeadAuthorityV6({
          repositoryRoot: root,
          integrationWorktree: paths.integration,
          campaign: mechanical,
        }),
      /integration_head_unexpected_drift/,
    );

    await git(paths.integration, ["reset", "--hard", base]);
    await writeFile(path.join(paths.integration, "dirty.txt"), "dirty\n", "utf8");
    const ordinary = campaign(base, base, "executing", null);
    await assert.rejects(
      () =>
        reconcileIntegrationHeadAuthorityV6({
          repositoryRoot: root,
          integrationWorktree: paths.integration,
          campaign: ordinary,
        }),
      /integration_worktree_dirty_during_reconcile/,
    );
  } finally {
    await cleanupManagedCampaignWorktreesV1({
      repositoryRoot: root,
      campaignId,
      integrationRef,
    }).catch(() => undefined);
    await rm(root, { recursive: true, force: true });
  }
});

test("accepted and merged states are monotonic and active Wave recovery fails closed", () => {
  assert.equal(isExecutableSliceStatusV6("accepted"), false);
  assert.equal(isExecutableSliceStatusV6("needs_attention"), true);
  assert.throws(
    () => transitionSliceStatusV6({ status: "accepted" }, "scheduled"),
    /campaign_slice_transition_invalid/,
  );
  assert.throws(
    () => transitionWaveStatusV6("merged", "running"),
    /campaign_wave_transition_invalid/,
  );
  const recoverable = {
    active_wave: null,
    waves: {
      "WAVE-001": { status: "accepted", slice_ids: ["SFC-001"] },
    },
    slices: {
      "SFC-001": { wave_id: "WAVE-001" },
    },
  };
  assert.deepEqual(reconcileActiveWaveIdentityV6(recoverable), {
    changed: true,
    active_wave: "WAVE-001",
  });
  const ambiguous = {
    active_wave: null,
    waves: {
      "WAVE-001": { status: "accepted", slice_ids: ["SFC-001"] },
      "WAVE-002": { status: "merged", slice_ids: ["SFC-002"] },
    },
    slices: {
      "SFC-001": { wave_id: "WAVE-001" },
      "SFC-002": { wave_id: "WAVE-002" },
    },
  };
  assert.throws(
    () => reconcileActiveWaveIdentityV6(ambiguous),
    /multiple_incomplete_waves/,
  );
});

function campaign(base_commit, integration_head, campaign_status, active_wave) {
  return {
    base_commit,
    integration_head,
    campaign_status,
    active_wave,
    repair: { status: "idle" },
  };
}
async function git(root, args) {
  return runGit(root, ["-c", "commit.gpgSign=false", ...args], {
    timeoutMs: 120_000,
  });
}
