import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { runInit } from "../../packages/ty-context/dist/lib/init.js";
import { runUpgrade } from "../../packages/ty-context/dist/lib/upgrade.js";

test("upgrade installs capability without inspecting or mutating future campaign data", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "ty-context-campaign-upgrade-"));
  try {
    await writeFile(path.join(root, "package.json"), JSON.stringify({ tyContext: { harnessFolderName: ".harness" } }), "utf8");
    await runInit(root, { adopt: true, force: false });
    const campaignRoot = path.join(root, ".harness/composite-long-task/campaigns/future");
    const sentinel = path.join(campaignRoot, "campaign.yaml");
    const opaque = path.join(campaignRoot, "unknown.future");
    await mkdir(campaignRoot, { recursive: true });
    await writeFile(sentinel, "schema_version: composite-campaign-v99\nopaque: keep-me\n", "utf8");
    await writeFile(opaque, Buffer.from([0, 1, 2, 255]));
    const before = { sentinel: await stat(sentinel), opaque: await stat(opaque), names: await readdir(campaignRoot) };

    const report = await runUpgrade(root);

    assert.ok(!report.some((line) => line.includes("composite-long-task/campaigns")));
    assert.deepEqual(await readdir(campaignRoot), before.names);
    assert.equal(await readFile(sentinel, "utf8"), "schema_version: composite-campaign-v99\nopaque: keep-me\n");
    assert.deepEqual(await readFile(opaque), Buffer.from([0, 1, 2, 255]));
    assert.equal((await stat(sentinel)).mtimeMs, before.sentinel.mtimeMs);
    assert.equal((await stat(opaque)).mtimeMs, before.opaque.mtimeMs);
    await stat(path.join(root, ".harness/skills/prepare-composite-long-task/SKILL.md"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
