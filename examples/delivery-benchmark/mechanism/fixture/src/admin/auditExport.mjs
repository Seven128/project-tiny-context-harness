export function exportInvoices(invoices, actor = {}) {
  return {
    actor: actor.id ?? "anonymous",
    exported: invoices.map((invoice) => ({ id: invoice.id, status: invoice.status, total: invoice.total }))
  };
}
