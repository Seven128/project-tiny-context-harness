# Lifecycle Probe

This scenario measures RFC/debug efficiency across API, UI, policy, tests, and project_context. The expected Minimal Context signal is fewer partial fixes or faster recovery without reintroducing the old stage workflow.

## Phase 1: Initial Delivery

Build the first version against the base requirements. Record elapsed delivery time with the external observer. If using semantic event labels, use phase `INITIAL_DELIVERY`.

## Phase 2: Fresh-Agent Recovery Probe

Start a fresh agent/session after initial delivery. Ask it to summarize the product, priority policy, UI states, test entrypoints, and next safe action before applying RFCs. If using event labels, use phase `RECOVERY`.

Score the context recovery quiz with one point for each correct answer:

1. Current API and UI runnable entrypoints.
2. Priority policy source of truth and fields.
3. UI views and loading/empty/error/invalid states.
4. Key test paths for API, policy, and UI smoke.
5. Latest RFC/debug status and known cross-layer risk.
6. Next safe action covering API, UI, tests, and project_context.

## Phase 3: RFC Cascade

Apply RFC 1 and RFC 2 in sequence. If using event labels, use phase `RFC`.

## Phase 4: Debug Fix

Inject or discover one cross-layer bug after the RFC cascade, then fix it. The default bug is: API and UI ordering diverge after weighted priority or bulk assignment. If using event labels, use phase `DEBUG`.

## Wrong-Path Count

Count wrong paths when the agent:

- Fixes only UI sorting while API order remains stale.
- Fixes only API behavior while UI state remains stale.
- Adds bulk assignment without `auditReason`.
- Updates implementation without policy/UI smoke tests.
- Replans the product instead of applying the specified RFC/debug work.

## Final Quality

Final quality is scored by the rubric against product source, tests, README/docs, and Minimal Context facts. Observer logs and benchmark internals are not quality evidence.
