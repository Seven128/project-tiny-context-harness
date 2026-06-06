# Area Context: harness-package

## Responsibility

- Provide the `sdlc-harness` CLI, package-managed assets, validators, migrations and source-sync checks for user projects.

## User / System Contract

- `init` installs Minimal Context Harness into the current repository without deleting user files, and creates a root `DESIGN.md` starter baseline for visual design-system facts when absent.
- `upgrade` creates root `DESIGN.md` for existing Harness projects when missing, without overwriting an existing user-authored design file.
- The generated `DESIGN.md` contains neutral starter tokens and design logic; user-authored `DESIGN.md` content takes precedence over the starter baseline.
- Default product planning, UI/UX and development engineer Skills write durable conclusions to `project_context/**`.
- The product planning Skill asks agents doing product surfaces to reason from product/page positioning: what problem it solves, what the user needs, what content/capabilities/feedback it should provide, what belongs on the surface, where it belongs and why it deserves persistent attention.
- Managed guidance tells agents to treat `project_context/**` as authoritative for intended responsibilities, ownership, architecture boundaries, integration direction, dependencies and verification entry points, while treating code as current implementation evidence.
- Managed guidance requires an upfront long-term fact impact judgment: context-first for product/technical plans, architecture boundaries, module responsibilities, cross-domain dependencies, data contracts, state semantics and verification entry points; code-first only as a controlled exception for ordinary fixes or spikes.
- Projects customize those Skills by creating separate project-local Skills such as `<harnessRoot>/skills/product_plan/SKILL.md`, `<harnessRoot>/skills/uiux_design/SKILL.md` and `<harnessRoot>/skills/development_engineer/SKILL.md`; `sync` overwrites package-managed default `context_*` Skills and leaves separate local Skills untouched.
- The default Skill trigger descriptions should stay narrow: explicit role names or strong artifact names, not generic mentions of product, design, development, code or requirements.
- `PROJECT_SPEC.md` records the design rationale for the default product planning, UI/UX and development engineer Skills; changes to their triggers, workflow, output boundaries or default judgment rules should update that rationale and this Context when the long-term contract changes.
- The development engineer Skill trigger list includes `实现`, `实现方案` and `实施计划`, while its negative trigger rule still excludes routine coding, bug fixes, small refactors and package/release work.
- The development engineer Skill includes a lightweight abstraction / decomposition scan for new implementation, refactoring, repeated logic, module-boundary or impact-scope work; candidates are evaluated by evidence, boundary, benefit, risk and timing, split into local refactoring versus long-term boundary changes, and only stable high-value candidates should be implemented by default.
- The canonical npm package is `agent-project-sdlc`; `sdlc-harness` is the bin name. Public docs and managed Makefile wrappers avoid bare `npx sdlc-harness` for ad hoc commands because npm can resolve the legacy `sdlc-harness` package name or a stale local install.
- Managed Makefile defaults `SDLC_HARNESS` to the source workspace CLI when `packages/sdlc-harness/dist/cli.js` exists, otherwise to `npx --yes --package agent-project-sdlc@latest sdlc-harness`; generated projects can override `SDLC_HARNESS` when intentionally testing a pinned local package.
- Managed Makefile exposes `sdlc-doctor`, `sdlc-sync` and `sdlc-upgrade` wrappers in addition to `validate-context` and `validate-harness`.
- `project_context/architecture.md` is a default Minimal Context fact source for restrained system boundary, component map and durable architecture constraints.
- `project_context/context.toml` is created by `init` as the Schema v4 Context graph manifest; ordinary projects start with one default `main` area.
- Schema v4 makes `project_context/context.toml` required for `validate-context`; `upgrade` migrates legacy `project_context/modules/**/*.md` files into `project_context/areas/**/*.md` and registers area Context files in the manifest.
- `validate-context` uses `context.toml` and `context_role` front matter to validate graph structure, paths, role names and field shapes; roles such as `area`, `domain`, `subdomain`, `foundation`, `archive`, `contract`, `implementation-index` and `decision-rationale` are semantic labels rather than writing-template gates.
- Context graph boundary rules are metadata validation only for now; Harness does not perform import/path dependency analysis.
- The UI/UX Skill uses Google `@google/design.md` for root `DESIGN.md` visual design tokens, and carries compact visual-quality calibration for brand/product register, information density, persistent text, space/value fit, true states, layout stability, design-system continuity and common AI-design anti-patterns.
- Harness installs Impeccable as a default package dependency; design-draft, redesign, visual polish, frontend styling and existing-UI review tasks should run `npx impeccable detect <target>` by default when a scan target exists, while treating findings as review evidence rather than a `validate-context` gate.
- `sync` refreshes managed assets only and does not migrate old semantic facts.
- `upgrade` runs safe migrations plus `sync`; it no longer prompts or runs semantic migration.
- `init`, `sync`, `upgrade`, `doctor` and `validate-context` guard unsupported future schema major versions before applying v4 assumptions; write commands fail before modifying files.
- `validate-context` checks Context completeness but does not prove product test execution.

