# .docs/04_implementation overview

<!-- generated-by: AI SDLC Harness build_doc_overviews.py -->
<!-- source-hash: e145bcde6e7abd3d -->

Generated artifact. Markdown slices remain the source of truth.

Source hash: `e145bcde6e7abd3d`

## Source Slices

1. [harness_package/cli_distribution_and_lifecycle.md](harness_package/cli_distribution_and_lifecycle.md)
2. [harness_package/consumer_lab_validation.md](harness_package/consumer_lab_validation.md)
3. [harness_package/release_automation.md](harness_package/release_automation.md)
4. [harness_package/source_sync_and_assets.md](harness_package/source_sync_and_assets.md)
5. [harness_workflow/command_intent_model.md](harness_workflow/command_intent_model.md)
6. [harness_workflow/docs_overview_and_validation.md](harness_workflow/docs_overview_and_validation.md)
7. [harness_workflow/implementation_doc_model.md](harness_workflow/implementation_doc_model.md)
8. [harness_workflow/skills_prompt_and_authoring.md](harness_workflow/skills_prompt_and_authoring.md)
9. [harness_workflow/state_and_task_protocol.md](harness_workflow/state_and_task_protocol.md)

---

## harness_package/cli_distribution_and_lifecycle.md

Source: [harness_package/cli_distribution_and_lifecycle.md](harness_package/cli_distribution_and_lifecycle.md)

# CLI Distribution and Lifecycle Implementation

## 1. 关联信息

- Domain: `harness_package`
- Module / subsystem / core flow: CLI package distribution, init/sync/upgrade/doctor lifecycle
- Updated by task: `DEV-001`, `DEV-002`, `DEV-003`, `DEV-005`, `DEV-006`, `DEV-008`, `DEV-009`, `DEV-020`, `DEV-021`, `DEV-022`, `DEV-023`, `DEV-040`, `DEV-041`, `DEV-043`, `DEV-054`, `TASK-058`, `TASK-074`
- Linked PRD: `.docs/01_product/npm_package_distribution.md`
- Linked technical design: `.docs/03_tech_plan/harness_package_distribution.md`
- Linked RFC: `RFC_001`, `RFC_002`, `RFC_003`, `RFC_006`, `RFC_007`, `RFC_008`, `RFC_009`
- Linked commits: historical `DEV-*` implementation commits; `DEV-043` migration commit

## 2. 当前实现范围

- `agent-project-sdlc` npm package exposes the `sdlc-harness` CLI binary.
- `init` / `init --adopt` create or adopt a project Harness without overwriting user-owned project code.
- Fresh `init` lifecycle routes new projects to `SPRINTING` with `active_role: "developer"` and `active_skill: "pjsdlc_dev_sprint"`; generated plan files do not duplicate `current_phase`.
- `sync` materializes managed Harness assets from package canonical assets into the selected `<harnessRoot>`.
- `upgrade` refreshes `<harnessRoot>/config.yaml` package identity and schema metadata, runs schema migrations and then syncs managed assets.
- `doctor` reports Harness config, managed file drift, override state and suggested gates. The displayed package version is read from the installed npm package metadata, not from project config.
- `validate-*` commands expose package-side validation entry points for Harness state and phase artifacts.
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
| `packages/sdlc-harness/src/commands/validate.ts` | Validation command adapter | `validate-*` command parser |
| `packages/sdlc-harness/src/lib/init.ts` | Project initialization and adoption | agent selection, `harnessFolderName`, scaffold writer |
| `packages/sdlc-harness/src/lib/harness-root.ts` | Harness root resolution | package/config/env/default precedence |
| `packages/sdlc-harness/src/lib/config.ts` | Default package config | `defaultConfig()` |
| `packages/sdlc-harness/src/lib/upgrade.ts` | Upgrade orchestration | migration runner, sync handoff |
| `packages/sdlc-harness/src/lib/migrations.ts` | Schema and compatibility migrations | `runMigrations`, legacy root/layout migration |
| `packages/sdlc-harness/src/lib/doctor.ts` | Diagnostic model | config and managed-file checks |
| `packages/sdlc-harness/src/lib/validators.ts` | Node-side Harness validators | plan, lifecycle, docs and phase validators |
| `tests/sdlc-harness/*.test.mjs` | Package regression coverage | init/sync/doctor, upgrade, root resolution, validators |

## 4. 核心数据流

```txt
User runs sdlc-harness init/init --adopt
-> choose target Agent unless explicit harness folder/config exists
-> resolve <harnessRoot>
-> write config/state/docs scaffold
-> sync package canonical assets
-> doctor reports readiness
```

```txt
Existing project runs sdlc-harness upgrade
-> read current package/config/schema
-> run migrations for root names, managed layout, markers, plan/lifecycle shape
-> sync canonical assets
-> doctor reports remaining drift or blockers
```

## 5. 关键实现逻辑

- Agent selection happens before folder selection. `Codex` is the default and writes `.codex`; `Other` asks for a custom folder and defaults to `.agent`.
- New project lifecycle scaffolding starts at `SPRINTING` and allows `REVIEWING` next. Generated `plan.yaml` stores `current_task_id`, `next_task_sequence` and `tasks`; generated `plan.draft.yaml` stores only draft sequencing and tasks.
- Explicit CLI flags and existing JSON config have higher priority than interactive defaults.
- Managed files use package metadata blocks and merge strategies instead of blind overwrites.
- Package name and CLI name are intentionally separate: npm installs `agent-project-sdlc`, users run `sdlc-harness`.
- Migrations preserve compatibility with earlier `.harness`, `.agents` and `.agent` layouts while converging new installs on the configured `<harnessRoot>`.
- `migrateConfig` rewrites `core.package`, deletes legacy `core.version`, and preserves `core.schema_version`. Package version is intentionally not persisted in project config because the installed package manifest is the source of truth.
- Plan migrations remove stale `current_phase` from active and draft plans, remove draft `current_task_id`, and strip duplicate `phase` / `linked_task_id` from `parallel_execution`.
- Validation commands mirror the Python Harness gates closely enough for package consumers to run health checks without depending on this authoring workspace.
- `validate-dev` checks `Development Self-Test Report` content against the current `self_test_contract`: it requires legal `Report Status`, Module Application Entry, Module Key Test Path, scenario results, executed gates, Observable Exit, Current Blocker, Testing Handoff Readiness and Evidence Index Refs; only accepts completion when report status and every scenario are `PASS`; rejects template module-key-path text, ambiguous status rows, missing scenario row evidence, missing required gates, embedded debug/operator/runbook/exploration log sections, `Actual Evidence` body fields, overlong reports, high-risk reports without `.docs/09_runbooks/**` evidence refs or Current Operator Path hard constraints, high-risk implementation docs with mainline evidence dump/operator log/failed-attempt sections, unpromoted session / QR / canonical path / do-not-retry judgments, and browser reports without page URL plus browser/Playwright/screenshot evidence. When `graph_required: true` or `module_key_test_graph` is present, validators also require a single-entry DAG with valid node kinds, known edge refs, reachable scenarios, observable exits and short `evidence_ref` pointers, plus an actual `Module Key Test Graph` in the self-test report. It remains a content consistency gate, not a command execution audit.
- Managed `phase_contracts.yaml` now distributes a lightweight explicit phase graph: `phases` hold node contracts, top-level `transitions` hold legal directed edges and minimal effects. Package `validate-harness` rejects graph drift such as missing `transitions`, legacy `next` / `returns`, unknown targets or invalid `<suspended_phase>` usage; synced `transition.py` consumes the graph while retaining legacy fallback for older consumer policies.
- Migration is handled by existing package flows rather than a standalone migration script: `upgrade` runs sync and refreshes the managed policy/tool files, while state files remain compatible. If a consumer has local custom phase policy edits, the manual migration is to move node-local `next` / `returns` into top-level transition edges and then rerun `validate-harness`.
- Lightweight Module Key Test Graph migration is also handled without an automatic script. Existing `module_key_test_path`-only tasks remain valid; new high-risk or multi-scenario tasks are prompted to add `graph_required: true` and a DAG skeleton. Users can manually split old high-risk paths into graph nodes when better handoff quality is worth it, but no text-to-graph converter is shipped because checkpoint and exit boundaries require judgment.

## Runnable Entry/Exit

- Entry points: `sdlc-harness` CLI commands (`init`, `sync`, `upgrade`, `doctor`, `validate-*`) and the root `npm run sdlc-harness` adapter.
- Exit / side effects: writes or checks Harness state/assets, reports validator diagnostics, and never publishes or pushes by default.
- Config contract: `package.json#sdlcHarness.harnessFolderName`, `<harnessRoot>/config.yaml` (`core.package`, `core.schema_version`, managed files and local overrides), and package default config.
- Fixture/live boundary: package tests and consumer lab use local fixtures; npm registry publish/smoke remains release-stage live behavior.

## Development Evidence

- Runnable Entry: `npm test --workspace agent-project-sdlc`, `node packages/sdlc-harness/dist/cli.js package sync-source`, `node packages/sdlc-harness/dist/cli.js package check-source`, `make validate-dev`, and `make validate-harness` are the task verification entrypoints.
- Observable Exit: `tests/sdlc-harness/sync-init-doctor.test.mjs` asserts generated config omits `core.version` and `doctor` reports `core package: agent-project-sdlc@<installed package version>`; `tests/sdlc-harness/upgrade.test.mjs` asserts migrated config omits legacy `core.version`; `package check-source` output was `package source OK`.
- Basic Self-test Evidence: `npm test --workspace agent-project-sdlc` PASS with 10/10 tests; `node packages/sdlc-harness/dist/cli.js package sync-source` PASS; `node packages/sdlc-harness/dist/cli.js package check-source` PASS.

## 6. 与技术方案的偏移

- Earlier plans used `.harness`, `.agents` and then `.agent` as defaults; current behavior is target-agent first, with Codex mapping to `.codex`.
- Historical task docs were written under `.docs/04_implementation/npm_package/dev_*.md`; DEV-043 migrated those facts into this module-level doc and sibling module docs.
- TASK-058 is a bug fix to existing `upgrade` metadata persistence; it does not add a public CLI capability, so `README.md`, `packages/sdlc-harness/README.md`, `PROJECT_SPEC.md` and `tools/consumer_lab_full_test.mjs` did not require updates. Regression coverage lives in `tests/sdlc-harness/upgrade.test.mjs`.

## 7. 测试覆盖（Test Coverage）

| 测试（Test） | 覆盖范围（Coverage） | 最近记录结果（Result） |
|---|---|---|
| `npm test` | TypeScript build and package CLI regression tests | PASS for `TASK-059` on 2026-05-28 |
| `tests/sdlc-harness/sync-init-doctor.test.mjs` | init, adopt, sync and doctor behavior | PASS for `TASK-059`; asserts generated lifecycle starts at `SPRINTING` and plan files do not duplicate phase |
| `tools/consumer_lab_full_test.mjs` | full consumer lab lifecycle smoke coverage | Checks generated `.codex/state/lifecycle.yaml` routes to `pjsdlc_dev_sprint` |
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
| `make docs-overview && make validate-harness && make validate-plan` | source docs, generated overviews, scaffold and active plan after self-test report boundary hardening | PASS on 2026-05-30 |

## 8. 变更记录（Change Log）

| 日期（Date） | Task ID | Commit | 摘要（Summary） |
|---|---|---|---|
| 2026-05-25 | `DEV-001` - `DEV-023` | Historical implementation commits | Built the npm package, CLI lifecycle, root migration and managed layout. |
| 2026-05-25 | `DEV-040` | `40552f0` | Added target-agent selection during init. |
| 2026-05-25 | `DEV-041` | `c34ad14` | Migrated the authoring workspace Harness root to `.codex`. |
| 2026-05-26 | `DEV-043` | DEV-043 implementation commit | Migrated legacy task-grain implementation docs into module-level facts. |
| 2026-05-27 | `DEV-054` | Pending implementation commit | Changed fresh init lifecycle defaults from `REQUIREMENT_GATHERING` routing to `SPRINTING` developer routing. |
| 2026-05-28 | `TASK-058` | Pending implementation commit | Updated upgrade config migration to refresh `core.version` from the current package version. |
| 2026-05-28 | `TASK-059` | Pending implementation commit | Removed duplicate current phase state from generated and migrated plan files. |
| 2026-05-29 | `TASK-074` | Working tree | Removed redundant persisted `core.version`; doctor now derives package version from installed package metadata. |
| 2026-05-30 | Direct maintenance | Working tree | Strengthened `validate-dev` Development Self-Test Report content checks and documented that it is not execution-proof auditing. |
| 2026-05-30 | Self-test report boundary hardening | Working tree | Added Report Status, Current Operator Path, disallowed log-section and working_notes validator coverage. |
| 2026-05-31 | Lightweight explicit phase graph | Working tree | Distributed top-level phase `transitions`, package graph validation and graph-based transition helper sync behavior. |
| 2026-05-31 | Phase graph migration guidance | Working tree | Clarified that consumers migrate through `upgrade` / `sync`, with manual conversion only for custom phase policies. |
| 2026-05-31 | Lightweight test path DAG | Working tree | Added optional `module_key_test_graph` contract validation, prompt/template guidance and README migration notes. |

## 9. 后续维护注意事项

- Future package lifecycle changes should update this document instead of creating task-grain `dev_*.md` implementation docs.
- When CLI behavior changes, keep README user guidance, PRD acceptance criteria and package tests in sync.
- `tools/consumer_lab_full_test.mjs` keeps its fixture implementation doc aligned with the current `Development Self-Test Report` contract, including `Report Status`, while focused validator regressions live in `tests/sdlc-harness/validators.test.mjs`.

---

## harness_package/consumer_lab_validation.md

Source: [harness_package/consumer_lab_validation.md](harness_package/consumer_lab_validation.md)

# Consumer Lab Validation Implementation

## 1. Linked Facts

- Domain: `harness_package`
- Module / subsystem / core flow: installed-consumer workflow validation
- Updated by task: `DEV-051`, `DEV-052`, `TASK-057`, `TASK-060`
- Linked technical design: `.docs/03_tech_plan/harness_package_distribution.md`
- Linked test evidence: `.docs/07_test/harness_consumer_lab.md`
- External lab repository: `/Users/momoooo/Documents/sdlc-harness-consumer-lab`
- Latest scripted lab evidence commit: not recorded for the 2026-05-27 cleanup run
- Latest scripted lab evidence tag: not recorded for the 2026-05-27 cleanup run

## 2. What Was Built

`DEV-051` created a long-lived local consumer lab repository and installed the current source tarball `agent-project-sdlc@0.1.7` through npm. The lab keeps its own git history and a tiny toy JavaScript module so Harness behavior can be exercised against a real consumer workspace instead of only in source-repo unit fixtures.

`DEV-052` persisted that manual flow as `tools/consumer_lab_full_test.mjs`, an authoring-only full-lab runner. The script packages the current source workspace, installs the tarball into a consumer repository, exercises the documented package capability surface, writes JSON/Markdown reports, and classifies outcomes as `PASS`, `BLOCKED`, or `FAIL`.

The lab repository contains:

- Packaged Harness assets generated by `npx sdlc-harness init --harness-folder .codex`.
- A local Skill override under `.codex/pjsdlc_managed/override_skills/`.
- Product, architecture, technical plan, implementation, review, test, release, and RFC documents for a toy text summary helper.
- `src/stringStats.js` and `tests/stringStats.test.mjs`.

The script interface is:

```sh
node tools/consumer_lab_full_test.mjs --report-only --lab-dir /Users/momoooo/Documents/sdlc-harness-consumer-lab
node tools/consumer_lab_full_test.mjs --report-only --commit-lab --lab-dir /Users/momoooo/Documents/sdlc-harness-consumer-lab
```

Key options:

- `--lab-dir <path>` selects the long-lived consumer lab.
- `--reset-lab` explicitly deletes and recreates the lab.
- By default, the script deletes the lab repository after reports are written.
- `--keep-lab` explicitly keeps the lab for debugging.
- `--report-only` writes reports and exits 0 even when the result is `BLOCKED`.
- `--commit-lab` explicitly creates a local lab evidence commit and tag, and requires `--keep-lab`.
- `--json-report <path>` and `--markdown-report <path>` override report destinations.

## Runnable Entry/Exit

- Entry points: `node tools/consumer_lab_full_test.mjs` with optional lab/report flags.
- Exit / side effects: creates a temporary consumer repository, installs the local package tarball, writes JSON/Markdown reports, and deletes the lab unless `--keep-lab` is set.
- Config contract: script CLI flags plus the generated consumer `package.json#sdlcHarness.harnessFolderName`.
- Fixture/live boundary: authoring-only installed-consumer fixture; no external publish, tag, push or production deployment occurs unless explicitly requested by script flags.

## 3. Verified Behavior

- Package smoke: `npm pack` and tarball install into the lab.
- Init/adopt/root selection: `init --harness-folder .codex`, `init --adopt`, and `package.json#sdlcHarness.harnessFolderName`.
- Lifecycle commands: `doctor`, `sync`, `upgrade`, and supported CLI validators.
- Managed assets: `AGENTS.md`, `Makefile`, `tools/*.py`, `.codex/state/**`, `.codex/skills/**`, `.codex/pjsdlc_managed/**`, and `.github/workflows/harness.yml`.
- Local customization: Skill override append, unknown Skill override blocking, and local policy preservation.
- Workflow fixtures: PRD, architecture, technical plan, implementation, review, test, release, and RFC docs for the toy helper.
- Design fixture: `plan.draft.yaml` references the toy technical plan through `docs.tech_plan`, so installed-consumer `validate-design` covers the strengthened design slicing contract.
- Protocol checks: retained done task rejection, retained open task rejection, valid workflow-default Codex native subagent `parallel_execution`, and invalid unsupported trigger rejection.
- Static checks: natural-language routing text, GitHub workflow asset, and release automation script presence.

