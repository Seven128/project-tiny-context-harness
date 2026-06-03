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
- Priority score considers customer tier, ticket age, channel, and contract risk using the initial policy the implementation chooses.
- Enterprise tickets near or past SLA must be visibly highlighted.
- API and UI expose loading, empty, error, and invalid-state feedback.
- API errors are structured and include machine-readable `errorCode`.
- Tests cover API behavior, priority policy behavior, and at least one UI/browser smoke path.
- Documentation identifies API/UI entrypoints, priority policy rules, test commands, and next safe action.

Local smoke contract:

- Expose `src/supportDesk.js` with a named `createSupportDesk()` export.
- `createSupportDesk()` returns a deterministic in-memory desk object with these methods:
  - `createTicket(ticketInput)`
  - `listTickets()`
  - `inspectTicket(ticketId)`
  - `updateTicket(ticketId, patch)`
  - `assignTicket(ticketId, assignee)`
  - `moveTicket(ticketId, status)`
  - `renderListView()`
  - `renderKanbanView()`
  - `renderUiStates()`
- `listTickets()`, `renderListView()`, and `renderKanbanView()` must use the same current priority order.
- The render methods may return strings, arrays, or serializable objects, but they must expose enough data for a reviewer to verify order, assignee, status, SLA risk, priority, tier, channel, contract risk, and UI states.

Release readiness means a reviewer can run the API/UI locally, create a ticket, see its priority/SLA state, assign it, move it, run the tests, and understand how to resume after a fresh session.
