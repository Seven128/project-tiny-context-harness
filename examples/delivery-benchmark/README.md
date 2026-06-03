# Delivery Reliability Benchmark

This benchmark tests whether AI SDLC Harness actually improves coding-agent delivery reliability, not whether it makes the first patch faster.

It compares two paths for the same small product:

- `baseline`: plain AI coding with the same requirements and final quality bar.
- `harness`: AI SDLC Harness from `init` through PRD, UX, architecture, development, review, testing, release and change handling.

The important baseline is same-quality delivery: Review-ready, Testing-ready and handoff/recovery-ready. A Harness run can be slower and still be better if it prevents omissions, rework or failed handoff. The benchmark now also tracks complex-task automation capacity: whether the same-quality result needs fewer unplanned operator interventions, fewer extra prompt characters and fewer repair loops.

## Design Rationale

This benchmark exists to test whether Harness reaches its workflow design goal:
better same-quality delivery efficiency in complex project lifecycles. It should
not be interpreted as a first-patch speed race against plain vibe coding.

In this source repository, Delivery Benchmark is a first-class benchmark module.
Its runnable implementation lives under `examples/delivery-benchmark/**`, while
the long-lived product, metric-causality and implementation facts live in:

- `.work_products/01_product/delivery_benchmark_evidence_model.md`
- `.work_products/03_tech_plan/delivery_benchmark_evidence_model.md`
- `.work_products/04_implementation/delivery_benchmark/evidence_model_and_runner.md`

The lifecycle scenarios are chosen to expose the places where Harness is
expected to help: fresh-agent recovery from durable project context, RFC/debug
work after the initial implementation, cross-layer UI/API/test drift, and
provider/live boundaries where wrong paths are expensive. The full benchmark
choice and scenario design rationale is recorded in
[ADR 008: Delivery Benchmark Scenario Design](../../.work_products/05_decisions/ADR_008_delivery_benchmark_scenario_design.md).
The publishable evidence thresholds are recorded in
[`EVIDENCE_CHECKLIST.md`](EVIDENCE_CHECKLIST.md); use them before promoting any
new pilot numbers into the visual report.

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

For the Harness path, the initial prompt is also a hard stage boundary. It asks
for a review-ready, testing-ready and handoff-ready first implementation, but it
does not authorize the measured agent to continue into `REVIEWING`, `TESTING`,
`RELEASING`, review reports, test reports or release readiness. If the agent
crosses that boundary, the path is calibration evidence only and must be rerun
from a fresh directory before it can become a formal result.

`prepare` also initializes each run directory as an independent local git
repository with a local bare `origin` under `.benchmark/remote.git`. This setup
happens before observer timing starts. It keeps Harness task commit/push gates
inside the benchmark artifact directory instead of accidentally using this
source repository or being blocked by `.artifacts` ignore rules.

For `harness` mode, `prepare` now materializes the Harness warm scaffold before
that initial commit. The measured agent starts from an already initialized
Harness repo and must not run `npx sdlc-harness init` inside the observer
window. Cold adoption/bootstrap cost can still be measured, but it belongs to a
separate `cold` run type rather than the default warm lifecycle delivery metric.

Both modes need a clean committed product state before fresh-agent recovery.
Baseline does this with one ordinary product delivery commit and push to the
run-dir local `origin`; Harness does it through its normal task
implementation/completion ledger commits. If either path enters recovery with
dirty product source/docs/tests, the attempt is calibration because the recovery
agent is reading a worktree draft rather than a stable delivery.

The same clean committed boundary applies between later mutating stages. RFC and
debug staged prompts require baseline to make an ordinary product commit/push
after product tests/smoke pass, while Harness uses its normal task commit/push
protocol. This keeps recovery, RFC and debug comparisons about durable handoff
rather than temporary worktree state.

Formal Harness pilots also require the measured-agent environment to write the
configured Harness root and the run-dir git index. If a sandbox blocks `.codex/**`
or `.git/index.lock`, or the agent falls back to another root such as `codex/**`,
the attempt is calibration only even when hidden quality passes. Fix the
execution boundary and rerun from fresh directories before publishing elapsed
time as formal Harness evidence.

`evidence-check` rejects a `warm` elapsed-time comparison when observer records
show Harness scaffold creation inside the measured window. That protects the
report from mixing one-time adoption cost with repeated delivery cost.

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
  --run-type warm \
  --estimated-vibe-handoff-minutes 90 \
  --avoided-rework-minutes 30 \
  --comparison-confidence medium \
  --markdown-report /tmp/expense-harness-report.md

node examples/delivery-benchmark/runner/delivery_benchmark.mjs evidence-check \
  --baseline-report /tmp/expense-baseline-report.json \
  --harness-report /tmp/expense-harness-report.json \
  --protocol-status formal
