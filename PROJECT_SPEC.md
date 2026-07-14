# Project Tiny Context Harness Project Spec

This document explains the stable product direction, design rationale and package behavior for Project Tiny Context Harness. The public display name is Project Tiny Context Harness; the npm package remains `project-tiny-context-harness` and the CLI remains `ty-context`. User-facing commands live in [README.md](README.md). Historical stage-based workflow details are retained here only as a concise design summary.

## Product Goal

Project Tiny Context Harness helps AI coding agents deliver requirements projects more efficiently by preserving the minimum durable context and priority workflow needed for recovery, iteration, debug and requirement changes.

The product is not just a place to store project memory. It is a repo-native context contract: compact durable facts plus explicit read order, fact-source authority, context-first/code-first decision rules and drift checks so agents keep Context, implementation and verification evidence aligned.

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

## Current Best Practice

Short-running tasks use the workflow contract plus Context layer directly:

```text
workflow contract + Context layer -> implementation -> verification -> drift check
```

Long-running tasks need an externalized acceptance target before implementation:

```text
Web GPT or external planning model produces long-task source inputs
-> ordinary long-task Skill (`/normal-long-task`) can produce the full checklist and optional generic target-mode prompt when needed
-> explicit Composite Long-Task Preparation Skill (`/prepare-composite-long-task`) can preserve a discussed multi-SFC plan as one complete Campaign V5 graph, use Codex App Server to author/execute one persistent thread per SFC, schedule isolated worktree Goals and drive integration/finalization
-> Composite Long-Task Workflow Skill (`/composite-long-task-workflow`) compiles Product / Architecture Source + Technical Realization Plan + Acceptance Checklist into one immutable machine contract
-> the agent implements freely and repeatedly invokes the trusted verifier
-> final gate reruns every in-scope AC against the current workspace and recomputes Obligation, PI and Requirement results
-> the project-level Codex Stop Hook permits exit only while the latest accepted result still matches the workspace
```

Campaign orchestration and Slice execution remain distinct authorities. `/prepare-composite-long-task` owns immutable plan/Source Unit coverage, one maximal-cohesion Scope Fit V4 DAG, just-in-time App Server authoring and same-thread Goal execution for every dependency-ready `SFC-###`, positive-evidence wave scheduling, worktree/Goal recovery, deterministic repair, Wave Integration Gates, one-snapshot Campaign Final Gate and target finalization. `/composite-long-task-workflow` consumes one Slice's three inputs without inferring or repairing missing product, plan, acceptance or oracle meaning.

The design target is not to prevent the model from ever drifting during implementation. That cannot be guaranteed by workflow text. The target is to prevent delivery drift: the compiler detects missing coverage before implementation, intermediate verification exposes drift with machine findings, final gate recomputes every declared claim against the current workspace, and Stop Hook prevents an unaccepted or stale result from being reported as complete.

Each Slice has three mandatory safety operations: contract compilation prevents omitted or unverifiable requirements and freezes authority hashes; Slice final full recomputation prevents stale, partial and historical evidence; Codex Stop freshness enforcement prevents a model completion claim from bypassing the Slice gate. Targeted `verify` is an optional repair accelerator and never an acceptance operation. Campaign V5 adds only composition/host operations that close named risks: Scope Fit V4 prevents semantic over-splitting, exact catalog-bounded routing prevents guessed model downgrades, persisted App Server identities prevent duplicate/lost work, conservative scheduling prevents unsafe parallelism, Integration Gates catch merged-wave regressions, and one-snapshot Campaign Final Gate plus target resynchronization prevents historical Slice results from masquerading as final delivery. Generic epoch/progress-ledger/local-audit/review/TDD/matrix/verdict/final-card processes are not package responsibilities.

Completion follows a strict separation of authority. The discussed plan/source coverage and stable Campaign graph define total scope; each frozen three-input contract and Context define its complete Requirement/PI/Obligation/Binding/AC/Proof/Spec/Counterfactual graph. A pinned compiler and verifier execute frozen Slice specs, collect their own observations and artifacts, and calculate findings. Slice final gate alone calculates Slice `accepted`; Wave Integration Gate proves the merged wave; Campaign Final Gate calculates Campaign acceptance from one shared final snapshot; and target resynchronization/revalidation proves the delivered commit. Stop Hook checks one Slice's accepted result and worktree identity before allowing that Goal to end. Agent prose, hand-written status JSON, agent-selected pass results, old attempts, screenshots alone, file existence, generated summaries and post-compile modified acceptance tools never issue completion proof.

This gives a strong but honest guarantee: if the three inputs contain every intended requirement and each frozen oracle is sound for the AC it claims to prove, no declared obligation or AC can be unrun or failing while the workflow emits `accepted`. Structural coverage cannot prove an omitted requirement or a semantically weak oracle, so executable assertion semantics remain compile prerequisites rather than agent promises. Ordinary user/project state, hashes and freshness checks protect the normal CLI/Hook flow; they are not a hostile-Host boundary and do not resist deliberate same-user/admin state deletion, system-level Hook bypass or kernel/sandbox escape.

中文对照：短程任务直接用流程契约 + Context 层；普通长程 checklist 准备仍可用 `/normal-long-task`；原始多 SFC 需求可显式调用 `/prepare-composite-long-task` 产出 Contract V3 三输入；已有完整三输入时显式调用 `/composite-long-task-workflow`。模型在实现中可能漂移，工作流通过合同编译、中途主动验证、最终全量重算和项目级 Stop Hook 新鲜度检查，使带已知漂移的产物不能交付。

## Why Minimal Context / 为什么是最小上下文

The stage-based Harness was built from a reasonable premise: if an agent explicitly writes requirements, design, architecture, implementation notes, review evidence, test reports, release notes and RFCs, then later agents should miss less and recover faster.

Benchmark pilots changed the default product judgment:

- The workflow’s fact-source writes, stage decisions, phase transitions and gates are real process cost.
- That cost consumes time and tokens even when the final product quality is the same.
- Modern coding agents have internalized much of the ordinary single-task loop: understanding a compact requirement, choosing a local design, editing code, running tests and repairing simple failures.
- For ordinary and medium-complexity work, forcing a full Tiny Context document chain duplicates work the model can already do well.

The part that remains clearly valuable is not the ceremony itself. It is durable, compact context and priority discipline that survive a new conversation:

- project goal
- non-goals
- design rationale
- restrained architecture context
- product/domain area responsibilities
- code entry points
- critical repeat-execution verification paths
- Context/code/evidence authority
- context-first versus code-first decision rules
- current state
- next safe action

