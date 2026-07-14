import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { finalizeCampaignTarget } from "../../packages/ty-context/dist/lib/composite-campaign-target-finalization.js";
import { openAutomaticPullRequest } from "../../packages/ty-context/dist/lib/composite-campaign-target-delivery.js";
import { listCampaignWorktrees } from "../../packages/ty-context/dist/lib/composite-campaign-worktree.js";
import {
  addTargetCommit,
  advanceRemoteFromPeer,
  fastForwardMain,
  git,
  installProtectedHook,
  makeTargetTreeEquivalent,
  readyTargetFixture,
  snapshotEvaluation,
} from "./helpers/composite-campaign-finalization-fixture.mjs";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

test("target_exact_commit_is_accepted_without_pr", async (t) => {
  const fixture = await readyTargetFixture(t, "exact-commit");
  await fastForwardMain(fixture);
  let prCalls = 0;
  const result = await finalizeCampaignTarget({
    ...fixture.options,
    pullRequestOpener: async () => {
      prCalls += 1;
      return "https://example.invalid/pr/1";
    },
  });
  assert.equal(result.status, "accepted");
  assert.equal(result.receipt.acceptance_basis, "exact_commit");
  assert.equal(prCalls, 0);
  const worktrees = await listCampaignWorktrees({
    repositoryRoot: fixture.root,
    campaignId: fixture.campaignId,
  });
  assert.equal(worktrees.some((item) => item.branch?.endsWith("/target")), false);
});

test("target_exact_tree_different_commit_is_accepted", async (t) => {
  const fixture = await readyTargetFixture(t, "exact-tree");
  await makeTargetTreeEquivalent(fixture);
  const result = await finalizeCampaignTarget(fixture.options);
  assert.equal(result.status, "accepted");
  assert.equal(result.receipt.acceptance_basis, "exact_tree");
  assert.notEqual(result.target_commit, fixture.finalResult.value.integration_head);
});

test("target_merge_commit_is_revalidated_and_accepted", async (t) => {
  const fixture = await readyTargetFixture(t, "merge-revalidated");
  await git(fixture.root, "merge", "--no-ff", "--no-commit", fixture.integrationBranch);
  await writeFile(path.join(fixture.root, "merge-only.txt"), "merge\n");
  await git(fixture.root, "add", "merge-only.txt");
  await git(fixture.root, "commit", "-m", "merge with target content");
  const result = await finalizeCampaignTarget({
    ...fixture.options,
    snapshotEvaluator: (worktree) => snapshotEvaluation(worktree),
  });
  assert.equal(result.status, "accepted");
  assert.equal(result.receipt.acceptance_basis, "target_snapshot_revalidated");
});

test("squash_merge_is_recognized_by_tree", async (t) => {
  const fixture = await readyTargetFixture(t, "squash-tree");
  await git(fixture.root, "merge", "--squash", fixture.integrationBranch);
  await git(fixture.root, "commit", "-m", "squash campaign");
  const result = await finalizeCampaignTarget(fixture.options);
  assert.equal(result.status, "accepted");
  assert.equal(result.receipt.acceptance_basis, "exact_tree");
});

test("squash_merge_plus_later_commit_is_target_revalidated", async (t) => {
  const fixture = await readyTargetFixture(t, "squash-later");
  await git(fixture.root, "merge", "--squash", fixture.integrationBranch);
  await git(fixture.root, "commit", "-m", "squash campaign");
  await addTargetCommit(fixture);
  const result = await finalizeCampaignTarget({
    ...fixture.options,
    snapshotEvaluator: (worktree) => snapshotEvaluation(worktree),
  });
  assert.equal(result.status, "accepted");
  assert.equal(result.receipt.acceptance_basis, "target_snapshot_revalidated");
});

test("target_snapshot_missing_requirement_is_not_accepted", async (t) => {
  const fixture = await readyTargetFixture(t, "target-missing");
  await fastForwardMain(fixture);
  await addTargetCommit(fixture, "breaking.txt");
  const result = await finalizeCampaignTarget({
    ...fixture.options,
    snapshotEvaluator: (worktree) => snapshotEvaluation(worktree, "needs_work"),
  });
  assert.equal(result.status, "revalidation_required");
  assert.equal(result.reason, "target_contains_integration_but_invalid");
});

test("manual_local_fast_forward_rerun_is_accepted", async (t) => {
  const fixture = await readyTargetFixture(t, "manual-local");
  const first = await finalizeCampaignTarget(fixture.options);
  assert.equal(first.status, "external_approval_required");
  await fastForwardMain(fixture);
  const second = await finalizeCampaignTarget(fixture.options);
  assert.equal(second.status, "accepted");
  assert.equal(second.receipt.acceptance_basis, "exact_commit");
});

