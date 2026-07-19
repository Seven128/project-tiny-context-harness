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

const { roundMoney } = await load("src/billing/money.mjs");
await check("ROUND-001", "1.005 rounds to 1.01", () => assert.equal(roundMoney(1.005), 1.01));
await check("ROUND-002", "10.075 rounds to 10.08", () => assert.equal(roundMoney(10.075), 10.08));
await check("ROUND-003", "ordinary values remain stable", () => assert.equal(roundMoney(12.341), 12.34));

const passed = checks.filter((item) => item.passed).length;
process.stdout.write(`${JSON.stringify({ available: true, confidence: "high", data_source: "hidden_mechanism_probe", passed, total: checks.length, decision: passed === checks.length ? "PASS" : "WARN", checks })}\n`);
