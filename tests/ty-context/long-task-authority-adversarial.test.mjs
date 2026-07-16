import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import {
  activeRecordPath,
  worktreeIdentity,
} from "../../packages/ty-context/dist/lib/long-task-state.js";
import {
  canonicalValueJson,
  sha256Hex,
} from "../../packages/ty-context/dist/lib/strict-codec.js";
import {
  commitCandidate,
  createDeliveryFixture,
  pathExists,
  readState,
  runCli,
  runCliFailure,
} from "./long-task-delivery-fixtures.mjs";

const exec = promisify(execFile);

test("Live authority ignores forged receipts and compiled cache, then clears binding atomically", async () => {
  const fixture = await createDeliveryFixture({ twoOutcomes: true });
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    await commitCandidate(fixture.root);

    const first = await runCliFailure(fixture.root, [
      "long-task",
      "stop-check",
      fixture.workdir,
    ]);
    assert.equal(first.continue, false);
    const localReceipt = path.join(
      fixture.workdir,
      ".ty-context/final-receipt.json",
    );
    const activeFile = await activeRecordPath(fixture.root);
    const mirrorReceipt = path.join(
      path.dirname(activeFile),
      "last-final-receipt.json",
    );
    const failedReceipt = await readJson(localReceipt);
    assert.equal(failedReceipt.check_results.length, 2);

    const { receipt_sha256: _old, ...unsigned } = failedReceipt;
    const forgedUnsigned = {
      ...unsigned,
      workflow_status: "machine_accepted",
      outcome_results: { first: "passed", second: "passed" },
      findings: [],
    };
    const forged = {
      ...forgedUnsigned,
      receipt_sha256: sha256Hex(canonicalValueJson(forgedUnsigned)),
    };
    await Promise.all([
      writeFile(localReceipt, `${JSON.stringify(forged)}\n`),
      writeFile(mirrorReceipt, `${JSON.stringify(forged)}\n`),
    ]);
    const afterForge = await runCliFailure(fixture.root, [
      "long-task",
      "stop-check",
      fixture.workdir,
    ]);
    assert.equal(afterForge.continue, false);
    assert.equal((await readJson(localReceipt)).check_results.length, 2);

    const cacheFile = path.join(
      fixture.workdir,
      ".ty-context/compiled-contract.json",
    );
    const cache = await readJson(cacheFile);
    cache.outcomes = cache.outcomes.slice(0, 1);
    const { compiled_identity: _identity, ...cacheUnsigned } = cache;
    cache.compiled_identity = sha256Hex(canonicalValueJson(cacheUnsigned));
    await writeFile(cacheFile, `${JSON.stringify(cache)}\n`);
    await runCliFailure(fixture.root, [
      "long-task",
      "stop-check",
      fixture.workdir,
    ]);
    assert.equal((await readJson(localReceipt)).check_results.length, 2);

    await rm(cacheFile, { force: true });
    await runCliFailure(fixture.root, [
      "long-task",
      "stop-check",
      fixture.workdir,
    ]);
    assert.equal((await readJson(localReceipt)).check_results.length, 2);

    await rm(
      path.join(fixture.root, ".codex/ty-context-active-long-task.json"),
      { force: true },
    );
    await runCliFailure(fixture.root, [
      "long-task",
      "stop-check",
      fixture.workdir,
    ]);

    const active = await readJson(activeFile);
    await writeFile(activeFile, "{broken-json\n");
    const corrupt = await runCliFailure(fixture.root, [
      "long-task",
      "stop-check",
      fixture.workdir,
    ]);
    assert.equal(corrupt.reason, "long_task_state_invalid");
    await writeFile(activeFile, `${JSON.stringify(active)}\n`);

    const marker = `ty-context.longTask.${worktreeIdentity(fixture.root)}`;
    await exec("git", ["config", "--local", marker, "wrong-task"], {
      cwd: fixture.root,
      windowsHide: true,
    });
    const mismatch = await runCliFailure(fixture.root, [
      "long-task",
      "stop-check",
      fixture.workdir,
    ]);
    assert.equal(mismatch.reason, "long_task_state_invalid");
    await exec(
      "git",
      [
        "config",
        "--local",
        marker,
        `${active.task_id}|${active.authority_revision}|${active.active_authority_identity}`,
      ],
      {
        cwd: fixture.root,
        windowsHide: true,
      },
    );

    const state = await readState(fixture.root);
    state.second = true;
    await writeFile(
      path.join(fixture.root, "src/state.json"),
      `${JSON.stringify(state)}\n`,
    );
    await commitCandidate(fixture.root);
    const accepted = await runCli(fixture.root, [
      "long-task",
      "stop-check",
      fixture.workdir,
    ]);
    assert.equal(accepted.continue, true);
    assert.equal(await pathExists(activeFile), false);
    await assert.rejects(
      exec("git", ["config", "--local", "--get", marker], {
        cwd: fixture.root,
        windowsHide: true,
      }),
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}