test("merged_pr_rerun_is_accepted", async (t) => {
  const fixture = await readyTargetFixture(t, "merged-pr", { remote: true });
  const first = await finalizeCampaignTarget({ ...fixture.options, autoPush: false });
  assert.equal(first.status, "external_approval_required");
  await fastForwardMain(fixture);
  await git(fixture.root, "push", "origin", "main");
  const second = await finalizeCampaignTarget(fixture.options);
  assert.equal(second.status, "accepted");
  assert.equal(second.receipt.acceptance_basis, "exact_commit");
});

test("closed_unmerged_pr_is_not_reused", async (t) => {
  const fixture = await readyTargetFixture(t, "closed-pr", { remote: true });
  const calls = [];
  const url = await openAutomaticPullRequest({
    repository: fixture.integration.path,
    remote: "origin",
    targetBranch: "main",
    integrationBranch: fixture.integrationBranch,
    campaignId: fixture.campaignId,
    ghRunner: async (_cwd, args) => {
      calls.push(args);
      return args.includes("list")
        ? {
            exitCode: 0,
            stdout: JSON.stringify([{ url: "https://example.invalid/old", state: "CLOSED", baseRefName: "main", headRefName: fixture.integrationBranch }]),
          }
        : { exitCode: 0, stdout: "https://example.invalid/new\n" };
    },
  });
  assert.equal(url, "https://example.invalid/new");
  assert.ok(calls.some((args) => args.includes("create")));
});

test("open_matching_pr_is_reused_once", async (t) => {
  const fixture = await readyTargetFixture(t, "open-pr", { remote: true });
  let creates = 0;
  const url = await openAutomaticPullRequest({
    repository: fixture.integration.path,
    remote: "origin",
    targetBranch: "main",
    integrationBranch: fixture.integrationBranch,
    campaignId: fixture.campaignId,
    ghRunner: async (_cwd, args) => {
      if (args.includes("create")) creates += 1;
      return {
        exitCode: 0,
        stdout: args.includes("list")
          ? JSON.stringify([{ url: "https://example.invalid/open", state: "OPEN", baseRefName: "main", headRefName: fixture.integrationBranch }])
          : "https://example.invalid/new\n",
      };
    },
  });
  assert.equal(url, "https://example.invalid/open");
  assert.equal(creates, 0);
});

test("unprotected_remote_fast_forward_push_is_accepted", async (t) => {
  const fixture = await readyTargetFixture(t, "remote-ff", { remote: true });
  const result = await finalizeCampaignTarget(fixture.options);
  assert.equal(result.status, "accepted");
  assert.equal(result.receipt.acceptance_basis, "remote_fast_forward");
});

test("protected_remote_rejection_opens_pr", async (t) => {
  const fixture = await readyTargetFixture(t, "protected", { remote: true });
  await installProtectedHook(fixture);
  let opened = 0;
  const result = await finalizeCampaignTarget({
    ...fixture.options,
    pullRequestOpener: async () => {
      opened += 1;
      return "https://example.invalid/protected-pr";
    },
  });
  assert.equal(result.status, "external_approval_required");
  assert.match(result.reason, /automatic_pull_request_opened/u);
  assert.equal(opened, 1);
});

test("remote_target_moves_before_push_requires_resync", async (t) => {
  const fixture = await readyTargetFixture(t, "remote-race", { remote: true });
  const result = await finalizeCampaignTarget({
    ...fixture.options,
    snapshotEvaluator: async (worktree) => {
      await advanceRemoteFromPeer(fixture);
      return snapshotEvaluation(worktree, "needs_work");
    },
  });
  assert.equal(result.status, "revalidation_required");
  assert.equal(result.reason, "target_moved");
});

test("remote_push_never_uses_force", async () => {
  const source = await readFile(
    path.join(
      repoRoot,
      "packages",
      "ty-context",
      "src",
      "lib",
      "composite-campaign-target-delivery.ts",
    ),
    "utf8",
  );
  assert.doesNotMatch(source, /\["push"[^\]]*"--force"/u);
  assert.doesNotMatch(source, /\["push"[^\]]*"-f"/u);
});

test("push_success_is_refetched_and_verified", async (t) => {
  const fixture = await readyTargetFixture(t, "push-verify", { remote: true });
  const result = await finalizeCampaignTarget(fixture.options);
  assert.equal(result.status, "accepted");
  const remoteHead = (await git(fixture.root, "rev-parse", "origin/main")).stdout.trim();
  assert.equal(remoteHead, result.target_commit);
  assert.equal(result.target_commit, fixture.finalResult.value.integration_head);
});
