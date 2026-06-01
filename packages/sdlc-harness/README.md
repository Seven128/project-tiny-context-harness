# AI SDLC Harness

`agent-project-sdlc` provides the `sdlc-harness` CLI and canonical workflow assets for AI-assisted software delivery. It materializes an agent-readable lifecycle, workflow skills, templates, policies, gates and documentation structure into a project workspace.

## Install

```sh
npm install -D agent-project-sdlc
npx sdlc-harness init
```

For existing projects:

```sh
npx sdlc-harness init --adopt
```

## Capabilities

| Capability | Entry Point | Description |
|---|---|---|
| Project initialization | `npx sdlc-harness init` | Creates `AGENTS.md`, `<harnessRoot>/state/**`, workflow skills, managed templates/policies, `.docs/**` and a Makefile include; fresh lifecycle starts at `REQUIREMENT_GATHERING`. |
| Existing project adoption | `npx sdlc-harness init --adopt` | Adds Harness non-destructively to an existing repository; adopt lifecycle starts at `SPRINTING`. |
| Configurable Harness root | `--harness-folder`, `package.json#sdlcHarness.harnessFolderName`, `sdlc-harness.config.json` | Supports Codex `.codex`, Claude `.claude`, Cursor `.cursor`, Cline `.cline`, Roo `.roo`, Gemini `.gemini` or a custom folder; root resolution prefers package.json, then config file, then `.agent`. |
| Managed file sync | `npx sdlc-harness sync` | Materializes package canonical assets and safely updates package-managed guidance sections inside user-owned Markdown files while preserving project state, docs and local overrides. |
| Upgrade | `npx sdlc-harness upgrade` | Runs migrations and sync for already-adopted projects, including legacy seed guidance migration. |
| Diagnostics | `npx sdlc-harness doctor` | Reports Harness root, package version, schema version and key managed paths. |
| Workflow self-inspection | `npx sdlc-harness inspect-workflow` | Read-only check for workflow weight, fact-source drift, handoff clarity and recovery safety; metrics are labeled `measured`, `inferred`, `self_reported` or `unavailable`. |
| Validators | `npx sdlc-harness validate-*`, `make validate-current`, `make validate-harness` | Checks product, UI/UX, architecture design slicing, development, review, test, release, RFC, active plan shape, prompt language contract and generated overview freshness. |
| Harness Python tools | `tools/*.py` | Package-managed local workflow tools, including `transition.py`, Python validators and overview generation helpers. |
| Lifecycle workflow | `<harnessRoot>/state/lifecycle.yaml`, `<harnessRoot>/state/plan.yaml`, `.docs/**` | Tracks REQUIREMENT_GATHERING, UI_UX_DESIGNING, ARCHITECTING, SPRINTING, REVIEWING, TESTING, RELEASING and RFC_RECALIBRATION facts. |
| Stage task control | `plan.yaml`, `make validate-plan`, `npx sdlc-harness validate-plan` | Keeps each stage's agent work in small `TASK-*` tasks with `phase` metadata and scoped paths/gates. |
| Natural-language control | `AGENTS.md` plus workflow skills | Lets users say things like "continue", "start development", "run tests" or "requirements changed"; agents map these to workflow actions. |
| Default parallel scheduling contract | `plan.yaml#parallel_execution` | Stage tasks default to a safe-parallelism check; suitable work uses Codex native subagents first, with user-orchestrated and worktree fallbacks. |
| Resume-first runtime handoff | `plan.yaml#resume_capsule`, `.docs/09_runbooks/**` | Keeps high-risk runtime/live/remote-operator tasks recoverable through a short resume card, runbook, evidence index and exploration appendix. |
| Workflow skills | `<harnessRoot>/skills/pjsdlc_*/SKILL.md` | Provides role prompts for product, architecture, development, implementation docs, review, testing, release and RFC recalibration. |
| Project-local skill overrides | `<harnessRoot>/pjsdlc_managed/override_skills/<skill_name>.md` + `npx sdlc-harness sync` | Appends project-specific role instructions to generated Skill output without editing managed Skill files. |
| Local policy overrides | `<harnessRoot>/pjsdlc_managed/policies/*.local.yaml` | Preserves project-specific policy additions separately from package defaults. |
| Agent-readable user guide asset | `assets/docs/README.md` | Ships the source workspace root README inside the npm package so user agents can inspect the full workflow guide from `node_modules`. |
| Documentation overview | `make docs-overview`, `make validate-doc-overviews` | Regenerates human-readable stage overviews from `.docs/**` fact slices. |
| Package source checks | `sdlc-harness package sync-source`, `sdlc-harness package check-source` | Maintainer commands for keeping package canonical assets aligned with this source workspace. |