Those facts are hard to recover from code or comments alone and expensive to re-explain every time. Source code is the best record of current behavior, and focused comments can clarify local implementation intent, but they do not reliably preserve durable product intent, non-goals, ownership boundaries, architecture constraints, accepted verification paths, or the reason a current implementation shape should not automatically become project intent.

The motivating failure mode is an ABCD dependency chain. If A/B/C are upstream of downstream D, a D feature can expose a missing capability. A coding agent can make the feature pass by editing upstream A/B when the current code makes that path available. That may be correct, or it may be boundary drift: perhaps D should adapt locally, perhaps C's contract should change, or perhaps the product really needs a durable upstream capability change. Code retrieval, semantic editing and test execution can expose the available path, but they cannot decide whether that is allowed project intent. Minimal Context therefore acts as a repo-owned intent layer: module ownership, dependency direction, allowed/forbidden upstream changes, Context/code/evidence priority and `Context Delta` handling are durable facts before they are implementation conveniences.

Therefore the current design keeps the product goal unchanged, but narrows the default mechanism:

- preserve the smallest context that helps future agents resume safely;
- keep product-plan, UI/UX and development-engineering prompting as optional Context authoring helpers, not as stage artifacts;
- keep one restrained architecture context for system boundary, component map and durable constraints;
- let code, tests and project-specific probes prove product quality;
- move ADR decisions into Context `Design Rationale` instead of standalone default ADR files;
- move implementation narration into code comments, tests and short module constraints;
- make richer process artifacts and strict gates conditional, not default.

In short: Harness no longer tries to externalize the whole Tiny Context by default. It maintains the minimum durable context and priority workflow needed for recovery and continuation. The design question is not which human software-engineering phase should own a document; it is what smallest recovery surface and authority model lets an agent understand and continue the whole delivery loop without re-creating phase artifacts that the model can already reason through internally.

## Core Terms

The adopted approach uses a small vocabulary so the same mechanism is not described with several competing names:

- **Harness**: the managed guidance, Context templates, default Skills, validators and source-sync checks that shape expected agent behavior. It is not a workflow engine.
- **Context**: durable project facts stored in `project_context/**` or `DESIGN.md` so future agents can recover intent, boundaries and repeat-execution paths. It defines the smallest long-lived fact set and fact-source authority for the project; it is not a log, evidence archive or workflow by itself.
- **Minimal Context**: the durable fact layer. It defines what repo-owned facts exist, where they live, and why those facts outrank current-code convenience for ownership, boundaries, contracts and repeat-execution paths.
- **Durable fact**: a fact expected to guide later work, such as product ownership, page responsibility, information architecture, API/Schema, state semantics, cross-domain boundary or verification/deployment path.
- **Workflow contract**: the lightweight default behavior layer. It tells agents to read minimum relevant Context, decide one `Context Delta`, update durable facts first when required, use the platform's internal plan, implement, run project-owned verification and finish with Contract Conformance plus Context drift check. It has no required plan file, table, matrix, verdict or edit-order validator.
- **Context Delta**: the only durable-fact decision point. `required` means owning Context is updated before implementation continues; `none` means implementation proceeds against sufficient existing Context. Product, architecture, rationale and verification concerns may be considered internally but do not create separate deltas.
- **Internal plan**: the agent's current reasoning about goal, boundaries, controlling Context, implementation surfaces and verification. It has no mandatory filename or schema. `Architecture Context Hit`, `Decision Rationale Hit` and `Modularity Check` remain internal routing/maintenance questions rather than artifacts.
- **Small code task**: a local implementation task where existing Context is sufficient and the change does not alter durable product, architecture, API/schema/data, runtime/state/recovery, verification/deployment, security/redaction or surface-ownership facts. It is defined by semantic risk, not by lines changed.
- **Architecture Context Hit**: an internal high-risk routing question naming the Context that controls the current decision. It is not a durable fact, role, validator or artifact.
- **Decision Rationale Hit**: an internal `existing|required|none` coverage question. `required` routes back to the one `Context Delta`; it never creates a rationale delta or required file.
- **Module Design Capsule**: a compact area or role Context section for stable module principles, minimal design logic and durable rationale that should affect future implementation or verification choices.
- **Product Surface Contract**: a project-owned Context contract for a user-facing surface where users make judgments, take actions and receive feedback. It records primary user question, main-surface ownership, drilldown ownership, long-task state and validation expectations using existing Context roles.
- **Source-to-Context judgment**: required internal classification of each external source constraint as already covered, requiring a Context update, task-local, explicitly out of scope or requiring a genuine user decision. It is not a Markdown table. Composite embeds the same judgment in existing Campaign Source Coverage as `context_resolution` rather than creating another artifact.
- **Context-to-Implementation alignment**: Conformance questions that verify controlling Context reached the correct modules, surfaces, APIs, state machines and verification paths without forbidden shortcuts. It is not a Markdown table; Composite uses Contract V3 bindings and Change Envelopes as its machine form.
- **Scratch file**: optional temporary working memory with no fixed name/schema. It is not Context, completion proof or Workflow authority, is never registered in `context.toml` and does not affect Composite gates. Existing `plan.md` files remain ordinary user files and are neither deleted nor migrated.
- **Plan acceptance checklist**: a temporary pre-execution artifact that turns a referenced plan plus relevant Context into falsifiable completion criteria and a paste-ready goal/target prompt. It is not task state, execution evidence, durable Context or a claim that the plan passed.
- **Composite preparation campaign**: an explicitly created, Git-trackable, user-owned source-authoring/provenance surface for a raw multi-SFC requirement. It is the narrow exception to the default no-plan-state rule: request provenance and immutable authoring revisions may persist, while Goal attempts, logs, evidence, derived views and completion state remain temporary.
- **Target-mode task / local audit**: an opt-in ordinary-long-task recovery cache under `tmp/ty-context/plan-acceptance/**` that records progress, commands, failures and blockers. It is not created by default and is never Context, proof, a matrix, a verdict or completion authority.
- **Conformance**: a handoff self-check that compares implementation against relevant Context and current task constraints. It produces delivery evidence, not durable Context.
- **Upgrade plan**: the machine-readable result of checking a project after a package update. It is scoped to known Harness-owned schema, config and path conventions; it is not a semantic interpretation of the user's project.
- **Migration status**: the upgrade plan classifies scoped work as `safe_pending`, `manual_required` or `blocked`. Safe pending work can be applied mechanically; manual required work needs user or agent judgment; blocked work cannot be written without an overwrite/conflict risk.
- **Release update mode**: the release contract that tells users whether an update is `sync-only`, `upgrade-required` or `manual-required`.
- **Validator / gate**: machine checks for Context recoverability/path safety, generated-asset consistency, fake verification-claim prevention, touched-source modularity and explicit Composite authority. The fixed Plan Contract validator is removed; validators do not prove product quality or edit order.

