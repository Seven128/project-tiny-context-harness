# .work_products/07_test overview

<!-- generated-by: AI SDLC Harness build_work_product_overviews.py -->
<!-- source-hash: 1ea4608996f5800d -->

Generated artifact. Markdown slices remain the source of truth.

Source hash: `1ea4608996f5800d`

## Source Slices

1. [TEST_CASES.md](TEST_CASES.md)
2. [TEST_REPORT.md](TEST_REPORT.md)
3. [delivery_benchmark_pilot_progress_20260603.md](delivery_benchmark_pilot_progress_20260603.md)
4. [harness_consumer_lab.md](harness_consumer_lab.md)

---

## TEST_CASES.md

Source: [TEST_CASES.md](TEST_CASES.md)

# Test Cases

## Scope

- Fact source: TESTING-stage reusable case design for the workflow logic fix batch.
- Runnable entries: package CLI validators, generated Makefile gates, `validate-context`, `migrate-context` and consumer lab script.
- Result recording stays in `.work_products/07_test/TEST_REPORT.md`.

## Cases

| Case ID | Requirement / Risk Ref | Type | Priority | Runnable Entry | Preconditions | Steps | Expected Exit | Evidence Pointer |
|---|---|---|---|---|---|---|---|---|
| TC-001 | Package regression for init/root/validator behavior | regression | P0 | `npm test --workspace agent-project-sdlc` | Package workspace dependencies installed | Run package node:test suite | Tests pass for fresh init, adopt init, configured root and dirty path scoping | package test output |
| TC-002 | Package assets match source | regression | P0 | `node packages/sdlc-harness/dist/cli.js package check-source` | Managed assets synced from source | Run source drift check | Command reports `package source OK` | package source check output |
| TC-003 | Minimal Context scaffold gate | smoke | P0 | `make validate-harness` | `project_context/**` exists | Run compatibility harness gate | `validate-harness` aliases `validate-context` and Context recovery fields pass | harness gate output |
| TC-004 | Installed-consumer Minimal Context path | integration | P0 | `node tools/consumer_lab_full_test.mjs --report-only --reset-lab` | Current source package is buildable | Run full consumer lab | Fresh init/adopt/configured-root consumers generate `project_context/**`, do not generate lifecycle/plan/stage assets, validate with CLI/Makefile gates, and exercise `migrate-context` dry-run/write/protected-user-context behavior | consumer lab report |
| TC-005 | Legacy schema v2 UI/UX validator compatibility | regression | P1 | `npm test --workspace agent-project-sdlc` | Explicit schema v2 fixture exists in package tests | Run package validator regression | Old `validate-uiux` behavior remains covered for legacy projects without becoming a vNext default gate | package test output |
| TC-006 | Legacy schema v2 TESTING validator compatibility | regression | P1 | `npm test --workspace agent-project-sdlc` | Explicit schema v2 fixture exists in package tests | Run package validator regression | Old `validate-test` behavior remains covered for legacy projects without becoming a vNext default gate | package test output |
| TC-007 | Workflow self-inspection command | regression | P0 | `npm test --workspace agent-project-sdlc`; `npx sdlc-harness inspect-workflow` | Package CLI is built and a Harness fixture exists | Run package regression and inspect-workflow in default and configured-root fixtures | Report exposes `PASS/WARN/BLOCKED`, JSON/prompt output, `measured` / `inferred` / `self_reported` / `unavailable` data sources, and outcome comparison metrics without writing files | package test output; consumer lab report |
| TC-008 | Delivery reliability benchmark assets | regression | P1 | `node --test tests/sdlc-harness/delivery-benchmark.test.mjs`; `npm test --workspace agent-project-sdlc` | Benchmark scenarios, design rationale ADR, operator runbook, evidence checklist and runner exist in `examples/delivery-benchmark/` | Load scenarios, verify lifecycle scenarios include lifecycle probes, gate profiles, staged `debug_fix.md` files and required rubric sections, verify prepared prompts exclude future recovery/RFC/debug probe details and hidden scoring answers, verify prepared run dirs are independent git repos with local bare remotes, verify baseline initial prompt requires one ordinary product delivery commit/push without Harness validators, verify `stage-prompt` emits recovery/RFC/debug materials only at the requested stage and can write protocol prompt fingerprints to `.benchmark/prompts.ndjson`, verify the benchmark design ADR explains same-quality lifecycle efficiency, high-signal-not-hacked scenario design, staged injection, run-dir git isolation, clean committed handoff, measured-agent sandbox/git preflight, gate cost boundaries, metric confidence, conclusion-grade boundaries, automation burden, gate value and calibration ledger policy, verify the pilot runbook preserves fresh-agent isolation, invalidates unclean/future-leaked/dirty-worktree/no-git-isolation/sandbox-blocked runs, gate timing, raw artifact boundaries, hidden quality probe, recovery answer-key scoring with alternative term/reference groups, first-pass score, intervention logging, prompt-ledger logging, gate-value protocol, evidence-check protocol and repeated-pilot lesson capture, verify `GATE_THINNING_ANALYSIS.md` covers gate thinning benefits, risks/losses, retention conditions, `Standard Thin` cost/value recommendation and adoption into common Harness guidance, verify `EVIDENCE_CHECKLIST.md` defines publishable pair requirements and disallowed overclaims, prepare run dirs, record external observer activity, record manual and lightweight system-timed events, record prompt ledger entries, record operator interventions and gate findings, run hidden quality probe, score a takeover memo, score sample runs, run evidence-check on synthetic summary pairs, and load report data | Runner computes acceptance sections, observer elapsed time, file activity summary, workflow-control cost, gate cost breakdown, prompt ledger, automation burden, gate value, lifecycle phase minutes, context recovery score, wrong-path count, timing source confidence, quality assessment confidence, metric confidence with `conclusion_eligible`, artifact inventory, evidence-check allowed conclusions and outcome metrics without touching tracked run artifacts; when a hidden quality probe exists it becomes the primary summary/final-quality score while static rubric failures stay supplemental; only high-confidence metrics are conclusion-grade; medium/low/unavailable gate, automation and recovery metrics remain diagnostic; prompt ledger hashes and character counts are high-confidence only for saved prompt text; evidence-check marks same-quality slower Harness pairs as `negative_elapsed_signal` and calibration pairs as not evaluable; measured-agent `.codex` / `.git/index.lock` blockers and dirty product worktree recovery are documented as calibration-only; recovery answer keys can accept valid alternative project fact references; gate-thinning recommendation is visible as `Standard Thin` with benefits, risks/losses and why it is the highest current cost/value tradeoff; initial prompts and staged prompts do not count as artificial interventions; initial prompts do not leak future probe answers or hidden answer keys; baseline prompt does not require self-logging, Harness validators or benchmark measurement logs; observer/gate-value records are operator-side; observer logs are not quality evidence; static rubric evidence is not overclaimed as high confidence; repeated pilot experience is preserved as protocol evidence instead of chat-only memory; report data explains each scenario project, measurement method, expected Harness advantage, context-continuity probe, automation/gate panels, artifact inventory and per-metric confidence | package test output |
| TC-009 | Orientation fast path and Standard Thin gate guidance | regression | P0 | `node --test tests/sdlc-harness/orientation-fast-path.test.mjs`; `npm test --workspace agent-project-sdlc`; package source sync/check | Source docs and package assets are synced | Check AGENTS, manager/dev Skills, README, package README, PROJECT_SPEC, ADR 001 and synced package assets | Status/next orientation is documented as lightweight routing; `Standard Thin` is documented as the default gate thickness; ordinary loops use focused product/domain gates plus light state checks; `/advance`, explicit full validation, task completion, commit, release, package/source and high-risk boundaries still require strict gates; authoring Skills stay excluded from package assets | package test output; package source check output |
| TC-010 | Minimal Context Harness vNext defaults | regression | P0 | `npm test --workspace agent-project-sdlc`; `make validate-context`; package source sync/check; full consumer lab | vNext CLI and package assets are built | Verify `init` creates `project_context/**` without lifecycle/plan/stage skills/work products, `sync` does not migrate semantic facts, `upgrade` only prompts `migrate-context --dry-run`, `migrate-context --dry-run` is read-only, `migrate-context --write` preserves old facts and user-authored Context, `validate-context` checks global/module recovery fields and blocks fake test-result claims, `validate-harness` is a v3 compatibility alias for `validate-context`, source mappings package Minimal Context assets, benchmark Harness prompt uses Minimal Context, and consumer lab validates default/adopt/configured-root/migration behavior from an installed tarball | Minimal Context becomes the package default while legacy stage validators/assets remain compatibility-only; semantic migration is explicit and safe; Context validation passes for this repository | package test output; context gate output; consumer lab report |

