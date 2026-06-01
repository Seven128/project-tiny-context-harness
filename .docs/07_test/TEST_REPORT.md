# Test Report

## 1. 测试范围

- Validation batch: workflow logic corrective validation after `agent-project-sdlc@0.1.25`.
- Version note: no new npm release is claimed by this report.
- Review input: repo diagnosis for `<harnessRoot>` drift, fresh init routing, UI/UX fact source gap and stale testing facts.
- Runnable entry/exit under test: package CLI validators, generated Makefile gates, Python lifecycle tools, package source sync/check and installed-consumer lab.

## 2. Test Matrix

| Case ID | Risk / Requirement | Command / Evidence | Result |
|---|---|---|---|
| TC-001 | Package regression for init/root/validator behavior | `npm test --workspace agent-project-sdlc` | PASS: package node:test suite covers fresh init, adopt init, configured root and dirty path scoping. |
| TC-002 | Managed package assets match source | `node packages/sdlc-harness/dist/cli.js package sync-source`; `node packages/sdlc-harness/dist/cli.js package check-source` | PASS: source sync applied expected asset updates and drift check reported `package source OK`. |
| TC-003 | Harness scaffold and prompt language gate | `make validate-harness` | PASS: scaffold, prompt language and overview freshness checks passed. |
| TC-004 | Configured-root installed-consumer path | `node tools/consumer_lab_full_test.mjs --report-only --reset-lab --markdown-report /tmp/sdlc-consumer-lab-workflow-inspect.md --json-report /tmp/sdlc-consumer-lab-workflow-inspect.json` | PASS: consumer lab reported 60 PASS / 0 BLOCKED / 0 FAIL and covers `.workflow` CLI validator, `inspect-workflow`, Makefile gates and `transition.py`. |
| TC-005 | CLI/package UI/UX fact source | `make validate-uiux` | PASS: non-visual CLI experience slice passes without `DESIGN.md`. |
| TC-006 | TESTING fact source structure | `make validate-test` | PASS: report references existing `TC-*` cases and contains executed regression evidence. |
| TC-007 | Workflow self-inspection command | `npm test --workspace agent-project-sdlc`; consumer lab `npx sdlc-harness inspect-workflow` checks | PASS: package regression covers report/JSON/prompt/self-reported metrics, and consumer lab covers default plus `.workflow` configured root. |

## 3. Regression Evidence

- `npm test --workspace agent-project-sdlc`: PASS.
- `node packages/sdlc-harness/dist/cli.js package sync-source`: PASS.
- `node packages/sdlc-harness/dist/cli.js package check-source`: PASS.
- `node packages/sdlc-harness/dist/cli.js inspect-workflow --json`: PASS, with true token telemetry marked `unavailable`.
- `node tools/consumer_lab_full_test.mjs --report-only --reset-lab --markdown-report /tmp/sdlc-consumer-lab-workflow-inspect.md --json-report /tmp/sdlc-consumer-lab-workflow-inspect.json`: PASS.
- `make validate-harness`: PASS.
- `make validate-uiux`: PASS.
- `make validate-test`: PASS.
- `make validate-plan`: PASS.
- `git diff --check`: PASS.
- `tests/sdlc-harness/workflow-inspector.test.mjs`: PASS inside package regression.

## 4. Runnable Entry/Exit Coverage

- Entry points: `sdlc-harness init`, `sync`, `upgrade`, `inspect-workflow`, package validators, generated Makefile gates and `tools/transition.py`.
- Expected exits / side effects: configured root files are read and written under the configured `<harnessRoot>`, fresh init starts at `REQUIREMENT_GATHERING`, adopt init stays `SPRINTING`, validators report path-specific PASS/FAIL output, and `inspect-workflow` stays read-only while reporting data-source-labeled workflow health.
- Config contract used: `package.json#sdlcHarness.harnessFolderName`, `sdlc-harness.config.json#harnessFolderName`, `<harnessRoot>/config.yaml`, `<harnessRoot>/state/lifecycle.yaml`, `<harnessRoot>/state/plan.yaml`.
- Fixture/live boundary: local package and installed-consumer validation only; npm publish remains release-stage live validation.

## 5. Coverage Gaps

- No registry publish was performed in this batch.
- Remote GitHub Actions execution remains outside local TESTING scope.

## 6. Final Decision

- Decision: PASS.
- Required before release: run a separate RELEASING task to bump version, publish, verify registry smoke and replace `CURRENT_RELEASE.md` with that release status.
