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

Benchmark scenarios may be high-signal by design: they should target the places
where Harness is meant to help, such as context recovery, RFC/debug churn,
cross-layer drift and provider-boundary safety. This must not become result
hacking. The protocol must leave room for honest outcomes where Harness is
slower, shows no advantage or only helps at higher complexity.

## Isolation Rules

- Run both `baseline` and `harness` for the same scenario, model, reasoning
  setting and final quality bar.
- Prepare separate run directories before starting the measured work. `prepare`
  creates each run directory as an independent local git repository with a local
  bare `origin` under `.benchmark/remote.git`; setup time happens before
  observer start and is not counted as delivery cost.
- For `harness` mode, `prepare` also materializes the Harness warm scaffold
  (`.codex/**`, managed tools, `AGENTS.md`, `Makefile` and `.work_products/**`)
  before the initial scaffold commit. The measured agent must not run
  `npx sdlc-harness init` inside the observer window. Cold adoption/bootstrap
  cost is a separate run type, not the default lifecycle delivery metric.
- Start each measured path in a fresh agent/thread. The agent under test should
  receive only the run directory and `.benchmark/prompt.md`.
- Do not tell the measured agent that an external observer or timer is running.
- Do not ask the measured agent to run benchmark observer, timer,
  `intervention-record` or `gate-record` commands. The operator records those
  outside the measured prompt. The agent may report gate command names/results
  in ordinary handoff docs so the operator can label them.
- Do not ask `baseline` to write `.benchmark/transcript.md`, an operation log or
  any benchmark-only self-log.
- Keep raw artifacts under
  `.artifacts/delivery-benchmark/<timestamp>-context-recovery-pilot/`; do not
  commit raw transcripts, temporary projects or observer logs.
- Observer logs and benchmark internals are not quality evidence. Score product
  source, tests, README/docs and Harness deliverables only.

## Staged Injection

Formal lifecycle runs must prevent future probe leakage. `prepare` writes only
the initial delivery prompt to `.benchmark/prompt.md`; it does not expose the
fresh-agent recovery checkpoint, RFC cascade, debug fix or lifecycle scoring
notes to the measured agent.

Inject later materials only when that measured stage begins:

```sh
node examples/delivery-benchmark/runner/delivery_benchmark.mjs stage-prompt \
  --scenario "$SCENARIO" \
  --mode baseline \
  --stage recovery

node examples/delivery-benchmark/runner/delivery_benchmark.mjs stage-prompt \
  --scenario "$SCENARIO" \
  --mode baseline \
  --stage rfc

node examples/delivery-benchmark/runner/delivery_benchmark.mjs stage-prompt \
  --scenario "$SCENARIO" \
  --mode baseline \
  --stage debug
```

Repeat with `--mode harness` for the Harness path. The operator may paste the
command output into the measured fresh agent/thread, but should not paste future
materials early.

## Formal Result Invalidation Rules

Mark the run as protocol calibration only, and do not publish its numbers in the
visual report, if any of these happen:

- Either path is not started from a fresh independent agent/thread.
- The measured agent receives the other path's source, summary, transcript or
  implementation decisions before finishing the comparable phase.
- Source, tests or README/docs are copied from the other completed path.
- RFC or debug work is pre-applied before the timed RFC/DEBUG phase begins.
- Recovery, RFC, debug or lifecycle probe materials are exposed before their
  staged injection point.
- Observer coverage is interrupted and the run is stitched together in a way
  that changes the measured work boundary.
- A run is scored as `warm` but observer data shows Harness scaffold creation
  inside the measured window, such as added `.codex/**`, `AGENTS.md`, `Makefile`
  or managed `tools/**` files. This means bootstrap cost leaked into delivery
  timing and the elapsed comparison is not formal evidence.
- The benchmark operator selectively publishes only favorable phase numbers
  instead of the full same-quality baseline/Harness comparison.
- Either path fails the same final quality rubric or uses a different
  model/configuration, prompt scope, gate profile or observer protocol.
- Harness cannot complete its task commit/push protocol because the run
  directory was not prepared as an independent git repository with a local
  remote.
- Either path enters `RECOVERY`, `RFC` or `DEBUG` with uncommitted product
  source/docs/test changes from the previous stage. Baseline should use one
  product delivery commit/push at `INITIAL_DELIVERY`; Harness should use its
  normal task implementation and completion ledger commits.

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