---

## TEST_REPORT.md

Source: [TEST_REPORT.md](TEST_REPORT.md)

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

---

## delivery_benchmark_pilot_progress_20260603.md

Source: [delivery_benchmark_pilot_progress_20260603.md](delivery_benchmark_pilot_progress_20260603.md)

# Delivery Benchmark Pilot Progress Snapshot 2026-06-03

## 1. Purpose

本文件保存当前“跑工作流 benchmark，直到完成”目标在暂停时的进度现场、数据置信度、经验和阶段性结论。

这不是公开 benchmark 结果页的数据源，也不是发布用 summary。正式结果仍必须来自 clean、fresh、independent、same-quality 的 baseline / Harness 成对 run，并通过 `evidence-check`。

## 2. Pause Boundary

- Pause request: 用户要求先暂停并保存当前目标现场。
- Active artifact root: `.artifacts/delivery-benchmark/20260602-195213-webhook-warm-optimized/`
- Scenario: `webhook-provider-bridge`
- Mode under measurement at pause: `harness`
- Protocol status: `diagnostic_incomplete`
- Public-result eligibility: no. The current Harness run stopped during `RFC`; it has no final RFC/debug hidden quality score and must not be used as a published efficiency conclusion.

The active RFC segment was stopped by the operator:

| Segment | Source | Minutes | Status |
|---|---|---:|---|
| `INITIAL_DELIVERY` | system timer | 22.0574 | complete |
| `RECOVERY` | system timer | 3.2276 | complete |
| `RFC` | system timer | 11.1315 | paused before completion |
| Cumulative observer elapsed at pause | external observer | 36.4389 | stopped |

