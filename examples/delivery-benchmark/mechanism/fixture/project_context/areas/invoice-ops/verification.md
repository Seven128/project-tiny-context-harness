---
context_role: verification
read_policy: on-demand
---
# Invoice Operations Verification

## Current Repeatable Checks

- `npm test`: current billing and UI regression entrypoint.
- `npm run test:ui`: focused UI projection states.
- `npm run smoke:health`: ready-only JSON health result.

## Evidence Boundary

- A degraded-health CLI contract is not currently defined.
- Tests prove only the behavior they execute.
- Mock receipt evidence does not satisfy a live-provider external confirmation.