```

## What To Record

Record workflow control cost separately from durable deliverables.

Prefer `observe-start` / `observe-stop` for new runs. The observer runs outside the agent prompt and records elapsed time plus file create/modify/delete activity under the run directory. This keeps the measured path invisible to the agent under test, avoiding the baseline distortion that would come from asking a plain coding agent to maintain its own operation log.

The benchmark operator owns observer, timer, intervention and gate-value
records. The measured agent should not be asked to maintain benchmark timing or
gate-value logs. Use `timer-start` / `timer-stop` only when the external
observer cannot be used, or when the operator is labeling a stage/gate boundary
outside the measured prompt. Use manual `record --minutes` only for legacy data
or small events that were not timed.

Cost confidence levels:

- `observe-start` / `observe-stop`: high confidence for elapsed time and file activity, because the measurement is external to the agent prompt. It still does not explain intent by itself.
- Manual `record --minutes`: low confidence, because the value is an agent-recorded estimate.
- `timer-start` / `timer-stop`: medium confidence, because elapsed time is system-timed but the start/stop boundary is still manually labeled.
- Heavy telemetry is intentionally out of scope for this benchmark runner.

Metric confidence is reported per metric, not per run:

- `high`: external observer elapsed time, hidden black-box quality probes, or saved prompt-size counts.
- `medium`: system-timed/manual-boundary events, operator intervention records, or recovery scoring against a hidden answer key with file references.
- `low`: legacy estimates, self-reported notes, or static keyword/path rubric evidence.
- `mixed`: a displayed metric combines sources with different confidence levels.

Only high-confidence metrics are conclusion-grade in the visual report and
markdown summaries. Medium, low, mixed and unavailable metrics remain diagnostic:
they can explain where to investigate, but they cannot prove Harness efficiency,
automation burden, gate net value, context-recovery advantage or wrong-path
reduction by themselves.

`score` also records the run cost boundary and artifact inventory. Use
`--run-type cold|warm|unknown` to state whether Harness bootstrap/adoption is
inside the measured delivery window. Use `--bootstrap-minutes <n>` only when
that bootstrap cost was separately measured. The summary's `Artifact Inventory`
section is filesystem-measured and high confidence for counts, but diagnostic:
it explains whether lines came from managed runtime, `.work_products` facts,
product code/tests/docs or scaffold; it does not prove those artifacts created
value.

Run `evidence-check` on the two JSON summaries before updating committed report
data. It verifies the publishable evidence checklist mechanically where possible:
same scenario, expected modes, formal protocol status, same hidden quality,
observer elapsed time, declared cold/warm boundary and artifact inventory
availability. The command also names which design-purpose evidence is still
missing, such as high-confidence context recovery, automation burden, gate value
or provider-boundary safety.

Data source layers:

- `observer_measured`: external elapsed time and file activity.
- `system_timed_manual_boundary`: system clock duration with manual start/stop labels.
- `agent_recorded_estimate`: legacy agent-entered minutes.
- `self_reported`: semantic notes from the agent or operator, used only as context.

Observer logs are not quality evidence. The scorer ignores `.benchmark/observations.ndjson` and observer state files when evaluating product acceptance; quality still comes from source files, tests, docs and Harness deliverables.

Static rubrics are supplemental evidence. They are useful for checking delivered
files, docs and handoff material, but a keyword/path match is not a high-confidence
semantic proof. When a scenario-owned hidden quality probe is available, `score`
uses that probe as the primary quality summary and keeps the static rubric as
supplemental evidence. Future formal lifecycle pilots should run a hidden
quality probe after delivery:

```sh
node examples/delivery-benchmark/runner/delivery_benchmark.mjs quality-probe \
  --scenario project-context-recovery-lab \
  --run-dir /tmp/context-recovery-harness \
  --out /tmp/context-recovery-harness/.benchmark/quality-probe.json
```

Fresh-agent recovery should be scored from a natural takeover memo rather than a
visible checklist of answers. The answer key stays in the scenario directory and
is not copied into `.benchmark/prompt.md`, `.benchmark/scenario.md` or staged
prompts:

```sh
node examples/delivery-benchmark/runner/delivery_benchmark.mjs recovery-score \
  --scenario project-context-recovery-lab \
  --run-dir /tmp/context-recovery-harness \
  --answer /tmp/context-recovery-harness/takeover-answer.md \
  --out /tmp/context-recovery-harness/.benchmark/recovery-score.json
```

## Automation Burden and Gate Value

Automation burden records only out-of-protocol operator help after the benchmark
prompt has already been injected. Initial prompts and staged recovery/RFC/debug
prompts are part of the protocol and do not count as intervention. Corrections,
rework prompts, clarifications, nudges and safety stops do count:

```sh
node examples/delivery-benchmark/runner/delivery_benchmark.mjs intervention-record \
  --run-dir /tmp/support-harness \
  --stage RFC \
  --severity correction \
  --prompt-file /tmp/operator-correction.md \
  --reason "first-pass checklist found API/UI drift"
