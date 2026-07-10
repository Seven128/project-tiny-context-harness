import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  acquireCompositeCampaignLock,
  assertCompositeCampaignLockOwner,
  releaseCompositeCampaignLock
} from "../../packages/ty-context/dist/lib/composite-campaign-lock.js";
import { canonicalJson } from "../../packages/ty-context/dist/lib/composite-campaign-codec.js";

const childScript = fileURLToPath(new URL("./helpers/composite-campaign-lock-child.mjs", import.meta.url));

test("release never deletes a replacement owner's lock", async () => {
  const fixture = await lockFixture();
  try {
    const lock = await acquireCompositeCampaignLock(fixture.root, fixture.campaigns, "campaign-1", lockOptions("owner-a"));
    const displaced = `${lock.lock_path}.displaced`;
    await rename(lock.lock_path, displaced);
    const replacement = canonicalJson({
      schema_version: "composite-campaign-lock-v1", token: "owner-b", pid: process.pid,
      acquired_at: "2026-07-10T01:02:03.000Z"
    });
    await writeFile(lock.lock_path, replacement, "utf8");
    await releaseCompositeCampaignLock(lock);
    assert.equal(await readFile(lock.lock_path, "utf8"), replacement);
    await rm(displaced, { force: true });
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("release never replaces a pre-existing quarantine path", async () => {
  const fixture = await lockFixture();
  try {
    const lock = await acquireCompositeCampaignLock(fixture.root, fixture.campaigns, "campaign-1", lockOptions("owner-a"));
    const quarantine = `${lock.lock_path}.owner-a.release`;
    await writeFile(quarantine, "foreign quarantine\n", "utf8");
    await releaseCompositeCampaignLock(lock);
    assert.equal(await readFile(quarantine, "utf8"), "foreign quarantine\n");
    assert.equal(await readFile(lock.lock_path, "utf8"), lock.raw_owner);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("failed lock initialization never unlinks a replacement owner", async () => {
  const fixture = await lockFixture();
  try {
    const lockPath = path.join(fixture.campaigns, ".campaign-1.lock");
    const displaced = `${lockPath}.displaced`;
    const replacement = canonicalJson({
      schema_version: "composite-campaign-lock-v1", token: "replacement", pid: process.pid,
      acquired_at: "2026-07-10T01:02:03.000Z"
    });
    await assert.rejects(acquireCompositeCampaignLock(fixture.root, fixture.campaigns, "campaign-1", {
      ...lockOptions("owner-a"),
      after_owner_write: async () => {
        await rename(lockPath, displaced);
        await writeFile(lockPath, replacement, "utf8");
        throw new Error("injected owner sync failure");
      }
    }), /injected owner sync failure/);
    assert.equal(await readFile(lockPath, "utf8"), replacement);
    await rm(displaced, { force: true });
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("a killed child lock is reclaimed only after ESRCH proves the owner dead", async () => {
  const fixture = await lockFixture();
  let child;
  try {
    child = spawn(process.execPath, [childScript, fixture.root, fixture.campaigns, "campaign-1"], {
      stdio: ["ignore", "pipe", "pipe"], windowsHide: true
    });
    await waitForReady(child);
    child.kill("SIGKILL");
    if (child.exitCode === null) {
      await new Promise((resolve, reject) => {
        child.once("exit", resolve);
        child.once("error", reject);
      });
    }
    const lock = await acquireCompositeCampaignLock(fixture.root, fixture.campaigns, "campaign-1", lockOptions("parent"));
    await assertCompositeCampaignLockOwner(lock);
    assert.equal(lock.owner.token, "parent");
    await releaseCompositeCampaignLock(lock);
  } finally {
    if (child && child.exitCode === null) child.kill("SIGKILL");
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("malformed or live owners are never reclaimed merely because time elapsed", async () => {
  for (const raw of [
    "not-json\n",
    canonicalJson({
      schema_version: "composite-campaign-lock-v1", token: "live", pid: process.pid,
      acquired_at: "2000-01-01T00:00:00.000Z"
    })
  ]) {
    const fixture = await lockFixture();
    try {
      const lockPath = path.join(fixture.campaigns, ".campaign-1.lock");
      await writeFile(lockPath, raw, "utf8");
      await assert.rejects(
        acquireCompositeCampaignLock(fixture.root, fixture.campaigns, "campaign-1", {
          ...lockOptions("other"), timeout_ms: 80, retry_ms: 10
        }),
        /timed out|lock/i
      );
      assert.equal(await readFile(lockPath, "utf8"), raw);
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  }
});

async function lockFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "ty-campaign-lock-"));
  await writeFile(path.join(root, "package.json"), JSON.stringify({ tyContext: { harnessFolderName: ".harness" } }), "utf8");
  const campaigns = path.join(root, ".harness", "composite-long-task", "campaigns");
  await mkdir(campaigns, { recursive: true });
  return { root, campaigns };
}

function lockOptions(token) {
  return {
    token: () => token,
    now: () => "2026-07-10T01:02:03.000Z",
    timeout_ms: 2_000,
    retry_ms: 10
  };
}

async function waitForReady(child) {
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  const deadline = Date.now() + 5_000;
  while (!stdout.includes("ready:")) {
    if (child.exitCode !== null) throw new Error(`lock child exited early: ${stderr}`);
    if (Date.now() >= deadline) throw new Error(`timed out waiting for lock child: ${stderr}`);
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}
