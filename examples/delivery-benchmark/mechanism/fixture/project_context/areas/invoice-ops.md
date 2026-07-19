---
context_role: area
---
# Area Context: Invoice Operations

## Responsibility

- Own invoice creation, canonical invoice state, total calculation, paid transition, and orchestration toward specialized boundaries.
- Keep compatibility parsing at the schema boundary and keep UI projection read-only.

## Contract

- Invoice identifiers are stable strings.
- Money values are stored at two-decimal currency precision.
- `markPaid` currently guarantees that an existing invoice ends in `paid`; repeated-transition and receipt-delivery semantics are not yet part of the durable contract.

## Code Entry Points

- `src/billing/invoiceService.mjs`
- `src/billing/money.mjs`
- `src/billing/invoiceSchema.mjs`
- `tests/base.test.mjs`

## Verification

- Run `npm test` for billing and cross-module behavior.
- Read the on-demand verification Context when changing a repeatable check or health boundary.

## Open Risks

- Cross-module changes can update invoice state but miss notification or UI behavior.