## Harness Mental Model

The user-facing mental model for Minimal Context Harness is: **the Harness is a set of expected agent behavior constraints, not a document workflow**. Installing the Harness should make a user expect that each agent conversation starts from the right facts, respects project intent, uses the right thinking path for the task and leaves behind only durable recovery value.

That model has five layers:

- **Fact-source model**: durable product, architecture, ownership, interface, state and verification/deployment facts live in Context; code is current implementation; tests/smoke/CI/review/human acceptance prove quality; internal plans, scratch files, optional audits and Composite runtime state are not durable facts.
- **Authority model**: Context describes what should be true; code describes what is currently true. When they conflict, the agent should name implementation drift, missing work or stale Context instead of silently letting current code redefine product or architecture intent.
- **Workflow-contract model**: read minimum relevant Context, perform applicable surface/role checks, decide one `Context Delta`, update Context when required, plan internally, implement/verify and finish with Conformance/drift. External source coverage and implementation alignment remain required reasoning without required tables.
- **Artifact-placement model**: AGENTS is shortest routing/hard boundaries; Skills hold role procedures; Context/`DESIGN.md` hold durable facts; agent plans stay internal; arbitrary scratch and optional ordinary audits are non-authoritative; Composite source/contract/gate artifacts exist only after explicit activation; README is human usage.
- **Soft-constraint model**: default behavior is prompt guidance, not a runtime. Context authority, narrow Skills, handoff evidence, source-sync tests and small validators repeat the intent; strict machine state appears only in explicitly enabled Composite.

The implementation design follows from how agents actually run. A coding agent does not execute a workflow engine; it reads prompt context, selects relevant instructions, inspects files, uses tools, edits code and summarizes evidence. Harness therefore implements the mental model by placing each constraint at the moment where the agent is most likely to use it:

- `AGENTS.md` carries only the startup facts and hard boundaries that must be visible immediately.
- `project_context/**` carries durable intent because future agents can recover it before reading all code.
- Default Context authoring Skills expand product, UI/UX and engineering reasoning only when explicit role or strong artifact triggers make that extra frame useful.
- The Surface Contract compiler turns broad product/page/UI principles into project-owned Context when a user explicitly asks for Product Surface Contract work or when surface ownership is unclear.
- Internal task reasoning turns broad principles and applicable module design into current constraints without a mandatory artifact. The user may still ask for visible planning, but the Harness gives no filename/schema special authority.
- The ordinary long-task Skill externalizes source plus one full checklist and optional compact prompt; Local Audit is opt-in. Composite is different: it accepts strict three-input authority, machine bindings and gates, and never consumes ordinary audit/matrix/verdict artifacts.
- Contract Conformance and Context drift checks create a final self-check without storing one-off evidence as long-lived Context.
- `validate-context`, modularity, tests and package source checks enforce only recoverability/safety, generated consistency and maintainability. Product behavior remains project-owned; strict Composite gates prove only declared Contract V3 scope on current snapshots.

One design premise is that the package layer must preserve Tiny Context's own responsibility boundary: it can provide workflow contracts, fact-source authority and broad reusable principles, but it cannot know each project's business-specific surface answers. Those broad principles are therefore not a silver bullet. Because the package often lacks the information needed to choose the single expected convergence path, relying on an agent's open-ended reasoning to derive that path is unreliable. Managed Skills and optional project-local Skills exist to give agents a clearer, more concrete thinking path while leaving the actual product facts in project Context.

Adjacent high-star context and agent-workflow projects solve useful neighboring problems, but they do not remove the need for this repo-owned intent layer. Context7 and Serena improve external documentation retrieval, symbol-aware code navigation, editing and refactoring. Spec Kit, BMAD, Superpowers and Task Master improve specification, role workflow, execution discipline or task state. Those tools can show the agent more information or make execution more disciplined, but in the ABCD example they still do not answer whether downstream D may edit upstream A/B, whether C's contract is the right boundary, or whether the task requires `Context Delta: required`. Tiny Context should therefore stay complementary: use those tools for planning, retrieval and execution; use `project_context/**` for durable project intent, module boundary facts and Context/code/evidence priority.

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
- `Design Rationale` keeps only reasons, rejected alternatives and tradeoffs that should change later implementation or verification decisions. Do not invent rationale, and do not store implementation summaries, PR notes, command output, test-result claims, screenshot review notes, debug history, agent reasoning or reasons inferred only from current code shape.
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

- `export-context --full` emits a one-off project Context summary named `full-project-context-<timestamp>.md` by default.
- `export-context --code` emits a one-off single-file current implementation snapshot named `code-level-implementation.md` under a timestamped `code-level-implementation-*` directory by default.
- `export-context --all` emits both default artifacts in one command using the same timestamp and does not accept `--output`.
- `export-context --code-index`, `--source-pack`, `--code-bundles` and `--task-context <name>` emit deterministic Source Pack artifacts under `latest/` only; `--source-pack` and `--task-context` are capped at five output files.
- Source Pack profiles in `<harnessRoot>/config.yaml` are export selectors only: they can choose repo-relative Context/code/exclude/verification entries, but they do not become durable facts and their verification commands are not executed by export.
- All export modes must stay under `tmp/ty-context/context-exports/**`, must not be registered in `project_context/context.toml`, must keep secret redaction enabled, and must not revive implementation documents as tracked package defaults.

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

This clarification preserves an original Tiny Context design principle that was easy to weaken during the Minimal Context redesign:

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

- read the minimum relevant Context first
- run the page product-positioning check when applicable
- run the role placement scan when creating or reorganizing Context
- decide exactly one `Context Delta: none|required`
- update Context before implementation when the delta is `required`
- use the host platform's internal plan unless the user explicitly requests an exported artifact
- implement, run project-owned verification, then perform Contract Conformance and a Context drift check

The ladder is expected agent behavior, but it remains prompt-level guidance rather than an edit-order validator.

This is a **workflow contract**: a soft, prompt-level order of thought that raises the chance that agents apply upstream principles before editing code. It is not a phase gate, edit-order validator, required Task Contract, plan file, table, matrix or verdict. Durable facts live in Context; implementation planning normally remains in the platform's internal planning surface.

For product, UI/UX, system design, architecture-boundary, API/Schema, state/runtime and verification-design tasks, the agent compiles the relevant design constraints into its internal plan instead of creating another document:

