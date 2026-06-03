# Support SLA Escalation Desk Acceptance Criteria

- API supports create, update, list, inspect, assign, and status move for tickets.
- UI provides kanban and list views.
- Both views show SLA risk, priority score, owner, status, customer tier, channel, and contract risk.
- Priority policy uses customer tier, age, channel, and contract risk.
- Enterprise near-breach or breach tickets are highlighted.
- Assignment and status movement append audit trail entries.
- API and UI cover loading, empty, error, and invalid-state behavior.
- Tests cover API behavior, priority policy, and UI/browser smoke.
- README/docs identify entrypoints, priority policy, test commands, and next safe action.
- `src/supportDesk.js#createSupportDesk()` exposes the deterministic smoke contract for API, policy and UI consistency checks.
- API list output, list view and kanban view use the same current priority order.
