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

Verification Path Context is a narrow boundary rule for complex real-chain validation. Context should still reject one-off logs, full command output, temporary JSON, CI artifacts, reports and secrets. When a test, smoke or verification path has durable recovery value because it needs special local setup, runtime environment, external services, bridge inputs, proxy/session state, or previously expensive exploration, Context may record only preparation, shortest command, expected stage or signal, acceptable warnings and dead ends already ruled out. Project defaults live in `global.md#Verification Entry Points`; module paths live in the owner area `Test Entry Points`; cross-module smoke is owned once and referenced briefly elsewhere.

`project_context/**` is the authoritative source for intended responsibilities, ownership, product intent, architecture boundaries, integration direction, allowed and forbidden dependencies and verification entry points. Code remains authoritative for current implementation state. If search results or current code shape conflict with Context-declared ownership or intent, agents should identify implementation drift, missing work or stale Context explicitly instead of inferring the intended module boundary from the code shape alone.

This clarification preserves an original SDLC design principle that was easy to weaken during the Minimal Context redesign: removing stage ceremony does not mean implementation should silently decide product or technical intent. Context is where durable intent, boundaries and contracts are named because those facts are expensive and unreliable to infer from code alone. Code remains the best evidence for current behavior and can expose missing or stale facts, but current implementation shape should not automatically become project intent.

Before the first code edit, an agent should classify the change instead of relying on a fixed timer. Durable fact changes include product ownership or plans, module responsibilities, information architecture, API / Schema, state-machine or scheduler semantics, cross-area boundaries and verification entry points. When a task hits one of those categories, the default workflow is context-first and the first update should be the relevant `project_context/**` entry with enough durable context to guide implementation, without a fixed line-count limit:

```text
context -> implementation -> verification -> context drift check
```

Web page and front-end layout tasks have an additional lightweight product-positioning check before implementation narrows to a code module, even when the user did not explicitly ask for a product plan or UI/UX design Skill. The check is intentionally ordered before the context-first decision: it supplies evidence for change classification rather than competing with it. The agent should ask what judgment the user needs to make on the page, what information/actions/feedback the product must provide, what should not be persistent, what belongs in downstream consumption, ops, detail or another page, and whether layout and information density match the page task. When ownership is unclear, the agent should inspect the relevant pages and Context before choosing the implementation home. Only durable conclusions such as page responsibility, information architecture, persistent-information boundaries or module ownership trigger Context updates. This raises the weight of product/page principles without creating a PRD/UIUX artifact chain or a validator gate.

This operational order is the **Context Priority Ladder**: read Context first, run the page product-positioning check when applicable, classify whether durable facts changed, choose context-first or code-first accordingly, then perform a Context drift check before handoff. The ladder is expected agent behavior, but it remains prompt-level guidance rather than an edit-order validator.

Code-first remains a controlled exception for ordinary bug fixes, local styling changes, local implementation-drift repairs, test fixes and exploratory spikes:

```text
implementation discovery -> context update if long-term fact changed -> implementation alignment -> verification
```

This is a guidance contract, not a new phase gate. `validate-context` still checks Context recoverability and fake verification-result claims; it does not infer edit order. Automation can warn about context-first drift, but must not block work for edit-order reasons. Handoffs should report only a lightweight status such as `Context: updated ...` or `Context: no durable fact change`.

The default product planning, UI/UX and development engineer Skills are a thin authoring layer. Their trigger descriptions stay narrow: explicit role names or strong artifact names should activate them, while generic mentions of product, design or development should not. Product, screen-flow and durable engineering conclusions are durable only when compressed into Context. Visual identity, design tokens and component styling rules are durable in `DESIGN.md` using Google’s open `@google/design.md` format.

## AGENTS Placement Policy

`AGENTS.md` is the startup router and hard-boundary surface for coding agents, not a full workflow manual or design-spec container. It should stay short enough that a fresh agent can absorb the launch path quickly: fact-source entry points, non-negotiable boundaries, key triggers, and the shortest validation commands belong there.

In this source workspace, `PROJECT_SPEC.md` is the workflow design-spec surface for stable Harness rationale and historical convergence notes. Package consumers should not be pushed to create it by default: their long-lived design reasoning belongs in compact `project_context/**` facts unless they already maintain a local spec/design document by project convention. Role-specific procedures and checklists belong in Skills, human package usage belongs in README files, and machine-enforceable checks belong in validators or tests only when they match the Minimal Context product boundary. New AGENTS guidance should usually compress or replace existing guidance instead of appending another principle.

The 40-70 line target is a soft budget, not a validator or CI gate. A hard line-count gate would recreate the kind of process ceremony that Minimal Context intentionally removed; the intended control is placement discipline through managed guidance, source Context, and the package authoring Skill.

## Default Context Authoring Skill Design

The default Skills exist because important product, design and engineering reasoning often happens inside one agent conversation, but the next agent cannot recover it reliably from code alone. The Skills give the agent a role-specific thinking lens, then compress only durable conclusions into Minimal Context or `DESIGN.md`. They are not a replacement for project tests, review or human judgment, and they must not recreate the old PRD / UX / tech-plan document chain.

Shared design rules:

