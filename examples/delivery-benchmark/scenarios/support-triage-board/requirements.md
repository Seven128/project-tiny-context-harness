# Support Triage Board Requirements

Build a small support ticket triage app. A lightweight API plus simple browser UI is enough.

Core objects:

- Ticket: id, title, customerTier, channel, createdAt, status, priorityScore, assignee.
- Status values: `new`, `triaged`, `waiting`, `resolved`.
- Customer tiers: `standard`, `premium`, `enterprise`.

Required behavior:

- Users can create a ticket through the API and see it on the board.
- The board groups tickets by status.
- Priority score considers tier, age and channel.
- Enterprise tickets older than 2 hours must show SLA risk.
- A ticket can be assigned and moved between statuses.
- Empty, loading and error states are visible in the UI.
- The API returns structured errors.
- Tests cover API behavior and at least one browser/UI smoke path.

Release readiness means a reviewer can run the app locally, create a ticket, move it and verify the board state.