Raw pause evidence:

- `.artifacts/delivery-benchmark/20260602-195213-webhook-warm-optimized/harness/.benchmark/events.ndjson`
- `.artifacts/delivery-benchmark/20260602-195213-webhook-warm-optimized/harness/.benchmark/observations.ndjson`
- `.artifacts/delivery-benchmark/20260602-195213-webhook-warm-optimized/harness/.benchmark/observer-state.json`

## 3. Current Harness Run State

### Initial Delivery

- Warm Harness scaffold was present before measured delivery. The prompt explicitly said not to run `npx sdlc-harness init`.
- Product implementation reached hidden initial quality `13/13 PASS`.
- Hidden quality confidence: high.
- Product delivery commits in the run-dir local repo:
  - `74b0bbf TASK-004: implement webhook provider bridge`
  - `0499dd5 TASK-004: complete sprint task ledger`
- Important scoring fix: `QP-WEBHOOK-011` initially exposed a hidden probe issue, not a product issue. The probe was fixed to treat `passed: true` as accepted and to run mock-provider smoke on a fresh bridge instance so previous negative audit entries cannot contaminate the smoke result.

### Fresh-Agent Recovery

- Recovery prompt was injected through staged prompt.
- Recovery answer file: `.benchmark/takeover-answer.md`
- Recovery score: `4/4 PASS`
- Recovery confidence: medium-high, because it uses a hidden answer key plus file references but still scores a natural-language takeover memo.
- No product source/test/work-product files were changed during recovery.

### RFC Cascade

- RFC staged prompt was injected and measurement began.
- The measured agent entered `RFC_RECALIBRATION`, created `TASK-005`, and started implementing schema v2, tenant secret rotation and replay-protection changes.
- The RFC stage was paused before final gates, commit/push closure, final hidden quality probe or debug stage.
- Run-dir dirty state at pause included `.codex/state/**`, `.work_products/**`, `README.md`, `src/webhookBridge.js`, `tests/webhookBridge.test.js` and `.work_products/rfc/webhook-provider-schema-v2-rotation-replay.md`.
- Run-dir diff at pause: 13 files changed, 457 insertions, 145 deletions.