## Skill Overrides

Do not edit generated files under `<harnessRoot>/skills/**/SKILL.md`; `sync` and `upgrade` regenerate them.

To customize a stage role prompt, create:

```txt
<harnessRoot>/pjsdlc_managed/override_skills/<skill_name>.md
```

Example:

```txt
.codex/pjsdlc_managed/override_skills/pjsdlc_dev_sprint.md
```

Then run:

```sh
npx sdlc-harness sync
```

The sync output is the package base Skill plus one appended `Local Override` block. Override files support either a plain project-local snippet or a complete `SKILL.md` with `name` and `description` frontmatter. Complete Skill overrides are appended, not replaced: `sync` validates the override `name`, merges the override `description` into the generated top-level metadata, strips the override frontmatter, and appends the full body. After sync, users or their agents should review the merged Skill for semantic conflicts in phase boundaries, `allowed_paths`, `required_gates`, commit/release rules and completion checks. Unknown skill names block sync so misspellings do not silently fail.

## Default Parallel Scheduling

The default workflow evaluates each stage task for safe parallelism. When the task can be split safely, the main agent creates `parallel_execution.trigger: "workflow_default"` in `plan.yaml` and uses Codex native subagents first. If the task is not safe to split, the main agent keeps the workflow serial and records the reason. Explicit user requests for multi-agent, parallel or multi-worktree execution use `trigger: "user_requested"`.

- `runtime_managed` with `runtime.provider: "codex_native_subagents"`: the default path. The main agent assigns workers, waits for results, reviews, merges or cherry-picks, and runs the total gate.
- `user_orchestrated`: use when the runtime cannot spawn subagents. The main agent generates copyable worker prompts, and the user manually opens Codex conversations or worktrees and pastes them.
- `codex_exec_worktree`: fallback for high-risk writes or user-requested hard isolation. The first version does not add a `sdlc-harness parallel run` CLI.

`parallel_execution` does not store duplicate current phase or current task fields. Agents read phase from `<harnessRoot>/state/lifecycle.yaml#current_phase` and task selection from `<harnessRoot>/state/plan.yaml#current_task_id`.

SPRINTING write workers must use disjoint `owned_paths`, and each owned path must be within the current task `allowed_paths`. Workers do not own final PRD, plan, implementation docs, review/test/release reports, generated overviews or release actions; the main agent remains the integration owner.

## Stage Task Control

Every stage's agent work is plan-controlled. Conversational PRD or design creation, existing document slicing, fact-source-based synthesis, development, review, testing, release preparation and RFC recalibration should create or resume one small `TASK-*` task in `plan.yaml` with a valid `phase`, write the current task's `result_docs` or `implementation_doc`, update indexes/overviews, run `validate-plan`, and remove the task after completion. Phase exit validators reject remaining open tasks.

Release docs are current-state facts, not a version ledger. New release work should update `.docs/08_release/CURRENT_RELEASE.md`; `validate-release` accepts legacy versioned release docs only for existing projects that have not migrated yet.

The generic rule is that any workflow promoting a draft task into a formal `TASK-*` in `plan.yaml` must remove the source draft from its draft queue in the same state update. The formal task is then recovered only from `plan.yaml`; completed history lives in implementation docs, git, PR and CI records. The built-in Harness draft queue is currently `plan.draft.yaml.tasks[]`, which means unadopted development drafts only. `/devloop` treats the development queue as exhausted only when both `plan.yaml.tasks[]` and `plan.draft.yaml.tasks[]` have no executable task.

`UI_UX_DESIGNING` sits between PRD and architecture. It writes `.docs/02_experience/**` UX slices with user journeys, screen contracts, interaction states, responsive/a11y acceptance and handoff matrix. Visual UI projects also maintain root `DESIGN.md` using Google's `DESIGN.md` format for design-system tokens and components; CLI/API/non-visual projects can declare `Applicability: cli_or_api_experience` or `Applicability: not_applicable` in the UX slice instead of creating `DESIGN.md`.

