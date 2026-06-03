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
- `project_context/modules/main.md`
- `<harnessRoot>/config.yaml`
- `<harnessRoot>/skills/context_product_plan/SKILL.md`
- `<harnessRoot>/skills/context_uiux_design/SKILL.md`
- `<harnessRoot>/pjsdlc_managed/context_templates/**`
- `<harnessRoot>/pjsdlc_managed/make/sdlc-harness.mk`
- `tools/**`
- a root `Makefile` include block

`init` does not create lifecycle state, plan state, stage skills or stage work-product trees by default.

The two default Skills are Minimal Context authoring helpers. Requests such as “产品方案 / 产品经理” use the product planning Skill; requests such as “设计稿 / UI/UX” use the design Skill. Product and screen-flow conclusions go to `project_context/**`; visual identity and design tokens go to `DESIGN.md` using Google’s open `@google/design.md` format when a visual design system is needed.

## Core Commands

| Command | Purpose |
|---|---|
| `npx sdlc-harness init` | Non-destructively installs Minimal Context Harness into the current project. |
| `npx sdlc-harness sync` | Refreshes managed guidance, Makefile include, tools and templates. It does not migrate old semantic facts into Context. |
| `npx sdlc-harness upgrade` | Runs safe package migrations and `sync`; if old stage facts are detected, it tells you to run `migrate-context`. |
| `npx sdlc-harness migrate-context --dry-run` | Previews migration from existing legacy project facts into `project_context/**` and optional `DESIGN.md` candidates. |
| `npx sdlc-harness migrate-context --write` | Writes Minimal Context files and optional `DESIGN.md` migration output. It keeps old files by default. |
| `npx sdlc-harness migrate-context --write --archive-legacy` | Writes migration output, then moves old stage artifacts such as `.work_products/**` into `project_context/_migration/legacy_archive/<timestamp>/`. |
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
- product / delivery brief for durable product goals, users, flows and acceptance signals
- UX / screen brief for durable screen, interaction, responsive and accessibility facts
- verification entry points
- current state
- next safe action
- module index

`project_context/modules/<module>.md` contains:

- responsibility
- user / system contract
- core data, API or state
- key constraints
- code entry points
- test entry points
- open risks

The Context should be short enough to read at session start and specific enough to prevent fresh-agent drift. It should not copy code, test logs, release ledgers or implementation narration that the code already makes obvious.

Product and UI/UX Skills are prompts for keeping that Context sharp. They may help draft a product plan or screen design, but the long-lived asset is still the compact Context.

For visual UI projects, `DESIGN.md` can sit beside Context as the design-system fact source. Use `npx @google/design.md lint DESIGN.md` to validate its structure when the file is created or changed.

## Migration Policy

Semantic migration is explicit:

```sh
npx sdlc-harness migrate-context --dry-run
npx sdlc-harness migrate-context --write
npx sdlc-harness migrate-context --write --archive-legacy
```

`sync` never reads legacy `.work_products/**` and never generates Context. `upgrade` never performs semantic migration automatically; it only prints the migration path when it detects legacy stage facts in a user project.

`sync` also leaves `DESIGN.md` alone. Visual design migration is semantic work and only happens through `migrate-context`.

When Context files do not exist, `migrate-context --write` creates them. When Context files already exist and contain the managed migration marker, it updates that marker block. When Context files already exist without the marker, it writes migration output under `project_context/_migration/latest/**` to avoid overwriting user-authored Context.

When legacy experience/design material exists, `migrate-context` also previews or writes a Google `@google/design.md` compatible `DESIGN.md` candidate. If the project already has `DESIGN.md`, the candidate is written under `project_context/_migration/latest/DESIGN.md` instead of overwriting the user’s design system.

By default, migration leaves `.work_products/**` and old phase state in place so users can review the generated Context before removing historical material. After the Context has been reviewed, `migrate-context --write --archive-legacy` moves old stage artifacts out of the active workspace and into `project_context/_migration/legacy_archive/<timestamp>/`. This is intentionally an archive, not a hard delete: it removes the old folders as active fact sources while keeping a local recovery path.

## Legacy Migration

The former stage-based Harness is no longer shipped as a runnable default or compatibility layer. Existing projects that still have old configs and artifacts should migrate deliberately with `migrate-context`; `sync` and `upgrade` will not perform that semantic rewrite or archive automatically.

The design reason is evidence-driven: delivery benchmark pilots showed that full SDLC document chains and frequent workflow gates create real time/token friction on ordinary and medium-complexity tasks, while modern agents already handle much of single-stage product/test work internally. The vNext default keeps the part with the clearest expected return: a minimal durable context for recovery, iteration, debug and requirements changes.

## Delivery Benchmark

`examples/delivery-benchmark/` remains repo-local. It is used to test whether Harness changes improve same-quality lifecycle delivery efficiency. Historical stage-based result summaries were removed from the public report; future Harness prompts use Minimal Context and require fresh reruns.

The benchmark should not prove that Harness is always faster. It should find the break-even curve: which complexity, risk and recovery conditions make context maintenance pay back its cost.

Open the static report at [examples/delivery-benchmark/results/index.html](examples/delivery-benchmark/results/index.html).
