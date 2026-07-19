---
context_role: deployment
read_policy: on-demand
---
# Deployment And Health Contract

## Current Health Result

- `healthStatus()` returns `{ status: "ok", checks: ["billing", "notifications", "worker"] }`.
- The CLI prints one ready JSON result and currently has no degraded-input or non-zero readiness-failure contract.

## Rollback / Recovery

- This fixture has no live deployment. Recovery means restoring the previous pure function and rerunning the health and product checks.
