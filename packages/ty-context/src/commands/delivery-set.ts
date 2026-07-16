const TOMBSTONE = {
  status: "retired",
  reason: "Delivery Set orchestration is outside the minimal Single-Goal core.",
  replacement:
    "Use one complete Delivery Contract with semantic Outcomes and one Final Gate.",
} as const;

export function deliverySet(_args: string[]): void {
  console.log(JSON.stringify(TOMBSTONE));
}
