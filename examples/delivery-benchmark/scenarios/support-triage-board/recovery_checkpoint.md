# Support SLA Escalation Desk Recovery Checkpoint

Pause after initial delivery, before the RFC cascade and debug fix. Start a fresh agent/session and ask it to recover from committed source files, tests, README/docs, and Harness deliverables.

The fresh agent should identify:

- How to start the API and browser UI.
- Where the priority policy lives and which fields affect it.
- Which UI states and views are expected.
- Which tests cover API, priority policy, and UI smoke.
- Whether the latest issue is an RFC change or a debug fix.
- The next safe action that updates API, UI, tests, and docs together.

The benchmark should measure whether the agent avoids a partial fix, such as updating only UI sorting while leaving API order or tests stale.
