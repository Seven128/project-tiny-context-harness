import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";
const runDir = path.resolve(process.argv[2] ?? process.cwd());
const checks = [];
async function check(id, label, action) {
  try { await action(); checks.push({ id, label, passed: true }); }
  catch (error) { checks.push({ id, label, passed: false, detail: error instanceof Error ? error.message : String(error) }); }
}
const load = (relative) => import(`${pathToFileURL(path.join(runDir, relative)).href}?probe=${Date.now()}-${Math.random()}`);

import { spawnSync } from "node:child_process";
const { healthStatus } = await load("src/health.mjs");
const ready = healthStatus();
const degraded = healthStatus({ workerReady: false });
await check("HEALTH-001", "ready result is component-level", () => { assert.equal(ready.status, "ok"); assert.equal(ready.checks.billing, "ok"); assert.equal(ready.checks.notifications, "ok"); assert.equal(ready.checks.worker, "ok"); });
await check("HEALTH-002", "worker failure degrades overall status", () => { assert.equal(degraded.status, "degraded"); assert.equal(degraded.checks.worker, "degraded"); });
const cli = spawnSync(process.execPath, [path.join(runDir, "src/health.mjs"), "--worker-down"], { encoding: "utf8" });
await check("HEALTH-003", "degraded CLI exits non-zero", () => assert.notEqual(cli.status, 0));
await check("HEALTH-004", "degraded CLI prints JSON", () => assert.equal(JSON.parse(cli.stdout).status, "degraded"));

const passed = checks.filter((item) => item.passed).length;
process.stdout.write(`${JSON.stringify({ available: true, confidence: "high", data_source: "hidden_mechanism_probe", passed, total: checks.length, decision: passed === checks.length ? "PASS" : "WARN", checks })}\n`);
