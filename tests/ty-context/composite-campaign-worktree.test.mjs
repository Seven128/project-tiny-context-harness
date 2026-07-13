import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import {
  GitCommandError,
  assertNoGitOperation,
  currentBranch,
  currentHead,
  gitStatus,
  prepareGitBaseline,
  runGit
} from "../../packages/ty-context/dist/lib/composite-campaign-git-baseline.js";
import {
  createIntegrationWorktree,
  createRepairWorktree,
  createSliceWorktree,
  listCampaignWorktrees,
  portablePathSlug,
  removeAllCampaignWorktrees,
  removeCampaignWorktree
} from "../../packages/ty-context/dist/lib/composite-campaign-worktree.js";
import { finalizeCampaignTarget } from "../../packages/ty-context/dist/lib/composite-campaign-integration.js";
import { canonicalJson, sha256Hex } from "../../packages/ty-context/dist/lib/composite-campaign-codec.js";

const exec = promisify(execFile);
const suiteStarted = performance.now();

test("git runner is shell-free, bounded, sanitized, and exposes reusable helpers", async (t) => {
  const root = await createRepository(t, "runner");
  assert.equal(await currentBranch(root), "main");
  assert.match(await currentHead(root), /^[a-f0-9]{40}$/u);
  assert.equal((await gitStatus(root)).clean, true);

  const failure = await runGit(root, ["rev-parse", "--verify", "missing;touch injected"], { throwOnError: false });
  assert.notEqual(failure.exitCode, 0);
  assert.equal(failure.timedOut, false);
  assert.equal(failure.outputLimited, false);
  await assert.rejects(runGit(root, ["rev-parse", "--verify", "missing"]), GitCommandError);

  await runGit(root, ["remote", "add", "redacted", "https://user:super-secret-password@example.invalid/repo"]);
  const remote = await runGit(root, ["remote", "get-url", "redacted"]);
  assert.doesNotMatch(remote.stdout, /super-secret-password/u);
  assert.match(remote.stdout, /<redacted>/u);
  await assert.rejects(readFile(path.join(root, "injected"), "utf8"), /ENOENT/u);
});

test("baseline preflight checkpoints dirty files and rejects secrets or active operations", async (t) => {
  const root = await createRepository(t, "checkpoint");
  const before = await currentHead(root);
  await writeFile(path.join(root, "tracked.txt"), "changed\n", "utf8");
  await writeFile(path.join(root, "new.txt"), "new\n", "utf8");
  const baseline = await prepareGitBaseline({ repositoryRoot: root, campaignId: "CMP-001", fetch: false });
  assert.equal(baseline.originalHead, before);
  assert.equal(baseline.syncAction, "no_upstream");
  assert.equal(baseline.checkpointCommit, baseline.baseCommit);
  assert.notEqual(baseline.baseCommit, before);
  assert.equal((await gitStatus(root)).clean, true);
  assert.match((await git(root, "log", "-1", "--format=%s")).stdout, /checkpoint before campaign CMP-001/u);

  const secretRoot = await createRepository(t, "secret");
  const secretHead = await currentHead(secretRoot);
  await writeFile(path.join(secretRoot, "local.env"), `${"x".repeat(1024 * 1024)}\npassword=abcdefghijklmnop\n`, "utf8");
  await assert.rejects(
    prepareGitBaseline({ repositoryRoot: secretRoot, campaignId: "CMP-SECRET", fetch: false }),
    /dirty_checkpoint_contains_apparent_secret:local.env/u
  );
  assert.equal(await currentHead(secretRoot), secretHead);

  const operationRoot = await createRepository(t, "operation");
  const mergeHead = (await runGit(operationRoot, ["rev-parse", "--path-format=absolute", "--git-path", "MERGE_HEAD"])).stdout.trim();
  await writeFile(mergeHead, `${await currentHead(operationRoot)}\n`, "utf8");
  await assert.rejects(assertNoGitOperation(operationRoot), /git_operation_in_progress:MERGE_HEAD/u);
  await rm(mergeHead, { force: true });
});

