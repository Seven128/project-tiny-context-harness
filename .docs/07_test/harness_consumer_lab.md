# Harness Consumer Lab Full Test

## Scope

- Package: `agent-project-sdlc@0.1.26`
- Source root: `/Users/momoooo/Documents/project-agent-sdlc`
- Lab repository: `/Users/momoooo/Documents/sdlc-harness-consumer-lab`
- Lab cleanup: `deleted`
- Lab commit: `fbbe20a`
- Lab tag: `not recorded`
- Started: 2026-06-01T09:10:05.763Z
- Finished: 2026-06-01T09:10:45.864Z

This script installs the package tarball into the lab, relies on package-managed `tools/**` materialization instead of copying source-repo tools directly, and deletes the lab repository after reports are written unless `--keep-lab` is set.

## Summary

- PASS: 60
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
| Package smoke | npm pack current source package | PASS | agent-project-sdlc-0.1.26.tgz |
| Package smoke | install current source tarball | PASS | added 144 packages, and audited 145 packages in 15s  103 packages are looking for funding   run `npm fund` for details  found 0 vulnerabilities  npm warn deprecated mdast@3.0.0: `mdast` was renamed to `remark` |
| CLI lifecycle | init explicit .codex root | PASS | created .codex/config.yaml created .codex/state/lifecycle.yaml created .codex/state/plan.yaml created .codex/state/plan.draft.yaml .codex/state/memory.md .docs/INDEX.md sync changed=54 skipped=2 blocked=0 init complete |
| CLI lifecycle | doctor installed workspace | PASS | harness root: .codex core package: agent-project-sdlc@0.1.26 schema version: 1 doctor complete |
| CLI lifecycle | inspect-workflow installed workspace with outcome metrics | PASS | - PASS fact_source_alignment.validate-plan: 0 [measured] - validate-plan reported no errors. - PASS testing_readiness.validate-test: unknown [unavailable] - No TESTING fact source exists yet; validate-test readiness is not evaluated for this phase. - PASS handoff_clarity.lifecycle: 0 [measured] - Lifecycle and current task pointers are coherent. - PASS recovery_safety.resume_capsule: unknown [unavailable] - No current/open task is selected. - PASS workflow_weight.actual_tokens: unknown [unavailable] - No local token telemetry was provided; inspect-workflow will not invent a precise token number. - PASS outcome.workflow_overhead_ratio: 0.17 [self_reported] - 17% of total delivery time was reported as pure workflow control cost; thresholds are 30%/50%. - PASS outcome.vibe_handoff_delta_minutes: 0 [self_reported] - Harness delivery was reported 0 minute(s) faster than or equal to the same-quality pure-vibe baseline. - PASS outcome.net_value_minutes: 10 [self_reported] - Reported same-quality vibe baseline plus avoided rework exceeds Harness delivery cost by 10 minute(s). |
| CLI lifecycle | sync idempotency | PASS | sync changed=0 skipped=16 blocked=0 |
| CLI lifecycle | upgrade idempotency | PASS | migrations changed=0 skipped=16 sync changed=0 skipped=16 blocked=0 doctor warnings=0 errors=0 |
| Managed assets | package ships root README as agent-readable docs asset | PASS | node_modules/agent-project-sdlc/assets/docs/README.md exists |
| Managed assets | expected generated files exist | PASS | 13 managed files checked |
| Managed assets | fresh init lifecycle starts in requirement gathering | PASS | lifecycle.yaml routes to pjsdlc_pm_prd |
| Managed assets | phase policy uses explicit transition graph | PASS | phase_contracts.yaml contains transitions without legacy next/returns |
| Adoption | init --adopt existing project | PASS | created .codex/config.yaml created .codex/state/lifecycle.yaml created .codex/state/plan.yaml created .codex/state/plan.draft.yaml .codex/state/memory.md .docs/INDEX.md sync changed=54 skipped=2 blocked=0 adopt mode complete |
| Configurable root | package.json#sdlcHarness.harnessFolderName | PASS | created .workflow/config.yaml created .workflow/state/lifecycle.yaml created .workflow/state/plan.yaml created .workflow/state/plan.draft.yaml .workflow/state/memory.md .docs/INDEX.md sync changed=54 skipped=2 blocked=0 adopt mode complete |
| Configurable root | CLI validator consumes configured .workflow root | PASS | validate-harness checked /Users/momoooo/Documents/sdlc-harness-consumer-lab/.artifacts/runs/configured-root-9CBAzE (.workflow) |
| Configurable root | inspect-workflow consumes configured .workflow root | PASS | - PASS fact_source_alignment.validate-plan: 0 [measured] - validate-plan reported no errors. - PASS testing_readiness.validate-test: unknown [unavailable] - No TESTING fact source exists yet; validate-test readiness is not evaluated for this phase. - PASS handoff_clarity.lifecycle: 0 [measured] - Lifecycle and current task pointers are coherent. - PASS recovery_safety.resume_capsule: unknown [unavailable] - No current/open task is selected. - PASS workflow_weight.actual_tokens: unknown [unavailable] - No local token telemetry was provided; inspect-workflow will not invent a precise token number. - PASS outcome.workflow_overhead_ratio: 0.17 [self_reported] - 17% of total delivery time was reported as pure workflow control cost; thresholds are 30%/50%. - PASS outcome.vibe_handoff_delta_minutes: 0 [self_reported] - Harness delivery was reported 0 minute(s) faster than or equal to the same-quality pure-vibe baseline. - PASS outcome.net_value_minutes: 10 [self_reported] - Reported same-quality vibe baseline plus avoided rework exceeds Harness delivery cost by 10 minute(s). |
| Configurable root | Makefile docs-overview consumes configured .workflow root | PASS | Wrote .docs/03_tech_plan/overview.md Wrote .docs/04_implementation/overview.md Wrote .docs/05_decisions/overview.md Wrote .docs/06_review/overview.md Wrote .docs/07_test/overview.md Wrote .docs/08_release/overview.md Wrote .docs/09_runbooks/overview.md Wrote .docs/rfc/overview.md |
| Configurable root | Makefile/Python gates consume configured .workflow root | PASS | OK .docs/03_tech_plan/overview.md OK .docs/04_implementation/overview.md OK .docs/05_decisions/overview.md OK .docs/06_review/overview.md OK .docs/07_test/overview.md OK .docs/08_release/overview.md OK .docs/09_runbooks/overview.md OK .docs/rfc/overview.md |
| Configurable root | phase-exit Makefile gate consumes configured .workflow root | PASS | validate-dev checked 0 task(s) /Library/Developer/CommandLineTools/usr/bin/make lint No project lint command configured yet. Replace this target with your stack-specific lint command. /Library/Developer/CommandLineTools/usr/bin/make test-current-domain No domain test command configured yet. Replace this target with focused tests for current_task_id. Running make validate-dev make validate-dev: PASS Phase exit plan OK: no open tasks |
| Configurable root | transition.py writes configured .workflow lifecycle | PASS | Transitioned SPRINTING -> REVIEWING |
| Local overrides | known Skill override appends Local Override | PASS | override appended |
| Local overrides | complete Skill override merges description and appends stripped body | PASS | full skill override merged |
| Local overrides | unknown Skill override blocks sync | PASS | sync changed=0 skipped=6 blocked=1  blocked: unknown skill override: .codex/pjsdlc_managed/override_skills/pjsdlc_unknown.md |
| Local policy overrides | *.local.yaml preserved across sync | PASS | local policy preserved |
| Toy project | node:test fixture | PASS | ℹ tests 2 ℹ suites 0 ℹ pass 2 ℹ fail 0 ℹ cancelled 0 ℹ skipped 0 ℹ todo 0 ℹ duration_ms 61.613125 |
| CLI validators | validate-harness | PASS | validate-harness checked /Users/momoooo/Documents/sdlc-harness-consumer-lab (.codex) |
| CLI validators | validate-plan | PASS | validate-plan checked 0 task(s) |
| CLI validators | validate-pm | PASS | validate-pm checked 1 file(s) |
| CLI validators | validate-uiux | PASS | validate-uiux checked 1 file(s) |
| CLI validators | validate-design | PASS | validate-design checked 2 file(s) |
| CLI validators | validate-current | PASS | validate-pm checked 1 file(s) |
| CLI validators | validate-dev final empty plan | PASS | validate-dev checked 0 task(s) |
| Makefile gates | make validate-dev accepts valid current open SPRINTING task | PASS | npx sdlc-harness validate-dev validate-dev checked 1 task(s) /Library/Developer/CommandLineTools/usr/bin/make lint No project lint command configured yet. Replace this target with your stack-specific lint command. /Library/Developer/CommandLineTools/usr/bin/make test-current-domain No domain test command configured yet. Replace this target with focused tests for current_task_id. |
| CLI validators | validate-review | PASS | validate-review checked review report |
| CLI validators | validate-test | PASS | validate-test checked .docs/07_test/TEST_REPORT.md |
| CLI validators | validate-release | PASS | validate-release checked .docs/08_release/CURRENT_RELEASE.md |
| CLI validators | validate-rfc | PASS | validate-rfc checked 1 file(s) |
| Task protocol | stale draft retained after development is rejected | PASS | validate-dev checked 0 task(s)  error: Unconsumed draft tasks remain in plan.draft.yaml: TASK-001. Promote the next draft into plan.yaml or remove already-consumed drafts before validate-dev. |
| Task protocol | done task retained in plan is rejected | PASS | validate-dev checked 1 task(s)  error: Completed task TASK-001 must not remain in plan.yaml |
| Task protocol | direct dev gate accepts current open SPRINTING task | PASS | validate-dev checked 1 task(s) |
| Task protocol | phase exit gate rejects open SPRINTING task | PASS | validate-dev checked 1 task(s) for phase exit  error: Open tasks remain: TASK-001 |
| Parallel execution | valid workflow_default native subagent contract | PASS | validate-test checked .docs/07_test/TEST_REPORT.md |
| Parallel execution | unsupported trigger is rejected | PASS | validate-test checked .docs/07_test/TEST_REPORT.md  error: parallel_execution.trigger must be user_requested or workflow_default |
| Natural-language control | static AGENTS/manager routing text | PASS | natural-language routing text present |
| Docs overview | make docs-overview before validate-harness | PASS | Wrote .docs/03_tech_plan/overview.md Wrote .docs/04_implementation/overview.md Wrote .docs/05_decisions/overview.md Wrote .docs/06_review/overview.md Wrote .docs/07_test/overview.md Wrote .docs/08_release/overview.md Wrote .docs/09_runbooks/overview.md Wrote .docs/rfc/overview.md |
| Makefile gates | make validate-harness | PASS | OK .docs/03_tech_plan/overview.md OK .docs/04_implementation/overview.md OK .docs/05_decisions/overview.md OK .docs/06_review/overview.md OK .docs/07_test/overview.md OK .docs/08_release/overview.md OK .docs/09_runbooks/overview.md OK .docs/rfc/overview.md |
| Makefile gates | make validate-current | PASS | validate-dev checked 0 task(s) /Library/Developer/CommandLineTools/usr/bin/make lint No project lint command configured yet. Replace this target with your stack-specific lint command. /Library/Developer/CommandLineTools/usr/bin/make test-current-domain No domain test command configured yet. Replace this target with focused tests for current_task_id. Running make validate-dev make validate-dev: PASS Phase exit plan OK: no open tasks |
| Makefile gates | make validate-uiux | PASS | python3 tools/validate_uiux_design.py UI/UX artifacts OK: 1 experience deliverable(s) |
| Makefile gates | make validate-review | PASS | test -f .docs/06_review/REVIEW_REPORT.md python3 tools/validate_review.py Review report OK |
| Makefile gates | make validate-test | PASS | /Library/Developer/CommandLineTools/usr/bin/make test-all No full test command configured yet. Replace this target with the project regression suite. python3 tools/validate_test_plan.py Test report OK: .docs/07_test/TEST_REPORT.md |
| Makefile gates | make validate-release | PASS | /Library/Developer/CommandLineTools/usr/bin/make build No build command configured yet. Replace this target with the project build/package command. python3 tools/validate_release_plan.py Current release status OK: .docs/08_release/CURRENT_RELEASE.md |
| Docs overview | make docs-overview | PASS | Wrote .docs/03_tech_plan/overview.md Wrote .docs/04_implementation/overview.md Wrote .docs/05_decisions/overview.md Wrote .docs/06_review/overview.md Wrote .docs/07_test/overview.md Wrote .docs/08_release/overview.md Wrote .docs/09_runbooks/overview.md Wrote .docs/rfc/overview.md |
| Lifecycle transition | python3 tools/transition.py --to REVIEWING | PASS | Transitioned SPRINTING -> REVIEWING |
| Lifecycle transition | python3 tools/transition.py --to RFC_RECALIBRATION | PASS | Transitioned REVIEWING -> RFC_RECALIBRATION |
| Lifecycle transition | python3 tools/transition.py --to SPRINTING | PASS | Transitioned RFC_RECALIBRATION -> SPRINTING |
| Later-stage CLI validators | npx sdlc-harness validate validate-review | PASS | validate-review checked review report |
| Later-stage CLI validators | npx sdlc-harness validate validate-test | PASS | validate-test checked .docs/07_test/TEST_REPORT.md |
| Later-stage CLI validators | npx sdlc-harness validate validate-release | PASS | validate-release checked .docs/08_release/CURRENT_RELEASE.md |
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
