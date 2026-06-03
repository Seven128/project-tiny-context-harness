# Incident Ops Console Fresh-Agent Takeover Task

Pause after initial delivery, before the RFC cascade and debug fix. Start a fresh agent/session and ask it to recover using only committed source files, tests, README/docs, and mode-appropriate durable deliverables.

Write a short takeover memo for the operator. Do not change source files during this stage.

The memo must cite file paths for each claim and cover:

- What the system currently does.
- How to run or inspect the current implementation.
- The current data model and any compatibility aliases.
- Local/mock versus live/provider boundaries.
- What has already changed, what risk remains, and the next safe action.

The baseline path may write normal README/docs as part of delivery, but it must not be instructed to maintain benchmark operation logs. The Harness path may rely on its normal PRD, UX, architecture, implementation, review, test, release, RFC, and runbook artifacts.

The benchmark operator will score the memo against a hidden answer key. The answer key is not part of the prompt.