## 4. Implementation Findings

The lab previously exposed a package boundary issue: installed consumers received Make targets and workflow instructions that invoked `tools/*.py`, but those tools were not included in package assets or generated into the consumer repository.

`TASK-082` closes that boundary for Python workflow tools by distributing `tools/*.py` as package-managed assets and verifying that installed consumers can run Makefile gates, docs overview generation and lifecycle transition commands without copying source-repo tools directly.

The package now has two compatible validation surfaces:

- Package CLI validators, which work for `validate-harness`, `validate-current`, `validate-plan`, `validate-pm`, `validate-design`, `validate-dev`, `validate-review`, `validate-test`, `validate-release`, and `validate-rfc`.
- Generated Make targets, which use package-managed `tools/*.py` in the consumer repository for lifecycle gates and overview generation.

The scripted report also produces defect candidates and a recommended RFC title whenever `BLOCKED` items remain. This makes the expected follow-up explicit: every full-lab run that finds package behavior gaps should feed RFC recalibration before bug-fix `TASK-*` development tasks.

## 5. Verification

| Command | Result |
|---|---|
| `npm test` | PASS |
| `npm test --workspace agent-project-sdlc` | PASS for TASK-060 package validator regression; 9 tests passed |
| `node packages/sdlc-harness/dist/cli.js package check-source` | PASS |
| `node tools/consumer_lab_full_test.mjs --report-only --reset-lab --lab-dir /Users/momoooo/Documents/sdlc-harness-consumer-lab` | PASS for TASK-060 script execution; CLI `validate-design` PASS; report decision BLOCKED due known Makefile/tools package gap; 37 PASS / 7 BLOCKED / 0 FAIL; lab deleted after run |
| `npm test --workspace agent-project-sdlc` | PASS for TASK-082; consumer lab script regression now treats missing package-managed tools as FAIL and checks `tools/transition.py` as an expected managed asset. |
| `test ! -e /Users/momoooo/Documents/sdlc-harness-consumer-lab` | PASS after default full lab run |
| Lab supported package capability subset | PASS after `TASK-082` regression coverage for managed tools. |
| Lab full documented workflow | Missing `tools/**` is no longer an expected BLOCKED category; future missing tool failures are defects. |

## 6. Follow-up

The selected consumer contract is to distribute required Python workflow tools into consumer repositories as package-managed `tools/*.py`. A future RFC may still choose to replace Makefile internals with more package CLI calls, but that is no longer required to close the missing-tools blocker.

Any change to package public behavior, README capabilities, validators, Makefile assets, workflow Skills, sync/upgrade, migrations, release automation, or docs overview generation must also check whether `tools/consumer_lab_full_test.mjs` and `tests/sdlc-harness/**` need updates.

---

## harness_package/release_automation.md

Source: [harness_package/release_automation.md](harness_package/release_automation.md)

# Release Automation Implementation

## 1. 关联信息

- Domain: `harness_package`
- Module / subsystem / core flow: npm release automation and registry smoke
- Updated by task: `DEV-033`, `DEV-035`, `DEV-042`, `DEV-043`, `DEV-047`, `DEV-048`, `TASK-069`
- Linked PRD: `.docs/01_product/npm_package_distribution.md`
- Linked technical design: `.docs/03_tech_plan/harness_package_distribution.md`
- Linked RFC: none
- Linked commits: `DEV-033`, `DEV-035`, `DEV-042` implementation commits; `DEV-043` migration commit; `338b4b5`; `DEV-048` implementation commit

## 2. 当前实现范围

- `tools/release_npm.mjs` automates npm package version bump, gates, publish, registry verification, installed-consumer smoke and current-release status generation.
- `npm run release:npm` is the root script entrypoint.
- The script defaults to prepare/check mode; real publishing requires `--publish --yes`.
- Release evidence is written to `.docs/08_release/CURRENT_RELEASE.md`; each release overwrites the current status instead of creating a versioned docs ledger.
- `packages/sdlc-harness/README.md` is included in the package `files` list so npm displays public install, command, workflow and Skill override documentation.
- Root `README.md` is packaged as `assets/docs/README.md` so installed-package agents can inspect the full user guide from `node_modules` without changing consumer project files.
- Git commit, tag and push remain outside the release script and are handled by the SPRINTING task protocol.

## Runnable Entry/Exit

- Entry points: `npm run release:npm -- --version <value>` with optional `--publish --yes`.
- Exit / side effects: prepare mode runs gates and writes the current release status; publish mode can bump package version, publish to npm and perform registry smoke.
- Config contract: package metadata, npm auth/environment, release script flags and Harness docs paths.
- Fixture/live boundary: default behavior is non-publishing prepare/check; live npm publication requires explicit `--publish --yes`.

## 3. 真实代码结构

| 文件（File） | 作用（Purpose） | 关键函数/对象（Key Functions/Objects） |
|---|---|---|
| `tools/release_npm.mjs` | Release automation entrypoint | version resolution, gate runner, publish, smoke, current release status writer |
| `package.json` | Root script adapter | `scripts.release:npm` |
| `packages/sdlc-harness/package.json` | Package version and publish metadata | `version`, `files`, `bin`, `prepack` |
| `packages/sdlc-harness/README.md` | npm registry README | public capability list, command examples, Skill override usage |
| `packages/sdlc-harness/assets/docs/README.md` | Packaged root README asset | agent-readable full user guide copied from root `README.md` |
| `package-lock.json` | Workspace lock version record | `packages/sdlc-harness.version` |
| `.docs/08_release/CURRENT_RELEASE.md` | Current release status | release notes, smoke evidence, deployment checklist, rollback plan, known issues |

## 4. 核心数据流

```txt
npm run release:npm -- --version patch --publish --yes
-> resolve next version from local package and npm registry
-> npm version --workspace agent-project-sdlc --no-git-tag-version
-> npm test
-> package check-source
-> npm pack --dry-run --json
-> npm publish
-> npm view latest verification
-> temporary consumer install smoke
-> write .docs/08_release/CURRENT_RELEASE.md
-> make docs-overview
-> make validate-harness
-> git diff --check
```

## 5. 关键实现逻辑

- The script refuses accidental publish unless both `--publish` and `--yes` are present.
- Version selection can be explicit or semantic (`patch`, `minor`, `major`) and is checked against the npm registry.
- Registry smoke validates the published package by installing it into a temporary consumer and running package commands.
- `CURRENT_RELEASE.md` is the active release status fact source. Historical release evidence is reconstructed from git tags, npm registry metadata, CI logs and release commits when explicitly needed.
- Commit and tag creation remain manual/task-driven so release automation cannot bypass Harness task ledger rules.

## 6. 与技术方案的偏移

- The original package plan expected publish evidence to be created manually in the release stage. DEV-035 added a script because repeated package publishing became deterministic enough to automate.
- DEV-042 used the script flow to publish `agent-project-sdlc@0.1.5`.

## 7. 测试覆盖（Test Coverage）

| 测试（Test） | 覆盖范围（Coverage） | 最近记录结果（Result） |
|---|---|---|
| `node --check tools/release_npm.mjs` | Script syntax | PASS for `TASK-069` |
| `npm test --workspace agent-project-sdlc` | Package build and validator tests | PASS for `TASK-069` |
| `node packages/sdlc-harness/dist/cli.js package sync-source` | Asset sync after release Skill/template/README changes | PASS for `TASK-069` |
| `node packages/sdlc-harness/dist/cli.js package check-source` | Asset drift before publish | PASS for `TASK-069` |
| `node tools/consumer_lab_full_test.mjs` | Installed-consumer release validator and static release automation coverage | PASS for command exit; report decision `BLOCKED` with 38 PASS, 7 known Makefile/tools blockers and 0 FAIL |
| `make docs-overview` | Release and implementation overview refresh | PASS for `TASK-069` |
| `make validate-harness` | Prompt language and overview consistency | PASS for `TASK-069` |
| `npm pack --dry-run --json --workspace agent-project-sdlc` | Tarball content and metadata | PASS during release tasks |
| `npm publish --workspace agent-project-sdlc` | Registry publish | PASS for `v0.1.3` through `v0.1.7` |
| `npm view agent-project-sdlc version dist-tags.latest dist.integrity --json` | Registry verification | PASS for `v0.1.7` |
| `npm view agent-project-sdlc readme --json` | Registry README publication | PASS for `v0.1.7` |
| Temporary installed-consumer smoke | Published package install and CLI smoke | PASS during release tasks through `v0.1.7` |

## 8. 变更记录（Change Log）

| 日期（Date） | Task ID | Commit | 摘要（Summary） |
|---|---|---|---|
| 2026-05-25 | `DEV-033` | Historical implementation commit | Published `agent-project-sdlc@0.1.3` with release evidence. |
| 2026-05-25 | `DEV-035` | Historical implementation commit | Added `tools/release_npm.mjs` release automation. |
| 2026-05-26 | `DEV-042` | `873966d` | Released `agent-project-sdlc@0.1.5`. |
| 2026-05-26 | `DEV-043` | DEV-043 implementation commit | Moved release-flow facts out of the old `npm_package` implementation-doc directory. |
| 2026-05-26 | `DEV-047` | `338b4b5` | Released `agent-project-sdlc@0.1.6`. |
| 2026-05-26 | `DEV-048` | DEV-048 implementation commit | Released `agent-project-sdlc@0.1.7` with package README registry data and public capability coverage. |
| 2026-05-27 | Direct user request | Working tree | Added root README to package assets for installed-package agent reads. |
| 2026-05-29 | `TASK-069` | Working tree | Changed release docs to a single `.docs/08_release/CURRENT_RELEASE.md` current-state contract with legacy validator compatibility. |

## 9. 后续维护注意事项

- Keep the release script conservative; publishing must remain explicit.
- If release evidence format changes, update `tools/release_npm.mjs`, `validate-release`, package validators, release Skill/template and `.docs/08_release/CURRENT_RELEASE.md` expectations together.

---

## harness_package/source_sync_and_assets.md

Source: [harness_package/source_sync_and_assets.md](harness_package/source_sync_and_assets.md)

# Source Sync and Package Assets Implementation

## 1. 关联信息

- Domain: `harness_package`
- Module / subsystem / core flow: package canonical assets, source sync, managed file materialization
- Updated by task: `DEV-001`, `DEV-004`, `DEV-006`, `DEV-012`, `DEV-013`, `DEV-021`, `DEV-022`, `DEV-023`, `DEV-027`, `DEV-037`, `DEV-038`, `DEV-039`, `DEV-043`, `TASK-073`, `TASK-082`
- Linked PRD: `.docs/01_product/npm_package_distribution.md`
- Linked technical design: `.docs/03_tech_plan/harness_package_distribution.md`
- Linked RFC: `RFC_001`, `RFC_007`, `RFC_008`, `RFC_009`, `RFC_013`, `RFC_025`
- Linked commits: historical `DEV-*` implementation commits; `DEV-043` migration commit

## 2. 当前实现范围

- The authoring workspace is the source of truth for `AGENTS.md`, root `README.md`, workflow Skills, templates, policies, Makefile include assets, user-side Python tools and GitHub workflow assets.
- `package sync-source` copies or extracts those source files into `packages/sdlc-harness/assets/**`.
- `package check-source` verifies that package assets have not drifted from authoring sources.
- User-project `sync` materializes package assets into the configured `<harnessRoot>` and project root using managed strategies, including project-root `tools/*.py` workflow helpers.
- Authoring-only Skills under `<harnessRoot>/skills/authoring/**` are excluded from package assets.
- User-owned Markdown files may contain fixed package-managed sections. `sync` / `upgrade` update only `memory.md#Harness Guidance` and `.docs/INDEX.md#Harness Maintenance Rules`, while preserving user memory entries, artifact maps and links outside those sections.
- The default GitHub workflow is safely upgradable only when the file has `pjsdlc:sdlc-harness:github-workflow:*` markers or still exactly matches the old generated workflow without markers; customized no-marker workflows are skipped and reported as `customized`.

## 3. 真实代码结构

| 文件（File） | 作用（Purpose） | 关键函数/对象（Key Functions/Objects） |
|---|---|---|
| `packages/sdlc-harness/source-mappings.yaml` | Source-to-asset manifest | `source_mappings`, `mode`, `exclude` |
| `packages/sdlc-harness/src/commands/package-source.ts` | Package source command adapter | `package sync-source`, `package check-source` |
| `packages/sdlc-harness/src/lib/package-source.ts` | Source sync/check implementation | copy/extract/check modes, exclude handling |
| `packages/sdlc-harness/src/lib/sync-engine.ts` | User-project materialization engine | managed strategies, marker handling |
| `packages/sdlc-harness/src/lib/managed-file.ts` | Managed metadata blocks | `pjsdlc:sdlc-harness:*` markers |
| `packages/sdlc-harness/src/lib/user-owned-sections.ts` | User-owned Markdown section sync | `syncProjectGuidanceSections`, `syncMemoryGuidanceSection`, `syncDocsIndexMaintenanceSection` |
| `packages/sdlc-harness/src/lib/migrations.ts` | Upgrade migrations | legacy seed guidance migration, default managed file migration |
| `packages/sdlc-harness/src/lib/init.ts` | New project seeds | initial state and docs plus guidance section merge |
| `packages/sdlc-harness/assets/**` | Package canonical assets | generated from authoring source by `package sync-source` |
| `packages/sdlc-harness/assets/tools/**` | Packaged user-side Python tools | copied from source `tools/*.py`, excluding authoring-only `.mjs` scripts |
| `packages/sdlc-harness/assets/docs/README.md` | Packaged agent-readable user guide | copied from root `README.md`, shipped in npm package but not auto-materialized into user project root |
| `tools/*.py` | Authoring source for user-side workflow tools | transition helper, validators, status and overview generation |
| `.codex/skills/**` | Authoring source for workflow Skills | `pjsdlc_*`, `authoring/**` exclusion boundary |
| `.codex/pjsdlc_managed/**` | Authoring source for templates, policies and Makefile include | `templates`, `policies`, `make` |
| `.github/workflows/harness.yml` | Authoring source for package CI asset | workflow asset mapping |
| `tests/sdlc-harness/package-source.test.mjs` | Regression tests for source sync and drift checks | source mapping, excludes, check-source |

## 4. 核心数据流

```txt
Author edits Harness source files
-> sdlc-harness package sync-source
-> package assets are regenerated
-> sdlc-harness package check-source verifies no drift
-> npm package ships assets
-> user project runs sdlc-harness sync/upgrade
-> managed assets materialize into <harnessRoot>, root files and tools/*.py
-> package-managed sections in user-owned Markdown files are merged by heading
-> marker-managed or exact-old GitHub workflow is updated; customized workflow is skipped
```

## 5. 关键实现逻辑

- `AGENTS.md` is synced as an extracted managed block, so project-specific text outside the block remains user-owned.
- Root `README.md` is copied into `assets/docs/README.md` so installed packages expose the full user guide to agents without overwriting a consumer repository README.
- Skills are distributed under `<harnessRoot>/skills`, policies/templates live under `<harnessRoot>/pjsdlc_managed`, and user-side Python workflow helpers are distributed under project-root `tools/`.
- The package keeps a hard source mapping manifest, not a runtime scan of arbitrary repository paths.
- `copy-tree` supports exclude patterns so authoring-only material stays local to this repository.
- The tools source mapping copies `tools/*.py` into `packages/sdlc-harness/assets/tools/**` and excludes authoring-only `consumer_lab_full_test.mjs` / `release_npm.mjs`; `sync` copies those assets into user projects.
- Makefile integration is an include block, allowing project-specific targets to win on name conflicts.
- The current package does not guarantee native skill hydration for every Agent. It distributes files in the chosen root and exposes Harness soft routing through `AGENTS.md`.
- `memory.md#Harness Guidance` and `.docs/INDEX.md#Harness Maintenance Rules` use Markdown headings as the package-owned merge boundary. The merge replaces the managed section when present, appends it when missing, and removes known legacy untitled memory guidance / exact legacy index maintenance text to avoid duplicates.
- `sync` runs user-owned guidance section sync regardless of `managed_files` so older configs receive the sections after package updates. `upgrade` also runs the same merge during migrations before its normal sync pass.
- Config migration now backfills the `.github/workflows/harness.yml` managed file entry for older projects, so the safe workflow migration path is reachable after upgrade.
- Config migration now also backfills `tools` as a managed file entry for older projects, so `upgrade` can refresh stale user-side workflow helpers such as `tools/transition.py`.
- The sync CLI and upgrade report print customized workflow skips without treating them as blockers.

## Runnable Entry/Exit

- Entry points: `sdlc-harness package sync-source`, `sdlc-harness package check-source`, user-project `sdlc-harness init`, `sdlc-harness sync`, and `sdlc-harness upgrade`.
- Exit / side effects: source sync rewrites package assets from authoring sources; check-source reports drift without writing; init/sync/upgrade merge package-managed guidance sections into `memory.md` and `.docs/INDEX.md`, materialize `tools/*.py`, and write marker-managed or exact-old generated workflow files while skipping customized no-marker workflows.
- Config contract: `packages/sdlc-harness/source-mappings.yaml`, `<harnessRoot>/config.yaml`, and managed-file metadata markers.
- Fixture/live boundary: package-source tests use temporary fixtures; real package asset updates happen only in the authoring workspace.

## Development Evidence

