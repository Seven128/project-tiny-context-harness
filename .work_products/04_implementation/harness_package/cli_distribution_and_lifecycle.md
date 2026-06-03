# CLI Distribution and Lifecycle Implementation

## 1. 关联信息

- Domain: `harness_package`
- Module / subsystem / core flow: CLI package distribution, init/sync/upgrade/doctor lifecycle
- Updated by task: `DEV-001`, `DEV-002`, `DEV-003`, `DEV-005`, `DEV-006`, `DEV-008`, `DEV-009`, `DEV-020`, `DEV-021`, `DEV-022`, `DEV-023`, `DEV-040`, `DEV-041`, `DEV-043`, `DEV-054`, `TASK-058`, `TASK-074`
- Linked PRD: `.work_products/01_product/npm_package_distribution.md`
- Linked technical design: `.work_products/03_tech_plan/harness_package_distribution.md`
- Linked RFC: `RFC_001`, `RFC_002`, `RFC_003`, `RFC_006`, `RFC_007`, `RFC_008`, `RFC_009`
- Linked commits: historical `DEV-*` implementation commits; `DEV-043` migration commit

## 2. 当前实现范围

- `agent-project-sdlc` npm package exposes the `sdlc-harness` CLI binary.
- `init` / `init --adopt` create or adopt a Minimal Context Harness without overwriting user-owned project code.
- Fresh `init` and `init --adopt` create `project_context/global.md`, `project_context/modules/main.md`, `<harnessRoot>/config.yaml`, Minimal Context managed guidance, context templates, Makefile include, lightweight tools and GitHub workflow. They do not create lifecycle state, `plan.yaml`, stage skills, stage templates or `.work_products/**` by default.
- `sync` materializes managed Harness assets from package canonical assets into the selected `<harnessRoot>` and never performs semantic migration from old `.work_products/**`.
- `upgrade` refreshes config/schema metadata, runs safe migrations and then syncs managed assets. When legacy stage facts are detected, it prompts `migrate-context --dry-run` instead of generating Context automatically.
- `doctor` reports Harness config, managed file drift, override state and suggested gates. The displayed package version is read from the installed npm package metadata, not from project config.
- `inspect-workflow` provides a read-only workflow self-inspection command for user repos. It reports `PASS` / `WARN` / `BLOCKED` across workflow weight, fact-source alignment, handoff clarity, TESTING readiness, high-risk recovery safety and outcome comparison. Every metric declares `data_source` as `measured`, `inferred`, `self_reported` or `unavailable`.
- `examples/delivery-benchmark/` provides repo-local benchmark assets for self-testing Outcome Comparison against real from-scratch project scenarios. It is not synced into user projects and is not a public package command.
- `migrate-context` is the explicit semantic migration command. It previews by default, writes only with `--write`, preserves old `.work_products/**` / state files, and protects user-authored Context by writing generated material under `project_context/_migration/latest/**`.
- `validate-context` checks `project_context/**` recovery fields and blocks fake test-result claims. In schema v3/default projects, `validate-harness` is a compatibility alias for `validate-context`; explicit schema v2 legacy projects keep the old stage validator behavior.
- Minimal Context orientation is a documented workflow behavior, not a new CLI: new sessions, status checks and "continue/next" requests read `project_context/global.md`, relevant module Context and directly related code/tests before routing, but do not automatically run package source sync/check, full regression or legacy phase gates. Explicit validation still runs the relevant project tests or `validate-context` when Context changed.
- `Standard Thin` is the default gate thickness in common Harness guidance. Ordinary development, RFC and debug loops run focused product/domain gates plus light state checks; strict workflow gates are concentrated at task completion, pre-commit, phase transition, release, package/source/managed asset changes, public CLI / validator changes and high-risk provider/live boundaries. This is a workflow behavior change, not a new CLI or validator.
- 当前 authoring workspace 使用 `.codex` as `harnessFolderName`; `Other` agent selection still falls back to `.agent`.

