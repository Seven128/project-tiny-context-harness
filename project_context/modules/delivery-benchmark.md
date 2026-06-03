# Module Context: delivery-benchmark

## Responsibility

- Provide repo-local scenarios, runner tools and static reports that evaluate whether Harness improves same-quality lifecycle delivery efficiency.

## User / System Contract

- Benchmark runner prepares fixed baseline and Harness run directories.
- Observer, timer, hidden quality probes, recovery scoring, intervention records and gate findings are measurement tools, not product quality shortcuts.
- Public conclusions should use high-confidence metrics for core claims and keep medium/low-confidence metrics as diagnostics.
- New Harness benchmark prompts should use Minimal Context, not the old stage workflow.

## Core Data / API / State

- Runner: `examples/delivery-benchmark/runner/delivery_benchmark.mjs`.
- Scenarios: `examples/delivery-benchmark/scenarios/**`.
- Prompts: `examples/delivery-benchmark/prompts/baseline.md` and `examples/delivery-benchmark/prompts/harness.md`.
- Report data and UI: `examples/delivery-benchmark/results/benchmark-data.js` and `index.html`.
- Operator docs: `examples/delivery-benchmark/README.md`, `RUNBOOK.md`, `EVIDENCE_CHECKLIST.md` and `GATE_THINNING_ANALYSIS.md`.

## Key Constraints

- Do not publish calibration pilots as formal efficiency results.
- Do not leak recovery/RFC/debug probe answers into initial prompts.
- Treat historical stage-based numbers as historical evidence after Minimal Context becomes the default.
- Benchmark projects should be high-signal but not hacked: they may target Harness design goals, but must keep the same quality bar and independent fresh runs.

## Code Entry Points

- `examples/delivery-benchmark/runner/delivery_benchmark.mjs`
- `examples/delivery-benchmark/scenarios/*/quality_probe.mjs`
- `examples/delivery-benchmark/results/index.html`

## Test Entry Points

- `node --test tests/sdlc-harness/delivery-benchmark.test.mjs`
- `node --check examples/delivery-benchmark/runner/delivery_benchmark.mjs`
- `node --check examples/delivery-benchmark/results/benchmark-data.js`

## Open Risks

- Current benchmark data mixes high-confidence elapsed/hidden quality metrics with diagnostic operator-scored metrics.
- Future pilot design must measure whether Minimal Context reduces recovery cost without hiding Harness overhead.