After `prepare`, each run dir has its own `main` branch and local `origin`.
This lets Harness task implementation commits, task completion ledger commits
and push checks stay inside the raw artifact directory instead of targeting this
source repository. The `.benchmark/` directory and local bare remote are ignored
by the run-dir git repo.

## Measured Agent Environment Preflight

Before starting observer timing, verify that the measured agent environment can
write the configured Harness root and the run-dir git index. This is a formal
protocol requirement, not a product quality preference.

A formal warm Harness path must start with the prepared `.codex/**`, managed
tools, `AGENTS.md`, `Makefile` and `.work_products/**` already present and
committed before observer timing starts. It must still be able to update them
when normal workflow delivery requires it.

A formal Harness path must be able to:

- update the configured Harness root, usually `.codex/**`, inside the run
  directory;
- create and update `.work_products/**`, `tools/**`, `AGENTS.md`, `Makefile` and
  product source/test/docs as required by the prompt;
- write `.git/index.lock`, create task implementation and task completion ledger
  commits, and push those commits to the local `.benchmark/remote.git` origin;
- keep all of that work inside the prepared run directory, not in this source
  repository and not in a fallback untracked root.

If a measured-agent sandbox blocks hidden dot paths such as `.codex/**`, blocks
`.git/index.lock`, or causes the agent to fall back to a different Harness root
such as `codex/**`, the run is calibration only. Hidden quality probe results
from that attempt can still improve the probe and protocol, but the elapsed-time
numbers must not be promoted as formal Harness efficiency evidence.

For measured `codex exec` pilots, run the benchmark in an environment whose
sandbox policy explicitly permits writes to the prepared run directory's dot
paths and local git repo. If that is not available, use the attempt to calibrate
the execution boundary first, then rerun from fresh directories before claiming
formal results.

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
   implementation is ready for the recovery checkpoint. This prompt intentionally
   excludes future recovery, RFC and debug materials. For the Harness path,
   `INITIAL_DELIVERY` is a hard stage boundary: it may create normal development
   and task-completion commits required by the local Harness protocol, but it
   must not run `npx sdlc-harness init`, and it must not continue into
   `REVIEWING`, `TESTING`, `RELEASING`, review reports, test reports or release
   readiness. If a measured agent crosses that boundary,
   mark that path as calibration and rerun from a fresh directory.

   For the baseline path, the same hard boundary is represented by a single
   product delivery commit and push to the run directory's local `origin`. This
   is not a Harness validator or lifecycle gate; it only ensures the later
   fresh-agent recovery stage inspects a clean committed product state instead
   of an operator or model worktree draft. If `git status --short` is not clean
   for product files after `INITIAL_DELIVERY`, mark the attempt as calibration
   and rerun from a fresh directory.

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

3. Start a new fresh agent/thread for Fresh-Agent Recovery. Inject only the
   recovery stage prompt, ask it to inspect the repository and write a takeover
   memo before making changes. The prompt must not contain the hidden answer key;
   score the memo after the stage with `recovery-score`.

```sh
node examples/delivery-benchmark/runner/delivery_benchmark.mjs stage-prompt \
  --scenario "$SCENARIO" \
  --mode "<baseline|harness>" \
  --stage recovery
```

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

```sh
node examples/delivery-benchmark/runner/delivery_benchmark.mjs recovery-score \
  --scenario "$SCENARIO" \
  --run-dir "$RUN_DIR" \
  --answer "$RUN_DIR/takeover-answer.md" \
  --out "$RUN_DIR/.benchmark/recovery-score.json"
```

4. Inject the RFC stage prompt and apply that cascade in sequence. Use phase
   `RFC` for the whole cascade unless the pilot explicitly needs per-RFC labels.
   This is a mutating stage: after product tests/smoke pass, baseline must create
   one ordinary product commit and push `main` to the local `origin`; Harness
   must use its normal task commit/push protocol. Do not enter `DEBUG` with dirty
   product source/docs/tests.

```sh
node examples/delivery-benchmark/runner/delivery_benchmark.mjs stage-prompt \
  --scenario "$SCENARIO" \
  --mode "<baseline|harness>" \
  --stage rfc
```

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

