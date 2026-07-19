---
context_role: decision-rationale
read_policy: on-demand
---
# Money Rounding Decision Rationale

## Decision

Centralize positive invoice currency rounding in `src/billing/money.mjs#roundMoney` and require callers to use that owner rather than applying local corrections.

## Reason

Binary floating-point multiplication can place decimal half-cent values just below the expected boundary. One owner keeps edge behavior and future fixes consistent across invoice callers.

## Rejected Alternative

Applying ad hoc rounding in `invoiceService.mjs` or tests duplicates policy and leaves other callers inconsistent.
