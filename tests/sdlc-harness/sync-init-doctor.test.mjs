import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { runDoctor } from "../../packages/sdlc-harness/dist/lib/doctor.js";
import { runInit } from "../../packages/sdlc-harness/dist/lib/init.js";
import { runSync } from "../../packages/sdlc-harness/dist/lib/sync-engine.js";

const defaultRoot = await mkdtemp(path.join(tmpdir(), "sdlc-harness-default-"));
const configuredRoot = await mkdtemp(path.join(tmpdir(), "sdlc-harness-configured-"));

try {
  const initReport = await runInit(defaultRoot, { adopt: true, force: false });
  assert.ok(initReport.some((line) => line.includes("created .agents/config.yaml")));

  const defaultConfig = await readFile(path.join(defaultRoot, ".agents/config.yaml"), "utf8");
  assert.match(defaultConfig, /@ai-sdlc\/sdlc-harness/);

  const defaultAgents = await readFile(path.join(defaultRoot, "AGENTS.md"), "utf8");
  assert.match(defaultAgents, /sdlc-harness:begin/);

  const defaultSyncReport = await runSync(defaultRoot);
  assert.equal(defaultSyncReport.blocked.length, 0);
  await stat(path.join(defaultRoot, ".agents/skills/manager/SKILL.md"));
  await stat(path.join(defaultRoot, ".agents/managed/templates/CHECKPOINT_TEMPLATE.md"));
  await stat(path.join(defaultRoot, ".agents/managed/policies/phase_contracts.yaml"));

  const defaultDoctor = await runDoctor(defaultRoot);
  assert.deepEqual(defaultDoctor.errors, []);
  assert.ok(defaultDoctor.info.some((line) => line.includes("harness root: .agents")));
  assert.ok(defaultDoctor.info.some((line) => line.includes("doctor complete")));

  await writeFile(
    path.join(configuredRoot, "package.json"),
    JSON.stringify({ sdlcHarness: { harnessFolderName: ".harness" } }, null, 2),
    "utf8"
  );
  const configuredInitReport = await runInit(configuredRoot, { adopt: true, force: false });
  assert.ok(configuredInitReport.some((line) => line.includes("created .harness/config.yaml")));

  const configuredSyncReport = await runSync(configuredRoot);
  assert.equal(configuredSyncReport.blocked.length, 0);
  await stat(path.join(configuredRoot, ".harness/skills/manager/SKILL.md"));
  await stat(path.join(configuredRoot, ".harness/managed/templates/CHECKPOINT_TEMPLATE.md"));
  await stat(path.join(configuredRoot, ".harness/managed/policies/phase_contracts.yaml"));

  const configuredDoctor = await runDoctor(configuredRoot);
  assert.deepEqual(configuredDoctor.errors, []);
  assert.ok(configuredDoctor.info.some((line) => line.includes("harness root: .harness")));
} finally {
  await rm(defaultRoot, { recursive: true, force: true });
  await rm(configuredRoot, { recursive: true, force: true });
}
