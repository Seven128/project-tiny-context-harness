# Support SLA Escalation Desk Requirements

Build a support escalation desk with a lightweight API, a browser UI, and a priority policy engine.

Core objects:

- Ticket: id, title, customerTier, channel, createdAt, status, priorityScore, contractRisk, assignee, auditTrail.
- Status values: `new`, `triaged`, `waiting`, `resolved`.
- Customer tiers: `standard`, `premium`, `enterprise`.
- Channels: `email`, `chat`, `phone`, `partner`.
- Contract risk values: `none`, `watch`, `breach`.

Required behavior:

- Users can create, update, list, inspect, assign, and move tickets through the API.
- The browser UI has kanban and list views.
- Both views show SLA risk, priority score, owner, status, customer tier, channel, and contract risk.
- Priority score considers customer tier, ticket age, channel, and contract risk.
- Enterprise tickets near or past SLA must be visibly highlighted.
- API and UI expose loading, empty, error, and invalid-state feedback.
- API errors are structured and include machine-readable `errorCode`.
- Tests cover API behavior, priority policy behavior, and at least one UI/browser smoke path.
- Documentation identifies API/UI entrypoints, priority policy rules, test commands, known RFC/debug state, and next safe action.

Release readiness means a reviewer can run the API/UI locally, create a ticket, see its priority/SLA state, assign it, move it, run the tests, and understand how to resume after a fresh session.
