# Main Area Context

## Responsibility

- Own label suggestion behavior for GitHub issue triage.

## User / System Contract

- Input: issue title and body text.
- Output: suggested labels with short reasons.
- Suggestions are advisory until a maintainer approves them.

## Key Constraints

- Do not mutate GitHub issue labels in suggestion code.
- Do not add GitHub API write clients to `src/label-routing/**`.
- Keep label taxonomy changes explicit in tests.

## Code Entry Points

- `src/label-routing/suggest-labels.mjs`
- `tests/label-routing.test.mjs`

