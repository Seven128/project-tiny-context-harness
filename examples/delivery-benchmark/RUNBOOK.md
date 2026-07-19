# Delivery Benchmark Runbook

This is the current operator protocol for rerunning the benchmark after the
Minimal Context Harness reset.

## Reset Rule

Historical stage-workflow pilot results are not current benchmark evidence.
Treat every scenario as pending until a new fresh baseline/Harness pair is run
with the current Minimal Context prompt.

For public claim boundaries and interpretation rules, see
`docs/benchmarking.md`.

Narrow mechanism A/B work uses `mechanism/RUNBOOK.md`. It does not change this lifecycle protocol, publish directly into `results/**`, or make Agent self-report conclusion-grade.

## Operator Duties

- Prepare separate `baseline` and `harness` run directories.
- Start and stop the external observer outside the measured agent prompt.
- Inject only the stage prompt that belongs to the current measured stage.
- Keep hidden quality probes and recovery answer keys outside the measured
  prompt and run directory scaffold.
- Record any out-of-protocol intervention separately.
- Publish no numbers unless both paths pass the same product quality bar.

## Formal Run Boundary

For `harness` mode, the measured agent should maintain only:

- product source/tests/docs needed by the scenario;
- `project_context/**` facts needed for fresh-agent recovery;
- ordinary commits that make handoff state clean.

Do not require lifecycle phase state, `plan.yaml`, stage skills, phase gates,
PRD/UX/architecture/implementation/review/test/release/RFC document chains, or
old task ledger behavior. If a run depends on those, mark it calibration and
rerun.

## Stage Injection

Use `prepare` for the initial prompt. Use `stage-prompt` only when the measured
stage begins:

```sh
node examples/delivery-benchmark/runner/delivery_benchmark.mjs stage-prompt \
  --scenario "$SCENARIO" \
  --mode "$MODE" \
  --stage recovery

node examples/delivery-benchmark/runner/delivery_benchmark.mjs stage-prompt \
  --scenario "$SCENARIO" \
  --mode "$MODE" \
  --stage rfc

node examples/delivery-benchmark/runner/delivery_benchmark.mjs stage-prompt \
  --scenario "$SCENARIO" \
  --mode "$MODE" \
  --stage debug
```

Early exposure of recovery/RFC/debug materials invalidates the run.

## Measurement

Use observer elapsed time for conclusion-grade delivery cost:

```sh
node examples/delivery-benchmark/runner/delivery_benchmark.mjs observe-start \
  --run-dir "$RUN_DIR"

node examples/delivery-benchmark/runner/delivery_benchmark.mjs observe-stop \
  --run-dir "$RUN_DIR"
```

Use `timer-start` / `timer-stop` only for operator-labeled phase or gate
breakdowns. These are diagnostic unless the boundary is independently
recoverable from saved evidence.

The score report may also include workflow overhead ratio, artifact inventory /
artifact count, gate true-product defect count versus hygiene issue count, and AC progress visibility.
Treat them as diagnostic fields for overhead analysis, not as conclusion-grade
efficiency or product-quality evidence.

## Quality And Recovery

Product quality should come from scenario-owned tests, smoke checks or hidden
quality probes. Context recovery scoring should use hidden answer keys plus file
references. Static keyword/path checks are supplemental only.

## Publishing

Before updating `results/benchmark-data.js`, confirm:

- both paths are fresh and independent;
- both paths pass the same quality bar;
- observer data exists for both paths;
- any intervention, prompt ledger or recovery score is clearly marked by
  confidence level;
- the conclusion is allowed to be negative, neutral or positive.

If the result is incomplete, keep it under `.artifacts/**` and do not commit it.