5. Inject the Debug Fix stage prompt. For `project-context-recovery-lab`, the
   default debug condition is that old provider event names must be rejected
   after RFC 2. If the implementation already behaves correctly, require a
   regression test proving the boundary.
   This is also a mutating stage; finish with a clean committed product state
   before final scoring.

```sh
node examples/delivery-benchmark/runner/delivery_benchmark.mjs stage-prompt \
  --scenario "$SCENARIO" \
  --mode "<baseline|harness>" \
  --stage debug
```

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

7. Run the scenario-owned hidden quality probe when one exists. The probe stays
   in the committed scenario directory; do not paste it into the measured agent
   prompt or copy it into the run directory before delivery.

```sh
node examples/delivery-benchmark/runner/delivery_benchmark.mjs quality-probe \
  --scenario "$SCENARIO" \
  --run-dir "$RUN_DIR" \
  --out "$RUN_DIR/.benchmark/quality-probe.json"
```

8. For pilots that measure automation burden, record only unplanned operator
   help after the relevant benchmark prompt is already injected. Initial
   `.benchmark/prompt.md` and `stage-prompt` output do not count. `prepare`
   records the initial prompt in `.benchmark/prompts.ndjson`; pass `--run-dir`
   to `stage-prompt` so staged protocol prompts are also recorded. This ledger
   gives high-confidence hashes and character counts for saved prompt text, but
   semantic intervention severity still comes from `intervention-record`.

```sh
node examples/delivery-benchmark/runner/delivery_benchmark.mjs stage-prompt \
  --scenario "$SCENARIO" \
  --mode "$MODE" \
  --stage rfc \
  --run-dir "$RUN_DIR"

node examples/delivery-benchmark/runner/delivery_benchmark.mjs intervention-record \
  --run-dir "$RUN_DIR" \
  --stage RFC \
  --severity correction \
  --prompt-file /tmp/operator-correction.md \
  --reason "first-pass checklist found API/UI drift" \
  --notes "planned benchmark prompts are excluded"
```

Use `prompt-record` only for operator notes or saved prompts that should be in
the prompt ledger but should not be counted as an intervention:

```sh
node examples/delivery-benchmark/runner/delivery_benchmark.mjs prompt-record \
  --run-dir "$RUN_DIR" \
  --stage RFC \
  --prompt-kind operator_note \
  --prompt-file /tmp/operator-note.md \
  --reason "first-pass score saved before correction"
```

9. For pilots that measure gate value, record whether a gate caught defects. The
   operator uses `timer-start` / `timer-stop` for gate cost and `gate-record` for
   gate value; the measured agent should not maintain these benchmark records.

```sh
node examples/delivery-benchmark/runner/delivery_benchmark.mjs gate-record \
  --run-dir "$RUN_DIR" \
  --event gate:npm-test \
  --stage RFC \
  --gate-type product \
  --defects-caught 2 \
  --defect-ids API-SORT,UI-STALE \
  --would-escape true \
  --notes "product gate caught cross-layer drift"
```

## Gate Timing Protocol

Use the scenario `Gate Profile` to decide which gates are relevant. Fast path
means running the smallest gate that proves the current boundary; it does not
mean lowering the quality bar.

- Orientation should read prompt/scenario/repo/docs/tests and should not run
  heavy validation.
- Domain gates, such as project-local `npm test` or scenario smoke tests, count
  as product delivery gates. The operator times them with `kind test`.
- Harness gates, such as `make validate-plan`, `make validate-dev`,
  `transition.py`, overview freshness or source drift checks, count as workflow
  control gates. The operator times them with `kind workflow_control`.
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

## Support Gate-Value Pilot Protocol

Use `support-triage-board` for the first gate-value pilot. It is the best current
scenario for testing whether gates catch partial fixes across API, UI, priority
policy, tests and docs.

Run both modes with staged injection and the same observer protocol. When a mode
claims a stage is complete, do a first-pass score before manual repair. If the
first pass fails:

- Do not immediately patch the project by hand.
- Inject only the failed checklist or precise correction prompt.
- Record that extra prompt with `intervention-record`.
- Record any gate that caught defects with `gate-record`.
- Time the repair loop with the normal timer phases.

