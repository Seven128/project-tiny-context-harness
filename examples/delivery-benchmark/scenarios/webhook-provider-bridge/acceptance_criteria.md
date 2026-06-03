# Webhook Provider Safety Bridge Acceptance Criteria

- HMAC signature verification accepts valid payloads and rejects invalid signatures.
- Stale timestamps are rejected.
- Replayed event ids are rejected or handled idempotently.
- Provider events are normalized to internal event names.
- Duplicate event ids do not enqueue duplicate downstream work.
- Downstream failures retry with bounded backoff.
- Exhausted retries go to a dead-letter queue.
- Health/status entrypoint exists.
- Mock provider fixture smoke is runnable without live credentials.
- Live-provider blocker, credential reference, do-not-retry rule, evidence levels, and next safe action are documented.
- `src/webhookBridge.js#createWebhookBridge()` exposes the deterministic smoke contract for receiver, signature, replay, queue, DLQ, mock smoke, status, and evidence-boundary checks.
- The smoke contract can be exercised by a hidden probe without live credentials, using only deterministic fixture secrets and local inputs.
