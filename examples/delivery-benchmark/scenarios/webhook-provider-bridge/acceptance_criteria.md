# Acceptance Criteria

- AC-WEB-001: HMAC signature verification accepts valid payloads and rejects invalid signatures.
- AC-WEB-002: Stale timestamps are rejected.
- AC-WEB-003: Provider events are normalized to internal event names.
- AC-WEB-004: Duplicate event ids are idempotent.
- AC-WEB-005: Downstream failures retry with bounded backoff.
- AC-WEB-006: Exhausted retries go to a dead-letter queue.
- AC-WEB-007: Health/status entrypoint exists.
- AC-WEB-008: Mock provider fixture smoke is runnable.
- AC-WEB-009: High-risk resume facts include canonical path, blocker and do-not-retry.
- AC-WEB-010: Evidence distinguishes local tests, mock provider smoke and live-provider boundary.
