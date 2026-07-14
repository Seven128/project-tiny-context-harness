import { execFile } from "node:child_process";
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { canonicalJson, sha256Hex } from "../../../packages/ty-context/dist/lib/composite-campaign-codec.js";
import { currentHead, gitStatus } from "../../../packages/ty-context/dist/lib/composite-campaign-git-baseline.js";
import { createIntegrationWorktree, portablePathSlug } from "../../../packages/ty-context/dist/lib/composite-campaign-worktree.js";
import { buildTargetFinalizationReceipt } from "../../../packages/ty-context/dist/lib/composite-campaign-target-receipts.js";
import { createCampaignV5, mutateCampaignV5 } from "../../../packages/ty-context/dist/lib/composite-campaign-v5.js";

const exec = promisify(execFile);

export async function readyTargetFixture(t, label, options = {}) {
  const repository = await createRepository(t, label, options.remote === true);
  const campaignId = `CMP-${label.toUpperCase().replace(/[^A-Z0-9]+/gu, "-")}`;
  const integrationBranch = `tyctx/campaign/${portablePathSlug(campaignId)}/integration`;
  const baseCommit = await currentHead(repository.root);
  const integration = await createIntegrationWorktree({
    repositoryRoot: repository.root,
    campaignId,
    baseCommit,
    branchName: integrationBranch,
  });
  await writeFile(path.join(integration.path, "campaign.txt"), `${label}\n`);
  await git(integration.path, "add", "campaign.txt");
  await git(integration.path, "commit", "-m", "campaign integration");
  const finalResult = await writeReadyFinalResult({
    root: repository.root,
    campaignId,
    integrationBranch,
    integrationPath: integration.path,
  });
  return {
    ...repository,
    campaignId,
    integrationBranch,
    integration,
    finalResult,
    primaryHead: await currentHead(repository.root),
    primaryStatus: await gitStatus(repository.root),
    options: {
      repositoryRoot: repository.root,
      campaignId,
      campaignRoot: finalResult.campaignRoot,
      integrationWorktree: integration.path,
      integrationBranch,
      targetBranch: "main",
      campaignFinalResultFile: finalResult.file,
      autoPush: true,
      protectedBranchMode: "pull_request",
      preservePrimaryWorktree: true,
    },
  };
}

export async function readyAcceptedFixture(t, label) {
  const fixture = await readyTargetFixture(t, label);
  await rm(fixture.finalResult.campaignRoot, { recursive: true, force: true });
  const created = await createCampaignV5(
    fixture.root,
    fixture.campaignId,
    "plan.md",
    "main",
  );
  const { result_sha256: _oldHash, ...readyIdentity } = fixture.finalResult.value;
  readyIdentity.source_plan_sha256 = created.campaign.source_plan_sha256;
  fixture.finalResult.value = {
    ...readyIdentity,
    result_sha256: sha256Hex(canonicalJson(readyIdentity)),
  };
  fixture.finalResult.campaignRoot = created.campaign_path;
  fixture.finalResult.file = path.join(
    created.campaign_path,
    "campaign-final-result.json",
  );
  await writeFile(
    fixture.finalResult.file,
    canonicalJson(fixture.finalResult.value),
  );
  await mutateCampaignV5(
    fixture.root,
    created.campaign_path,
    "test_final_gate_ready",
    async (_root, campaign) => {
      campaign.base_commit = fixture.integration.baseCommit;
      campaign.integration_head = fixture.finalResult.value.integration_head;
      campaign.campaign_status = "finalizing";
      return campaign;
    },
  );
  const receipt = buildTargetFinalizationReceipt({
    finalResult: fixture.finalResult.value,
    targetBranch: "main",
    targetCommit: fixture.finalResult.value.integration_head,
    targetTree: fixture.finalResult.value.integration_tree,
    acceptanceBasis: "exact_commit",
    targetRevalidation: null,
  });
  return { ...fixture, campaignRoot: created.campaign_path, receipt };
}

export async function snapshotEvaluation(worktree, workflowStatus = "verified") {
  const head = await currentHead(worktree);
  const tree = (await git(worktree, "rev-parse", `${head}^{tree}`)).stdout.trim();
  return {
    snapshot_head: head,
    snapshot_tree: tree,
    source_coverage_sha256: "c".repeat(64),
    final_snapshot_sha256: "d".repeat(64),
    slice_results: [],
    global_constraint_results: [],
    workflow_status: workflowStatus,
  };
}

export async function fastForwardMain(fixture) {
  await git(fixture.root, "merge", "--ff-only", fixture.integrationBranch);
}

