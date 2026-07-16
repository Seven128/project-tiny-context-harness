import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import {
  access,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import {
  loadActiveLongTaskAuthority,
  readProgressRecords,
} from "../../packages/ty-context/dist/lib/long-task-state.js";
import {
  commitCandidate,
  createDeliveryFixture,
  parseCliJson,
  runCli,
  runCliFailure,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";

const exec = promisify(execFile);
const repository = fileURLToPath(new URL("../..", import.meta.url));
const cli = path.join(repository, "packages/ty-context/dist/cli.js");
const fixture = await createDeliveryFixture();
const originalContract = structuredClone(fixture.contract);
const signalRoot = path.join(
  os.tmpdir(),
  `ty-context-authority-smoke-${process.pid}-${Date.now()}`,
);
const started = path.join(signalRoot, "started.txt");
const release = path.join(signalRoot, "release.txt");
const raceEnvironment = {
  ...process.env,
  TY_CONTEXT_SMOKE_STARTED: started,
  TY_CONTEXT_SMOKE_RELEASE: release,
};

try {
  const branchBefore = await git(fixture.root, ["branch", "--show-current"]);
  const worktreesBefore = await git(fixture.root, [
    "worktree",
    "list",
    "--porcelain",
  ]);
  assert.equal(worktreeCount(worktreesBefore), 1);

  await rm(fixture.workdir, { recursive: true, force: true });
  await mkdir(signalRoot, { recursive: true });
  await installSmokeOracle(fixture.root);
  await commitCandidate(fixture.root);

  await runCli(fixture.root, ["enable", "long-task"]);
  await runCli(fixture.root, ["long-task", "init", fixture.workdir]);
  fixture.contract = structuredClone(originalContract);
  await writeContract(fixture.workdir, fixture.contract);
  const first = await runCli(fixture.root, [
    "long-task",
    "compile",
    fixture.workdir,
  ]);
  assert.equal(first.authority_revision, 1);

  fixture.contract.task.goal = "Weakened before verify.";
  await writeContract(fixture.workdir, fixture.contract);
  await assert.rejects(
    () =>
      runCli(fixture.root, [
        "long-task",
        "compile",
        fixture.workdir,
        "--revise",
      ]),
    /authority_change_requires_user_decision/u,
  );
  fixture.contract = structuredClone(originalContract);
  await writeContract(fixture.workdir, fixture.contract);
  await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);

  await runCli(fixture.root, ["long-task", "verify", fixture.workdir]);
  const initialReceipt = await runCli(fixture.root, [
    "long-task",
    "final-gate",
    fixture.workdir,
  ]);
  assert.equal(initialReceipt.workflow_status, "machine_accepted");
  await Promise.all([
    rm(path.join(fixture.workdir, ".ty-context", "progress"), {
      recursive: true,
      force: true,
    }),
    rm(
      path.join(fixture.workdir, ".ty-context", "compiled-contract.json"),
      { force: true },
    ),
    rm(
      path.join(fixture.workdir, ".ty-context", "final-receipt.json"),
      { force: true },
    ),
  ]);
  fixture.contract.task.goal = "Weakened after derived state deletion.";
  await writeContract(fixture.workdir, fixture.contract);
  await assert.rejects(
    () =>
      runCli(fixture.root, [
        "long-task",
        "compile",
        fixture.workdir,
        "--revise",
      ]),
    /authority_change_requires_user_decision/u,
  );
  fixture.contract = structuredClone(originalContract);
  await writeContract(fixture.workdir, fixture.contract);
  await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);

  addEnvironmentCheck(fixture.contract);
  await writeContract(fixture.workdir, fixture.contract);
  const environmentRevision = await runCli(fixture.root, [
    "long-task",
    "compile",
    fixture.workdir,
    "--revise",
  ]);
  assert.equal(environmentRevision.authority_revision, 2);
  const environmentResult = await runCliFailure(fixture.root, [
    "long-task",
    "verify",
    fixture.workdir,
  ]);
  assert.deepEqual(
    environmentResult.check_results.map((check) => check.status),
    ["passed", "blocked_external"],
  );

  const legalContract = structuredClone(fixture.contract);
  fixture.contract.global.technical.forbidden_paths[0].path =
    "src/./secret.ts";
  await writeContract(fixture.workdir, fixture.contract);
  await assert.rejects(
    () =>
      runCli(fixture.root, [
        "long-task",
        "compile",
        fixture.workdir,
        "--revise",
      ]),
    /non_canonical_repository_path_dot_segment/u,
  );
  fixture.contract = legalContract;
  await writeContract(fixture.workdir, fixture.contract);
  await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);

  const activeA = (
    await loadActiveLongTaskAuthority(fixture.root)
  ).authority;
  const cache = JSON.parse(
    await readFile(
      path.join(fixture.workdir, ".ty-context", "compiled-contract.json"),
      "utf8",
    ),
  );
  assert.equal(Object.hasOwn(cache, "active_authority_identity"), false);
  assert.equal(Object.hasOwn(cache, "previous_authority"), false);
  await commitCandidate(fixture.root);
  await rm(release, { force: true });
  await rm(started, { force: true });
  const finalRace = runCliProcess(
    fixture.root,
    ["long-task", "final-gate", fixture.workdir],
    raceEnvironment,
  );
  await waitForFile(started);
  fixture.contract.outcomes[0].acceptance.checks[0].positive_assertions.push({
    key: "race-proof",
    claims: ["result"],
    observation: "result_copy",
    operator: "truthy",
  });
  await writeContract(fixture.workdir, fixture.contract);
  const revisionB = await runCli(fixture.root, [
    "long-task",
    "compile",
    fixture.workdir,
    "--revise",
  ]);
  await writeFile(release, "release\n");
  const raced = await finalRace;
  const racedReceipt = parseCliJson(raced.stdout);
  assert.equal(racedReceipt.workflow_status, "needs_work");
  assert.ok(
    racedReceipt.findings.some(
      (finding) =>
        finding.code === "active_authority_changed_during_final_gate",
    ),
  );
  assert.equal(
    (await loadActiveLongTaskAuthority(fixture.root)).authority
      .active_authority_identity,
    revisionB.compiled_identity,
  );
  assert.notEqual(
    activeA.active_authority_identity,
    revisionB.compiled_identity,
  );

  await commitCandidate(fixture.root);
  const acceptedB = await runCli(
    fixture.root,
    ["long-task", "final-gate", fixture.workdir],
    { env: raceEnvironment },
  );
  assert.equal(acceptedB.workflow_status, "machine_accepted");
  const stopped = await runCli(
    fixture.root,
    ["long-task", "stop-check", fixture.workdir],
    { env: raceEnvironment },
  );
  assert.equal(stopped.continue, true);
  assert.equal((await loadActiveLongTaskAuthority(fixture.root)).authority, null);
  assert.deepEqual(await readProgressRecords(fixture.workdir), {});

  const branchAfter = await git(fixture.root, ["branch", "--show-current"]);
  const worktreesAfter = await git(fixture.root, [
    "worktree",
    "list",
    "--porcelain",
  ]);
  assert.equal(branchAfter, branchBefore);
  assert.equal(worktreeCount(worktreesAfter), 1);
  assert.equal(await git(fixture.root, ["status", "--short"]), "");
  assert.equal(
    (await forbiddenRuntimeNames(fixture.root)).length,
    0,
  );
  for (const outcome of fixture.contract.outcomes)
    for (const check of outcome.acceptance.checks)
      assert.equal(check.runner.retry_policy, "none");

  console.log(
    JSON.stringify({
      status: "passed",
      repository: fixture.root,
      authority_revisions: [1, 2, revisionB.authority_revision],
      no_agents_or_workers: true,
      no_extra_branch_or_worktree: true,
      no_model_retry: true,
      cache_has_no_active_authority: true,
      deletion_did_not_unlock_authority: true,
      stale_final_gate_preserved_new_authority: true,
      stop_used_accepted_identity_cas: true,
    }),
  );
} finally {
  await rm(signalRoot, { recursive: true, force: true });
  await rm(fixture.root, { recursive: true, force: true });
}

