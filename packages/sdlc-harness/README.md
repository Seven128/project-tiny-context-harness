# AI SDLC Harness

`agent-project-sdlc` ships the `sdlc-harness` CLI and canonical managed assets for AI-assisted software delivery.

The vNext default is **Minimal Context Harness**. It maintains a compact `project_context/**` fact source so fresh agents can recover project intent, constraints, verification entry points and next safe actions quickly. It does not default to lifecycle phases, plan tasks, stage skills, stage documents or phase gates.

Harness maintains context quality. Your project tests, CI, review process and human acceptance remain responsible for product quality.

## Install

```sh
npm install -D agent-project-sdlc@latest
npx --yes --package agent-project-sdlc@latest sdlc-harness init
```

For existing projects:

```sh
npx --yes --package agent-project-sdlc@latest sdlc-harness init --adopt
```

`init` creates `project_context/context.toml`, `project_context/global.md`, `project_context/architecture.md`, `project_context/areas/main.md`, agent guidance, three Context authoring Skills, managed templates/tools and a Makefile include. It does not create stage work-product trees, lifecycle state or stage skills by default.

## CLI Entry Safety

The canonical npm package is `agent-project-sdlc`; `sdlc-harness` is the bin name. Prefer package-qualified `npx` commands for ad hoc use because bare `npx sdlc-harness` can resolve an older package name or a stale local install. After `init`, the managed Makefile wrapper uses the canonical latest CLI by default and can be overridden with `SDLC_HARNESS=...` when a project intentionally pins a local package.

Use `npx --no-install sdlc-harness ...` only when you explicitly want the already installed local package, such as release smoke tests against a packed tarball.

## Capabilities

| Capability | Entry Point | Description |
|---|---|---|
| Project initialization | `npx --yes --package agent-project-sdlc@latest sdlc-harness init` | Creates `project_context/context.toml`, `project_context/global.md`, `project_context/architecture.md`, `project_context/areas/main.md`, `AGENTS.md`, minimal managed assets and a Makefile include. |
| Existing project adoption | `npx --yes --package agent-project-sdlc@latest sdlc-harness init --adopt` | Adds Minimal Context Harness non-destructively to an existing repository. |
| Configurable Harness root | `--harness-folder`, `package.json#sdlcHarness.harnessFolderName`, `sdlc-harness.config.json` | Supports Codex `.codex`, Claude `.claude`, Cursor `.cursor`, Cline `.cline`, Roo `.roo`, Gemini `.gemini` or a custom folder. |
| Product planning Skill | `<harnessRoot>/skills/context_product_plan/SKILL.md` | Triggers on “产品方案 / 产品经理 / 产品专家” style requests and writes durable product conclusions to `project_context/**`. |
| UI/UX design Skill | `<harnessRoot>/skills/context_uiux_design/SKILL.md` | Triggers on “设计稿 / UI/UX 设计方案 / 视觉专家” style requests, writes screen/interaction conclusions to `project_context/**`, updates root `DESIGN.md` visual tokens with Google `@google/design.md`, and includes compact visual-quality calibration for product/page positioning, user needs, information density, brand/product UI and common AI-design anti-patterns. |
| Development engineer Skill | `<harnessRoot>/skills/context_development_engineer/SKILL.md` | Triggers on “开发工程师 / 技术方案 / 开发方案 / 实现 / 实现方案 / 实施计划 / 技术专家 / 多开agent / subagent” style requests and writes durable engineering conclusions to `project_context/**`. |
| Project-local Skills | `<harnessRoot>/skills/<role>/SKILL.md` | Optional local product/design/development Skills created by the project, such as `product_plan`, `uiux_design` or `development_engineer`. They supersede package-managed default Skills when more specific, are not overwritten by `sync`, and should keep front matter trigger keywords aligned with the project `AGENTS.md` role-trigger rule. |
| Managed file sync | `make sdlc-sync` or `npx --yes --package agent-project-sdlc@latest sdlc-harness sync` | Refreshes package-managed guidance, default Skills, Makefile include, context templates, tools and workflow YAML. It does not perform semantic Context generation. |
| Upgrade | `make sdlc-upgrade` or `npx --yes --package agent-project-sdlc@latest sdlc-harness upgrade` | Runs safe migrations and `sync`, including Schema v4 Context graph manifest creation when missing. |
| Context validation | `npx --yes --package agent-project-sdlc@latest sdlc-harness validate-context`, `make validate-context` | Checks required project recovery fields, Context graph metadata, declared paths/roles and fake test-execution claims. |
| Diagnostics | `make sdlc-doctor` or `npx --yes --package agent-project-sdlc@latest sdlc-harness doctor` | Reports Harness root, package version, schema version and required Minimal Context paths. |
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
- context index

