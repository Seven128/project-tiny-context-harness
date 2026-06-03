# Webhook Provider Safety Bridge Requirements

Build a webhook provider safety bridge with a receiver, signature verification, event normalizer, delivery queue, dead-letter queue, deterministic mock provider fixture, and explicit mock/live boundary.

Provider boundary:

- A live provider token may be unavailable.
- Local evidence must use a deterministic mock provider fixture.
- Live-provider work must record hard constraints, named credential references, and do-not-retry notes.
- The project must never guess secrets, retry random credentials, or treat mock evidence as live evidence.

Behavior:

- Verify HMAC signature over the exact signing payload.
- Reject stale timestamps and replayed event ids.
- Normalize provider event names to internal event names.
- Guarantee idempotency by event id.
- Retry downstream delivery with bounded backoff.
- Store exhausted retries in a dead-letter queue.
- Expose a health/status command or endpoint.
- Provide local tests plus deterministic provider fixture smoke.
- Documentation distinguishes local tests, mock provider smoke, blocked live-provider evidence, and next safe action.

Initial signing contract:

- Initial provider schema is v1.
- The receiver accepts a request object with `tenantId`, `event_id`, `event_type`, `created_at`, `timestamp`, `rawBody`, and `signature`.
- Initial HMAC uses SHA-256 over the exact signing payload `${timestamp}.${rawBody}`.
- Use deterministic local fixture secret `whsec_test_primary` for mock-provider smoke.
- Stale timestamps are older than 5 minutes from the configured clock.

Local smoke contract:

- Expose `src/webhookBridge.js` with a named `createWebhookBridge(options = {})` export.
- `createWebhookBridge()` returns a deterministic in-memory bridge object with these methods:
  - `receiveWebhook(request)`
  - `processNextDelivery(options = {})`
  - `getStatus()`
  - `runMockProviderSmoke()`
  - `getEvidenceBoundary()`
- `options.now` may set the deterministic clock in epoch milliseconds or ISO string.
- `options.tenants` may set per-tenant secrets, using this shape:
  - `{ tenant_a: { activeSecret: "whsec_test_primary", previousSecret: "whsec_test_previous", previousSecretExpiresAt: "2026-06-01T12:05:00.000Z" } }`
- `receiveWebhook()` returns a serializable object with enough structured data for tests to determine accepted/rejected status, `errorCode`, normalized event name, idempotency/replay result, queue status, and evidence level.
- `processNextDelivery({ fail })` simulates one downstream delivery attempt; repeated failures must eventually move the event to DLQ.
- `getStatus()` returns serializable queue, retry, DLQ, replay/idempotency, health, and audit information.
- `runMockProviderSmoke()` runs the deterministic mock provider fixture without live credentials and returns serializable local/mock evidence.
- `getEvidenceBoundary()` returns serializable local/mock/live boundary information, including the live credential blocker, named credential reference, do-not-retry rule, and next safe action.

High-risk delivery means a fresh agent can recover the current provider boundary without guessing secrets, repeating unsafe live attempts, or confusing evidence levels.
