export function createReceiptNotifier() {
  const sent = [];
  return {
    sendReceipt(event) {
      sent.push(structuredClone(event));
      return { accepted: true, evidence: "mock" };
    },
    sentReceipts() {
      return structuredClone(sent);
    },
    evidenceBoundary() {
      return {
        mock: "available",
        live: "external_confirmation_required",
        doNotRetry: true
      };
    }
  };
}