This RFC work can be used as calibration evidence about workflow friction, but not as a formal lifecycle result.

## 4. Baseline Reference Data

The current warm-optimized artifact copied the prior formal baseline summary for comparison:

- Source summary: `.artifacts/delivery-benchmark/20260602-195213-webhook-warm-optimized/baseline-summary.json`
- Baseline observer total: `27.7418 min`
- Baseline lifecycle minutes: initial `8.40`, recovery `2.25`, RFC `9.00`, debug `3.57`
- Baseline final hidden quality: `19/19 PASS`
- Baseline recovery: `4/4 PASS`

Because the current Harness run is paused and not a completed pair, the baseline numbers are diagnostic context only here.

## 5. Data Confidence

| Data | Confidence | Why |
|---|---|---|
| Observer elapsed time | high | External observer measured the run directory without asking the measured agent to self-report time. |
| System-timed stage minutes | medium-high | Clock duration is system-measured, but start/stop boundaries are still operator-defined. |
| Hidden product quality probe | high for probed behavior | The probe executes deterministic product behavior and tests; after the `QP-WEBHOOK-011` fix, the mock smoke no longer depends on polluted prior state. |
| Recovery score | medium-high | Hidden answer key and file references reduce subjectivity, but natural-language memo scoring is not fully objective. |
| Gate friction observations | diagnostic | They come from logs and operator interpretation; useful for workflow iteration but not conclusion-grade by themselves. |
| Current RFC partial changes | not conclusion-grade | The stage was paused before quality gates and final scoring. |

## 6. Lessons Preserved

- Warm bootstrap must stay outside the measured delivery window. Otherwise the benchmark measures package adoption cost, not scenario delivery cost.
- Hidden probes are part of the benchmark product and need their own regression tests. A buggy probe can make a correct product look worse; probe fixes must apply uniformly to both modes.
- Harness currently preserves strong handoff/recovery context in this scenario, but it still spends significant time reading and maintaining workflow facts.
- The visible cost drivers are not only coding: work-product generation, overview refreshes, task contract shape validation, self-test evidence formatting and validator strictness all consume time.
- RFC task creation showed repeated field/shape friction (`status`, `summary`, `work_products`). This is a high-ROI candidate for a small task/RFC skeleton generator or stricter template helper.
- `Standard Thin` is directionally right: internal loops should use focused product gates and light state checks, while strict gates remain at task completion, commit/push, phase transition, release, package/source changes and high-risk provider/live boundaries.
- Scenario design should remain high-signal but honest. The next step is to reduce known workflow friction and then rerun; not to search for a scenario that hides ordinary-task negative elapsed signals.
- Artifact volume must be interpreted by category. Harness-managed runtime and `.work_products` facts explain context cost, but line count alone does not prove value.

## 7. Stage Conclusions

Current conclusion-grade facts:

- Harness initial delivery reached hidden initial quality `13/13 PASS`.
- Fresh-agent recovery reached `4/4 PASS` with medium-high confidence.
- The elapsed-time data up to pause is credible for diagnosis.

Current conclusions that are not allowed:

- Do not claim the current warm Harness lifecycle is faster or slower than baseline as a formal result; the pair is incomplete.
- Do not claim RFC/debug quality after the paused stage.
- Do not claim gate net value from this paused run.
- Do not publish the current artifact into `examples/delivery-benchmark/results/benchmark-data.js`.

Diagnostic conclusion:

- Even after excluding warm bootstrap, Harness initial delivery remained materially slower than the prior baseline initial reference. Before trying to prove an advantage with more favorable scenarios, workflow iteration should first target known friction that does not add product quality or context value.

## 8. Resume Options

If this artifact is resumed:

1. Treat it as calibration unless the pause boundary is explicitly accepted as part of the protocol.
2. Finish RFC implementation, run `npm test`, focused scenario hidden quality probe, mode-appropriate commit/push closure and `score`.
3. Inject `DEBUG` only after RFC quality is recorded.
4. Run final hidden quality, recovery if needed, `score` and `evidence-check`.

