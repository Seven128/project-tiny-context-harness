# Project Tiny Context Harness Project Spec

This document explains the stable product direction, design rationale and package behavior for Project Tiny Context Harness. The public display name is Project Tiny Context Harness; the npm package remains `project-tiny-context-harness` and the CLI remains `sdlc-harness`. User-facing commands live in [README.md](README.md). Historical stage-based workflow details are retained here only as a concise design summary.

## Product Goal

Project Tiny Context Harness helps AI coding agents deliver requirements projects more efficiently by preserving the minimum durable context needed for recovery, iteration, debug and requirement changes.

Efficiency is not first-turn code generation speed. The target is same-quality delivery over a project lifecycle:

- A fresh agent should quickly know what the project is for.
- It should know what not to change.
- It should know where the code and tests are.
- It should know what design choices matter.
- It should know what is currently true.
- It should know what the next safe action is.

## Current Design: Minimal Context Harness

The vNext default is **Minimal Context Harness**.

Default durable facts:

- `project_context/global.md`
- `project_context/architecture.md`
- `project_context/context.toml` as the Schema v4 Context graph manifest
- `project_context/areas/<unit>.md`
- `project_context/areas/<unit>/verification.md` for critical repeat-execution verification paths
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

Benchmark pilots changed the default product judgment:

- The workflow’s fact-source writes, stage decisions, phase transitions and gates are real process cost.
- That cost consumes time and tokens even when the final product quality is the same.
- Modern coding agents have internalized much of the ordinary single-task loop: understanding a compact requirement, choosing a local design, editing code, running tests and repairing simple failures.
- For ordinary and medium-complexity work, forcing a full SDLC document chain duplicates work the model can already do well.

The part that remains clearly valuable is not the ceremony itself. It is durable, compact context that survives a new conversation:

- project goal
- non-goals
- design rationale
- restrained architecture context
- product/domain area responsibilities
- code entry points
- critical repeat-execution verification paths
- current state
- next safe action

Those facts are hard to recover from code or comments alone and expensive to re-explain every time. Source code is the best record of current behavior, and focused comments can clarify local implementation intent, but they do not reliably preserve durable product intent, non-goals, ownership boundaries, architecture constraints, accepted verification paths, or the reason a current implementation shape should not automatically become project intent.

Therefore the current design keeps the product goal unchanged, but narrows the default mechanism:

- preserve the smallest context that helps future agents resume safely;
- keep product-plan, UI/UX and development-engineering prompting as optional Context authoring helpers, not as stage artifacts;
- keep one restrained architecture context for system boundary, component map and durable constraints;
- let code, tests and project-specific probes prove product quality;
- move ADR decisions into Context `Design Rationale` instead of standalone default ADR files;
- move implementation narration into code comments, tests and short module constraints;
- make richer process artifacts and strict gates conditional, not default.

In short: Harness no longer tries to externalize the whole SDLC by default. It maintains the minimum durable context needed for recovery and continuation. The design question is not which human software-engineering phase should own a document; it is what smallest recovery surface lets an agent understand and continue the whole delivery loop without re-creating phase artifacts that the model can already reason through internally.

## Core Terms

The adopted approach uses a small vocabulary so the same mechanism is not described with several competing names:

