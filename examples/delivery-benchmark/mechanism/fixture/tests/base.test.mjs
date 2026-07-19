import assert from "node:assert/strict";
import test from "node:test";
import { createInvoiceService } from "../src/billing/invoiceService.mjs";
import { createReceiptNotifier } from "../src/notifications/receiptNotifier.mjs";

test("base invoice flow is deterministic", () => {
  const notifier = createReceiptNotifier();
  const service = createInvoiceService({ notifier });
  const created = service.create({ id: "inv-1", subtotal: 100, taxRate: 0.1, region: "US" });
  assert.equal(created.ok, true);
  assert.equal(created.invoice.total, 110);
  assert.equal(service.markPaid("inv-1").invoice.status, "paid");
});
