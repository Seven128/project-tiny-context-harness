import { calculateInvoiceTotal } from "./money.mjs";
import { normalizeInvoiceInput } from "./invoiceSchema.mjs";

export function createInvoiceService({ notifier } = {}) {
  const invoices = new Map();
  return {
    create(input) {
      const normalized = normalizeInvoiceInput(input);
      if (!normalized.ok) return normalized;
      const invoice = {
        ...normalized.value,
        total: calculateInvoiceTotal(normalized.value),
        auditTrail: ["invoice.created"]
      };
      invoices.set(invoice.id, invoice);
      return { ok: true, invoice: structuredClone(invoice) };
    },
    markPaid(id) {
      const invoice = invoices.get(id);
      if (!invoice) return { ok: false, errorCode: "INVOICE_NOT_FOUND" };
      invoice.status = "paid";
      invoice.auditTrail.push("invoice.paid");
      return { ok: true, invoice: structuredClone(invoice) };
    },
    list() {
      return [...invoices.values()].map((invoice) => structuredClone(invoice));
    },
    notifier
  };
}