- **Harness**: the managed guidance, Context templates, default Skills, validators and source-sync checks that shape expected agent behavior. It is not a workflow engine.
- **Context**: durable project facts stored in `project_context/**` or `DESIGN.md` so future agents can recover intent, boundaries and repeat-execution paths. It is not a log or evidence archive.
- **Durable fact**: a fact expected to guide later work, such as product ownership, page responsibility, information architecture, API/Schema, state semantics, cross-domain boundary or verification/deployment path.
- **Workflow contract**: prompt-level order of thought that the agent is expected to follow. It is a soft constraint, not a validator, phase gate or machine-enforced edit-order gate.
- **Context Delta**: the current task's durable-fact decision point inside task-contract scenarios. `required` means Context is updated before implementation continues; `none` means implementation proceeds against existing Context.
- **Task Contract**: a temporary task-local compilation of upstream principles and Context into implementation constraints. It guides the current task, but is not a source of truth.
- **Module Design Capsule**: a compact area or role Context section for stable module principles, minimal design logic and durable rationale that should affect future implementation or verification choices.
- **Temporary plan surface**: `plan.md` or an equivalent scratchpad used only when complex work needs visible execution state. It serves the workflow contract and Context without replacing either.
- **Conformance**: a handoff self-check that compares implementation against the relevant Context and task contract. It produces delivery evidence, not durable Context by itself.
- **Validator / gate**: machine-enforced checks. Minimal Context uses them only for recoverability, generated-asset consistency and fake verification-claim prevention, not for proving product quality or enforcing edit order.

## Harness Mental Model

The user-facing mental model for Minimal Context Harness is: **the Harness is a set of expected agent behavior constraints, not a document workflow**. Installing the Harness should make a user expect that each agent conversation starts from the right facts, respects project intent, uses the right thinking path for the task and leaves behind only durable recovery value.

That model has five layers:

- **Fact-source model**: durable product, architecture, ownership, interface, state and verification/deployment path facts live in `project_context/**` or `DESIGN.md`; code is evidence of current implementation; tests, smoke, CI, review and human acceptance prove product quality; one-off logs, screenshots, task contracts and temporary plans are evidence or scratch space, not durable facts.
- **Authority model**: Context describes what should be true; code describes what is currently true. When they conflict, the agent should name implementation drift, missing work or stale Context instead of silently letting current code redefine product or architecture intent.
- **Workflow-contract model**: the agent follows prompt-level thought order at high-risk moments: read Context, run page/product-positioning or role-placement checks when applicable, compile applicable module design into the task contract, use `Context Delta` inside task-contract scenarios, update Context first when durable facts changed, implement, verify and finish with Conformance / drift checks.
- **Artifact-placement model**: AGENTS is startup routing and hard boundaries; Skills are role-specific thinking frameworks; Context / `DESIGN.md` are long-lived fact sources; `plan.md` or equivalent plan surfaces are temporary execution cache; README is human usage; validators guard recoverability and fake verification claims only.
- **Soft-constraint model**: most Harness behavior is guidance for a probabilistic coding agent, not a deterministic runtime. The design therefore repeats the same intent through small managed surfaces, narrow Skill triggers, Context authority, temporary-plan boundaries, handoff evidence, source-sync tests and a small validator instead of relying on a single heavy gate.

The implementation design follows from how agents actually run. A coding agent does not execute a workflow engine; it reads prompt context, selects relevant instructions, inspects files, uses tools, edits code and summarizes evidence. Harness therefore implements the mental model by placing each constraint at the moment where the agent is most likely to use it:

- `AGENTS.md` carries only the startup facts and hard boundaries that must be visible immediately.
- `project_context/**` carries durable intent because future agents can recover it before reading all code.
- Default Context authoring Skills expand product, UI/UX and engineering reasoning only when explicit role or strong artifact triggers make that extra frame useful.
- Task-contract compilation turns broad principles and applicable module design into task-local constraints before implementation, while `Context Delta` prevents a second durable-fact decision point.
- Temporary plan surfaces can keep the contract visible during long work, but durable facts discovered there must be extracted back to Context.
- Contract Conformance and Context drift checks create a final self-check without storing one-off evidence as long-lived Context.
- `validate-context`, tests and package source checks enforce only the boundaries that are appropriate for Minimal Context: recoverability, generated-asset consistency and absence of fake verification claims.

This mental model is intentionally lighter than the historical stage workflow. Its goal is to make the Harness easy to use and reason about: users do not need to follow a ceremony, but they can predict the behavior the Harness is trying to induce in agents.

