# Webhook Provider Bridge Requirements

Build a small service or CLI that receives provider webhook payloads, verifies them and forwards normalized events to a downstream sink.

Provider boundary:

- A live provider token may be unavailable.
- The project must support a deterministic mock provider fixture.
- Live-provider work must record hard constraints and do-not-retry notes.

Behavior:

- Verify HMAC signature.
- Reject stale timestamps.
- Normalize provider event names to internal event names.
- Guarantee idempotency by event id.
- Retry downstream delivery with bounded backoff.
- Store failed events in a dead-letter queue.
- Expose a health/status command or endpoint.
- Provide local tests plus provider fixture smoke.

High-risk delivery means a fresh Agent can recover the current provider boundary without guessing secrets or repeating unsafe live attempts.
