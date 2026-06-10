# Architecture Context

## System Boundary

- The sample service produces label suggestions only.
- Maintainers remain responsible for approving and applying labels.
- GitHub write behavior is outside this sample.

## Component Map

- `src/label-routing/**`: owns label suggestion rules and advisory review payloads.
- `tests/**`: owns executable behavior checks for the sample.
- `project_context/**`: owns durable recovery facts for fresh agent sessions.

## Data / Control Flow

- Input issue data enters `suggestLabels({ title, body })`.
- Label rules match normalized text and return `{ label, reason }` suggestions.
- `buildReviewPayload(issue)` wraps suggestions with `advisoryOnly: true` and no apply URL.

## Design Rationale

- The sample keeps the implementation intentionally small so visitors can inspect the Context surface without learning a full product.
- The no-write boundary is repeated in Context and tests because it is the mistake fresh agents are most likely to make.

## Constraints And Tradeoffs

- Label-routing code must not import GitHub API clients.
- New labels should include a short human-readable reason.
- Context files should stay short and should not store one-off test logs.

## Verification Implications

- `npm test` should cover advisory-only behavior and common label matches.
- `npm run validate-context` should pass without storing execution results in Context.

## Open Risks

- Keyword matching is deliberately simple and would need stronger evaluation before use in a real project.

