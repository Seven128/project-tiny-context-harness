# Delivery Reliability Benchmark

This benchmark tests whether AI SDLC Harness actually improves coding-agent delivery reliability, not whether it makes the first patch faster.

It compares two paths for the same small product:

- `baseline`: plain AI coding with the same requirements and final quality bar.
- `harness`: AI SDLC Harness from `init` through PRD, UX, architecture, development, review, testing, release and change handling.

The important baseline is same-quality delivery: Review-ready, Testing-ready and handoff/recovery-ready. A Harness run can be slower and still be better if it prevents omissions, rework or failed handoff.

## Design Rationale

This benchmark exists to test whether Harness reaches its workflow design goal:
better same-quality delivery efficiency in complex project lifecycles. It should
not be interpreted as a first-patch speed race against plain vibe coding.

The lifecycle scenarios are chosen to expose the places where Harness is
expected to help: fresh-agent recovery from durable project context, RFC/debug
work after the initial implementation, cross-layer UI/API/test drift, and
provider/live boundaries where wrong paths are expensive. The full benchmark
choice and scenario design rationale is recorded in
[ADR 008: Delivery Benchmark Scenario Design](../../.work_products/05_decisions/ADR_008_delivery_benchmark_scenario_design.md).

## High-Signal, Not Hacked

The benchmark deliberately chooses high-signal projects where Harness should have
room to show its strengths: context recovery, RFC/debug rework, cross-layer
drift control and provider-boundary safety. That is fair benchmark design, not a
license to distort results.

Formal results must come from independent, fresh baseline and Harness runs with
the same model/configuration, the same final rubric and the same observer
protocol. A run becomes calibration-only if it reuses prior implementation
context, copies the other path's finished work, pre-applies RFC/debug changes,
uses a non-fresh measured session or selectively publishes only favorable
numbers. High-signal scenarios may expose Harness advantages, but they must also
allow results where Harness is slower, shows no advantage or only helps under a
specific complexity threshold.

## Scenarios

| Scenario | Shape | Main Risk Covered |
|---|---|---|
| `expense-policy-engine` | CLI/library policy engine | Acceptance criteria, RFC impact, audit trail, fresh-session recovery |
| `project-context-recovery-lab` | Incident Ops Console | Fresh-agent recovery, multi-RFC cascade, debug fix, context continuity |
| `support-triage-board` | Support SLA Escalation Desk | Cross-layer RFC changes, UI/API drift, debug fix efficiency |
| `webhook-provider-bridge` | Webhook Provider Safety Bridge | Credential blocker, replay/signature safety, do-not-retry, evidence boundaries |

## Runner

The runner is repo-local on purpose. It is not a public `sdlc-harness` command yet.

In this repository, you can simply tell the Agent: `跑工作流 benchmark`. The default should be `expense-policy-engine`, with both `baseline` and `harness` runs prepared under `.artifacts/delivery-benchmark/<timestamp>/`.

For lifecycle benchmark calibration, use the operator protocol in
[`RUNBOOK.md`](RUNBOOK.md). The first recommended pilot is
`project-context-recovery-lab`, because it directly exercises fresh-agent
recovery, context continuity, RFC churn and debug repair after initial delivery.
Pilot output is calibration evidence by default; update `results/benchmark-data.js`
only after both `baseline` and `harness` complete the same scenario against the
same quality rubric in a clean independent run.

Lifecycle scenarios use staged injection for formal runs. `prepare` writes only
the initial delivery prompt. The operator injects recovery, RFC and debug
materials later with `stage-prompt`, so the measured agent cannot optimize the
initial implementation after seeing future probes.

```sh
node examples/delivery-benchmark/runner/delivery_benchmark.mjs list

node examples/delivery-benchmark/runner/delivery_benchmark.mjs prepare \
  --scenario expense-policy-engine \
  --mode harness \
  --out-dir /tmp/expense-harness \
  --force

node examples/delivery-benchmark/runner/delivery_benchmark.mjs stage-prompt \
  --scenario project-context-recovery-lab \
  --mode harness \
  --stage recovery

node examples/delivery-benchmark/runner/delivery_benchmark.mjs observe-start \
  --run-dir /tmp/expense-harness

node examples/delivery-benchmark/runner/delivery_benchmark.mjs observe-stop \
  --run-dir /tmp/expense-harness

node examples/delivery-benchmark/runner/delivery_benchmark.mjs timer-start \
  --run-dir /tmp/expense-harness \
  --event implementation \
  --kind coding \
  --phase SPRINTING

node examples/delivery-benchmark/runner/delivery_benchmark.mjs timer-stop \
  --run-dir /tmp/expense-harness \
  --notes "implementation block complete"

node examples/delivery-benchmark/runner/delivery_benchmark.mjs record \
  --run-dir /tmp/expense-harness \
  --event sync \
  --kind workflow_control \
  --minutes 3 \
  --notes "upgrade/sync overhead"

node examples/delivery-benchmark/runner/delivery_benchmark.mjs score \
  --scenario expense-policy-engine \
  --mode harness \
  --run-dir /tmp/expense-harness \
  --estimated-vibe-handoff-minutes 90 \
  --avoided-rework-minutes 30 \
  --comparison-confidence medium \
  --markdown-report /tmp/expense-harness-report.md
```

## What To Record

Record workflow control cost separately from durable deliverables.

Prefer `observe-start` / `observe-stop` for new runs. The observer runs outside the agent prompt and records elapsed time plus file create/modify/delete activity under the run directory. This keeps the measured path invisible to the agent under test, avoiding the baseline distortion that would come from asking a plain coding agent to maintain its own operation log.