## Context Contract

`project_context/global.md` stores the cross-project facts a fresh agent needs:

- project goal
- non-goals / boundaries
- background
- design rationale, including still-relevant ADR decisions
- architecture context link
- product / delivery brief for durable product goals, users, flows and acceptance signals
- UX / screen brief for durable screen, interaction, responsive and accessibility facts
- short verification context pointers
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

- ordinary projects default to one `main` product/domain area rooted at `.` and one area-owned `verification` role Context;
- monorepo or product-family projects can declare multiple `area` / `context_unit` entries for product/domain ownership;
- context nodes can declare role, trigger/read policy, default children and optional boundary metadata;
- `upgrade` creates a conservative baseline manifest for existing projects by registering current area Context files as areas;
- boundary support is metadata validation only, not a replacement for project-specific import/path checks.

`project_context/areas/<unit>.md` stores product/domain ownership facts by default:

- responsibility
- user / system contract
- core data / API / state
- module design capsule when stable module principles, logic or rationale should affect future work
- key constraints
- code entry points
- related role context pointers
- open risks

A Module Design Capsule is deliberately compact:

- `Principles` are stable execution constraints, not a design essay.
- `Design Logic` states the smallest decision logic for choosing, rejecting, degrading or composing module behavior.
- `Design Rationale` keeps only reasons that should change later implementation or verification decisions.
- Current standards, thresholds, commands and probe parameters belong in contract or verification Context as execution instances, not as permanent principles.

Additional `project_context/**` Markdown files can declare `context_role` in front matter or receive a role from `context.toml`:

- Roles are semantic labels for agent reading and authoring behavior.
- `validate-context` checks graph structure, paths and field shapes instead of enforcing a writing template for every role.
- Automatic migration moves legacy `project_context/modules/**/*.md` files into `project_context/areas/**/*.md`.
- Automatic migration does not infer deep semantic roles.
- A later agent should refine the manifest explicitly when a migrated area is really a foundation, contract, archive or implementation index.

Role placement is intentionally a soft authoring scan, not a migration gate. When an agent creates, migrates or cleans up context under `areas/`, it should ask whether each file is a product/domain ownership surface or a read-purpose slice:

- `area` / `domain` for product ownership
- `subdomain` for a smaller owned product context
- `contract` for API / schema / event / cross-domain interface semantics
- `foundation` for stable theory, vocabulary or background material
- `verification` and `deployment` for repeat-execution paths
- `implementation-index` for code navigation
- `decision-rationale` for stable design reasons
- `archive` for non-default historical or external material

This is the missing pressure that prevents conservative migration baselines from leaving every deep file as an area forever.

The Context should be compact and semantically split:

- It should not duplicate code, test logs, release ledgers or implementation narration that the source already exposes.
- Former ADR content is downgraded into `Design Rationale`.
- Implementation documentation is downgraded into code comments, test names and short Context constraints when the code does not make the fact obvious.

Temporary exports are explicit exceptions for external-tool ingestion, not durable Context:

- `export-context --full` emits a one-off project Context summary named `当前项目context-<timestamp>.md` by default.
- `export-context --code` emits a one-off single-file current implementation snapshot named `当前项目代码实现.md` under a timestamped `code-level-implementation-*` directory by default.
- `export-context --all` emits both default artifacts in one command using the same timestamp and does not accept `--output`.
- Both modes must stay under `tmp/sdlc/context-exports/**`, must not be registered in `project_context/context.toml`, and must not revive implementation documents as tracked package defaults.

Area is the product/domain ownership boundary:

- Role Context files are read-purpose slices owned by an area or, only when truly cross-domain, by the project root.
- This keeps product/domain facts separate from the operational knowledge needed to repeat a test, smoke, deploy or bootstrap path.

Verification and deployment role Context are narrow boundary rules for critical repeat-execution knowledge:

- Context should still reject one-off logs, full command output, temporary JSON, CI artifacts, reports, release ledgers and secrets.
- A test, smoke, CI, deployment, bootstrap or runtime path has durable recovery value only when it needs special local setup, runtime environment, external services, bridge inputs, proxy/session state, cloud initialization, service topology or previously expensive exploration.
- When that durable recovery value exists, Context may record only preparation, shortest command/path, expected stage or signal, acceptable warnings and dead ends already ruled out.
- Execution details live in the owning area's `verification` or optional `deployment` role Context.
- Project-level references are for truly cross-domain paths.

Authority is split by fact type:

- `project_context/**` is the authoritative source for intended responsibilities, ownership, product intent, architecture boundaries, integration direction, allowed and forbidden dependencies and verification/deployment entry paths.
- Code remains authoritative for current implementation state.

- If search results or current code shape conflict with Context-declared ownership or intent, agents should identify implementation drift, missing work or stale Context explicitly.
- Agents should not infer the intended module boundary from code shape alone.

This clarification preserves an original SDLC design principle that was easy to weaken during the Minimal Context redesign:

- Removing stage ceremony does not mean implementation should silently decide product or technical intent.
- Context is where durable intent, boundaries and contracts are named because those facts are expensive and unreliable to infer from code alone.
- Code remains the best evidence for current behavior and can expose missing or stale facts.
- Current implementation shape should not automatically become project intent.

Before the first code edit, an agent should classify the change instead of relying on a fixed timer:

- Durable fact changes include product ownership or plans, module responsibilities, information architecture, API / Schema, state-machine or scheduler semantics, cross-area boundaries and verification/deployment entry paths.
- When a task hits one of those categories, the default workflow is context-first.
- The first update should be the relevant `project_context/**` entry with enough durable context to guide implementation, without a fixed line-count limit.

```text
context -> implementation -> verification -> context drift check
```

Web page and front-end layout tasks have an additional lightweight product-positioning check before implementation narrows to a code module, even when the user did not explicitly ask for a product plan or UI/UX design Skill:

- The check is intentionally ordered before the context-first decision.
- It supplies evidence for change classification rather than competing with it.
- The agent should ask what judgment the user needs to make on the page.
- The agent should ask what information/actions/feedback the product must provide.
- The agent should ask what should not be persistent.
- The agent should ask what belongs in downstream consumption, ops, detail or another page.
- The agent should ask whether layout and information density match the page task.
- When ownership is unclear, the agent should inspect the relevant pages and Context before choosing the implementation home.
- Only durable conclusions such as page responsibility, information architecture, persistent-information boundaries or module ownership trigger Context updates.

This raises the weight of product/page principles without creating a PRD/UIUX artifact chain or a validator gate.

This operational order is the **Context Priority Ladder**:

- read Context first
- run the page product-positioning check when applicable
- run the role placement scan when creating or reorganizing Context
- compile applicable module design principles, logic and rationale before choosing implementation or verification paths
- classify whether durable facts changed
- choose context-first or code-first accordingly
- perform a Context drift check before handoff

The ladder is expected agent behavior, but it remains prompt-level guidance rather than an edit-order validator.

This is a **workflow contract**: a soft, prompt-level order of thought that raises the chance that agents apply upstream principles before editing code. It is not a machine-enforced contract, validator, phase gate or required document chain. Its value comes from adding short, explicit thinking points inside the existing loop while keeping durable facts in Context.

For product, UI/UX, system design, architecture-boundary, API/Schema, state/runtime and verification-design tasks, the durable-fact classification is folded into a short current-task contract instead of becoming a second independent checkpoint:

```text
read Context / inspect code / understand request
-> compile applicable module design into the current task contract
   - Context Delta: none|required
   - Applicable Module Design: sources, principles, design logic, rationale and controlled choices
   - Task Contract: implementation constraints for this task
-> update Context first when Context Delta is required
-> implement against the Task Contract
-> Contract Conformance + Context drift check
```

