# AI SDLC Harness Project Spec

This document explains the stable product direction, design rationale and package behavior for AI SDLC Harness. User-facing commands live in [README.md](README.md). Historical stage-based workflow details are retained here only as a concise design summary.

## Product Goal

AI SDLC Harness helps AI coding agents deliver requirements projects more efficiently by preserving the minimum durable context needed for recovery, iteration, debug and requirement changes.

Efficiency is not first-turn code generation speed. The target is same-quality delivery over a project lifecycle: a fresh agent should quickly know what the project is for, what not to change, where the code and tests are, what design choices matter, what is currently true and what the next safe action is.

## Current Design: Minimal Context Harness

The vNext default is **Minimal Context Harness**.

Default durable facts:

- `project_context/global.md`
- `project_context/architecture.md`
- `project_context/context.toml` as the Schema v4 Context graph manifest
- `project_context/areas/<unit>.md`
- `DESIGN.md` for visual identity and design tokens when a UI project needs a design system
- code, tests and necessary code comments
- default Context authoring Skills for product planning, UI/UX design and development engineering

Default non-goals:

- no lifecycle phase state by default
- no `plan.yaml` task protocol by default
- no stage skills by default
- no default PRD / UX / architecture / tech plan / implementation / review / test / release / RFC product chain
- no phase gates by default

Harness now maintains context quality, not project test quality. Product quality is proven by the project’s own tests, smoke checks, hidden probes, CI, review and human acceptance.

## Why Minimal Context / 为什么是最小上下文

The stage-based Harness was built from a reasonable premise: if an agent explicitly writes requirements, design, architecture, implementation notes, review evidence, test reports, release notes and RFCs, then later agents should miss less and recover faster.

Benchmark pilots changed the default product judgment. The workflow’s fact-source writes, stage decisions, phase transitions and gates are real process cost; they consume time and tokens even when the final product quality is the same. At the same time, modern coding agents have internalized much of the ordinary single-task loop: understanding a compact requirement, choosing a local design, editing code, running tests and repairing simple failures. For ordinary and medium-complexity work, forcing a full SDLC document chain duplicates work the model can already do well.

The part that remains clearly valuable is not the ceremony itself. It is durable, compact context that survives a new conversation: project goal, non-goals, design rationale, restrained architecture context, area responsibilities, code entry points, test entry points, current state and next safe action. Those facts are hard to recover from code alone and expensive to re-explain every time.

Therefore the current design keeps the product goal unchanged, but narrows the default mechanism:

- preserve the smallest context that helps future agents resume safely;
- keep product-plan, UI/UX and development-engineering prompting as optional Context authoring helpers, not as stage artifacts;
- keep one restrained architecture context for system boundary, component map and durable constraints;
- let code, tests and project-specific probes prove product quality;
- move ADR decisions into Context `Design Rationale` instead of standalone default ADR files;
- move implementation narration into code comments, tests and short module constraints;
- make richer process artifacts and strict gates conditional, not default.

In short: Harness no longer tries to externalize the whole SDLC by default. It maintains the minimum durable context needed for recovery and continuation.

## Context Contract

`project_context/global.md` stores the cross-project facts a fresh agent needs:

- project goal
- non-goals / boundaries
- background
- design rationale, including still-relevant ADR decisions
- architecture context link
- product / delivery brief for durable product goals, users, flows and acceptance signals
- UX / screen brief for durable screen, interaction, responsive and accessibility facts
- verification entry points
- current state
- next safe action
- context index

`project_context/architecture.md` stores restrained architecture facts:

- system boundary
- component map
- data / control flow
- architecture-level design rationale
- constraints and tradeoffs
- verification implications
- open risks

`project_context/context.toml` stores the Schema v4 Context graph:

- ordinary projects default to one `main` area rooted at `.`;
- monorepo or product-family projects can declare multiple `area` / `context_unit` entries;
- context nodes can declare role, trigger/read policy, default children and optional boundary metadata;
- `upgrade` creates a conservative baseline manifest for existing projects by registering current area Context files as areas;
- boundary support is metadata validation only, not a replacement for project-specific import/path checks.

`project_context/areas/<unit>.md` stores area, domain or subdomain facts by default:

- responsibility
- user / system contract
- core data / API / state
- key constraints
- code entry points
- test entry points
- open risks

Additional `project_context/**` Markdown files can declare `context_role` in front matter or receive a role from `context.toml`. Roles are semantic labels for agent reading and authoring behavior; `validate-context` checks graph structure, paths and field shapes instead of enforcing a writing template for every role. Automatic migration moves legacy `project_context/modules/**/*.md` files into `project_context/areas/**/*.md` and does not infer deep semantic roles; a later agent should refine the manifest explicitly when a migrated area is really a foundation, contract, archive or implementation index.

The Context should be compact and semantically split. It should not duplicate code, test logs, release ledgers or implementation narration that the source already exposes. Former ADR content is downgraded into `Design Rationale`; implementation documentation is downgraded into code comments, test names and short Context constraints when the code does not make the fact obvious.

The default product planning, UI/UX and development engineer Skills are a thin authoring layer. Their trigger descriptions stay narrow: explicit role names or strong artifact names should activate them, while generic mentions of product, design or development should not. Product, screen-flow and durable engineering conclusions are durable only when compressed into Context. Visual identity, design tokens and component styling rules are durable in `DESIGN.md` using Google’s open `@google/design.md` format.

