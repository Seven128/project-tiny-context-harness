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

High-risk delivery means a fresh agent can recover the current provider boundary without guessing secrets, repeating unsafe live attempts, or confusing evidence levels.
