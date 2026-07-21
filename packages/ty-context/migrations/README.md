# Migrations

Schema migrations for Harness config and managed file layout belong here.

Version 0.6.0 includes `long-task-v1-retirement`. It safely removes the
retired repo-local Hook, reports a legacy active projection as
`manual_required`, and deliberately does not import V1 progress or receipts
into the V2 Claim/Evidence authority.

Version 0.7.2 includes `long-task-v2-semantic-drift-authority`. It reports a
conventional `.long-task/delivery-contract.yaml` as `manual_required` when the
V2 file predates explicit Stage, target-profile/root-runtime, journey-scenario,
success/degradation, evidence-capability or external-impact authority. Those
meanings must be re-authored from Source; migration never infers them from old
Progress or Receipts.
