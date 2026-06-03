# AI SDLC Harness Project Spec

This document explains the stable product direction, design rationale and package behavior for AI SDLC Harness. User-facing commands live in [README.md](README.md). Long-form historical details and evidence remain in `.work_products/**` and ADR files.

## Product Goal

AI SDLC Harness helps AI coding agents deliver requirements projects more efficiently by preserving the minimum durable context needed for recovery, iteration, debug and requirement changes.

Efficiency is not first-turn code generation speed. The target is same-quality delivery over a project lifecycle: a fresh agent should quickly know what the project is for, what not to change, where the code and tests are, what design choices matter, what is currently true and what the next safe action is.

## Current Design: Minimal Context Harness

The vNext default is **Minimal Context Harness**.

Default durable facts:

- `project_context/global.md`
- `project_context/modules/<module>.md`
- code, tests and necessary code comments

Default non-goals:

- no lifecycle phase state by default
- no `plan.yaml` task protocol by default
- no stage skills by default
- no default PRD / UX / architecture / tech plan / implementation / review / test / release / RFC product chain
- no phase gates by default

Harness now maintains context quality, not project test quality. Product quality is proven by the project’s own tests, smoke checks, hidden probes, CI, review and human acceptance.

## Context Contract

`project_context/global.md` stores the cross-project facts a fresh agent needs:

- project goal
- non-goals / boundaries
- background
- design rationale, including still-relevant ADR decisions
- verification entry points
- current state
- next safe action
- module index

`project_context/modules/<module>.md` stores module-local facts:

- responsibility
- user / system contract
- core data / API / state
- key constraints
- code entry points
- test entry points
- open risks

The Context should be compact and semantically split. It should not duplicate code, test logs, release ledgers or implementation narration that the source already exposes. Former ADR content is downgraded into `Design Rationale`; implementation documentation is downgraded into code comments, test names and short Context constraints when the code does not make the fact obvious.

## Package Behavior

`init` creates Minimal Context assets and managed guidance:

- `AGENTS.md`
- `project_context/global.md`
- `project_context/modules/main.md`
- `<harnessRoot>/config.yaml`
- `<harnessRoot>/pjsdlc_managed/context_templates/**`
- `<harnessRoot>/pjsdlc_managed/make/sdlc-harness.mk`
- `tools/**`
- `.github/workflows/harness.yml` when absent or managed

`init` does not create `.work_products/**`, lifecycle state, plan state, stage skills, stage templates or stage policies by default.

`sync` refreshes managed assets only. It never reads old `.work_products/**` and never generates `project_context/**`.

`upgrade` runs safe migrations and `sync`. If legacy stage facts are detected, it prompts the user to run:

```sh
npx sdlc-harness migrate-context --dry-run
```

`migrate-context` is explicit and safe by default:

- `--dry-run` previews output and writes nothing.
- `--write` creates or updates `project_context/**`.
- old `.work_products/**`, `.docs/**`, stage state and stage assets are preserved.
- existing user-authored Context is protected by writing migration output to `project_context/_migration/latest/**` unless a managed migration marker is present.

`validate-context` checks that Context has the minimum recovery fields and does not fake product verification evidence. It does not replace project tests.

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

It used `.codex/state/lifecycle.yaml`, `plan.yaml`, `plan.draft.yaml`, `.work_products/**`, stage skills, stage templates, generated overviews, phase validators and phase transition helpers.

The design goal was reasonable: make requirements, design, implementation, review, testing, release and requirement changes explicit so agents would miss less, recover faster and hand off better. The repository still keeps this historical implementation as source, legacy compatibility material and benchmark evidence.

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
- Legacy stage assets can remain available without being the default new-project path.
- Benchmark conclusions must distinguish high-confidence measured data from diagnostic or historical evidence.

## Repository Product Areas

This source workspace contains three maintained areas:

- Harness source and package assets: `packages/sdlc-harness/**`, `.codex/pjsdlc_managed/**`, `tools/**`.
- Package release and source-sync logic: build/test/release scripts and `packages/sdlc-harness/source-mappings.yaml`.
- Delivery benchmark: `examples/delivery-benchmark/**`, used to test whether the Harness product direction improves same-quality lifecycle delivery efficiency.

## Legacy Material

`.work_products/**` and `.codex/state/**` remain in this repository as historical self-authoring facts and migration input. They are not the package default for new projects.

Major historical design reasons are still traceable through ADR slices under `.work_products/05_decisions/**`, especially the benchmark scenario design ADR and stage contract ADR. Future updates should add concise ADRs only when they introduce durable tradeoffs, not as routine implementation logs.