- Evidence Level: `local_runtime`.
- Target Runtime Environment: `local`; no external services, credentials or deployed runtime are required.
- Runnable Entry: `npm test --workspace agent-project-sdlc`, `node packages/sdlc-harness/dist/cli.js package sync-source`, `node packages/sdlc-harness/dist/cli.js package check-source`, `make validate-harness`, `make validate-rfc` and `make validate-dev` from the repository root.
- Observable Exit: package tests passed 10/10; package source check returned `package source OK`; `packages/sdlc-harness/assets/tools/transition.py` contains `RFC_INTERRUPT_SOURCES`; init/sync/upgrade tests prove `tools/transition.py` is materialized and stale copies are replaced.
- Client / Server Initialization: not applicable for servers; local CLI initialization is `npm install` workspace dependencies plus `npm test --workspace agent-project-sdlc` build.
- Config Contract: default `<harnessRoot>/config.yaml` includes `path: "tools"` with `strategy: "managed"`; upgrade migration backfills the same managed file entry.
- Testing Handoff Readiness: Review/Testing can inspect `tools/transition.py`, `packages/sdlc-harness/assets/tools/**`, `tests/sdlc-harness/transition.test.mjs`, package source tests and consumer lab script output.
- Known Missing Runtime Boundaries: none for this local CLI/package workflow; deployed runtime is out of scope.
- Basic Self-test Evidence: Development Self-Test Report below records the executed gates and scenario results for `TASK-082`.

## Development Self-Test Report

- Contract Source: `.docs/rfc/RFC_025_later_stage_rfc_routing_and_tools_distribution.md#8-development-self-test-impact`
- Scenario Results: `transition-rfc-interrupt` PASS; `package-tools-materialization` PASS.
- Executed Gates: `npm test --workspace agent-project-sdlc` PASS; `node packages/sdlc-harness/dist/cli.js package sync-source` PASS; `node packages/sdlc-harness/dist/cli.js package check-source` PASS; `make validate-harness` PASS; `make validate-rfc` PASS; `make validate-dev` PASS.
- Module Key Test Path: `npm test --workspace agent-project-sdlc; python3 tools/transition.py fixture calls in tests/sdlc-harness/transition.test.mjs` starts by building package `dist`, runs node:test package-source/init/sync/upgrade/transition fixtures, verifies `transition-rfc-interrupt` through direct `tools/transition.py` fixture calls for `SPRINTING` / `REVIEWING` / `TESTING` / `RELEASING -> RFC_RECALIBRATION`, illegal pre-development RFC entry, normal `REVIEWING -> TESTING`, and `RFC_RECALIBRATION -> SPRINTING`; the same run verifies `package-tools-materialization` through source mapping, init/sync, stale tool replacement and upgrade backfill assertions.
- Actual Evidence: package regression output reported 10 pass / 0 fail; package source check reported `package source OK`; Harness gates reported RFC artifacts OK, generated overview freshness and allowed path validation.
- Missing / Blockers: none.
- Testing Handoff Readiness: PASS; Review/Testing can rerun the commands above without external services.

## 6. 与技术方案的偏移

- Legacy package layouts referenced `.harness/managed`, `.agents/skills` and `.agent/managed`; current generated assets use `<harnessRoot>/skills` and `<harnessRoot>/pjsdlc_managed`.
- DEV-043 removed the legacy implementation-doc directory as an active asset/documentation target; source sync does not treat `.docs/04_implementation/npm_package/**` as a maintained path.

## 7. 测试覆盖（Test Coverage）

| 测试（Test） | 覆盖范围（Coverage） | 最近记录结果（Result） |
|---|---|---|
| `node packages/sdlc-harness/dist/cli.js package sync-source` | Regenerate package canonical assets from authoring source | PASS for `TASK-059`; changed 25 assets |
| `node packages/sdlc-harness/dist/cli.js package check-source` | Asset drift detection | PASS for `TASK-059` |
| `tests/sdlc-harness/package-source.test.mjs` | Mapping modes, excludes and drift errors | PASS in `npm test` |
| `make validate-harness` | Prompt language and generated overview consistency | PASS for DEV-043 |
| `tests/sdlc-harness/sync-init-doctor.test.mjs` | Init/sync generation of memory/index guidance sections, preservation of user content and workflow markers | PASS for `TASK-073` |
| `tests/sdlc-harness/upgrade.test.mjs` | Legacy memory seed migration, missing/custom memory behavior, old generated workflow migration and custom workflow skip | PASS for `TASK-073` |
| `npm test --workspace agent-project-sdlc` | Package regression including sync/init/upgrade safety | PASS for `TASK-073`; 10 tests passed |
| `node packages/sdlc-harness/dist/cli.js package sync-source` | README and GitHub workflow package assets reflect source changes | PASS for `TASK-073` |
| `node packages/sdlc-harness/dist/cli.js package check-source` | Package canonical assets match source after TASK-073 | PASS for `TASK-073` |
| `tests/sdlc-harness/package-source.test.mjs` | `tools/*.py` source mapping and `.mjs` authoring script exclusion | PASS for `TASK-082` |
| `tests/sdlc-harness/sync-init-doctor.test.mjs` | init/sync materializes and refreshes `tools/transition.py` | PASS for `TASK-082` |
| `tests/sdlc-harness/upgrade.test.mjs` | upgrade backfills `tools` managed file and replaces stale `tools/transition.py` | PASS for `TASK-082` |
| `npm test --workspace agent-project-sdlc` | Package regression for managed tools distribution and transition routing | PASS for `TASK-082`; 10 tests passed |
| `node packages/sdlc-harness/dist/cli.js package sync-source` | Package assets include `assets/tools/*.py` and updated README asset | PASS for `TASK-082`; changed 45 assets |
| `node packages/sdlc-harness/dist/cli.js package check-source` | Package canonical assets match source after tools distribution changes | PASS for `TASK-082` |

## 8. 变更记录（Change Log）

| 日期（Date） | Task ID | Commit | 摘要（Summary） |
|---|---|---|---|
| 2026-05-25 | `DEV-001`, `DEV-004` | Historical implementation commits | Introduced source mappings and package source sync/check commands. |
| 2026-05-25 | `DEV-006` - `DEV-023` | Historical implementation commits | Migrated roots, markers and managed layout to the current package asset shape. |
| 2026-05-25 | `DEV-037` - `DEV-039` | Historical implementation commits | Added authoring Skill boundary and excluded authoring assets from package sync. |
| 2026-05-26 | `DEV-043` | DEV-043 implementation commit | Consolidated source-sync implementation facts from legacy task docs. |
| 2026-05-27 | Direct user request | Working tree | Added root README as a packaged docs asset for installed-package agent reads. |
| 2026-05-28 | `TASK-059` | Pending implementation commit | Synced source changes that remove duplicate phase/task state from distributed assets. |
| 2026-05-29 | `TASK-073` | Working tree | Added package-managed heading sections for user-owned memory/index files and safe marker/exact-old GitHub workflow migration. |
| 2026-05-30 | `TASK-082` | Working tree | Added package-managed `tools/*.py` distribution, tools config backfill, source mapping coverage and init/sync/upgrade tests for refreshed `tools/transition.py`. |

## 9. 后续维护注意事项

- Any change to `.codex/skills/**`, `.codex/pjsdlc_managed/**`, `AGENTS.md`, root `README.md`, Makefile include, `tools/*.py` or CI asset source should be followed by `package sync-source` and `package check-source`.
- If an operation becomes repetitive and deterministic, prefer extracting it into a script and documenting the script here instead of keeping it as manual release/development lore.

---

## harness_workflow/command_intent_model.md

Source: [harness_workflow/command_intent_model.md](harness_workflow/command_intent_model.md)

# Command Intent Model Implementation Doc

## 1. 关联信息

- Domain: `harness_workflow`
- Module / subsystem / core flow: natural language and command alias routing
- Updated by task: `DEV-034`, `DEV-036`, `DEV-043`, `DEV-050`, `TASK-057`, `TASK-061`
- Linked PRD: `.docs/01_product/npm_package_distribution.md` (`PRD-NPM-026`, `PRD-NPM-028`)
- Linked technical design: `.docs/03_tech_plan/harness_package_distribution.md`
- Linked RFC: `RFC_015`
- Linked commit: `DEV-034` implementation commit, `DEV-036` implementation commit, `DEV-050` implementation commit

## 2. 当前实现范围

- 新增（Added）:
  - 自然语言意图和 `/xxx` 宏指令别名作为同一组 workflow action 的双入口协议。
  - `/xxx` 宏指令作为更完整、更细节的提示词别名；简单自然语言作为低成本意图入口。
  - `/prd` 产品方案入口和 `/design` 架构/技术方案入口。
  - `/dev` 单任务开发闭环和 `/devloop` 连续开发循环语义。
  - `/review`、`/test`、`/release` 和 `/rfc` 也通过 `TASK-*` open task 做小步恢复和阶段 gate 管控。
  - `ARCHITECTING` 中的 `/prd` 或“需求要改”可以在开发前回到 `REQUIREMENT_GATHERING`，由 PM workflow 修改 PRD。
  - `/plan`、`/goal` 与 Harness workflow 的配合边界说明。
  - 每个阶段 task 默认映射到 parallel eligibility check；安全可拆时创建 `parallel_execution.trigger: "workflow_default"` 合同，用户显式要求并行、多 agent 或多 worktree 时使用 `trigger: "user_requested"`。
- 修改（Changed）:
  - `AGENTS.md`、`README.md`、`PROJECT_SPEC.md` 的日常控制说明。
  - `pjsdlc_manager` 的路由规则。
  - `pjsdlc_dev_sprint` 的开发入口规则。
  - PRD 和技术方案中的 Natural Language Control 契约。
- 未覆盖（Not covered）:
  - 不实现 CLI 子命令 `/prd`、`/design`、`/dev` 或 `/devloop`；它们是 Agent 对话层宏指令，不是 `sdlc-harness` binary 参数。
  - 不自动开启 Codex 原生 `/plan` 或 `/goal` 模式。

## Runnable Entry/Exit

- Entry points: Agent natural-language requests and `/status`, `/next`, `/advance`, `/prd`, `/design`, `/dev`, `/devloop`, `/review`, `/test`, `/release`, `/rfc` macro aliases.
- Exit / side effects: selected workflow Skill updates bounded facts, gates and commits according to the active lifecycle phase.
- Config contract: `.codex/state/lifecycle.yaml`, `.codex/state/plan.yaml`, `AGENTS.md` routing rules and `phase_contracts.yaml`.
- Fixture/live boundary: conversation-level routing protocol; no standalone product runtime or CLI endpoint is introduced.

## 3. 真实代码结构

| 文件（File） | 作用（Purpose） | 关键函数/对象（Key Functions/Objects） |
|---|---|---|
| `AGENTS.md` | Agent 入口协议 | 自然语言与宏指令、`/prd`、`/design`、`/dev`、`/devloop` |
| `README.md` | 用户视角日常使用说明 | 常用快捷入口表 |
| `PROJECT_SPEC.md` | 完整工作流规格 | 宏指令协议、Codex 适配方式 |
| `.codex/skills/pjsdlc_manager/SKILL.md` | 意图路由 Skill | 自然语言到 workflow action 的映射规则 |
| `.codex/skills/pjsdlc_dev_sprint/SKILL.md` | 开发阶段执行 Skill | `/dev` 与 `/devloop` 的执行边界 |
| `packages/sdlc-harness/assets/**` | npm 包 canonical assets | 由 `package sync-source` 同步 |
| `.docs/01_product/npm_package_distribution.md` | 产品需求 | `PRD-NPM-026` |
| `.docs/03_tech_plan/harness_package_distribution.md` | 技术方案 | Natural Language Control |

## 4. 核心数据流

```txt
User input
-> Manager reads lifecycle.yaml and plan.yaml
-> Natural language or /xxx detailed skill alias maps to workflow action
-> Stage Skill executes the action
-> Gates and docs update
-> Commit/push protocol records durable history
```

## 5. 关键实现逻辑

- 输入校验（Input validation）: manager 在路由前必须读取 lifecycle 和 plan；如果当前阶段与用户意图冲突，先说明冲突和推荐路径。
- 入口语义（Entry semantics）: `/xxx` 宏指令是更完整、更细节的提示词别名；自然语言入口映射到同一 action，但由 Agent 结合上下文补足细节。
- 核心分支（Core branches）: `/prd` 只在需求阶段推进产品方案；`/design` 只在架构阶段推进 architecture / tech plan；`/dev` 执行一个最小 `TASK-*` development task 后停止；`/review`、`/test`、`/release` 和 `/rfc` 也各执行一个最小 `TASK-*`；`/devloop` 每完成一个 task 后重新读取当前状态，再决定是否继续。
- 开发前 PRD 回退（Pre-development PRD rollback）: 如果当前阶段是 `ARCHITECTING`，用户要求改 PRD 或完善产品方案，Manager 可以先确认没有未收尾的 design task，然后用 `python3 tools/transition.py --to REQUIREMENT_GATHERING` 切回 PM workflow；进入 `SPRINTING` 后同类需求变化必须走 RFC。
- 异常处理（Error handling）: 需求、架构、allowed_paths、gate、commit/push 不清或失败时停止并报告 blocker。
- 边界兜底（Boundary fallback）: `/plan` 和 `/goal` 属于 Codex 客户端模式，Harness 只说明组合方式，不把它们当作可配置 state。
- 性能或并发注意事项（Performance or concurrency notes）: `/devloop` 每轮重新读取状态，避免连续执行时使用过期 plan 或远端状态。
- 并行语义（Parallel semantics）: 每个阶段 task 默认先做 parallel eligibility check；适合拆分时，Manager 创建 `parallel_execution.trigger: "workflow_default"` 并优先使用 `runtime.provider: "codex_native_subagents"`；用户显式提出并行时使用 `trigger: "user_requested"`；native subagent 不可用时降级为 `user_orchestrated`，高风险写入可选择 `codex_exec_worktree` fallback。

## 6. 与技术方案的偏移

- 无 runtime 代码偏移；该变更只调整 Agent 行为契约和 package assets。

## 7. 测试覆盖（Test Coverage）

| 测试（Test） | 覆盖范围（Coverage） | 结果（Result） |
|---|---|---|
| `node packages/sdlc-harness/dist/cli.js package check-source` | package canonical assets 与 source workspace 一致 | PASS |
| `make validate-harness` | Harness scaffold、skill language、doc overview、implementation doc index | PASS |
| `tests/sdlc-harness/transition.test.mjs` | ARCHITECTING 中 `/prd` 类需求可以回退到 PM 阶段，SPRINTING 不可直接回退 | PASS for TASK-061 |
| `python3 tools/validate_allowed_paths.py` | DEV-036 修改范围符合 allowed_paths | PASS |
| `git diff --check` | Markdown/YAML trailing whitespace 和 patch 格式 | PASS |

## 8. 变更记录（Change Log）

| 日期（Date） | Task ID | Commit | 摘要（Summary） |
|---|---|---|---|
| 2026-05-25 | `DEV-034` | `DEV-034` implementation commit | 增加自然语言/指令别名双入口和 `/dev`、`/devloop` 开发入口。 |
| 2026-05-26 | `DEV-043` | DEV-043 implementation commit | 将当前 workspace path 更新为 `.codex`，并纳入模块级 implementation doc 迁移。 |
| 2026-05-25 | `DEV-036` | `DEV-036` implementation commit | 澄清宏指令是详细提示词别名，并补齐 `/prd`、`/design` 阶段入口。 |
| 2026-05-27 | `DEV-050` | DEV-050 implementation commit | 增加显式 opt-in 的 parallel execution 意图路由和降级语义。 |
| 2026-05-30 | `TASK-084` | TASK-084 implementation commit | 将并行入口升级为默认 eligibility check，并记录 Codex native subagent 优先策略。 |
| 2026-05-27 | `TASK-057` | Working tree | 将 Review、测试、发布和 RFC 入口纳入统一 `TASK-*` 小任务路由语义。 |
| 2026-05-28 | `TASK-061` | Working tree | 增加开发前从 `ARCHITECTING` 回到 `REQUIREMENT_GATHERING` 的 `/prd` 和需求变化路由规则。 |

## 9. 后续维护注意事项

- 后续新增阶段快捷入口时，应同时补自然语言表达和 `/xxx` 详细提示词别名，保持双入口映射到同一 workflow action。
- 如果未来实现真实 CLI command，需明确区分 Agent 对话宏指令和 `sdlc-harness` binary 子命令。

---

## harness_workflow/docs_overview_and_validation.md

Source: [harness_workflow/docs_overview_and_validation.md](harness_workflow/docs_overview_and_validation.md)

# Documentation Overview and Validation Implementation

## 1. 关联信息

- Domain: `harness_workflow`
- Module / subsystem / core flow: docs overview generation, documentation indexing and validation
- Updated by task: `DEV-005`, `DEV-015`, `DEV-025`, `DEV-030`, `DEV-032`, `DEV-043`, `TASK-060`
- Linked PRD: `.docs/01_product/npm_package_distribution.md`
- Linked technical design: `.docs/03_tech_plan/harness_package_distribution.md`
- Linked RFC: none
- Linked commits: historical `DEV-*` implementation commits; `DEV-043` migration commit

## 2. 当前实现范围

- `.docs/INDEX.md` is the durable documentation routing table.
- `.docs/<stage>/overview.md` files are generated artifacts and are not hand edited.
- `make docs-overview` regenerates all stage overviews from Markdown slices.
- `make validate-doc-overviews` and `make validate-harness` check that generated overviews are current.
- `make validate-design` excludes generated `overview.md` and `README.md` from design deliverables, validates `plan.draft.yaml` task shape, requires development draft tasks to link existing tech plan slices through `docs.tech_plan`, rejects one shared primary tech plan for multiple development drafts, and requires dedicated architecture slices for explicit cross-cutting themes.
- `tools/validate_task_docs.py` requires every implementation doc slice to be linked from `.docs/INDEX.md`.
- Root README is a user guide; `PROJECT_SPEC.md` carries the heavier product/specification narrative.