test("baseline fetches, fast-forwards, and rebases a divergent local branch", async (t) => {
  const fixture = await remoteFixture(t);
  await writeFile(path.join(fixture.peer, "remote-one.txt"), "remote one\n", "utf8");
  await git(fixture.peer, "add", "remote-one.txt");
  await git(fixture.peer, "commit", "-m", "remote one");
  await git(fixture.peer, "push", "origin", "main");

  const fastForward = await prepareGitBaseline({ repositoryRoot: fixture.local, campaignId: "CMP-FF" });
  assert.equal(fastForward.syncAction, "fast_forward");
  assert.equal((await readFile(path.join(fixture.local, "remote-one.txt"), "utf8")).trim(), "remote one");

  await writeFile(path.join(fixture.local, "local.txt"), "local\n", "utf8");
  await git(fixture.local, "add", "local.txt");
  await git(fixture.local, "commit", "-m", "local diverges");
  const localCommit = await currentHead(fixture.local);
  await writeFile(path.join(fixture.peer, "remote-two.txt"), "remote two\n", "utf8");
  await git(fixture.peer, "add", "remote-two.txt");
  await git(fixture.peer, "commit", "-m", "remote two");
  await git(fixture.peer, "push", "origin", "main");

  const rebased = await prepareGitBaseline({ repositoryRoot: fixture.local, campaignId: "CMP-REBASE" });
  assert.equal(rebased.syncAction, "rebased");
  assert.notEqual(rebased.baseCommit, localCommit);
  assert.equal((await readFile(path.join(fixture.local, "local.txt"), "utf8")).trim(), "local");
  assert.equal((await readFile(path.join(fixture.local, "remote-two.txt"), "utf8")).trim(), "remote two");
  assert.equal((await gitStatus(fixture.local)).clean, true);
});

test("integration, slice, and repair worktrees share an exact base, resume, list, and clean up only owned paths", async (t) => {
  const root = await createRepository(t, "worktrees");
  const baseCommit = await currentHead(root);
  const worktreesRoot = `${root}-owned`;
  t.after(() => rm(worktreesRoot, { recursive: true, force: true }));
  const common = { repositoryRoot: root, campaignId: "CMP-001", baseCommit, worktreesRoot };
  const integration = await createIntegrationWorktree(common);
  await assert.rejects(
    createSliceWorktree({ ...common, sliceId: "SFC-UNOWNED", branchName: "main" }),
    /worktree_branch_not_campaign_owned/u
  );
  const first = await createSliceWorktree({ ...common, sliceId: "SFC-001" });
  const second = await createSliceWorktree({ ...common, sliceId: "SFC-002" });
  const repair = await createRepairWorktree({ ...common, repairId: "WAVE-001" });
  for (const item of [integration, first, second, repair]) {
    assert.equal(item.baseCommit, baseCommit);
    assert.equal(item.headCommit, baseCommit);
    assert.equal(await currentHead(item.path), baseCommit);
    assert.equal((await gitStatus(item.path)).clean, true);
  }
  assert.deepEqual((await listCampaignWorktrees(common)).map((item) => item.branch).sort(), [
    integration.branch, first.branch, second.branch, repair.branch
  ].sort());

  const resumed = await createSliceWorktree({ ...common, sliceId: "SFC-001" });
  assert.equal(resumed.resumed, true);
  assert.equal(resumed.path, first.path);
  await writeFile(path.join(first.path, "slice.txt"), "slice\n", "utf8");
  await git(first.path, "add", "slice.txt");
  await git(first.path, "commit", "-m", "slice head");
  const advanced = await createSliceWorktree({ ...common, sliceId: "SFC-001" });
  assert.equal(advanced.resumed, true);
  assert.equal(advanced.headCommit, await currentHead(first.path));
  assert.notEqual(advanced.headCommit, baseCommit);

  await assert.rejects(
    removeCampaignWorktree({ ...common, worktreePath: root, force: true }),
    /worktree_cleanup_path_not_owned/u
  );
  await removeCampaignWorktree({ ...common, worktreePath: first.path, deleteBranch: true });
  assert.equal((await runGit(root, ["show-ref", "--verify", "--quiet", `refs/heads/${first.branch}`], { throwOnError: false })).exitCode, 1);
  assert.equal((await listCampaignWorktrees(common)).some((item) => item.path === first.path), false);
  await removeAllCampaignWorktrees({ ...common, force: true, deleteBranches: true });
  assert.deepEqual(await listCampaignWorktrees(common), []);

  assert.equal(portablePathSlug("SFC-001"), "sfc-001");
  assert.doesNotMatch(portablePathSlug("feature/../../CON"), /[\\/]/u);
  assert.match(portablePathSlug("CON"), /^x-con-/u);
});