The support pilot should answer whether Harness gates reduce first-pass misses,
operator prompt characters, repair loops and final escaped defects. It is allowed
for the answer to be "no"; benchmark data should then motivate a separate
workflow iteration, not a selective report.

## Pilot Calibration Ledger

Keep a short calibration ledger for every formal pilot attempt. The ledger is not
a transcript and should not contain full raw logs; it records protocol decisions
that change whether a run is publishable, comparable or only useful as
calibration evidence. Add it to the markdown summary or operator notes before
updating any public report.

For the 2026-06-02 `support-triage-board` gate-value pilot, the reusable lessons
were:

- Stage boundary failures are protocol failures. An early Harness attempt crossed
  from `INITIAL_DELIVERY` into later lifecycle work, so its numbers were treated
  as calibration only. The prompt was tightened so initial delivery stops at
  review-ready/testing-ready/handoff-ready implementation.
- Operator evidence must stay off the product git surface. A recovery memo left
  at the repository root made the next RFC attempt dirty; the attempt was
  reclassified as `CALIBRATION`, the memo was moved under `.benchmark/`, and the
  RFC stage was rerun cleanly.
- Infrastructure instability must be named, not hidden. Stream reconnects were
  observed during RFC execution; because the run recovered and completed, the
  completed stage stayed measured, but any exhausted reconnect or abandoned
  partial patch would have been calibration/blocker evidence.
- Hidden quality probes are the primary quality evidence when available. Both
  baseline and Harness reached hidden-probe `12/12 PASS`; static keyword/path
  rubric `17/18 WARN` stayed supplemental and must not override the stronger
  probe result.
- Gate value needs defect records, not vibes. Harness `validate-dev` caught
  task/draft state, handoff-entrypoint, implementation-doc and browser-evidence
  gaps before commit; those were recorded with `gate-record` so gate value is
  distinguishable from gate cost.
- Negative or mixed results are still results. In this pilot Harness reached the
  same hidden quality bar but took materially longer overall; that must be used
  as workflow iteration evidence, not softened into an efficiency claim.
- The formal `support-triage-board` pilot made the gate question concrete:
  hidden product quality was tied at `12/12 PASS`, while observer elapsed time
  was `26.9158 min` baseline vs `48.4984 min` Harness. Treat this as a
  conclusion-grade negative efficiency signal and use the operator-recorded gate
  findings only as diagnostic input for gate thinning.

For the 2026-06-03 `webhook-provider-bridge` provider-safety pilot attempt, the
reusable lessons were:

- Hidden provider-safety probes can be high confidence without making the whole
  pair publishable. Baseline initial delivery passed hidden quality `13/13` with
  observer elapsed `9.0518 min`; Harness initial delivery also passed hidden
  quality `13/13` with observer elapsed `22.939 min`.
- Recovery scoring should be fair to both README-first and `.work_products`-first
  handoffs. The recovery answer key now supports alternative term groups and
  reference groups, and both paths scored `4/4 PASS` after that correction.
- The attempt is still calibration, not formal evidence. The measured Harness
  `codex exec` sandbox could not create `.codex/**` and could not write
  `.git/index.lock`, so the agent fell back to `codex/**` and did not complete
  the run-dir task commit/push protocol.
- This means the data is useful for probe and environment calibration, but it
  does not close the provider-safety lifecycle benchmark. A formal rerun must
  start from fresh directories in an environment that permits `.codex/**` and
  run-dir `.git/**` writes.
- A later 2026-06-03 rerun exposed the matching baseline boundary: baseline
  initial delivery passed local tests and recovery scored `4/4`, but the product
  source/tests/docs were still uncommitted when the fresh recovery agent started.
  That attempt is calibration because recovery was inspecting a dirty worktree,
  not a clean committed delivery. Baseline initial prompts now require one
  product delivery commit/push before recovery.

When rerunning a pilot, do not delete these lessons. Use them to decide whether
the next failure is a new benchmark finding or a repeated protocol issue that
should be fixed before another measured run.

## Metric Confidence

Do not treat every benchmark number as equally objective.

- External observer elapsed time is high confidence for elapsed time, but it
  does not prove why time was spent.
- Static rubric scoring is supplemental evidence. It can catch missing files or
  terms, but it can also over-credit shallow keyword matches.
