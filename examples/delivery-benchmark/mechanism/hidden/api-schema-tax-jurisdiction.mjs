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

const { normalizeInvoiceInput } = await load("src/billing/invoiceSchema.mjs");
const { renderInvoiceBoard } = await load("src/ui/invoiceBoard.mjs");
const canonical = normalizeInvoiceInput({ id: "a", subtotal: 1, taxRate: 0, taxJurisdiction: "US" });
const alias = normalizeInvoiceInput({ id: "b", subtotal: 1, taxRate: 0, region: "EU" });
await check("SCHEMA-001", "canonical field is accepted", () => assert.equal(canonical.ok, true));
await check("SCHEMA-002", "deprecated alias remains accepted", () => assert.equal(alias.ok, true));
await check("SCHEMA-003", "normalized objects expose only taxJurisdiction", () => { assert.equal(canonical.value.taxJurisdiction, "US"); assert.equal(alias.value.taxJurisdiction, "EU"); assert.equal(Object.hasOwn(canonical.value, "region"), false); assert.equal(Object.hasOwn(alias.value, "region"), false); });
const board = renderInvoiceBoard([{ id: "a", total: 1, status: "draft", taxJurisdiction: "US" }]);
await check("SCHEMA-004", "UI exposes canonical field", () => { assert.equal(board.rows[0].taxJurisdiction, "US"); assert.equal(Object.hasOwn(board.rows[0], "region"), false); });

const passed = checks.filter((item) => item.passed).length;
process.stdout.write(`${JSON.stringify({ available: true, confidence: "high", data_source: "hidden_mechanism_probe", passed, total: checks.length, decision: passed === checks.length ? "PASS" : "WARN", checks })}\n`);
