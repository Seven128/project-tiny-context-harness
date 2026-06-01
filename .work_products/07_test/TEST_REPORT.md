# Test Report

## 1. 测试范围

- Validation batch: `.work_products/**` workflow output root migration on current `agent-project-sdlc@0.2.0` source.
- Version note: no npm publish is claimed by this report; `0.2.0` is the local package version under test.
- Review input: user request to rename canonical workflow artifacts from `.docs/**` to `.work_products/**`.
- Runnable entry/exit under test: `inspect-workflow`, delivery benchmark runner, package CLI validators, generated Makefile gates, Python lifecycle tools, package source sync/check and installed-consumer lab.

## 2. Test Matrix

| Case ID | Risk / Requirement | Command / Evidence | Result |
|---|---|---|---|
| TC-001 | Package regression for init/root/validator/upgrade behavior | `npm test --workspace agent-project-sdlc` | PASS: package node:test suite covers fresh init without `.docs/**`, `.docs/** -> .work_products/**` upgrade migration, conflicting-root blocker, new task fields, UI/UX assets refs, configured root, dirty path scoping and workflow inspection thresholds. |
| TC-002 | Managed package assets match source | `node packages/sdlc-harness/dist/cli.js package sync-source`; `node packages/sdlc-harness/dist/cli.js package check-source` | PASS: source sync applied expected asset updates including `build_work_product_overviews.py`; drift check reported `package source OK`. |
| TC-003 | Harness scaffold and prompt language gate | `make validate-harness` | PASS: scaffold, prompt language and overview freshness checks passed. |
| TC-004 | Configured-root installed-consumer path | `node tools/consumer_lab_full_test.mjs --reset-lab --markdown-report /tmp/sdlc-harness-consumer-lab-work-products.md --json-report /tmp/sdlc-harness-consumer-lab-work-products.json` | PASS: consumer lab reported 61 PASS / 0 BLOCKED / 0 FAIL and covers `.work_products/**`, absence of `.docs/**`, `.workflow` CLI validator, `inspect-workflow` outcome metrics, Makefile gates and `transition.py`. |
| TC-005 | CLI/package UI/UX fact source | `make validate-uiux` | PASS: non-visual CLI experience slice passes without `DESIGN.md`. |
| TC-006 | TESTING fact source structure | `make validate-test` | PASS: report references existing `TC-*` cases and contains executed regression evidence. |
| TC-007 | Workflow self-inspection command | `npm test --workspace agent-project-sdlc`; consumer lab `npx sdlc-harness inspect-workflow` checks | PASS: package regression covers unavailable defaults, ordinary/high-risk overhead thresholds, net value confidence, JSON and prompt output; consumer lab covers default plus `.workflow` configured root. |
| TC-008 | Delivery reliability benchmark assets | `node --test tests/sdlc-harness/delivery-benchmark.test.mjs`; `npm test --workspace agent-project-sdlc` | PASS: regression loads 4 scenarios, verifies the 3 unscored lifecycle scenarios have lifecycle probes, gate profiles, staged debug-fix materials and required rubric sections, verifies prepared prompts expose only initial requirements/acceptance/gate profile, verifies `stage-prompt` separately emits recovery/RFC/debug materials, verifies the benchmark design ADR explains same-quality lifecycle efficiency, high-signal-not-hacked scenario design, staged injection and gate cost boundaries, verifies the pilot runbook preserves fresh-agent isolation, formal invalidation rules, future-probe leakage boundaries, gate timing and raw artifact boundaries, prepares benchmark run dirs, records external observer activity plus manual and lightweight system-timed events, scores observer/timing source confidence, gate cost breakdown, lifecycle phase minutes, context recovery score, wrong-path count and outcome metrics, confirms baseline self-logging and Harness validators are not required and observer logs are not rubric evidence, confirms unclean calibration numbers are not public report results, and validates report scenario/measurement/expected-advantage/context-continuity copy without committing raw run artifacts. |
| TC-009 | Orientation fast path guidance | `node --test tests/sdlc-harness/orientation-fast-path.test.mjs`; package source sync/check; `make validate-harness` | PASS: static regression verifies AGENTS, manager/dev Skills, README, PROJECT_SPEC and package assets document status/next orientation as lightweight routing, preserve explicit validation and `/advance` gate boundaries, and keep authoring Skills out of package assets. |

## 3. Regression Evidence

- `npm test --workspace agent-project-sdlc`: PASS, 13 node:test files passed.
- `node packages/sdlc-harness/dist/cli.js package sync-source`: PASS.
- `node packages/sdlc-harness/dist/cli.js package check-source`: PASS.
- `node packages/sdlc-harness/dist/cli.js inspect-workflow --json`: PASS, with true token telemetry and missing outcome inputs marked `unavailable`.
- `node --test tests/sdlc-harness/delivery-benchmark.test.mjs`: PASS.
- `node --test tests/sdlc-harness/orientation-fast-path.test.mjs`: PASS.
- `node tools/consumer_lab_full_test.mjs --reset-lab --markdown-report /tmp/sdlc-harness-consumer-lab-work-products.md --json-report /tmp/sdlc-harness-consumer-lab-work-products.json`: PASS, 61 PASS / 0 BLOCKED / 0 FAIL.
- `make validate-harness`: PASS.
- `make validate-uiux`: PASS.
- `make validate-test`: PASS.
- `make validate-plan`: PASS.
- `git diff --check`: PASS.
- `tests/sdlc-harness/workflow-inspector.test.mjs`: PASS inside package regression.

## 4. Runnable Entry/Exit Coverage

- Entry points: `sdlc-harness init`, `sync`, `upgrade`, `inspect-workflow`, package validators, generated Makefile gates and `tools/transition.py`.
- Expected exits / side effects: configured root files are read and written under the configured `<harnessRoot>`, fresh init starts at `REQUIREMENT_GATHERING`, adopt init stays `SPRINTING`, `.work_products/**` is created without `.docs/**`, validators report path-specific PASS/FAIL output, and `inspect-workflow` stays read-only while reporting data-source-labeled workflow health plus self-reported outcome comparison.
- Config contract used: `package.json#sdlcHarness.harnessFolderName`, `sdlc-harness.config.json#harnessFolderName`, `<harnessRoot>/config.yaml`, `<harnessRoot>/state/lifecycle.yaml`, `<harnessRoot>/state/plan.yaml`.
- Fixture/live boundary: local package and installed-consumer validation only; outcome timing and pure-vibe baseline are explicit self-reported inputs; npm publish remains release-stage live validation.

## 5. Coverage Gaps

- No registry publish was performed in this batch.
- Remote GitHub Actions execution remains outside local TESTING scope.

## 6. Final Decision

- Decision: PASS.
- Required before release: run a separate RELEASING task to publish `agent-project-sdlc@0.2.0`, verify registry smoke and replace `CURRENT_RELEASE.md` with that release status.
