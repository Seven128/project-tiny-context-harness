import assert from "node:assert/strict";
import test from "node:test";
import { renderInvoiceBoard } from "../src/ui/invoiceBoard.mjs";

test("invoice board exposes loading, empty, error and ready states", () => {
  assert.equal(renderInvoiceBoard([], "loading").state, "loading");
  assert.equal(renderInvoiceBoard([], "error").state, "error");
  assert.equal(renderInvoiceBoard([]).state, "empty");
  assert.equal(renderInvoiceBoard([{ id: "1", total: 1, status: "draft", region: "US" }]).state, "ready");
});