```text
read minimum Context / inspect code / understand request
-> decide Context Delta: none|required
-> internally classify external source constraints as existing Context, Context update,
   task-local, out of scope or genuine user decision
-> compile applicable module design, architecture/rationale hits and modularity risk
   into the internal plan
-> update Context first when Context Delta is required
-> implement and run project-owned verification
-> Contract Conformance + Context drift check
```

Applicable module design is a short internal gate: identify the controlling Context or Skill principles, the choices they control, the preferred path and the entry condition for any fallback. Architecture and decision-rationale hits remain explicit checks for high-risk work without becoming templates or gates. A small task is determined by semantic impact, not code size: a one-line schema change can be high-risk, while a broad mechanical cleanup can remain local. Commands, probes and current code shape are execution evidence; they do not silently redefine project intent.

External product, architecture, technical or acceptance-plan inputs require an internal Source-to-Context judgment for every delivery-significant constraint. The result is not a Markdown table. Contract Conformance asks whether controlling Context reached the correct modules, APIs, UI/runtime surfaces and verification paths and whether forbidden shortcuts were avoided; it replaces the old Context-to-Implementation Binding table. If Conformance finds an implementation miss, fix the implementation. If it finds a missing durable fact, return to `Context Delta`, update Context and realign the work.

`Modularity Check` is an internal engineering self-check, not a Task Contract field and not `validate-context`. It considers function statement count, branch complexity, exports, state transitions and responsibility concentration rather than line count alone. A narrow waiver records `owner`, `introduced_at`, `reason`, `tracking_issue` and `expiry_condition`; unjustified or expired waivers fail CI. The CLI provides facts with `ty-context check-modularity`, while `validate-code-modularity` and composite `validate-harness` remain separate maintainability gates.

An agent may use an optional scratch file for unusually long work, but it has no required name or schema and is never Context, workflow authority or completion proof. Existing `plan.md` files are ordinary user files: Tiny Context neither creates, registers, validates, deletes nor migrates them.

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
- Keep public and package-managed surfaces English-complete. README/npm/release copy, CLI help/errors, generated AGENTS trigger examples, default Skill front matter descriptions and default artifact names must provide a complete English path; multilingual trigger examples are additive compatibility and must never be the only activation path.
- Preserve the Context Priority Ladder in managed guidance: minimum Context read -> page product-positioning check when applicable -> one `Context Delta` -> Context update when required -> internal plan -> implementation and project verification -> Contract Conformance plus drift check.
- Keep higher-risk product, UI/UX and engineering constraints in the platform's internal plan. Tiny Context does not require a Task Contract artifact or fixed planning file.
- For module design, API/Schema, state/runtime and verification-design work, require the development engineer Skill to compile `Applicable Module Design` before choosing implementation, claim, command, probe or fallback paths.
- For engineering, RFC and implementation work, perform an internal modularity check using responsibility and complexity signals; this catches risky concentration without creating a new workflow artifact.
- Allow optional scratch files with no fixed name or schema. They never become Context, workflow authority, completion proof or validator input; Tiny Context does not special-case existing `plan.md` files.
- Prevent workflow-contract ceremony creep: small code tasks use existing Context, internal planning and project verification without generated plan files, trace tables, matrices or verdicts.
- Allow an explicit `/normal-long-task` Skill for long-running or handoff-heavy plans when the user wants a temporary acceptance target. It copies the source, produces exactly one complete checklist and may produce one compact prompt. Local Audit is opt-in and records recovery state only; the Skill creates no matrix, verdict, evidence ledger, second plan or new test requirements and never executes the plan or claims completion.
- Allow an explicit `/prepare-composite-long-task` Skill upstream of composite Slice execution when work starts from a discussed multi-SFC requirement. Explicit invocation authorizes the full Campaign V5 loop. Its tracked user-owned orchestration/provenance preserves immutable source/Source Unit coverage, maximal Scope Fit V4 graph, Packet/schedule revisions, App Server model/thread/Turn/Goal/routing identities, commit/receipt identities and verifier-derived integration/final results. It centrally authors every current ready-frontier Packet in one persistent thread per SFC, preflights Contract V3 before Goal creation, conservatively schedules worktrees/Goals, integrates/repairs them, and derives completion only from current Slice/Wave/final gates plus target integration.
- Allow `/composite-long-task-workflow` only through explicit invocation after the three YAML authorities exist. It does not generate or repair product requirements, obligations, ACs or oracles; it compiles the frozen contract, lets the agent choose its own implementation methods, actively verifies exact contract commands and blocks Codex completion until one final unchanged snapshot is accepted.
- Require structural coverage across Product Requirement -> atomic PI obligation -> AC -> verification spec, plus Product Boundary / non-completing outcome / forbidden shortcut -> negative assertion -> executable spec. Any unmapped node, text-only negative rule, manual-only AC, summary-only AC or AC without a sound machine oracle blocks compile.
- Parse only a strict YAML 1.2 JSON-compatible subset. Reject Markdown inputs, two-document compatibility, aliases, duplicate/merge keys, custom tags, multiple documents, unsafe path/case forms and unknown fields. No compatibility alias or migration path remains in the runtime.
- Distinguish proof surface from runner mechanism. UI owner surfaces require browser route/action/state predicates; full-population requirements require a frozen enumerator and coverage calculation; implementation tests may change but cannot alone prove an AC; screenshot/file-exists/prose-only evidence is never sufficient.
- Keep all acceptance calculation inside the pinned verifier and final gate. Agent-written status, evidence, assertion JSON, commands and artifact registration do not exist. `current-status.json` and `final-result.json` are regenerated results; `runs/**` contains verifier-owned command and artifact manifests for reproduction only.
- Keep `validate-plan-acceptance` only as a legacy explicit-artifact consistency check. It is not part of the default workflow or the ordinary long-task output. Remove its state-backed composite branch and `validate-superpowers-state`; the composite executor proves its own contract only through `compile`, optional targeted `verify`, Slice/Wave/Campaign gates and `stop-check`.
- Treat `needs_work` as a non-terminal repair loop and `accepted` as the only successful terminal result. Ordinary product, test, evidence, scope and UI failures remain needs-work findings. A real user decision may pause ordinary task work but cannot become acceptance. The project-level Codex Stop Hook prevents missing, non-accepted or stale final results from authorizing completion and is a no-op when no active task exists.
- Elevate lightweight page product-positioning checks into managed AGENTS guidance for Web page, layout and information-placement tasks, and treat the check as input to change classification while keeping the default product/UIUX Skill triggers narrow.
- Keep broad product/UIUX principles as judgment philosophy, then put slightly more concrete reusable prompt questions in the default Skills. Going more specific than that becomes project or business logic and belongs in project Context or project-local Skills.
- Treat high-risk UI categories such as input, selection, search, filters, configuration, scheduling/time, budgets/quotas/limits and feedback states as triggers for thinking, not as a library of fixed control prescriptions.
- Read Context before making durable product, design or engineering judgments; treat `project_context/**` as intended ownership and boundary context, and code as current implementation evidence.
- Keep outputs lightweight: use Context and `DESIGN.md` for durable facts, keep implementation details in code, tests and concise comments when they are self-explanatory there, and keep per-change Context Conformance evidence in handoff / final / PR text rather than Context.
- Keep internal task constraints out of long-lived Context; only durable `Context Delta` facts are extracted into `project_context/**` or `DESIGN.md`.
- Keep ordinary long-task checklists and any opt-in audit out of long-lived Context. Composite Campaign state is explicit orchestration/provenance, also never registered as Context.
- Keep module design capsules short enough for high-frequency reading: principles, design logic and rationale should be precise, stable and decision-shaping; history, current thresholds, commands and one-off evidence belong elsewhere or stay out of Context.
- Treat verification/deployment role Context as reusable repeat-execution knowledge, not evidence reporting: record minimal setup/command-or-path/expected signal/warnings/dead ends, never raw logs, artifacts, release ledgers, secrets or pass/fail claims.
- Prefer separate project-local Skills for consumer customization; package-managed default Skills should remain broadly useful, sync-overwritten and Minimal Context oriented. Project-local Skill front matter `description` trigger keywords should stay aligned with the matching default Skill and project `AGENTS.md` role-trigger rule so activation behavior and Tiny Context guidance do not diverge.
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

