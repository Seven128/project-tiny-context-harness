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

`init` creates `project_context/global.md`, `project_context/architecture.md`, `project_context/modules/main.md`, agent guidance, three Context authoring Skills, managed templates/tools and a Makefile include. It does not create stage work-product trees, lifecycle state or stage skills by default.

## Capabilities

| Capability | Entry Point | Description |
|---|---|---|
| Project initialization | `npx sdlc-harness init` | Creates `project_context/global.md`, `project_context/architecture.md`, `project_context/modules/main.md`, `AGENTS.md`, minimal managed assets and a Makefile include. |
| Existing project adoption | `npx sdlc-harness init --adopt` | Adds Minimal Context Harness non-destructively to an existing repository. |
| Configurable Harness root | `--harness-folder`, `package.json#sdlcHarness.harnessFolderName`, `sdlc-harness.config.json` | Supports Codex `.codex`, Claude `.claude`, Cursor `.cursor`, Cline `.cline`, Roo `.roo`, Gemini `.gemini` or a custom folder. |
| Product planning Skill | `<harnessRoot>/skills/context_product_plan/SKILL.md` | Triggers on “产品方案 / 产品经理 / 产品专家” style requests and writes durable product conclusions to `project_context/**`. |
| UI/UX design Skill | `<harnessRoot>/skills/context_uiux_design/SKILL.md` | Triggers on “设计稿 / UI/UX 设计方案 / 视觉专家” style requests, writes screen/interaction conclusions to `project_context/**`, and uses Google `@google/design.md` for `DESIGN.md` visual tokens when needed. |
| Development engineer Skill | `<harnessRoot>/skills/context_development_engineer/SKILL.md` | Triggers on “开发工程师 / 开发方案 / 技术专家” style requests and writes durable engineering conclusions to `project_context/**`. In Codex-like environments it may enable multi-agent work when supported. |
| Project Skill overrides | `<harnessRoot>/pjsdlc_managed/override_skills/*.md` | Optional local product/design/development Skill rules merged into `<harnessRoot>/skills/**` by `sync`. |
| Managed file sync | `npx sdlc-harness sync` | Refreshes package-managed guidance, default Skills, Makefile include, context templates, tools and workflow YAML. It does not perform semantic Context generation. |
| Upgrade | `npx sdlc-harness upgrade` | Runs safe migrations and `sync`. |
| Context validation | `npx sdlc-harness validate-context`, `make validate-context` | Checks required Context sections and rejects fake claims that tests already passed. |
| Diagnostics | `npx sdlc-harness doctor` | Reports Harness root, package version, schema version and required Minimal Context paths. |
| Package source checks | `sdlc-harness package sync-source`, `sdlc-harness package check-source` | Maintainer-only commands for keeping package canonical assets aligned with the source workspace. |

## Minimal Context Contract

`project_context/global.md` should contain:

- project goal
- non-goals / boundaries
- background
- design rationale
- architecture context link
- product / delivery brief
- UX / screen brief
- verification entry points
- current state
- next safe action
- module index

`project_context/architecture.md` should contain restrained architecture facts:

- system boundary
- component map
- data / control flow
- design rationale
- constraints and tradeoffs
- verification implications
- open risks

`project_context/modules/<module>.md` should contain:

- responsibility
- user / system contract
- core data / API / state
- key constraints
- code entry points
- test entry points
- open risks

The Context should be dense, durable and short. Former ADR content belongs in `Design Rationale` when it still affects future changes. Implementation details that are obvious from code should stay in code and tests; only non-obvious constraints belong in Context.

The product planning, UI/UX and development engineer Skills are Context authoring helpers. They may shape product plans, screen flows, design handoff, implementation plans or technical decisions, but they do not create a default PRD/UIUX/tech-plan document chain. Their descriptions intentionally avoid broad generic triggers such as “产品”, “设计” or “开发” alone. For visual systems, `DESIGN.md` is the durable source for colors, typography, spacing, shapes and component tokens; validate it with `npx @google/design.md lint DESIGN.md`.

Project-specific Skill rules can be added without editing package-managed Skill files:

```sh
mkdir -p <harnessRoot>/pjsdlc_managed/override_skills
$EDITOR <harnessRoot>/pjsdlc_managed/override_skills/context_product_plan.md
$EDITOR <harnessRoot>/pjsdlc_managed/override_skills/context_uiux_design.md
$EDITOR <harnessRoot>/pjsdlc_managed/override_skills/context_development_engineer.md
npx sdlc-harness sync
```

`sync` appends those local rules into `<harnessRoot>/skills/**`. Overrides may narrow product/design/development behavior for the project, but should keep durable conclusions in `project_context/**` and `DESIGN.md`.

## Sync And Upgrade Boundary

`sync` is intentionally narrow. It refreshes managed files and never generates project semantics.

`upgrade` performs safe package migrations and `sync`. The former migration command has been removed because existing users have completed migration.

## Common Commands

```sh
npx sdlc-harness init
npx sdlc-harness init --adopt
npx sdlc-harness sync
npx sdlc-harness upgrade
npx sdlc-harness validate-context
npx sdlc-harness doctor
make validate-context
make validate-harness
```

`make validate-harness` is a compatibility alias for `validate-context` in vNext projects.

## Current Boundary

The former stage-based SDLC Harness is no longer shipped as a runnable default, compatibility layer or migration command.

The package direction is now smaller: keep the minimum durable facts that help agents recover context and continue safely.
