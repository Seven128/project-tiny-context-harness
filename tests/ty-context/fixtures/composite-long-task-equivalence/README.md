# Composite Long-Task Equivalence Fixtures

This directory stores normalized semantic golden data for the Composite Long-Task equivalence runner.

The runner may update `baseline.normalized.json` with:

```bash
node tools/verify_composite_long_task_equivalence.mjs --baseline-sha <sha> --current-sha <sha> --update-golden true
```

Do not store timestamps, event ids, absolute worktree paths, protocol hashes, full Goal text, one-off reports or smoke transcripts here. One-off equivalence outputs belong under `tmp/ty-context/composite-equivalence/**`.