The Product Surface Contract workflow exists because broad page-positioning principles are still too abstract when a project needs durable surface responsibility:

- `context_surface_contract` is a package-managed compiler Skill, not a project-specific rule store.
- It makes the intended reasoning path explicit instead of asking agents to infer one correct surface contract from generic product/UI principles.
- Product Surfaces include Web, mobile, desktop, game UI/HUD/menu, CLI/TUI, extension and embedded/device interfaces.
- The package uses existing Context roles: cross-surface facts use `contract`; area-owned screen facts use `area` or `subdomain`; repeatable checks use `verification`; rationale and code maps use `decision-rationale` and `implementation-index`.
- No new roles such as `surface-contract`, `product-surface`, `web-contract`, `app-contract` or `game-surface` are introduced.
- `product-surface-contract.md` is a compact managed template for optional project Context authoring; `init` and `upgrade` never create business surface facts.
- Repo-local Skills may make a concrete Surface Contract task block mandatory for a project, but the package does not create a universal gate.
- Code, screenshots, CLI output and tests are implementation evidence; the project Context owns intended surface responsibility.

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
- Its modularity check uses `ty-context check-modularity` as a warning-only report command and `validate-code-modularity` / `validate-harness` as hard gates for touched handwritten source. Over-limit findings route through the same abstraction / decomposition scan: identify whether the change adds a responsibility, split by a real boundary when warranted, or require a narrow config waiver with a future split boundary when the project uses the default `scoped_waivers` policy. Projects using `strict_except_generated` must split or avoid touching over-limit handwritten source.
- The scan also treats cross-Context, cross-domain or cross-layer changes required for one object or capability as a boundary-review signal: agents should evaluate whether a product capability, module, service, facade or stable interface can shrink future change scope before introducing hand-maintained manifests that duplicate implementation surfaces.
- The scan also treats repeated, deterministic, easy-to-miss or order-sensitive manual workflows as repo-local tool/script opportunities: scripts belong in the owning module's tool area with tests, while recoverable entry points, parameter constraints and applicability boundaries belong in verification/deployment Context rather than in provider-specific Skill text or one-off evidence notes.
- It should default to stable, high-value, low-risk changes and leave speculative architecture for explicit user direction or stronger project evidence.

The ordinary long-task Skill (`/normal-long-task`) exists because long-running work fails most often when the execution target is ambiguous, not because the agent lacks another phase document. It externalizes only the source and acceptance target while leaving planning and execution to the platform:

- It activates only through explicit `/normal-long-task` invocation; broad long-task keywords do not trigger it.
- It copies the source into `tmp/ty-context/plan-acceptance/**`, writes exactly one complete checklist and may write one compact target prompt. Nothing is registered in `project_context/**`.
- If the source already contains a concrete checklist, that checklist is reused without inventing a competing standard. Otherwise the Skill derives one falsifiable checklist from the source, relevant Context and repository surfaces.
- Source-provided test requirements remain checklist items. The Skill does not invent an extra test-requirements document or impose tests beyond the source and project-owned verification contract.
- The checklist is the complete acceptance target. An optional compact prompt may point to it but cannot override it or become a second plan.
- Local Audit is explicitly opt-in. When requested, it is only a recovery cache for current progress, commands, failures and blockers; it is not evidence authority, a matrix, a verdict or completion proof.
- The future executor still follows the default workflow contract: minimum Context, one `Context Delta`, internal planning, implementation, project verification, Conformance and drift check.
- The Skill performs one preparation pass. It does not execute the work, manage global task state, prove completion, create evidence ledgers or revive stage gates.
- Its business logic must remain generic. Domain-specific acceptance rules come from the current plan and project Context during invocation, or from project-local Skills.

The Composite Long-Task Preparation Skill (`/prepare-composite-long-task`) is the separate explicit Campaign V5 authoring/orchestration workflow for discussed raw plans that need one or more dependency-ordered SFCs. Its campaign is a narrow user-owned orchestration/provenance exception, not default lifecycle state:

- Explicit invocation authorizes the complete prepare-and-execute loop. Scope Fit V4 inventories every control/capability-level `SRCU-###` and creates maximal coherent, never-renumbered `SFC-###` units. It may not split for parallelism, file/layer boundaries, agents or duration. A capacity split requires persisted evidence of the authoring limit and appends stable IDs before the first Goal; the first Goal freezes the graph permanently.
- Preserve the exact discussed plan as immutable `source-plan.md` with hash/kind/target metadata and complete `source-coverage.json`. Every delivery-significant item maps to SFCs, a global constraint, explicit out-of-scope entry or genuine decision. Existing Campaign Source Coverage also records `context_resolution: existing|updated|task_local`; `existing` and `updated` require exact Context references, while `task_local` requires a reason. Packet Requirements must carry the same resolution without adding a duplicate Context artifact.
- Before the first Goal, the Campaign records the Context graph and baseline hashes. Just-in-time authoring rereads only referenced Context when its graph and hashes are unchanged; any relevant Context change forces reauthoring before execution. Contract V3 defaults to `context_snapshot_mode: referenced`, freezing topology plus selected file hashes; `full` is an explicit opt-in.
- Author the complete current dependency-ready frontier just in time. Each SFC receives one persistent App Server thread whose read-only Authoring Turn emits strict `CompositeAuthoringPacketV3`. The Packet maps Source Units through Requirement, PI Obligation, AC and Verification Spec while preserving the three authorities: product/architecture owns intent, technical plan owns obligations and checklist owns completion.
- Every executable Goal has a closed **Change Envelope** with `allowed_write_paths`, `allowed_supporting_paths`, `forbidden_paths`, carrier paths for non-file bindings and the frozen `undeclared_change_policy: reject`. Contract V3 `supporting_paths` are projected into the Envelope's allowed supporting paths; `project_context/**` and `.codex/composite-long-task/**` remain hard-forbidden even if a Packet declares them writable, and every other undeclared write is rejected. Repair envelopes are the explicit union of affected envelopes plus the repair-specific additions; they cannot silently widen Campaign scope.
- Parallel placement requires positive independence evidence after Packet preflight. Dependencies, overlapping writes or verification inputs, shared API/schema/route/runtime/state/Context contracts, generated artifacts, package manifests, migrations and non-isolatable resources force serialization; unknown overlap defaults to serial. Wave impact is the merge diff plus bindings, verification inputs, contract keys, Context references and global constraints; unknown impact triggers full recomputation.
- All SFCs use isolated Git worktrees. Goal Manifest V2 freezes thread, exact model-routing decision, Campaign/SFC/wave/worktree/base/Packet/contract/integration identities and Change Envelope. Model routing comes from a versioned YAML policy and a host-discovered model catalog; current policy maps only catalog-proven Sol `xhigh|max` (or an explicitly named successor) to Sol `medium`, and passes through lower, unrelated, unknown or unavailable profiles. Campaign freezes the policy id/hash, catalog hash and complete routing decision, then verifies the decision hash.
- Primary-worktree cleanliness is not required. When the target worktree is dirty, baseline and hidden-ref operations use a temporary index plus `commit-tree` without mutating the user's index, branch, working tree or stash. Every Git operation names its target worktree. `preserve_primary_worktree: true`, `auto_push` and protected-branch behavior are explicit policy, and primary state is checked before and after the Campaign.
- Campaign mutation uses a transactional store: write-ahead intents, leases, atomic rename, file/directory durability, hash-chained events, startup recovery and quarantine for irreconcilable partial state. A crash between intent and completion is recovered or fails closed; it cannot silently promote status.
- The App Server host waits for concurrent turns with settled-result semantics so one rejection cannot hide siblings still mutating state. Every Turn records observation status and reconciliation. Reconnect resumes or reconciles known thread/Turn/Goal identities; ambiguous creation fails closed rather than duplicating work. The host never exits while a mutation may still be running or unobserved.
- Targeted `verify` is an optional repair accelerator and never accepts a Slice. Slice final gate, impact-aware Wave Integration Gate and Campaign Final Gate remain mandatory. Accepted Slice branches merge to the integration branch in stable order; ordinary conflicts and regressions create bounded repair Goals rather than user decisions.
- Campaign Final Gate evaluates one shared final snapshot. Identical verification specs may be deduplicated only when snapshot, normalized spec, oracle, executable, input paths, command and environment are all identical. It reruns all required bindings, counterfactuals, global constraints and source-coverage rules; historical Slice results never prove Campaign completion. Target movement triggers resynchronization and the same final gate before merge/push/allowed PR completion.
- The authority ladder is immutable source → Source Coverage/Scope Fit graph → Context baseline → Packet revisions → frozen model/Git/transaction identities → Contract V3 → Slice receipts → Wave gates → shared-snapshot Campaign final result → target merge identity. Goal prose, server status or handwritten state cannot promote any layer.
- Git-trackable Campaign data may retain immutable source/graph/Packet/schedule revisions and compact identity/results. Mutable contracts, command runs, raw artifacts, leases, WAL state and workdirs stay in temporary storage. Campaign status is CLI-derived, never Goal-written.
- No historical attachment, partial bundle, V1/V2/Markdown campaign, old temporary workdir or campaign importer is added. Campaign V4 remains inspectable audit data but automatic execution requires V5; no alias or silent migration weakens the new identity contract. Only complete Contract V3 YAML bundles keep the direct `/composite-long-task-workflow` route.
- `init`, `sync` and `upgrade` may install or refresh the managed Skill/CLI, but they never create, scan, import, mutate or delete user campaigns. Future campaign schema migration is explicit and on demand.

The Composite Long-Task Workflow Skill (`/composite-long-task-workflow`) is a separate explicit-only lightweight executor for a complete Contract V3 three-input packet. Its design purpose is to allow implementation freedom while preventing false completion inside the declared contract and normal CLI/Hook boundary:

- It is available only through explicit invocation. It inherits Context reading, the single `Context Delta`, project verification and Conformance/drift rules, but replaces the default internal plan and completion calculation with its frozen three-input contract and gates. It does not create runtime state for ordinary questions.
- Product / Architecture Source owns requirements, boundaries, non-completing outcomes, owner surfaces and population policy. Technical Realization Plan owns plan items and atomic obligations. Acceptance Checklist owns AC semantics, proof surfaces, executable verification specs and oracle bindings.
- `compile` rejects every missing Requirement -> PI -> Obligation -> Binding -> AC -> Proof -> Spec -> Counterfactual edge and every boundary/non-completing/forbidden rule that lacks an executable negative assertion. It freezes the three inputs, complete graph, oracle/verifier identities, workdir and a `context_snapshot_mode: referenced|full` snapshot. `referenced` is default and freezes manifest topology plus selected Context hashes; `full` freezes every registered Context file. An identical active compile is idempotent; any changed identity is rejected as `active_contract_changed`.
- The pre-stable execution surface is intentionally exact: one Node Oracle command matching the declared entrypoint, no network and no environment refs, requirements or probes. Browser/package/project commands and environment-dependent contracts fail compile rather than becoming ignored capabilities.
- Oracle soundness is a declared trust prerequisite, not something graph coverage can infer. Oracles must be pre-existing package/project acceptance authorities or separately authored and frozen before product work; the implementation task may change implementation tests but cannot author or modify the oracle that proves the same task.
- Targeted `verify` is optional. When used it selects impacted frozen specs, collects verifier-owned observations/artifacts and writes actionable repair findings, but it never accepts a Slice or Campaign. The agent cannot submit pass results, evidence, assertion JSON or completion state.
- `final-gate` discards intermediate acceptance value, revalidates every frozen identity, runs every in-scope AC against the current workspace, recomputes Obligation, PI and Requirement results bottom-up and binds the result to the workspace hash. It calculates only `accepted` or `needs_work`; only `accepted` is product completion.
- Compile accepts only the exact package-managed Hook bytes and event commands. The project-level Codex Stop Hook is no-op without an active task. With an active task it first requires the final-result bytes to match verifier-written project/Git receipts, then blocks a missing final result, `needs_work`, any non-accepted result or a workspace/final-result identity mismatch. A later activation invalidates the preceding final result. A real user decision is handled through ordinary task communication and leaves the workflow unaccepted.
- The workdir contains three YAML inputs, `compiled-contract.json`, `goal-objective.txt`, `current-status.json`, `final-result.json` and verifier-owned `runs/**`. It has no duplicate Context artifact, workflow protocol, task-state reducer, matrix/verdict, progress ledger, evidence index, local audit or final card.
- The public command set is `init`, `compile`, `verify`, `status`, `final-gate`, `stop-check` and `render-goal`. All Superpowers namespaces, agent-command/evidence registration, slice/epoch/derive/next-slices commands and `validate-superpowers-state` are deleted.
- This is an intentional breaking replacement. There is no hidden alias, dual-write, old workdir reader, importer, audit-only migration or automatic conversion. Old Markdown/campaign/workdir data must be regenerated as Contract V3 YAML and verified through a fresh final gate.
- The pre-stable threat model covers declared obligation omissions, changed compile inputs or observers, stale/missing final results, post-final workspace drift and silent active-contract replacement in the normal CLI/Hook flow. Ordinary user/project state is not a hostile-Host boundary and does not resist deliberate same-user/admin state or Hook deletion, Credential Manager/Registry attacks, system-level Hook bypass or kernel/sandbox escape.
- Pre-stable verification stays small: focused mechanism tests finish within 5 minutes, the default Composite suite within 15 minutes and one test normally within 2 minutes. Default tests do not install VMs, containers, browser matrices or administrator environments; over-budget cases are simplified or moved rather than hidden with larger timeouts.
- The minimum real CLI/final-gate black boxes are `happy_path_real_implementation`, `missing_obligation`, `source_changed_after_compile`, `oracle_or_verifier_changed_after_compile`, `stale_or_missing_final_result` and `drift_repair_end_to_end`. Each names the drift it prevents; source regex and file-name assertions are not substitutes.
- Rust Host Helpers, administrator privileges, Credential Manager, AppContainer/WFP/complex ACL policy, external audit runners, release-grade consumer matrices and cross-platform release infrastructure are deferred until the core workflow is stable and the product explicitly adopts those threat/compatibility claims.

The Harness upgrade Skill exists because existing consumer projects need a short, repeatable procedure after package updates:

- It triggers on explicit Tiny Context / Project Tiny Context Harness upgrade requests, including English requests such as `upgrade Tiny Context` and `use the Tiny Context upgrade skill to upgrade this project`; Chinese trigger examples are compatibility-only additions.
- It treats `ty-context upgrade` as the default command after an npm package update and for explicit upgrade requests. `sync-only` release mode only means direct `sync` is an allowed managed-asset refresh shortcut, not the default upgrade path.
- It tells agents to handle only migration-scoped `manual_required` / `blocked` follow-up and to use `context.toml`, role placement scan and existing project Context rather than guessing business semantics.
- It is package-managed guidance for operating the Harness, not a project-local product/design/development customization surface.

## Package Behavior

Distribution is profile-based:

- `core-portable` installs the manifest, Context templates, shortest AGENTS routing, Context validator and portable CLI surfaces.
- `workflow-default` adds the default workflow and role Skills plus ordinary long-task preparation; it is included by default where the host can consume Codex-style Skills.
- `composite-codex` adds Codex Hooks, the two Composite Skills and Composite CLI surfaces. It is explicit and is never silently installed for a non-Codex host.

`init` creates the selected profile assets. The default Codex installation includes `core-portable` and `workflow-default`; `ty-context enable composite-codex` enables the explicit Composite profile:

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
- `<harnessRoot>/skills/normal-long-task/SKILL.md`
- `<harnessRoot>/skills/prepare-composite-long-task/SKILL.md` when `composite-codex` is enabled
- `<harnessRoot>/skills/composite-long-task-workflow/SKILL.md` when `composite-codex` is enabled
- `<harnessRoot>/ty-context-managed/context_templates/**`
- `<harnessRoot>/ty-context-managed/make/ty-context.mk`
- `tools/**`
- `.github/workflows/harness.yml` when absent or managed

The package-managed `.github/workflows/harness.yml` is a consumer project workflow. It installs the Node runtime required by the Harness CLI and runs the selected `validate-context`, `validate-code-modularity` or composite `validate-harness` target. In this source repository, pull requests run build/typecheck, `validate-context`, `check-source`, default-workflow tests, Contract V3 black boxes and Fake App Server black boxes. Main additionally runs the full npm suite, full Composite profile, quickstart and package preview. Trusted publication runs the full suite, packs once, installs that exact tarball into an empty repository, then proves `init`, `doctor`, `validate-context` and a minimal Contract V3 compile/final-gate path against the installed artifact.

`init` does not create business Product Surface Contract files, `.work_products/**`, lifecycle/plan state, stage skills, stage templates, stage policies or Composite Campaign data by default.

`sync` refreshes managed assets only. It never generates project semantics, does not run migrations and does not call the full migration registry as a freshness preflight. Public `sync` may refuse writes for direct asset-refresh safety blockers such as unsupported schema, invalid managed block markers or deprecated managed Skill override directories, but pending semantic or mechanical migration findings belong to `upgrade --check` / `upgrade`, diagnostics and release notes.

### Upgrade Model / Migration Model

The public npm update path is: after updating the package, run `ty-context upgrade`. `sync-only` release mode means the release itself adds no new migration requirement and direct `sync` is allowed when the user explicitly wants only managed-asset refresh; it does not replace the default upgrade entry.

The package also ships `context_harness_upgrade` as a managed Skill so agents can turn explicit requests like `upgrade Tiny Context` into the canonical upgrade sequence: inspect Context, run `upgrade --check` when useful, run `upgrade`, handle only scoped manual/blocked items, then run `doctor` and `validate-context`.

The core design split is:

- `sync` is managed asset refresh.
- `upgrade` is safe migration orchestration.

`upgrade --check` generates an upgrade plan without writing files. `upgrade` generates the same plan and treats `blocked` as a write preflight failure: if a blocked item exists, it prints the plan, runs diagnostics and exits non-zero without applying safe migrations or internal `sync`. Without blockers, it applies only `safe_pending` migrations, then runs `sync` and `doctor`. If `manual_required` follow-up or diagnostics remain, the command exits non-zero after printing follow-up so users do not mistake a partial upgrade for complete migration.

