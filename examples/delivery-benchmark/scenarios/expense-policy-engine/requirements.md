# Expense Policy Engine Requirements

Build a small Node.js CLI and library that decides whether an employee reimbursement request is approved.

Input is JSON from a file path argument or stdin. Output is JSON to stdout.

Example input:

```json
{
  "employeeLevel": "staff",
  "amount": 120,
  "category": "meal",
  "region": "US",
  "date": "2026-06-01",
  "receiptAttached": true
}
```

Example output:

```json
{
  "approved": false,
  "reasonCode": "MEAL_LIMIT_EXCEEDED",
  "message": "Meal reimbursement exceeds staff limit in US.",
  "auditTrail": [
    "Loaded policy version 2026-06",
    "Matched category meal",
    "Applied employee level staff",
    "Rejected by regional meal limit"
  ]
}
```

Policy rules:

- Staff meal limit: US 75, EU 70.
- Manager meal limit: US 125, EU 110.
- Executive meal limit: US 200, EU 180.
- Staff travel limit: US 500, EU 450.
- Manager travel limit: US 900, EU 800.
- Executive travel limit: US 2000, EU 1800.
- Missing receipt rejects every request over 25.
- Weekend travel requires review with `WEEKEND_TRAVEL_REVIEW` even if the amount is under limit.
- Invalid input returns structured error JSON, not a thrown stack trace.
- Every decision path must include a machine-readable `reasonCode` and `auditTrail`.

Release readiness means the CLI smoke command and unit/integration tests pass from a fresh checkout.