## 3. 真实代码结构

| 文件（File） | 作用（Purpose） | 关键函数/对象（Key Functions/Objects） |
|---|---|---|
| `package.json` | Root workspace and package-level scripts | `workspaces`, `scripts.sdlc-harness`, `scripts.release:npm`, `sdlcHarness.harnessFolderName` |
| `packages/sdlc-harness/package.json` | npm package manifest | `name`, `version`, `bin.sdlc-harness`, `files`, `prepack` |
| `packages/sdlc-harness/src/cli.ts` | CLI process entrypoint | `main()` |
| `packages/sdlc-harness/src/commands/index.ts` | CLI command router | `commands` |
| `packages/sdlc-harness/src/commands/init.ts` | `init` adapter | `init` command parser |
| `packages/sdlc-harness/src/commands/sync.ts` | `sync` adapter | `sync` command parser |
| `packages/sdlc-harness/src/commands/upgrade.ts` | `upgrade` adapter | `upgrade` command parser |
| `packages/sdlc-harness/src/commands/doctor.ts` | `doctor` adapter | `doctor` command parser |
| `packages/sdlc-harness/src/commands/inspect-workflow.ts` | Workflow self-inspection adapter | CLI option parser, JSON / prompt output |
| `packages/sdlc-harness/src/commands/validate.ts` | Validation command adapter | `validate-*` command parser |
| `packages/sdlc-harness/src/lib/init.ts` | Project initialization and adoption | agent selection, `harnessFolderName`, scaffold writer |
| `packages/sdlc-harness/src/lib/harness-root.ts` | Harness root resolution | package/config/default precedence |
| `packages/sdlc-harness/src/lib/config.ts` | Default package config | `defaultConfig()` |
| `packages/sdlc-harness/src/lib/upgrade.ts` | Upgrade orchestration | migration runner, sync handoff |
| `packages/sdlc-harness/src/lib/migrations.ts` | Schema and compatibility migrations | `runMigrations`, legacy root/layout migration |
| `packages/sdlc-harness/src/lib/doctor.ts` | Diagnostic model | config and managed-file checks |
| `packages/sdlc-harness/src/lib/workflow-inspector.ts` | Workflow self-inspection model | measured/inferred/self-reported metrics and findings |
| `packages/sdlc-harness/src/lib/validators.ts` | Node-side Harness validators | `validate-context`, v3 `validate-harness` alias and legacy schema v2 phase validators |
| `tests/sdlc-harness/*.test.mjs` | Package regression coverage | init/sync/doctor, upgrade, root resolution, validators |

## 4. 核心数据流

```txt
User runs sdlc-harness init/init --adopt
-> choose target Agent unless explicit harness folder/config exists
-> resolve <harnessRoot>
-> write Minimal Context config and project_context/** templates
-> sync package canonical assets
-> doctor reports readiness
```

```txt
Existing project runs sdlc-harness upgrade
-> read current package/config/schema
-> run safe config/managed-layout migrations
-> sync canonical assets
-> if legacy stage facts exist, print migrate-context --dry-run guidance
-> doctor reports remaining drift or blockers
```

```txt
Operator runs sdlc-harness migrate-context --dry-run/--write
-> read README, legacy .work_products/**, ADR/decision docs, implementation docs and source/test layout
-> preview generated project_context/** by default
-> with --write, create/update managed migration blocks or write _migration/latest when user Context exists
-> never delete old legacy facts
```

## 5. 关键实现逻辑