## Runnable Entry/Exit

- Entry points: `make docs-overview`, `make validate-doc-overviews`, `make validate-harness`, `tools/validate_task_docs.py`, and package-side validators.
- Exit / side effects: overview generation writes `.docs/**/overview.md`; validation commands report stale overview, missing links or gate errors.
- Config contract: `.docs/INDEX.md`, `.docs/**` slice layout and Harness Make targets.
- Fixture/live boundary: local repository documentation validation only; no runtime service or external system is involved.

## 3. 真实代码结构

| 文件（File） | 作用（Purpose） | 关键函数/对象（Key Functions/Objects） |
|---|---|---|
| `.docs/INDEX.md` | Global documentation router | stage map, active artifacts |
| `tools/build_doc_overviews.py` | Generated overview builder/checker | source hash, stage scan, Markdown rendering |
| `tools/harness_utils.py` | Shared local validator utilities | `markdown_deliverables` excludes generated/non-deliverable docs |
| `tools/validate_design.py` | Local ARCHITECTING gate | design deliverables, `plan.draft.yaml`, tech plan slice refs, cross-cutting architecture slices |
| `tools/validate_task_docs.py` | Implementation-doc index validator | implementation doc link check |
| `tools/validate_harness.py` | Harness scaffold validator | structure checks |
| `packages/sdlc-harness/src/lib/validators.ts` | Package CLI validators | `validate-design`, Markdown deliverable filtering, design draft slice checks |
| `Makefile` | Validation command entrypoint | `docs-overview`, `validate-doc-overviews`, `validate-harness` |
| `README.md` | User-facing package guide | install/init/sync/upgrade/commands |
| `PROJECT_SPEC.md` | Maintainer-facing product/specification doc | architecture, workflow and package background |

## 4. 核心数据流

```txt
Markdown slice changes
-> update .docs/INDEX.md if routing changed
-> make docs-overview
-> generated overview.md files include source hash and slice content
-> make validate-doc-overviews / make validate-harness confirms freshness
```

```txt
ARCHITECTING exit or design regression check
-> tools/validate_design.py / package validate-design scan non-generated architecture and tech plan slices
-> plan.draft.yaml development tasks must reference existing docs.tech_plan slices
-> multiple draft tasks must have distinct primary tech plan slices
-> explicit cross-cutting themes require dedicated architecture slices
```

```txt
Implementation doc slice exists
-> tools/validate_task_docs.py scans .docs/04_implementation/**/*.md
-> each slice must be linked from .docs/INDEX.md
-> each slice must state Runnable Entry/Exit facts or explicit Not applicable
-> missing links fail validate-dev / relevant gates
```

## 5. 关键实现逻辑

- Overview files are deterministic and include every non-overview Markdown slice under their stage directory.
- Generated overviews are for browsing and handoff; Markdown slices and `.docs/INDEX.md` remain the source of truth.
- Design validation now treats generated `overview.md` and `README.md` as non-deliverables, so visual rollups cannot satisfy architecture or tech plan slice requirements.
- `plan.draft.yaml` is part of the design gate because task granularity must line up with tech plan fact granularity before SPRINTING starts.
- Cross-cutting architecture validation uses conservative trigger phrases from PRD, tech plan and draft task text, then requires different architecture docs for different triggered categories.
- Implementation docs are validated as module/subsystem/core-flow slices, not task ledgers, and must include runnable entry/exit facts so TESTING receives stable boundaries.
- DEV-043 removes the legacy `npm_package/dev_*.md` docs from the active docs graph and replaces them with module-level slices.

## 6. 与技术方案的偏移

- Early documentation used task-grain implementation docs. The current model uses module-level implementation docs and treats git history as the task action record.
- `README.md` was split from the full product specification so npm package users see a lightweight guide first.

## 7. 测试覆盖（Test Coverage）

| 测试（Test） | 覆盖范围（Coverage） | 最近记录结果（Result） |
|---|---|---|
| `make docs-overview` | Regenerate all `.docs/<stage>/overview.md` files | PASS for DEV-043 |
| `make validate-doc-overviews` | Check generated overview freshness | PASS for DEV-043 |
| `make validate-harness` | Harness scaffold, prompt language and overview checks | PASS for DEV-043 |
| `make validate-design` | Design deliverable filtering, draft task tech plan refs and architecture slice checks | PASS for TASK-060 |
| `npm test --workspace agent-project-sdlc` | Package validator regression, including design slice hard-gate cases | PASS for TASK-060; 9 tests passed |
| `python3 tools/validate_task_docs.py` | Implementation docs are linked from `.docs/INDEX.md` | Covered by validate-dev and manual checks |

## 8. 变更记录（Change Log）

| 日期（Date） | Task ID | Commit | 摘要（Summary） |
|---|---|---|---|
| 2026-05-25 | `DEV-015` | Historical implementation commit | Added deterministic Markdown overview generation. |
| 2026-05-25 | `DEV-025` | Historical implementation commit | Tightened implementation doc indexing in validation. |
| 2026-05-25 | `DEV-030` | Historical implementation commit | Split lightweight README from full product/specification content. |
| 2026-05-25 | `DEV-032` | Historical implementation commit | Defined implementation docs as module/subsystem/core-flow facts. |
| 2026-05-26 | `DEV-043` | DEV-043 implementation commit | Removed task-grain implementation docs from the active implementation-doc graph. |
| 2026-05-28 | `TASK-060` | Working tree | Strengthened `validate-design` so generated overviews do not count as deliverables, draft development tasks must link tech plan slices, shared monolithic primary tech plans fail for multiple draft tasks, and explicit cross-cutting themes require dedicated architecture slices. |

## 9. 后续维护注意事项

- Never edit `overview.md` directly; regenerate it.
- When a doc slice is moved or renamed, update `.docs/INDEX.md` in the same task.

---

## harness_workflow/implementation_doc_model.md

Source: [harness_workflow/implementation_doc_model.md](harness_workflow/implementation_doc_model.md)

# Implementation Doc Model

## 1. 关联信息

- Domain: `harness_workflow`
- Module / subsystem / core flow: implementation documentation model
- Updated by task: `DEV-032`, `DEV-043`, `TASK-057`
- Linked PRD: `.docs/01_product/npm_package_distribution.md` (`PRD-NPM-025`)
- Linked technical design: `.docs/03_tech_plan/harness_package_distribution.md`
- Linked RFC: none
- Linked commit: `DEV-032` implementation commit

## 2. 当前实现范围

- 新增（Added）:
  - implementation doc 默认按模块、子系统或核心数据流切片的协议。
  - implementation doc template 中的 provenance 和 Change Log 字段。
  - 技术方案中的 implementation doc model 说明。
- 修改（Changed）:
  - `pjsdlc_implementation_doc` 不再默认按 task 生成 `dev_*.md`。
  - `pjsdlc_dev_sprint` 将 development task 定义为执行和提交边界，将 implementation doc 定义为长期事实边界。
  - `pjsdlc_architect_design` 和 plan/tech templates 引导 future development task 指向模块级 implementation doc；非开发 task 使用 `result_docs` 指向对应阶段产物。
  - AGENTS、PROJECT_SPEC、PRD 和 tech plan 使用同一套语义。
  - DEV-043 将历史 `.docs/04_implementation/npm_package/dev_*.md` task log 合并为模块、子系统和核心数据流级 implementation docs，并从活跃实现文档图中移除 legacy 目录。

## Runnable Entry/Exit

- Entry points: `pjsdlc_implementation_doc` prompt usage and `tools/validate_task_docs.py` / package `validate-dev` checks.
- Exit / side effects: implementation docs record module facts, verification and runnable boundaries; validators fail when implementation slices omit required entry/exit facts.
- Config contract: `.docs/04_implementation/**/*.md`, `.docs/INDEX.md`, implementation doc template and dev task `implementation_doc` fields.
- Fixture/live boundary: documentation model only; product runtime behavior must be implemented in the owning development module before testing.

## 3. 真实代码结构

| 文件（File） | 作用（Purpose） | 关键函数/对象（Key Functions/Objects） |
|---|---|---|
| `AGENTS.md` | 项目级 workflow 入口规则 | Plan Protocol、工作规则 |
| `.codex/skills/pjsdlc_implementation_doc/SKILL.md` | implementation doc 生成/更新规则 | 语义切片、输出路径、完成检查 |
| `.codex/skills/pjsdlc_dev_sprint/SKILL.md` | Sprint 执行规则 | task 执行边界、completion protocol |
| `.codex/skills/pjsdlc_architect_design/SKILL.md` | 架构阶段任务规划规则 | task `implementation_doc` 指向长期实现事实文档 |
| `.codex/skills/pjsdlc_manager/SKILL.md` | 自然语言 workflow 路由规则 | 完成后的产物事实说明 |
| `.codex/pjsdlc_managed/templates/IMPLEMENTATION_DOC_TEMPLATE.md` | 新 implementation doc 模板 | module/subsystem/core flow、provenance、Change Log |
| `.codex/pjsdlc_managed/templates/PLAN_TEMPLATE.yaml` | open task 模板 | `TASK-*`、`phase`、`result_docs` 和 development `implementation_doc` 示例路径 |
| `.codex/pjsdlc_managed/templates/TECH_DESIGN_TEMPLATE.md` | 技术方案模板 | task breakdown 中 implementation doc 的模块级说明 |
| `.docs/04_implementation/harness_package/*.md` | package-facing module implementation docs | CLI lifecycle、source sync、release automation |
| `.docs/04_implementation/harness_workflow/*.md` | workflow-facing module implementation docs | command routing、implementation model、state/task protocol、skills/prompt、docs validation |
| `packages/sdlc-harness/assets/**` | npm 包 canonical assets | 由 `package sync-source` 从 `.codex/**` 和 `AGENTS.md` 同步 |
| `.docs/01_product/npm_package_distribution.md` | 产品约束 | `PRD-NPM-025` |
| `.docs/03_tech_plan/harness_package_distribution.md` | 技术方案约束 | implementation doc model |

## 4. 核心数据流

```txt
Architecting
-> plan.draft.yaml task includes implementation_doc path
-> SPRINTING executes task as bounded work unit
-> gates pass
-> implementation_doc updates module/subsystem/core-flow fact slice
-> task id + commit recorded as provenance
-> task removed from plan.yaml
```

## 5. 关键实现逻辑

- 输入校验（Input validation）: development open task 使用 `implementation_doc` 指向长期实现事实文档，而不是默认 `dev_*.md` task ledger；文档、Review、测试、发布和 RFC task 使用 `result_docs`。
- 核心分支（Core branches）: 修改已有模块时更新已有 implementation doc；新增稳定模块或核心数据流时创建新文档；一个 task 可更新多份相关文档。
- 异常处理（Error handling）: 若真实代码边界与 architecture / tech plan 不一致，implementation doc 必须记录 deviation，并更新 `.docs/INDEX.md`。
- 边界兜底（Boundary fallback）: 只有当 task 本身就是稳定模块/数据流边界时，implementation doc 才可以与单个 task 一一对应。
- 性能或并发注意事项（Performance or concurrency notes）: 不适用；该改动只调整 workflow 文档模型和分发资产。

## 6. 与技术方案的偏移

- 早期技术方案和历史 task breakdown 中的 implementation doc 路径以 `dev_*.md` 为主；DEV-032 将其定义为 legacy task log，不再作为未来默认。
- DEV-043 完成历史合并迁移，删除活跃 `.docs/04_implementation/npm_package/` task-log 目录，并将事实合并到模块级 implementation docs。

## 7. 测试覆盖（Test Coverage）

| 测试（Test） | 覆盖范围（Coverage） | 结果（Result） |
|---|---|---|
| `node packages/sdlc-harness/dist/cli.js package check-source` | package canonical assets 与 source workspace 一致 | PASS |
| `make validate-harness` | Harness scaffold、skill language、doc overview、implementation doc index | PASS |
| `python3 tools/validate_allowed_paths.py` | DEV-032 修改范围符合 allowed_paths | PASS |
| `git diff --check` | Markdown/YAML trailing whitespace 和 patch 格式 | PASS |

## 8. 变更记录（Change Log）

| 日期（Date） | Task ID | Commit | 摘要（Summary） |
|---|---|---|---|
| 2026-05-25 | `DEV-032` | `DEV-032` implementation commit | 将 implementation doc 默认粒度从 task 调整为模块、子系统或核心数据流。 |
| 2026-05-26 | `DEV-043` | DEV-043 implementation commit | 将 legacy `npm_package/dev_*.md` task log 合并进模块级 implementation docs，并更新索引和引用。 |
| 2026-05-27 | `TASK-057` | Working tree | 明确只有 development task 使用 `implementation_doc`，其它阶段 task 使用 `result_docs`。 |

## 9. 后续维护注意事项

- 后续新 task 应优先更新相关模块级 implementation doc；不要默认新增 `dev_*.md`。
- 不要在 `.docs/04_implementation/` 下重新建立 task-grain ledger；task 历史动作记录以 git commit/tag/release evidence 为准。

---

## harness_workflow/skills_prompt_and_authoring.md

Source: [harness_workflow/skills_prompt_and_authoring.md](harness_workflow/skills_prompt_and_authoring.md)

# Skills, Prompt Routing and Authoring Implementation

## 1. 关联信息

- Domain: `harness_workflow`
- Module / subsystem / core flow: workflow Skills, prompt routing, hard/soft indexing and authoring overlay
- Updated by task: `DEV-014`, `DEV-016`, `DEV-017`, `DEV-021`, `DEV-023`, `DEV-029`, `DEV-036`, `DEV-037`, `DEV-038`, `DEV-039`, `DEV-040`, `DEV-043`, `DEV-044`, `DEV-046`, `DEV-049`, `DEV-050`, `DEV-055`, `DEV-056`, `TASK-057`, `TASK-060`, `TASK-061`, `TASK-066`, `TASK-067`, `TASK-069`, `TASK-070`, `TASK-071`, `TASK-072`, `TASK-076`, `TASK-079`
- Linked PRD: `.docs/01_product/npm_package_distribution.md`
- Linked technical design: `.docs/03_tech_plan/harness_package_distribution.md`, `PROJECT_SPEC.md`
- Linked RFC: `RFC_007`, `RFC_009`, `RFC_015`, `RFC_017`, `RFC_018`, `RFC_019`, `RFC_020`, `RFC_021`, `RFC_024`
- Linked commits: historical `DEV-*` implementation commits; `DEV-043` migration commit; `DEV-049` implementation commit; `DEV-050` implementation commit

## 2. 当前实现范围

