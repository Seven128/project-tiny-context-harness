# Module Context: harness-package

## Responsibility

- Provide the `sdlc-harness` CLI, package-managed assets, validators, migrations and source-sync checks for user projects.

## User / System Contract

- `init` installs Minimal Context Harness into the current repository without deleting user files.
- Default product planning and UI/UX Skills write durable conclusions to `project_context/**`.
- The UI/UX Skill uses Google `@google/design.md` for `DESIGN.md` visual design tokens when a UI design system is needed.
- `sync` refreshes managed assets only and does not migrate old semantic facts.
- `upgrade` runs safe migrations plus `sync` and prompts explicit Context migration when legacy stage facts exist.
- `migrate-context --dry-run` previews migration; `migrate-context --write` writes Context and optional `DESIGN.md` candidates without deleting old artifacts.
- `validate-context` checks Context completeness but does not prove product test execution.

## Core Data / API / State

- CLI command routing lives in `packages/sdlc-harness/src/commands/index.ts`.
- Default managed file configuration lives in `packages/sdlc-harness/src/lib/config.ts`.
- Init behavior lives in `packages/sdlc-harness/src/lib/init.ts`.
- Sync behavior lives in `packages/sdlc-harness/src/lib/sync-engine.ts`.
- Default Skill assets live in `.codex/pjsdlc_managed/skills/**` and `packages/sdlc-harness/assets/skills/**`.
- Migration behavior lives in `packages/sdlc-harness/src/lib/context-migration.ts` and `packages/sdlc-harness/src/lib/migrations.ts`.
- Validators live in `packages/sdlc-harness/src/lib/validators.ts`.

## Key Constraints

- Do not put authoring-only skills under `.codex/skills/authoring/**` into package assets.
- Default Skills must stay Minimal Context oriented and must not restore stage documents or phase gates.
- UI/UX guidance may create or update `DESIGN.md`; it should use `npx @google/design.md lint DESIGN.md` when structure validation is needed.
- Preserve user-authored Context; write migration output under `project_context/_migration/latest/**` unless a managed migration marker exists.
- Preserve user-authored `DESIGN.md`; write migrated design candidates under `project_context/_migration/latest/DESIGN.md` when needed.
- Keep legacy stage assets compatible enough for old projects, but do not include them in new default config.
- Package source changes that affect managed assets require `package sync-source` and `package check-source`.

## Code Entry Points

- `packages/sdlc-harness/src/cli.ts`
- `packages/sdlc-harness/src/commands/index.ts`
- `packages/sdlc-harness/src/lib/config.ts`
- `packages/sdlc-harness/src/lib/init.ts`
- `packages/sdlc-harness/src/lib/sync-engine.ts`
- `packages/sdlc-harness/src/lib/context-migration.ts`
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