export async function makeTargetTreeEquivalent(fixture, message = "equivalent") {
  const content = await readFile(path.join(fixture.integration.path, "campaign.txt"));
  await writeFile(path.join(fixture.root, "campaign.txt"), content);
  await git(fixture.root, "add", "campaign.txt");
  await git(fixture.root, "commit", "-m", message);
}

export async function addTargetCommit(fixture, name = "target-extra.txt") {
  await writeFile(path.join(fixture.root, name), `${name}\n`);
  await git(fixture.root, "add", name);
  await git(fixture.root, "commit", "-m", `target ${name}`);
}

export async function installProtectedHook(fixture) {
  const hook = path.join(fixture.remote, "hooks", "pre-receive");
  await writeFile(
    hook,
    "#!/bin/sh\necho 'protected branch: permission denied' >&2\nexit 1\n",
  );
  await chmod(hook, 0o755);
}

export async function advanceRemoteFromPeer(fixture, name = "remote-race.txt") {
  await writeFile(path.join(fixture.peer, name), `${name}\n`);
  await git(fixture.peer, "add", name);
  await git(fixture.peer, "commit", "-m", `peer ${name}`);
  await git(fixture.peer, "push", "origin", "main");
}

export async function git(root, ...args) {
  return exec("git", args, {
    cwd: root,
    windowsHide: true,
    maxBuffer: 1024 * 1024,
  });
}

async function createRepository(t, label, remoteEnabled) {
  const parent = await mkdtemp(path.join(os.tmpdir(), `tyctx-final-${label}-`));
  t.after(() => rm(parent, { recursive: true, force: true }));
  const root = path.join(parent, "repo");
  await mkdir(path.join(root, "project_context", "areas"), { recursive: true });
  await git(root, "init", "-q", "-b", "main");
  await configureIdentity(root);
  await writeFile(path.join(root, "tracked.txt"), "initial\n");
  await writeFile(path.join(root, "plan.md"), "finalize the campaign\n");
  await writeFile(path.join(root, "project_context", "global.md"), "# Global\n");
  await writeFile(path.join(root, "project_context", "architecture.md"), "# Architecture\n");
  await writeFile(path.join(root, "project_context", "areas", "main.md"), "# Main\n");
  await writeFile(
    path.join(root, "project_context", "context.toml"),
    '[[areas]]\nid = "main"\nroot = "."\ncontext = "project_context/areas/main.md"\nkind = "application"\ndefault = true\n',
  );
  await git(root, "add", ".");
  await git(root, "commit", "-m", "initial");
  if (!remoteEnabled) return { parent, root, remote: null, peer: null };
  const remote = path.join(parent, "remote.git");
  await mkdir(remote, { recursive: true });
  await git(remote, "init", "--bare", "-q");
  await git(root, "remote", "add", "origin", remote);
  await git(root, "push", "-u", "origin", "main");
  const peer = path.join(parent, "peer");
  await exec("git", ["clone", "-q", "-b", "main", remote, peer], {
    windowsHide: true,
  });
  await configureIdentity(peer);
  return { parent, root, remote, peer };
}

async function writeReadyFinalResult(options) {
  const integrationHead = await currentHead(options.integrationPath);
  const integrationTree = (
    await git(options.integrationPath, "rev-parse", "HEAD^{tree}")
  ).stdout.trim();
  const campaignRoot = path.join(
    options.root,
    ".codex",
    "composite-long-task",
    "campaigns",
    options.campaignId,
  );
  await mkdir(campaignRoot, { recursive: true });
  const identity = {
    schema_version: "campaign-final-result-v1",
    campaign_id: options.campaignId,
    workflow_status: "ready_to_merge",
    integration_branch: options.integrationBranch,
    integration_head: integrationHead,
    integration_tree: integrationTree,
    final_snapshot_sha256: "a".repeat(64),
    source_plan_sha256: "b".repeat(64),
    source_coverage_sha256: "c".repeat(64),
    source_coverage_complete: true,
    slice_results: [],
    global_constraint_results: [],
    target_commit: null,
    completed_at: new Date().toISOString(),
  };
  const value = {
    ...identity,
    result_sha256: sha256Hex(canonicalJson(identity)),
  };
  const file = path.join(campaignRoot, "campaign-final-result.json");
  await writeFile(file, canonicalJson(value));
  return { campaignRoot, file, value };
}

async function configureIdentity(root) {
  await git(root, "config", "user.name", "Tiny Context Test");
  await git(root, "config", "user.email", "tiny-context@example.invalid");
}
