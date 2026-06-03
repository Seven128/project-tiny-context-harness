# Webhook Provider Safety Bridge RFC Cascade

Apply these changes after initial delivery and the fresh-agent recovery probe.

## RFC 1: Provider Event Schema v2

Provider events move from schema v1 to schema v2:

- `event_id` becomes `eventId`.
- `event_type` becomes `eventType`.
- `created_at` becomes `createdAt`.
- The signing payload now includes `tenantId`, `eventId`, `eventType`, `createdAt`, and raw body.
- The exact v2 signing payload is `${tenantId}.${eventId}.${eventType}.${createdAt}.${rawBody}`.

Required impact:

- Receiver validates v2 payload fields.
- Signature verification uses the v2 signing payload.
- Normalizer maps v2 event names to internal events.
- v1 payloads are rejected with a structured error unless explicitly marked as legacy fixture tests.
- Tests and docs identify v2 as canonical.

## RFC 2: Tenant Secret Rotation and Replay Protection

Add tenant-level secret rotation and replay protection:

- Each tenant has an active secret and an optional previous secret.
- Previous secret is accepted only inside a rotation grace window.
- Event ids must be replay-protected per tenant.
- Replay rejection must be visible in status or audit output.

Required impact:

- Tests cover active secret, previous secret inside grace, expired previous secret, and replayed event id.
- README/docs explain tenant secret rotation and replay protection.
- Recovery notes make the live credential blocker explicit and preserve the do-not-retry rule.
