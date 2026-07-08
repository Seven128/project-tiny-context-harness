# Trusted Evidence Kernel Fixtures

HFC-001 focused fixtures cover the minimal false-completion kernel paths:
historical complete ignored, stale passed evidence with a current failed command,
unregistered passed assertion JSON, AC-010 summary-only bootstrap, target AC and
proof-layer mismatch, source hash mismatch, dirty worktree mismatch, missing
assertion result, invalid current attempt id and one current-evidence happy path.

The test builds each workdir from the shared Superpowers task-state fixture and
uses `expected-outcomes.json` as the fixture expectation source.
