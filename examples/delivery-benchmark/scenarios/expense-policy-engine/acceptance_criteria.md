# Acceptance Criteria

- AC-EXP-001: CLI accepts JSON from file path and stdout returns stable JSON.
- AC-EXP-002: Approved requests include `approved: true`, `reasonCode: "APPROVED"` and an `auditTrail`.
- AC-EXP-003: Staff meal over the regional limit returns `MEAL_LIMIT_EXCEEDED`.
- AC-EXP-004: Missing receipt over 25 returns `MISSING_RECEIPT`.
- AC-EXP-005: Weekend travel returns `WEEKEND_TRAVEL_REVIEW`.
- AC-EXP-006: Executive limits are higher than staff/manager but still produce audit trail.
- AC-EXP-007: Invalid input returns structured error with `INVALID_INPUT`.
- AC-EXP-008: Tests cover at least approved, meal limit, missing receipt, weekend travel and invalid input paths.
- AC-EXP-009: Final handoff records CLI smoke evidence.
- AC-EXP-010: Fresh-session recovery can identify next action without chat history.
