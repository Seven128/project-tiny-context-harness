---
context_role: area
---
# Area Context: Notifications

## Responsibility

- Own receipt-delivery requests and the boundary between deterministic mock evidence and external live-provider confirmation.

## Current Contract

- The notifier records each explicit `sendReceipt(event)` request and labels the result as mock evidence.
- Billing does not currently declare when a paid transition must call the notifier or whether repeated requests are idempotent.
- Mock delivery may prove local request shape only; it never proves live delivery.

## Code Entry Points

- `src/notifications/receiptNotifier.mjs`
- `src/billing/invoiceService.mjs`

## Verification

- Notification integration changes require tests that observe both the billing transition and sent-event collection.
