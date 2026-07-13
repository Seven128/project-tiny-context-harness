import test from "node:test";
import assert from "node:assert/strict";
import { appendFile, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { compileLongTaskContract } from "../../packages/ty-context/dist/lib/long-task-contract-compiler.js";
import { activateLongTask, clearAcceptedLongTaskBinding } from "../../packages/ty-context/dist/lib/long-task-active-task.js";
import { writeLongTaskFinalAuthority } from "../../packages/ty-context/dist/lib/long-task-final-receipt.js";
import { resolveGitWorktreePaths } from "../../packages/ty-context/dist/lib/git-worktree-paths.js";
import { runCompositeCompile, writeHappyV3Contract } from "./long-task-v3-fixtures.mjs";

const pointer = (root, owner) => path.join(root, owner, "ty-context-active-long-task.json");

test("active compile guard is idempotent and fails closed without replacing the active contract", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ltw-active-"));
  const workdir = await writeHappyV3Contract(root);
  const otherWorkdir = path.join(root, "task-two");
  await mkdir(otherWorkdir, { recursive: true });
  for (const file of ["product-architecture-source.yaml", "technical-realization-plan.yaml", "acceptance-checklist.yaml"]) {
    await copyFile(path.join(workdir, file), path.join(otherWorkdir, file));
  }

  await compileLongTaskContract(workdir, root);
  await assert.rejects(readFile(pointer(root, ".codex"), "utf8"), /ENOENT/);
  await assert.rejects(readFile(pointer(root, ".git"), "utf8"), /ENOENT/);

  const first = runCompositeCompile(root, workdir);
  assert.equal(first.status, 0, first.stderr);
  const projectPointer = await readFile(pointer(root, ".codex"), "utf8");
  const gitPointer = await readFile(pointer(root, ".git"), "utf8");
  const compiledBefore = await readFile(path.join(workdir, "compiled-contract.json"), "utf8");
  assert.equal(projectPointer, gitPointer);

  const repeated = runCompositeCompile(root, workdir);
  assert.equal(repeated.status, 0, repeated.stderr);
  assert.equal(await readFile(pointer(root, ".codex"), "utf8"), projectPointer);
  assert.equal(await readFile(path.join(workdir, "compiled-contract.json"), "utf8"), compiledBefore);

  const other = runCompositeCompile(root, otherWorkdir);
  assert.notEqual(other.status, 0);
  assert.match(other.stderr, /active_contract_changed/);
  await assert.rejects(readFile(path.join(otherWorkdir, "compiled-contract.json"), "utf8"), /ENOENT/);

  await appendFile(path.join(workdir, "product-architecture-source.yaml"), "# changed contract\n");
  const changed = runCompositeCompile(root, workdir);
  assert.notEqual(changed.status, 0);
  assert.match(changed.stderr, /active_contract_changed/);
  assert.equal(await readFile(path.join(workdir, "compiled-contract.json"), "utf8"), compiledBefore);

  await rm(pointer(root, ".git"));
  const missing = runCompositeCompile(root, workdir);
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /active_contract_changed:pointer_missing/);
  assert.equal(await readFile(path.join(workdir, "compiled-contract.json"), "utf8"), compiledBefore);

  await writeFile(pointer(root, ".git"), projectPointer);
  const inconsistent = JSON.parse(projectPointer);
  inconsistent.workdir = otherWorkdir;
  await writeFile(pointer(root, ".git"), JSON.stringify(inconsistent));
  const mismatch = runCompositeCompile(root, workdir);
  assert.notEqual(mismatch.status, 0);
  assert.match(mismatch.stderr, /active_contract_changed:pointer_mismatch/);
  assert.equal(await readFile(path.join(workdir, "compiled-contract.json"), "utf8"), compiledBefore);
});