Phase routing is expressed as a lightweight explicit directed graph in `<harnessRoot>/pjsdlc_managed/policies/phase_contracts.yaml`: `phases` stores stable phase contracts, while `transitions` stores legal edges and small runtime effects such as setting or clearing `suspended_phase`. This makes normal advance, pre-development return, TESTING bugfix return, RFC interrupt/resume and BLOCKED resume rules consumable by both the transition helper and validators. It is intentionally not a heavy graph engine: no history graph, traversal framework, node/edge classes or visualizer are introduced; the goal is to reduce missed rules and drift.

Migration cost is low for projects that use managed assets: run `npx sdlc-harness upgrade` to sync the new `phase_contracts.yaml`, `tools/transition.py`, `pjsdlc_uiux_design`, `UI_UX_DESIGN_TEMPLATE.md`, `validate-uiux` and configured-root Python/Makefile gate fixes, or run `npx sdlc-harness sync` if only managed files need refreshing. `lifecycle.yaml` and `plan.yaml` do not need manual migration; old `allowed_next_phases` values are regenerated from the graph on the next transition, and the fresh/adopt initial phase split only affects new `init` runs. Projects with custom phase policies should convert node-local `next` / `returns` to top-level `transitions`, and add `REQUIREMENT_GATHERING -> UI_UX_DESIGNING -> ARCHITECTING`, `ARCHITECTING -> UI_UX_DESIGNING`, and the `TESTING -> UI_UX_DESIGNING` / `ARCHITECTING` / `SPRINTING` bugfix return edges when they want the new routing. If the new `validate-harness` reports missing `transitions`, run `upgrade` or `sync` before validating again.

Before development starts, `ARCHITECTING` can return to `REQUIREMENT_GATHERING` for PRD edits or to `UI_UX_DESIGNING` for missing screen contracts, interaction states, responsive/a11y acceptance or `DESIGN.md`. The manager uses `python3 tools/transition.py --to REQUIREMENT_GATHERING` or `python3 tools/transition.py --to UI_UX_DESIGNING`, completes one stage task, runs that stage gate, then returns to the downstream phase. Requirement, acceptance, experience-contract or product-boundary changes after `SPRINTING` use RFC recalibration; `SPRINTING`, `REVIEWING`, `TESTING` and `RELEASING` can enter the controlled interrupt with `python3 tools/transition.py --to RFC_RECALIBRATION`, then return to `SPRINTING` after `validate-rfc`.

When TESTING finds a bug, first record `Bugfix Route` in `.docs/07_test/TEST_REPORT.md`, then let the manager choose the lightweight return. `bugfix_uiux_replan` uses `python3 tools/transition.py --to UI_UX_DESIGNING` when PRD is correct but UX contract, screen contract, handoff matrix or `DESIGN.md` is wrong. `bugfix_replan` uses `python3 tools/transition.py --to ARCHITECTING` when the technical plan, interface contract, task breakdown, Development Self-Test Contract or Module Key Test Graph must change. `bugfix_implementation_gap` uses `python3 tools/transition.py --to SPRINTING` only when the technical plan is still correct and implementation deviated from it. Requirement, acceptance or product-boundary changes still use RFC recalibration.

## Workflow Self-Inspection

Use `npx sdlc-harness inspect-workflow` when a user agent needs to check whether a repository is running the Harness workflow as intended, especially whether the workflow has become too heavy. The command is read-only: it does not write reports, run heavyweight tests, upload telemetry or invent precise token numbers.

Each metric includes a `data_source`: `measured` for local files, fields or validator results the script actually read; `inferred` for proxies derived from size, duplication, missing fields or long handoff docs; `self_reported` for values explicitly supplied by the user or agent; and `unavailable` for data the local environment cannot know, such as true model token telemetry when the client did not provide it.

Default workflow-weight thresholds are intentionally simple. `plan.yaml` over 200 lines is `WARN` and over 500 lines is `BLOCKED`; more than one open task is `BLOCKED`; current task `allowed_paths` over 12 is `WARN` and over 25 is `BLOCKED`; current task document refs over 5 is `WARN` and over 10 is `BLOCKED`; `working_notes` over 8 is `BLOCKED`; Development Self-Test Report size is `WARN` / `BLOCKED` above 80 / 120 lines for ordinary tasks and 120 / 180 lines for high-risk runtime tasks.

When the agent or client has real recent-cost data, pass it explicitly:

