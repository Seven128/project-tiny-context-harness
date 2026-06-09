import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const scriptPath = path.join(repoRoot, "tools/launch_readiness_check.mjs");

const result = spawnSync(process.execPath, [scriptPath, "--offline", "--json"], {
  cwd: repoRoot,
  encoding: "utf8",
  timeout: 60_000
});

assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
const report = JSON.parse(result.stdout);
assert.equal(report.summary.status, "pass");
assert.equal(report.offline, true);
assert.equal(report.externalChecks.length, 0);

const ids = new Set(report.localChecks.map((check) => check.id));
for (const expected of [
  "package-metadata",
  "root-readme-positioning",
  "package-readme-positioning",
  "root-readme-success-surface",
  "package-readme-success-surface",
  "launch-kit",
  "launch-operating-plan",
  "launch-demo-storyboard",
  "launch-demo-packet",
  "launch-milestones",
  "market-map",
  "outreach-targets",
  "quickstart-smoke",
  "launch-check-script",
  "consumer-workflow-boundary",
  "maintainer-workflow",
  "node-engine-ci-matrix"
]) {
  assert.ok(ids.has(expected), `expected readiness check ${expected}`);
}