Applicable module design is a short gate inside task-contract compilation: list the source Context / Skill principles, state which current implementation or verification choices they control, name the preferred path and name fallback or degraded paths only with their entry conditions. Commands, probes and current implementation shape are execution evidence; they do not independently define the module target. `Context Delta` is the only formal durable-fact decision point inside contract-compilation scenarios. This avoids asking the agent to classify once, then classify again while compiling the task contract. The task contract is a temporary compiled artifact for the current task, not a new source of truth. If Conformance reveals an implementation miss, the code is fixed; if it reveals an incomplete task contract, the contract is revised; if it reveals a missing durable fact, the agent returns to `Context Delta` and updates Context before continuing.

For long tasks, multi-module work, multi-agent work or changes likely to require several verification loops, `plan.md` or an equivalent temporary plan surface can hold the current task contract, implementation steps and Conformance notes as an execution scratchpad. This use is an aid to the workflow contract, not the workflow contract itself. It helps keep `Context Delta`, `Task Contract` and Conformance visible while work is in flight, but it must not become a long-lived source of truth, a default project asset, a registered Context node, plan state, stage artifact or work-product tree. Durable facts discovered there must be extracted into `project_context/**` or `DESIGN.md`; otherwise the temporary plan is only execution cache.

Code-first remains a controlled exception for ordinary bug fixes, local styling changes, local implementation-drift repairs, test fixes and exploratory spikes:

```text
implementation discovery -> context update if long-term fact changed -> implementation alignment -> verification
```

This is a guidance contract, not a new phase gate:

- `validate-context` still checks Context recoverability and fake verification-result claims.
- `validate-context` does not infer edit order.
- Automation can warn about context-first drift, but must not block work for edit-order reasons.
- Handoffs should report only a lightweight status such as `Context: updated ...` or `Context: no durable fact change`.

The default product planning, UI/UX and development engineer Skills are a thin authoring layer:

- Their trigger descriptions stay narrow.
- Explicit role names or strong artifact names should activate them.
- Generic mentions of product, design or development should not activate them.
- Product, screen-flow and durable engineering conclusions are durable only when compressed into Context.
- Visual identity, design tokens and component styling rules are durable in `DESIGN.md` using Google’s open `@google/design.md` format.

## AGENTS Placement Policy

`AGENTS.md` is the startup router and hard-boundary surface for coding agents, not a full workflow manual or design-spec container. It should stay short enough that a fresh agent can absorb the launch path quickly:

- fact-source entry points
- non-negotiable boundaries
- key triggers
- the shortest validation commands

In this source workspace, `PROJECT_SPEC.md` is the workflow design-spec surface for stable Harness rationale and historical convergence notes. Package consumers should not be pushed to create it by default:

- Their long-lived design reasoning belongs in compact `project_context/**` facts unless they already maintain a local spec/design document by project convention.
- Role-specific procedures and checklists belong in Skills.
- Human package usage belongs in README files.
- Machine-enforceable checks belong in validators or tests only when they match the Minimal Context product boundary.
- New AGENTS guidance should usually compress or replace existing guidance instead of appending another principle.

The 40-70 line target is a soft budget, not a validator or CI gate:

- A hard line-count gate would recreate the kind of process ceremony that Minimal Context intentionally removed.
- The intended control is placement discipline through managed guidance, source Context, and the package authoring Skill.

## Default Context Authoring Skill Design

The default Skills exist because important product, design and engineering reasoning often happens inside one agent conversation, but the next agent cannot recover it reliably from code alone:

- The Skills give the agent a role-specific thinking lens.
- They compress only durable conclusions into Minimal Context or `DESIGN.md`.
- They are not a replacement for project tests, review or human judgment.
- They must not recreate the old PRD / UX / tech-plan document chain.

Shared design rules:

