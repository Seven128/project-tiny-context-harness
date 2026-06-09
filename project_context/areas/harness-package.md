# Area Context: harness-package

## Responsibility

- Provide the `sdlc-harness` CLI, package-managed assets, validators, migrations and source-sync checks for user projects.

## User / System Contract

- `init` installs Minimal Context Harness into the current repository without deleting user files, creates a default product/domain owner area, creates a default area-owned verification role Context, and creates a root `DESIGN.md` starter baseline for visual design-system facts when absent.
- `upgrade` creates root `DESIGN.md` for existing Harness projects when missing, without overwriting an existing user-authored design file.
- The generated `DESIGN.md` contains neutral starter tokens and design logic; user-authored `DESIGN.md` content takes precedence over the starter baseline.
- Default product planning, UI/UX and development engineer Skills write durable conclusions to `project_context/**`.
- `PROJECT_SPEC.md` owns the stable Harness mental model and core term vocabulary: Minimal Context Harness is a set of expected agent behavior constraints, not a document workflow. It explains fact-source authority, workflow contracts, artifact placement, soft constraints and how these are implemented through AGENTS, Context, Skills, temporary plan surfaces, handoff checks, validators and source-sync tests.
- The product planning Skill asks agents doing product surfaces to reason from product/page positioning: what problem it solves, what the user needs, what content/capabilities/feedback it should provide, what belongs on the surface, where it belongs and why it deserves persistent attention.
- Managed AGENTS guidance requires a lightweight page product-positioning check for Web pages, frontend layout, UI/UX, product module boundaries and information-placement tasks even when product/UIUX Skills are not explicitly triggered; the check runs before context-first classification and supplies evidence for whether durable page responsibility, information architecture, persistent-information boundary or module ownership facts changed.
- Managed AGENTS guidance uses input, selection, search, filters, forms/configuration, scheduling/time windows, budget/quota/limit fields and loading/empty/error states as high-risk UI triggers for the product/UIUX control-task framework; those categories are wakeup signals, not fixed widget prescriptions.
- Managed AGENTS guidance explicitly names the Context Priority Ladder: read Context, run page product-positioning checks when applicable, classify durable-fact impact or use `Context Delta` inside task-contract scenarios, choose context-first or code-first, then do Contract Conformance when applicable and Context drift check.
- Default product/UIUX/development Skills turn broad page/product principles into reusable control-task prompts: user task, data/input semantic, required feedback, unit/range/default/risk/cost needs, user-facing language versus backend field exposure, and free-form input validation cost.
- For product, UI/UX, system design, architecture-boundary, API/Schema, state/runtime and verification-design tasks, default Skills compile upstream principles and Context into a short current-task contract before implementation.
- The task contract starts with `Context Delta: none|required`; this is the formal durable-fact decision point inside contract-compilation scenarios and replaces a separate second classification pass.
- `Task Contract` is a task-local compiled artifact for implementation constraints such as goal, boundary, state, feedback, non-goals and verification signal. It is not a source of truth and is not stored in `project_context/**` by default.
- `Context Delta: required` preserves context-first behavior: durable facts are written to `project_context/**` or `DESIGN.md` before implementation continues.
- Context Conformance is a concise handoff/final/PR evidence line for high-risk UI changes that hit existing Context or page/control contracts; per-change proof, screenshots, test logs and implementation summaries must not be stored in `project_context/**`.
- Contract Conformance extends that handoff check for task-contract scenarios: implementation misses are fixed in code, contract omissions return to the Task Contract, and missing durable facts return to `Context Delta` and Context-first handling.
- `plan.md` or an equivalent temporary plan surface may assist complex task-contract work as execution scratchpad for `Context Delta`, `Task Contract`, implementation steps and Conformance notes, but it is not a source of truth, not a default project asset and must not be registered in `project_context/context.toml`.
- Managed AGENTS guidance includes a placement policy: AGENTS is for startup routing and hard boundaries only; package consumers default long design reasons to Context unless they already have a local spec/design convention, while this source workspace uses `PROJECT_SPEC.md` for Harness workflow rationale. Role workflows go to Skills, user-facing package instructions to README, and new AGENTS rules should compress or replace old guidance instead of accumulating.
- Managed guidance tells agents to treat `project_context/**` as authoritative for intended responsibilities, ownership, architecture boundaries, integration direction, dependencies and verification entry points, while treating code as current implementation evidence.
- Managed guidance requires a lightweight change classification before the first code edit: context-first for product ownership/plans, module responsibilities, information architecture, API/Schema, state or scheduler semantics, cross-domain boundaries and verification entry points; code-first only for ordinary bug fixes, local styling, drift repair, test fixes and spikes unless they produce a durable fact.
- Context-first remains prompt-level habit, not a hard gate: the first edit for a durable-fact change should update the relevant `project_context/**` with enough durable context to guide implementation, without a fixed line-count limit; automation may warn about ordering drift but must not block.
- Managed guidance defines `area` as product/domain ownership. Role Context files are read-purpose slices owned by an area or, only when truly cross-domain, by the project root.
- Managed guidance includes a soft role placement scan for `project_context/areas/**` authoring and migration so agents do not leave every deep Context file as an `area`: `area` / `domain` mean product ownership; `subdomain` means smaller owned product context; `contract`, `foundation`, `implementation-index`, `decision-rationale` and `archive` are read-purpose roles; `verification` and `deployment` are repeat-execution roles.
- Managed guidance includes verification and deployment role Context: agents must not record one-off test logs, full command output, temporary JSON, CI artifacts, test reports, release ledgers, secrets, tokens, cookies, device ids or raw payloads in Context, but should record minimal critical repeat-execution paths when they have durable recovery value.
- `verification` role Context owns repeatable test, smoke, CI, probe and validation execution paths. `deployment` role Context owns repeatable deploy, runtime bootstrap, cloud initialization, service topology, health-check and rollback/degradation paths. Both roles keep only necessary preparation, shortest command/path, expected stage or signal, acceptable warnings and known dead ends.
- Projects customize those Skills by creating separate project-local Skills such as `<harnessRoot>/skills/product_plan/SKILL.md`, `<harnessRoot>/skills/uiux_design/SKILL.md` and `<harnessRoot>/skills/development_engineer/SKILL.md`; the `AGENTS.md` managed block, `<harnessRoot>/pjsdlc_managed/**` and package-managed default `context_*` Skills are generated Harness surfaces, so project-specific rules must not be written there because `sync` can overwrite them or create drift.
- Project-local Skill front matter `description` trigger keywords should stay aligned with the matching default Skill and the project `AGENTS.md` role-trigger rule; project-specific keyword additions or narrowing should update both surfaces together.
- The default Skill trigger descriptions should stay narrow: explicit role names or strong artifact names, not generic mentions of product, design, development, code or requirements.
- `PROJECT_SPEC.md` records the design rationale for the default product planning, UI/UX and development engineer Skills; changes to their triggers, workflow, output boundaries or default judgment rules should update that rationale and this Context when the long-term contract changes.
- The development engineer Skill trigger list includes `实现`, `实现方案`, `实施计划`, `多开agent` and `subagent`, while its negative trigger rule still excludes routine coding, bug fixes, small refactors and package/release work.
- When a user explicitly allows subagent use and the tools exist, the development engineer Skill should encourage parallel decomposition while reusing existing agents first and closing completed, idle or no-longer-needed agents with `close_agent`; this is a resource lifecycle constraint, not permission to bypass the user's explicit subagent trigger.
- The development engineer Skill includes a lightweight abstraction / decomposition scan for new implementation, refactoring, repeated logic, module-boundary or impact-scope work; candidates are evaluated by evidence, boundary, benefit, risk and timing, split into local refactoring versus long-term boundary changes, and only stable high-value candidates should be implemented by default.
- The canonical npm package is `agent-project-sdlc`; `sdlc-harness` is the bin name. Public docs and managed Makefile wrappers avoid bare `npx sdlc-harness` for ad hoc commands because npm can resolve the legacy `sdlc-harness` package name or a stale local install.
- Public package positioning is "minimal project memory for AI coding agents": README/npm surfaces should quickly explain the fresh-agent recovery problem, when to use the Harness, and how it differs from spec-first kits, task planners, external context/retrieval tools, IDE memory and full SDLC process tools. Public positioning must not claim benchmark wins until fresh Minimal Context benchmark evidence exists.
- Maintainer launch materials live under `docs/launch/**`. They are copy-ready external communication assets, market snapshots, channel plans, demo storyboards, community handoff plans and adoption/star milestone triggers for GitHub, npm, launch sites and social channels; they are not package-managed consumer assets and must keep the same Minimal Context positioning and no-unproven-benchmark-claim boundary as README/npm surfaces. `tools/launch_readiness_check.mjs` is the maintainer prelaunch check: offline mode validates local launch surface and online mode also reports current GitHub/npm metadata drift without publishing or mutating external state.
- Managed Makefile defaults `SDLC_HARNESS` to the source workspace CLI when `packages/sdlc-harness/dist/cli.js` exists, otherwise to `npx --yes --package agent-project-sdlc@latest sdlc-harness`; generated projects can override `SDLC_HARNESS` when intentionally testing a pinned local package.
- Managed Makefile exposes `sdlc-doctor`, `sdlc-sync` and `sdlc-upgrade` wrappers in addition to `validate-context` and `validate-harness`.
- The package-managed `.github/workflows/harness.yml` is consumer-facing: it installs only the Node runtime needed by the Harness CLI and runs the selected `validate-context` / `validate-harness` Make target. Maintainer-only checks such as package tests and source-drift checks belong in this source repository's separate CI, not in the workflow copied into user projects.
- `project_context/architecture.md` is a default Minimal Context fact source for restrained system boundary, component map and durable architecture constraints.
- `project_context/context.toml` is created by `init` as the Schema v4 Context graph manifest; ordinary projects start with one default `main` product/domain area and `project_context/areas/main/verification.md` registered as a default verification role Context.
- Schema v4 makes `project_context/context.toml` required for `validate-context`; `upgrade` migrates legacy `project_context/modules/**/*.md` files into `project_context/areas/**/*.md` and registers area Context files in the manifest.
- `validate-context` uses `context.toml` and `context_role` front matter to validate graph structure, paths, role names and field shapes; roles such as `area`, `domain`, `subdomain`, `foundation`, `archive`, `contract`, `verification`, `deployment`, `implementation-index` and `decision-rationale` are semantic labels rather than writing-template gates.
- Context graph boundary rules are metadata validation only for now; Harness does not perform import/path dependency analysis.
- The UI/UX Skill uses Google `@google/design.md` for root `DESIGN.md` visual design tokens, and carries compact visual-quality calibration for brand/product register, information density, persistent text, space/value fit, true states, layout stability, design-system continuity and common AI-design anti-patterns.
- Harness installs Impeccable as a default package dependency; design-draft, redesign, visual polish, frontend styling and existing-UI review tasks should run `npx impeccable detect <target>` by default when a scan target exists, while treating findings as review evidence rather than a `validate-context` gate.
- `sync` refreshes managed assets only and does not migrate old semantic facts.
- `upgrade` runs safe migrations plus `sync`; it no longer prompts or runs semantic migration.
- `init`, `sync`, `upgrade`, `doctor` and `validate-context` guard unsupported future schema major versions before applying v4 assumptions; write commands fail before modifying files.
- `validate-context` checks Context completeness but does not prove product test execution.
- `export-context --full` creates a one-off Markdown Context export for copying, external-tool ingestion or temporary discussion. It defaults to `tmp/sdlc/context-exports/当前项目context-<timestamp>.md`, refuses `project_context/**` and non-temporary output paths, and must never register the export as a Context graph node.
- `export-context --code` creates a one-off Markdown current implementation snapshot with source file paths, metadata, heuristic summaries and redacted code blocks. It defaults to `tmp/sdlc/context-exports/code-level-implementation-<timestamp>/当前项目代码实现.md`, uses one Markdown file only, refuses `project_context/**` and non-temporary output paths, and must never register the export as a Context graph node.
- `export-context --all` creates both default `--full` and `--code` artifacts in one command with the same timestamp. It does not accept `--output` because one custom Markdown path cannot unambiguously represent two artifacts.
- The package-managed `context_full_project_export` Skill triggers on “导出尽可能详细的项目全量上下文 / 全量上下文导出 / full project context export / 代码级实现导出 / 当前项目代码实现” style requests and tells agents to prefer `export-context --all` when both context and code snapshots are useful, instead of hand-writing a tracked Context or implementation summary.
- `validate-context` rejects obvious export artifact names such as `full-project-context`, `project-overview`, `context-bundle`, `context-summary` or `context-export` when they appear in `project_context/context.toml`.