- Agent selection happens before folder selection. `Codex` is the default and writes `.codex`; `Other` asks for a custom folder and defaults to `.agent`.
- Minimal Context scaffolding starts with durable Context, not lifecycle phases. `project_context/global.md` stores project goal, boundaries, design rationale, verification entry points, current state, next safe action and module index. `project_context/modules/*.md` stores module responsibilities, contracts, constraints, code entries and test entries.
- Explicit CLI flags are written into package config before initialization. Runtime root resolution then prefers `package.json#sdlcHarness.harnessFolderName`, falls back to `sdlc-harness.config.json#harnessFolderName`, then `.agent`.
- Managed files use package metadata blocks and merge strategies instead of blind overwrites.
- Package name and CLI name are intentionally separate: npm installs `agent-project-sdlc`, users run `sdlc-harness`.
- Migrations preserve compatibility with earlier `.harness`, `.agents` and `.agent` layouts while converging new installs on the configured `<harnessRoot>`.
- Legacy stage validators/assets remain compatibility-only. Existing schema v2 projects can still run old phase validators; schema v3 projects use `validate-context` as the default and `validate-harness` compatibility gate.
- `migrateConfig` rewrites `core.package`, deletes legacy `core.version`, and preserves `core.schema_version`. Package version is intentionally not persisted in project config because the installed package manifest is the source of truth.
- Plan migrations remove stale `current_phase` from active and draft plans, remove draft `current_task_id`, and strip duplicate `phase` / `linked_task_id` from `parallel_execution`.
- Validation commands mirror the Python Harness gates closely enough for package consumers to run health checks without depending on this authoring workspace.
- `inspect-workflow` intentionally sits beside `doctor` and `validate-*`: `doctor` checks installation health, validators check stage contracts, and `inspect-workflow` checks whether the workflow is becoming too heavy or unclear. It reuses root resolution and selected validators, but does not run phase gates as proof of completion.
- Workflow self-inspection only treats file/field counts and validator results as `measured`; context weight and handoff quality are `inferred`; recent minutes, turns, estimated tokens and outcome comparison timings are accepted only through explicit CLI options as `self_reported`; true model token telemetry is `unavailable` unless the user supplies it. This prevents the command from producing fake-precise token/time claims.
- Outcome comparison keeps the pure vibe coding baseline honest: it compares same-quality delivery, not first-code speed. `workflow_overhead_ratio` uses ordinary 30% / 50% thresholds and high-risk 40% / 60% thresholds; `vibe_handoff_delta_minutes` shows the same-quality pure-vibe delta; `net_value_minutes` includes avoided rework so a slower workflow can still be valid when it prevents downstream misses. The command does not persist these values or create an ROI audit history.
- Delivery benchmark assets keep this claim testable: scenarios define fixed requirements, staged recovery/RFC/debug materials and scoring rubrics; the runner prepares baseline/Harness run dirs as independent local git repositories with local bare remotes under `.benchmark/remote.git`, keeps initial `.benchmark/prompt.md` limited to base requirements/acceptance/gate profile, exposes later lifecycle materials only through repo-local `stage-prompt`, supports an external observer for elapsed time and file activity, records workflow-control events such as `sync`, `upgrade`, `transition.py` and `validate-*`, retains lightweight system-timed manual-boundary events through `timer-start` / `timer-stop`, and scores final evidence. Lifecycle probe scenarios can add `lifecycle_probe.md` and report `INITIAL_DELIVERY`, `RECOVERY`, `RFC`, `DEBUG`, `context_recovery_score`, `wrong_path_count` and final quality metrics to distinguish first delivery from recovery/change/debug efficiency. Scenario design is high-signal but not hacked: it targets Harness strengths while preserving same-quality baselines and invalidating runs that reuse implementation context, copy completed artifacts, pre-apply RFC/debug work, expose future probe materials early, fail run-dir git isolation/commit-push closure or selectively publish favorable numbers. The operator runbook now also requires a compact calibration ledger for repeated pilot attempts so stage-boundary failures, dirty operator artifacts, infrastructure reconnects, scoring conflicts and gate-value findings are retained as reusable protocol evidence. Observer raw logs are excluded from quality rubric evidence. Runner confidence reporting now separates high-confidence observer time from lower-confidence static keyword/path rubric evidence; `metric_confidence` includes `conclusion_eligible` so only high-confidence metrics can support core report conclusions. When a scenario-owned hidden `quality-probe` exists, summary and lifecycle final-quality score use the hidden probe as the primary quality result while static rubric failures remain supplemental evidence. The runner can also score fresh-agent takeover memos with hidden `recovery_answer_key.json` plus file-reference requirements. Repo-local `intervention-record` and `gate-record` capture automation burden and gate value as operator-side diagnostic evidence without requiring the agent under test to maintain benchmark measurement logs; they are not npm package public commands. `GATE_THINNING_ANALYSIS.md` records benefits and risks/losses for gate thinning and concludes `Standard Thin` has the best current cost/value tradeoff: focused product gates inside the loop, strict workflow gates at task/pre-commit/phase/release/package boundaries, and strict gates for high-risk provider/live work. That recommendation is now promoted into common Harness guidance while preserving same-quality gates. Raw runs stay in `/tmp` or `.artifacts/delivery-benchmark/`.
- Orientation fast path is intentionally represented in AGENTS, workflow Skills and user docs instead of a new structured field or validator. The consumer is the Agent prompt path, not a runtime tool; keeping it textual avoids a schema migration while still reducing accidental startup gates.
- `Standard Thin` is also represented in AGENTS, workflow Skills and user docs instead of a new profile field. There is not yet a machine consumer for `thin | standard | strict`, so a textual rule gives agents the intended default without adding schema or migration cost.
- CLI validators and Makefile gates resolve `<harnessRoot>` consistently, so configured-root projects such as `.workflow` can run `validate-context`, `validate-harness` and `inspect-workflow` without `.codex` assumptions.
- `validate-dev` checks `Development Self-Test Report` content against the current `self_test_contract`: it requires legal `Report Status`, Module Application Entry, Module Key Test Path, scenario results, executed gates, Observable Exit, Current Blocker, Testing Handoff Readiness and Evidence Index Refs; only accepts completion when report status and every scenario are `PASS`; rejects template module-key-path text, ambiguous status rows, missing scenario row evidence, missing required gates, embedded debug/operator/runbook/exploration log sections, `Actual Evidence` body fields, overlong reports, high-risk reports without `.work_products/09_runbooks/**` evidence refs or Current Operator Path hard constraints, high-risk implementation docs with mainline evidence dump/operator log/failed-attempt sections, unpromoted session / QR / canonical path / do-not-retry judgments, and browser reports without page URL plus browser/Playwright/screenshot evidence. When `graph_required: true` or `module_key_test_graph` is present, validators also require a single-entry DAG with valid node kinds, known edge refs, reachable scenarios, observable exits and short `evidence_ref` pointers, plus an actual `Module Key Test Graph` in the self-test report. It remains a content consistency gate, not a command execution audit.
- Legacy managed `phase_contracts.yaml` still documents the old lightweight explicit phase graph for schema v2 compatibility. In schema v3 Minimal Context projects, that policy is not part of the default managed asset set and `validate-harness` aliases `validate-context`.
- Migration is handled by existing package flows rather than a standalone migration script: `upgrade` runs sync and refreshes the managed policy/tool files, while state files remain compatible. If a consumer has local custom phase policy edits, the manual migration is to move node-local `next` / `returns` into top-level transition edges and then rerun `validate-harness`.
- Lightweight Module Key Test Graph migration is also handled without an automatic script. Existing `module_key_test_path`-only tasks remain valid; new high-risk or multi-scenario tasks are prompted to add `graph_required: true` and a DAG skeleton. Users can manually split old high-risk paths into graph nodes when better handoff quality is worth it, but no text-to-graph converter is shipped because checkpoint and exit boundaries require judgment.