- Use narrow trigger descriptions so ordinary coding, small fixes and package work do not activate role-heavy prompting by accident.
- Preserve the Context Priority Ladder in managed guidance: Context read -> page product-positioning check when applicable -> durable-fact classification or `Context Delta` inside task-contract scenarios -> context-first/code-first choice -> drift check.
- Treat task-contract compilation as a light refactor of that workflow contract for higher-risk product, UI/UX and engineering tasks: `Context Delta` replaces a separate durable-fact classification inside those scenarios, `Task Contract` translates upstream principles into task-local constraints, and `Contract Conformance` checks the result before handoff.
- For module design, API/Schema, state/runtime and verification-design work, require the development engineer Skill to compile `Applicable Module Design` before choosing implementation, claim, command, probe or fallback paths.
- Allow `plan.md` or an equivalent temporary plan surface to assist complex task-contract work as scratch space only; it must serve Context and the workflow contract without becoming either one.
- Elevate lightweight page product-positioning checks into managed AGENTS guidance for Web page, layout and information-placement tasks, and treat the check as input to change classification while keeping the default product/UIUX Skill triggers narrow.
- Keep broad product/UIUX principles as judgment philosophy, then put slightly more concrete reusable prompt questions in the default Skills. Going more specific than that becomes project or business logic and belongs in project Context or project-local Skills.
- Treat high-risk UI categories such as input, selection, search, filters, configuration, scheduling/time, budgets/quotas/limits and feedback states as triggers for thinking, not as a library of fixed control prescriptions.
- Read Context before making durable product, design or engineering judgments; treat `project_context/**` as intended ownership and boundary context, and code as current implementation evidence.
- Keep outputs lightweight: use Context and `DESIGN.md` for durable facts, keep implementation details in code, tests and concise comments when they are self-explanatory there, and keep per-change Context Conformance evidence in handoff / final / PR text rather than Context.
- Keep task contracts out of long-lived Context by default; only their durable `Context Delta` facts are extracted into `project_context/**` or `DESIGN.md`.
- Keep module design capsules short enough for high-frequency reading: principles, design logic and rationale should be precise, stable and decision-shaping; history, current thresholds, commands and one-off evidence belong elsewhere or stay out of Context.
- Treat verification/deployment role Context as reusable repeat-execution knowledge, not evidence reporting: record minimal setup/command-or-path/expected signal/warnings/dead ends, never raw logs, artifacts, release ledgers, secrets or pass/fail claims.
- Prefer separate project-local Skills for consumer customization; package-managed default Skills should remain broadly useful, sync-overwritten and Minimal Context oriented. Project-local Skill front matter `description` trigger keywords should stay aligned with the matching default Skill and project `AGENTS.md` role-trigger rule so activation behavior and SDLC guidance do not diverge.
- When a default Skill changes, update this design section and the relevant source workspace Context so future maintainers know the problem, tradeoff and intended failure mode being addressed.

The product planning Skill exists to prevent product intent, user flows, business rules and acceptance signals from living only in a chat transcript or being inferred from current code shape:

- It helps agents clarify goals, non-goals, users, behavior, edge cases and verification signals.
- It records only durable product conclusions in Context.
- It deliberately avoids becoming a default PRD workflow.
- If a conclusion does not help future recovery, implementation alignment or acceptance reasoning, it should not become long-lived product context.

For product surfaces, the product planning Skill also asks agents to reason from product or page positioning:

- what problem the surface solves
- what the user needs from it
- what content, capabilities and feedback the product should provide
- what belongs on the surface
- where it belongs
- why it deserves persistent attention

This is meant to avoid product plans that prove hierarchy with repeated navigation, low-value titles, implementation explanations, fake data or status noise instead of helping the user act.

That same page-positioning check is now a lightweight pre-implementation habit for ordinary Web page, layout and module-boundary changes:

- The Skill remains the deeper product-planning lens for explicit product requests.
- The Skill is not the only way the principle becomes active.
- The check should not be interpreted as "all UI changes update Context".
- The check only affects Context when it reveals durable product or information-architecture facts.

The control-task framing sits one level below broad principles and one level above business-specific rules:

- Broad statements such as "understand the user's task, information density and feedback" remain valuable as a thinking philosophy.
- Those broad statements are too abstract to reliably wake up an implementation agent editing a form or configuration page.
- The default product/UIUX/development Skills therefore make that philosophy a little more concrete by asking what task the control serves, what kind of data it accepts, what feedback confirms correctness, whether units/ranges/defaults/risks/costs are needed, whether visible language is user-facing or backend-shaped, and whether free-form input has acceptable validation cost.
- The Skills intentionally stop there.
- Concrete answers such as which fields require which ranges, which search mode is acceptable, or which schedule format is stable are durable project facts for Context or project-local Skills.
- Proof that one change satisfied those facts is handoff evidence, not Context.

The UI/UX design Skill exists because interface work carries visual identity, interaction, accessibility and responsive-design intent that source code alone often exposes poorly:

- It writes durable screen-flow and interaction facts to Context.
- It keeps visual identity and design-system tokens in `DESIGN.md`.
- It uses Impeccable as a review signal when a scan target exists.
- Its design goal is to reduce common AI UI failures such as generic visual registers, disconnected styling, inaccessible states, weak responsive behavior and decorative redesign churn.
- It avoids requiring a standalone UI/UX document chain.

The UI/UX Skill's visual-quality calibration includes product-positioning, information-density, attention-allocation and control-interaction prompts rather than fixed layout or widget prescriptions:

- Persistent text, whitespace, chrome, cards and repeated headers should be justified by user value.
- Familiar actions may use icon-only controls when that best reduces attention cost and accessibility labels and hover/focus explanations are preserved.
- True empty/error/loading states should replace fixture-like fallback rows.
- Layout stability is treated as a UX contract.
- The intent is not to make every interface sparse or every search/time/budget control follow one pattern.
- The intent is to choose the presentation that best supports the user's need with the least avoidable attention cost.

The development engineer Skill exists to keep technical intent recoverable when work changes implementation strategy, module responsibilities, architecture boundaries, data contracts, state semantics or verification/deployment repeat-execution paths:

- It asks agents to compare Context expectation with current code evidence before proposing durable changes.
- It raises module design principles, design logic and durable rationale into a short `Applicable Module Design` gate before selecting implementation or verification paths.
- For UI surfaces, it explicitly checks whether the code is merely exposing fields or satisfying the page/control contract described by Context and the product/UIUX framing.
- Its trigger list includes explicit subagent orchestration terms such as `多开agent` and `subagent`.
- When the user has explicitly allowed that capability and the tools exist, the Skill should encourage parallel decomposition while reusing existing agents first and closing completed, idle or no-longer-needed agents with `close_agent`.
- This is a resource lifecycle constraint, not permission to bypass the user's explicit subagent trigger.
- Its abstraction / decomposition scan is specifically meant to reduce AI failure modes such as over-abstracting for visual cleanliness, treating syntactic duplication as semantic sameness, splitting files without reducing coupling, or optimizing locally against the recorded architecture.
- The scan also treats cross-Context, cross-domain or cross-layer changes required for one object or capability as a boundary-review signal: agents should evaluate whether a product capability, module, service, facade or stable interface can shrink future change scope before introducing hand-maintained manifests that duplicate implementation surfaces.
- It should default to stable, high-value, low-risk changes and leave speculative architecture for explicit user direction or stronger project evidence.

## Package Behavior

`init` creates Minimal Context assets and managed guidance:

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
- `<harnessRoot>/pjsdlc_managed/context_templates/**`
- `<harnessRoot>/pjsdlc_managed/make/sdlc-harness.mk`
- `tools/**`
- `.github/workflows/harness.yml` when absent or managed

