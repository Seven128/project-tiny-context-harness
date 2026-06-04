# Module Context: harness-package

## Responsibility

- Provide the `sdlc-harness` CLI, package-managed assets, validators, migrations and source-sync checks for user projects.

## User / System Contract

- `init` installs Minimal Context Harness into the current repository without deleting user files.
- Default product planning, UI/UX and development engineer Skills write durable conclusions to `project_context/**`.
- Projects can customize those Skills via `<harnessRoot>/pjsdlc_managed/override_skills/context_product_plan.md`, `context_uiux_design.md` and `context_development_engineer.md`; `sync` appends those rules into `<harnessRoot>/skills/**`.
- The default Skill trigger descriptions should stay narrow: explicit role names or strong artifact names, not generic mentions of product, design, development, code or requirements.
- `project_context/architecture.md` is a default Minimal Context fact source for restrained system boundary, component map and durable architecture constraints.
- The UI/UX Skill uses Google `@google/design.md` for `DESIGN.md` visual design tokens when a UI design system is needed, and carries compact visual-quality calibration for brand/product register, design-system continuity and common AI-design anti-patterns.
- README docs may present Impeccable as optional external frontend design linting; it is not installed by default and is not a Harness validation gate.
- `sync` refreshes managed assets only and does not migrate old semantic facts.
- `upgrade` runs safe migrations plus `sync`; it no longer prompts or runs semantic migration.
- `validate-context` checks Context completeness but does not prove product test execution.

## Core Data / API / State

- CLI command routing lives in `packages/sdlc-harness/src/commands/index.ts`.
- Default managed file configuration lives in `packages/sdlc-harness/src/lib/config.ts`.
- Init behavior lives in `packages/sdlc-harness/src/lib/init.ts`.
- Sync behavior lives in `packages/sdlc-harness/src/lib/sync-engine.ts`.
- Default Skill assets live in `.codex/pjsdlc_managed/skills/**` and `packages/sdlc-harness/assets/skills/**`.
- Safe config migrations live in `packages/sdlc-harness/src/lib/migrations.ts`.
- Validators live in `packages/sdlc-harness/src/lib/validators.ts`.

## Key Constraints

- Do not put authoring-only skills under `.codex/skills/authoring/**` into package assets.
- Default Skills must stay Minimal Context oriented and must not restore stage documents or phase gates.
- UI/UX guidance may create or update `DESIGN.md`; it should use `npx @google/design.md lint DESIGN.md` when structure validation is needed.
- Optional Impeccable usage must remain opt-in evidence for visual review, not a default package dependency, workflow command set or `validate-context` requirement.
- Skill overrides may narrow product/design/development guidance for a project but must keep conclusions in Minimal Context.
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
