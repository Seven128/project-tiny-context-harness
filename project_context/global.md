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
- Product/UIUX/development engineer Skill customization uses separate project-local Skills such as `<harnessRoot>/skills/product_plan/SKILL.md`, `<harnessRoot>/skills/uiux_design/SKILL.md` and `<harnessRoot>/skills/development_engineer/SKILL.md`; `sync` overwrites package-managed default `context_*` Skills and leaves separate local Skills untouched. Project-local Skill front matter `description` trigger keywords should stay aligned with the matching default Skill and the project `AGENTS.md` role-trigger rule.
- Architecture Context is intentionally restrained: it records durable boundaries, component relationships and constraints, not implementation narration.
- Schema v4 makes the lightweight Context graph the default: `project_context/context.toml` declares areas/context units, role-based context files, read triggers and monorepo boundary metadata while ordinary projects keep one default `main` area.
- `project_context/**` is authoritative for intended ownership, responsibility, architecture boundaries, integration direction, allowed/forbidden dependencies and verification entry points; code is authoritative for current implementation state. Gaps between them should be treated as implementation drift, missing work or stale Context that must be called out.
- Context-first is the default workflow habit for changes to durable product or technical facts; before the first code edit, agents classify whether the task changes product ownership/plans, module responsibilities, information architecture, API/Schema, state or scheduler semantics, cross-domain boundaries or verification entry points.
- Context Priority Ladder is expected agent behavior: read Context first, run the page product-positioning check for Web/page/layout/module-boundary/information-placement tasks, classify durable-fact impact, choose context-first or code-first, then perform Context drift check before handoff.
- For Web page, frontend layout, UI/UX, product module boundary and information-placement tasks, the lightweight page product-positioning check runs before context-first classification and supplies the evidence for it; the check does not itself require a Context update unless it reveals durable page responsibility, information architecture, persistent-information boundary or ownership facts.
- AGENTS placement policy is part of the Minimal Context design: `AGENTS.md` is a startup router and hard-boundary surface. For package consumers, long design reasoning defaults to compact `project_context/**` facts unless a project already has a local spec/design convention; in this source workspace, `PROJECT_SPEC.md` is the Harness workflow design-spec surface. Role procedures belong in Skills, human usage docs in README, and machine checks in validators/tests only when they fit the product boundary.
- Context updates for those changes should be as small as the fact allows, but not line-count limited: write enough durable context to guide implementation before code alignment. Ordinary bug fixes, local styling, drift repair, test fixes and exploratory spikes stay code-first unless they produce a durable fact. Automation may warn about context-first drift but must not become an edit-order gate.
- The context-first clarification preserves the original plan-before-implementation principle while keeping Minimal Context slim: removing stage ceremony did not remove Context authority over durable product intent, engineering boundaries or contracts.
- Verification Path Context is part of the Minimal Context boundary: Context must not keep one-off logs, raw outputs, temporary JSON, CI artifacts, reports or secrets, but should keep durable smoke or verification paths when special setup, bridge inputs, external services, agent/runtime state or prior exploration cost would otherwise be rediscovered by future agents.

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
- Managed guidance and default Context templates distinguish verification path facts from test reports: global defaults belong in `global.md#Verification Entry Points`, module-level repeatable paths belong in `areas/**#Test Entry Points`, and cross-module smoke belongs to the primary owner with short references elsewhere.
- Managed guidance documents the canonical loops `context -> implementation -> verification -> context drift check` and `implementation discovery -> context update if long-term fact changed -> implementation alignment -> verification`.
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
