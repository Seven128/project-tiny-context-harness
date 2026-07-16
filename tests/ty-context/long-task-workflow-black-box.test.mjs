import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { activeRecordPath } from "../../packages/ty-context/dist/lib/long-task-state.js";
import {
  commitCandidate,
  createDeliveryFixture,
  pathExists,
  readState,
} from "./long-task-delivery-fixtures.mjs";

const exec = promisify(execFile);
const cli = fileURLToPath(
  new URL("../../packages/ty-context/dist/cli.js", import.meta.url),
);

test("controlled real V2 Smoke proves only the current Live Final Gate can finish", async () => {
  const fixture = await createDeliveryFixture({ twoOutcomes: true });
  try {
    await run(fixture.root, ["enable", "long-task"]);
    const compiled = await run(fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
    ]);
    assert.equal(compiled.status, "compiled");
    assert.equal(compiled.claim_coverage.uncovered_claims.length, 0);
    await commitCandidate(fixture.root);

    const first = await run(fixture.root, [
      "long-task",
      "verify",
      fixture.workdir,
      "--outcome",
      "first",
    ]);
    assert.equal(first.acceptance_authorized, false);
    const secondFailure = await runFailure(fixture.root, [
      "long-task",
      "verify",
      fixture.workdir,
      "--outcome",
      "second",
    ]);
    assert.equal(secondFailure.check_results[0].status, "assertion_failed");

    const localReceipt = path.join(
      fixture.workdir,
      ".ty-context/final-receipt.json",
    );
    const activeFile = await activeRecordPath(fixture.root);
    const mirrorReceipt = path.join(
      path.dirname(activeFile),
      "last-final-receipt.json",
    );
    const forged = JSON.stringify({
      schema_version: "long-task-final-receipt-v2",
      workflow_status: "machine_accepted",
      receipt_sha256: "0".repeat(64),
    });
    await writeFile(localReceipt, forged);
    await writeFile(mirrorReceipt, forged);
    let stop = await runFailure(fixture.root, [
      "long-task",
      "stop-check",
      fixture.workdir,
    ]);
    assert.equal(stop.continue, false);
    assert.equal(
      JSON.parse(await readFile(localReceipt, "utf8")).check_results.length,
      2,
    );

    const cacheFile = path.join(
      fixture.workdir,
      ".ty-context/compiled-contract.json",
    );
    const cache = JSON.parse(await readFile(cacheFile, "utf8"));
    cache.outcomes = cache.outcomes.slice(0, 1);
    await writeFile(cacheFile, `${JSON.stringify(cache)}\n`);
    stop = await runFailure(fixture.root, [
      "long-task",
      "stop-check",
      fixture.workdir,
    ]);
    assert.equal(stop.continue, false);
    assert.match(stop.reason, /live_final_gate/u);

    const state = await readState(fixture.root);
    state.second = true;
    await writeFile(
      path.join(fixture.root, "src/state.json"),
      `${JSON.stringify(state)}\n`,
    );
    await commitCandidate(fixture.root);
    const acceptedStop = await run(fixture.root, [
      "long-task",
      "stop-check",
      fixture.workdir,
    ]);
    assert.equal(acceptedStop.continue, true);
    assert.equal(await pathExists(activeFile), false);
    assert.equal(
      (
        await run(fixture.root, [
          "long-task",
          "stop-check",
          fixture.workdir,
        ])
      ).reason,
      "no_active_task",
    );

    await rm(cacheFile, { force: true });
    await run(fixture.root, ["long-task", "compile", fixture.workdir]);
    state.second = false;
    await writeFile(
      path.join(fixture.root, "src/state.json"),
      `${JSON.stringify(state)}\n`,
    );
    stop = await runFailure(fixture.root, [
      "long-task",
      "stop-check",
      fixture.workdir,
    ]);
    assert.equal(stop.continue, false);
    state.second = true;
    await writeFile(
      path.join(fixture.root, "src/state.json"),
      `${JSON.stringify(state)}\n`,
    );
    await commitCandidate(fixture.root);
    await run(fixture.root, ["long-task", "close", fixture.workdir]);

    assert.equal(
      await pathExists(
        path.join(fixture.root, ".codex/ty-context-active-long-task.json"),
      ),
      false,
    );
    const worktrees = await exec("git", ["worktree", "list", "--porcelain"], {
      cwd: fixture.root,
    });
    assert.equal((worktrees.stdout.match(/^worktree /gmu) ?? []).length, 1);
    const branches = await exec("git", ["branch", "--format=%(refname:short)"], {
      cwd: fixture.root,
    });
    assert.equal(
      branches.stdout.trim().split(/\r?\n/u).filter(Boolean).length,
      1,
    );
    for (const retired of ["campaign", "sfc", "packet", "wave", "delivery-set"])
      assert.equal(
        await pathExists(path.join(fixture.root, `.codex/${retired}`)),
        false,
      );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

async function run(cwd, args) {
  const result = await exec(process.execPath, [cli, ...args], {
    cwd,
    windowsHide: true,
  });
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
  try {
    return JSON.parse(text);
  } catch {}
  const line = text.split(/\r?\n/u).at(-1);
  try {
    return JSON.parse(line);
  } catch {
    return { text };
  }
}