## Runnable Entry/Exit

- Entry points: `sdlc-harness` CLI commands (`init`, `sync`, `upgrade`, `doctor`, `validate-*`) and the root `npm run sdlc-harness` adapter.
- Exit / side effects: writes or checks Harness state/assets, reports validator diagnostics, and never publishes or pushes by default.
- Config contract: `package.json#sdlcHarness.harnessFolderName`, `<harnessRoot>/config.yaml` (`core.package`, `core.schema_version`, managed files and local overrides), and package default config.
- Fixture/live boundary: package tests and consumer lab use local fixtures; npm registry publish/smoke remains release-stage live behavior.

## Development Evidence

- Runnable Entry: `npm test --workspace agent-project-sdlc`, `node packages/sdlc-harness/dist/cli.js inspect-workflow --json`, `node packages/sdlc-harness/dist/cli.js package sync-source`, `node packages/sdlc-harness/dist/cli.js package check-source`, `make validate-context`, `make validate-harness`, and `node tools/consumer_lab_full_test.mjs --reset-lab --markdown-report /tmp/minimal-context-consumer-lab.md --json-report /tmp/minimal-context-consumer-lab.json` are the task verification entrypoints.
- Observable Exit: `tests/sdlc-harness/sync-init-doctor.test.mjs` asserts Minimal Context init/adopt/sync/doctor/migrate behavior and v3 `validate-harness` aliasing; `tests/sdlc-harness/workflow-inspector.test.mjs` asserts `inspect-workflow` JSON/prompt output, self-reported metrics and Minimal Context validator selection; `tests/sdlc-harness/upgrade.test.mjs` asserts upgrade prompts explicit semantic migration without auto-generating Context; `tools/consumer_lab_full_test.mjs` validates the packed package in an installed consumer lab; `package check-source` output was `package source OK`.
- Basic Self-test Evidence: `npm test --workspace agent-project-sdlc` PASS with 13/13 test files; `node tools/consumer_lab_full_test.mjs --reset-lab --markdown-report /tmp/minimal-context-consumer-lab.md --json-report /tmp/minimal-context-consumer-lab.json` PASS with 30 PASS / 0 BLOCKED / 0 FAIL; `node packages/sdlc-harness/dist/cli.js package sync-source` PASS; `node packages/sdlc-harness/dist/cli.js package check-source` PASS; `make validate-context` PASS; `make validate-harness` PASS.

