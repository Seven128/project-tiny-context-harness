# Lifecycle Probe

This scenario measures context continuity. The expected Harness advantage is faster fresh-agent recovery, a higher context recovery score, and fewer wrong paths after RFC/debug work.

## Phase 1: Initial Delivery

Build the first version against the base requirements. Record elapsed delivery time with the external observer. If using semantic event labels, use phase `INITIAL_DELIVERY`.

## Phase 2: Fresh-Agent Recovery Probe

Start a fresh agent/session after initial delivery. Ask it to summarize the project and choose the next safe action before applying RFCs. If using event labels, use phase `RECOVERY`.

Score the context recovery quiz with one point for each correct answer:

1. Current runnable entrypoints for API, board, worker, and tests.
2. Canonical data model and deprecated alias status.
3. Mock/live provider boundary and the do-not-retry rule for missing live credentials.
4. Key test paths for API, worker, and UI smoke.
5. Latest RFC/debug status and known risk.
6. Next safe action.

## Phase 3: RFC Cascade

Apply RFC 1 and RFC 2 in sequence. If using event labels, use phase `RFC`.

## Phase 4: Debug Fix

Inject or discover one bug after the RFC cascade, then fix it without losing the latest context. The default bug is: the worker accepts deprecated provider event names after RFC 2. If using event labels, use phase `DEBUG`.

## Wrong-Path Count

Count wrong paths when the agent:

- Reimplements an already working subsystem instead of using the documented entrypoint.
- Uses `severity` as canonical after RFC 1.
- Accepts old provider event names after RFC 2.
- Retries or invents live provider credentials instead of using the deterministic mock provider.
- Runs unrelated framework migrations or rewrites not needed for the RFC/debug task.

## Final Quality

Final quality is still scored by the rubric against product source, tests, README/docs, and Minimal Context facts. Observer logs and benchmark internals are not quality evidence.
