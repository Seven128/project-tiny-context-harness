# Delivery Reliability Benchmark

This directory is the repo-local benchmark module for Project Tiny Context Harness.

The benchmark has been reset for **Minimal Context Harness**. Historical results
from the former stage-based workflow were removed because they answer the wrong
product question. Keep the runner and scenario skeletons; rerun fresh benchmark
pairs before drawing new conclusions.

## Current Status

- Public result data: empty.
- Visual report shell: `results/index.html`.
- Report data file: `results/benchmark-data.js`.
- Lifecycle runner: `runner/delivery_benchmark.mjs`.
- Real Codex Agent pair runner: `runner/agent_benchmark.mjs`.
- Operator-only pair plan and gold set: `agent-benchmark/**`.
- Scenario skeletons: `scenarios/**`.
- Raw artifacts: `.artifacts/delivery-benchmark/**` and not committed.

## Benchmark Purpose

The current product question is:

> Does Minimal Context Harness improve same-quality lifecycle delivery by making
> fresh-agent recovery, RFC/debug continuation and safe next action discovery
> cheaper than direct coding without reintroducing heavy stage overhead?

It is not a first-patch speed race and not a proof that any workflow is always
faster. Future reports should show where Minimal Context reaches break-even, and
where it does not.

## Diagnostic Metrics

The runner can report workflow overhead ratio, artifact inventory / artifact
count, gate true-product defect count versus hygiene issue count, and AC progress visibility.
These diagnostics explain where Harness overhead comes from; they do not make a
run publishable without the same quality bar and observer evidence.

## What Counts As Publishable

A result can enter `results/benchmark-data.js` only when all of these are true:

- Same scenario for baseline and Harness.
- Same model, configuration, prompt scope and final quality bar.
- Fresh independent run directories and fresh measured sessions.
- Staged recovery/RFC/debug prompts are not exposed early.
- External observer elapsed time is available for both paths.
- Product quality is checked by scenario-owned tests, smoke or hidden probes.
- Context recovery scoring, if used, relies on hidden answer keys and file references.
- No old stage workflow assets, phase state, task ledger, phase gates or document chain are required by the Harness path.
- The summary states which metrics are conclusion-grade and which are only diagnostic.

If any condition fails, the run is calibration only.

## Scenarios Kept For Rerun

| Scenario | Purpose |
|---|---|
| `expense-policy-engine` | Compact policy/rule engine with audit reasons and a midstream domain rename. |
| `project-context-recovery-lab` | Fresh-agent recovery and context continuity after API/UI/worker delivery. |
| `support-triage-board` | Cross-layer UI/API/policy drift during RFC/debug changes. |
| `webhook-provider-bridge` | Provider safety, HMAC/replay/idempotency and live credential boundaries. |

These scenario names are kept to avoid runner/report churn. Their old results are
not retained as current evidence.

## Minimal Run Sketch

```sh
node examples/delivery-benchmark/runner/delivery_benchmark.mjs list

node examples/delivery-benchmark/runner/delivery_benchmark.mjs prepare \
  --scenario support-triage-board \
  --mode baseline \
  --out-dir .artifacts/delivery-benchmark/<stamp>/baseline \
  --force

node examples/delivery-benchmark/runner/delivery_benchmark.mjs prepare \
  --scenario support-triage-board \
  --mode harness \
  --out-dir .artifacts/delivery-benchmark/<stamp>/harness \
  --force
```

Use `RUNBOOK.md` for the current lifecycle protocol.

## Real Codex Agent A/B

`agent-benchmark/**` adds deterministic preparation and pair validation for
experiments that must be executed in separate real Codex sessions for every
measured lifecycle stage. It locks the Harness commit, built CLI, prepared tree,
model, reasoning level, scenario, prompt,
hidden gold-set, operator-tool and operator quality-bar hashes, but it does not
run or simulate Codex.

```sh
node examples/delivery-benchmark/runner/agent_benchmark.mjs validate-assets
```

Use [`agent-benchmark/README.md`](agent-benchmark/README.md) for the exact
control/candidate preparation and external-session procedure. The gold set stays
operator-only and is never copied into a measured run directory.

## Documentation Boundary

This benchmark directory should contain only the current protocol and runnable
skeleton. Do not accumulate long pilot retrospectives here. When a new Minimal
Context pilot becomes publishable, add a compact summary to `results/**` and keep
raw material under `.artifacts/**`.
