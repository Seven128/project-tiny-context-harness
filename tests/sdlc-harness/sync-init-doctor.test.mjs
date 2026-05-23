import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { runDoctor } from "../../packages/sdlc-harness/dist/lib/doctor.js";
import { runInit } from "../../packages/sdlc-harness/dist/lib/init.js";
import { runSync } from "../../packages/sdlc-harness/dist/lib/sync-engine.js";

const root = await mkdtemp(path.join(tmpdir(), "sdlc-harness-"));

try {
  const initReport = await runInit(root, { adopt: true, force: false });
  assert.ok(initReport.some((line) => line.includes("created .harness/config.yaml")));

  const config = await readFile(path.join(root, ".harness/config.yaml"), "utf8");
  assert.match(config, /@ai-sdlc\/sdlc-harness/);

  const agents = await readFile(path.join(root, "AGENTS.md"), "utf8");
  assert.match(agents, /sdlc-harness:begin/);

  const syncReport = await runSync(root);
  assert.equal(syncReport.blocked.length, 0);
  await stat(path.join(root, ".harness/agents/skills/manager/SKILL.md"));
  await stat(path.join(root, ".agents/skills/manager/SKILL.md"));
  await stat(path.join(root, ".harness/managed/templates/CHECKPOINT_TEMPLATE.md"));
  await stat(path.join(root, ".harness/managed/policies/phase_contracts.yaml"));

  const doctor = await runDoctor(root);
  assert.deepEqual(doctor.errors, []);
  assert.ok(doctor.info.some((line) => line.includes("doctor complete")));
} finally {
  await rm(root, { recursive: true, force: true });
}
