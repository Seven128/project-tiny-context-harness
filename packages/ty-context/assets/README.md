# Project Tiny Context Harness

[![npm version](https://img.shields.io/npm/v/project-tiny-context-harness.svg)](https://www.npmjs.com/package/project-tiny-context-harness)
[![Package CI](https://github.com/Seven128/project-tiny-context-harness/actions/workflows/package.yml/badge.svg)](https://github.com/Seven128/project-tiny-context-harness/actions/workflows/package.yml)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/Seven128/project-tiny-context-harness/badge)](https://securityscorecards.dev/viewer/?uri=github.com/Seven128/project-tiny-context-harness)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Open in GitHub Codespaces](https://img.shields.io/badge/open%20in-Codespaces-181717?logo=github)](https://codespaces.new/Seven128/project-tiny-context-harness)

Translations: [Chinese (Simplified)](README.zh-CN.md)

Project Tiny Context Harness is repo-native project memory for AI coding agents.

`project-tiny-context-harness` ships Project Tiny Context Harness through the `ty-context` CLI. It installs **Minimal Context Harness**: a compact `project_context/**` fact source, a short `AGENTS.md` startup router, role Skills and a `validate-context` gate so fresh agents can recover project intent, boundaries, verification entry points and next safe actions quickly.

It is not another full Tiny Context ceremony. The Harness maintains context quality; project tests, reviews, CI and human acceptance still own product quality.

Think of it as durable project memory behind `AGENTS.md`, not another agent, process framework or task manager.

Best for:

- repos where coding agents keep rediscovering project intent
- teams using multiple agents or frequent fresh chats
- maintainers who want durable context without a full planning ceremony

Not for:

- replacing tests, review, CI or issue trackers
- autonomous Tiny Context execution
- codebase semantic indexing or external docs retrieval

Concrete shift:

```text
Before: ask a fresh agent to read the repo and tell you what matters.
After: ask it to read AGENTS.md and project_context/** first, then summarize goal, non-goals, architecture boundaries and validation paths before proposing code.
```

What gets added:

```mermaid
flowchart LR
  A["Fresh agent session"] --> B["AGENTS.md startup router"]
  B --> C["project_context/** durable facts"]
  C --> D["Goal, non-goals, architecture boundaries, validation paths"]
  D --> E["Code proposal starts with repo intent loaded"]
  F["Tests / CI / review"] --> G["Product quality evidence"]
  C -. "does not own" .-> G
```

![Project Tiny Context Harness terminal demo](https://raw.githubusercontent.com/Seven128/project-tiny-context-harness/main/docs/launch/assets/demo-terminal.gif)

The demo shows the core loop: initialize `AGENTS.md` and `project_context/**`, run `validate-context`, then ask a fresh agent to recover intent before proposing code. Use the npm install path below, or inspect the no-install previews first.

Install:

```sh
npm install -D project-tiny-context-harness@latest
npx --yes --package project-tiny-context-harness@latest ty-context init
```

No-install preview:

- Read the [fresh-agent recovery walkthrough](docs/examples/fresh-agent-recovery.md).
- Inspect the [Minimal Context sample guide](docs/examples/minimal-context-sample.md).
- Browse a tiny generated sample repository at [examples/minimal-context-sample/](examples/minimal-context-sample/).

Source checkout preview:

Browser preview:

```text
Open https://codespaces.new/Seven128/project-tiny-context-harness
```

When the Codespace finishes `npm ci`, run:

```sh
npm run smoke:quickstart
npm run preview:pack
```

Local preview:

```sh
git clone https://github.com/Seven128/project-tiny-context-harness.git
cd project-tiny-context-harness
npm ci
npm run smoke:quickstart
npm run preview:pack
```

That smoke packs the local workspace, installs it into a disposable repo, runs `ty-context init` and validates the generated Minimal Context files. Use this path for package development, source-preview testing or private review.

```sh
npm run preview:pack
cd /path/to/your/test-repo
npm install -D /path/to/project-tiny-context-harness/tmp/ty-context/source-preview/package/project-tiny-context-harness-0.2.57.tgz
npx --no-install ty-context init --adopt
make validate-context
```

If the source preview path fails, open a [Source preview report](https://github.com/Seven128/project-tiny-context-harness/issues/new?template=source_preview_report.yml) with the command, environment and shortest useful output.

Use it when coding agents repeatedly lose project intent across new chats, handoffs, RFC/debug turns or tool changes. The intended tradeoff is: keep durable intent and recovery paths; leave execution evidence to code, tests and review.

## Why It Exists

Coding agents can move quickly inside one thread and still drift when a new chat, model, tool, reviewer or debugging session loses the project-specific facts that were never encoded anywhere stable.

Most repositories already have README files, specs, tests and issue history, but fresh agents need a small, explicit recovery path: what the project is trying to do, what it must not do, where architecture boundaries live, how to validate changes and what durable facts changed after the last task. Minimal Context Harness makes that recovery path a first-class repo surface without adding a full planning ceremony.

The product lesson is: **keep the memory, drop the ceremony**. Earlier stage-based workflows externalized requirements, design, implementation, review, test and release into explicit phase artifacts. Modern coding agents already internalize much of that ordinary software loop. Project Tiny Context Harness keeps the useful part: the smallest high-density repo context that survives fresh chats without forcing every task through phase transitions, work-product validation or Tiny Context-stage context splits.

## Positioning

| Adjacent tool type | Use it for | Harness stance |
|---|---|---|
| Spec-first kits | Turning a feature idea into structured specs and implementation plans. | Complementary. Keep final durable project facts in `project_context/**`; do not require spec documents for every task. |
| BMAD-style workflows and full Tiny Context processes | Coordinated role/process ceremonies on high-risk work. | Lighter default. Preserve context quality without shipping phase gates or work-product trees. |
| Task Master-style planners | Backlog decomposition and task execution state. | Complementary. Harness does not own task state; it owns durable project memory. |
| Context7/Serena-style retrieval or code-intelligence tools | Pulling external docs, symbols or repository facts on demand. | Complementary. Harness keeps the local project truth that should travel with the repo. |
| IDE or agent memory | Tool-specific continuity inside one product surface. | Portable fallback. Harness files are plain repo assets that any agent can read. |

## Try It In 60 Seconds

```sh
mkdir project-tiny-context-harness-demo
cd project-tiny-context-harness-demo
git init
npm init -y
npm install -D project-tiny-context-harness@latest
npx --yes --package project-tiny-context-harness@latest ty-context init
make validate-context
```

Then open `AGENTS.md`, `project_context/global.md` and `project_context/architecture.md`. Those files are the small recovery surface a fresh agent should read before changing the project.

Expected result:

```text
AGENTS.md
project_context/
  context.toml
  global.md
  architecture.md
  areas/main.md
  areas/main/verification.md
```

Fresh-agent test prompt:

```text
Read AGENTS.md and project_context/** first. Summarize the project goal, non-goals, architecture boundaries, validation entry points and next safe action before proposing code changes.
```

If the agent can answer that without rediscovering the repo from scratch, the Harness is doing its job.

A useful first answer should recover the project goal, non-goals, architecture boundaries, validation entry points and next safe action. It should not invent benchmark results or claim tests passed.

Maintainers can verify the local package artifact with the same flow:

```sh
npm run launch:check
npm run smoke:quickstart
```

Copy-ready launch materials live in [docs/launch/README.md](https://github.com/Seven128/project-tiny-context-harness/blob/main/docs/launch/README.md).

For the stable product/design rationale, see [PROJECT_SPEC.md](PROJECT_SPEC.md).

Feedback from real repositories is especially useful right now. If you try the Harness, open an [adoption report](https://github.com/Seven128/project-tiny-context-harness/issues/new?template=adoption_report.yml) with what your agent was forgetting, what Minimal Context made easier and what recovery facts were still missing.

Early feedback and starter issues:

- If the README, sample repo or generated Context leaves a fresh-agent recovery fact unclear, open a [Context recovery gap](https://github.com/Seven128/project-tiny-context-harness/issues/new?template=context_gap.yml).
- Share what worked or failed in the pinned [adoption reports issue](https://github.com/Seven128/project-tiny-context-harness/issues/4).
- Pick a starter issue: [demo](https://github.com/Seven128/project-tiny-context-harness/issues/5), [sample walkthrough](https://github.com/Seven128/project-tiny-context-harness/issues/6), [benchmark rerun](https://github.com/Seven128/project-tiny-context-harness/issues/7) or [launch FAQ](https://github.com/Seven128/project-tiny-context-harness/issues/8).
- Keep claims narrow: recovery evidence is useful; benchmark speedup claims need fresh Minimal Context benchmark runs.

For current priorities and non-goals, see the [roadmap](docs/roadmap.md).

For benchmark boundaries, read [Benchmarking And Evidence](docs/benchmarking.md).

For contribution, support, security, conduct and governance, see [CONTRIBUTING.md](CONTRIBUTING.md), [SUPPORT.md](SUPPORT.md), [SECURITY.md](SECURITY.md), [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) and [GOVERNANCE.md](GOVERNANCE.md).

For concrete examples, read the [fresh-agent recovery walkthrough](docs/examples/fresh-agent-recovery.md), the [Minimal Context sample guide](docs/examples/minimal-context-sample.md) and the [browseable sample repository](examples/minimal-context-sample/).

For the longer technical argument, read [Fresh coding-agent sessions need project memory, not more ceremony](docs/articles/fresh-agent-project-memory.md).

For adjacent-tool fit, read the [comparison guide](docs/comparison.md).

For existing repositories, read the [adoption guide](docs/adopt-existing-repo.md). For Codex, Claude Code, Cursor, Gemini CLI, OpenCode and other tool-specific setup notes, see [agent surface recipes](docs/agent-surface-recipes.md).

For common launch and adoption questions, see the [FAQ](docs/faq.md).

## Repository Scope

This repository is both the source workspace and a reference workspace for `project-tiny-context-harness`. It contains three product areas:

- Harness source code: `packages/ty-context/src/**`, package assets, validators, migrations and source-sync logic.
- npm package release logic: package metadata, build/test scripts and source asset drift checks for `project-tiny-context-harness`.
- Delivery benchmark logic: `examples/delivery-benchmark/**`, used to compare baseline coding against Harness-assisted delivery under the same quality bar.

Earlier stage-based workflow assets have been removed from the current source tree. The historical design and convergence reason are summarized in [PROJECT_SPEC.md](PROJECT_SPEC.md); new package consumers default to `project_context/**`.

## Install

```sh
npm install -D project-tiny-context-harness@latest
npx --yes --package project-tiny-context-harness@latest ty-context init
```

For an existing project:

```sh
npx --yes --package project-tiny-context-harness@latest ty-context init --adopt
```

`init` creates:

- `AGENTS.md`
- `project_context/context.toml`
- `project_context/global.md`
- `project_context/architecture.md`
- `project_context/areas/main.md`
- `project_context/areas/main/verification.md`
- `<harnessRoot>/config.yaml`
- `<harnessRoot>/skills/context_product_plan/SKILL.md`
- `<harnessRoot>/skills/context_uiux_design/SKILL.md`
- `<harnessRoot>/skills/context_development_engineer/SKILL.md`
- `<harnessRoot>/skills/context_surface_contract/SKILL.md`
- `<harnessRoot>/skills/context_full_project_export/SKILL.md`
- `<harnessRoot>/skills/context_harness_upgrade/SKILL.md`
- `<harnessRoot>/skills/plan_acceptance_checklist_compiler/SKILL.md`
- `<harnessRoot>/ty-context-managed/context_templates/**`
- `<harnessRoot>/ty-context-managed/make/ty-context.mk`
- `tools/**`
- a root `Makefile` include block
- `.github/workflows/harness.yml`

The generated workflow runs only the selected Harness gate: `validate-context`, `validate-code-modularity` or the composite `validate-harness`. Maintainer-only package tests and source-drift checks are intentionally kept out of consumer projects.

`init` does not create business Product Surface Contract files, lifecycle state, plan state, stage skills or stage work-product trees by default.

## FAQ

**Why not just write a better README?**

README is for humans and broad orientation. Minimal Context is a smaller machine-readable recovery path for fresh agents: durable intent, non-goals, boundaries, validation commands and context drift notes.

**Is this only for Codex?**

No. The generated files are plain repository assets. Codex, Claude Code, Cursor, Gemini CLI, Cline, Roo or a human reviewer can read the same facts.

The support assets can live in a tool-specific harness folder such as `.codex`, `.claude`, `.cursor`, `.cline`, `.roo`, `.gemini` or a custom folder; the durable recovery contract stays in root `AGENTS.md` and `project_context/**`. See [agent surface recipes](docs/agent-surface-recipes.md).

**Is this an English-only or Chinese-only tool?**

Neither. Public docs, npm copy, launch posts, CLI help/errors, generated Skill activation and default artifact names must be fully usable in English. Generated Skills may include multilingual trigger examples, but those examples are additive compatibility; every supported non-English trigger needs an equivalent narrow English trigger.

**Does `validate-context` prove the project works?**

No. It checks that recovery facts exist and avoids fake test-result claims. Product quality still belongs to tests, CI, review and human acceptance.

**Will this create documentation burden?**

It should stay smaller than a full process. Ordinary bug fixes and local refactors do not update Context unless they produce durable product, architecture, API, state or validation facts.

The default Skills are Minimal Context helpers for explicit product-planning, UI/UX-design, development-engineering, Product Surface Contract, full-project-export, Tiny Context upgrade and plan-acceptance-checklist requests. Product, screen-flow, surface responsibility and durable engineering conclusions go to `project_context/**`; visual identity and design tokens go to root `DESIGN.md`. Export artifacts are temporary files under `tmp/ty-context/context-exports/**`, not Context. Plan acceptance artifacts are temporary files under `tmp/ty-context/plan-acceptance/**`; they define completion criteria for a referenced plan but do not execute it or prove acceptance. The Harness upgrade Skill handles requests such as “upgrade Tiny Context” and “use the Tiny Context upgrade skill to upgrade this project” by following the release update mode, using `upgrade` for migration-bearing releases, and limiting manual cleanup to migration-scoped follow-up.

Multilingual trigger phrases are compatibility details. Public README, npm and launch copy stay English-first, and public/package-managed surfaces must remain English-complete; literal non-English examples are documented only where they explain generated Skill matching and must not be the sole activation path.

For product, UI/UX and engineering tasks that touch design intent, API/Schema, state/runtime behavior, architecture boundaries or verification design, the default Skills compile a short current-task contract before implementation. The contract starts with `Context Delta: none|required`; `required` preserves context-first behavior, while `none` means the task can proceed against existing Context. For engineering, RFC and implementation work, the existing Task Contract also includes `Modularity Check: none|required|exception` so oversized touched files trigger split-or-exception reasoning. For module design work, the development engineer Skill also compiles `Applicable Module Design`: the relevant principles, minimal design logic and durable rationale that control the current implementation or verification choice. The task contract and Contract Conformance are handoff evidence, not new PRD, tech-plan, validator or gate surfaces.

For long-running plans, RFCs or implementation proposals, the plan acceptance checklist compiler can turn a plan plus relevant Context into a falsifiable acceptance checklist and a paste-ready goal/target-mode prompt. This is one pre-execution acceptance pass, not a task planner: it stores temporary inputs under `tmp/ty-context/plan-acceptance/**`, asks for confirmation when durable assumptions are unclear, and leaves execution evidence to the future executor, tests, CI, review or human acceptance.

For Product Surface work, `context_surface_contract` turns broad product/page/UI principles into project-owned surface responsibilities. A Product Surface can be a Web page, mobile screen, desktop window, game UI/HUD/menu, CLI/TUI output, extension UI or embedded/device interface. Cross-surface contracts use the existing `contract` role; area-owned screen facts stay in `area` or `subdomain`; repeatable validation paths use `verification`. The Harness does not add a new surface-specific role, does not create business surface contracts during `init` or `upgrade`, and does not turn surface conformance into a validator gate. Projects that want mandatory task blocks should add a separate project-local Skill, while `product-surface-contract.md` is only a compact managed template for optional Context authoring.

To create Product Surface Context in a user project, use the Skill through an agent because the package cannot safely infer business-specific screen duties from code alone. For a new project, `init` installs the Skill, template and routing guidance; as the project grows, ask the agent to run Product Surface Audit / Compile when a durable surface appears or when a product/UI/engineering task changes main/drilldown ownership. For an existing project, first run `ty-context upgrade`; then ask the agent to backfill the current surface responsibilities, review the proposed contract, and only then apply it to `project_context/**`:

```text
Use context_surface_contract in Audit + Compile mode for this repo. Inspect current user-facing routes, screens, panels, CLI/TUI outputs and relevant Context. Propose Product Surface Contract Context using existing roles only. Do not edit product code.
```

After review, apply the approved contract:

```text
Apply the approved Product Surface Contract to project_context/**, update project_context/context.toml if a new contract file is needed, keep roles to contract/area/subdomain/verification, and run make validate-context.
```

`ty-context check-modularity` supports that field by auditing selected handwritten source files for physical line-count risk. It is warning-only by default as a report command, while `validate-code-modularity` and `validate-harness` run it as a hard gate. The gate is not `validate-context`: `validate-context` remains pure Context recoverability. When `policy` is `scoped_waivers`, over-limit exceptions must be backed by `<harnessRoot>/config.yaml` `modularity.waivers` entries with `path`, narrow `category`, `reason` and `future_split_boundary`; handoff prose alone is not a machine waiver.

### Modularity Policy

Newly generated Harness configs default to `strict_except_generated`, which enforces the touched/PR handwritten source limit without legacy waivers:

```yaml
modularity:
  limit: 300
  policy: strict_except_generated
```

Generated and non-source files are still auto-skipped when they match existing lock/build/dist/path exclusions or generated-file headers such as `@generated` / `Code generated ... DO NOT EDIT`. `strict_except_generated` does not allow `modularity.waivers`; any configured waiver fails the modularity gate.

Use `scoped_waivers` when a small number of legacy exceptions must be explicit and time-bounded:

```yaml
modularity:
  limit: 300
  policy: scoped_waivers
  waivers:
    - path: src/legacy/big-file.ts
      category: legacy_migration
      reason: "Existing legacy module exceeds the hard source size bound."
      future_split_boundary: "Extract provider adapters and retry policy."
```

Omitting `policy` behaves the same as `scoped_waivers` for compatibility with existing projects. Allowed waiver categories are `generated`, `third_party_reference`, `legacy_migration`, `aggregate_styles` and `fixture_snapshot`.

For complex task-contract work, agents may use `plan.md` or an equivalent temporary plan surface as scratch space for `Context Delta`, `Task Contract`, implementation steps and Conformance notes. It is execution cache only: durable facts must be extracted into `project_context/**` or `DESIGN.md`, and temporary plans are not Context, not registered in `context.toml` and not default project assets.

For Product Surface work, frontend layout, UI/UX, product module boundaries or decisions about where information belongs, agents should run a lightweight product/page positioning check before deciding whether the change is context-first. The check asks what judgment the user needs to make on the surface, what information/actions/feedback the product must provide, what should not be persistent, what belongs on the main surface versus drilldown, operations, diagnostics, evidence or detail, and whether layout and information density match the surface task. If ownership is unclear, inspect the relevant surfaces and Context first, and use `context_surface_contract` for a focused audit. The check is input to change classification: it does not by itself require a Context update, new role, new document chain or validator gate.

The expected Context Priority Ladder is: read Context first, run the product/page positioning or Surface Contract check when applicable, classify durable-fact impact or use `Context Delta` inside task-contract scenarios, choose context-first or code-first, then perform Contract Conformance when applicable and Context drift check before handoff. This is prompt-level guidance, not an edit-order validator.

Managed `AGENTS.md` guidance is intentionally a startup router, not a full manual. It should contain fact-source entry points, hard boundaries, key triggers and shortest validation commands; package consumers default long design reasoning to Context unless they already have a local spec/design convention. In this source workspace, `PROJECT_SPEC.md` holds stable Harness workflow rationale. Role procedures belong in Skills and human usage guidance in README. The recommended 40-70 line range is a soft budget, not a validator gate.

The default `context_*` Skills and package-managed utility Skills are generated files. `sync` overwrites them, so project-specific product/design/development/surface-contract rules should live in separate project-local Skills such as `.codex/skills/product_plan/SKILL.md`, `.codex/skills/uiux_design/SKILL.md`, `.codex/skills/development_engineer/SKILL.md` or `.codex/skills/surface_contract/SKILL.md`. When a project-local Skill and a default Skill both apply, agents should use the more specific project-local Skill first while keeping durable conclusions in `project_context/**` and `DESIGN.md`. Keep the project-local Skill front matter `description` triggers aligned with the matching default `context_*` Skill and the project `AGENTS.md` role-trigger rule; if a project adds or narrows product/design/development/surface keywords, update both the local Skill and the agent guidance together. The Surface Contract, Harness upgrade and plan acceptance checklist Skills are also package-managed; customize project semantics in Context or separate project-local Skills, not by editing those generated Skills.

## CLI Entry Safety

The canonical npm package is `project-tiny-context-harness`; `ty-context` is the bin name. Prefer package-qualified `npx` commands for ad hoc use because bare `npx ty-context` can resolve an older package name or a stale local install. After `init`, the managed Makefile wrapper uses the canonical latest CLI by default and can be overridden with `TY_CONTEXT=...` when a project intentionally pins a local package.

Use `npx --no-install ty-context ...` only when you explicitly want the already installed local package, such as release smoke tests against a packed tarball.

## Core Commands

| Command | Purpose |
|---|---|
| `npx --yes --package project-tiny-context-harness@latest ty-context init` | Non-destructively installs Minimal Context Harness into the current project. |
| `make ty-context-sync` or `npx --yes --package project-tiny-context-harness@latest ty-context sync` | Refreshes managed guidance, default Skills, Makefile include, tools and templates. It does not run migrations or generate project semantics; it may block only direct asset-refresh safety issues such as invalid managed blocks or deprecated managed Skill overrides. |
| `make ty-context-upgrade` or `npx --yes --package project-tiny-context-harness@latest ty-context upgrade` | Use for releases marked `upgrade-required` or `manual-required`. Builds an upgrade plan, stops before writes when `blocked` items exist, otherwise applies `safe_pending` migrations, runs `sync` and `doctor`, and exits non-zero when manual follow-up or diagnostics remain. |
| `npx --yes --package project-tiny-context-harness@latest ty-context upgrade --check [--json]` | Checks the upgrade plan without writing files. Reports `safe_pending`, `manual_required` and `blocked`; exits non-zero when any work remains. |
| `npx --yes --package project-tiny-context-harness@latest ty-context export-context --all [--check]` | Creates both default temporary exports under `tmp/ty-context/context-exports/**`. |
| `npx --yes --package project-tiny-context-harness@latest ty-context export-context --full [--output tmp/ty-context/context-exports/name.md] [--check]` | Creates a temporary project Context summary Markdown artifact. |
| `npx --yes --package project-tiny-context-harness@latest ty-context export-context --code [--output tmp/ty-context/context-exports/name.md] [--check]` | Creates a temporary single-file code implementation Markdown artifact. |
| `npx --yes --package project-tiny-context-harness@latest ty-context check-modularity --touched [--limit 300] [--fail-on-warning]` | Reports selected handwritten source files over the physical line-count limit; `--file <path>` and `--base <ref>` select explicit files or branch changes, and config waivers are reported distinctly. |
| `npx --yes --package project-tiny-context-harness@latest ty-context validate-context` | Checks minimum project recovery fields, Context graph metadata, declared paths/roles and fake test-execution claims. |
| `make validate-context` | Makefile wrapper for `validate-context`. |
| `make validate-code-modularity` | Hard gate for touched handwritten source modularity; CI can set `TY_CONTEXT_MODULARITY_BASE=<ref>` to audit PR/base changes. |
| `make validate-harness` | Composite gate for `validate-context` and `validate-code-modularity`. |
| `ty-context package sync-source` | Maintainer-only command to sync source workspace assets into `packages/ty-context/assets/**`. |
| `ty-context package check-source` | Maintainer-only drift check for package canonical assets. |

## Updating Existing Projects

After updating the package, run `ty-context upgrade`. It is the default update entry because it checks local migration state, applies safe migrations when needed, refreshes managed assets and runs diagnostics. For releases marked `sync-only`, direct `sync` is an allowed shortcut only when you explicitly want managed-asset refresh without the upgrade diagnostics.

```sh
npm install -D project-tiny-context-harness@latest
npx --yes --package project-tiny-context-harness@latest ty-context upgrade --check
npx --yes --package project-tiny-context-harness@latest ty-context upgrade
```

For `sync-only` releases where you explicitly want only managed-asset refresh, this shortcut is allowed:

```sh
npx --yes --package project-tiny-context-harness@latest ty-context sync
```

Release notes and release readiness use this update mode vocabulary:

| Update mode | What to run | Meaning |
|---|---|---|
| `sync-only` | Default: `ty-context upgrade`; shortcut: `ty-context sync` | The release changes only package-managed assets. No new migrations are expected. |
| `upgrade-required` | `ty-context upgrade` | The release includes safe mechanical migrations and managed asset refresh. |
| `manual-required` | `ty-context upgrade`, then manual follow-up | The release includes items that cannot be mechanically changed without user intent. |

`upgrade --check` prints the plan without writing files. The plan groups work as:

| Status | Meaning |
|---|---|
| `safe_pending` | The Harness can prove the change is inside a known Harness-owned schema, config or path convention and can apply it mechanically. |
| `manual_required` | The file is in migration scope, but the Harness cannot prove the right semantic role or user intent. It prints the path and follow-up. |
| `blocked` | A safe target cannot be written, usually because the destination already exists or another conflict would require overwriting user content. Blocked items stop upgrade writes until resolved. |

`upgrade` promises to refresh package-managed assets, apply known safe migrations when no blocked target conflict exists, avoid overwriting user custom content, expose manual-required migration scope, and run `doctor` / `validate-context` style diagnostics so remaining problems are visible. It does not automatically understand the user's project semantics, decide every Context role, repair project-local Skills, invent business verification paths, update product/deployment facts or turn an old project into the current best-practice shape.

Examples:

- `project_context/modules/main.md` -> `project_context/areas/main.md` is a safe mechanical migration when the target does not already exist.
- A missing `project_context/context.toml` can receive a conservative baseline manifest.
- `project_context/areas/main/verification.md` can be registered as a `verification` role by path convention.
- `project_context/areas/payment/api.md` without a manifest role is reported as `manual_required`; the Harness does not guess whether it is an area, contract, foundation or implementation index.
- If `project_context/areas/main.md` already exists while `project_context/modules/main.md` still exists, the migration is `blocked`; `upgrade` stops before migrations or `sync`, and no file is overwritten.
- Projects installed before the rename from `sdlc-harness` may contain `package.json#sdlcHarness`, `sdlc-harness.config.json`, `<harnessRoot>/pjsdlc_managed/**`, `sdlc-harness.mk` or `pjsdlc:sdlc-harness` managed markers. `upgrade --check --json` reports these under `legacy-sdlc-harness-rename`; safe cases copy canonical `tyContext` / `ty-context.config.json` and refresh managed paths, while root conflicts, old override skills, unknown old managed content and target conflicts are `manual_required` or `blocked`.

## Minimal Context Files

`project_context/global.md` is the first file a fresh agent should read. It contains:

- project goal
- non-goals / boundaries
- background
- design rationale, including former ADR-level decisions that still matter
- architecture context link
- product / delivery brief for durable product goals, users, flows and acceptance signals
- UX / screen brief for durable screen, interaction, responsive and accessibility facts
- short verification context pointers
- current state
- next safe action
- context index

`project_context/architecture.md` is the restrained architecture document. It contains:

- system boundary
- component map
- data / control flow
- architecture-level design rationale
- constraints and tradeoffs
- verification implications
- open risks

`project_context/context.toml` is the Schema v4 Context graph manifest. `init` creates a default `main` product/domain area for ordinary projects and registers `project_context/areas/main/verification.md` as its default `verification` role Context. `upgrade` creates a conservative baseline manifest for existing projects by registering current `project_context/areas/**/*.md` files as areas, except obvious `verification.md` and `deployment.md` role files. Larger projects can add `[[areas]]` and `[[context]]` entries with role, trigger/read policy, default children and monorepo boundary metadata such as `forbidden_runtime_dependencies`.

`project_context/areas/<unit>.md` contains product/domain ownership context by default. For larger projects, `areas/` may contain nested files such as `areas/<area>/README.md`, `areas/<area>/contracts/*.md`, `areas/<area>/foundation/*.md`, `areas/<area>/verification.md`, `areas/<area>/deployment.md` or other durable context nodes:

- responsibility
- user / system contract
- core data, API or state
- module design capsule when stable principles, design logic or rationale should affect future work
- key constraints
- code entry points
- related role context pointers
- open risks

A module design capsule should stay small and decision-shaped: `Principles` are stable execution constraints, `Design Logic` is the minimum choose/reject/degrade/compose logic, and `Design Rationale` keeps only reasons that change later implementation or verification decisions. Current thresholds, commands and probe parameters belong in the relevant contract or verification Context as execution instances, not as permanent principles.

Additional Markdown context files under `project_context/**` can declare `context_role` in front matter or receive a role from `context.toml`. Roles are semantic labels that help agents choose when and how to read context; `validate-context` checks graph structure, paths and field shapes rather than enforcing a writing template for each role:

- `global`: project-level fact source and reading entry point.
- `architecture`: durable system boundary, component relationship and architecture constraints.
- `area`: a primary product/domain ownership context; ordinary projects usually have one `main` area.
- `domain`: a business-oriented area label for product-family or monorepo contexts.
- `subdomain`: a smaller context unit inside an area.
- `contract`: cross-area or cross-subdomain interface, event, API or schema semantics.
- `foundation`: durable theory, vocabulary or conceptual source material.
- `verification`: critical test, smoke, CI, probe or validation repeat-execution paths for an owning area or cross-domain project path.
- `deployment`: critical deploy, CI/CD, cloud/bootstrap, runtime topology, service initialization, health-check or rollback/degradation repeat-execution paths.
- `archive`: historical or external source index that should not be read by default.
- `implementation-index`: code navigation map for owned paths, responsibilities and tests.
- `decision-rationale`: stable reasons behind durable design choices.

Product Surface Contracts use these existing roles. Use `contract` for cross-surface or cross-area files such as `project_context/areas/product-surface-contracts.md`; use `area` or `subdomain` for owned screen contracts inside one domain; use `verification` for repeatable UI/app/CLI surface checks. Do not add roles such as `surface-contract`, `product-surface`, `web-contract`, `app-contract` or `game-surface`.

`init` gives new projects the Product Surface Contract capability, not a pre-filled business contract. The first durable contract is created when a user or agent explicitly audits/compiles a surface responsibility and writes the approved facts into `project_context/**`. Existing projects receive the same Skill and template after `upgrade`, but `upgrade` intentionally does not inspect current screens or guess their responsibilities; treat Product Surface Context backfill as an explicit follow-up task.

When authoring, migrating or cleaning up `project_context/areas/**`, run a soft role placement scan before registering every Markdown file as an `[[areas]]` entry. Keep `area` / `domain` for product ownership, use `subdomain` only for a smaller owned product context, move interface semantics into `contract`, stable theory or vocabulary into `foundation`, repeatable test/deploy execution paths into `verification` / `deployment`, code maps into `implementation-index`, design reasons into `decision-rationale`, and non-default historical or external material into `archive`. This is prompt-level guidance, not a validator gate.

Automatic migration moves legacy `project_context/modules/**/*.md` files into `project_context/areas/**/*.md`, creates a usable graph baseline and does not infer deep semantic roles. If an existing deep area file is really a foundation, contract, archive or implementation index, a later agent should update `context.toml` explicitly. Boundary rules are metadata only; Harness does not scan source imports or build a runtime dependency graph.

## Temporary Project Exports

Use `export-context --all` when you want both one-off project exports for copying into an external tool or discussion:

```sh
npx --yes --package project-tiny-context-harness@latest ty-context export-context --all
npx --yes --package project-tiny-context-harness@latest ty-context export-context --all --check
```

This generates both default artifacts with the same timestamp: `tmp/ty-context/context-exports/full-project-context-<timestamp>.md` and `tmp/ty-context/context-exports/code-level-implementation-<timestamp>/code-level-implementation.md`. `--all` does not accept `--output`; use the single-artifact commands below for custom names.

Use `export-context --full` when you need only the project Context bundle:

```sh
npx --yes --package project-tiny-context-harness@latest ty-context export-context --full
npx --yes --package project-tiny-context-harness@latest ty-context export-context --full --output tmp/ty-context/context-exports/my-export.md
npx --yes --package project-tiny-context-harness@latest ty-context export-context --full --check
```

The default artifact path is `tmp/ty-context/context-exports/full-project-context-<timestamp>.md`. The file title is `# Full Project Context Export`. The file header says `Export artifact. Do not reference from project_context/context.toml.` The export includes Context files, key README / AGENTS / DESIGN documents, managed Skill guidance, Makefile verification-entry summaries, a directory tree summary and Context code-entry indexes.

Use `export-context --code` when an external model needs the current implementation state in one uploadable Markdown file:

```sh
npx --yes --package project-tiny-context-harness@latest ty-context export-context --code
npx --yes --package project-tiny-context-harness@latest ty-context export-context --code --output tmp/ty-context/context-exports/my-code-export.md
npx --yes --package project-tiny-context-harness@latest ty-context export-context --code --check
```

The default code artifact path is `tmp/ty-context/context-exports/code-level-implementation-<timestamp>/code-level-implementation.md`. The file title is `# Code-Level Implementation Export`. It scans main source and engineering configuration files, adds each file path, type, line count, character count, SHA256, a heuristic one-sentence summary and a fenced redacted code block. It does not split output into multiple Markdown files.

Both export modes exclude `.env*` except safe examples such as `.env.example`, secret/token/cookie-oriented files, raw captures, licensed payload dumps, `node_modules`, build output, caches, coverage, test reports, logs and existing export artifacts; obvious sensitive assignment values are redacted and reported as warnings.

Exports are not long-lived fact sources. The CLI refuses `project_context/**` and non-temporary output paths, and `validate-context` rejects obvious export artifact names such as `code-level-implementation`, `full-project-context`, legacy Chinese export names, `project-overview`, `context-bundle`, `context-summary` or `context-export` if someone tries to register them in `project_context/context.toml`.

The Context should be short enough to read at session start and specific enough to prevent fresh-agent drift. It should not copy code, test logs, release ledgers or implementation narration that the code already makes obvious.

Verification and deployment role Context are narrow exceptions for reusable execution knowledge. Do not record one-off test logs, full command output, temporary JSON, CI artifacts, test reports, release ledgers, secrets, tokens, cookies, device ids or raw payloads. When a test, smoke, CI, deployment, bootstrap or runtime path has durable recovery value, record only the special preparation, shortest command/path, expected stage or signal, acceptable warnings and dead ends already ruled out. Verification paths are reusable execution instances, not independent definitions of capability, metric or acceptance targets; first use the owning module's design Context to decide what claim should be proven, then choose the command or probe. These paths should live in the owning area's `verification` or `deployment` role Context; use project-level references only for truly cross-domain paths.

`project_context/**` is authoritative for intended responsibility, ownership, product intent, architecture boundaries, integration direction, allowed or forbidden dependencies and verification/deployment entry paths. Source code is authoritative for current implementation state. When code shape, keyword search results or nearby implementations disagree with Context, agents should treat the difference as implementation drift, missing work or stale Context that must be called out, not as evidence that overrides Context-declared ownership or intent.

Before the first code edit, agents should classify the change instead of relying on a fixed timer. Long-term fact changes include product ownership or plans, module responsibilities, information architecture, API / Schema, state-machine or scheduler semantics, cross-area boundaries and verification/deployment entry paths. If a task hits one of these categories, Context-first is the default path and the first update should be the relevant `project_context/**` entry with enough durable context to guide implementation, without a fixed line-count limit:

```text
context -> implementation -> verification -> context drift check
```

Code-first is a controlled exception for ordinary bug fixes, local styling changes, local implementation-drift repairs, test fixes and exploratory spikes; those should not update Context unless they produce a durable fact. Once code discovery produces one, the agent should update Context before final alignment or handoff:

```text
implementation discovery -> context update if long-term fact changed -> implementation alignment -> verification
```

This ordering is guidance, not a new validator gate. `validate-context` checks recoverability and fake verification claims; it does not infer whether Context or code was edited first. Automation may warn about possible context-first drift, but should not block work. Handoffs should report only a lightweight status such as `Context: updated ...` or `Context: no durable fact change`.

Product, UI/UX and development engineer Skills are prompts for keeping that Context sharp. They may help draft a product plan, screen design or implementation plan, but the long-lived asset is still the compact Context.

Projects customize these workflows by adding separate project-local Skills, not by editing package-managed default Skills:

```sh
mkdir -p .codex/skills/uiux_design
$EDITOR .codex/skills/uiux_design/SKILL.md
```

The project-local Skill should mention when it supersedes the package-managed default Skill and should either reuse the default Minimal Context workflow or state the narrower project workflow directly. Its front matter `description` should preserve the same role-trigger intent as `AGENTS.md` and the matching default `context_*` Skill, with any project-specific keyword additions reflected in both places. `sync` does not merge Skill overrides and does not overwrite these separate local Skills. Existing `.codex/ty-context-managed/override_skills/*.md` files should be migrated into standalone project-local Skills before running `sync`.

`init` creates root `DESIGN.md` beside Context as the design-system fact source, and `upgrade` creates it for existing Harness projects when missing. It starts as a neutral starter baseline with visual tokens, background/color logic, typography, spacing, component states and do/don't guidance; user-authored design rules take precedence once present. Use `npx @google/design.md lint DESIGN.md` to validate its structure when the file is changed.

Harness installs Impeccable as a default package dependency. For design drafts, redesigns, visual polish, frontend redesign/styling or existing-UI review work, agents should run Impeccable by default when there is a scan target such as UI source, page files, build output or a local/remote URL:

```bash
npx impeccable detect src/
```

Impeccable is a default design-review step when a scan target exists, but it is not a `validate-context` gate. If there is no suitable target or the command cannot run, the agent should say why and continue. Its findings are design-review signals, not a replacement for screenshots, project tests or human review.

## Current Boundary

The former stage-based Harness is no longer shipped as a runnable default, compatibility layer or migration command. Existing users have completed migration, so the package keeps only the current Minimal Context surface.

The design reason is evidence-driven: delivery benchmark pilots showed that full Tiny Context document chains and frequent workflow gates create real time/token friction on ordinary and medium-complexity tasks, while modern agents already handle much of single-stage product/test work internally. The vNext default keeps the part with the clearest expected return: a minimal durable context for recovery, iteration, debug and requirements changes.

## Delivery Benchmark

`examples/delivery-benchmark/` remains repo-local. It is used to test whether Harness changes improve same-quality lifecycle delivery efficiency. Historical stage-based result summaries were removed from the public report; future Harness prompts use Minimal Context and require fresh reruns.

The benchmark should not prove that Harness is always faster. It should find the break-even curve: which complexity, risk and recovery conditions make context maintenance pay back its cost.

Read [Benchmarking And Evidence](docs/benchmarking.md) for the claim boundary and evidence rules. Open the static report at [examples/delivery-benchmark/results/index.html](examples/delivery-benchmark/results/index.html).