`project_context/architecture.md` should contain restrained architecture facts:

- system boundary
- component map
- data / control flow
- design rationale
- constraints and tradeoffs
- verification implications
- open risks

`project_context/context.toml` is the Schema v4 Context graph manifest. `init` creates a default `main` area for ordinary projects, and `upgrade` creates a baseline manifest for existing projects by registering current `project_context/areas/**/*.md` files as areas. Larger projects can add `[[areas]]` and `[[context]]` entries with role, trigger/read policy, default children and monorepo boundary metadata such as `forbidden_runtime_dependencies`.

`project_context/areas/<unit>.md` should contain area, domain or subdomain context by default. Complex projects can freely nest context nodes under `areas/`, such as `areas/<area>/README.md`, `areas/<area>/contracts/*.md`, `areas/<area>/foundation/*.md` or other durable context files:

- responsibility
- user / system contract
- core data / API / state
- key constraints
- code entry points
- test entry points
- open risks

Other context files under `project_context/**` can declare `context_role` in front matter or receive a role from `context.toml`. Roles are semantic labels for agent reading and authoring behavior; `validate-context` checks graph structure, paths and field shapes instead of enforcing a writing template for every role. Supported roles are `global`, `architecture`, `area`, `domain`, `subdomain`, `contract`, `foundation`, `archive`, `implementation-index` and `decision-rationale`.

Automatic migration moves legacy `project_context/modules/**/*.md` files into `project_context/areas/**/*.md`, creates a usable graph baseline and does not infer deep semantic roles. If an existing deep area file is really a foundation, contract, archive or implementation index, a later agent should update `context.toml` explicitly. Boundary rules are metadata only; Harness does not scan source imports or build a runtime dependency graph.

The Context should be dense, durable and short. Former ADR content belongs in `Design Rationale` when it still affects future changes. Implementation details that are obvious from code should stay in code and tests; only non-obvious constraints belong in Context.

Verification Path Context is allowed only when a test, smoke or verification path has durable recovery value. Record minimal preparation, the shortest command, expected stage or signal, acceptable warnings and dead ends already ruled out. Do not record one-off logs, full output, temporary JSON, CI artifacts, reports, secrets, tokens, cookies, device ids or raw payloads. Put project defaults in `project_context/global.md#Verification Entry Points`, module paths in the owner `Test Entry Points`, and cross-module smoke with the primary owner.

`project_context/**` is authoritative for intended responsibility, ownership, product intent, architecture boundaries, integration direction, allowed or forbidden dependencies and verification entry points. Source code is authoritative for current implementation state. If code shape, keyword search results or nearby implementations disagree with Context, agents should call out implementation drift, missing work or stale Context instead of overriding Context-declared ownership or intent.

Before the first code edit, agents should classify the change instead of relying on a fixed timer. Long-term fact changes include product ownership or plans, module responsibilities, information architecture, API / Schema, state-machine or scheduler semantics, cross-area boundaries and verification entry points. If a task hits one of these categories, Context-first is the default path and the first update should be the relevant `project_context/**` entry with enough durable context to guide implementation, without a fixed line-count limit:

