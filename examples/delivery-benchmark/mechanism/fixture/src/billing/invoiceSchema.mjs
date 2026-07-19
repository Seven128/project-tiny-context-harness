export function normalizeInvoiceInput(input) {
  if (!input || typeof input !== "object") {
    return { ok: false, errorCode: "INVALID_INVOICE" };
  }
  const region = input.region;
  if (typeof region !== "string" || !region.trim()) {
    return { ok: false, errorCode: "REGION_REQUIRED" };
  }
  return {
    ok: true,
    value: {
      id: String(input.id),
      subtotal: Number(input.subtotal),
      taxRate: Number(input.taxRate),
      region,
      status: input.status ?? "draft"
    }
  };
}