The package-managed `.github/workflows/harness.yml` is a consumer project workflow. It installs the Node runtime required by the Harness CLI and runs the selected `validate-context` / `validate-harness` Make target. Maintainer-only checks for this source repository, such as `npm test --workspace project-tiny-context-harness` and package source-drift checks, must live in separate source-repository CI and must not be copied into consumer projects.

`init` does not create `.work_products/**`, lifecycle state, plan state, stage skills, stage templates or stage policies by default.

`sync` refreshes managed assets only. It never generates project semantics.

Product, UI/UX and development engineer Skill customization lives in separate project-local Skills:

- `<harnessRoot>/skills/product_plan/SKILL.md`
- `<harnessRoot>/skills/uiux_design/SKILL.md`
- `<harnessRoot>/skills/development_engineer/SKILL.md`

The customization behavior is:

- `sync` overwrites package-managed default `context_*` Skills from package assets.
- `sync` does not merge Skill overrides.
- `sync` leaves separate project-local Skills untouched.
- When both apply, the more specific project-local Skill should supersede the default Skill while keeping durable conclusions in Minimal Context.
- Project-local Skill front matter `description` trigger keywords should be maintained together with project `AGENTS.md` role-trigger guidance and the default `context_*` trigger intent.

`upgrade` runs safe migrations and `sync`. The old semantic migration command has been removed because user migrations are complete.

`validate-context` checks that Context has the minimum recovery fields and does not fake product verification evidence. It does not replace project tests.

The canonical npm package is `project-tiny-context-harness`; `sdlc-harness` is the bin name:

- Public commands and managed Makefile wrappers prefer `npx --yes --package project-tiny-context-harness@latest sdlc-harness` for ad hoc use.
- This avoids bare `npx sdlc-harness` resolving a legacy package name or stale local binary.
- Current CLI commands guard unsupported future schema major versions before applying v4 assumptions.
- Write commands fail before modifying files.

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

The implementation was broad:

- Each lifecycle phase owned a role prompt, allowed paths, required gates and work-product templates.
- Development tracked current tasks in plan state.
- Phase changes used transition helpers.
- Validators checked PRD / UX / design / implementation / review / test / release / RFC completeness.
- Generated overviews tried to make large document trees easier to browse.

The cost was also broad:

- Agents spent time reading phase state, deciding allowed actions, writing durable artifacts, refreshing generated views and running gates.
- Benchmark pilots showed this overhead remained even when final product quality matched direct coding.

## Benchmark Findings And Convergence Reason

Delivery benchmark work exposed an important cost signal:

- Full document chains and frequent workflow gates add real time and token friction.
- On ordinary and medium-complexity projects, modern coding agents already internalize much of the single-stage product/design/test behavior that the stage Harness tried to force through default artifacts.

Observed implication:

- stages, gate checks and fact-source writes are objective workflow friction and cannot be erased entirely;
- the clearest remaining value is faster context recovery for future iteration, debug and requirement changes;
- the highest-leverage durable fact source is likely a small Project / Delivery Context, not a full SDLC document chain;
- full gates and rich process artifacts should be conditional, not default.

Therefore the canonical product direction changed: preserve minimal durable context, leave product quality to project-specific validation, and use benchmark work to find the break-even curve where extra workflow structure pays back.

## Design Principles

- Minimal durable facts beat broad default ceremonies.
- Context is for recovery and safe continuation, not for duplicating source code.
- Harness should not claim product quality; it should point agents to verification/deployment repeat-execution paths.
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

Old stage-based source assets, state files and work-product trees are removed from the current implementation. The durable information kept from that era is this spec summary:

- what the stage Harness tried to do
- how it was implemented
- what benchmark work found
- why the product converged to Minimal Context

Future design changes should keep the same discipline: preserve the reasoning that affects current behavior, but avoid recreating large default document chains unless measured evidence shows they pay back their cost.