## 6. 与技术方案的偏移

- Earlier plans used `.harness`, `.agents` and then `.agent` as defaults; current behavior is target-agent first, with Codex mapping to `.codex`.
- Historical task docs were written under `.work_products/04_implementation/npm_package/dev_*.md`; DEV-043 migrated those facts into this module-level doc and sibling module work_products.
- TASK-058 is a bug fix to existing `upgrade` metadata persistence; it does not add a public CLI capability, so `README.md`, `packages/sdlc-harness/README.md`, `PROJECT_SPEC.md` and `tools/consumer_lab_full_test.mjs` did not require updates. Regression coverage lives in `tests/sdlc-harness/upgrade.test.mjs`.

## 7. 测试覆盖（Test Coverage）

| 测试（Test） | 覆盖范围（Coverage） | 最近记录结果（Result） |
|---|---|---|
| `npm test` | TypeScript build and package CLI regression tests | PASS for `TASK-059` on 2026-05-28 |
| `tests/sdlc-harness/sync-init-doctor.test.mjs` | Minimal Context init, adopt, sync, configured-root gates, doctor behavior and migration safety | Covers fresh/adopt `project_context/**`, no default lifecycle/stage assets, v3 `validate-harness` aliasing and `migrate-context` dry-run/write behavior |
| `tools/consumer_lab_full_test.mjs` | full installed-consumer Minimal Context smoke coverage | Covers packed-package fresh `.codex` init, adopt, `.workflow` configured root, CLI/Makefile `validate-context` / `validate-harness`, and `migrate-context` dry-run/write/protected-user-context behavior |
| `tests/sdlc-harness/upgrade.test.mjs` | migrations and automatic sync | PASS in package regression suite |
| `tests/sdlc-harness/harness-root.test.mjs` | root resolution and config precedence | PASS in package regression suite |
| `tests/sdlc-harness/validators.test.mjs` | package validators, including Development Self-Test Report content checks | PASS in package regression suite on 2026-05-30 |
| `make validate-harness` | authoring workspace Harness scaffold and docs | PASS for `DEV-054` on 2026-05-27 |
| `node packages/sdlc-harness/dist/cli.js package check-source` | package source mapping drift check | PASS for `DEV-054` on 2026-05-27 |
| `tests/sdlc-harness/sync-init-doctor.test.mjs` | generated config omits `core.version`; doctor reports installed package version from package metadata | PASS for `TASK-074` |
| `tests/sdlc-harness/upgrade.test.mjs` | upgrade removes legacy `core.version` from existing config | PASS for `TASK-074` |
| `npm test --workspace agent-project-sdlc` | TypeScript build and package regression, including stricter `validate-dev` self-test report fixtures | PASS on 2026-05-30 |
| `tests/sdlc-harness/sync-init-doctor.test.mjs` | synced managed policy contains top-level `transitions` and no canonical `next` / `returns` | Covered by package regression |
| `tests/sdlc-harness/transition.test.mjs` | graph-based transition helper, RFC/BLOCKED effects and legacy policy fallback | Covered by package regression |
| `node packages/sdlc-harness/dist/cli.js package sync-source` | package assets reflect template and README source changes | PASS on 2026-05-30; changed 48 assets |
| `node packages/sdlc-harness/dist/cli.js package check-source` | package canonical assets match source after self-test report validation changes | PASS on 2026-05-30 |
| `make work-products-overview && make validate-harness && make validate-plan` | source docs, generated overviews, scaffold and active plan after self-test report boundary hardening | PASS on 2026-05-30 |
| `npm test --workspace agent-project-sdlc` | package regression for Minimal Context defaults, v3 `validate-harness` aliasing, configured-root Context gates and explicit schema v2 legacy validators | PASS in current validation batch |
| `tools/consumer_lab_full_test.mjs` | installed-consumer validation for `.workflow` configured-root Context gates and explicit `migrate-context` behavior | PASS in current validation batch |
| `tests/sdlc-harness/workflow-inspector.test.mjs` | `inspect-workflow` report, JSON, prompt, self-reported metrics, outcome comparison and workflow-weight blockers | PASS in current validation batch |
| `tests/sdlc-harness/delivery-benchmark.test.mjs` | delivery benchmark scenario loading, run preparation, observer measurement, manual/timed event recording, scoring, report data and outcome math | PASS in current validation batch |
| `tests/sdlc-harness/orientation-fast-path.test.mjs` | AGENTS, manager/dev Skills, README/PROJECT_SPEC and synced package assets document orientation fast path without changing gate semantics | Covered by package regression |
| `tests/sdlc-harness/sync-init-doctor.test.mjs` | Minimal Context init/sync/doctor and explicit `migrate-context` safety behavior | PASS in current validation batch |
| `tests/sdlc-harness/upgrade.test.mjs` | `upgrade` syncs managed Minimal Context assets and prompts `migrate-context --dry-run` without semantic migration | PASS in current validation batch |
| `tests/sdlc-harness/validators.test.mjs` | `validate-context` verifies global/module Context shape and blocks fake test-result claims | PASS in current validation batch |
| `tests/sdlc-harness/workflow-inspector.test.mjs` | Minimal Context projects inspect with `validate-context`; legacy stage fixtures still exercise old workflow-weight diagnostics | PASS in current validation batch |
| `tools/consumer_lab_full_test.mjs --reset-lab --markdown-report /tmp/minimal-context-consumer-lab.md --json-report /tmp/minimal-context-consumer-lab.json` | installed-consumer Minimal Context default, configured-root and migration behavior | PASS on 2026-06-03; 30 PASS / 0 BLOCKED / 0 FAIL |

