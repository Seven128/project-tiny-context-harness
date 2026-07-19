# Invoice Operations Lab

A deterministic Node.js fixture used only for Tiny Context mechanism A/B runs.

## Entry points

- Billing: `src/billing/invoiceService.mjs`
- Money policy: `src/billing/money.mjs`
- Schema: `src/billing/invoiceSchema.mjs`
- Notifications: `src/notifications/receiptNotifier.mjs`
- UI projection: `src/ui/invoiceBoard.mjs`
- Retry worker: `src/worker/retryWorker.mjs`
- Admin export: `src/admin/auditExport.mjs`

## Verification

- `npm test`
- `npm run test:ui`
- `npm run smoke:health`

## Boundary

The mock receipt provider is local evidence. A live provider confirmation is external and must never be inferred from the mock fixture.