The migration model is a safe/manual/blocked migration model:

- `safe_pending`: the CLI can prove the change is inside a known Harness schema, config or path convention and can apply it without overwriting user content.
- `manual_required`: the path is in migration scope, but the CLI cannot prove the right semantic role or user intent.
- `blocked`: a safe target cannot be written because of a conflict, existing destination or other overwrite risk. Blocked items stop upgrade writes until the conflict is resolved.

The migration registry shape is intentionally explicit. Each migration declares `id`, `introducedIn`, `scope`, `risk`, `detect`, `apply`, `verify` and `manualMessage`. `detect` must first narrow the scope; files outside that scope are not reported. `apply` is implemented only for safe migrations. Blocked scenarios must not write files. The registry is an `upgrade` mechanism, not a normal `sync` precondition; otherwise old compatibility logic grows into a permanent tax on every managed asset refresh.

Initial registry entries cover:

- `legacy-sdlc-harness-rename`
- `schema-v4-config-refresh`
- `legacy-modules-to-areas`
- `context-manifest-baseline`
- `global-context-v4-sections`
- `design-md-baseline`
- `deprecated-skill-overrides`

The model covers Harness-owned surfaces such as old `sdlc-harness` / `pjsdlc_managed` rename compatibility, config schema refresh, `project_context/modules/**` to `project_context/areas/**`, conservative manifest baseline creation, obvious `verification.md` / `deployment.md` role registration and generated design baseline creation. The legacy rename migration may copy `package.json#sdlcHarness` to `package.json#tyContext`, copy `sdlc-harness.config.json` to `ty-context.config.json`, refresh `<harnessRoot>/config.yaml` managed paths from `pjsdlc_managed` / `sdlc-harness.mk` to `ty-context-managed` / `ty-context.mk`, and replace old managed markers in place through sync. It must report root conflicts, old override skills, unknown old managed content and target conflicts as `manual_required` or `blocked`; it must not delete unconfirmed user configuration, merge overrides, migrate `.work_products/**` or restore lifecycle state. It does not infer arbitrary project semantics. For example, `project_context/areas/payment/api.md` without manifest role is `manual_required`, not automatically guessed as `contract`, `foundation`, `area` or `implementation-index`.

Anti-goals:

- Do not restore the stage workflow or legacy migration command.
- Do not make scripts guess user intent.
- Do not perform whole-project semantic migration.
- Do not auto-rewrite project-local Skills, business verification paths, product facts or deployment facts.
- Do not promise that an old project becomes best practice after one command.

Release update mode is part of the release contract and must be impact-based, not hardcoded to the most conservative path. Release readiness must report `sync-only`, `upgrade-required` or `manual-required`; if code, assets, docs or this spec change public migration semantics, the release cannot claim `sync-only`. Newly generated release packets default to `sync-only` only for asset/docs-only updates; releases that add safe migrations use `upgrade-required`, and releases with unavoidable user judgment use `manual-required`. The mode describes release risk; the default user update command remains `ty-context upgrade`.

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

`upgrade` runs safe migrations, managed asset refresh and diagnostics. The old semantic migration command has been removed because user migrations are complete.

`validate-context` checks that Context has the minimum recovery fields and does not fake product verification evidence. It does not replace project tests.

`check-modularity` audits selected handwritten source with physical line count, maximum single-function statement count, branch complexity, file export count, state-transition count and inferred responsibility concentration. It is warning-only by default as a report command and supports `--fail-on-warning`; `validate-code-modularity` and composite `validate-harness` use that hard mode for touched/PR handwritten source. New generated config files set `modularity.policy: strict_except_generated` for strict enforcement that still auto-skips generated or non-source files; omitted policy remains `scoped_waivers` for compatibility. Valid `scoped_waivers` exceptions live in `<harnessRoot>/config.yaml` `modularity.waivers` with `path`, one of `generated`, `third_party_reference`, `legacy_migration`, `aggregate_styles` or `fixture_snapshot`, and lifecycle-complete `owner`, `introduced_at`, `reason`, `tracking_issue` and `expiry_condition`; `strict_except_generated` rejects any waiver config. A one-line compressed module cannot evade this gate, and an incomplete or duplicate waiver fails validation. The metrics are risk signals and do not replace the development engineer Skill's responsibility-boundary judgment.

The canonical npm package is `project-tiny-context-harness`; `ty-context` is the bin name:

- Public commands and managed Makefile wrappers prefer `npx --yes --package project-tiny-context-harness@latest ty-context` for ad hoc use.
- This avoids bare `npx ty-context` resolving a legacy package name or stale local binary.
- Current CLI commands guard unsupported future schema major versions before applying v4 assumptions.
- Write commands fail before modifying files.

## Historical Iteration: Stage-Based Tiny Context Harness

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
- the highest-leverage durable fact source is likely a small Project / Delivery Context, not a full Tiny Context document chain;
- full gates and rich process artifacts should be conditional, not default.

Therefore the canonical product direction changed: preserve minimal durable context, leave product quality to project-specific validation, and use benchmark work to find the break-even curve where extra workflow structure pays back.

## Design Principles

- Minimal durable facts beat broad default ceremonies.
- Context is for recovery and safe continuation, not for duplicating source code.
- Harness should not claim product quality; it should point agents to verification/deployment repeat-execution paths.
- Semantic migration must be explicit and reversible.
- Managed asset sync must be narrow and predictable.
- Upgrade logic must converge into versioned mechanical migrations and release-impact metadata, not accumulate as a permanent preflight inside ordinary `sync`.
- Historical stage design is documentation-only in the current source tree; runnable defaults are Minimal Context.
- Benchmark conclusions must distinguish high-confidence measured data from diagnostic or historical evidence.

## Repository Product Areas

This source workspace contains three maintained areas:

- Harness source and package assets: `packages/ty-context/**`, `.codex/ty-context-managed/**`, `tools/**`.
- Package release and source-sync logic: build/test/release scripts and `packages/ty-context/source-mappings.yaml`.
- Delivery benchmark: `examples/delivery-benchmark/**`, used to test whether the Harness product direction improves same-quality lifecycle delivery efficiency.

## Historical Material

Old stage-based source assets, state files and work-product trees are removed from the current implementation. The durable information kept from that era is this spec summary:

- what the stage Harness tried to do
- how it was implemented
- what benchmark work found
- why the product converged to Minimal Context

Future design changes should keep the same discipline: preserve the reasoning that affects current behavior, but avoid recreating large default document chains unless measured evidence shows they pay back their cost.
