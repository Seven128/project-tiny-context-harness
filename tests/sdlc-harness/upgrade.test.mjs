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
  await writeFile(
    path.join(root, ".harness/config.yaml"),
    `core:
  package: "@ai-sdlc/sdlc-harness"
  version: "0.1.0"
  schema_version: "1"
managed_files:
  - path: "AGENTS.md"
    strategy: "merge-block"
  - path: ".agents/skills"
    strategy: "generated"
  - path: ".harness/templates"
    strategy: "managed"
  - path: ".harness/policies"
    strategy: "merge-with-local"
  - path: ".harness/make/sdlc-harness.mk"
    strategy: "managed"
local_overrides:
  - ".harness/overrides/**"
  - ".harness/policies/*.local.yaml"
never_overwrite:
  - ".docs/**"
  - ".harness/state/**"
`,
    "utf8"
  );
  await writeFile(path.join(root, ".harness/state/tasks.yaml"), "tasks: []\n", "utf8");

  const report = await runUpgrade(root);
  assert.ok(report.some((line) => line.startsWith("migrations changed=")));
  assert.ok(report.some((line) => line.startsWith("sync changed=")));

  const tasks = await readFile(path.join(root, ".harness/state/tasks.yaml"), "utf8");
  assert.match(tasks, /current_phase/);
  assert.match(tasks, /current_task_id/);

  const config = await readFile(path.join(root, ".harness/config.yaml"), "utf8");
  assert.match(config, /\.harness\/agents\/skills/);
  assert.match(config, /\.agents\/skills/);
  assert.match(config, /\.harness\/managed\/templates/);
  assert.match(config, /\.harness\/managed\/policies/);
} finally {
  await rm(root, { recursive: true, force: true });
}