```sh
npx sdlc-harness inspect-workflow --recent-minutes 18 --recent-turns 7 --estimated-tokens 12000
```

Use `--prompt` to print a self-inspection prompt for qualitative checks such as whether the current entry, task, next step, hard constraints and Review/Testing handoff are clear. Use `--json` when CI or another agent needs a machine-readable `decision`, `metrics` and `findings` report. `BLOCKED` exits non-zero; `WARN` remains a successful diagnostic exit.

Outcome Comparison answers the core Harness question: whether the added workflow cost buys fewer omissions, less rework and better handoff. The baseline is not "how fast pure vibe coding can write the first code"; it is how long pure vibe coding would take to reach the same quality bar: Review-ready, Testing-ready and handoff/recovery-ready. Missing timing or baseline inputs are reported as `unavailable`.

```sh
npx sdlc-harness inspect-workflow \
  --workflow-control-minutes 5 \
  --total-delivery-minutes 30 \
  --estimated-vibe-handoff-minutes 30 \
  --avoided-rework-minutes 10 \
  --comparison-confidence medium
```

`workflow_control_minutes` only counts control cost: reading lifecycle/plan to find state, understanding phase rules, filling workflow fields, fixing schema/validator shape, handling transitions, and resolving allowed_paths / overview / source drift. Durable deliverables such as PRD, tech plan, test cases, implementation docs, actual coding, testing, review and release smoke are not workflow control cost. Ordinary tasks warn/block above 30% / 50% `workflow_overhead_ratio`; high-risk tasks use 40% / 60%. `net_value_minutes` combines the same-quality vibe baseline with avoided rework so a slower workflow can still be judged useful when it prevents downstream misses.

The source repository also includes `examples/delivery-benchmark/`, a repo-local benchmark for validating Outcome Comparison against real from-scratch projects. It prepares fixed baseline/Harness scenarios and scores delivery quality, recovery, change handling and workflow control cost. It is intentionally not a public `sdlc-harness` command yet.

`validate-uiux` requires at least one non-overview `.docs/02_experience/**` deliverable. UX slices must cite PRD / requirement IDs or explicitly declare `Applicability: not_applicable`; visual UI slices require root `DESIGN.md` and fail on `@google/design.md` linter errors. Warnings are reported by the linter but are not treated as default blockers.

`validate-design` treats semantic slicing as a hard gate. Generated `overview.md` files do not count as deliverables, development draft tasks in `plan.draft.yaml` must reference existing tech plan slices through `docs.tech_plan`, UI/frontend draft tasks must reference existing UX slices through `docs.uiux` and root `DESIGN.md` through `docs.design_system`, multiple development draft tasks need distinct primary tech plan slices, and explicit AI provider/copilot, external-system, or compliance/permission/audit themes require dedicated architecture slices. Draft tasks with runnable boundaries must also include `self_test_contract`, backed by a `Development Self-Test Contract` section in the tech plan; the contract must include `module_key_test_path` from local start or invocation to all self-test scenarios completion, covering every runnable entry promised by the current task/module and its internal key paths. Complex or high-risk paths may set `graph_required: true` and provide `module_key_test_graph` to express entries, checkpoints, scenarios, exits and evidence refs as a lightweight DAG.