## Core Data / API / State

- CLI command routing lives in `packages/sdlc-harness/src/commands/index.ts`.
- Default managed file configuration lives in `packages/sdlc-harness/src/lib/config.ts`.
- Shared package/schema constants live in `packages/sdlc-harness/src/lib/constants.ts`; unsupported schema handling lives in `packages/sdlc-harness/src/lib/schema-guard.ts`.
- Init behavior lives in `packages/sdlc-harness/src/lib/init.ts`.
- Sync behavior lives in `packages/sdlc-harness/src/lib/sync-engine.ts`.
- Default Skill assets live in `.codex/pjsdlc_managed/skills/**` and `packages/sdlc-harness/assets/skills/**`.
- Default Context graph template lives in `.codex/pjsdlc_managed/context_templates/context.toml` and `packages/sdlc-harness/assets/context_templates/context.toml`.
- Safe config migrations live in `packages/sdlc-harness/src/lib/migrations.ts`.
- Validators live in `packages/sdlc-harness/src/lib/validators.ts`.

## Key Constraints

- Do not put authoring-only skills under `.codex/skills/authoring/**` into package assets.
- Default Skills must stay Minimal Context oriented and must not restore stage documents or phase gates.
- UI/UX guidance may update `DESIGN.md`; it should use `npx @google/design.md lint DESIGN.md` when structure validation is needed.
- Impeccable should be attempted by the UI/UX Skill when a scan target exists, but it must not become a `validate-context` requirement or block tasks that have no suitable target.
- Project-local product/design/development Skills may narrow guidance for a project but must keep durable conclusions in Minimal Context.
- Context graph roles must stay lightweight and optional; do not make role-specific writing formats, monorepo-specific area names or boundary checks mandatory for ordinary projects.
- Context-first guidance must stay prompt-level and must not become a validator, phase gate or required document chain.
- Do not reintroduce legacy migration commands or stage assets.
- Package source changes that affect managed assets require `package sync-source` and `package check-source`.

## Code Entry Points

- `packages/sdlc-harness/src/cli.ts`
- `packages/sdlc-harness/src/commands/index.ts`
- `packages/sdlc-harness/src/lib/config.ts`
- `packages/sdlc-harness/src/lib/init.ts`
- `packages/sdlc-harness/src/lib/sync-engine.ts`
- `packages/sdlc-harness/src/lib/validators.ts`

## Test Entry Points

- `npm test --workspace agent-project-sdlc`
- `node --test tests/sdlc-harness/sync-init-doctor.test.mjs`
- `node --test tests/sdlc-harness/package-source.test.mjs`
- `node --test tests/sdlc-harness/validators.test.mjs`
- `node --test tests/sdlc-harness/upgrade.test.mjs`

## Open Risks

- Legacy stage tests may still assert old default assets and need careful update.
- Package assets can drift if source mappings and `assets/**` are not synced after changing managed sources.
