# Webhook Provider Safety Bridge Fresh-Agent Takeover Task

You are taking over a webhook provider safety bridge after local tests and mock provider smoke pass. Write a short takeover memo for the operator. Do not change source files during this stage.

Your memo should be based only on committed source files, tests, README/docs, and any Minimal Context facts in this run. Use concrete file path citations for every important claim.

Cover:

- What the bridge does and which provider boundary it protects.
- Receiver, health/status, deterministic fixture smoke, and test entrypoints.
- The canonical mock provider path and what counts as local or mock evidence.
- The live-provider blocker, named credential reference, and do-not-retry rule for missing live credentials.
- Which behavior protects signatures, timestamps, replay, idempotency, retry, and DLQ handling.
- What changed most recently, what is risky, and the next safe local action.

The benchmark operator will score the memo against a hidden answer key. The answer key is not part of the prompt.
