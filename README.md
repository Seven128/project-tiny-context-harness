# AI SDLC Harness

AI SDLC Harness is a lightweight workflow package for AI coding agents. Its vNext default is **Minimal Context Harness**: keep a small, durable project context in the repository so fresh agents can recover intent, constraints, verification entry points and next safe actions quickly.

The current goal is not to make agents follow a full SDLC ceremony by default. The Harness maintains context quality; project tests, reviews, CI and human acceptance still own product quality.

For the product and design rationale, see [PROJECT_SPEC.md](PROJECT_SPEC.md).

## Repository Scope

This repository is both the source workspace and a reference workspace for `agent-project-sdlc`. It contains three product areas:

- Harness source code: `packages/sdlc-harness/src/**`, package assets, validators, migrations and source-sync logic.
- npm package release logic: package metadata, build/test scripts and source asset drift checks for `agent-project-sdlc`.
- Delivery benchmark logic: `examples/delivery-benchmark/**`, used to compare baseline coding against Harness-assisted delivery under the same quality bar.

Earlier stage-based workflow assets have been removed from the current source tree. The historical design and convergence reason are summarized in [PROJECT_SPEC.md](PROJECT_SPEC.md); new package consumers default to `project_context/**`.

## Install

```sh
npm install -D agent-project-sdlc
npx sdlc-harness init
```

For an existing project:

```sh
npx sdlc-harness init --adopt
```

`init` creates:

- `AGENTS.md`
- `project_context/global.md`
- `project_context/architecture.md`
- `project_context/modules/main.md`
- `<harnessRoot>/config.yaml`
- `<harnessRoot>/skills/context_product_plan/SKILL.md`
- `<harnessRoot>/skills/context_uiux_design/SKILL.md`
- `<harnessRoot>/skills/context_development_engineer/SKILL.md`
- `<harnessRoot>/pjsdlc_managed/context_templates/**`
- `<harnessRoot>/pjsdlc_managed/make/sdlc-harness.mk`
- `tools/**`
- a root `Makefile` include block

`init` does not create lifecycle state, plan state, stage skills or stage work-product trees by default.

The three default Skills are Minimal Context authoring helpers. Explicit requests such as “产品方案 / 产品经理 / 产品专家” use the product planning Skill; requests such as “设计稿 / UI/UX 设计方案 / 视觉专家” use the design Skill; requests such as “开发工程师 / 开发方案 / 技术专家” use the development engineer Skill. They intentionally avoid broad generic triggers such as “产品”, “设计” or “开发” alone. Product, screen-flow and durable engineering conclusions go to `project_context/**`; visual identity and design tokens go to `DESIGN.md` using Google’s open `@google/design.md` format when a visual design system is needed.

`init` also creates `.codex/pjsdlc_managed/override_skills/` as the project-local Skill customization entry. Files such as `context_product_plan.md`, `context_uiux_design.md` and `context_development_engineer.md` in that directory are merged into the generated `.codex/skills/**` files by `sync`.

## Core Commands

| Command | Purpose |
|---|---|
| `npx sdlc-harness init` | Non-destructively installs Minimal Context Harness into the current project. |
| `npx sdlc-harness sync` | Refreshes managed guidance, default Skills, Makefile include, tools and templates. It does not generate project semantics. |
| `npx sdlc-harness upgrade` | Runs safe package migrations and `sync`. |
| `npx sdlc-harness validate-context` | Checks that Context has the minimum recovery fields and does not fake test execution results. |
| `make validate-context` | Makefile wrapper for `validate-context`. |
| `make validate-harness` | Compatibility alias for `validate-context` in vNext projects. |
| `sdlc-harness package sync-source` | Maintainer-only command to sync source workspace assets into `packages/sdlc-harness/assets/**`. |
| `sdlc-harness package check-source` | Maintainer-only drift check for package canonical assets. |

## Minimal Context Files

`project_context/global.md` is the first file a fresh agent should read. It contains:

- project goal
- non-goals / boundaries
- background
- design rationale, including former ADR-level decisions that still matter
- architecture context link
- product / delivery brief for durable product goals, users, flows and acceptance signals
- UX / screen brief for durable screen, interaction, responsive and accessibility facts
- verification entry points
- current state
- next safe action
- module index

`project_context/architecture.md` is the restrained architecture document. It contains:

- system boundary
- component map
- data / control flow
- architecture-level design rationale
- constraints and tradeoffs
- verification implications
- open risks

`project_context/modules/<module>.md` contains:

- responsibility
- user / system contract
- core data, API or state
- key constraints
- code entry points
- test entry points
- open risks

The Context should be short enough to read at session start and specific enough to prevent fresh-agent drift. It should not copy code, test logs, release ledgers or implementation narration that the code already makes obvious.

Product, UI/UX and development engineer Skills are prompts for keeping that Context sharp. They may help draft a product plan, screen design or implementation plan, but the long-lived asset is still the compact Context.

Projects can customize these Skills without editing package-managed files:

```sh
mkdir -p .codex/pjsdlc_managed/override_skills
$EDITOR .codex/pjsdlc_managed/override_skills/context_product_plan.md
$EDITOR .codex/pjsdlc_managed/override_skills/context_uiux_design.md
$EDITOR .codex/pjsdlc_managed/override_skills/context_development_engineer.md
npx sdlc-harness sync
```

`sync` appends those local rules into `.codex/skills/context_product_plan/SKILL.md`, `.codex/skills/context_uiux_design/SKILL.md` and `.codex/skills/context_development_engineer/SKILL.md`. The override can narrow product/design/development behavior for the project, but conclusions should still land in `project_context/**` and `DESIGN.md`.

For visual UI projects, `DESIGN.md` can sit beside Context as the design-system fact source. Use `npx @google/design.md lint DESIGN.md` to validate its structure when the file is created or changed.

## Current Boundary

The former stage-based Harness is no longer shipped as a runnable default, compatibility layer or migration command. Existing users have completed migration, so the package keeps only the current Minimal Context surface.

The design reason is evidence-driven: delivery benchmark pilots showed that full SDLC document chains and frequent workflow gates create real time/token friction on ordinary and medium-complexity tasks, while modern agents already handle much of single-stage product/test work internally. The vNext default keeps the part with the clearest expected return: a minimal durable context for recovery, iteration, debug and requirements changes.

## Delivery Benchmark

`examples/delivery-benchmark/` remains repo-local. It is used to test whether Harness changes improve same-quality lifecycle delivery efficiency. Historical stage-based result summaries were removed from the public report; future Harness prompts use Minimal Context and require fresh reruns.

The benchmark should not prove that Harness is always faster. It should find the break-even curve: which complexity, risk and recovery conditions make context maintenance pay back its cost.

Open the static report at [examples/delivery-benchmark/results/index.html](examples/delivery-benchmark/results/index.html).