```text
context -> implementation -> verification -> context drift check
```

Code-first is a controlled exception for ordinary bug fixes, local styling changes, local implementation-drift repairs, test fixes and exploratory spikes; those should not update Context unless they produce a durable fact. Once code discovery produces one, the agent should update Context before final alignment or handoff:

```text
implementation discovery -> context update if long-term fact changed -> implementation alignment -> verification
```

This ordering is guidance, not a new validator gate. `validate-context` checks recoverability and fake verification claims; it does not infer whether Context or code was edited first. Automation may warn about possible context-first drift, but should not block work. Handoffs should report only a lightweight status such as `Context: updated ...` or `Context: no durable fact change`.

The product planning, UI/UX and development engineer Skills are Context authoring helpers. They may shape product plans, screen flows, design handoff, implementation plans or technical decisions, but they do not create a default PRD/UIUX/tech-plan document chain. Their descriptions intentionally avoid broad generic triggers such as “产品”, “设计” or “开发” alone. For visual systems, `init` creates root `DESIGN.md` as the durable source for colors, typography, spacing, shapes and component tokens; `upgrade` creates it for existing Harness projects when missing. The generated file starts as a neutral starter baseline with visual tokens, background/color logic, typography, spacing, component states and do/don't guidance; user-authored design rules take precedence once present. Validate it with `npx @google/design.md lint DESIGN.md`. The product/design Skills keep compact calibration for product/page positioning, user needs, information density, content/action placement, true empty/error/loading states, layout stability, register choice, design-system continuity and common AI-design anti-patterns.

Harness installs Impeccable as a default package dependency. For design drafts, redesigns, visual polish, frontend redesign/styling or existing-UI review work, agents should run Impeccable by default when there is a scan target such as UI source, page files, build output or a local/remote URL:

```bash
npx impeccable detect src/
```

Impeccable is a default design-review step when a scan target exists, but it is not a `validate-context` gate. If there is no suitable target or the command cannot run, the agent should say why and continue. Its findings are design-review signals, not a replacement for screenshots, project tests or human review.

Project-specific Skill rules can be added as separate project-local Skills. Do not edit package-managed `context_*` Skills directly; `sync` overwrites them:

```sh
mkdir -p <harnessRoot>/skills/uiux_design
$EDITOR <harnessRoot>/skills/uiux_design/SKILL.md
```

When a project-local Skill and a package-managed default Skill both apply, agents should use the more specific project-local Skill first. The local Skill should keep durable conclusions in `project_context/**` and `DESIGN.md`. Its front matter `description` should stay aligned with the matching default `context_*` Skill and the project `AGENTS.md` role-trigger rule; update both the local Skill and agent guidance when adding or narrowing product/design/development trigger terms. `sync` does not merge Skill overrides and does not overwrite separate project-local Skills. Existing `<harnessRoot>/pjsdlc_managed/override_skills/*.md` files should be migrated into standalone project-local Skills before running `sync`.

## Sync And Upgrade Boundary

`sync` is intentionally narrow. It refreshes managed files and never generates project semantics.

`upgrade` performs safe package migrations and `sync`. The former migration command has been removed because existing users have completed migration.

## Common Commands

```sh
npx --yes --package agent-project-sdlc@latest sdlc-harness init
npx --yes --package agent-project-sdlc@latest sdlc-harness init --adopt
make sdlc-sync
make sdlc-upgrade
npx --yes --package agent-project-sdlc@latest sdlc-harness validate-context
npx --yes --package agent-project-sdlc@latest sdlc-harness doctor
make sdlc-doctor
make validate-context
make validate-harness
```

`make validate-harness` is a compatibility alias for `validate-context` in vNext projects.

## Current Boundary

The former stage-based SDLC Harness is no longer shipped as a runnable default, compatibility layer or migration command.

The package direction is now smaller: keep the minimum durable facts that help agents recover context and continue safely.