Use `timer-start` / `timer-stop` only when the external observer cannot be used. Use manual `record --minutes` only for legacy data or small events that were not timed.

Cost confidence levels:

- `observe-start` / `observe-stop`: high confidence for elapsed time and file activity, because the measurement is external to the agent prompt. It still does not explain intent by itself.
- Manual `record --minutes`: low confidence, because the value is an agent-recorded estimate.
- `timer-start` / `timer-stop`: medium confidence, because elapsed time is system-timed but the start/stop boundary is still manually labeled.
- Heavy telemetry is intentionally out of scope for this benchmark runner.

Data source layers:

- `observer_measured`: external elapsed time and file activity.
- `system_timed_manual_boundary`: system clock duration with manual start/stop labels.
- `agent_recorded_estimate`: legacy agent-entered minutes.
- `self_reported`: semantic notes from the agent or operator, used only as context.

Observer logs are not quality evidence. The scorer ignores `.benchmark/observations.ndjson` and observer state files when evaluating product acceptance; quality still comes from source files, tests, docs and Harness deliverables.

## Gate Profile and Fast Path

Lifecycle scenarios include a `gate_profile.md` so both paths know which gates
are relevant to the scenario. The fast path is a timing and scope boundary: it
keeps orientation light, runs domain-focused product gates for the current
scenario, and reserves Harness gates for task or phase boundaries.

This does not lower the same-quality bar. It prevents unrelated package checks,
source sync/check, workspace full regression or consumer-lab validation from
being counted as scenario delivery cost unless package source or managed assets
actually changed.

When timing gates, use `phase GATE` or an event name beginning with `gate:`. Use
`kind workflow_control` for Harness workflow gates and `kind test` for product
verification gates. `score` reports these events in `Gate Cost Breakdown` so the
pilot can explain where time was spent.

## Lifecycle Efficiency Probe

The benchmark has two layers:

- Initial delivery: can both paths reach the same final quality bar for a fixed project?
- Lifecycle efficiency: after the first delivery, can the path recover context, absorb RFCs, fix bugs and finish with less total lifecycle cost?

For a formal lifecycle run, the initial `.benchmark/prompt.md` must not include
future recovery, RFC or debug probe details. Those materials are injected only at
their measured stage:

- `stage-prompt --stage recovery`: fresh-agent checkpoint and recovery quiz.
- `stage-prompt --stage rfc`: staged RFC cascade only.
- `stage-prompt --stage debug`: staged debug fix only.

If either measured path sees later-stage materials early, the run is useful only
as protocol calibration and must not be promoted into the public visual report.

The three pending scenarios are designed for the second layer:

- `project-context-recovery-lab` measures whether a fresh agent can recover current state, history, constraints, test entrypoints and the next safe action.
- `support-triage-board` measures whether API, UI, policy, tests and docs stay aligned through RFC/debug churn instead of producing partial fixes.
- `webhook-provider-bridge` measures whether high-risk provider boundaries preserve do-not-retry constraints, avoid credential guessing and keep local/mock/live evidence separate.

After initial delivery, start a fresh agent/session and ask it to recover from committed source, docs and Harness deliverables. Score the recovery answer, then continue through RFC and debug work.

Use these event phases when recording semantic events or system-timed boundaries:

- `INITIAL_DELIVERY`: first implementation against base requirements.
- `RECOVERY`: fresh-agent orientation and next-safe-action recovery.
- `RFC`: multi-step RFC cascade implementation and verification.
- `DEBUG`: post-RFC bug diagnosis and fix.

`score` can also accept explicit lifecycle metrics:

- `--initial-delivery-minutes <n>`
- `--recovery-orientation-minutes <n>`
- `--rfc-fix-minutes <n>`
- `--debug-fix-minutes <n>`
- `--context-recovery-score <n>` and `--context-recovery-total <n>`
- `--wrong-path-count <n>`

```sh
node examples/delivery-benchmark/runner/delivery_benchmark.mjs score \
  --scenario project-context-recovery-lab \
  --mode harness \
  --run-dir /tmp/context-recovery-harness \
  --initial-delivery-minutes 60 \
  --recovery-orientation-minutes 8 \
  --rfc-fix-minutes 24 \
  --debug-fix-minutes 12 \
  --context-recovery-score 5 \
  --context-recovery-total 6 \
  --wrong-path-count 1
```

These metrics are intentionally separate from the quality rubric. They help answer whether Harness is only slower on first delivery or whether it wins back time when context recovery, RFC churn and debugging become important.

Counts as workflow control cost:

- Reading lifecycle/plan to find status.
- Running or fixing `sync`, `upgrade`, `transition.py`, `validate-*`, overview/source drift.
- Filling workflow fields only to satisfy schema.
- Re-reading long workflow instructions to recover the next action.

Does not count as workflow control cost:

- PRD, UX, architecture, test cases, implementation docs and release notes that help later review/testing/recovery.
- Coding, tests, review, release smoke and real product debugging.

## Result Policy

Commit only representative summaries under `results/`. Raw transcripts, temporary generated projects and large run artifacts should stay outside git, for example under `.artifacts/delivery-benchmark/` or `/tmp`.

Do not prefill success numbers. The public comparison table should use actual scored runs only.
Calibration runs can be documented as protocol evidence, but their numbers must
not be promoted into the visual report as efficiency proof.

For a user-facing view of completed runs, open `results/index.html`. The visual report supports English/Chinese switching, defaults from the browser language, and uses committed summary data only; raw artifacts remain outside git.