## Package Behavior

`init` creates Minimal Context assets and managed guidance:

- `AGENTS.md`
- `project_context/context.toml`
- `project_context/global.md`
- `project_context/architecture.md`
- `project_context/areas/main.md`
- `<harnessRoot>/config.yaml`
- `<harnessRoot>/skills/context_product_plan/SKILL.md`
- `<harnessRoot>/skills/context_uiux_design/SKILL.md`
- `<harnessRoot>/skills/context_development_engineer/SKILL.md`
- `<harnessRoot>/pjsdlc_managed/override_skills/`
- `<harnessRoot>/pjsdlc_managed/context_templates/**`
- `<harnessRoot>/pjsdlc_managed/make/sdlc-harness.mk`
- `tools/**`
- `.github/workflows/harness.yml` when absent or managed

`init` does not create `.work_products/**`, lifecycle state, plan state, stage skills, stage templates or stage policies by default.

`sync` refreshes managed assets only. It never generates project semantics.

Product, UI/UX and development engineer Skill customization lives under `<harnessRoot>/pjsdlc_managed/override_skills/*.md`; `sync` appends those local rules into `<harnessRoot>/skills/**`.

`upgrade` runs safe migrations and `sync`. The old semantic migration command has been removed because user migrations are complete.

`validate-context` checks that Context has the minimum recovery fields and does not fake product verification evidence. It does not replace project tests.

The canonical npm package is `agent-project-sdlc`; `sdlc-harness` is the bin name. Public commands and managed Makefile wrappers prefer `npx --yes --package agent-project-sdlc@latest sdlc-harness` for ad hoc use so bare `npx sdlc-harness` cannot resolve a legacy package name or stale local binary. Current CLI commands guard unsupported future schema major versions before applying v4 assumptions, and write commands fail before modifying files.

## Historical Iteration: Stage-Based SDLC Harness

The previous default attempted to encode a full stage-based software lifecycle:

- `REQUIREMENT_GATHERING`
- `UI_UX_DESIGNING`
- `ARCHITECTING`
- `SPRINTING`
- `REVIEWING`
- `TESTING`
- `RELEASING`
- `RFC_RECALIBRATION`

It used lifecycle state, `plan.yaml`, `plan.draft.yaml`, `.work_products/**`, stage skills, stage templates, generated overviews, phase validators and phase transition helpers.

The design goal was reasonable: make requirements, design, implementation, review, testing, release and requirement changes explicit so agents would miss less, recover faster and hand off better.

The implementation was broad: each lifecycle phase owned a role prompt, allowed paths, required gates and work-product templates. Development tracked current tasks in plan state; phase changes used transition helpers; validators checked PRD / UX / design / implementation / review / test / release / RFC completeness; generated overviews tried to make large document trees easier to browse.

The cost was also broad: agents spent time reading phase state, deciding allowed actions, writing durable artifacts, refreshing generated views and running gates. Benchmark pilots showed this overhead remained even when final product quality matched direct coding.

## Benchmark Findings And Convergence Reason

Delivery benchmark work exposed an important cost signal. Full document chains and frequent workflow gates add real time and token friction. On ordinary and medium-complexity projects, modern coding agents already internalize much of the single-stage product/design/test behavior that the stage Harness tried to force through default artifacts.

Observed implication:

- stages, gate checks and fact-source writes are objective workflow friction and cannot be erased entirely;
- the clearest remaining value is faster context recovery for future iteration, debug and requirement changes;
- the highest-leverage durable fact source is likely a small Project / Delivery Context, not a full SDLC document chain;
- full gates and rich process artifacts should be conditional, not default.

Therefore the canonical product direction changed: preserve minimal durable context, leave product quality to project-specific validation, and use benchmark work to find the break-even curve where extra workflow structure pays back.

## Design Principles

- Minimal durable facts beat broad default ceremonies.
- Context is for recovery and safe continuation, not for duplicating source code.
- Harness should not claim product quality; it should point agents to verification entry points.
- Semantic migration must be explicit and reversible.
- Managed asset sync must be narrow and predictable.
- Historical stage design is documentation-only in the current source tree; runnable defaults are Minimal Context.
- Benchmark conclusions must distinguish high-confidence measured data from diagnostic or historical evidence.

## Repository Product Areas

This source workspace contains three maintained areas:

- Harness source and package assets: `packages/sdlc-harness/**`, `.codex/pjsdlc_managed/**`, `tools/**`.
- Package release and source-sync logic: build/test/release scripts and `packages/sdlc-harness/source-mappings.yaml`.
- Delivery benchmark: `examples/delivery-benchmark/**`, used to test whether the Harness product direction improves same-quality lifecycle delivery efficiency.

## Historical Material

Old stage-based source assets, state files and work-product trees are removed from the current implementation. The durable information kept from that era is this spec summary: what the stage Harness tried to do, how it was implemented, what benchmark work found and why the product converged to Minimal Context.

Future design changes should keep the same discipline: preserve the reasoning that affects current behavior, but avoid recreating large default document chains unless measured evidence shows they pay back their cost.