- Use narrow trigger descriptions so ordinary coding, small fixes and package work do not activate role-heavy prompting by accident.
- Preserve the Context Priority Ladder in managed guidance: Context read -> page product-positioning check when applicable -> durable-fact classification -> context-first/code-first choice -> drift check.
- Elevate lightweight page product-positioning checks into managed AGENTS guidance for Web page, layout and information-placement tasks, and treat the check as input to change classification while keeping the default product/UIUX Skill triggers narrow.
- Read Context before making durable product, design or engineering judgments; treat `project_context/**` as intended ownership and boundary context, and code as current implementation evidence.
- Keep outputs lightweight: use Context and `DESIGN.md` for durable facts, and keep implementation details in code, tests and concise comments when they are self-explanatory there.
- Treat Verification Path Context as reusable recovery knowledge, not evidence reporting: record minimal setup/command/expected signal/warnings/dead ends, never raw logs, artifacts, secrets or pass/fail claims.
- Prefer separate project-local Skills for consumer customization; package-managed default Skills should remain broadly useful, sync-overwritten and Minimal Context oriented. Project-local Skill front matter `description` trigger keywords should stay aligned with the matching default Skill and project `AGENTS.md` role-trigger rule so activation behavior and SDLC guidance do not diverge.
- When a default Skill changes, update this design section and the relevant source workspace Context so future maintainers know the problem, tradeoff and intended failure mode being addressed.

The product planning Skill exists to prevent product intent, user flows, business rules and acceptance signals from living only in a chat transcript or being inferred from current code shape. It helps agents clarify goals, non-goals, users, behavior, edge cases and verification signals, then records only durable product conclusions in Context. It deliberately avoids becoming a default PRD workflow: if a conclusion does not help future recovery, implementation alignment or acceptance reasoning, it should not become long-lived product context.

For product surfaces, the product planning Skill also asks agents to reason from the product or page positioning: what problem it solves, what the user needs from it, what content, capabilities and feedback the product should provide, what belongs on the surface, where it belongs and why it deserves persistent attention. This is meant to avoid product plans that prove hierarchy with repeated navigation, low-value titles, implementation explanations, fake data or status noise instead of helping the user act.

That same page-positioning check is now a lightweight pre-implementation habit for ordinary Web page, layout and module-boundary changes. The Skill remains the deeper product-planning lens for explicit product requests, not the only way the principle becomes active. The check should not be interpreted as "all UI changes update Context"; it only affects Context when it reveals durable product or information-architecture facts.

The UI/UX design Skill exists because interface work carries visual identity, interaction, accessibility and responsive-design intent that source code alone often exposes poorly. It writes durable screen-flow and interaction facts to Context, keeps visual identity and design-system tokens in `DESIGN.md`, and uses Impeccable as a review signal when a scan target exists. Its design goal is to reduce common AI UI failures such as generic visual registers, disconnected styling, inaccessible states, weak responsive behavior and decorative redesign churn, without requiring a standalone UI/UX document chain.

The UI/UX Skill's visual-quality calibration includes product-positioning, information-density and attention-allocation prompts rather than fixed layout prescriptions: persistent text, whitespace, chrome, cards and repeated headers should be justified by user value; familiar actions may use icon-only controls when that best reduces attention cost and accessibility labels and hover/focus explanations are preserved; true empty/error/loading states should replace fixture-like fallback rows; and layout stability is treated as a UX contract. The intent is not to make every interface sparse, but to choose the presentation that best supports the user's need with the least avoidable attention cost.

The development engineer Skill exists to keep technical intent recoverable when work changes implementation strategy, module responsibilities, architecture boundaries, data contracts, state semantics or verification entry points. It asks agents to compare Context expectation with current code evidence before proposing durable changes. Its trigger list includes explicit subagent orchestration terms such as `多开agent` and `subagent`; when the user has explicitly allowed that capability and the tools exist, the Skill should encourage parallel decomposition while reusing existing agents first and closing completed, idle or no-longer-needed agents with `close_agent`. This is a resource lifecycle constraint, not permission to bypass the user's explicit subagent trigger. Its abstraction / decomposition scan is specifically meant to reduce AI failure modes such as over-abstracting for visual cleanliness, treating syntactic duplication as semantic sameness, splitting files without reducing coupling, or optimizing locally against the recorded architecture. It should default to stable, high-value, low-risk changes and leave speculative architecture for explicit user direction or stronger project evidence.

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
- `<harnessRoot>/pjsdlc_managed/context_templates/**`
- `<harnessRoot>/pjsdlc_managed/make/sdlc-harness.mk`
- `tools/**`
- `.github/workflows/harness.yml` when absent or managed

`init` does not create `.work_products/**`, lifecycle state, plan state, stage skills, stage templates or stage policies by default.

`sync` refreshes managed assets only. It never generates project semantics.

Product, UI/UX and development engineer Skill customization lives in separate project-local Skills under paths such as `<harnessRoot>/skills/product_plan/SKILL.md`, `<harnessRoot>/skills/uiux_design/SKILL.md` and `<harnessRoot>/skills/development_engineer/SKILL.md`. `sync` overwrites package-managed default `context_*` Skills from package assets, does not merge Skill overrides, and leaves separate project-local Skills untouched. When both apply, the more specific project-local Skill should supersede the default Skill while keeping durable conclusions in Minimal Context. Project-local Skill front matter `description` trigger keywords should be maintained together with project `AGENTS.md` role-trigger guidance and the default `context_*` trigger intent.

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