- Hidden quality probes are stronger product-quality evidence because the agent
  does not see them during delivery.
- Fresh-agent recovery is scored from a takeover memo against a hidden answer
  key. Require file references for each claim; without hidden scoring, mark the
  recovery score as operator-recorded medium confidence at best.
- Human intervention and gate-value metrics are medium confidence when recorded
  by the operator with `intervention-record` and `gate-record`; they should stay
  unavailable until explicitly recorded.
- Only high-confidence metrics are conclusion-grade. Medium, low, mixed and
  unavailable metrics remain diagnostic and must not be used to prove Harness
  efficiency, gate net value, automation burden, context-recovery advantage or
  wrong-path reduction.
- Gate thinning analysis is tracked in
  [`GATE_THINNING_ANALYSIS.md`](GATE_THINNING_ANALYSIS.md). It is a decision
  memo, not a change to default Harness gate behavior. The current recommendation
  is `Standard Thin`: focused product gates inside the work loop, workflow strict
  gates at task/pre-commit/phase/release/package boundaries, and strict gates for
  high-risk provider/live work.

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

Write one markdown summary per mode. If `.benchmark/recovery-score.json` and
`.benchmark/quality-probe.json` exist, `score` will include them and report their
confidence separately from the static rubric. If `.benchmark/interventions.ndjson`
or `.benchmark/gate-findings.ndjson` exist, `score` will also report automation
burden and gate value. `score` also reports the run cost boundary and artifact
inventory so cold bootstrap/adoption files are not silently mixed with warm
delivery output. Pass wrong-path count from the
operator notes; only use explicit `--context-recovery-score` for legacy/manual
scoring when hidden answer-key scoring was not run:

```sh
node examples/delivery-benchmark/runner/delivery_benchmark.mjs score \
  --scenario "$SCENARIO" \
  --mode baseline \
  --run-dir "$RUN_ROOT/baseline" \
  --run-type warm \
  --wrong-path-count "<n>" \
  --json-report "$RUN_ROOT/baseline-summary.json" \
  --markdown-report "$RUN_ROOT/baseline-summary.md"

node examples/delivery-benchmark/runner/delivery_benchmark.mjs score \
  --scenario "$SCENARIO" \
  --mode harness \
  --run-dir "$RUN_ROOT/harness" \
  --run-type warm \
  --wrong-path-count "<n>" \
  --json-report "$RUN_ROOT/harness-summary.json" \
  --markdown-report "$RUN_ROOT/harness-summary.md"

node examples/delivery-benchmark/runner/delivery_benchmark.mjs evidence-check \
  --baseline-report "$RUN_ROOT/baseline-summary.json" \
  --harness-report "$RUN_ROOT/harness-summary.json" \
  --protocol-status formal \
  --out "$RUN_ROOT/evidence-check.json"
```

The summary should show lifecycle metrics for `INITIAL_DELIVERY`, `RECOVERY`,
`RFC`, `DEBUG`, context recovery score, wrong-path count, final quality and
metric confidence. It should also show `Artifact Inventory` by category:
`managed_runtime`, `project_facts`, `product_source_tests`, `product_docs`,
`scaffold`, `raw_artifacts` and `other`. Treat those counts as high-confidence
diagnostics, not as value proof. For support gate-value pilots, it should also show
automation burden, gate value, first-pass quality score, repair-loop count and
escaped-defect count when those records exist. Static keyword/path rubric
evidence is supplemental; hidden quality probes and hidden answer-key recovery
scoring are stronger when present.

`evidence-check` is required before public report updates. It does not replace
operator judgment about fresh sessions, staged injection or cross-path
contamination; it records that judgment through `--protocol-status` and then
checks the machine-verifiable evidence gates. If it reports
`negative_elapsed_signal`, treat that as workflow iteration input unless other
high-confidence design-purpose evidence offsets the elapsed cost.

## Publication Rule

If either mode fails to reach the same final quality bar, mark the pilot as
protocol calibration only. Do not publish partial numbers in the visual report,
and do not claim Harness is faster or more efficient from one incomplete run.

If the pilot is invalidated by the rules above, it can still be useful as
protocol evidence. Record what the run calibrated, fix the runbook or runner if
needed, then rerun cleanly before updating public results.
