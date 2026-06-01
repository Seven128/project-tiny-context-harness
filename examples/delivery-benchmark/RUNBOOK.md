# Delivery Benchmark Operator Runbook

This runbook is the repo-local operating protocol for Delivery Benchmark pilot
runs. It is not a public `sdlc-harness` package command.

## Purpose

Use this protocol when validating whether a benchmark scenario can be run
repeatably before publishing new comparison data. The first recommended pilot is
`project-context-recovery-lab`, because it directly tests fresh-agent recovery,
context continuity, RFC churn and debug repair after the initial delivery.

Pilot runs are calibration evidence by default. Do not update
`results/benchmark-data.js` until both `baseline` and `harness` complete the same
scenario against the same quality rubric.

## Isolation Rules

- Run both `baseline` and `harness` for the same scenario, model, reasoning
  setting and final quality bar.
- Prepare separate run directories before starting the measured work.
- Start each measured path in a fresh agent/thread. The agent under test should
  receive only the run directory and `.benchmark/prompt.md`.
- Do not tell the measured agent that an external observer or timer is running.
- Do not ask `baseline` to write `.benchmark/transcript.md`, an operation log or
  any benchmark-only self-log.
- Keep raw artifacts under
  `.artifacts/delivery-benchmark/<timestamp>-context-recovery-pilot/`; do not
  commit raw transcripts, temporary projects or observer logs.
- Observer logs and benchmark internals are not quality evidence. Score product
  source, tests, README/docs and Harness deliverables only.

## Directory Setup

Use a timestamped artifact root outside committed results:

```sh
STAMP="$(date -u +%Y%m%d-%H%M%S)"
RUN_ROOT=".artifacts/delivery-benchmark/${STAMP}-context-recovery-pilot"
SCENARIO="project-context-recovery-lab"

node examples/delivery-benchmark/runner/delivery_benchmark.mjs prepare \
  --scenario "$SCENARIO" \
  --mode baseline \
  --out-dir "$RUN_ROOT/baseline" \
  --force

node examples/delivery-benchmark/runner/delivery_benchmark.mjs prepare \
  --scenario "$SCENARIO" \
  --mode harness \
  --out-dir "$RUN_ROOT/harness" \
  --force
```

## Measured Path

Run the following sequence once for `baseline` and once for `harness`.
Set `RUN_DIR="$RUN_ROOT/baseline"` for the first pass, then repeat with
`RUN_DIR="$RUN_ROOT/harness"`.

1. Start the external observer before the agent begins work:

```sh
node examples/delivery-benchmark/runner/delivery_benchmark.mjs observe-start \
  --run-dir "$RUN_DIR"
```

2. Start `INITIAL_DELIVERY` timing, give the fresh agent only
   `$RUN_DIR/.benchmark/prompt.md`, and stop the timer when the first complete
   implementation is ready for the recovery checkpoint:

```sh
node examples/delivery-benchmark/runner/delivery_benchmark.mjs timer-start \
  --run-dir "$RUN_DIR" \
  --event initial_delivery \
  --kind coding \
  --phase INITIAL_DELIVERY

node examples/delivery-benchmark/runner/delivery_benchmark.mjs timer-stop \
  --run-dir "$RUN_DIR" \
  --notes "initial delivery complete"
```

3. Start a new fresh agent/thread for Fresh-Agent Recovery. Ask it to inspect
   only the repository and answer the recovery quiz from `lifecycle_probe.md`
   before making changes. Score 0-6 and record the score outside the run
   directory.

```sh
node examples/delivery-benchmark/runner/delivery_benchmark.mjs timer-start \
  --run-dir "$RUN_DIR" \
  --event fresh_agent_recovery \
  --kind handoff \
  --phase RECOVERY

node examples/delivery-benchmark/runner/delivery_benchmark.mjs timer-stop \
  --run-dir "$RUN_DIR" \
  --notes "recovery quiz complete"
```

4. Apply the RFC cascade from `rfc_change.md` in sequence. Use phase `RFC` for
   the whole cascade unless the pilot explicitly needs per-RFC labels.

```sh
node examples/delivery-benchmark/runner/delivery_benchmark.mjs timer-start \
  --run-dir "$RUN_DIR" \
  --event rfc_cascade \
  --kind rework \
  --phase RFC

node examples/delivery-benchmark/runner/delivery_benchmark.mjs timer-stop \
  --run-dir "$RUN_DIR" \
  --notes "RFC cascade complete"
```

