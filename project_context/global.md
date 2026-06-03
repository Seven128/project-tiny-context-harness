# Project / Delivery Context

## Project Goal

- Maintain `agent-project-sdlc`, an npm package that installs AI SDLC Harness guidance, tools and validators into user repositories.
- Current product direction is Minimal Context Harness: preserve the smallest durable facts needed for fresh-agent recovery, iteration, debug and requirement changes.

## Non-goals / Boundaries

- The package does not replace project tests, CI, review or human acceptance.
- New consumer projects should not default to lifecycle phases, `plan.yaml`, stage skills, `.work_products/**` or phase gates.
- `sync` must not perform semantic migration from legacy stage facts into Context.
- Legacy stage assets may remain for compatibility, but they are no longer the default new-project path.

## Background

- This repository contains the Harness package source, npm package release/source-sync logic and delivery benchmark logic.
- Earlier versions used a stage-based SDLC workflow with lifecycle state, plan tasks, stage skills, stage work products and many validators.
- Benchmark pilots showed that full default ceremonies and frequent workflow gates create substantial time/token friction on ordinary and medium-complexity tasks.

## Design Rationale

- The durable value with the clearest expected return is context recovery, not forcing a full SDLC document chain for every project.
- ADR-level rationale is downgraded into `project_context/global.md#Design Rationale` or module Context when it still affects future work.
- Implementation facts should live in code, tests, comments and short module Context constraints when the code is not self-explanatory.
- Explicit `migrate-context` protects users from accidental semantic rewrites during `sync` or `upgrade`.

## Verification Entry Points

- `npm test --workspace agent-project-sdlc`
- `node packages/sdlc-harness/dist/cli.js package sync-source`
- `node packages/sdlc-harness/dist/cli.js package check-source`
- `make validate-context`
- `git diff --check`

## Current State

- vNext implementation is switching package defaults to Minimal Context Harness.
- Historical `.work_products/**` and `.codex/state/**` are kept as repository history and migration input.
- Delivery benchmark prompts should evaluate Minimal Context behavior for new Harness runs while marking old stage-based data as historical evidence.

## Next Safe Action

- When changing public package behavior, update CLI/source assets, README, package README, PROJECT_SPEC, tests and package source sync together.
- Run focused tests first, then package source sync/check and context validation before handoff.

## Module Index

- [harness-package](modules/harness-package.md)
- [delivery-benchmark](modules/delivery-benchmark.md)