## Core Data / API / State

- CLI command routing lives in `packages/sdlc-harness/src/commands/index.ts`.
- Full context export command behavior lives in `packages/sdlc-harness/src/commands/export-context.ts` and `packages/sdlc-harness/src/lib/context-export.ts`.
- Default managed file configuration lives in `packages/sdlc-harness/src/lib/config.ts`.
- Shared package/schema constants live in `packages/sdlc-harness/src/lib/constants.ts`; unsupported schema handling lives in `packages/sdlc-harness/src/lib/schema-guard.ts`.
- Init behavior lives in `packages/sdlc-harness/src/lib/init.ts`.
- Sync behavior lives in `packages/sdlc-harness/src/lib/sync-engine.ts`.
- Default Skill assets, including Context authoring Skills and the full-project export Skill, live in `.codex/pjsdlc_managed/skills/**` and `packages/sdlc-harness/assets/skills/**`.
- Default Context graph template lives in `.codex/pjsdlc_managed/context_templates/context.toml` and `packages/sdlc-harness/assets/context_templates/context.toml`.
- Default verification/deployment Context templates live in `.codex/pjsdlc_managed/context_templates/verification.md`, `.codex/pjsdlc_managed/context_templates/deployment.md` and the matching package assets.
- Safe config migrations live in `packages/sdlc-harness/src/lib/migrations.ts`.
- Validators live in `packages/sdlc-harness/src/lib/validators.ts`.