- Workflow roles are represented as local Skills under `<harnessRoot>/skills/pjsdlc_*/SKILL.md`.
- `AGENTS.md` provides the deterministic soft index from lifecycle state to `active_skill`.
- Native Agent skill hydration, when supported by the client, is a separate hard-index mechanism based on the client-specific skill root.
- Natural language intent and `/xxx` macro aliases map to the same workflow actions.
- Project-local role prompt additions live under `<harnessRoot>/pjsdlc_managed/override_skills/<skill_name>.md` and are appended to managed Skill output by `sdlc-harness sync`.
- Override files support plain snippets and complete `SKILL.md` extensions with `name`/`description` frontmatter; complete extensions merge their `description` into final Skill metadata and append their body after stripping override frontmatter.
- The generated `Local Override` block tells maintainers and downstream agents to check the merged Skill for semantic conflicts between package base rules and project-local override rules.
- This authoring repository keeps a private authoring Skill under `.codex/skills/authoring/**`; package source sync excludes it from user projects.
- The authoring Skill requires README/package README coverage to stay aligned with all public package capabilities.
- PM, Architect, Manager, Dev, Reviewer, Tester, Release and RFC prompts now describe default parallel eligibility checks, Codex native subagent scheduling, fallback modes and final fact-source integration with the main agent.
- PM and Architect prompts require deleting the superseded monolithic PRD/product or tech plan file after user-requested slicing creates replacement slices and updates the related fact-source references.
- Architect prompt now treats semantic design slicing as a `make validate-design` hard gate: `plan.draft.yaml` development tasks must reference `docs.tech_plan`, multiple draft tasks need distinct primary tech plan slices, generated `overview.md` cannot satisfy design deliverables, and explicit cross-cutting themes require dedicated architecture slices.
- Manager, PM and Architect prompts now describe the development-before rollback path from `ARCHITECTING` to `REQUIREMENT_GATHERING` for PRD edits, while preserving RFC workflow for changes after `SPRINTING`.
- PM, Architect, Reviewer, Tester, Release and RFC prompts now require each main workflow action to run as one small `TASK-*` `plan.yaml` task with `phase` metadata. This covers conversational generation, existing-document slicing, synthesis from prior fact sources, review batches, test evidence, release preparation and RFC recalibration.
- Dev, Review, Tester and Implementation Doc prompts now treat runnable entry/exit as a hard phase boundary: SPRINTING must implement or block promised API/CLI/adapter/provider/config/fixture-live boundaries, REVIEWING must block missing entry/exit, and TESTING may only exercise existing entrypoints.
- Review, test and implementation templates include runnable entry/exit sections. `validate-review` and `validate-test` require entry/exit evidence text, and TESTING validators reject runtime, bootstrap, provider, deploy or package runtime script changes.
- TESTING distinguishes `.docs/07_test/TEST_STRATEGY.md`, `.docs/07_test/TEST_CASES.md` and `.docs/07_test/TEST_REPORT.md`; `TEST_REPORT.md` is execution-only evidence and `validate-test` no longer falls back to `TEST_PLAN.md`.
- RFC recalibration now records `Test Fact Source Impact` and removes superseded `.docs/07_test/**` files from current test facts and `.docs/INDEX.md` when a route, entry/exit or acceptance boundary changes.
- `validate-dev` now requires implementation docs to include `Runnable Entry/Exit` facts or explicit `Not applicable`, so missing runtime boundaries cannot be deferred into TESTING by omission.
- `validate-dev` now requires the current open SPRINTING task implementation doc to include structured `Development Evidence`: `Runnable Entry`, `Observable Exit`, `Basic Self-test Evidence`, or a justified `Not applicable`.
- `validate-dev` now treats service / agent / runtime readiness as stronger than provider or fixture smoke: current task evidence must include `Client / Server Initialization` and `Config Contract`, and provider smoke, fixture smoke, fake adapter or one-shot smoke cannot alone satisfy application readiness.
- `validate-dev` now promotes runtime readiness into the task contract: runtime/app/provider/live SPRINTING tasks declare `evidence_level.required` and `target_runtime_environment`, `deployed_runtime` cannot be closed by lower-level smoke, and `business_handoff_ready` requires a Testing Handoff Contract.
- `validate-design` and `validate-dev` now enforce `self_test_contract`: design binds runnable-boundary tasks to a tech plan `Development Self-Test Contract`, and development requires a completed implementation doc `Development Self-Test Report` before handoff.
- Development Self-Test Contract / Report now require `module_key_test_path` / `Module Key Test Path`, recording the module key test path from local start or invocation to all self-test scenarios completion. The path is scoped to the current task/module and covers promised runnable entries, internal key paths, boundaries, checkpoints and observable completion evidence for later debug reuse.
- Complex Development Self-Test Contract can now add lightweight `module_key_test_graph` DAG detail with `graph_required: true`. Architect/RFC define the skeleton; Dev and Implementation Doc prompts record the actual graph; Reviewer and Tester consume it for entry/checkpoint/scenario/exit/evidence refs without turning TESTING into runtime construction.
- Dev and Implementation Doc prompts now treat `Development Self-Test Report` as a development deliverable, separate from code/config/test implementation artifacts. When `self_test_contract.status: "required"`, agents must execute the current scenarios and required gates before writing the report; historical reports, template fields, code reading or unrelated green gates cannot stand in for current-run evidence.
- Development Self-Test Report now has an explicit handoff-card boundary: it must include `Report Status: PASS | BLOCKED | IN_PROGRESS | STALE`, `Module Application Entry`, `Module Key Test Path`, scenario results, executed gates, `Observable Exit`, `Current Blocker`, `Testing Handoff Readiness` and `Evidence Index Refs`; it proves only module entry/core path/exit/minimal evidence pointers and must not become a debug log, operator log, runbook, evidence dump or exploration history.
- The authoring-only Harness design prompt now states the lightweight-constraint principle: workflow changes should first align Agent attention with the `PROJECT_SPEC.md` purpose, and heavier validation or execution mechanisms are reserved for heavy logic when issues repeat, risk is high, or machine proof is required.
- The authoring-only Harness design prompt now constrains graph/data-structure workflow changes: phase graph, task graph and similar schemas must stay lightweight and declarative, name their source of truth, consumer, validator and compatibility path, avoid execution history/evidence/runbook content, and require PRD/RFC approval before introducing heavy graph engines, node/edge classes, traversal frameworks or visualizers.
- The authoring-only Harness design prompt now applies the same lightweight boundary to test path graphs: graph nodes and edges only hold handoff path skeleton and evidence pointers, not execution trace, debug output, operator log, runbook body or evidence body.
- The authoring-only Harness design prompt now asks maintainers to consider data structures for workflow changes when repeated consumers, validator/tool usage or recovery reliability would benefit, while explicitly weighing migration cost, compatibility, schema drift, context weight and over-abstraction before promoting prose into structure.
- The authoring-only Harness design prompt now states the PROJECT_SPEC boundary: it describes stable zero-to-one project design, product/protocol rationale and canonical behavior, while version migration and upgrade instructions belong in README / package README or release/implementation docs.
- `validate-rfc` now requires `Development Self-Test Impact` for new RFCs that change entry/exit, runtime, gates, handoff or blocker semantics.
- `validate-review` now requires explicit PASS/BLOCKED readiness fields for `Runnable Entry`, `Observable Exit`, `Initialization`, `Config Contract` and `Testing Handoff Readiness`; any `BLOCKED` field blocks TESTING handoff.
- `validate-review` and `validate-test` now reject `PASS` reports that acknowledge runtime/handoff mismatch, missing deployment, missing initialization, local-only evidence or fake adapters.
- `validate-test` now rejects `PASS` reports that acknowledge missing runnable entry/exit or missing `Development Evidence`; TESTING must report `BLOCKED` with recovery conditions instead.
- Dev and Manager prompts now distinguish direct SPRINTING `validate-dev` from phase-exit `validate-current`: direct dev gate allows a valid current open task, while phase advancement still requires no open tasks.
- RELEASING uses `.docs/08_release/CURRENT_RELEASE.md` as the canonical current release status. `validate-release` keeps accepting legacy versioned release docs when the current file is absent, but new release work updates the current status file instead of creating a version ledger.

## Runnable Entry/Exit

- Entry points: workflow Skills under `<harnessRoot>/skills/**`, managed templates/policies, Python validators, package `validate-*` commands and package source sync.
- Exit / side effects: updated prompts and validators govern phase behavior; `package sync-source` materializes distributable assets.
- Config contract: `AGENTS.md`, `.codex/pjsdlc_managed/**`, `packages/sdlc-harness/source-mappings.yaml`, `.docs/07_test/TEST_REPORT.md`.
- Fixture/live boundary: workflow contract only; TESTING may add fixtures/mocks/assertions/smoke runners under `tests/**` but cannot introduce product runtime/provider/bootstrap/deploy code.

## Development Evidence

- Runnable Entry: CLI command `npx sdlc-harness validate-dev` / `make validate-dev` validates the current SPRINTING task evidence contract through `packages/sdlc-harness/src/lib/validators.ts`.
- Observable Exit: Validator output reports PASS or concrete errors for missing `Development Evidence`, missing `Observable Exit`, missing `Client / Server Initialization`, missing `Config Contract`, missing `Basic Self-test Evidence`, missing `Module Key Test Path`, invalid `Module Key Test Graph`, missing `Evidence Index Refs`, overlong self-test reports, insufficient lower-level smoke, UI evidence gaps, or callable invocation/result gaps.
- Evidence Level: current task contract requires `local_runtime`; validator source and package CLI execute as local runtime checks.
- Target Runtime Environment: current task contract uses `local` with `npx sdlc-harness validate-dev` as the handoff entrypoint.
- Client / Server Initialization: service / agent / runtime tasks must record startup, live entrypoint, health/status, endpoint, CLI command or worker command evidence.
- Config Contract: service / agent / runtime tasks must record required env/config/API key inputs or an explicit no-config contract.
- Testing Handoff Readiness: package validator errors identify whether a task is ready for Review/Testing handoff or must remain in SPRINTING/RFC.
- Known Missing Runtime Boundaries: none for the Harness validator module; product runtimes in consumer projects are represented by task contracts rather than owned by this repository runtime.
- Basic Self-test Evidence: `npm test --workspace agent-project-sdlc` covers validator regression for TASK-079 after completion; final source sync and Harness gates are recorded in Test Coverage.
- Not applicable: not applicable only when a module has no product runtime boundary; this workflow validator module has CLI validator entrypoints, so structured evidence is required.

## Testing Handoff Contract

- Entry: `npx sdlc-harness validate-dev` or `make validate-dev`.
- Config: no secrets; harness root comes from `package.json#sdlcHarness.harnessFolderName` or `sdlc-harness.config.json#harnessFolderName`.
- Initialization / health: package CLI starts through Node and reads lifecycle/plan/implementation docs.
- Input sample: a SPRINTING task with `evidence_level.required`, `target_runtime_environment`, implementation doc and Development Evidence.
- Expected exit / observable side effect: PASS output or concrete validator errors for evidence level, target runtime, handoff entrypoint or Testing Handoff Contract mismatch.
- Cleanup / reset / idempotency: validator is read-only; repeated runs are idempotent.
- Evidence Level: `local_runtime`.

## 3. 真实代码结构

| 文件（File） | 作用（Purpose） | 关键函数/对象（Key Functions/Objects） |
|---|---|---|
| `AGENTS.md` | Deterministic workflow router | lifecycle-first rule, natural-language and macro mapping |
| `.codex/skills/pjsdlc_manager/SKILL.md` | Manager prompt | status/next/advance/dev/test/review routing and phase-exit gate semantics |
| `.codex/skills/pjsdlc_pm_prd/SKILL.md` | Product prompt | PRD slicing and requirement gathering |
| `.codex/skills/pjsdlc_architect_design/SKILL.md` | Architecture prompt | architecture/tech plan and `plan.draft.yaml` |
| `.codex/skills/pjsdlc_dev_sprint/SKILL.md` | Development prompt | `/dev`, `/devloop`, one-task execution protocol and direct dev gate semantics |
| `.codex/skills/pjsdlc_implementation_doc/SKILL.md` | Implementation fact prompt | module-level implementation docs |
| `.codex/skills/pjsdlc_reviewer/SKILL.md` | Review prompt | read-only review workflow |
| `.codex/skills/pjsdlc_tester/SKILL.md` | Testing prompt | test strategy/cases/report workflow |
| `.codex/skills/pjsdlc_release_manager/SKILL.md` | Release prompt | current release status, smoke and rollback plan |
| `.codex/skills/pjsdlc_rfc_recalibrate/SKILL.md` | RFC prompt | change impact analysis |
| `.codex/skills/authoring/harness_package_design/SKILL.md` | Authoring-only prompt | package iteration, scriptability heuristic, README capability coverage |
| `.codex/pjsdlc_managed/make/sdlc-harness.mk` | Managed Makefile fragment | direct `validate-dev` package CLI wiring |
| `.codex/pjsdlc_managed/policies/phase_contracts.yaml` | Phase-to-skill contract | `skill` per phase |
| `.codex/pjsdlc_managed/templates/*` | Stage document templates | review/test strategy/cases/report/implementation entry/exit evidence sections |
| `tools/validate_review.py`, `tools/validate_test_plan.py` | Source workspace validators | review/test document and TESTING boundary checks |
| `packages/sdlc-harness/src/lib/validators.ts` | Package CLI validators | `npx sdlc-harness validate-*` checks including TESTING boundary rules |
| `packages/sdlc-harness/src/lib/sync-engine.ts` | Skill materialization | base Skill copy plus local override append |
| `tools/validate_prompt_language.py` | Prompt contract validator | Chinese explanation + English identifiers |

## 4. 核心数据流

```txt
Agent starts work
-> read .codex/state/lifecycle.yaml
-> read active_skill unless user requested another workflow action
-> use corresponding local Skill prompt through AGENTS.md soft index
-> map natural language or /xxx alias to workflow action
-> execute phase/task protocol
```

Native Agent skill hydration, when available:

```txt
Client scans its configured skill root
-> semantic matcher selects a SKILL.md before the turn
-> selected Skill instructions hydrate the prompt
```

Harness supports this second path by placing workflow Skills under the configured `<harnessRoot>/skills` tree, but the deterministic lifecycle route does not depend on first-turn native hydration.

Skill sync with project-local role prompt additions:

```txt
Package asset packages/sdlc-harness/assets/skills/<skill_name>/SKILL.md
+ optional <harnessRoot>/pjsdlc_managed/override_skills/<skill_name>.md
-> sdlc-harness sync
-> <harnessRoot>/skills/<skill_name>/SKILL.md
```

## 5. 关键实现逻辑

- Hard index means the Agent client itself knows a fixed skill root and can enumerate `SKILL.md` files before the model turn.
- Soft index means project instructions tell the model where to look after reading state, such as `active_skill` in `lifecycle.yaml`.
- Workflow reliability comes from the soft index because it is deterministic and tied to lifecycle state.
- User convenience comes from natural-language routing and macro aliases; users do not need to memorize every `/xxx`.
- `/plan` and `/goal` are client modes and are not automatically controlled by Harness.
- Authoring-only prompts help this repository improve the Harness itself and should not be shipped into user projects by default.
- Package-facing behavior changes must keep both `README.md` and `packages/sdlc-harness/README.md` aligned with the full public capability list, not only `PROJECT_SPEC.md` or release status notes.
- Local Skill overrides are append-only in v1. They let projects add role preferences or complete local Skill extensions without replacing lifecycle, task, gate or allowed-path rules from the package Skill.
- `sync` auto-detects a complete Skill override when the override file starts with `name` and `description` frontmatter, validates that `name` matches the target skill, merges the override `description` into the final top-level metadata and appends the stripped body.
- `sync` writes a semantic maintenance note into each generated `Local Override` block so future agents can review phase boundaries, `allowed_paths`, `required_gates`, commit/release rules and completion checks for conflicts.
- `sync` blocks unknown files under `<harnessRoot>/pjsdlc_managed/override_skills/*.md`, so a misspelled Skill name cannot silently fail to apply.
- `pjsdlc_managed/override_skills` keeps override configuration with other managed workflow configuration while preserving `<harnessRoot>/skills/**` as the shallow hard file index.
- When a user explicitly asks to slice an existing complete PRD/product document or complete tech plan into multiple slices, `pjsdlc_pm_prd` and `pjsdlc_architect_design` now require validating replacement slice coverage, updating `.docs/INDEX.md` and generated `overview.md`, synchronizing `plan.draft.yaml` references for tech plan slicing, and then deleting the superseded complete file so the facts are not duplicated.
- `pjsdlc_architect_design` now states that `make validate-design` hard-checks draft task `docs.tech_plan`, distinct primary tech plan slices, generated overview exclusion and dedicated architecture slices for explicit cross-cutting themes.
- `pjsdlc_manager`, `pjsdlc_pm_prd` and `pjsdlc_architect_design` share the same routing rule: PRD changes discovered in `ARCHITECTING` can return to `REQUIREMENT_GATHERING`; PRD changes discovered in `SPRINTING` or later use RFC recalibration.
- `pjsdlc_pm_prd`, `pjsdlc_architect_design`, `pjsdlc_reviewer`, `pjsdlc_tester`, `pjsdlc_release_manager` and `pjsdlc_rfc_recalibrate` create or resume one small `TASK-*` task before writing phase outputs. `pjsdlc_manager` routes `/prd`, `/design`, `/review`, `/test`, `/release` and `/rfc` through those task protocols and treats remaining open tasks as phase-exit blockers.
- SPRINTING Definition of Done now includes runnable entry/exit for promised API, CLI, server route, adapter, worker, provider, config contract and fixture/live boundaries. Missing entry/exit remains a dev/RFC blocker instead of becoming testing work.
- REVIEWING validates entry/exit readiness before TESTING. TESTING validates through existing entrypoints only and blocks product runtime, package runtime script, long-running runtime, systemd, cloud bootstrap, provider adapter and deploy/script changes.
- `validate-test` requires `.docs/07_test/TEST_REPORT.md`, rejects placeholder report text, and requires test matrix, regression evidence, coverage gaps, runnable entry/exit coverage and PASS/BLOCKED decision text.
- `validate-plan` rejects non-`TESTING`/`RFC_RECALIBRATION` tasks that target `.docs/07_test/**`, so SPRINTING cannot create formal test facts before entry/exit delivery.
- `validate-rfc` checks `Test Fact Source Impact` and rejects RFCs that list superseded `.docs/07_test/**` paths still present in current facts or `.docs/INDEX.md`.
- TESTING boundary checks still reject `tests/runtime/**` and runtime-like test files, but allow clearly test-only fixture, mock, assertion and smoke files under `tests/**`.
- `validate-dev` checks implementation docs for runnable entry/exit facts, accepting explicit `Not applicable` only when the module truly has no product runtime boundary.
- `validate-dev` checks the current open SPRINTING task implementation doc for a `Development Evidence` section with concrete `Runnable Entry`, `Observable Exit`, `Client / Server Initialization`, `Config Contract` and `Basic Self-test Evidence`, or a justified `Not applicable`.
- `validate-design` checks runnable-boundary draft tasks for `self_test_contract` and verifies the referenced tech plan slice contains a `Development Self-Test Contract`.
- `validate-dev` checks `self_test_contract.required_gates` against task `required_gates`, requires `Report Status: PASS` and every contract scenario to have a `PASS` result in `Development Self-Test Report`, requires self-test report handoff fields and `Evidence Index Refs`, rejects `Actual Evidence` body fields, and rejects `BLOCKED`, `IN_PROGRESS` or `STALE` reports as unfinished development handoff.
- `validate-design` and `validate-dev` require `module_key_test_path` / `Module Key Test Path` so the implementation doc records the local-start-to-self-test-completion module key test path, including current task/module runnable entries, internal key paths, boundaries, checkpoints and completion evidence for future debug.
- `validate-plan` / package validators now validate optional `module_key_test_graph` when present or when `graph_required: true`: one entry, allowed node kinds, unique node ids, known edge refs, no cycles, scenario nodes reachable from entry, scenario nodes reaching observable exits, and short `evidence_ref` pointers only.
- High-risk runtime/live/remote-operator tasks now use resume-first recovery: Architect reserves `.docs/09_runbooks/**`, Dev maintains `plan.yaml#resume_capsule`, strategy-changing decisions are promoted to `resume_capsule.do_not_retry` / runbook `Hard Constraints`, Implementation Doc keeps operation logs and evidence dumps out of the main implementation facts, and Review/Testing consume the capsule/runbook before reading exploration appendices.
- `validate-dev` requires high-risk current SPRINTING tasks to have concrete `resume_capsule` fields, current implementation doc recovery ref, `.docs/09_runbooks/**` recovery ref, a short `Current Operator Path` with `Hard Constraints`, `Evidence Index Refs` under `.docs/09_runbooks/**`, and a `Gate Breakdown` in `Development Self-Test Report`; it also scans notes/docs/runbooks for session / QR / canonical path / do-not-retry judgments and fails when those judgments are not promoted.
- Open task `working_notes` now stays resume-first with a validator limit of 8 entries.
- `pjsdlc_dev_sprint` explicitly frames SPRINTING outputs as implementation artifacts plus development self-test artifacts. It requires scenario/gate execution before report writing, and blocks task completion when current-run runnable entry, internal key path and observable exit/evidence cannot be named.
- `pjsdlc_implementation_doc` records the same evidence provenance rule for module docs: `Development Self-Test Report` facts must come from the current task run, not from historical PASS text, template placeholders, code inspection or unrelated generic gates.
- `harness_package_design` distinguishes Agent execution violations from Harness contract gaps and prefers lightweight prompt/checklist/template/content constraints before adding heavier validators, scripts or executors.
- `harness_package_design` now requires future workflow graph/data-structure changes to preserve a lightweight declarative boundary, document consumer and validator paths, remove or explicitly deprecate duplicate facts, and avoid storing task history, operator logs, debug evidence, runbook bodies or implementation text in graph nodes or edges.
- `harness_package_design` now adds a general structure-vs-prose calibration rule: use data structures when they create stable, validator-consumed attention surfaces; keep prose/checklists when the information is one-off, human-context-heavy or lacks a clear consumer.
- `validate-rfc` requires `Development Self-Test Impact` in RFC files from `RFC_023` onward when they mention entry/exit, runtime, target environment, gates, handoff or blockers.
- `validate-dev` rejects service / agent / runtime tasks whose evidence only proves provider smoke, fixture smoke, fake adapter or one-shot smoke without application readiness or `BLOCKED`.
- `validate-review` checks structured readiness fields and treats any `BLOCKED` field as a gate blocker.
- `validate-test` rejects `PASS` reports that still describe missing entry/exit or missing Development Evidence.
- Page evidence must include a dev server/page URL plus browser, Playwright, screenshot or equivalent interaction evidence; API/CLI/worker/RPA evidence must include an invocation command/endpoint and observable output, response, side effect, log, artifact or PASS/BLOCKED result.
- direct `validate-dev` is explicitly an in-development SPRINTING gate. It validates the current open task contract, dirty-file scope, draft consumption and implementation docs without forcing task removal. `validate-current` / `/advance` keeps no-open phase-exit behavior before REVIEWING.
- Managed Makefile `validate-dev` runs `$(SDLC_HARNESS) validate-dev`, then project `lint` and `test-current-domain`, so installed package consumers no longer need source-repo-only Python validators for this gate.
- Package Skill overrides remain append-only local extensions. The generated override block now states that package-managed phase boundaries remain authoritative and overrides may narrow local behavior but must not expand TESTING or REVIEWING into implementation/runtime ownership.

