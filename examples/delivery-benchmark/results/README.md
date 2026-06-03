# Benchmark Results

This directory is for small, representative summaries from actual benchmark runs.

Do not commit raw generated projects, full command transcripts or large logs here. Keep raw runs under `/tmp` or `.artifacts/delivery-benchmark/`.

Open [`index.html`](index.html) for a static visual report designed for readers evaluating the project. The report supports English/Chinese switching and defaults from the browser language.

The completed `expense-policy-engine` run was recorded before the external observer existed, so its cost confidence remains low. New lifecycle runs use `observe-start` / `observe-stop` in the benchmark runner to record external elapsed time and file activity without asking the agent under test to maintain a log.

`project-context-recovery-lab` now has a clean staged-injection lifecycle pilot. It reached same-quality delivery, but it does not support a Harness efficiency claim: Baseline was faster overall and in every measured lifecycle segment. The initial prompt excluded future recovery/RFC/debug probes; the operator injected each stage only when measured.

`support-triage-board` now has a formal gate-value pilot summary. It is the
strongest conclusion-grade sample so far because both paths passed the same
hidden `12/12` product-quality probe, while observer elapsed time was
`26.9158 min` baseline vs `48.4984 min` Harness. That supports a negative
same-quality elapsed-time conclusion for this scenario.

`webhook-provider-bridge` has a 2026-06-03 calibration attempt, not a public
result. Both initial-delivery paths passed the hidden provider-safety probe, but
the measured Harness sandbox could not create `.codex/**` or write
`.git/index.lock`; it fell back to `codex/**` and could not complete the run-dir
task commit/push protocol. Keep those numbers out of the visual report until a
fresh rerun uses a measured environment that permits the configured Harness root
and local git repo writes.

A later 2026-06-03 rerun exposed the matching baseline boundary: baseline
initial delivery passed local tests and recovery scored well, but product
source/tests/docs were still uncommitted when the fresh recovery agent started.
That attempt is also calibration-only. Formal lifecycle results now require both
paths to enter recovery/RFC/debug from a clean committed product state.

Metric confidence is now reported separately from raw score values. The context
pilot's elapsed-time totals are high-confidence observer data, but its published
quality and recovery scores were produced before hidden quality probe and hidden
answer-key recovery scoring were added. Treat those scores as static/operator
evidence, not hidden-probe evidence.

The visual report also has Automation Burden and Gate Value panels. Gate findings
from the support pilot are diagnostic because they are operator-recorded; they
can motivate gate thinning, but they do not prove gate net value. Operator
intervention prompt counts and escaped defects remain unavailable unless
explicitly recorded.

The visual report now also shows Artifact Inventory when raw scored data exists.
For `support-triage-board`, the inventory separates product source/tests/UI
assets from Harness managed runtime and `.work_products` facts. These file and
line counts are filesystem-measured, but they remain diagnostic: they explain
where artifact volume came from and do not prove artifact value by themselves.

The current gate-thinning recommendation is `Standard Thin`: keep focused
product quality gates in the work loop, move strict workflow gates to completion
and phase/release/package boundaries, and keep strict gates for high-risk
provider/live work. This recommendation has been adopted into the common Harness
guidance as a workflow behavior change; product quality, phase exits, release
and package/source safety remain strict.

## Current Status

Public benchmark scores are claimed only after baseline and Harness paths have both been executed for the same scenario with the same final quality bar.
Before adding or changing a public row, run `evidence-check` on the paired JSON
summaries and keep any non-formal pair as calibration/diagnostic evidence only.

Use this table only after real scored runs exist:

| Scenario | Baseline Score | Harness Score | Workflow Overhead | Net Value | Notes |
|---|---:|---:|---:|---:|---|
| `expense-policy-engine` | 13/13 PASS | 13/13 PASS | 29 / 53 min | unavailable | [2026-06-01 run](expense-policy-engine-20260601-174424.md); legacy cost confidence low |
| `project-context-recovery-lab` | 17/17 PASS | 17/17 PASS | unavailable | unavailable | [2026-06-02 run](project-context-recovery-lab-20260602-033759.md); observer total 14.0196 vs 21.0036 min; Harness slower than baseline |
| `support-triage-board` | 12/12 PASS | 12/12 PASS | unavailable | unavailable | [2026-06-02 run](support-triage-board-20260602-083512.md); hidden quality tied, observer total 26.9158 vs 48.4984 min; gate value diagnostic only |
| `webhook-provider-bridge` | pending | pending | pending | pending | provider safety and wrong-path probe; 2026-06-03 attempt is calibration-only due measured Harness `.codex` / `.git/index.lock` sandbox blocker |