## Key Constraints

- Do not put authoring-only skills under `.codex/skills/authoring/**` into package assets.
- Default Skills must stay Minimal Context oriented and must not restore stage documents or phase gates.
- UI/UX guidance may update `DESIGN.md`; it should use `npx @google/design.md lint DESIGN.md` when structure validation is needed.
- Impeccable should be attempted by the UI/UX Skill when a scan target exists, but it must not become a `validate-context` requirement or block tasks that have no suitable target.
- Project-local product/design/development Skills may narrow guidance for a project but must keep durable conclusions in Minimal Context.
- Control-task framing must stay business-agnostic: package-managed Skills may ask reusable questions, but project-specific control choices, ranges, defaults, copy and acceptance signals belong in project Context or project-local Skills.
- Context graph roles must stay lightweight and optional except for the default verification Context created by `init`; do not make role-specific writing formats, monorepo-specific area names or boundary checks mandatory for ordinary projects.
- Role placement scan is soft authoring pressure, not a semantic migration gate; `upgrade` may create conservative `area` baselines, and later agents refine obvious `contract`, `foundation`, `subdomain`, `verification`, `deployment`, `implementation-index`, `decision-rationale` or `archive` roles explicitly in `context.toml`.
- The page product-positioning check must remain prompt-level guidance and classification input; do not turn it into "all UI changes update Context", a validator, phase gate, required PRD/UIUX artifact or mandatory template section beyond minimal Context hints.
- AGENTS line count remains a soft budget, not a validator or CI gate; enforce slimness through placement discipline in managed guidance, Context and authoring Skill.
- Context-first guidance must stay prompt-level and must not become a validator, phase gate, edit-order gate or required document chain.
- Task-contract compilation is prompt-level workflow contract guidance. It must stay short and temporary, must not become a PRD / tech-plan / handoff document chain, and must not become a validator or machine-enforced edit-order gate.
- Temporary plan surfaces must serve the workflow contract and Context without replacing either; durable facts discovered there are extracted into Context / `DESIGN.md`, while ordinary plan details remain temporary execution cache.
- Verification and deployment role Context must stay authoring guidance and template text; do not add machine-level log, secret, release ledger or artifact scanning to `validate-context` without an explicit product-boundary change.
- Do not reintroduce legacy migration commands or stage assets.
- Package source changes that affect managed assets require `package sync-source` and `package check-source`.

## Code Entry Points

- `packages/sdlc-harness/src/cli.ts`
- `packages/sdlc-harness/src/commands/index.ts`
- `packages/sdlc-harness/src/commands/export-context.ts`
- `packages/sdlc-harness/src/lib/config.ts`
- `packages/sdlc-harness/src/lib/context-export.ts`
- `packages/sdlc-harness/src/lib/init.ts`
- `packages/sdlc-harness/src/lib/sync-engine.ts`
- `packages/sdlc-harness/src/lib/validators.ts`

## Test Entry Points

- `npm test --workspace agent-project-sdlc`
- `node tools/quickstart_smoke.mjs --clean`
- `node tools/launch_readiness_check.mjs --offline`
- `node --test tests/sdlc-harness/export-context.test.mjs`
- `node --test tests/sdlc-harness/sync-init-doctor.test.mjs`
- `node --test tests/sdlc-harness/package-source.test.mjs`
- `node --test tests/sdlc-harness/validators.test.mjs`
- `node --test tests/sdlc-harness/upgrade.test.mjs`

## Open Risks

- Legacy stage tests may still assert old default assets and need careful update.
- Package assets can drift if source mappings and `assets/**` are not synced after changing managed sources.
