# Expense Policy Engine Benchmark Run - 2026-06-01 17:44:24 CST

Scenario: `expense-policy-engine`

Run directory: `.artifacts/delivery-benchmark/20260601-174424/`

## Summary

| Mode | Score | Decision | Workflow Control Minutes | Total Delivery Minutes | Notes |
|---|---:|---|---:|---:|---|
| baseline | 13/13 | PASS | unavailable | 25 | Plain AI coding path with transcript, tests, smoke, and recovery notes. |
| harness | 13/13 | PASS | 29 | 53 | Full Harness lifecycle from init through COMPLETED with local git remote push simulation. |

## Gate Evidence

- Baseline: `npm test` PASS; `npm run smoke` PASS; score PASS.
- Harness: `npm test` PASS; `npm run smoke` PASS; `make validate-dev` PASS; `make validate-review` PASS; `make validate-test` PASS; `make validate-release` PASS; lifecycle ended at `COMPLETED`.

## Interpretation

- Both paths met the same rubric score: 10/10 acceptance, 2/2 change impact, 1/1 handoff.
- Harness produced stronger durable handoff artifacts: PRD, CLI UX contract, architecture, tech plan, implementation doc, runbook, review report, test strategy/cases/report, release status, and local task commits.
- Cost metrics are agent-recorded benchmark estimates with low comparison confidence, not telemetry.
