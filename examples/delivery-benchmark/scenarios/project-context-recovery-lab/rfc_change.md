# Incident Ops Console RFC Cascade

Apply these changes after initial delivery and the fresh-agent recovery probe.

## RFC 1: Canonical Impact Model

Rename `severity` to `impactLevel` everywhere in the canonical incident data model. Keep `severity` as a deprecated input alias for one release so old provider fixtures still work.

Required impact:

- API validation accepts `impactLevel` and the deprecated `severity` alias.
- New source, tests, README/docs, and audit trail language use `impactLevel` as canonical.
- Tests prove both canonical input and deprecated alias behavior.
- Recovery notes explicitly say `severity` is deprecated, not canonical.

## RFC 2: Provider Event and Permission Constraint

Provider event names change from `incident.opened` / `incident.closed` to `provider.incident.opened` / `provider.incident.closed`. Only users with `incident:write` can change owner or status.

Required impact:

- Mock provider fixtures and worker logic use the new provider event names.
- Deprecated old event names are rejected with a structured error.
- Owner/status changes require `incident:write`.
- Audit trail records the acting user and permission result.
- Tests and recovery notes expose the latest RFC state to a fresh agent.

## Debug Fix

After RFC 2, verify that the worker rejects old provider event names. If `incident.opened` or `incident.closed` is still accepted, fix it and add regression coverage.
