# Benchmark Results

This directory is for small, representative summaries from actual benchmark runs.

Do not commit raw generated projects, full command transcripts or large logs here. Keep raw runs under `/tmp` or `.artifacts/delivery-benchmark/`.

Open [`index.html`](index.html) for a static visual report designed for readers evaluating the project. The report supports English/Chinese switching and defaults from the browser language.

The completed `expense-policy-engine` run was recorded before the external observer existed, so its cost confidence remains low. Future runs should use `observe-start` / `observe-stop` in the benchmark runner to record external elapsed time and file activity without asking the agent under test to maintain a log.

The current completed run also does not measure lifecycle efficiency. Fresh-agent recovery, multi-RFC cascade, debug-fix time, context recovery score and wrong-path count are planned through the three pending lifecycle scenarios and remain pending until those scenarios are rerun cleanly with staged injection. In a formal run, the initial prompt excludes future recovery/RFC/debug probes; the operator injects each stage only when measured.

## Current Status

Public benchmark scores are claimed only after baseline and Harness paths have both been executed for the same scenario with the same final quality bar.

Use this table only after real scored runs exist:

| Scenario | Baseline Score | Harness Score | Workflow Overhead | Net Value | Notes |
|---|---:|---:|---:|---:|---|
| `expense-policy-engine` | 13/13 PASS | 13/13 PASS | 29 / 53 min | unavailable | [2026-06-01 run](expense-policy-engine-20260601-174424.md); legacy cost confidence low |
| `project-context-recovery-lab` | pending | pending | pending | pending | context continuity and fresh-agent recovery probe |
| `support-triage-board` | pending | pending | pending | pending | cross-layer RFC/debug efficiency probe |
| `webhook-provider-bridge` | pending | pending | pending | pending | provider safety and wrong-path probe |
