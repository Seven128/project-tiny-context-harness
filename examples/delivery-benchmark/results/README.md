# Delivery Benchmark Results

Current status: **reset for Minimal Context Harness**.

This directory intentionally contains no historical stage-workflow result
summaries. The old numbers were removed because they no longer describe the
current workflow design.

- `index.html`: static visual report shell.
- `benchmark-data.js`: current report data. It is empty except for pending
  scenario descriptions.

Add new result summaries only after a fresh formal baseline/Harness pair passes
the current publishable evidence rules in `../RUNBOOK.md`.

Future reports may include workflow overhead ratio, artifact inventory / artifact
count, gate true-product defect count versus hygiene issue count, and AC progress visibility.
Those fields are diagnostics only until a fresh formal run proves the same
product quality bar with conclusion-grade observer evidence.
