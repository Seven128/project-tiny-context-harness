# Project / Delivery Context

## Project Goal

- Suggest review-only labels for incoming GitHub issues so maintainers can triage consistently.

## Non-goals / Boundaries

- Do not apply labels to GitHub issues automatically.
- Do not store GitHub tokens, webhook payloads or private issue text in Context files.
- Do not turn label suggestions into priority or assignment decisions.

## Background

- Fresh coding-agent sessions often jump from "suggest a label" to "call the GitHub API." This sample keeps the review boundary explicit so the agent starts in the right place.

## Design Rationale

- A tiny Context surface is enough for the durable project memory: goal, non-goals, ownership boundary and validation path.
- The code and tests prove behavior; Context only tells a fresh agent what facts it should recover before editing.

## Architecture Context

- See `project_context/architecture.md` for system boundaries and component ownership.

## Verification Entry Points

- `npm test`
- `npm run validate-context`

## Current State

- `src/label-routing/suggest-labels.mjs` produces advisory label suggestions from issue title/body text.
- `tests/label-routing.test.mjs` covers advisory-only payload behavior.

## Next Safe Action

- Inspect `project_context/areas/main.md` and `tests/label-routing.test.mjs` before changing label rules.

## Context Index

- [main](areas/main.md)
- [main verification](areas/main/verification.md)
