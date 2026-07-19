---
context_role: contract
read_policy: on-demand
---
# Retry And Dead-Letter Contract

## Current Lifecycle

- Each processing attempt increments the job attempt count once.
- A failed job is currently requeued as `retrying`.
- The worker exposes `maxAttempts` and a dead-letter collection, but exhaustion behavior is not yet defined as a durable contract.

## Recovery Boundary

- Retry/dead-letter state is observable through `status()`.
- Establishing an exhaustion threshold, terminal status, or dead-letter rule is a durable lifecycle change and must update this Context plus regression tests.
