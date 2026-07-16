const TOMBSTONE = {
  status: "retired",
  reason: "Delivery Set orchestration is outside the minimal Single-Goal core.",
  replacement:
    "Use one Contract Bundle, or run truly independent top-level Delivery Contracts separately.",
} as const;

export function deliverySet(_args: string[]): void {
  console.log(JSON.stringify(TOMBSTONE));
}