## 6. 与技术方案的偏移

- Earlier wording treated all workflow role files as native Skills. The current model distinguishes native hard-index hydration from Harness soft-index routing.
- The default authoring root moved from `.agent` to `.codex` after target-agent selection was added.
- DEV-043 consolidated legacy task records for role prompts, skill layout and natural-language control into this module-level doc.

## 7. 测试覆盖（Test Coverage）

| 测试（Test） | 覆盖范围（Coverage） | 最近记录结果（Result） |
|---|---|---|
| `python3 tools/validate_prompt_language.py` | Prompt language contract and managed prompts | PASS in Harness gates |
| `npm test --workspace agent-project-sdlc` | Package build and CLI behavior regression tests | PASS for DEV-056; 9 tests passed |
| `node packages/sdlc-harness/dist/cli.js package sync-source` | Package assets reflect authoring Skill source changes | PASS for DEV-056 |
| `node packages/sdlc-harness/dist/cli.js package check-source` | Skills and managed prompt assets match authoring source | PASS for DEV-056 |
| `make validate-design` | Architect Skill slicing contract is reflected in the design gate | PASS for TASK-060 |
| `tests/sdlc-harness/transition.test.mjs` | PM/Architect/Manager rollback semantics align with phase transition support | PASS for TASK-061 |
| `tests/sdlc-harness/package-source.test.mjs` | Authoring Skill exclusion from package assets | PASS in package tests |
| `tests/sdlc-harness/sync-init-doctor.test.mjs` | Skill override append, idempotency, configured root and unknown override blocking | PASS for DEV-046 |
| `tests/sdlc-harness/upgrade.test.mjs` | Migration from legacy `overrides/skills` to `pjsdlc_managed/override_skills` | PASS for DEV-046 |
| `make validate-harness` | Prompt language and overview consistency | PASS for DEV-056 |
| `npm test --workspace agent-project-sdlc` | Package validator regression including TESTING boundary checks | PASS for TASK-066 |
| `node packages/sdlc-harness/dist/cli.js package sync-source` | Package assets reflect boundary prompt/template README changes | PASS for TASK-066 |
| `node packages/sdlc-harness/dist/cli.js package check-source` | Package assets match authoring source | PASS for TASK-066 |
| `make validate-harness` | Prompt language and overview consistency after boundary hardening | PASS for TASK-066 |
| `make validate-doc-overviews` | Generated overview freshness | PASS for TASK-066 |
| `npm test --workspace agent-project-sdlc` | Package validator regression for `TEST_REPORT.md`, legacy `TEST_PLAN.md`, TESTING fixture allowance and dev entry/exit docs | PASS for TASK-067; 10 tests passed |
| `node packages/sdlc-harness/dist/cli.js package sync-source` | Package assets reflect TESTING report contract changes | PASS for TASK-067 |
| `node packages/sdlc-harness/dist/cli.js package check-source` | Package assets match authoring source after TESTING report changes | PASS for TASK-067 |
| `node tools/consumer_lab_full_test.mjs` | Installed-consumer validation of `TEST_REPORT.md` and package validators | PASS for TASK-067 command exit; report decision `BLOCKED` with 38 PASS, 7 known Makefile/tools blockers and 0 FAIL |
| `make docs-overview` | Generated overview refresh after test report rename | PASS for TASK-067 |
| `make validate-harness` | Prompt language and overview consistency after TESTING report contract changes | PASS for TASK-067 |
| `npm test --workspace agent-project-sdlc` | Package validator regression for current release status and legacy release docs compatibility | PASS for TASK-069; 10 tests passed |
| `node packages/sdlc-harness/dist/cli.js package sync-source` | Package assets reflect release status Skill/template/README changes | PASS for TASK-069 |
| `node packages/sdlc-harness/dist/cli.js package check-source` | Package assets match authoring source after release status contract changes | PASS for TASK-069 |
| `node tools/consumer_lab_full_test.mjs` | Installed-consumer validation of `CURRENT_RELEASE.md` and package validators | PASS for command exit; report decision `BLOCKED` with 38 PASS, 7 known Makefile/tools blockers and 0 FAIL |
| `make validate-harness` | Prompt language and overview consistency after release status contract changes | PASS for TASK-069 |
| `npm test --workspace agent-project-sdlc` | Package validator regression for TEST_REPORT-only validation, placeholder rejection, test doc task boundaries and RFC superseded cleanup | PASS for TASK-070; 10 tests passed |
| `node packages/sdlc-harness/dist/cli.js package sync-source` | Package assets reflect test artifact semantics changes | PASS for TASK-070 |
| `node packages/sdlc-harness/dist/cli.js package check-source` | Package assets match authoring source after test artifact semantics changes | PASS for TASK-070 |
| `make validate-plan` | Active RFC task contract and changed paths | PASS for TASK-070 |
| `make docs-overview` | Generated overview refresh for RFC, implementation and test docs | PASS for TASK-070 |
| `make validate-rfc` | RFC format, Test Fact Source Impact and no-open-task phase gate | PASS for TASK-070 |
| `make validate-harness` | Prompt language and overview consistency after test artifact semantics changes | PASS for TASK-070 |
| `npm test --workspace agent-project-sdlc` | Package validator and consumer lab regression for direct dev gate open-task semantics | PASS for TASK-071; 10 tests passed |
| `node packages/sdlc-harness/dist/cli.js package sync-source` | Package assets reflect Dev/Manager Skill and managed Makefile changes | PASS for TASK-071 |
| `node packages/sdlc-harness/dist/cli.js package check-source` | Package assets match source after dev gate wording and wiring changes | PASS for TASK-071 |
| `make validate-dev` | Managed Makefile direct dev gate uses package CLI without unsynced Python dev-state tools | PASS for TASK-071 |
| `make validate-current` | Manager phase-exit path keeps no-open safety after direct dev gate | PASS for TASK-071 |
| `make validate-harness` | Prompt language and generated overview consistency after Dev/Manager prompt changes | PASS for TASK-071 |
| `npm test --workspace agent-project-sdlc` | Package validator regression for structured Development Evidence, placeholder rejection, page evidence and callable evidence | PASS for TASK-072; 10 tests passed |
| `node packages/sdlc-harness/dist/cli.js package sync-source` | Package assets reflect Development Evidence Skill/template/policy/README changes | PASS for TASK-072; changed=26 |
| `node packages/sdlc-harness/dist/cli.js package check-source` | Package assets match authoring source after Development Evidence changes | PASS for TASK-072 |
| `make validate-dev` | Direct SPRINTING gate validates current task structured Development Evidence | PASS for TASK-072 |
| `make validate-harness` | Prompt language and generated overview consistency after Development Evidence changes | PASS for TASK-072 |
| `npm test --workspace agent-project-sdlc` | Package validator regression for application readiness evidence, Review readiness checklist and TEST_REPORT PASS misuse | PASS for TASK-075; 10 tests passed |
| `node packages/sdlc-harness/dist/cli.js package sync-source` | Package assets reflect application readiness Skill/template/README changes | PASS for TASK-075; changed=26 |
| `node packages/sdlc-harness/dist/cli.js package check-source` | Package assets match authoring source after application readiness changes | PASS for TASK-075 |
| `node tools/consumer_lab_full_test.mjs` | Installed-consumer validation of application readiness evidence contract | PASS command exit for TASK-075; report decision `BLOCKED` with 40 PASS, 7 known Makefile/tools blockers and 0 FAIL |
| `make docs-overview` | Generated overview refresh for RFC_020 and implementation docs | PASS for TASK-075 |
| `make validate-dev` | Direct SPRINTING gate validates current task application readiness evidence contract | PASS for TASK-075 |
| `make validate-harness` | Prompt language and generated overview consistency after application readiness changes | PASS for TASK-075 |
| `npm test --workspace agent-project-sdlc` | Package validator regression for Evidence Level, Target Runtime Environment and Testing Handoff Contract | PASS for TASK-076; 10 tests passed |
| `node packages/sdlc-harness/dist/cli.js package sync-source` | Package assets reflect runtime evidence contract prompt/template/README changes | PASS for TASK-076; changed=25 |
| `node packages/sdlc-harness/dist/cli.js package check-source` | Package assets match authoring source after runtime evidence contract changes | PASS for TASK-076 |
| `make docs-overview` | Generated overview refresh after RFC_021 and implementation doc updates | PASS for TASK-076 |
| `make validate-harness` | Prompt language and overview consistency after runtime evidence contract changes | PASS for TASK-076 |
| `make validate-dev` | Direct SPRINTING gate validates current task runtime evidence contract | PASS for TASK-076 |
| `npm test --workspace agent-project-sdlc` | Package validator regression for Development Self-Test Contract / Report and RFC self-test impact | PASS for TASK-078; 10 tests passed |
| `node packages/sdlc-harness/dist/cli.js package sync-source` | Package assets reflect self-test contract Skill/template/README changes | PASS for TASK-078; changed=26 |
| `node packages/sdlc-harness/dist/cli.js package check-source` | Package assets match authoring source after self-test contract changes | PASS for TASK-078 |
| `make docs-overview` | Generated overview refresh after RFC_023 and implementation doc updates | PASS for TASK-078 |
| `make validate-harness` | Prompt language and overview consistency after self-test contract changes | PASS for TASK-078 |
| `make validate-rfc` | RFC format, Development Self-Test Impact and no-open-task phase gate | PASS for TASK-078 |
| `npm test --workspace agent-project-sdlc` | Package validator regression for Module Key Test Path in Development Self-Test Contract / Report | PASS for TASK-079 |
| `node packages/sdlc-harness/dist/cli.js package sync-source` | Package assets reflect Module Key Test Path prompt/template/README changes | PASS for TASK-079 |
| `node packages/sdlc-harness/dist/cli.js package check-source` | Package assets match source after Module Key Test Path changes | PASS for TASK-079 |
| `make validate-harness` | Prompt language and generated overview consistency after Module Key Test Path changes | PASS for TASK-079 |
| `make validate-rfc` | RFC format, Development Self-Test Impact and no-open-task phase gate | PASS for TASK-079 |
| `npm test --workspace agent-project-sdlc` | Package validator regression after clarifying Module Key Test Path fixture wording | PASS for TASK-080 |
| `node packages/sdlc-harness/dist/cli.js package sync-source` | Package assets reflect clarified Module Key Test Path wording | PASS for TASK-080 |
| `node packages/sdlc-harness/dist/cli.js package check-source` | Package assets match source after clarified Module Key Test Path wording | PASS for TASK-080 |
| `make validate-harness` | Prompt language and generated overview consistency after clarified Module Key Test Path wording | PASS for TASK-080 |
| `npm test --workspace agent-project-sdlc` | Package validator regression for resume capsule, runbook refs and Gate Breakdown | PASS in current working tree; 10 tests passed |
| `node packages/sdlc-harness/dist/cli.js package sync-source && package check-source` | Package assets reflect resume-first Skill/template/validator changes | PASS in current working tree; sync changed=48 |
| `make validate-rfc` | RFC format, Development Self-Test Impact and no-open-task phase gate | PASS for TASK-080 |
| `node packages/sdlc-harness/dist/cli.js package sync-source` | Package assets reflect self-test report redline prompt changes while excluding authoring-only Skill | PASS on 2026-05-30; changed 44 assets |
| `node packages/sdlc-harness/dist/cli.js package check-source` | Package assets match source after prompt redline changes | PASS on 2026-05-30 |
| `npm test --workspace agent-project-sdlc` | Package regression after prompt-only workflow changes | PASS on 2026-05-30; 10 tests passed |
| `make docs-overview` | Generated overview refresh after prompt redline implementation doc update | PASS on 2026-05-30 |
| `make validate-harness` | Prompt language and generated overview consistency after prompt redline changes | PASS on 2026-05-30 |
| `npm test --workspace agent-project-sdlc` | Package validator regression for Report Status, Current Operator Path, disallowed self-test log sections and working_notes limit | PASS on 2026-05-30; 10 tests passed |
| `node packages/sdlc-harness/dist/cli.js package sync-source && package check-source` | Package assets reflect self-test report boundary Skill/template/README changes | PASS on 2026-05-30; sync changed=48 |
| `make docs-overview && make validate-harness && make validate-plan` | Generated overview, prompt language and active plan consistency after self-test boundary changes | PASS on 2026-05-30 |

## 8. 变更记录（Change Log）

