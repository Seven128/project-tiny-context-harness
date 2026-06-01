# Incident Ops Console Acceptance Criteria

- API supports create, update, list, and inspect operations for incidents.
- The browser board renders `new`, `investigating`, `mitigated`, and `resolved` columns.
- Enterprise or critical incidents are visibly highlighted as risk.
- Assignment and status movement persist and append audit trail entries.
- Worker consumes deterministic mock provider events and never requires live provider credentials for local evidence.
- Provider events are idempotent by `providerEventId`.
- Retry policy is bounded and dead-letter handling is visible.
- Structured errors are returned for invalid incident input, invalid state transitions, and duplicate provider events.
- Tests cover API behavior, worker behavior, and a UI/browser smoke path.
- README/docs identify entrypoints, test commands, mock/live boundary, current data model, and next safe action.
