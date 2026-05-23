import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { runInit } from "../../packages/sdlc-harness/dist/lib/init.js";
import { runUpgrade } from "../../packages/sdlc-harness/dist/lib/upgrade.js";

const root = await mkdtemp(path.join(tmpdir(), "sdlc-harness-upgrade-"));

try {
  await runInit(root, { adopt: true, force: false });
  await mkdir(path.join(root, ".harness/state"), { recursive: true });
  await writeFile(path.join(root, ".harness/state/tasks.yaml"), "tasks: []\n", "utf8");

  const report = await runUpgrade(root);
  assert.ok(report.some((line) => line.startsWith("migrations changed=")));
  assert.ok(report.some((line) => line.startsWith("sync changed=")));

  const tasks = await readFile(path.join(root, ".harness/state/tasks.yaml"), "utf8");
  assert.match(tasks, /current_phase/);
  assert.match(tasks, /current_task_id/);
} finally {
  await rm(root, { recursive: true, force: true });
}
