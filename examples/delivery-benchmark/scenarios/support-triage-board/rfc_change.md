# Support SLA Escalation Desk RFC Cascade

Apply these changes after initial delivery and the fresh-agent recovery probe.

## RFC 1: Weighted SLA Priority Policy

Replace simple SLA-risk sorting with a weighted priority policy:

- `customerTier`: enterprise > premium > standard.
- `channel`: phone and partner are higher urgency than chat and email.
- `age`: older tickets increase priority.
- `contractRisk`: breach > watch > none.

Required impact:

- API list output uses the weighted policy.
- UI kanban and list views display the same order.
- `src/supportDesk.js#createSupportDesk().listTickets()`, `renderListView()`, and `renderKanbanView()` share the same policy source of truth.
- Tests cover policy ordering with at least three representative tickets.
- README/docs explain the weighted policy and its source of truth.

## RFC 2: Bulk Assignment With Audit Reason

Add bulk assignment for selected tickets. Every bulk assignment must require an `auditReason`, update each ticket owner, and append an audit trail entry.

Required impact:

- API supports bulk assignment.
- UI exposes the bulk assignment flow in both kanban and list contexts.
- Invalid or missing `auditReason` returns a structured error.
- `bulkAssign(ticketIds, { assignee, auditReason })` updates every selected ticket and appends the reason to each audit trail.
- Tests cover successful bulk assignment and invalid audit reason.
- Recovery notes identify API/UI/test changes together so a fresh agent does not fix only one layer.