For a formal public result:

1. Fresh-rerun the Harness path from a clean warm scaffold.
2. Keep the baseline path paired under the same scenario, model/config and staged protocol.
3. Publish only if both paths reach same hidden final quality and `evidence-check` marks the pair publishable.

## 9. Next Workflow Improvement Candidates

- Add a small RFC/task skeleton helper for common `plan.yaml` task shapes, or make the RFC Skill produce a minimal valid task contract before validation.
- Add clearer examples for self-test evidence formatting so validators do not become trial-and-error cost.
- Continue applying `Standard Thin` inside measured loops; only run strict workflow gates at the documented boundaries.
- Consider a compact benchmark work-product profile that preserves recovery-critical facts without forcing full PRD/UX/architecture breadth for every API-only scenario.
- Keep hidden probes and evidence-check tests close to the runner so scoring bugs are caught before measured runs.

---

## harness_consumer_lab.md

Source: [harness_consumer_lab.md](harness_consumer_lab.md)

# Harness Consumer Lab Full Test

## Scope

- Package: `agent-project-sdlc@0.2.0`
- Source root: `/Users/momoooo/Documents/project-agent-sdlc`
- Lab repository: `/Users/momoooo/Documents/sdlc-harness-consumer-lab`
- Lab cleanup: `deleted`
- Lab commit: `1955ace`
- Lab tag: `not recorded`
- Started: 2026-06-01T18:47:48.322Z
- Finished: 2026-06-01T18:48:13.629Z

This script installs the package tarball into the lab, relies on package-managed `tools/**` materialization instead of copying source-repo tools directly, and deletes the lab repository after reports are written unless `--keep-lab` is set.

## Summary

- PASS: 61
- BLOCKED: 0
- FAIL: 0
- Decision: PASS

## Script Usage

~~~sh
node tools/consumer_lab_full_test.mjs --report-only --lab-dir /Users/momoooo/Documents/sdlc-harness-consumer-lab
node tools/consumer_lab_full_test.mjs --report-only --keep-lab --commit-lab --lab-dir /Users/momoooo/Documents/sdlc-harness-consumer-lab
~~~

Default reports are written to `/Users/momoooo/Documents/sdlc-harness-consumer-lab/.artifacts/consumer_lab_full_report.{json,md}` before cleanup. Pass `--markdown-report` or `--json-report` outside the lab when the report must persist after the default cleanup. Use `--reset-lab` only when the existing lab should be deleted before the run; use `--keep-lab` only for debugging; use `--commit-lab` with `--keep-lab` when a local evidence commit and tag should be created.

## Matrix

