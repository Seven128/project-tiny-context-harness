# Migrations

Schema migrations for Harness config and managed file layout belong here.

Version 0.6.0 includes `long-task-v1-retirement`. It safely removes the
retired repo-local Hook, reports a legacy active projection as
`manual_required`, and deliberately does not import V1 progress or receipts
into the V2 Claim/Evidence authority.