test("linked worktrees keep independent V4 active bindings in their own Git dirs", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ltw-active-linked-root-"));
  await writeHappyV3Contract(root);
  await appendFile(path.join(root, ".git", "info", "exclude"), "\n/task/\n", "utf8");
  const first = await mkdtemp(path.join(os.tmpdir(), "ltw active linked a "));
  const second = await mkdtemp(path.join(os.tmpdir(), "ltw active linked b "));
  try {
    git(root, ["worktree", "add", "--detach", first, "HEAD"]);
    git(root, ["worktree", "add", "--detach", second, "HEAD"]);
    const firstCompile = runCompositeCompile(first, path.join(first, "task"));
    const secondCompile = runCompositeCompile(second, path.join(second, "task"));
    assert.equal(firstCompile.status, 0, firstCompile.stderr);
    assert.equal(secondCompile.status, 0, secondCompile.stderr);
    const firstPaths = await resolveGitWorktreePaths(path.join(first, "src"));
    const secondPaths = await resolveGitWorktreePaths(second);
    assert.equal(firstPaths.worktree_root, path.resolve(first));
    assert.notEqual(firstPaths.git_dir, firstPaths.common_dir);
    assert.equal(firstPaths.common_dir, secondPaths.common_dir);

    const firstGitPointer = git(first, ["rev-parse", "--path-format=absolute", "--git-path", "ty-context-active-long-task.json"]);
    const secondGitPointer = git(second, ["rev-parse", "--path-format=absolute", "--git-path", "ty-context-active-long-task.json"]);
    const firstProjectPointer = path.join(first, ".codex", "ty-context-active-long-task.json");
    const secondProjectPointer = path.join(second, ".codex", "ty-context-active-long-task.json");
    const firstBinding = JSON.parse(await readFile(firstGitPointer, "utf8"));
    const secondBinding = JSON.parse(await readFile(secondGitPointer, "utf8"));
    assert.equal(firstBinding.schema_version, "active-long-task-binding-v4");
    assert.equal(firstBinding.campaign_id, null);
    assert.equal(firstBinding.slice_id, null);
    assert.notEqual(firstBinding.worktree_id, secondBinding.worktree_id);
    assert.equal(await readFile(firstProjectPointer, "utf8"), await readFile(firstGitPointer, "utf8"));
    assert.equal(await readFile(secondProjectPointer, "utf8"), await readFile(secondGitPointer, "utf8"));
    const firstContract = JSON.parse(await readFile(path.join(first, "task", "compiled-contract.json"), "utf8"));
    const secondContract = JSON.parse(await readFile(path.join(second, "task", "compiled-contract.json"), "utf8"));
    await writeLongTaskFinalAuthority(firstContract, path.join(first, "task"), { run_id: "FINAL-A", workflow_status: "accepted", final_snapshot_sha256: "a".repeat(64) });
    await writeLongTaskFinalAuthority(secondContract, path.join(second, "task"), { run_id: "FINAL-B", workflow_status: "accepted", final_snapshot_sha256: "b".repeat(64) });
    const firstFinalReceipt = git(first, ["rev-parse", "--path-format=absolute", "--git-path", "ty-context-final-result-receipt.json"]);
    const secondFinalReceipt = git(second, ["rev-parse", "--path-format=absolute", "--git-path", "ty-context-final-result-receipt.json"]);
    assert.notEqual(firstFinalReceipt, secondFinalReceipt);
    assert.equal(JSON.parse(await readFile(firstFinalReceipt, "utf8")).run_id, "FINAL-A");
    assert.equal(JSON.parse(await readFile(secondFinalReceipt, "utf8")).run_id, "FINAL-B");
    assert.equal(git(first, ["status", "--porcelain=v1", "--untracked-files=all"]), "");
    assert.equal(git(second, ["status", "--porcelain=v1", "--untracked-files=all"]), "");

    assert.equal(await clearAcceptedLongTaskBinding(second, path.join(second, "task")), true);
    await activateLongTask(secondContract, secondContract.verifier_identity.hook_bundle_sha256, { campaign_id: "CMP-001", slice_id: "SFC-002" });
    const campaignBinding = JSON.parse(await readFile(secondGitPointer, "utf8"));
    assert.equal(campaignBinding.campaign_id, "CMP-001");
    assert.equal(campaignBinding.slice_id, "SFC-002");
    assert.equal(JSON.parse(await readFile(firstFinalReceipt, "utf8")).run_id, "FINAL-A");
    await assert.rejects(readFile(secondFinalReceipt, "utf8"), /ENOENT/);

    assert.equal(await clearAcceptedLongTaskBinding(first, path.join(first, "task")), true);
    await assert.rejects(readFile(firstGitPointer, "utf8"), /ENOENT/);
    assert.equal(JSON.parse(await readFile(secondGitPointer, "utf8")).worktree_id, secondBinding.worktree_id);
  } finally {
    git(root, ["worktree", "remove", "--force", first], true);
    git(root, ["worktree", "remove", "--force", second], true);
  }
});

function git(cwd, args, allowFailure = false) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8", windowsHide: true });
  if (!allowFailure) assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}
