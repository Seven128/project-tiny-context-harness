---
context_role: contract
read_policy: on-demand
---
# Invoice API Contract

## Creation

- `create(input)` normalizes through the schema owner, calculates the total through the money owner, stores one canonical invoice, and returns a clone.

## Current Paid Transition

- `markPaid(id)` changes an existing invoice to `paid` and appends an `invoice.paid` audit entry.
- Receipt emission, duplicate-transition behavior, and idempotency are currently unspecified durable semantics.

## Ownership Boundary

- Billing owns transition state; notifications owns delivery. Neither UI nor tests may become an alternate state owner.