function addEnvironmentCheck(contract) {
  const base = contract.outcomes[0].acceptance.checks[0];
  contract.outcomes[0].acceptance.checks.push({
    ...structuredClone(base),
    key: "environment-check",
    positive_assertions: [
      {
        key: "environment-result",
        claims: ["result"],
        observation: "result",
        operator: "truthy",
      },
    ],
    environment_requirements: [
      {
        key: "started-path",
        kind: "env_var",
        target: "TY_CONTEXT_SMOKE_STARTED",
      },
      {
        key: "release-path",
        kind: "env_var",
        target: "TY_CONTEXT_SMOKE_RELEASE",
      },
    ],
  });
}

async function installSmokeOracle(root) {
  await writeFile(
    path.join(root, "tests", "oracle.mjs"),
    `import { appendFileSync, existsSync, readFileSync } from "node:fs";
const started = process.env.TY_CONTEXT_SMOKE_STARTED;
const release = process.env.TY_CONTEXT_SMOKE_RELEASE;
if (started && release) {
  appendFileSync(started, "started\\n");
  while (!existsSync(release)) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);
  }
}
const state = JSON.parse(readFileSync(new URL("../src/state.json", import.meta.url), "utf8"));
console.log(JSON.stringify({schema_version:"long-task-check-result-v2",execution_status:"completed",observations:{result:state.first,result_copy:state.first}}));
`,
  );
}

async function waitForFile(file) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (
      await access(file)
        .then(() => true)
        .catch(() => false)
    )
      return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`smoke race signal timeout: ${file}`);
}

async function runCliProcess(cwd, args, env) {
  try {
    const result = await exec(process.execPath, [cli, ...args], {
      cwd,
      env,
      windowsHide: true,
    });
    return { exitCode: 0, stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    return {
      exitCode: error.code ?? 1,
      stdout: error.stdout ?? "",
      stderr: error.stderr ?? "",
    };
  }
}

async function git(root, args) {
  return (
    await exec("git", args, { cwd: root, windowsHide: true })
  ).stdout.trim();
}

function worktreeCount(value) {
  return value
    .split(/\r?\n/u)
    .filter((line) => line.startsWith("worktree ")).length;
}

async function forbiddenRuntimeNames(root) {
  const forbidden = new Set([
    "agent",
    "worker",
    "campaign",
    "sfc",
    "packet",
    "wave",
    "delivery-set",
  ]);
  const found = [];
  async function visit(folder) {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const lower = entry.name.toLowerCase();
      if (forbidden.has(lower)) found.push(path.join(folder, entry.name));
      if (
        entry.isDirectory() &&
        entry.name !== ".git" &&
        entry.name !== "node_modules"
      )
        await visit(path.join(folder, entry.name));
    }
  }
  await visit(root);
  return found;
}