5. Run the Debug Fix probe. For `project-context-recovery-lab`, the default
   debug condition is that old provider event names must be rejected after RFC 2.
   If the implementation already behaves correctly, require a regression test
   proving the boundary.

```sh
node examples/delivery-benchmark/runner/delivery_benchmark.mjs timer-start \
  --run-dir "$RUN_DIR" \
  --event debug_fix \
  --kind rework \
  --phase DEBUG

node examples/delivery-benchmark/runner/delivery_benchmark.mjs timer-stop \
  --run-dir "$RUN_DIR" \
  --notes "debug fix complete"
```

6. Stop the observer after final verification:

```sh
node examples/delivery-benchmark/runner/delivery_benchmark.mjs observe-stop \
  --run-dir "$RUN_DIR"
```

## Gate Timing Protocol

Use the scenario `Gate Profile` to decide which gates are relevant. Fast path
means running the smallest gate that proves the current boundary; it does not
mean lowering the quality bar.

- Orientation should read prompt/scenario/repo/docs/tests and should not run
  heavy validation.
- Domain gates, such as project-local `npm test` or scenario smoke tests, count
  as product delivery gates. Time them with `kind test`.
- Harness gates, such as `make validate-plan`, `make validate-dev`,
  `transition.py`, overview freshness or source drift checks, count as workflow
  control gates. Time them with `kind workflow_control`.
- Package source sync/check, workspace full regression, `make validate-harness`
  and consumer-lab validation are out of scope unless package source or managed
  assets changed.
- Gate commands should use `phase GATE` or an event name beginning with
  `gate:` so `score` can report `Gate Cost Breakdown`.

Example gate timers:

```sh
node examples/delivery-benchmark/runner/delivery_benchmark.mjs timer-start \
  --run-dir "$RUN_DIR" \
  --event gate:npm-test \
  --kind test \
  --phase GATE

node examples/delivery-benchmark/runner/delivery_benchmark.mjs timer-stop \
  --run-dir "$RUN_DIR" \
  --notes "project-local npm test complete"

node examples/delivery-benchmark/runner/delivery_benchmark.mjs timer-start \
  --run-dir "$RUN_DIR" \
  --event gate:validate-dev \
  --kind workflow_control \
  --phase GATE

node examples/delivery-benchmark/runner/delivery_benchmark.mjs timer-stop \
  --run-dir "$RUN_DIR" \
  --notes "Harness development gate complete"
```

The pilot summary must be able to explain where gate cost came from: product
verification, workflow control, or an out-of-scope package regression that should
not have been run.

## Wrong-Path Count

Record wrong-path count after the run. Do not require the measured agent to
maintain this count.

Count a wrong path when the agent:

- Reimplements an already working subsystem instead of using the documented
  entrypoint.
- Uses `severity` as canonical after RFC 1.
- Accepts old provider event names after RFC 2.
- Retries or invents live provider credentials instead of using the deterministic
  mock provider.
- Runs unrelated framework migrations or rewrites not needed for the RFC/debug
  task.

## Scoring

Write one markdown summary per mode. Pass the recovery score and wrong-path
count from the operator notes:

```sh
node examples/delivery-benchmark/runner/delivery_benchmark.mjs score \
  --scenario "$SCENARIO" \
  --mode baseline \
  --run-dir "$RUN_ROOT/baseline" \
  --context-recovery-score "<0-6>" \
  --context-recovery-total 6 \
  --wrong-path-count "<n>" \
  --markdown-report "$RUN_ROOT/baseline-summary.md"

node examples/delivery-benchmark/runner/delivery_benchmark.mjs score \
  --scenario "$SCENARIO" \
  --mode harness \
  --run-dir "$RUN_ROOT/harness" \
  --context-recovery-score "<0-6>" \
  --context-recovery-total 6 \
  --wrong-path-count "<n>" \
  --markdown-report "$RUN_ROOT/harness-summary.md"
```

The summary should show lifecycle metrics for `INITIAL_DELIVERY`, `RECOVERY`,
`RFC`, `DEBUG`, context recovery score, wrong-path count and final quality.

## Publication Rule

If either mode fails to reach the same final quality bar, mark the pilot as
protocol calibration only. Do not publish partial numbers in the visual report,
and do not claim Harness is faster or more efficient from one incomplete run.
