# AI SDLC Harness

`agent-project-sdlc` ships the `sdlc-harness` CLI and canonical managed assets for AI-assisted software delivery.

The vNext default is **Minimal Context Harness**. It maintains a compact `project_context/**` fact source so fresh agents can recover project intent, constraints, verification entry points and next safe actions quickly. It does not default to lifecycle phases, plan tasks, stage skills, stage documents or phase gates.

Harness maintains context quality. Your project tests, CI, review process and human acceptance remain responsible for product quality.

## Install

```sh
npm install -D agent-project-sdlc
npx sdlc-harness init
```

For existing projects:

```sh
npx sdlc-harness init --adopt
```

`init` creates Minimal Context files, agent guidance, two Context authoring Skills, managed templates/tools and a Makefile include. It does not create stage work-product trees, lifecycle state or stage skills by default.

## Capabilities

| Capability | Entry Point | Description |
|---|---|---|
| Project initialization | `npx sdlc-harness init` | Creates `project_context/global.md`, `project_context/modules/main.md`, `AGENTS.md`, minimal managed assets and a Makefile include. |
| Existing project adoption | `npx sdlc-harness init --adopt` | Adds Minimal Context Harness non-destructively to an existing repository. |
| Configurable Harness root | `--harness-folder`, `package.json#sdlcHarness.harnessFolderName`, `sdlc-harness.config.json` | Supports Codex `.codex`, Claude `.claude`, Cursor `.cursor`, Cline `.cline`, Roo `.roo`, Gemini `.gemini` or a custom folder. |
| Product planning Skill | `<harnessRoot>/skills/context_product_plan/SKILL.md` | Triggers on “产品方案 / 产品经理” style requests and writes durable product conclusions to `project_context/**`. |
| UI/UX design Skill | `<harnessRoot>/skills/context_uiux_design/SKILL.md` | Triggers on “设计稿 / UI/UX” style requests, writes screen/interaction conclusions to `project_context/**`, and uses Google `@google/design.md` for `DESIGN.md` visual tokens when needed. |
| Managed file sync | `npx sdlc-harness sync` | Refreshes package-managed guidance, Makefile include, context templates, tools and workflow YAML. It does not perform semantic Context migration. |
| Upgrade | `npx sdlc-harness upgrade` | Runs safe migrations and `sync`; if legacy stage facts are detected, it prompts the user to run `migrate-context --dry-run`. |
| Context migration preview | `npx sdlc-harness migrate-context --dry-run` | Reads existing legacy project facts, then previews `project_context/**` and optional `DESIGN.md` migration output without writing files. |
| Context migration write | `npx sdlc-harness migrate-context --write` | Writes or updates `project_context/**` and optional `DESIGN.md` candidates while keeping old files by default. Existing user-authored Context and design files are protected. |
| Legacy artifact archive | `npx sdlc-harness migrate-context --write --archive-legacy` | Writes migration output, then moves old stage artifacts such as `.work_products/**` into `project_context/_migration/legacy_archive/<timestamp>/`. |
| Context validation | `npx sdlc-harness validate-context`, `make validate-context` | Checks required Context sections and rejects fake claims that tests already passed. |
| Diagnostics | `npx sdlc-harness doctor` | Reports Harness root, package version, schema version and required Minimal Context paths. |
| Package source checks | `sdlc-harness package sync-source`, `sdlc-harness package check-source` | Maintainer-only commands for keeping package canonical assets aligned with the source workspace. |

## Minimal Context Contract

`project_context/global.md` should contain:

- project goal
- non-goals / boundaries
- background
- design rationale
- product / delivery brief
- UX / screen brief
- verification entry points
- current state
- next safe action
- module index

`project_context/modules/<module>.md` should contain:

- responsibility
- user / system contract
- core data / API / state
- key constraints
- code entry points
- test entry points
- open risks

The Context should be dense, durable and short. Former ADR content belongs in `Design Rationale` when it still affects future changes. Implementation details that are obvious from code should stay in code and tests; only non-obvious constraints belong in Context.

The product planning and UI/UX Skills are Context authoring helpers. They may shape product plans, requirements, screen flows or design handoff, but they do not create a default PRD/UIUX document chain. For visual systems, `DESIGN.md` is the durable source for colors, typography, spacing, shapes and component tokens; validate it with `npx @google/design.md lint DESIGN.md`.

## Sync, Upgrade And Migration Boundary

`sync` is intentionally narrow. It refreshes managed files and never generates Context or `DESIGN.md` from old stage facts.

`upgrade` performs safe package migrations and `sync`. It does not perform semantic migration. When legacy `.work_products/**`, `.docs/**` or stage state are detected in a user project, it prints:

```txt
Run npx sdlc-harness migrate-context --dry-run to preview Minimal Context migration.
```

`migrate-context --write` is the only command that writes semantic migration output. It preserves old files by default and avoids overwriting user-authored Context.

If legacy experience/design material is present, `migrate-context` can generate a Google `@google/design.md` compatible `DESIGN.md` candidate. Existing `DESIGN.md` files are preserved; migration output is written to `project_context/_migration/latest/DESIGN.md`.

After reviewing the generated Context, users can run `migrate-context --write --archive-legacy` to move old stage artifacts out of the active workspace. The archive lives under `project_context/_migration/legacy_archive/<timestamp>/`, so `.work_products/**`, old phase state and old `pjsdlc_*` skills stop acting like current fact sources without being hard-deleted.

## Common Commands

```sh
npx sdlc-harness init
npx sdlc-harness init --adopt
npx sdlc-harness sync
npx sdlc-harness upgrade
npx sdlc-harness migrate-context --dry-run
npx sdlc-harness migrate-context --write
npx sdlc-harness migrate-context --write --archive-legacy
npx sdlc-harness validate-context
npx sdlc-harness doctor
make validate-context
make validate-harness
```

`make validate-harness` is a compatibility alias for `validate-context` in vNext projects.

## Legacy Migration

The former stage-based SDLC Harness is no longer shipped as a runnable default or compatibility layer. Existing projects that still contain lifecycle phases, `plan.yaml`, stage skills or `.work_products/**` should use `migrate-context` to summarize useful facts into `project_context/**`.

The package direction is now smaller: keep the minimum durable facts that help agents recover context and continue safely.