test("target movement rebases Integration and requires a fresh Campaign final gate", async (t) => {
  const fixture = await remoteFixture(t);
  const campaignId = "CMP-TARGET-MOVED";
  const integrationBranch = "tyctx/campaign/cmp-target-moved/integration";
  const baseCommit = await currentHead(fixture.local);
  const integration = await createIntegrationWorktree({ repositoryRoot: fixture.local, campaignId, baseCommit, branchName: integrationBranch });
  await writeFile(path.join(integration.path, "campaign.txt"), "campaign\n", "utf8");
  await git(integration.path, "add", "campaign.txt");
  await git(integration.path, "commit", "-m", "campaign integration");
  const integrationHead = await currentHead(integration.path);
  const integrationTree = (await git(integration.path, "rev-parse", "HEAD^{tree}")).stdout.trim();
  const campaignRoot = path.join(fixture.local, ".codex", "composite-long-task", "campaigns", campaignId);
  await mkdir(campaignRoot, { recursive: true });
  const identity = {
    schema_version: "campaign-final-result-v1",
    campaign_id: campaignId,
    workflow_status: "ready_to_merge",
    integration_branch: integrationBranch,
    integration_head: integrationHead,
    integration_tree: integrationTree,
    final_snapshot_sha256: "a".repeat(64),
    source_plan_sha256: "b".repeat(64),
    source_coverage_sha256: "c".repeat(64),
    source_coverage_complete: true,
    slice_results: [],
    global_constraint_results: [],
    target_commit: null,
    completed_at: new Date().toISOString()
  };
  const finalResultFile = path.join(campaignRoot, "campaign-final-result.json");
  await writeFile(finalResultFile, canonicalJson({ ...identity, result_sha256: sha256Hex(canonicalJson(identity)) }));

  await writeFile(path.join(fixture.peer, "target-moved.txt"), "new target\n", "utf8");
  await git(fixture.peer, "add", "target-moved.txt");
  await git(fixture.peer, "commit", "-m", "move target");
  await git(fixture.peer, "push", "origin", "main");

  const result = await finalizeCampaignTarget({
    repositoryRoot: fixture.local,
    campaignId,
    campaignRoot,
    integrationWorktree: integration.path,
    integrationBranch,
    targetBranch: "main",
    campaignFinalResultFile: finalResultFile,
    push: false
  });
  assert.equal(result.status, "revalidation_required");
  assert.equal(result.reason, "target_moved");
  assert.notEqual(result.integration_head, integrationHead);
  assert.equal((await readFile(path.join(integration.path, "campaign.txt"), "utf8")).trim(), "campaign");
  assert.equal((await readFile(path.join(integration.path, "target-moved.txt"), "utf8")).trim(), "new target");
  await removeAllCampaignWorktrees({ repositoryRoot: fixture.local, campaignId, force: true, deleteBranches: true });
});

test("focused worktree suite stays below two minutes", () => {
  assert.ok(performance.now() - suiteStarted < 120_000, "Campaign worktree focused suite exceeded two minutes");
});

async function createRepository(t, label) {
  const root = await mkdtemp(path.join(os.tmpdir(), `tyctx-${label}-`));
  t.after(() => rm(root, { recursive: true, force: true }));
  await git(root, "init", "-q", "-b", "main");
  await configureIdentity(root);
  await writeFile(path.join(root, "tracked.txt"), "initial\n", "utf8");
  await git(root, "add", "tracked.txt");
  await git(root, "commit", "-m", "initial");
  return root;
}

async function remoteFixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "tyctx-remote-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const remote = path.join(root, "remote.git");
  const local = path.join(root, "local");
  const peer = path.join(root, "peer");
  await mkdir(remote, { recursive: true });
  await git(remote, "init", "--bare", "-q");
  await mkdir(local, { recursive: true });
  await git(local, "init", "-q", "-b", "main");
  await configureIdentity(local);
  await writeFile(path.join(local, "initial.txt"), "initial\n", "utf8");
  await git(local, "add", "initial.txt");
  await git(local, "commit", "-m", "initial");
  await git(local, "remote", "add", "origin", remote);
  await git(local, "push", "-u", "origin", "main");
  await exec("git", ["clone", "-q", "-b", "main", remote, peer], { windowsHide: true });
  await configureIdentity(peer);
  return { local, peer };
}

async function configureIdentity(root) {
  await git(root, "config", "user.name", "Tiny Context Test");
  await git(root, "config", "user.email", "tiny-context@example.invalid");
}

async function git(root, ...args) {
  return exec("git", args, { cwd: root, encoding: "utf8", windowsHide: true, timeout: 30_000, maxBuffer: 1024 * 1024 });
}