SPRINTING Definition of Done includes module-level runnable delivery boundaries. API, CLI, server route, service, agent, runtime, adapter, worker, provider, config-contract and fixture/live boundaries promised by a technical plan or task must be implemented or marked `BLOCKED` during development. Runtime/app/provider/live tasks must declare `evidence_level.required`, `target_runtime_environment` and `self_test_contract` in `plan.yaml`; every gate in `self_test_contract.required_gates` must also appear in task `required_gates`, and `self_test_contract.module_key_test_path` must describe the path from local start or invocation to all self-test scenarios completion, covering every runnable entry promised by the current task/module and its internal key paths. Complex task `module_key_test_graph` is the canonical handoff path detail: it is a DAG instead of a tree because scenarios can share setup and converge on the same observable exit; it is not a heavy test execution graph and must not store traces, debug logs, operator logs, runbook bodies or evidence bodies. `deployed_runtime` cannot be closed by `unit`, `local_runtime`, `external_provider_live`, provider smoke, fake adapters or localhost smoke alone, and `business_handoff_ready` requires a Testing Handoff Contract. The current task implementation doc must include `Development Evidence` and a completed `Development Self-Test Report` with `Report Status: PASS | BLOCKED | IN_PROGRESS | STALE`, contract source, Module Application Entry, scenario results, executed gates, Module Key Test Path, Module Key Test Graph when required, Observable Exit, Current Blocker, Testing Handoff Readiness and Evidence Index Refs; only `Report Status: PASS` with every scenario `PASS` can close a development task. The report proves module entry, core path, exit and minimal evidence pointers; it is not a debug log, operator log, runbook, evidence dump or exploration history. Fallback/diagnostic detail belongs in `.docs/09_runbooks/**` evidence indexes, appendices or git history. The report must not use an `Actual Evidence` body field, should stay under 80 lines for ordinary tasks and under 120 lines for high-risk runtime tasks. Module Key Test Path records actual entries, internal key paths, boundaries, checkpoints and observable completion evidence. Provider smoke, fixture smoke, fake adapters and one-shot smoke prove only local links; they do not by themselves prove application readiness. REVIEWING treats missing entry/exit, initialization, config contract, target runtime, evidence level or development evidence as blocking, and TESTING only exercises entrypoints that Review has confirmed as `PASS`; complex paths are consumed through Module Key Test Graph, and TESTING must not add product runtime, bootstrap, provider adapter, deploy code or package runtime scripts.

High-risk runtime/live/remote-operator tasks are resume-first. When the current SPRINTING task requires `external_provider_live`, `deployed_runtime` or `business_handoff_ready`, or its target runtime is `cloud_vm`, `managed_service`, `browser` or `worker`, `plan.yaml` must include top-level `resume_capsule` with the current state, canonical path, next step, blocker, last passed gate, do-not-retry list and recovery refs. Any judgment that changes the next action must be promoted to `resume_capsule.do_not_retry`, the runbook top-level `Hard Constraints`, or the short `Current Operator Path`; it cannot live only in evidence, notes, an appendix, or a long implementation doc. The validator scans `working_notes`, implementation docs and runbooks for session / QR / canonical path / do-not-retry judgments and fails when they are not promoted. Open task `working_notes` stays short, with a 5-8 item target and an 8 item validator limit. Long-term implementation facts stay in the implementation doc; operator paths, credential references and remote entrypoints live in `.docs/09_runbooks/**`; the implementation doc only keeps a short `Current Operator Path` with canonical operator path, runbook link, credential reference name, command/UI channel, hard constraints and do-not-retry summary. Evidence bodies live in an evidence index or external system and must not move into implementation-doc mainline sections such as `Evidence Dump`, `Operator Log`, `Failed Attempts`, or `Screenshot Index`; failed exploration stays in an exploration appendix. The Development Self-Test Report for these tasks must include a Gate Breakdown that separates local gate, cloud/service gate, executor/operator readiness and live smoke or handoff evidence.

`make validate-dev` and `npx sdlc-harness validate-dev` are in-development SPRINTING gates. They allow the current `current_task_id` open task to remain in `plan.yaml` while checking that it is a valid `phase: "SPRINTING"` task with `docs`, `allowed_paths`, `required_gates`, `acceptance_criteria`, `implementation_doc`, scoped dirty files, an empty `plan.draft.yaml` queue, runtime evidence task contract, `self_test_contract`, linked runnable-entry implementation docs, structured development evidence and a completed Development Self-Test Report. The report must include legal `Report Status` and Module Key Test Path so later agents can reuse the debug path from local entry to all self-test scenarios completion; that path is scoped to entries and internal key paths promised by the current task/module, not the whole system. When `graph_required: true` or `module_key_test_graph` exists, validators check that the graph is a single-entry DAG, node and edge refs are valid, every scenario is reachable from the entry and can reach an observable exit, and `evidence_ref` is only a short pointer. `validate-dev` only passes completion-oriented dev evidence when `Report Status: PASS` and every scenario is `PASS`; `BLOCKED`, `IN_PROGRESS` and `STALE` reports may exist as recovery facts but cannot close the current development task. Page tasks need a dev server or page URL plus browser/Playwright/screenshot/equivalent interaction evidence; API/CLI/worker/service/agent/runtime tasks need a startup or invocation command, endpoint/health/status, and observable response/output/side effect. `validate-dev` checks content consistency and completeness between the report and current `self_test_contract`; it does not prove commands really executed in the current run. Agents must execute the current task `required_gates` before filling the report, and writing `PASS` without running those gates is an Agent execution violation. `make validate-current` and `/advance` are phase-exit gates; before moving to REVIEWING, the implementation commit and completion ledger must be done and no open task may remain.

