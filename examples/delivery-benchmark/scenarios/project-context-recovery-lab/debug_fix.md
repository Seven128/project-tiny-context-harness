# Incident Ops Console Debug Fix

Apply this after the RFC cascade is complete.

Verify that the worker rejects old provider event names after RFC 2. If `incident.opened` or `incident.closed` is still accepted, fix it and add regression coverage.

The final implementation must preserve the current `impactLevel` model, the deprecated `severity` input alias, the new `provider.incident.opened` / `provider.incident.closed` event names, and the `incident:write` permission rule.
