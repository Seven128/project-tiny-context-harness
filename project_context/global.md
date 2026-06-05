# Project / Delivery Context

## Project Goal

- Maintain `agent-project-sdlc`, an npm package that installs AI SDLC Harness guidance, tools and validators into user repositories.
- Current product direction is Minimal Context Harness: preserve the smallest durable facts needed for fresh-agent recovery, iteration, debug and requirement changes.

## Non-goals / Boundaries

- The package does not replace project tests, CI, review or human acceptance.
- New consumer projects should not default to lifecycle phases, stage task state, stage skills, stage work-product trees or phase gates.
- `sync` refreshes managed assets and default Context authoring Skills; legacy stage semantic migration has been removed, while safe Schema v4 upgrade migrations remain.
- Legacy stage assets are not shipped as a runnable default or compatibility layer.

## Background

- This repository contains the Harness package source, npm package release/source-sync logic and delivery benchmark logic.
- Earlier versions used a stage-based SDLC workflow with lifecycle state, plan tasks, stage skills, stage work-product trees and many validators.
- Benchmark pilots showed that full default ceremonies and frequent workflow gates create substantial time/token friction on ordinary and medium-complexity tasks.

## Design Rationale

- The durable value with the clearest expected return is context recovery, not forcing a full SDLC document chain for every project.
- The historical stage-based Harness externalized the whole SDLC through lifecycle state, plan tasks, PRD / tech plan / implementation / review / test / release artifacts and phase gates. Benchmark pilots showed those writes, transitions and gates are objective time/token cost; details are summarized in `PROJECT_SPEC.md`.
- Modern coding agents have internalized much of the ordinary single-task loop: compact requirement understanding, local design choice, code editing, test execution and simple repair. The default Harness should not duplicate that capability with broad ceremonies.
- ADR-level rationale is downgraded into `project_context/global.md#Design Rationale` or area Context when it still affects future work.
- Implementation facts should live in code, tests, comments and short area Context constraints when the code is not self-explanatory.
- Product/UIUX/development engineer Skill customization uses `<harnessRoot>/pjsdlc_managed/override_skills/*.md`; sync merges those local rules into `<harnessRoot>/skills/**`.
- Architecture Context is intentionally restrained: it records durable boundaries, component relationships and constraints, not implementation narration.
- Schema v4 makes the lightweight Context graph the default: `project_context/context.toml` declares areas/context units, role-based context files, read triggers and monorepo boundary metadata while ordinary projects keep one default `main` area.

## Architecture Context

- See `project_context/architecture.md` for the minimal architecture context.

## Verification Entry Points

- `npm test --workspace agent-project-sdlc`
- `node packages/sdlc-harness/dist/cli.js package sync-source`
- `node packages/sdlc-harness/dist/cli.js package check-source`
- `make validate-context`
- `git diff --check`

## Current State

- vNext implementation is Minimal Context Harness.
- `init` creates `project_context/context.toml` with one default `main` area at `project_context/areas/main.md`; `upgrade` migrates legacy `project_context/modules/**/*.md` into `project_context/areas/**/*.md` and registers area Context files in the manifest.
- v4 `validate-context` requires `project_context/context.toml`; older config versions should run `upgrade` before relying on the v4 gate.
- Ad hoc CLI docs and managed Makefile wrappers use the canonical package-qualified entry `npx --yes --package agent-project-sdlc@latest sdlc-harness`; bare `npx sdlc-harness` is treated as ambiguous because it can resolve the legacy npm package name or a stale local binary.
- Current CLI commands guard unsupported future schema major versions before applying v4 assumptions; write commands fail before modifying files.
- `validate-context` validates the Context graph structure, area recovery sections, role names, paths and field shapes; non-area roles are semantic labels rather than writing-template gates.
- Old stage-based assets, state files and work-product trees are removed from the current source tree.
- Historical stage design is summarized in `PROJECT_SPEC.md`; legacy stage semantic migration support has been removed after user migrations completed.
- Delivery benchmark prompts should evaluate Minimal Context behavior for new Harness runs; old stage-based public result data has been removed.

## Next Safe Action

- When changing public package behavior, update CLI/source assets, README, package README, PROJECT_SPEC, Context, tests and package source sync together.
- Run focused tests first, then package source sync/check and context validation before handoff.

## Context Index

- [harness-package](areas/harness-package.md)
- [delivery-benchmark](areas/delivery-benchmark.md)

## Context Graph

- See `project_context/context.toml` for area/context_unit roles, read policy and boundary metadata.
