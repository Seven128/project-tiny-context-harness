import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const scriptPath = path.join(repoRoot, "tools/quickstart_smoke.mjs");
const outDir = await mkdtemp(path.join(tmpdir(), "sdlc-quickstart-smoke-test-"));

try {
  const result = spawnSync(process.execPath, [scriptPath, "--out-dir", outDir], {
    cwd: repoRoot,
    encoding: "utf8",
    timeout: 120_000
  });

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /Quickstart smoke passed/);
  assert.match(result.stdout, /Generated recovery surface/);

  const demoRoot = path.join(outDir, "repo");
  await stat(path.join(demoRoot, "AGENTS.md"));
  await stat(path.join(demoRoot, "project_context/global.md"));
  await stat(path.join(demoRoot, "project_context/architecture.md"));
  await stat(path.join(demoRoot, ".github/workflows/harness.yml"));

  const report = JSON.parse(await readFile(path.join(outDir, "quickstart-smoke-report.json"), "utf8"));
  assert.equal(report.status, "passed");
  assert.ok(report.generatedFiles.includes("AGENTS.md"));
  assert.ok(report.generatedFiles.includes("project_context/context.toml"));
} finally {
  await rm(outDir, { recursive: true, force: true });
}
