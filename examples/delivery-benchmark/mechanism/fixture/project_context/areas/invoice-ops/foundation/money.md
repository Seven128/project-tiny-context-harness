---
context_role: foundation
read_policy: on-demand
---
# Money Foundation

## Durable Rule

- Currency results use deterministic two-decimal half-up behavior for the positive invoice values supported by this fixture.
- Representative edge cases include `1.005 -> 1.01` and `10.075 -> 10.08`.

## Ownership

- `src/billing/money.mjs` is the only money-rounding implementation owner.
- Callers must not duplicate rounding policy.

## Verification

- Add direct edge-case tests before changing implementation.
