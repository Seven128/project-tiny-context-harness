# Incident Ops Console Requirements

Build a small incident operations console that combines an API, a browser board, a background worker, deterministic mock provider events, and an audit trail.

Core objects:

- Incident: id, title, customerTier, severity, status, owner, createdAt, updatedAt, providerEventId, auditTrail.
- Status values: `new`, `investigating`, `mitigated`, `resolved`.
- Customer tiers: `standard`, `premium`, `enterprise`.
- Severity levels: `low`, `medium`, `high`, `critical`.

Required behavior:

- The API can create, update, list, and inspect incidents.
- The browser board groups incidents by status and highlights enterprise or critical incidents.
- Users can assign an owner and move an incident between statuses.
- The background worker processes provider events from a deterministic mock provider.
- Provider event handling is idempotent by `providerEventId`.
- Failed provider events are retried with a bounded retry policy and moved to a dead-letter list after the limit.
- Every incident mutation appends a readable audit trail entry.
- Tests cover API behavior, worker behavior, and at least one browser/UI smoke path.
- Documentation identifies runnable entrypoints, the current data model, the mock/live provider boundary, test commands, and the next safe action for a fresh agent.

Release readiness means a reviewer can run the API, open the board, process a mock provider event, inspect the audit trail, run the tests, and understand where to resume after a fresh session.
