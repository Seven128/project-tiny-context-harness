import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import {
  createDeliveryFixture,
  commitCandidate,
  readState,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";

const exec = promisify(execFile);
const repo = fileURLToPath(new URL("../..", import.meta.url));
const cli = path.join(repo, "packages/ty-context/dist/cli.js");

test("real CLI two-Outcome rolling delivery rejects partial/history and enforces freshness", async () => {
  const fixture = await createDeliveryFixture({ twoOutcomes: true });
  try {
    await run(fixture.root, ["enable", "long-task"]);
    const compiled = await run(fixture.root, ["long-task", "compile", fixture.workdir]);
    assert.equal(compiled.status, "compiled");
    assert.equal(compiled.effective_risk, "standard");

    const first = await run(fixture.root, [
      "long-task", "verify", fixture.workdir, "--outcome", "first",
    ]);
    assert.equal(first.acceptance_authorized, false);
    assert.equal(first.check_results[0].status, "passed");
    assert.equal(await exists(path.join(fixture.workdir, ".ty-context", "final-receipt.json")), false);

    const secondFailure = await runFailure(fixture.root, [
      "long-task", "verify", fixture.workdir, "--outcome", "second",
    ]);
    assert.equal(secondFailure.check_results[0].status, "failed");
    const partialFinal = await runFailure(fixture.root, [
      "long-task", "final-gate", fixture.workdir,
    ]);
    assert.equal(partialFinal.workflow_status, "needs_work");
    assert.equal(partialFinal.check_results.length, 2);

    const state = await readState(fixture.root);
    state.second = true;
    await writeFile(path.join(fixture.root, "src", "state.json"), `${JSON.stringify(state)}\n`);
    const secondPass = await run(fixture.root, [
      "long-task", "verify", fixture.workdir, "--outcome", "second",
    ]);
    assert.equal(secondPass.acceptance_authorized, false);
    assert.equal(secondPass.check_results[0].status, "passed");

    const accepted = await run(fixture.root, [
      "long-task", "final-gate", fixture.workdir,
    ]);
    assert.equal(accepted.workflow_status, "machine_accepted");
    assert.equal(accepted.check_results.length, 2);
    assert.equal(new Set(accepted.check_results.map((result) => result.outcome_key)).size, 2);

    const stopAccepted = await run(fixture.root, [
      "long-task", "stop-check", fixture.workdir,
    ]);
    assert.equal(stopAccepted.continue, true);
    state.second = false;
    await writeFile(path.join(fixture.root, "src", "state.json"), `${JSON.stringify(state)}\n`);
    const staleStop = await runFailure(fixture.root, [
      "long-task", "stop-check", fixture.workdir,
    ]);
    assert.equal(staleStop.continue, false);

    state.second = true;
    await writeFile(path.join(fixture.root, "src", "state.json"), `${JSON.stringify(state)}\n`);
    const acceptedAgain = await run(fixture.root, [
      "long-task", "final-gate", fixture.workdir,
    ]);
    assert.equal(acceptedAgain.workflow_status, "machine_accepted");
    await run(fixture.root, ["long-task", "close", fixture.workdir]);
    assert.equal(await exists(path.join(fixture.root, ".codex", "ty-context-active-long-task.json")), false);
    assert.equal(await exists(path.join(fixture.workdir, "delivery-contract.yaml")), true);

    const worktrees = await exec("git", ["worktree", "list", "--porcelain"], { cwd: fixture.root });
    assert.equal((worktrees.stdout.match(/^worktree /gmu) ?? []).length, 1);
    const branches = await exec("git", ["branch", "--format=%(refname:short)"], { cwd: fixture.root });
    assert.equal(branches.stdout.trim().split(/\r?\n/u).filter(Boolean).length, 1);
    assert.equal(await exists(path.join(fixture.root, "tmp", "ty-context", "composite-worktrees")), false);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("referenced Context ignores unrelated Context but invalidates selected Context and Contract", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await run(fixture.root, ["enable", "long-task"]);
    await run(fixture.root, ["long-task", "compile", fixture.workdir]);
    await run(fixture.root, ["long-task", "final-gate", fixture.workdir]);
    await writeFile(path.join(fixture.root, "project_context", "unrelated.md"), "# unrelated\n");
    const unrelated = await run(fixture.root, ["long-task", "status", fixture.workdir]);
    assert.equal(unrelated.final_result, "machine_accepted_fresh");
    await writeFile(path.join(fixture.root, "project_context", "areas", "main.md"), "# changed\n");
    const contextStale = await run(fixture.root, ["long-task", "status", fixture.workdir]);
    assert.equal(contextStale.final_result, "accepted_stale");
    assert.ok(contextStale.findings.some((finding) => finding.code.includes("context_changed_after_compile")));
    fixture.contract.task.title = "Changed title";
    await writeContract(fixture.workdir, fixture.contract);
    const contractStale = await run(fixture.root, ["long-task", "status", fixture.workdir]);
    assert.ok(contractStale.findings.some((finding) => finding.code.includes("contract_changed_after_compile")));
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("scope escape returns escalation and abandon preserves authored Contract", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await run(fixture.root, ["enable", "long-task"]);
    await run(fixture.root, ["long-task", "compile", fixture.workdir]);
    await writeFile(path.join(fixture.root, "README.md"), "outside contract\n");
    const result = await runFailure(fixture.root, ["long-task", "verify", fixture.workdir]);
    assert.ok(result.findings.some((finding) => finding.code === "scope_or_risk_escalation_required"));
    await writeFile(path.join(fixture.workdir, "source.md"), "source provenance\n");
    await run(fixture.root, ["long-task", "abandon", fixture.workdir]);
    assert.equal(await exists(path.join(fixture.workdir, "delivery-contract.yaml")), true);
    assert.equal(await exists(path.join(fixture.workdir, "source.md")), true);
    assert.equal(await exists(path.join(fixture.workdir, ".ty-context")), false);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

async function run(cwd, args) {
  if (args[0] === "long-task" && args[1] === "final-gate")
    await commitCandidate(cwd);
  const result = await exec(process.execPath, [cli, ...args], { cwd, windowsHide: true });
  return parse(result.stdout);
}

async function runFailure(cwd, args) {
  try {
    await run(cwd, args);
    assert.fail(`expected command failure: ${args.join(" ")}`);
  } catch (error) {
    if (!error.stdout) throw error;
    return parse(error.stdout);
  }
}

function parse(stdout) {
  const text = stdout.trim();
  try { return JSON.parse(text); } catch {}
  const line = text.split(/\r?\n/u).at(-1);
  try { return JSON.parse(line); } catch { return { text }; }
}

async function exists(file) {
  try { await import("node:fs/promises").then(({ access }) => access(file)); return true; }
  catch { return false; }
}
