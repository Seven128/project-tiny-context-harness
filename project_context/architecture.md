# Architecture Context

This file is the restrained architecture context for the source repository. It is not a full architecture document; keep only durable structure that helps a fresh agent recover system shape quickly.

## System Boundary

- The repository owns the `agent-project-sdlc` / `sdlc-harness` npm package, package-managed Minimal Context assets, source-sync checks, validators, release automation and delivery benchmark skeleton.
- Consumer projects receive Minimal Context guidance, templates, Skills, Makefile include, validator tool and optional GitHub workflow assets.
- Product quality remains outside Harness ownership and belongs to each project’s tests, CI, smoke checks, hidden probes or human acceptance.

## Component Map

- CLI command layer: `packages/sdlc-harness/src/commands/**`.
- Package behavior libraries: `packages/sdlc-harness/src/lib/**`.
- Managed source assets: `.codex/pjsdlc_managed/**`.
- Packaged canonical assets: `packages/sdlc-harness/assets/**`, generated from source mappings.
- Source workspace Context: `project_context/**`.
- Delivery benchmark skeleton: `examples/delivery-benchmark/**`.

## Data / Control Flow

- `init` creates `project_context/global.md`, `project_context/architecture.md`, `project_context/areas/main.md`, then runs `sync`.
- `init` also creates `project_context/context.toml`, declaring the default `main` area for ordinary projects.
- CLI write commands check the configured schema major before writing; unsupported future schemas fail fast with the canonical package-qualified `npx` command hint.
- `upgrade` migrates legacy `project_context/modules/**/*.md` files into `project_context/areas/**/*.md`, creates missing `project_context/context.toml` by registering area Context files, and only rewrites legacy module paths in manifest/global references.
- `sync` reads `packages/sdlc-harness/assets/**` and writes managed guidance, templates, tools and Skills into the configured harness root.
- Skill customization uses separate project-local Skills such as `<harnessRoot>/skills/product_plan/SKILL.md`, `<harnessRoot>/skills/uiux_design/SKILL.md` and `<harnessRoot>/skills/development_engineer/SKILL.md`; `sync` overwrites package-managed default `context_*` Skills and leaves those separate local Skills untouched. Project-local Skill front matter `description` trigger keywords are expected to stay aligned with the default Skill trigger intent and the project `AGENTS.md` role-trigger rule.
- `package sync-source` copies source workspace assets into `packages/sdlc-harness/assets/**`; `package check-source` verifies no drift.
- `validate-context` checks Context recoverability, validates graph metadata and area recovery sections, treats non-area roles as semantic labels, and rejects fake verification-result claims.

## Design Rationale

- Minimal Context keeps only durable facts that improve recovery, iteration, debug and requirements changes.
- Architecture deserves one small shared file because system boundaries and component relationships are cross-module facts that code alone can make slow to recover.
- Context graph support is metadata-first: it improves read targeting and validation without turning Harness into a monorepo dependency analyzer or import/path scanner.
- Legacy stage semantic migration support has been removed now that users have completed migration; Schema v4 upgrade migrations remain safe and narrow.

## Constraints And Tradeoffs

- Do not restore lifecycle phases, plan state, stage Skills, work-product trees or phase gates as default package behavior.
- Do not let `sync` perform semantic project rewriting; it refreshes managed assets only.
- Keep product/design/development Skill customization project-local through separate Skills, not package-managed default Skill edits or override merging.
- Keep `architecture.md` concise; implementation details belong in code, tests or area Context only when not obvious.

## Verification Implications

- `npm test --workspace agent-project-sdlc`
- `node packages/sdlc-harness/dist/cli.js package sync-source`
- `node packages/sdlc-harness/dist/cli.js package check-source`
- `make validate-context`
- `git diff --check`

## Open Risks

- Context files can become too broad if architecture notes duplicate code or release history.
- Package assets can drift if source mappings are changed without sync/check.
