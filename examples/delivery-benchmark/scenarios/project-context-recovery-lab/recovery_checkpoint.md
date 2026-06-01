# Incident Ops Console Recovery Checkpoint

Pause after initial delivery, before the RFC cascade and debug fix. Start a fresh agent/session and ask it to recover using only committed source files, tests, README/docs, and Harness deliverables.

The fresh agent should identify:

- Runnable API, board, worker, and test entrypoints.
- Current canonical incident data model and any deprecated aliases.
- Mock/live provider boundary and why live provider credentials are not required.
- Test paths that prove API, worker, and UI smoke coverage.
- Latest RFC/debug status and remaining risk.
- Next safe action.

The baseline path may write normal README/docs as part of delivery, but it must not be instructed to maintain benchmark operation logs. The Harness path may rely on its normal PRD, UX, architecture, implementation, review, test, release, RFC, and runbook artifacts.