| Area | Evidence | Result | Details |
|---|---|---|---|
| Package smoke | npm pack current source package | PASS | agent-project-sdlc-0.2.0.tgz |
| Package smoke | install current source tarball | PASS | added 144 packages, and audited 145 packages in 2s  103 packages are looking for funding   run `npm fund` for details  found 0 vulnerabilities  npm warn deprecated mdast@3.0.0: `mdast` was renamed to `remark` |
| CLI lifecycle | init explicit .codex root | PASS | created .codex/config.yaml created .codex/state/lifecycle.yaml created .codex/state/plan.yaml created .codex/state/plan.draft.yaml .codex/state/memory.md .work_products/INDEX.md sync changed=54 skipped=2 blocked=0 init complete |
| CLI lifecycle | doctor installed workspace | PASS | harness root: .codex core package: agent-project-sdlc@0.2.0 schema version: 2 doctor complete |
| CLI lifecycle | inspect-workflow installed workspace with outcome metrics | PASS | - PASS fact_source_alignment.validate-plan: 0 [measured] - validate-plan reported no errors. - PASS testing_readiness.validate-test: unknown [unavailable] - No TESTING fact source exists yet; validate-test readiness is not evaluated for this phase. - PASS handoff_clarity.lifecycle: 0 [measured] - Lifecycle and current task pointers are coherent. - PASS recovery_safety.resume_capsule: unknown [unavailable] - No current/open task is selected. - PASS workflow_weight.actual_tokens: unknown [unavailable] - No local token telemetry was provided; inspect-workflow will not invent a precise token number. - PASS outcome.workflow_overhead_ratio: 0.17 [self_reported] - 17% of total delivery time was reported as pure workflow control cost; thresholds are 30%/50%. - PASS outcome.vibe_handoff_delta_minutes: 0 [self_reported] - Harness delivery was reported 0 minute(s) faster than or equal to the same-quality pure-vibe baseline. - PASS outcome.net_value_minutes: 10 [self_reported] - Reported same-quality vibe baseline plus avoided rework exceeds Harness delivery cost by 10 minute(s). |
| CLI lifecycle | sync idempotency | PASS | sync changed=0 skipped=16 blocked=0 |
| CLI lifecycle | upgrade idempotency | PASS | migrations changed=0 skipped=17 sync changed=0 skipped=16 blocked=0 doctor warnings=0 errors=0 |
| Managed assets | package ships root README as agent-readable docs asset | PASS | node_modules/agent-project-sdlc/assets/docs/README.md exists |
| Managed assets | expected generated files exist | PASS | 13 managed files checked; .docs not created |
| Managed assets | fresh init lifecycle starts in requirement gathering | PASS | lifecycle.yaml routes to pjsdlc_pm_prd |
| Managed assets | phase policy uses explicit transition graph | PASS | phase_contracts.yaml contains transitions without legacy next/returns |
| Adoption | init --adopt existing project | PASS | created .codex/config.yaml created .codex/state/lifecycle.yaml created .codex/state/plan.yaml created .codex/state/plan.draft.yaml .codex/state/memory.md .work_products/INDEX.md sync changed=54 skipped=2 blocked=0 adopt mode complete |
| Configurable root | package.json#sdlcHarness.harnessFolderName | PASS | created .workflow/config.yaml created .workflow/state/lifecycle.yaml created .workflow/state/plan.yaml created .workflow/state/plan.draft.yaml .workflow/state/memory.md .work_products/INDEX.md sync changed=54 skipped=2 blocked=0 adopt mode complete |
| Configurable root | CLI validator consumes configured .workflow root | PASS | validate-harness checked /Users/momoooo/Documents/sdlc-harness-consumer-lab/.artifacts/runs/configured-root-aBiJND (.workflow) |
| Configurable root | inspect-workflow consumes configured .workflow root | PASS | - PASS fact_source_alignment.validate-plan: 0 [measured] - validate-plan reported no errors. - PASS testing_readiness.validate-test: unknown [unavailable] - No TESTING fact source exists yet; validate-test readiness is not evaluated for this phase. - PASS handoff_clarity.lifecycle: 0 [measured] - Lifecycle and current task pointers are coherent. - PASS recovery_safety.resume_capsule: unknown [unavailable] - No current/open task is selected. - PASS workflow_weight.actual_tokens: unknown [unavailable] - No local token telemetry was provided; inspect-workflow will not invent a precise token number. - PASS outcome.workflow_overhead_ratio: 0.17 [self_reported] - 17% of total delivery time was reported as pure workflow control cost; thresholds are 30%/50%. - PASS outcome.vibe_handoff_delta_minutes: 0 [self_reported] - Harness delivery was reported 0 minute(s) faster than or equal to the same-quality pure-vibe baseline. - PASS outcome.net_value_minutes: 10 [self_reported] - Reported same-quality vibe baseline plus avoided rework exceeds Harness delivery cost by 10 minute(s). |
| Configurable root | Makefile work-products-overview consumes configured .workflow root | PASS | Wrote .work_products/03_tech_plan/overview.md Wrote .work_products/04_implementation/overview.md Wrote .work_products/05_decisions/overview.md Wrote .work_products/06_review/overview.md Wrote .work_products/07_test/overview.md Wrote .work_products/08_release/overview.md Wrote .work_products/09_runbooks/overview.md Wrote .work_products/rfc/overview.md |
| Configurable root | Makefile/Python gates consume configured .workflow root | PASS | OK .work_products/03_tech_plan/overview.md OK .work_products/04_implementation/overview.md OK .work_products/05_decisions/overview.md OK .work_products/06_review/overview.md OK .work_products/07_test/overview.md OK .work_products/08_release/overview.md OK .work_products/09_runbooks/overview.md OK .work_products/rfc/overview.md |
| Configurable root | phase-exit Makefile gate consumes configured .workflow root | PASS | validate-dev checked 0 task(s) /Library/Developer/CommandLineTools/usr/bin/make lint No project lint command configured yet. Replace this target with your stack-specific lint command. /Library/Developer/CommandLineTools/usr/bin/make test-current-domain No domain test command configured yet. Replace this target with focused tests for current_task_id. Running make validate-dev make validate-dev: PASS Phase exit plan OK: no open tasks |
| Configurable root | transition.py writes configured .workflow lifecycle | PASS | Transitioned SPRINTING -> REVIEWING |
| Local overrides | known Skill override appends Local Override | PASS | override appended |
| Local overrides | complete Skill override merges description and appends stripped body | PASS | full skill override merged |
| Local overrides | unknown Skill override blocks sync | PASS | sync changed=0 skipped=6 blocked=1  blocked: unknown skill override: .codex/pjsdlc_managed/override_skills/pjsdlc_unknown.md |
| Local policy overrides | *.local.yaml preserved across sync | PASS | local policy preserved |
| Toy project | node:test fixture | PASS | ℹ tests 2 ℹ suites 0 ℹ pass 2 ℹ fail 0 ℹ cancelled 0 ℹ skipped 0 ℹ todo 0 ℹ duration_ms 60.1955 |
| CLI validators | validate-harness | PASS | validate-harness checked /Users/momoooo/Documents/sdlc-harness-consumer-lab (.codex) |
| CLI validators | validate-plan | PASS | validate-plan checked 0 task(s) |
| CLI validators | validate-pm | PASS | validate-pm checked 1 file(s) |
| CLI validators | validate-uiux | PASS | validate-uiux checked 1 file(s) |
| CLI validators | validate-design | PASS | validate-design checked 2 file(s) |
| CLI validators | validate-current | PASS | validate-pm checked 1 file(s) |
| CLI validators | validate-dev final empty plan | PASS | validate-dev checked 0 task(s) |
| Makefile gates | make validate-dev accepts valid current open SPRINTING task | PASS | npx sdlc-harness validate-dev validate-dev checked 1 task(s) /Library/Developer/CommandLineTools/usr/bin/make lint No project lint command configured yet. Replace this target with your stack-specific lint command. /Library/Developer/CommandLineTools/usr/bin/make test-current-domain No domain test command configured yet. Replace this target with focused tests for current_task_id. |
| CLI validators | validate-review | PASS | validate-review checked review report |
| CLI validators | validate-test | PASS | validate-test checked .work_products/07_test/TEST_REPORT.md |
| CLI validators | validate-release | PASS | validate-release checked .work_products/08_release/CURRENT_RELEASE.md |
| CLI validators | validate-rfc | PASS | validate-rfc checked 1 file(s) |
| Task protocol | stale draft retained after development is rejected | PASS | validate-dev checked 0 task(s)  error: Unconsumed draft tasks remain in plan.draft.yaml: TASK-001. Promote the next draft into plan.yaml or remove already-consumed drafts before validate-dev. |
| Task protocol | done task retained in plan is rejected | PASS | validate-dev checked 1 task(s)  error: Completed task TASK-001 must not remain in plan.yaml |
| Task protocol | direct dev gate accepts current open SPRINTING task | PASS | validate-dev checked 1 task(s) |
| Task protocol | phase exit gate rejects open SPRINTING task | PASS | validate-dev checked 1 task(s) for phase exit  error: Open tasks remain: TASK-001 |
| Parallel execution | valid workflow_default native subagent contract | PASS | validate-test checked .work_products/07_test/TEST_REPORT.md |
| Parallel execution | unsupported trigger is rejected | PASS | validate-test checked .work_products/07_test/TEST_REPORT.md  error: parallel_execution.trigger must be user_requested or workflow_default |
| Natural-language control | static AGENTS/manager routing text | PASS | natural-language routing text present |
| Work products overview | make work-products-overview before validate-harness | PASS | Wrote .work_products/03_tech_plan/overview.md Wrote .work_products/04_implementation/overview.md Wrote .work_products/05_decisions/overview.md Wrote .work_products/06_review/overview.md Wrote .work_products/07_test/overview.md Wrote .work_products/08_release/overview.md Wrote .work_products/09_runbooks/overview.md Wrote .work_products/rfc/overview.md |
| Makefile gates | make validate-harness | PASS | OK .work_products/03_tech_plan/overview.md OK .work_products/04_implementation/overview.md OK .work_products/05_decisions/overview.md OK .work_products/06_review/overview.md OK .work_products/07_test/overview.md OK .work_products/08_release/overview.md OK .work_products/09_runbooks/overview.md OK .work_products/rfc/overview.md |
| Makefile gates | make validate-current | PASS | validate-dev checked 0 task(s) /Library/Developer/CommandLineTools/usr/bin/make lint No project lint command configured yet. Replace this target with your stack-specific lint command. /Library/Developer/CommandLineTools/usr/bin/make test-current-domain No domain test command configured yet. Replace this target with focused tests for current_task_id. Running make validate-dev make validate-dev: PASS Phase exit plan OK: no open tasks |
| Makefile gates | make validate-uiux | PASS | python3 tools/validate_uiux_design.py UI/UX artifacts OK: 1 experience deliverable(s) |
| Makefile gates | make validate-review | PASS | test -f .work_products/06_review/REVIEW_REPORT.md python3 tools/validate_review.py Review report OK |
| Makefile gates | make validate-test | PASS | /Library/Developer/CommandLineTools/usr/bin/make test-all No full test command configured yet. Replace this target with the project regression suite. python3 tools/validate_test_plan.py Test report OK: .work_products/07_test/TEST_REPORT.md |
| Makefile gates | make validate-release | PASS | /Library/Developer/CommandLineTools/usr/bin/make build No build command configured yet. Replace this target with the project build/package command. python3 tools/validate_release_plan.py Current release status OK: .work_products/08_release/CURRENT_RELEASE.md |
| Work products overview | make work-products-overview | PASS | Wrote .work_products/03_tech_plan/overview.md Wrote .work_products/04_implementation/overview.md Wrote .work_products/05_decisions/overview.md Wrote .work_products/06_review/overview.md Wrote .work_products/07_test/overview.md Wrote .work_products/08_release/overview.md Wrote .work_products/09_runbooks/overview.md Wrote .work_products/rfc/overview.md |
| Lifecycle transition | python3 tools/transition.py --to REVIEWING | PASS | Transitioned SPRINTING -> REVIEWING |
| Lifecycle transition | python3 tools/transition.py --to RFC_RECALIBRATION | PASS | Transitioned REVIEWING -> RFC_RECALIBRATION |
| Lifecycle transition | python3 tools/transition.py --to ARCHITECTING | PASS | Transitioned RFC_RECALIBRATION -> ARCHITECTING |
| Lifecycle transition | python3 tools/transition.py --to SPRINTING | PASS | Transitioned ARCHITECTING -> SPRINTING |
| Later-stage CLI validators | npx sdlc-harness validate validate-review | PASS | validate-review checked review report |
| Later-stage CLI validators | npx sdlc-harness validate validate-test | PASS | validate-test checked .work_products/07_test/TEST_REPORT.md |
| Later-stage CLI validators | npx sdlc-harness validate validate-release | PASS | validate-release checked .work_products/08_release/CURRENT_RELEASE.md |
| Later-stage CLI validators | npx sdlc-harness validate validate-rfc | PASS | validate-rfc checked 1 file(s) |
| GitHub Actions | workflow asset static coverage | PASS | static workflow asset checked; remote GitHub Actions execution is out of scope |
| Release automation | release automation static coverage | PASS | release automation writes current release status; npm publish is out of scope for consumer lab |

## Blocked Items

- None

## Defect Candidates

| ID | Area | Evidence | Impact |
|---|---|---|---|
| None |  |  |  |

## Failures

- None

## Recommended RFC

- None
