# Frequently Asked Questions

This FAQ is for people evaluating Project Tiny Context Harness from GitHub, npm, launch posts or curated lists. It keeps the public claim narrow: Minimal Context helps fresh coding-agent chats recover durable project facts. It does not prove product quality, replace tests or automate the SDLC.

## Is this just AGENTS.md?

No. `AGENTS.md` is the startup router: what to read first, what hard boundaries apply and which validation command matters.

Project Tiny Context Harness adds the small maintained fact source behind that router:

- `project_context/global.md` for project goal, non-goals and current state.
- `project_context/architecture.md` for durable system boundaries.
- `project_context/context.toml` for the Context graph.
- `project_context/areas/**` for owned product/module facts and repeatable verification paths.

The point is to keep `AGENTS.md` short enough to read at session start while giving a fresh agent one stable place to recover project memory.

## Why not just write a better README?

README is for humans and broad onboarding. Minimal Context is for agent recovery before a code change.

A good README explains what the project is. A good Context surface tells a fresh agent what must not drift: project intent, architecture boundaries, ownership, validation paths and durable conclusions from prior work.

## How is this different from Claude/Cursor/Codex rules files?

Tool-specific rules are useful, but they are tied to one agent surface. Project Tiny Context Harness keeps the durable recovery contract in plain repo files:

- root `AGENTS.md`
- `project_context/**`

Support assets can live under `.codex`, `.claude`, `.cursor`, `.gemini`, `.opencode` or another harness folder, but the shared project memory stays portable.

## How is this different from spec-first or full SDLC workflows?

Spec-first kits and full SDLC workflows can be useful for high-risk work. Project Tiny Context Harness is a lighter default.

It does not require every task to produce PRDs, technical plans, implementation reports, review docs, test reports or release notes. The default is:

```text
keep durable project memory
avoid stage ceremony
leave product quality to tests, CI, review and humans
```

## Why did you remove the old stage-based workflow?

The old direction externalized too much of ordinary software work into phase transitions and work products. That added real time and token cost, especially for small and medium tasks.

Modern coding agents already internalize much of the normal understand, design, implement, test and repair loop. The useful part to preserve is not phase choreography; it is the compact project memory that lets a fresh agent recover intent and boundaries quickly.

## Does this replace tests or CI?

No.

`validate-context` checks whether the recovery surface exists and avoids misleading durable claims such as storing "tests passed" as Context. It does not prove the code works.

Product quality still belongs to the project’s tests, CI, review process, smoke checks and human acceptance.

## Does it store test results or release logs?

No. Context should store repeatable validation paths, not one-off evidence.

Good:

```text
npm test -- label-routing
make validate-context
```

Bad:

```text
Tests passed on my machine at 2026-06-10 10:12.
Full CI log: ...
Release ledger: ...
```

## When should Context be updated?

Update `project_context/**` when a change creates or changes a durable fact:

- product goal or non-goal
- module ownership
- architecture boundary
- API, schema, state or scheduler semantics
- repeatable validation or deployment path
- a debugging lesson that future agents should not rediscover

Do not update Context for routine bug fixes, local refactors, formatting, transient logs or one-off execution notes unless they reveal a durable fact.

## Does this make every task slower?

It should not. The default surface is intentionally small.

The tradeoff is that agents spend a little time reading durable facts up front so they do not repeatedly rediscover project intent, ownership and validation paths across fresh chats.

Do not publish benchmark speedup claims from old stage-based results. Fresh performance claims require a new baseline and a Minimal Context Harness comparison.

## Is this useful for solo projects?

Yes, if you use fresh agent chats often. The user does not have to be a team for project memory to drift.

It is most useful when the same facts keep coming up:

- "Do not touch this generated file."
- "This module owns the behavior."
- "Run this focused test first."
- "This previous debugging path was a dead end."

## Is this useful for teams?

Yes, if several people or agents touch the same repo. It gives everyone a compact shared recovery surface and reduces dependence on one person’s chat history.

It still does not replace issue tracking, review, CI or team design discussions.

## Does it index the codebase?

No. It is not a semantic code index or retrieval engine.

Use code-intelligence and documentation-retrieval tools for symbols, APIs and external docs. Use Project Tiny Context Harness for durable project facts that should travel with the repository.

## Does it work only with Codex?

No. The files are plain repository assets. Codex, Claude Code, Cursor, Gemini CLI, OpenCode, Cline, Roo and human reviewers can read the same `AGENTS.md` and `project_context/**` files.

See [agent surface recipes](agent-surface-recipes.md) for tool-specific harness-folder examples.

## Why is the public README English-first?

GitHub, Hacker News, Product Hunt, Reddit and curated lists are mostly evaluated through English first. The default README, npm copy and launch posts stay English-first so strangers can quickly judge the project.

Localized docs can exist behind secondary links. The Simplified Chinese entry is [README.zh-CN.md](../README.zh-CN.md).

## Can I try it before the renamed npm package is published?

Yes. While `project-tiny-context-harness@latest` is still pending registry publication, use the source preview path from the root README:

```sh
git clone https://github.com/Seven128/project-tiny-context-harness.git
cd project-tiny-context-harness
npm ci
npm run smoke:quickstart
```

Broad launch should still wait until the renamed npm package is published and installable.

## What should I report if I try it?

Open an [adoption report](https://github.com/Seven128/project-tiny-context-harness/issues/new?template=adoption_report.yml) with:

- what your agent kept rediscovering
- which facts became easier to recover
- which Context files felt too noisy or too thin
- which validation paths were missing

Recovery evidence is useful. Benchmark claims need fresh controlled runs.
