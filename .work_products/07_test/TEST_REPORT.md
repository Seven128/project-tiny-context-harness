# Test Report

## 1. 测试范围

- Validation batch: Minimal Context Harness vNext on current `agent-project-sdlc@0.2.1` source.
- Version note: no npm publish is claimed by this report; `0.2.1` is the local package version under test.
- Review input: user request to make this project and the npm package default to Minimal Context Harness, with an explicit safe `migrate-context` command.
- Runnable entry/exit under test: `inspect-workflow`, delivery benchmark runner, package CLI validators, generated Makefile gates, `validate-context`, `migrate-context`, package source sync/check and installed-consumer lab.

## 2. Test Matrix

| Case ID | Risk / Requirement | Command / Evidence | Result |
|---|---|---|---|
| TC-001 | Package regression for init/root/validator/upgrade behavior | `npm test --workspace agent-project-sdlc` | PASS: 13 node:test files passed; regression covers Minimal Context init/sync/upgrade/migrate/validate behavior, v3 `validate-harness` aliasing, explicit legacy schema v2 validator compatibility, configured root, dirty path scoping and workflow inspection thresholds. |
| TC-002 | Managed package assets match source | `node packages/sdlc-harness/dist/cli.js package sync-source`; `node packages/sdlc-harness/dist/cli.js package check-source` | PASS: source sync applied expected asset updates including `build_work_product_overviews.py`; drift check reported `package source OK`. |
| TC-003 | Minimal Context scaffold gate | `make validate-harness` | PASS: `validate-harness` is a vNext compatibility alias for `validate-context`; repository Context passed with 3 context files. |
| TC-004 | Installed-consumer Minimal Context path | `node tools/consumer_lab_full_test.mjs --reset-lab --markdown-report /tmp/minimal-context-consumer-lab.md --json-report /tmp/minimal-context-consumer-lab.json` | PASS: consumer lab reported 30 PASS / 0 BLOCKED / 0 FAIL and covers fresh init/adopt/configured-root `project_context/**`, absence of default lifecycle/plan/stage assets, CLI/Makefile `validate-context` / `validate-harness`, `inspect-workflow`, and `migrate-context` dry-run/write/protected-user-context behavior. |
| TC-005 | Legacy schema v2 UI/UX validator compatibility | `npm test --workspace agent-project-sdlc` | PASS: package regression keeps old `validate-uiux` behavior covered for explicit schema v2 fixtures without making it a vNext default gate. |
| TC-006 | Legacy schema v2 TESTING validator compatibility | `npm test --workspace agent-project-sdlc` | PASS: package regression keeps old `validate-test` behavior covered for explicit schema v2 fixtures without making it a vNext default gate. |
| TC-007 | Workflow self-inspection command | `npm test --workspace agent-project-sdlc`; consumer lab `npx sdlc-harness inspect-workflow` checks | PASS: package regression covers unavailable defaults, ordinary/high-risk overhead thresholds, net value confidence, JSON and prompt output; consumer lab covers default plus `.workflow` configured root. |
| TC-008 | Delivery reliability benchmark assets | `node --test tests/sdlc-harness/delivery-benchmark.test.mjs`; `npm test --workspace agent-project-sdlc` | PASS: regression loads 4 scenarios, verifies lifecycle scenarios have lifecycle probes, gate profiles, staged debug-fix materials and required rubric sections, verifies prepared prompts expose only initial requirements/acceptance/gate profile and do not leak hidden scoring answers, verifies prepared run dirs are independent git repos with local bare remotes for Harness commit/push isolation, verifies baseline prompt requires one ordinary product delivery commit/push and still forbids Harness validators/self-logs, verifies `stage-prompt` separately emits recovery/RFC/debug materials, verifies the benchmark design ADR explains same-quality lifecycle efficiency, high-signal-not-hacked scenario design, staged injection, run-dir git isolation, clean committed handoff, measured-agent sandbox/git preflight, gate cost boundaries, metric confidence, conclusion-grade boundaries, automation burden, gate value and calibration ledger policy, verifies the pilot runbook preserves fresh-agent isolation, formal invalidation rules, future-probe leakage boundaries, dirty product worktree invalidation, no-git-isolation and sandbox-blocker invalidation, operator-side timing/gate-value recording, hidden quality probe, recovery answer-key scoring with alternative term/reference groups, intervention logging, gate-value protocol, evidence-check protocol, repeated-pilot lesson capture and raw artifact boundaries, verifies `GATE_THINNING_ANALYSIS.md` covers benefits, risks/losses, retention conditions, `Standard Thin` as the highest current cost/value recommendation and its adoption into common Harness guidance, verifies `EVIDENCE_CHECKLIST.md` defines publishable pair requirements and disallowed overclaims, prepares benchmark run dirs, records external observer activity plus manual and lightweight system-timed events, records operator interventions and gate findings, runs a hidden quality probe, scores a takeover memo, verifies hidden quality probe results become the primary summary/final-quality score while static rubric failures remain supplemental, scores observer/timing source confidence, quality assessment confidence, metric confidence with `conclusion_eligible`, automation burden, gate value, gate cost breakdown, artifact inventory, lifecycle phase minutes, context recovery score, wrong-path count, evidence-check allowed conclusions and outcome metrics, confirms medium/low/unavailable gate, automation and recovery metrics stay diagnostic, confirms evidence-check marks same-quality slower Harness pairs as `negative_elapsed_signal` and calibration pairs as not evaluable, confirms baseline self-logging, Harness validators and benchmark measurement logs are not required in baseline prompts, confirms observer logs are not rubric evidence, and validates report scenario/measurement/expected-advantage/context-continuity/metric-confidence/automation/gate-thinning/artifact-inventory copy without committing raw run artifacts. |
| TC-009 | Orientation fast path and Standard Thin gate guidance | `node --test tests/sdlc-harness/orientation-fast-path.test.mjs`; package source sync/check; `make validate-harness` | PASS: static regression verifies AGENTS, manager/dev Skills, README, package README, PROJECT_SPEC, ADR 001 and package assets document status/next orientation as lightweight routing, define `Standard Thin` as the default gate thickness, preserve focused product gates, explicit full validation, `/advance`, task completion, commit, release, package/source and high-risk strict gate boundaries, and keep authoring Skills out of package assets. |
| TC-010 | Minimal Context Harness vNext defaults | `npm test --workspace agent-project-sdlc`; `make validate-context`; package source sync/check; full consumer lab | PASS: package regression verifies Minimal Context init/sync/upgrade/migrate/validate behavior, source mappings package Minimal Context assets, benchmark Harness prompt uses Minimal Context, workflow inspector uses `validate-context` for Minimal Context projects while preserving legacy diagnostics for explicit schema v2 fixtures, and installed-consumer lab verifies default/adopt/configured-root/migration behavior from the packed tarball. |