```

The runner stores intervention severity in `.benchmark/interventions.ndjson` and
also records prompt fingerprints in `.benchmark/prompts.ndjson`. `prepare`
records the initial protocol prompt automatically; `stage-prompt --run-dir`
records staged protocol prompts; `intervention-record` records the out-of-protocol
operator prompt in both files. `prompt_chars` is the primary metric because
Chinese/English mixed word counts are unstable; `prompt_words` is secondary.
The ledger makes character counts and hashes high-confidence for saved prompt
text, but it does not by itself prove that no unrecorded operator prompt was
sent.

```sh
node examples/delivery-benchmark/runner/delivery_benchmark.mjs stage-prompt \
  --scenario support-triage-board \
  --mode harness \
  --stage rfc \
  --run-dir /tmp/support-harness

node examples/delivery-benchmark/runner/delivery_benchmark.mjs prompt-record \
  --run-dir /tmp/support-harness \
  --stage RFC \
  --prompt-kind operator_note \
  --prompt-file /tmp/operator-note.md \
  --reason "first-pass score saved before correction"
```

Gate value is a falsifiable cost hypothesis. A gate is justified only if it
helps catch defects, reduce repair loops, reduce operator correction or prevent
escaped defects. Operator-side timing with `timer-start` explains cost;
`gate-record` explains whether the gate created quality value:

```sh
node examples/delivery-benchmark/runner/delivery_benchmark.mjs gate-record \
  --run-dir /tmp/support-harness \
  --event gate:npm-test \
  --stage RFC \
  --gate-type product \
  --defects-caught 2 \
  --defect-ids API-SORT,UI-STALE \
  --would-escape true
```

The next recommended formal pilot is `support-triage-board` because it is the
best fit for gate-value validation: API, UI, priority policy, tests and docs can
drift independently. The protocol should run a first-pass score before manual
repair; if the first pass fails, the operator injects only the failed checklist,
records the prompt with `intervention-record`, records gate findings with
`gate-record`, then times the repair loop. This measures whether Harness gates
reduce partial fixes and human correction, not just whether they add elapsed
time.

The first formal support gate-value pilot reached the same hidden product quality
on both paths (`12/12 PASS`) but showed a negative elapsed-time result for
Harness: `26.9158 min` baseline vs `48.4984 min` Harness. Gate findings from
that run are useful diagnostics, but they are operator-recorded and do not prove
gate net value. That result should drive gate/workflow thinning analysis before
the benchmark tries to recover the story only by choosing more favorable complex
scenarios.

Gate thinning is tracked in
[`GATE_THINNING_ANALYSIS.md`](GATE_THINNING_ANALYSIS.md). It lists candidate
thin/conditional/boundary-only profiles plus the expected benefits and
risks/losses. Current recommendation is `Standard Thin`: keep focused product
quality gates, move workflow strict gates to task completion / pre-commit /
phase transition / release / package-source boundaries, and keep strict gates
for high-risk provider/live work. This recommendation has been adopted into the
common Harness guidance; it changes gate frequency and scope, not the
same-quality bar.

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

- `stage-prompt --stage recovery`: fresh-agent takeover memo task.
- `stage-prompt --stage rfc`: staged RFC cascade only.
- `stage-prompt --stage debug`: staged debug fix only.

If either measured path sees later-stage materials early, the run is useful only
as protocol calibration and must not be promoted into the public visual report.

The lifecycle scenarios are designed for the second layer:

- `project-context-recovery-lab` measures whether a fresh agent can recover current state, history, constraints, test entrypoints and the next safe action.
- `support-triage-board` measures whether API, UI, policy, tests and docs stay aligned through RFC/debug churn instead of producing partial fixes.
- `webhook-provider-bridge` measures whether high-risk provider boundaries preserve do-not-retry constraints, avoid credential guessing and keep local/mock/live evidence separate. Its hidden quality probe now uses a visible `src/webhookBridge.js#createWebhookBridge()` smoke contract and independently computed HMAC signatures to test provider-safety behavior instead of relying on README keywords.

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

Each formal pilot attempt should leave a compact calibration ledger. Record why
any rerun happened, which attempt was invalidated, whether observer/timer
coverage stayed clean, whether staged materials leaked, whether operator
artifacts polluted the product git surface, and which gates caught concrete
defects. This ledger is how repeated pilot experience becomes benchmark
protocol, not oral memory.

The 2026-06-03 `webhook-provider-bridge` pilot attempt is such a calibration
case: both paths passed the hidden provider-safety probe on initial delivery, but
the Harness measured-agent sandbox could not write `.codex/**` or
`.git/index.lock`, so it fell back to `codex/**` and did not complete the run-dir
commit/push protocol. Those numbers are useful for probe and environment
calibration, not public efficiency conclusions.

The subsequent webhook rerun exposed the symmetric baseline issue: baseline
initial delivery reached local test quality, but it had not committed/pushed the
product source before recovery. That recovery memo was useful for protocol
calibration, but the pair still cannot be public evidence until both paths hand
off clean committed product states.

For a user-facing view of completed runs, open `results/index.html`. The visual report supports English/Chinese switching, defaults from the browser language, and uses committed summary data only; raw artifacts remain outside git.
