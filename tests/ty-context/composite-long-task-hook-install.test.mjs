import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { installLongTaskHooks } from "../../packages/ty-context/dist/lib/long-task-hook-install.js";

test("project sync preserves user Hooks and never installs a non-managed fallback", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ltw-install-"));
  await mkdir(path.join(root, ".codex"), { recursive: true });
  const file = path.join(root, ".codex", "hooks.json");
  const original = JSON.stringify({ hooks: { Stop: [{ hooks: [{ type: "command", command: "node user-hook.mjs", custom: "preserve" }] }] }, customRoot: { keep: true } });
  await writeFile(file, original);
  const report = { changed: [], skipped: [], blocked: [] };
  await installLongTaskHooks(root, report);
  assert.equal(await readFile(file, "utf8"), original);
  await assert.rejects(readFile(path.join(root, ".codex", "hooks", "long-task-hook.mjs")), /ENOENT/);
  assert.equal(report.changed.length, 0);
  assert.ok(report.skipped.some((item) => /system level/u.test(item)));
});