## 8. 变更记录（Change Log）

| 日期（Date） | Task ID | Commit | 摘要（Summary） |
|---|---|---|---|
| 2026-05-25 | `DEV-001` - `DEV-023` | Historical implementation commits | Built the npm package, CLI lifecycle, root migration and managed layout. |
| 2026-05-25 | `DEV-040` | `40552f0` | Added target-agent selection during init. |
| 2026-05-25 | `DEV-041` | `c34ad14` | Migrated the authoring workspace Harness root to `.codex`. |
| 2026-05-26 | `DEV-043` | DEV-043 implementation commit | Migrated legacy task-grain implementation docs into module-level facts. |
| 2026-05-27 | `DEV-054` | Git history | Changed fresh init lifecycle defaults from `REQUIREMENT_GATHERING` routing to `SPRINTING` developer routing. |
| 2026-05-28 | `TASK-058` | Git history | Updated upgrade config migration to refresh `core.version` from the current package version. |
| 2026-05-28 | `TASK-059` | Git history | Removed duplicate current phase state from generated and migrated plan files. |
| 2026-05-29 | `TASK-074` | Git history | Removed redundant persisted `core.version`; doctor now derives package version from installed package metadata. |
| 2026-05-30 | Direct maintenance | Git history | Strengthened `validate-dev` Development Self-Test Report content checks and documented that it is not execution-proof auditing. |
| 2026-05-30 | Self-test report boundary hardening | Git history | Added Report Status, Current Operator Path, disallowed log-section and working_notes validator coverage. |
| 2026-05-31 | Lightweight explicit phase graph | Git history | Distributed top-level phase `transitions`, package graph validation and graph-based transition helper sync behavior. |
| 2026-05-31 | Phase graph migration guidance | Git history | Clarified that consumers migrate through `upgrade` / `sync`, with manual conversion only for custom phase policies. |
| 2026-05-31 | Lightweight test path DAG | Git history | Added optional `module_key_test_graph` contract validation, prompt/template guidance and README migration notes. |
| 2026-06-01 | Workflow logic corrective batch | Current validation batch | Restored fresh init to `REQUIREMENT_GATHERING`, kept adopt at `SPRINTING`, and made Python/Makefile gates consume configured `<harnessRoot>`. |
| 2026-06-01 | Workflow self-inspection | Current validation batch | Added read-only `inspect-workflow` with data-source-labeled metrics and prompt-based self-check for real time/token inputs. |
| 2026-06-01 | Workflow outcome comparison | Current validation batch | Extended `inspect-workflow` with same-quality vibe baseline comparison, workflow overhead ratio and net avoided-rework value metrics. |
| 2026-06-01 | Delivery benchmark assets | Current validation batch | Added repo-local `examples/delivery-benchmark/` scenarios, prompts, runner and tests to self-test Outcome Comparison against from-scratch project runs. |
| 2026-06-01 | Delivery benchmark timing and report clarity | Current validation batch | Added lightweight system timer commands for benchmark events and expanded the visual report with scenario project briefs. |
| 2026-06-01 | Delivery benchmark external observer | Current validation batch | Added repo-local observer commands for benchmark elapsed time and file activity, removed baseline self-logging from the prompt, and documented measurement data sources. |
| 2026-06-01 | Delivery benchmark lifecycle efficiency probes | Current validation batch | Reworked the three pending scenarios into high-signal lifecycle probes for context recovery, cross-layer RFC/debug efficiency and provider-boundary safety, with optional `lifecycle_probe.md` prompt bundling, lifecycle score metrics and visual report sections. |
| 2026-06-02 | Delivery benchmark operator runbook | Current validation batch | Added a repo-local operator protocol for the first `project-context-recovery-lab` lifecycle pilot, including baseline/Harness isolation, observer coverage, phase timers, wrong-path scoring and calibration-only publication rules. |
| 2026-06-02 | Delivery benchmark scenario design ADR | Current validation batch | Added `ADR_008` to explain why benchmark scenarios validate same-quality lifecycle efficiency, context recovery, RFC/debug rework and provider-boundary safety instead of first-patch speed. |
| 2026-06-02 | Delivery benchmark gate fast path | Current validation batch | Added scenario gate profiles and runner gate cost breakdown so pilots distinguish orientation, product verification gates, workflow-control gates and out-of-scope package regression. |
| 2026-06-02 | Delivery benchmark honest calibration | Current validation batch | Kept unclean lifecycle pilot numbers out of the visual report and documented high-signal-not-hacked scenario design plus formal invalidation rules. |
| 2026-06-02 | Delivery benchmark staged injection | Current validation batch | Changed formal lifecycle benchmark prompts so initial delivery sees only base requirements/acceptance/gate profile, while recovery/RFC/debug materials are injected later with `stage-prompt`. |
| 2026-06-02 | Delivery benchmark metric confidence | Current validation batch | Added repo-local hidden quality probe and recovery answer-key scoring support, plus report confidence labels so static rubric and operator-scored recovery results are not overclaimed; hidden probe results are the primary quality summary when available. |
| 2026-06-02 | Delivery benchmark automation burden and gate value | Current validation batch | Added repo-local intervention and gate finding records so support-triage pilots can test whether gates reduce operator prompts, repair loops and escaped defects rather than only adding elapsed time. |
| 2026-06-02 | Delivery benchmark run-dir git isolation | Current validation batch | Updated benchmark `prepare` to initialize each run directory as an independent local git repo with a local bare remote, and clarified that observer/timer/gate-value records are operator-side measurement rather than measured-agent work. |
| 2026-06-02 | Delivery benchmark pilot calibration ledger | Current validation batch | Documented repeated pilot rerun lessons so invalidated attempts, dirty operator artifacts, infrastructure instability, scoring conflicts and gate-value findings are preserved as protocol evidence. |
| 2026-06-02 | Delivery benchmark conclusion eligibility and gate thinning analysis | Current validation batch | Added `conclusion_eligible` metric confidence semantics, published the support gate-value pilot as same-hidden-quality negative elapsed-time evidence, and added `GATE_THINNING_ANALYSIS.md` to conclude `Standard Thin` currently has the best cost/value tradeoff. |
| 2026-06-02 | Standard Thin workflow gate guidance | Current validation batch | Promoted `Standard Thin` into common Harness guidance, concentrating strict workflow gates at completion, pre-commit, phase, release, package/source and high-risk boundaries while keeping focused product gates in ordinary loops. |
| 2026-06-02 | Orientation fast path | Current validation batch | Documented general new-session/status/next-step orientation as lightweight routing rather than automatic gate execution, while preserving completion, phase-transition, commit and release gates. |
| 2026-06-03 | Minimal Context Harness vNext | Current validation batch | Changed package defaults to `project_context/**`, added `migrate-context` and `validate-context`, kept semantic migration out of `sync` / `upgrade`, and updated README, package README, PROJECT_SPEC, benchmark prompt and package assets. |
| 2026-06-03 | Minimal Context consumer lab and v3 gate alias | Current validation batch | Updated the full consumer lab to validate vNext defaults from a packed tarball, verified explicit migration behavior, and made schema v3 `validate-harness` alias `validate-context` while preserving explicit schema v2 legacy stage validation. |

## 9. 后续维护注意事项

- Future package lifecycle changes should update this document instead of creating task-grain `dev_*.md` implementation work_products.
- When CLI behavior changes, keep README user guidance, PRD acceptance criteria and package tests in sync.
- `tools/consumer_lab_full_test.mjs` keeps its fixture implementation doc aligned with the current `Development Self-Test Report` contract, including `Report Status`, while focused validator regressions live in `tests/sdlc-harness/validators.test.mjs`.
