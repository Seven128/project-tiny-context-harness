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

const { createRetryWorker } = await load("src/worker/retryWorker.mjs");
const worker = createRetryWorker({ maxAttempts: 3 });
worker.enqueue({ id: "job-1" });
const first = worker.processNext({ fail: true });
const second = worker.processNext({ fail: true });
const third = worker.processNext({ fail: true });
const idle = worker.processNext({ fail: true });
await check("RETRY-001", "failures below maxAttempts retry", () => { assert.equal(first.status, "retrying"); assert.equal(second.status, "retrying"); });
await check("RETRY-002", "maxAttempts failure dead-letters", () => assert.equal(third.status, "dead_lettered"));
await check("RETRY-003", "dead-letter is not requeued", () => assert.equal(idle.status, "idle"));
await check("RETRY-004", "dead-letter appears exactly once", () => { const status=worker.status(); assert.equal(status.queue.length, 0); assert.equal(status.deadLetters.length, 1); assert.equal(status.deadLetters[0].id, "job-1"); assert.equal(status.deadLetters[0].attempts, 3); });

const passed = checks.filter((item) => item.passed).length;
process.stdout.write(`${JSON.stringify({ available: true, confidence: "high", data_source: "hidden_mechanism_probe", passed, total: checks.length, decision: passed === checks.length ? "PASS" : "WARN", checks })}\n`);
