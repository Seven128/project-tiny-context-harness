export function roundMoney(value) {
  if (!Number.isFinite(value)) throw new TypeError("money value must be finite");
  return Math.round(value * 100) / 100;
}

export function calculateInvoiceTotal({ subtotal, taxRate }) {
  return roundMoney(subtotal + subtotal * taxRate);
}
