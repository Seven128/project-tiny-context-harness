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

const { createInvoiceService } = await load("src/billing/invoiceService.mjs");
const { createReceiptNotifier } = await load("src/notifications/receiptNotifier.mjs");
const notifier = createReceiptNotifier();
const service = createInvoiceService({ notifier });
service.create({ id: "inv-probe", subtotal: 20, taxRate: 0, region: "US" });
const first = service.markPaid("inv-probe");
const second = service.markPaid("inv-probe");
await check("RECEIPT-001", "first transition succeeds", () => assert.equal(first.ok, true));
await check("RECEIPT-002", "paid audit entry is not duplicated", () => assert.equal(service.list()[0].auditTrail.filter((item) => item === "invoice.paid").length, 1));
await check("RECEIPT-003", "exactly one receipt is sent", () => assert.equal(notifier.sentReceipts().length, 1));
await check("RECEIPT-004", "receipt identifies the paid invoice", () => assert.equal(notifier.sentReceipts()[0].invoiceId ?? notifier.sentReceipts()[0].id, "inv-probe"));
await check("RECEIPT-005", "repeat transition is explicitly idempotent", () => assert.ok(second.idempotent === true || second.changed === false || second.invoice?.status === "paid"));

const passed = checks.filter((item) => item.passed).length;
process.stdout.write(`${JSON.stringify({ available: true, confidence: "high", data_source: "hidden_mechanism_probe", passed, total: checks.length, decision: passed === checks.length ? "PASS" : "WARN", checks })}\n`);