| 日期（Date） | Task ID | Commit | 摘要（Summary） |
|---|---|---|---|
| 2026-05-25 | `DEV-014`, `DEV-016`, `DEV-017` | Historical implementation commits | Added authoring overlay concept and prompt language guidelines. |
| 2026-05-25 | `DEV-021`, `DEV-023` | Historical implementation commits | Consolidated managed config and added `pjsdlc_*` Skill names. |
| 2026-05-25 | `DEV-029` | Historical implementation commit | Added natural-language workflow control and macro aliases. |
| 2026-05-25 | `DEV-036` - `DEV-039` | Historical implementation commits | Clarified hard/soft indexes and authoring Skill packaging boundary. |
| 2026-05-25 | `DEV-040` | `40552f0` | Added target-agent selection and `.codex` default for Codex. |
| 2026-05-26 | `DEV-043` | DEV-043 implementation commit | Migrated legacy prompt/skill implementation docs into module-level facts. |
| 2026-05-26 | `DEV-044` | DEV-044 implementation commit | Added sync-time append overrides for project-local workflow Skill prompt additions. |
| 2026-05-26 | `DEV-046` | DEV-046 implementation commit | Moved project-local Skill overrides under `pjsdlc_managed/override_skills` and updated authoring impact rules. |
| 2026-05-26 | `DEV-049` | DEV-049 implementation commit | Added authoring rule that README/package README must cover all public package capabilities. |
| 2026-05-27 | `DEV-050` | DEV-050 implementation commit | Added opt-in parallel execution prompt rules for PM, Manager, Dev and Tester workflows. |
| 2026-05-30 | `TASK-084` | TASK-084 implementation commit | Updated all workflow Skills to default parallel eligibility checks with Codex native subagent scheduling and fallback modes. |
| 2026-05-27 | `DEV-055` | Working tree | Required PRD and tech plan slicing workflows to delete superseded complete files after replacement slices and references are complete. |
| 2026-05-27 | `DEV-056` | Working tree | Routed PRD and design generation/slicing through recoverable `plan.yaml` tasks. |
| 2026-05-27 | `TASK-057` | Working tree | Generalized prompt rules so every phase main action is a `TASK-*` task governed by `plan.yaml`, with review/test/release/RFC outputs using `result_docs`. |
| 2026-05-27 | Direct user request | Working tree | Added complete Skill override merge support with description merging and semantic conflict review guidance. |
| 2026-05-28 | `TASK-060` | Working tree | Promoted architect semantic slicing guidance into explicit hard-gate wording for `plan.draft.yaml` tech plan references and dedicated architecture slices. |
| 2026-05-28 | `TASK-061` | Working tree | Added Skill routing guidance for returning from `ARCHITECTING` to `REQUIREMENT_GATHERING` before development when PRD facts need revision. |
| 2026-05-28 | `TASK-066` | Working tree | Hardened SPRINTING/REVIEWING/TESTING runnable entry/exit boundaries and validator checks so TESTING cannot absorb product runtime implementation. |
| 2026-05-28 | `TASK-067` | Working tree | Replaced the canonical TESTING document contract with `TEST_REPORT.md`, kept legacy `TEST_PLAN.md` validation compatibility and tightened dev/test entry/exit evidence gates. |
| 2026-05-29 | `TASK-069` | Working tree | Replaced versioned release document generation with canonical `.docs/08_release/CURRENT_RELEASE.md` release status guidance and validator compatibility wording. |
| 2026-05-29 | `TASK-070` | Working tree | Split test strategy, test cases and execution report semantics; removed `TEST_PLAN.md` report fallback; added RFC cleanup checks for superseded test facts. |
| 2026-05-29 | `TASK-071` | Working tree | Clarified direct dev gate open-task semantics in Dev/Manager prompts and moved managed Makefile `validate-dev` to package CLI wiring. |
| 2026-05-29 | `TASK-072` | Working tree | Added structured SPRINTING Development Evidence requirements and `validate-dev` checks for runnable entry, observable exit and basic self-test evidence. |
| 2026-05-29 | `TASK-075` | Working tree | Hardened application readiness gates so provider/fixture smoke cannot be mistaken for delivered runtime readiness. |
| 2026-05-29 | `TASK-076` | Working tree | Added task-level Evidence Level, Target Runtime Environment and Testing Handoff Contract validation for runtime/app handoff readiness. |
| 2026-05-29 | `TASK-078` | Working tree | Added Development Self-Test Contract / Report prompts, templates and validator checks for development handoff readiness. |
| 2026-05-30 | Direct maintenance | Working tree | Added development self-test report redline prompts and authoring lightweight-constraint guidance. |
| 2026-05-29 | `TASK-079` | Working tree | Added Module Key Test Path requirements to Development Self-Test Contract / Report and validator checks. |
| 2026-05-29 | `TASK-080` | Working tree | Clarified Module Key Test Path wording to cover current task/module promised entries and internal key paths without implying whole-system coverage. |
| 2026-05-30 | Resume-first runtime task protocol | Working tree | Added resume-first prompt rules for high-risk runtime/live tasks and separated runbook/evidence/exploration responsibilities. |
| 2026-05-30 | Self-test report boundary hardening | Working tree | Added Report Status semantics, Current Operator Path prompt rules, log-section boundary and working_notes limit guidance. |
| 2026-05-31 | Lightweight explicit phase graph | Working tree | Added authoring guardrails for future workflow graph/data-structure changes: lightweight schema first, explicit consumer/validator/compatibility path and no evidence/history/runbook bodies inside graph nodes. |
| 2026-05-31 | Data-structure calibration | Working tree | Added authoring guidance to consider structured contracts for repeated workflow consumers while weighing migration, compatibility, context and over-abstraction costs. |
| 2026-05-31 | PROJECT_SPEC boundary | Working tree | Clarified that version migration and upgrade instructions stay in README/package README or release/implementation docs, not in the zero-to-one project spec. |

## 9. 后续维护注意事项

- When adding a workflow role, update both the Skill file and the soft-index contract in lifecycle/phase policies.
- If a client-specific native skill root is supported, document it as hard-index behavior without assuming every Agent hydrates it identically.
- Do not document direct edits to `<harnessRoot>/skills/**/SKILL.md` as a customization path; use `<harnessRoot>/pjsdlc_managed/override_skills/*.md` and `sdlc-harness sync`.

---

## harness_workflow/state_and_task_protocol.md

Source: [harness_workflow/state_and_task_protocol.md](harness_workflow/state_and_task_protocol.md)

# State and Task Protocol Implementation

## 1. 关联信息

- Domain: `harness_workflow`
- Module / subsystem / core flow: lifecycle state, plan state, task execution protocol and gate evidence
- Updated by task: `DEV-010`, `DEV-011`, `DEV-018`, `DEV-019`, `DEV-024`, `DEV-025`, `DEV-026`, `DEV-027`, `DEV-028`, `DEV-043`, `DEV-050`, `DEV-056`, `TASK-057`, `TASK-059`, `TASK-061`, `TASK-062`, `TASK-065`, `TASK-069`, `TASK-071`
- Linked PRD: `.docs/01_product/npm_package_distribution.md`
- Linked technical design: `.docs/03_tech_plan/harness_package_distribution.md`
- Linked RFC: `RFC_004`, `RFC_005`, `RFC_010`, `RFC_011`, `RFC_012`, `RFC_013`, `RFC_014`, `RFC_015`, `RFC_016`, `RFC_018`
- Linked commits: historical `DEV-*` implementation commits; `DEV-043` migration commit; `DEV-050` implementation commit

## 2. 当前实现范围

- `.codex/state/lifecycle.yaml` stores the single source for current phase routing state.
- `.codex/state/plan.yaml` stores the current and future short-lived task contract across all workflow phases, without duplicating `current_phase`.
- `plan.yaml` is conceptually a recoverable task-splitting container for long-running project goals; the default Harness workflow only interprets phase-related tasks, while broader project-specific task definitions belong in local configuration or overlays.
- `.codex/state/plan.draft.yaml` is the current built-in draft queue; it stores only unadopted development draft tasks and `next_task_sequence`, without `current_phase` or `current_task_id`.
- `TASK-*` is the new task id model; `phase` identifies `REQUIREMENT_GATHERING`, `ARCHITECTING`, `SPRINTING`, `REVIEWING`, `TESTING`, `RELEASING` or `RFC_RECALIBRATION`; historical `PRD-*`, `DES-*` and `DEV-*` ids remain validator-compatible provenance.
- `next_task_sequence` preserves future `TASK-*` id allocation after done tasks are removed.
- Document, review, test, release and RFC tasks use `result_docs` for planned fact-source outputs; development tasks use `implementation_doc`.
- Checkpoint files, archive directories, gate result logs and lifecycle history are no longer active state facts.
- `.codex/state/memory.md` is a short cross-stage reminder and navigation surface; complete decision context, alternatives, rationale and consequences belong in `.docs/05_decisions/` ADRs or other formal `.docs/**` fact sources.
- `.docs/05_decisions/` is not a lifecycle phase; it is an `ARCHITECTING`-produced ADR fact source for durable architecture decisions that may outlive a single architecture or tech plan slice.
- `phase_contracts.yaml` uses a lightweight explicit directed graph: `phases` are stable phase contract nodes, and top-level `transitions` are legal directed edges with trigger, kind and minimal effects. Canonical phase nodes no longer use `next` / `returns`; `transition.py` keeps a legacy fallback only for older consumer policies that do not yet contain `transitions`.
- The phase graph is intentionally lightweight. It exists so transition helpers, validators and agents read the same legal flow contract; it does not store task history, operator logs, debug evidence, runbook bodies, implementation doc text or phase execution history, and it does not introduce graph engine classes, traversal frameworks or visualization.
- User migration cost is low for managed consumers: `sdlc-harness upgrade` or `sdlc-harness sync` refreshes the managed policy and transition helper, while existing `lifecycle.yaml`, `plan.yaml` and task data stay valid. Custom phase policies need a manual `next` / `returns` to top-level `transitions` conversion; old policies still work through the transition helper fallback, but canonical validation expects the explicit graph after sync.
- A SPRINTING task completes in two commits: implementation commit while the task is still present, then completion ledger commit after removing the task.
- Generic draft-to-plan rule: when any workflow promotes a draft into a formal `TASK-*`, it removes the source draft in the same state update; the current built-in implementation point is SPRINTING consuming `plan.draft.yaml.tasks[]`.
- Past task details are cold archive and only used for explicit forensic/audit/regression requests.
- Release history is also cold archive. `.docs/08_release/CURRENT_RELEASE.md` stores only the current release status; older release evidence is reconstructed from git tags, registry metadata, CI, release commits or external release systems.
- `parallel_execution` is an on-demand top-level plan contract. Each stage task defaults to a parallel eligibility check; when omitted for a task, that task remains serial. It does not store `phase` or `linked_task_id`; validators infer phase from lifecycle and task selection from `current_task_id`.
- `resume_capsule` is an optional top-level plan recovery card that becomes required for high-risk runtime/live SPRINTING tasks (`external_provider_live`, `deployed_runtime`, `business_handoff_ready`, or target runtime `cloud_vm`, `managed_service`, `browser`, `worker`). It stores only current state, canonical path, next step, blocker, last passed gate, do-not-retry entries and recovery refs.
- `.docs/09_runbooks/**` stores runtime/live/remote-operator runbooks, evidence indexes and exploration appendices. `resume_capsule.recovery_refs` must include the current implementation doc and at least one runbook/evidence document.
- Open task `working_notes` remains a short recovery surface: target 5-8 notes, validator hard limit 8 notes.
- Direct `validate-dev` is the SPRINTING in-development gate. It allows a valid current open `phase: "SPRINTING"` task, checks scoped dirty files and draft consumption, and rejects missing current-task contracts.
- `Development Self-Test Report` now requires `Report Status: PASS | BLOCKED | IN_PROGRESS | STALE`; direct `validate-dev` only passes completion-oriented evidence when `Report Status: PASS` and every scenario is `PASS`.
- `self_test_contract` keeps `module_key_test_path` as the compatible short summary and can add `module_key_test_graph` as a lightweight DAG for complex/high-risk paths. `graph_required: true` makes the graph mandatory for that task; legacy text-only contracts still pass when graph is not required.
- The test graph is a handoff contract, not active execution state: it only stores path nodes, directed edges and short evidence pointers, while runbooks, evidence bodies, debug logs, operator logs and task history remain outside the graph.
- High-risk runtime/live implementation docs use a short `Current Operator Path` for canonical operator path, runbook link, credential reference name, command/UI channel and do-not-retry summary. Debug logs, operator logs, runbook bodies, exploration history and diagnostic attempts stay out of the self-test report.
- `validate-current` and `tools/run_current_gate.py` keep phase-exit safety: after the phase gate runs, `plan.yaml` must have no open tasks before lifecycle advancement.

## Runnable Entry/Exit

- Entry points: `.codex/state/plan.yaml`, `.codex/state/plan.draft.yaml`, lifecycle phase transitions and `validate-plan` / direct `validate-dev` / phase-exit `validate-current` gates.
- Exit / side effects: validators accept or reject task contracts, draft consumption and phase-exit readiness; SPRINTING writes implementation and completion ledger commits.
- Config contract: task fields (`phase`, `allowed_paths`, `required_gates`, `result_docs`, `implementation_doc`) and lifecycle `current_phase`.
- Fixture/live boundary: workflow state protocol only; no product runtime is owned by plan state itself.

## Development Evidence

- Evidence Level: `local_runtime`, verified through package CLI regression and local Harness gates for TASK-084.
- Target Runtime Environment: `local`; the handoff entrypoint is `npm test --workspace agent-project-sdlc`.
- Runnable Entry: `npm test --workspace agent-project-sdlc; npx sdlc-harness validate-plan; npx sdlc-harness validate-dev`.
- Observable Exit: package regression passed with validator coverage for `workflow_default`, `codex_native_subagents`, legacy `user_requested`, invalid provider cases and SPRINTING path-lock violations; source sync/check also passed.
- Client / Server Initialization: local Node CLI runtime starts through `npm test --workspace agent-project-sdlc` and package CLI commands; no server process is required.
- Config Contract: no secrets; Harness root comes from `package.json#sdlcHarness.harnessFolderName` or `sdlc-harness.config.json#harnessFolderName`, and the parallel contract is read from `plan.yaml#parallel_execution`.
- Testing Handoff Readiness: ready for Review/Testing handoff after package tests, source sync/check, docs overview, validate-harness, validate-rfc and validate-dev pass.
- Known Missing Runtime Boundaries: no standalone `sdlc-harness parallel run` CLI is implemented in this task; Codex native subagents remain the runtime provider governed by prompt and plan contract.
- Basic Self-test Evidence: See `Development Self-Test Report`; `npm test --workspace agent-project-sdlc` PASS for TASK-084 package regression and the lightweight phase graph regression.

## Development Self-Test Report

- Report Status: PASS
- Contract Source: .docs/rfc/RFC_026_default_native_subagent_parallel_execution.md#8-development-self-test-impact
- Scenario Results: parallel-contract-schema PASS; sprinting-path-lock PASS; source-sync-assets PASS.
- Executed Gates: `npm test --workspace agent-project-sdlc`; `node packages/sdlc-harness/dist/cli.js package sync-source`; `node packages/sdlc-harness/dist/cli.js package check-source`; `make docs-overview`; `make validate-harness`; `make validate-rfc`; `make validate-dev`.
- Module Key Test Path: `npm test --workspace agent-project-sdlc; npx sdlc-harness validate-plan; npx sdlc-harness validate-dev` -> parallel-contract-schema -> sprinting-path-lock -> phase-transition-graph -> source-sync-assets -> TypeScript validator schema and path-lock checks -> Python validator parity through `make validate-plan` -> package asset source sync/check -> observable PASS output.
- Evidence Index Refs: package regression output; package source sync/check output; `make validate-plan`; docs overview and Harness/RFC/dev gate output.
- Missing / Blockers: none.
- Testing Handoff Readiness: ready for Review/Testing handoff with the required package, source sync, overview, Harness, RFC and dev gates recorded above.

| Scenario ID | Result | Executed Entry | Actual Exit | Evidence |
|---|---|---|---|---|
| parallel-contract-schema | PASS | `npm test --workspace agent-project-sdlc` | Validator tests accepted `workflow_default` and `codex_native_subagents`, and rejected invalid provider combinations. | package regression output |
| sprinting-path-lock | PASS | `npm test --workspace agent-project-sdlc` | Validator tests rejected overlapping owned paths and owned paths outside current task allowed paths. | package regression output |
| source-sync-assets | PASS | `node packages/sdlc-harness/dist/cli.js package sync-source && node packages/sdlc-harness/dist/cli.js package check-source` | Managed package assets synchronized and checked without drift. | source sync/check output |

## 3. 真实代码结构

| 文件（File） | 作用（Purpose） | 关键函数/对象（Key Functions/Objects） |
|---|---|---|
| `AGENTS.md` | Project-level protocol | Plan Protocol, work rules, natural-language routing |
| `.codex/state/lifecycle.yaml` | Current phase routing | `current_phase`, `active_skill`, `allowed_next_phases` |
| `.codex/state/plan.yaml` | Active short-term task contract | `current_task_id`, `next_task_sequence`, `tasks[]` |
| `.codex/state/plan.draft.yaml` | Built-in unadopted development draft queue | `next_task_sequence`, `tasks[]` |
| `.codex/state/memory.md` | Cross-stage reminder and navigation surface | short stable summaries plus links to formal fact sources |
| `.codex/pjsdlc_managed/templates/ADR_TEMPLATE.md` | ADR authoring template | `Options`, `Rationale`, `Supersedes / Superseded by`, related links |
| `.codex/pjsdlc_managed/templates/PLAN_TEMPLATE.yaml` | New-task template | open task fields, `result_docs` and `implementation_doc` examples |
| `.codex/pjsdlc_managed/templates/RUNBOOK_TEMPLATE.md` | Runtime/operator runbook template | canonical path, command channel, credential reference and do-not-retry fields |
| `.codex/pjsdlc_managed/templates/EVIDENCE_INDEX_TEMPLATE.md` | Runtime evidence index template | scenario, status, evidence pointer and gap table |
| `.codex/pjsdlc_managed/templates/EXPLORATION_APPENDIX_TEMPLATE.md` | Failed exploration appendix template | failed attempt isolation and promoted decisions |
| `.codex/pjsdlc_managed/policies/phase_contracts.yaml` | Phase routing contract | `phases` nodes and top-level `transitions` directed edges |
| `.codex/skills/pjsdlc_pm_prd/SKILL.md` | Product task prompt | `TASK-*` document-production task protocol with `phase: "REQUIREMENT_GATHERING"` |
| `.codex/skills/pjsdlc_architect_design/SKILL.md` | Design task prompt | `TASK-*` document-production task protocol with `phase: "ARCHITECTING"`, ADR decision boundary guidance |
| `.codex/skills/pjsdlc_dev_sprint/SKILL.md` | Development execution prompt | one-task protocol, two-commit ledger, push requirement |
| `.codex/skills/pjsdlc_manager/SKILL.md` | Workflow routing prompt | `/next`, `/dev`, `/devloop`, status routing |
| `.codex/skills/pjsdlc_rfc_recalibrate/SKILL.md` | Change recalibration prompt | RFC impact checklist |
| `tools/harness_utils.py` | Shared state helpers | `load_plan`, `validate_task_shape`, path expansion |
| `tools/validate_plan.py` | Active plan validator | current/future task checks and optional parallel contract checks |
| `tools/validate_dev_state.py` | Development state validator | rejects stale unconsumed drafts before `validate-dev` can pass |
| `tools/validate_allowed_paths.py` | Worktree scope validator | allowed path enforcement |
| `tools/validate_review.py` | Review exit validator | no-open-task check plus review report shape |
| `tools/validate_test_plan.py` | Test exit validator | no-open-task check plus test report, matrix, regression evidence and coverage gap |
| `tools/validate_release_plan.py` | Release exit validator | no-open-task check plus current release status/smoke/rollback docs |
| `tools/validate_rfc.py` | RFC exit validator | no-open-task check plus RFC status and impact sections |
| `tools/run_current_gate.py` | Phase gate runner | phase-to-gate dispatch plus no-open phase-exit check |
| `tools/status.py` | Human status report | lifecycle and task summary |
| `tools/transition.py` | Phase transition helper | lifecycle state mutation without history append |
| `packages/sdlc-harness/src/lib/init.ts` | Package init state seed | memory seed and `.docs/09_runbooks` directory creation |
| `packages/sdlc-harness/src/lib/validators.ts` | Package-side state validators | direct dev gate, resume capsule validation, working_notes limit, Report Status, Current Operator Path, Gate Breakdown checks, SPRINTING phase-exit gate and package CLI validators |
| `packages/sdlc-harness/src/lib/migrations.ts` | State migrations | remove checkpoints, history and gate logs; create missing memory with summary/link-only scope |

