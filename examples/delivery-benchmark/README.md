# Delivery Reliability Benchmark

This benchmark tests whether AI SDLC Harness actually improves coding-agent delivery reliability, not whether it makes the first patch faster.

It compares two paths for the same small product:

- `baseline`: plain AI coding with the same requirements and final quality bar.
- `harness`: AI SDLC Harness from `init` through PRD, UX, architecture, development, review, testing, release and change handling.

The important baseline is same-quality delivery: Review-ready, Testing-ready and handoff/recovery-ready. A Harness run can be slower and still be better if it prevents omissions, rework or failed handoff.

## Scenarios

| Scenario | Shape | Main Risk Covered |
|---|---|---|
| `expense-policy-engine` | CLI/library policy engine | Acceptance criteria, RFC impact, audit trail, fresh-session recovery |
| `support-triage-board` | Small API/UI workflow | UI/UX handoff, normal phase coverage, TESTING bugfix route |
| `webhook-provider-bridge` | Provider bridge with mock/live boundary | High-risk runtime, BLOCKED recovery, do-not-retry, evidence boundaries |

## Runner

The runner is repo-local on purpose. It is not a public `sdlc-harness` command yet.

In this repository, you can simply tell the Agent: `跑工作流 benchmark`. The default should be `expense-policy-engine`, with both `baseline` and `harness` runs prepared under `.artifacts/delivery-benchmark/<timestamp>/`.

```sh
node examples/delivery-benchmark/runner/delivery_benchmark.mjs list

node examples/delivery-benchmark/runner/delivery_benchmark.mjs prepare \
  --scenario expense-policy-engine \
  --mode harness \
  --out-dir /tmp/expense-harness \
  --force

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
