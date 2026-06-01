# Test Cases

## Scope

- Fact source: TESTING-stage reusable case design for the workflow logic fix batch.
- Runnable entries: package CLI validators, generated Makefile gates, Python lifecycle tools and consumer lab script.
- Result recording stays in `.docs/07_test/TEST_REPORT.md`.

## Cases

| Case ID | Requirement / Risk Ref | Type | Priority | Runnable Entry | Preconditions | Steps | Expected Exit | Evidence Pointer |
|---|---|---|---|---|---|---|---|---|
| TC-001 | Package regression for init/root/validator behavior | regression | P0 | `npm test --workspace agent-project-sdlc` | Package workspace dependencies installed | Run package node:test suite | Tests pass for fresh init, adopt init, configured root and dirty path scoping | package test output |
| TC-002 | Package assets match source | regression | P0 | `node packages/sdlc-harness/dist/cli.js package check-source` | Managed assets synced from source | Run source drift check | Command reports `package source OK` | package source check output |
| TC-003 | Harness scaffold and prompt language gate | smoke | P0 | `make validate-harness` | Generated overviews refreshed | Run harness validation gate | Scaffold, prompt language and overview freshness pass | harness gate output |
| TC-004 | Configured-root installed-consumer path | integration | P0 | `node tools/consumer_lab_full_test.mjs --report-only --reset-lab` | Current source package is buildable | Run full consumer lab | `.workflow` CLI validator, Makefile gates and `transition.py` pass | consumer lab report |
| TC-005 | UI/UX fact source for CLI/package project | smoke | P1 | `make validate-uiux` | CLI/package experience slice exists | Run UI/UX validator | Non-visual CLI experience deliverable passes without `DESIGN.md` | UI/UX gate output |
| TC-006 | TESTING fact source structure | smoke | P1 | `make validate-test` | `TEST_CASES.md` and `TEST_REPORT.md` exist | Run test validator | Test report references existing cases and has executable evidence | test gate output |
| TC-007 | Workflow self-inspection command | regression | P0 | `npm test --workspace agent-project-sdlc`; `npx sdlc-harness inspect-workflow` | Package CLI is built and a Harness fixture exists | Run package regression and inspect-workflow in default and configured-root fixtures | Report exposes `PASS/WARN/BLOCKED`, JSON/prompt output, `measured` / `inferred` / `self_reported` / `unavailable` data sources, and outcome comparison metrics without writing files | package test output; consumer lab report |
| TC-008 | Delivery reliability benchmark assets | regression | P1 | `node --test tests/sdlc-harness/delivery-benchmark.test.mjs`; `npm test --workspace agent-project-sdlc` | Benchmark scenarios and runner exist in `examples/delivery-benchmark/` | Load scenarios, prepare a run dir, record events and score a sample run | Runner computes acceptance sections, workflow-control cost and outcome metrics without touching tracked run artifacts | package test output |