## 4. 核心数据流

```txt
Any workflow phase task starts
-> plan.yaml contains one small TASK-* open task with phase metadata
-> agent edits only allowed_paths for the current slice or plan.draft output
-> result_docs or implementation_doc points to the produced fact source
-> docs index and generated overview are updated
-> validate-plan checks the open task contract during execution
-> phase exit validator runs only after open tasks are removed
```

```txt
ARCHITECTING discovers PRD needs revision before development
-> transition.py reads phase_contracts.yaml#transitions edge ARCHITECTING -> REQUIREMENT_GATHERING
-> python3 tools/transition.py --to REQUIREMENT_GATHERING is legal without --force
-> lifecycle active_role/active_skill become pm/pjsdlc_pm_prd
-> PM updates PRD through one REQUIREMENT_GATHERING task and validate-pm
-> transition.py --to ARCHITECTING resumes design
```

```txt
Later-stage review/test/release discovers requirement or development self-test drift
-> python3 tools/transition.py --to RFC_RECALIBRATION is legal from SPRINTING / REVIEWING / TESTING / RELEASING because transitions declare those interrupt edges
-> lifecycle.suspended_phase records the interrupted phase through transition effects
-> active_role/active_skill become rfc_owner/pjsdlc_rfc_recalibrate
-> RFC work runs validate-rfc and creates or adjusts downstream SPRINTING tasks
-> transition.py --to SPRINTING follows the RFC resume edge, clears suspended_phase and resumes development
```

```txt
SPRINTING task starts
-> if no open task exists, agent may promote one plan.draft.yaml task into a formal TASK-* and delete the source draft
-> plan.yaml contains full open task contract
-> high-risk runtime/live tasks maintain resume_capsule and .docs/09_runbooks recovery refs
-> agent edits only allowed_paths
-> direct validate-dev may run while the current task remains open
-> required_gates pass
-> related module implementation doc records facts and verification
-> implementation commit is created while task remains in plan.yaml
-> task is removed from plan.yaml
-> completion ledger commit is created
-> validate-current can pass only after no open task remains
-> both commits are pushed before the next task starts
```

Default parallel execution:

```txt
Stage task starts
-> main agent performs parallel eligibility check
-> if safe, main agent creates parallel_execution.trigger = workflow_default
-> runtime_managed + codex_native_subagents is the default provider
-> user_requested keeps explicit user parallel intent
-> user_orchestrated / codex_exec_worktree are fallback providers
-> workers operate inside owned_paths and run focused gates
-> main agent reviews, merges/cherry-picks, runs total gates and updates final fact sources
```

## 5. 关键实现逻辑

- `plan.yaml` is intentionally short lived. It is not a historical task database.
- `plan.yaml` is not an exhaustive log of everything an Agent does. The generic workflow contract covers tasks that affect phase deliverables, gates, implementation facts or RFC recalibration; local teams may extend task taxonomy for broader project management needs without changing the core `TASK-*` workflow semantics.
- `current_phase` belongs only to `lifecycle.yaml`; `plan.yaml`, `plan.draft.yaml` and `parallel_execution` must not duplicate it.
- `transition.py` derives legal targets from the explicit phase graph in `phase_contracts.yaml#transitions`. `allowed_next_phases` is regenerated from outgoing edges of the target phase; RFC interrupt/resume and BLOCKED interrupt/resume behavior come from edge effects instead of hardcoded transition rules. If an older consumer policy lacks `transitions`, the helper falls back to legacy `next` / `returns` plus the former RFC and BLOCKED rules for compatibility.
- `validate-harness` rejects canonical phase graph drift: missing top-level `transitions`, legacy `next` / `returns` on phase nodes, unknown phase references, duplicate edges, invalid transition kinds, invalid effects and illegal `<suspended_phase>` targets.
- Draft queues are not active execution state and must not retain adopted or completed drafts. The current built-in draft queue is `plan.draft.yaml`; it must not contain `current_task_id`.
- direct `validate-dev` rejects any remaining `plan.draft.yaml.tasks[]`; agents must either continue promoting real unadopted drafts or remove already-consumed stale drafts before development completion.
- direct `validate-dev` requires lifecycle `current_phase: "SPRINTING"` and allows either an empty development queue or one valid current open `phase: "SPRINTING"` task with `current_task_id`, `docs`, `allowed_paths`, `required_gates`, `acceptance_criteria` and `implementation_doc`.
- direct `validate-dev` requires `resume_capsule` for high-risk current SPRINTING tasks, validates its task id, concrete recovery fields, do-not-retry list, current implementation doc ref and `.docs/09_runbooks/**` ref.
- direct `validate-dev` requires legal `Development Self-Test Report` status. `BLOCKED`, `IN_PROGRESS` and `STALE` reports are recoverable facts but cannot close a development task; `PASS` with any non-PASS scenario also fails.
- `validate-plan` and `validate-dev` validate `module_key_test_graph` when present or required: exactly one entry, at least one observable exit, allowed node kinds, unique ids, known edge refs, no cycles, all nodes reachable from entry, every scenario represented by a reachable scenario node, and every scenario path reaching an observable exit.
- direct `validate-dev` rejects self-test report headings that turn the report into a debug/operator/runbook/exploration log. High-risk tasks must link operator facts through `Current Operator Path` and `.docs/09_runbooks/**`.
- `validate-dev` enforces dirty-file scoping when a current open task exists; changes outside the current task `allowed_paths` fail the direct dev gate.
- ADRs solve the long-term "why this option, not another" problem. Architecture and tech plan slices may keep local rationale, but decisions with alternatives, cross-module or cross-stage impact, high reversal cost or future supersede semantics belong in `.docs/05_decisions/`.
- `memory.md` must not become a decision ledger. It may point to ADRs, PRDs, tech plans or implementation docs, but detailed context, alternatives, tradeoffs and consequences remain in those formal fact sources.
- Field audit: `active_role`, `active_skill`, `current_milestone`, `blocked_reason`, `suspended_phase` and `allowed_next_phases` are lifecycle-only; `current_task_id` and `next_task_sequence` are plan-only; `tasks[].phase` is semantic task classification rather than current lifecycle state and remains on each task.
- Every phase task is task-controlled: one `TASK-*` task should produce one bounded document slice, review batch, test evidence set, release artifact set, RFC impact slice or development change.
- `validate-plan` permits open tasks and checks their shape; phase exit gates reject remaining open tasks. In `SPRINTING`, this no-open rule lives in `validate-current` and `tools/run_current_gate.py`, not in direct `validate-dev`.
- `allowed_paths`, `required_gates` and `working_notes` are execution-time constraints, not a long-term query API; open task `working_notes` must stay within the 8 item recovery-note limit.
- Gate evidence belongs in the current task while executing, and in implementation docs, CI logs, current release status or external release systems after completion.
- `lifecycle.yaml` does not store phase history. Phase history is reconstructed from git, PRs, CI, registry metadata, tags or external release evidence only when explicitly needed.
- `/dev` runs one task and stops. `/devloop` repeats `/dev` until neither `plan.yaml.tasks[]` nor `plan.draft.yaml.tasks[]` contains a clear next task, or a blocker appears.
- The workflow assumes a singleton project-level Harness collaboration boundary; concurrent agents must coordinate through git and active state rather than independent archive files.
- Parallel execution is default-evaluated and on-demand. `trigger` must be `workflow_default` or `user_requested`; `workflow_default` requires `runtime.provider: "codex_native_subagents"`; `mode` must be `runtime_managed` or `user_orchestrated`; validators reject duplicate `phase` / `linked_task_id` fields in the contract.
- SPRINTING write workers must declare non-empty, non-overlapping `owned_paths` within the current task `allowed_paths`; non-native write runtimes still require `branch` and `worktree`.
- Workers do not own final fact sources. PRD, plan state, implementation docs, test results, generated overviews and total gate evidence are integrated by the main agent.

## 6. 与技术方案的偏移

- Early designs used checkpoint files, `.agent/archive/**`, `gate_results.log` and lifecycle `history`; those have been removed from the active state model.
- DEV-043 migrated state/task facts from task-grain implementation docs into this module-level protocol document.

## 7. 测试覆盖（Test Coverage）

| 测试（Test） | 覆盖范围（Coverage） | 最近记录结果（Result） |
|---|---|---|
| `python3 tools/validate_plan.py --allow-open` | Current plan shape while a task is in progress | PASS for TASK-065 |
| `python3 tools/validate_plan.py` | Current plan shape and no remaining open tasks | PASS in Harness gates |
| `python3 tools/validate_dev_state.py` | `validate-dev` rejection of stale unconsumed draft tasks | PASS for TASK-062 |
| `python3 tools/validate_allowed_paths.py` | Current worktree changes within active task boundary | PASS in task gates |
| `npm test --workspace agent-project-sdlc` | Package validator regression for direct `validate-dev` open-task acceptance and `validate-current` phase-exit rejection | PASS for TASK-071; 10 tests passed |
| `node packages/sdlc-harness/dist/cli.js package sync-source` | Managed Makefile and Skill/package assets reflect dev gate wiring changes | PASS for TASK-071 |
| `node packages/sdlc-harness/dist/cli.js package check-source` | Package canonical assets match source after dev gate wiring changes | PASS for TASK-071 |
| `make validate-plan` | Active RFC task contract and allowed changed paths for TASK-071 | PASS for TASK-071 |
| `make docs-overview` | Generated overview refresh after RFC_018 and implementation doc updates | PASS for TASK-071 |
| `make validate-rfc` | RFC_018 status, impact sections and no-open task safety | PASS for TASK-071 |
| `make validate-current` | Phase-exit gate keeps no-open safety after TASK-071 completion | PASS for TASK-071 |
| `make validate-dev` | Direct SPRINTING dev gate passes with an empty development queue after RFC resume | PASS for TASK-071 |
| `make validate-harness` | Prompt language and generated overview consistency after dev gate wiring changes | PASS for TASK-071 |
| `tests/sdlc-harness/sync-init-doctor.test.mjs` | Package init memory seed and managed asset sync behavior | PASS for TASK-065 |
| `tests/sdlc-harness/upgrade.test.mjs` | Migration-created memory seed and legacy state migration | PASS for TASK-065 |
| `tests/sdlc-harness/validators.test.mjs` | Package validator plan task, draft consumption, resume capsule, Gate Breakdown, default/native parallel contract and path-lock acceptance/failure cases | PASS in current working tree |
| `node packages/sdlc-harness/dist/cli.js package sync-source && package check-source` | Managed package assets include resume-first templates, Skills, tools and README updates | PASS in current working tree; sync changed=48 |
| `npm test --workspace agent-project-sdlc` | Package validator regression for Report Status, Current Operator Path, disallowed self-test log sections and working_notes limit | PASS on 2026-05-30; 10 tests passed |
| `tests/sdlc-harness/transition.test.mjs` | Explicit phase graph transition routing, RFC/BLOCKED effects and legacy `next` / `returns` fallback | Covered by package regression |
| `tests/sdlc-harness/validators.test.mjs` | Package-side phase graph validation for missing transitions, legacy fields and unknown phase targets | Covered by package regression |
| `node packages/sdlc-harness/dist/cli.js package sync-source && package check-source` | Managed package assets include self-test boundary templates, Skills, tools and README updates | PASS on 2026-05-30; sync changed=48 |
| `make docs-overview && make validate-harness && make validate-plan` | Generated overview, Harness scaffold and active plan contract after self-test boundary hardening | PASS on 2026-05-30 |
| `tests/sdlc-harness/transition.test.mjs` | `ARCHITECTING -> REQUIREMENT_GATHERING` rollback, PM role/skill activation and `SPRINTING` rollback rejection | PASS for TASK-061 |
| `tests/sdlc-harness/transition.test.mjs` | Controlled `RFC_RECALIBRATION` interrupt from SPRINTING/REVIEWING/TESTING/RELEASING, illegal pre-development RFC entry, RFC return cleanup and unchanged REVIEWING -> TESTING | PASS for TASK-082 |
| `make validate-current` | Phase-specific gate dispatch | PASS in sprint/review/test transitions |
| `npm test --workspace agent-project-sdlc` | Package migration, init seed and validator parity | PASS for TASK-065 |
| `node packages/sdlc-harness/dist/cli.js package sync-source && package check-source` | Package assets synchronized from source README, Skill and template files | PASS for TASK-065 |
| `make validate-harness` | Prompt language and generated overview consistency | PASS for TASK-065 |
| `npm test --workspace agent-project-sdlc` | Package validator parity for release current-status and legacy docs compatibility | PASS for TASK-069 |
| `make validate-harness` | Prompt language and generated overview consistency after release current-status changes | PASS for TASK-069 |

## 8. 变更记录（Change Log）

| 日期（Date） | Task ID | Commit | 摘要（Summary） |
|---|---|---|---|
| 2026-05-25 | `DEV-010`, `DEV-011` | Historical implementation commits | Replaced checkpoint/task archive model with `plan.yaml`. |
| 2026-05-25 | `DEV-018`, `DEV-019` | Historical implementation commits | Added two-commit task completion and pre-compression implementation commit rule. |
| 2026-05-25 | `DEV-024` - `DEV-028` | Historical implementation commits | Shortened plan/gate/lifecycle state and strengthened RFC impact handling. |
| 2026-05-30 | Resume-first runtime task protocol | Working tree | Added high-risk runtime `resume_capsule`, `.docs/09_runbooks` recovery docs and Gate Breakdown validation. |
| 2026-05-30 | Self-test report boundary hardening | Working tree | Added Report Status, Current Operator Path, disallowed log-section checks and working_notes limit validation. |
| 2026-05-31 | Lightweight explicit phase graph | Working tree | Moved canonical phase routing from node-local `next` / `returns` and hardcoded RFC interrupt rules to top-level `transitions`, with validator coverage and legacy fallback. |
| 2026-05-31 | Phase graph migration guidance | Working tree | Documented that managed consumers migrate through upgrade/sync with no state schema migration, while custom phase policies convert `next` / `returns` to explicit transition edges. |
| 2026-05-26 | `DEV-043` | DEV-043 implementation commit | Consolidated legacy state/task implementation docs into module facts. |
| 2026-05-27 | `DEV-050` | DEV-050 implementation commit | Added opt-in `parallel_execution` contract for multi-agent/worktree coordination. |
| 2026-05-30 | `TASK-084` | TASK-084 implementation commit | Added default Codex native subagent scheduling semantics and SPRINTING path-lock validation. |
| 2026-05-27 | `DEV-056` | Working tree | Extended `plan.yaml` task control to PRD and design document generation, slicing and fact-source synthesis. |
| 2026-05-27 | `TASK-057` | Working tree | Unified all new workflow tasks under `TASK-*` with `phase`, expanded plan control to review/test/release/RFC, and kept legacy task prefixes compatible. |
| 2026-05-28 | `TASK-059` | Pending implementation commit | Removed duplicate current phase state from plan files and parallel execution contracts. |
| 2026-05-28 | `TASK-061` | Working tree | Added `phase_contracts.yaml#returns` and `transition.py` support so ARCHITECTING can return to REQUIREMENT_GATHERING for PRD edits before SPRINTING, while SPRINTING cannot directly return to PRD. |
| 2026-05-28 | Spec clarification | Working tree | Clarified that `plan.yaml` is a general recoverable task-splitting container, while default Harness behavior only governs workflow phase tasks; broader task definitions are local configuration concerns. |
| 2026-05-28 | `TASK-062` | Working tree | Added promote-on-consume semantics for `plan.draft.yaml`, dev-state validation, package validator parity, and cleared the stale `DEV-001` draft from current state. |
| 2026-05-28 | `TASK-063` | Working tree | Clarified that promote-on-consume is the generic rule for any draft-to-plan workflow, while `plan.draft.yaml` remains the current built-in development draft queue. |
| 2026-05-28 | `TASK-065` | Pending implementation commit | Clarified ADR and memory responsibilities across PROJECT_SPEC, README/package README, architect skill, ADR template and package memory seeds. |
| 2026-05-29 | `TASK-069` | Working tree | Clarified that release history is cold archive while `.docs/08_release/CURRENT_RELEASE.md` remains the active release status fact source. |
| 2026-05-29 | `TASK-071` | Working tree | Split direct `validate-dev` open-task semantics from `validate-current` phase-exit no-open checks and moved managed Makefile dev gate to package CLI. |
| 2026-05-30 | `TASK-082` | Working tree | Constrained RFC interrupts to SPRINTING and later phases, preserved normal REVIEWING -> TESTING routing, and cleared `suspended_phase` when RFC returns to SPRINTING. |

## 9. 后续维护注意事项

- Do not reintroduce active historical ledgers unless a new RFC explicitly changes the state model.
- If a new workflow action needs durable history, prefer git, tags, registry/CI/release systems or module implementation docs before adding state files.