Migration cost for the lightweight DAG test path graph is zero to low. Existing projects, tasks and implementation docs that only use `module_key_test_path` remain valid; missing graphs are not retroactively rejected. Managed consumers can run `npx sdlc-harness upgrade`, or `npx sdlc-harness sync` when only managed files need refreshing. New high-risk or multi-scenario tasks will be prompted to generate `graph_required: true` and a graph skeleton. Existing high-risk tasks can be manually improved by splitting their current Module Key Test Path into a DAG. No automatic text-to-graph migration is provided because branches, checkpoints and observable exits require human or Agent judgment, and automatic conversion can invent false structure.

`validate-test` keeps its command name as the TESTING phase gate. `.docs/07_test/TEST_STRATEGY.md` describes scope, environment, priority and execution strategy; `.docs/07_test/TEST_CASES.md` describes cases bound to real runnable entry/exit; `.docs/07_test/TEST_REPORT.md` only records executed TESTING evidence, test matrix, regression evidence, runnable entry/exit coverage, coverage gaps and final decision. Cases in `TEST_CASES.md` use stable `TC-*` IDs and record requirement/risk refs, runnable entry, preconditions, steps, expected exit, type, priority and short evidence pointers; execution results, bugfix route and final decision stay in `TEST_REPORT.md`. `validate-test` only accepts `TEST_REPORT.md`; it no longer treats `TEST_PLAN.md` as a report fallback. Existing projects without `TEST_CASES.md` continue to pass, but reports that reference `TC-*`, TESTING tasks that plan `TEST_CASES.md`, or existing `TEST_CASES.md` files trigger lightweight case structure and reference validation.

Do not create formal `.docs/07_test/**` test cases or reports before development has delivered testable entry/exit. When an RFC changes the technical route, entry/exit or acceptance boundary, review `.docs/07_test/**` and remove superseded test results from current facts and `.docs/INDEX.md`.

## ADR And Memory Boundaries

`.docs/05_decisions/` stores ADRs, or Architecture Decision Records. ADRs answer why a key architecture choice was made instead of another option. Architecture and tech plan slices may include local design rationale; create an ADR when a decision has real alternatives, affects multiple modules or stages, is likely to be challenged later, or would be expensive to reverse.

`<harnessRoot>/state/memory.md` is only a short cross-stage reminder and navigation surface. It answers what an agent should remember next time and where to find the source. Memory may link to ADRs, PRDs, tech plans or implementation docs; full context, alternatives, tradeoffs and long-term consequences belong in `.docs/05_decisions/` ADRs or other formal `.docs/**` fact sources.

`sync` and `upgrade` also maintain fixed package-managed sections inside user-owned Markdown files: `## Harness Guidance` in `<harnessRoot>/state/memory.md` and `## Harness Maintenance Rules` in `.docs/INDEX.md`. User memory entries, artifact maps and links stay outside those sections and are preserved. Legacy untitled seed guidance is migrated into the titled section to avoid duplicates. `.github/workflows/harness.yml` is updated only when it has `pjsdlc:sdlc-harness:github-workflow:*` markers or exactly matches the old generated workflow; customized workflows without markers are skipped and reported as `customized`.

## Common Commands

```sh
npx sdlc-harness init
npx sdlc-harness init --adopt
npx sdlc-harness sync
npx sdlc-harness upgrade
npx sdlc-harness doctor
npx sdlc-harness inspect-workflow
npx sdlc-harness inspect-workflow --workflow-control-minutes 5 --total-delivery-minutes 30 --estimated-vibe-handoff-minutes 30 --avoided-rework-minutes 10
npx sdlc-harness validate-plan
npx sdlc-harness validate-uiux
npx sdlc-harness validate-design
npx sdlc-harness validate-dev
npx sdlc-harness validate-review
npx sdlc-harness validate-test
npx sdlc-harness validate-release
npx sdlc-harness validate-rfc
make validate-current
make validate-harness
make docs-overview
```

## More Information

The source repository keeps the full product and architecture specification in `PROJECT_SPEC.md`, with implementation facts and the current release status under `.docs/**`.
