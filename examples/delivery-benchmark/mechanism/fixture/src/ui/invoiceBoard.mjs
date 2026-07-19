export function renderInvoiceBoard(invoices, state = "ready") {
  if (state === "loading") return { state, message: "Loading invoices" };
  if (state === "error") return { state, message: "Unable to load invoices" };
  if (!invoices.length) return { state: "empty", message: "No invoices" };
  return {
    state: "ready",
    rows: invoices.map((invoice) => ({
      id: invoice.id,
      total: invoice.total,
      status: invoice.status,
      region: invoice.region
    }))
  };
}
