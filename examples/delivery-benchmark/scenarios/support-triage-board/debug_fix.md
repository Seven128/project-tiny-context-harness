# Support SLA Escalation Desk Debug Fix

Apply this after the RFC cascade is complete.

Verify that API ordering and UI ordering match after the weighted priority policy and bulk assignment work. If the UI appears sorted but the API returns stale or unweighted order, or the API is correct but UI state is stale after bulk assignment, fix it and add regression coverage.

The final implementation must preserve `auditReason`, bulk assignment audit trail behavior, the weighted policy source of truth, and UI/API/test/docs alignment. Use the `src/supportDesk.js#createSupportDesk()` smoke contract to prove that `listTickets()`, `renderListView()`, and `renderKanbanView()` agree after bulk assignment and RFC-driven ordering changes.
