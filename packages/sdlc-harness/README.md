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

`init` creates Minimal Context files, agent guidance, managed templates/tools and a Makefile include. It does not create `.work_products/**`, lifecycle state or stage skills by default.

## Capabilities

| Capability | Entry Point | Description |
|---|---|---|
| Project initialization | `npx sdlc-harness init` | Creates `project_context/global.md`, `project_context/modules/main.md`, `AGENTS.md`, minimal managed assets and a Makefile include. |
| Existing project adoption | `npx sdlc-harness init --adopt` | Adds Minimal Context Harness non-destructively to an existing repository. |
| Configurable Harness root | `--harness-folder`, `package.json#sdlcHarness.harnessFolderName`, `sdlc-harness.config.json` | Supports Codex `.codex`, Claude `.claude`, Cursor `.cursor`, Cline `.cline`, Roo `.roo`, Gemini `.gemini` or a custom folder. |
| Managed file sync | `npx sdlc-harness sync` | Refreshes package-managed guidance, Makefile include, context templates, tools and workflow YAML. It does not perform semantic Context migration. |
| Upgrade | `npx sdlc-harness upgrade` | Runs safe migrations and `sync`; if legacy stage facts are detected, it prompts the user to run `migrate-context --dry-run`. |
| Context migration preview | `npx sdlc-harness migrate-context --dry-run` | Reads README, `.work_products/**`, ADR / decision docs, implementation docs and source/test layout, then previews Minimal Context output without writing files. |
| Context migration write | `npx sdlc-harness migrate-context --write` | Writes or updates `project_context/**` without deleting old `.work_products/**` or state files. Existing user-authored Context is protected. |
| Context validation | `npx sdlc-harness validate-context`, `make validate-context` | Checks required Context sections and rejects fake claims that tests already passed. |
| Diagnostics | `npx sdlc-harness doctor` | Reports Harness root, package version, schema version and required Minimal Context paths. |
| Workflow self-inspection | `npx sdlc-harness inspect-workflow` | Legacy-compatible diagnostic for workflow weight and handoff clarity. Metrics still label their data source. |
| Legacy validators | `npx sdlc-harness validate-*` | Stage validators remain available for legacy projects, but are no longer the default new-project path. |
| Package source checks | `sdlc-harness package sync-source`, `sdlc-harness package check-source` | Maintainer-only commands for keeping package canonical assets aligned with the source workspace. |

## Minimal Context Contract

`project_context/global.md` should contain:

- project goal
- non-goals / boundaries
- background
- design rationale
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

## Sync, Upgrade And Migration Boundary

`sync` is intentionally narrow. It refreshes managed files and never generates Context from old stage facts.

`upgrade` performs safe package migrations and `sync`. It does not perform semantic migration. When legacy `.work_products/**`, `.docs/**` or stage state are detected, it prints:

```txt
Run npx sdlc-harness migrate-context --dry-run to preview Minimal Context migration.
```

`migrate-context --write` is the only command that writes semantic migration output. It preserves old artifacts and avoids overwriting user-authored Context.

## Common Commands

```sh
npx sdlc-harness init
npx sdlc-harness init --adopt
npx sdlc-harness sync
npx sdlc-harness upgrade
npx sdlc-harness migrate-context --dry-run
npx sdlc-harness migrate-context --write
npx sdlc-harness validate-context
npx sdlc-harness doctor
make validate-context
make validate-harness
```

`make validate-harness` is a compatibility alias for `validate-context` in vNext projects.

## Legacy Stage Harness

The former stage-based SDLC Harness remains available for legacy consumers that already depend on lifecycle phases, `plan.yaml`, stage skills, `.work_products/**` and phase validators. It is no longer the default for new projects because benchmark work showed that full document chains and frequent workflow gates add real friction on ordinary and medium-complexity tasks.

The package direction is now smaller: keep the minimum durable facts that help agents recover context and continue safely.