TC-008 also covers prompt ledger behavior: `prepare` records the initial protocol
prompt, `stage-prompt --run-dir` records staged protocol prompts,
`intervention-record` records operator intervention prompt fingerprints, and
`prompt-record` records saved operator notes without counting them as
interventions. The hashes and character counts are high-confidence for saved
prompt text only; they do not prove semantic intervention necessity or complete
absence of unrecorded prompts.

## 3. Regression Evidence

- `npm test --workspace agent-project-sdlc`: PASS, 13 node:test files passed.
- `node packages/sdlc-harness/dist/cli.js package sync-source`: PASS.
- `node packages/sdlc-harness/dist/cli.js package check-source`: PASS.
- `node packages/sdlc-harness/dist/cli.js inspect-workflow --json`: PASS, with true token telemetry and missing outcome inputs marked `unavailable`.
- `node --test tests/sdlc-harness/delivery-benchmark.test.mjs`: PASS; includes runner evidence-check coverage for publishable pair gates and negative elapsed signals.
- `node --test tests/sdlc-harness/orientation-fast-path.test.mjs`: PASS.
- `make validate-context`: PASS for `project_context/global.md` and two module Context files.
- `make validate-harness`: PASS, vNext alias to `validate-context`.
- `node tools/consumer_lab_full_test.mjs --reset-lab --markdown-report /tmp/minimal-context-consumer-lab.md --json-report /tmp/minimal-context-consumer-lab.json`: PASS, 30 PASS / 0 BLOCKED / 0 FAIL.
- `node packages/sdlc-harness/dist/cli.js sync`: PASS, current repository schema v3 sync changed one managed file and left historical facts intact.
- `git diff --check`: PASS.
- `tests/sdlc-harness/workflow-inspector.test.mjs`: PASS inside package regression.

## 4. Runnable Entry/Exit Coverage

- Entry points: `sdlc-harness init`, `sync`, `upgrade`, `migrate-context`, `validate-context`, v3 `validate-harness`, `inspect-workflow`, generated Makefile gates and package validators.
- Expected exits / side effects: configured root files are read and written under the configured `<harnessRoot>`, fresh init/adopt create `project_context/global.md` and `project_context/modules/main.md`, default consumers do not create lifecycle/plan/stage assets, `sync` refreshes managed assets without semantic migration, `upgrade` only prompts `migrate-context --dry-run` for legacy facts, `migrate-context --write` preserves old facts and protects user-authored Context, validators report path-specific PASS/FAIL output, and `inspect-workflow` stays read-only while reporting data-source-labeled workflow health plus self-reported outcome comparison.
- Config contract used: `package.json#sdlcHarness.harnessFolderName`, `sdlc-harness.config.json#harnessFolderName`, `<harnessRoot>/config.yaml`, `project_context/global.md`, `project_context/modules/*.md`.
- Fixture/live boundary: local package and installed-consumer validation only; outcome timing and pure-vibe baseline are explicit self-reported inputs; npm publish remains release-stage live validation.

## 5. Coverage Gaps

- No registry publish was performed in this batch.
- Remote GitHub Actions execution remains outside local TESTING scope.
- The active `webhook-provider-bridge` warm Harness pilot is paused during staged `RFC`; it is preserved as diagnostic progress, not as a formal benchmark result.

## 6. Delivery Benchmark Pause Snapshot

- Snapshot: `.work_products/07_test/delivery_benchmark_pilot_progress_20260603.md`
- Artifact root: `.artifacts/delivery-benchmark/20260602-195213-webhook-warm-optimized/`
- Current status: diagnostic incomplete; not public-result eligible.
- Preserved high-confidence facts: Harness initial hidden quality `13/13 PASS`, observer/timer elapsed through pause, and recovery `4/4 PASS` with medium-high confidence.
- Preserved diagnostic lessons: warm bootstrap must stay outside measured delivery, hidden probes need regression tests, and current Harness cost is driven by work-product generation, task contract validation retries, validator evidence formatting and internal-loop gate breadth.

## 7. Final Decision

- Decision: PASS.
- Required before release: run a separate RELEASING task to publish `agent-project-sdlc@0.2.0`, verify registry smoke and replace `CURRENT_RELEASE.md` with that release status.
