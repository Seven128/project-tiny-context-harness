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
-> Composite Long-Task Workflow Skill (`/composite-long-task-workflow`) consumes Product / Architecture Source + Technical Realization Plan + Acceptance Checklist when Superpowers-backed execution is needed
-> Superpowers derives concrete implementation slices
-> execution maintains plan-conformance matrix and final acceptance verdict
-> each slice follows the workflow contract + Context layer
```

Here Superpowers means the specific [obra/Superpowers](https://github.com/obra/superpowers) plugin/workflow. The Composite Long-Task Workflow Skill is Tiny Context's adapter layer for Superpowers-backed workflows, aligned to the official Superpowers skills while remaining a Tiny Context-owned adapter rather than an upstream-owned schema. It does not route task complexity; direct invocation means the upstream process already chose composite long-task execution. It also does not translate a product/architecture source into a technical plan; the Technical Realization Plan must already exist or be explicitly present in the first compatible input document. If required input is missing, the Skill stops with a Missing Fields Report instead of inferring the plan or repairing the checklist. The technical realization plan must already satisfy the Superpowers-ready Markdown implementation plan fields; when it does, the Skill skips plan generation and binds that external plan directly to execution, and when it does not, the Skill stops before generating a prompt. It emits `workflow-protocol.md`, `execution-binding.md` and a deterministic `goal-objective.txt` so Codex Goal mode can execute from a compact objective while the protocol and binding remain explicit artifacts. `superpowers:subagent-driven-development` is preferred when subagents are available; `superpowers:executing-plans` is the non-subagent fallback; `superpowers:test-driven-development` applies to behavior changes and `superpowers:verification-before-completion` gates completion claims against both plan conformance and acceptance evidence. When subagents are available, the composite path adds a read-only auditor pass after self-evidence and validator checks; that auditor reconstructs AC proof chains and looks for missing proof-chain layers, stale evidence, current contradictions and sibling substitution, but its summary is not proof.

The Superpowers prompt uses Slice Gate / Epoch Gate / Final Gate cadence so each slice performs targeted synchronization and proof cleanup without running the full final gate after every slice. Progress Accounting tracks AC acceptance completion, engineering implementation progress, runtime/proof progress, system capability progress, representative sample progress, real object coverage, full population operation progress and workflow overhead as separate metrics. Multi-slice execution may keep a temporary progress ledger under `tmp/ty-context/plan-acceptance/**`; each slice declares an artifact budget and proof-layer milestone status. Workflow overhead backpressure batches provider/browser/runtime/security epoch proof environments, prunes stale artifacts and asks for the Next 3-5 high-value clusters that close the most blocking AC/proof-layer gaps.

Strict final completion is recompute-only, current-attempt-only and owned by the Trusted Evidence Kernel. `compile` derives required command specs from AC proof layers, assertion commands, assertion artifacts, required test ids, positive/negative assertions, invalid completion signals and expected final evidence; `start-attempt --mode product_task|harness_task` records current source hashes, git/worktree identity and mode; `run-assertion` records command runs; `record-evidence` registers canonical EvidenceRecordV2 artifacts into state; and `final-gate` recomputes AC/PI/final status from current v2 proof plus contradiction scans. EvidenceRecordV2 carries attempt/source/product/plan/checklist hashes, git head, worktree fingerprint, command spec/run ids, command line and exit code, artifact path/SHA/mtime, target AC ids, target PI ids, target proof layers, assertion status/exit code, positive assertions, negative assertions, invalid completion signals, negative evidence scan and required test ids. Legacy v1 evidence remains audit/history material unless registered into the current attempt with source/worktree/command/artifact/assertion fields. `derived/**`, `events.ndjson`, matrix/verdict/evidence-index/final-summary, validator pass, final cards, auditor prose and summary-only AC proof cannot substitute for current assertion-backed evidence. Newer failed command runs, Playwright/JUnit/test-result artifacts, owner DOM forbidden states, task-state false/partial values, source/worktree drift and derived/state contradictions block completion for the affected AC/layer.

Final-gate recomputation has a fixed order: load the three inputs, recompute source hashes, load task state, load current attempt, load command-run records, load registered EvidenceRecords, discard stale evidence, run contradiction scan, recompute every AC, recompute every PI, recompute `acceptance_target_status`, recompute `product_goal_complete`, regenerate `derived/**` and append an event. Machine-blocking ACs that cannot provide a concrete assertion command, artifact, positive/negative assertions, invalid completion signal checks, required UI/browser proof or assertion result become `under_specified`; their PI is blocked and `product_goal_complete=false`. AC-010/final-gate summary proof is never bootstrap authority: if it passes while another required AC is missing, failed or stale, AC-010 is invalidated with `final_gate_cannot_bootstrap_from_summary_only`.

Harness Drift Lock prevents a product task from proving completion with a modified acceptance toolchain. In `product_task` mode, changes to Playwright specs, tests, assertion generators, AC010 helpers, evidence writers, final-gate, validator, derive, task-state reducer, composite workflow Skill/protocol or related Makefile/package test targets block completion with `harness_drift_detected`, `acceptance_target_status=blocked`, `product_goal_complete=false` and the required split-task message. In `harness_task` mode, harness changes require adversarial fixtures with explicit expected final-gate results covering stale evidence, historical complete, derived contradiction, AC010 summary-only, target mismatch, API-only-for-UI, negative evidence after pass, source hash mismatch, dirty worktree mismatch, missing assertion_result, test weakening and a happy path; passing those fixtures proves the harness only. `protected-harness-baseline.json` records the protected final-gate, validator, derive, evidence registration, assertion schema, fixture expected outcomes, workflow protocol, Skill markdown and test runner script surfaces; product tasks changing them are blocked, while harness tasks changing them need a baseline reason and fixture verification.

The reason is practical rather than ceremonial. The workflow contract and Context layer are soft constraints. They work well for short tasks because the agent can keep Context, implementation and verification evidence aligned inside one manageable execution loop. In long-running tasks, Context can still capture the expected facts, but the Context-to-code step tends to drift as the context window grows, handoffs accumulate, subagents split work and verification loops multiply. The product/architecture source, technical realization plan, acceptance checklist, explicit long-task Skill invocation, optional generic target prompt, optional Superpowers target prompt, `plan-conformance-matrix.*`, `final-acceptance-verdict.*` and Superpowers execution layer externalize context-delta judgment, implementation conformance and acceptance proof so later execution can recover, audit and continue without turning Minimal Context back into a phase-gated workflow.

中文对照：短程任务直接用流程契约 + Context 层；普通长程 checklist 准备仍可用 Web GPT 或外部规划模型产出《开发方案》+《验收清单》两份输入并调用 `/normal-long-task`；需要 Superpowers-backed 目标模式文本时推荐提供 Product / Architecture Source、Technical Realization Plan、Acceptance Checklist 三份输入后直接调用 `/composite-long-task-workflow` 适配，然后用 Superpowers 落成执行切片。执行前用 Product Context Delta / Technical Context Delta 判断是否要更新 Context，执行中用 `plan-conformance-matrix.*` 防实现漂移，最后用 `final-acceptance-verdict.*` 防验收漂移。原因是 Context 到代码 这一步在长程任务中更容易漂移。

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
- **Workflow contract**: the agent behavior layer and Tiny Context's second core concept. It is the prompt-level order of thought that tells agents how to read Context, respect principle/contract/foundation Context before current code, decide `Context Delta`, compile a Task Contract, use `plan.md` when needed, implement against the contract, then perform Contract Conformance and Context drift check. It is a soft behavioral contract, not a phase gate or machine-enforced edit-order gate; plan validators may check temporary artifacts for self-consistency without proving product quality.
- **Context Delta**: the current task's durable-fact decision point inside task-contract scenarios. `required` means Context is updated before implementation continues; `none` means implementation proceeds against existing Context. Product/architecture and technical-plan inputs may refine the judgment into `Product Context Delta: none|required` and `Technical Context Delta: none|required`; either `required` makes the overall Context Delta required, but the split remains a thinking aid rather than a new gate or Context role.
- **Task Contract**: a temporary task-local compilation of upstream principles and Context into implementation constraints. It guides the current task, but is not a source of truth. High-risk Task Contracts may include `Architecture Context Hit` and `Decision Rationale Hit`; engineering, RFC and implementation Task Contracts include `Modularity Check: none|required|exception` so oversized touched files force split-or-exception reasoning inside the existing contract.
- **Small code task**: a local implementation task where existing Context is sufficient and the change does not alter durable product, architecture, API/schema/data, runtime/state/recovery, verification/deployment, security/redaction or surface-ownership facts. It is defined by semantic risk, not by lines changed.
- **Architecture Context Hit**: a high-risk Task Contract field naming the architecture, area/subdomain, contract or Module Design Capsule Context that controls the current technical decision. It is not a durable fact, context role, validator or architecture gate.
- **Decision Rationale Hit**: a high-risk Task Contract field with `existing|required|none`, showing whether durable design rationale is already covered, newly required through `Context Delta: required`, or not applicable. It is not a rationale delta, durable fact gate or requirement to invent reasons.
- **Module Design Capsule**: a compact area or role Context section for stable module principles, minimal design logic and durable rationale that should affect future implementation or verification choices.
- **Product Surface Contract**: a project-owned Context contract for a user-facing surface where users make judgments, take actions and receive feedback. It records primary user question, main-surface ownership, drilldown ownership, long-task state and validation expectations using existing Context roles.
- **Source-to-Context Coverage**: a task-local table, usually in `plan.md` or an equivalent temporary plan surface, that maps external product, architecture, technical or acceptance-plan constraints to existing Context hits, required Context actions and owning Context files. It prevents agents from updating only easy status/evidence notes while missing the source's durable architecture or surface responsibilities; implementation paths belong in Context-to-Implementation Binding.
- **Context-to-Implementation Binding**: a task-local table that maps Context facts and Task Contract constraints to implementation obligations, expected surfaces, implemented paths, forbidden shortcuts, verification paths and binding status. It prevents agents from reading or updating Context but then landing only convenient local code paths.
- **Temporary plan surface**: `plan.md` or an equivalent scratchpad used only when complex work needs visible execution state. It makes the workflow contract visible, executable and checkable for the current execution slice; it serves the workflow contract and Context without replacing either. For high-risk source inputs it carries Source-to-Context Coverage, Context-to-Implementation Binding, `Context Delta`, Task Contract, implementation steps and Conformance notes. Small code tasks should not create it unless they discover durable Context changes or expand into high-risk work.
- **Plan acceptance checklist**: a temporary pre-execution artifact that turns a referenced plan plus relevant Context into falsifiable completion criteria and a paste-ready goal/target prompt. It is not task state, execution evidence, durable Context or a claim that the plan passed.
- **Target-mode task / local audit**: a temporary long-running acceptance progress layer derived from a user plan and stored under `tmp/ty-context/plan-acceptance/**` when requested by the generated goal/target prompt. It can help resume goal-mode execution, but it is not Context, a global task manager, a quality proof, a workflow engine or a replacement for a Task Contract or workflow-contract `plan.md`.
- **Plan conformance matrix**: a temporary generated execution trace under `tmp/ty-context/plan-acceptance/**` that maps each behavior-affecting implementation-plan item to expected surfaces, implemented paths, tests, runtime/evidence, assertion status, negative evidence findings, status and drift. It is initialized early and updated during Superpowers execution. It is not final acceptance proof.
- **Final acceptance verdict**: a temporary generated final-gate artifact under `tmp/ty-context/plan-acceptance/**` that judges every AC from the full acceptance checklist against fresh evidence, assertion-backed proof layers and current contradictions. It is the acceptance reading surface for Superpowers long-task execution, while still not durable Context and not proof by itself.
- **Conformance**: a handoff self-check that compares implementation against the relevant Context and task contract. It produces delivery evidence, not durable Context by itself.
- **Upgrade plan**: the machine-readable result of checking a project after a package update. It is scoped to known Harness-owned schema, config and path conventions; it is not a semantic interpretation of the user's project.
- **Migration status**: the upgrade plan classifies scoped work as `safe_pending`, `manual_required` or `blocked`. Safe pending work can be applied mechanically; manual required work needs user or agent judgment; blocked work cannot be written without an overwrite/conflict risk.
- **Release update mode**: the release contract that tells users whether an update is `sync-only`, `upgrade-required` or `manual-required`.
- **Validator / gate**: machine-enforced checks. Minimal Context uses them for recoverability, generated-asset consistency, fake verification-claim prevention, touched-source modularity and temporary plan-artifact consistency. They do not prove product quality or enforce code/context edit order.

## Harness Mental Model

The user-facing mental model for Minimal Context Harness is: **the Harness is a set of expected agent behavior constraints, not a document workflow**. Installing the Harness should make a user expect that each agent conversation starts from the right facts, respects project intent, uses the right thinking path for the task and leaves behind only durable recovery value.

That model has five layers:

- **Fact-source model**: durable product, architecture, ownership, interface, state and verification/deployment path facts live in `project_context/**` or `DESIGN.md`; principle-like Context roles such as `foundation`, `contract`, `decision-rationale`, `architecture`, `verification` and `deployment` interpret current-code convenience before implementation choices are made; code is evidence of current implementation; tests, smoke, CI, review and human acceptance prove product quality; one-off logs, screenshots, task contracts, target-mode local audits, plan-conformance matrices, final acceptance verdicts and temporary plans are evidence or scratch space, not durable facts.
- **Authority model**: Context describes what should be true; code describes what is currently true. When they conflict, the agent should name implementation drift, missing work or stale Context instead of silently letting current code redefine product or architecture intent.
- **Workflow-contract model**: the agent follows prompt-level thought order at high-risk moments: read Context, run page/product-positioning or role-placement checks when applicable, compile applicable module design into the task contract, use `Context Delta` inside task-contract scenarios, use Source-to-Context Coverage for external plans or source packets, update Context first when durable facts changed, use Context-to-Implementation Binding for high-risk implementation work, implement, verify and finish with Conformance / drift checks. The contract exists because an agent needs explicit priority rules when Context intent, current code, tests, temporary execution state and one-off evidence disagree.
- **Artifact-placement model**: AGENTS is startup routing and hard boundaries; Skills are role-specific thinking frameworks; Context / `DESIGN.md` are long-lived fact sources; `plan.md` or equivalent plan surfaces are temporary execution cache for a workflow contract; target-mode local audits are temporary progress cache; plan-conformance matrices are temporary implementation-trace cache; final acceptance verdicts are temporary final-gate evidence; optional proof indexes are execution evidence indexes rather than fourth inputs; README is human usage; validators guard recoverability, fake verification claims, touched-source modularity and temporary plan-artifact consistency only.
- **Soft-constraint model**: most Harness behavior is guidance for a probabilistic coding agent, not a deterministic runtime. The design therefore repeats the same intent through small managed surfaces, narrow Skill triggers, Context authority, temporary-plan boundaries, handoff evidence, source-sync tests and a small validator instead of relying on a single heavy gate.

The implementation design follows from how agents actually run. A coding agent does not execute a workflow engine; it reads prompt context, selects relevant instructions, inspects files, uses tools, edits code and summarizes evidence. Harness therefore implements the mental model by placing each constraint at the moment where the agent is most likely to use it:

- `AGENTS.md` carries only the startup facts and hard boundaries that must be visible immediately.
- `project_context/**` carries durable intent because future agents can recover it before reading all code.
- Default Context authoring Skills expand product, UI/UX and engineering reasoning only when explicit role or strong artifact triggers make that extra frame useful.
- The Surface Contract compiler turns broad product/page/UI principles into project-owned Context when a user explicitly asks for Product Surface Contract work or when surface ownership is unclear.
- Task-contract compilation turns broad principles and applicable module design into task-local constraints before implementation, while `Context Delta` prevents a second durable-fact decision point.
- Temporary plan surfaces can keep the workflow contract visible during complex per-turn or short-horizon work, lowering the chance that implementation drifts away from Context priority. For product/architecture/technical/acceptance-plan inputs, the plan surface carries Source-to-Context Coverage so the agent must show which source constraints are covered, updated into Context, task-local, explicitly out of scope, user-blocked or under-scoped. For high-risk implementation work it also carries Context-to-Implementation Binding so the agent must show expected surfaces, implemented paths, forbidden shortcuts and verification paths. Durable facts discovered there must be extracted back to Context. The same boundary prevents ceremony creep: small code tasks should stay code-first and should not create plan surfaces or trace tables unless they stop being small.
- The ordinary long-task Skill (`/normal-long-task`) can help before long-running execution by externalizing the acceptance bar once. A Web GPT or external planning pass can produce the source plan, `/normal-long-task` turns that plan into a full checklist and optional generic target-mode prompt, and the Composite Long-Task Workflow Skill (`/composite-long-task-workflow`) consumes Product / Architecture Source, Technical Realization Plan and Acceptance Checklist directly when Superpowers-backed execution is needed. When the external Technical Realization Plan is already equivalent to a Superpowers-ready Markdown implementation plan, `/composite-long-task-workflow` skips plan generation and binds that plan directly to Superpowers execution through generated `workflow-protocol.md`, `execution-binding.md` and `goal-objective.txt`. When the plan already contains an explicit concrete checklist, `/normal-long-task` reuses that checklist verbatim instead of generating a new one, while keeping the copied plan and checklist as separate temporary files. Test requirements belong to acceptance evidence, not a fourth artifact: required automated tests live in the full checklist, and plan-provided test requirements are preserved there rather than replaced with generic AC10 wording. Local audit may let a future executor resume progress, but it cannot prove completion. Long-task target prompts treat existing local apps, browser sessions, CLI auth and system credential helpers as already user-authorized self-service paths: executors first open the relevant app/page/tool and attempt the existing session, then pause only when login, MFA, permissions or external approval are actually unavailable locally. Superpowers execution evaluates parent-level Product Context Delta and Technical Context Delta, lets slices inherit that decision while checking for newly discovered durable facts, maintains `plan-conformance-matrix.*` for implementation drift and produces `final-acceptance-verdict.*` for AC-by-AC acceptance proof. Superpowers review and finish skills remain useful execution checks, but they cannot override either gate. Each concrete execution slice still follows the repository's Tiny Context workflow contract and any Task Contract or `plan.md` in force.
- Contract Conformance and Context drift checks create a final self-check without storing one-off evidence as long-lived Context.
- `validate-context`, plan validators, tests and package source checks enforce only the boundaries that are appropriate for Minimal Context: recoverability, generated-asset consistency, absence of fake verification claims and self-consistency of temporary plan artifacts. Product behavior remains the responsibility of project tests, CI, smoke, browser evidence, review and human acceptance.

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

- read Context first
- run the page product-positioning check when applicable
- run the role placement scan when creating or reorganizing Context
- compile applicable module design principles, logic and rationale before choosing implementation or verification paths
- classify whether durable facts changed
- for external product, architecture, technical or acceptance-plan inputs, compile Source-to-Context Coverage before implementation
- for high-risk implementation work, compile Context-to-Implementation Binding before handoff
- choose context-first or code-first accordingly
- perform a Context drift check before handoff

The ladder is expected agent behavior, but it remains prompt-level guidance rather than an edit-order validator.

This is a **workflow contract**: a soft, prompt-level order of thought that raises the chance that agents apply upstream principles before editing code. It is not a phase gate, edit-order validator or required document chain. Its value comes from adding short, explicit thinking points inside the existing loop while keeping durable facts in Context; optional plan validators can only reject contradictory temporary artifacts and dangling references.

For product, UI/UX, system design, architecture-boundary, API/Schema, state/runtime and verification-design tasks, the durable-fact classification is folded into a short current-task contract instead of becoming a second independent checkpoint:

```text
read Context / inspect code / understand request
-> compile applicable module design into the current task contract
   - Context Delta: none|required
   - Product Context Delta: none|required (when product/architecture source changes durable product intent)
   - Technical Context Delta: none|required (when technical plan changes durable engineering facts)
   - Architecture Context Hit: architecture / area / contract / Module Design Capsule / none
   - Decision Rationale Hit: existing|required|none
   - Modularity Check: none|required|exception (engineering / RFC / implementation tasks)
   - Applicable Module Design: sources, principles, design logic, rationale and controlled choices
   - Source-to-Context Coverage: source item, durable constraint, Context hit/action, owning Context, coverage status
   - Context-to-Implementation Binding: Context fact, implementation obligation, expected surfaces, implemented paths, forbidden shortcuts, verification path, binding status
   - Task Contract: implementation constraints for this task
-> update Context first when Context Delta is required
-> implement against the Task Contract
-> Contract Conformance + Context drift check
```

Applicable module design is a short gate inside task-contract compilation: list the source Context / Skill principles, state which current implementation or verification choices they control, name the preferred path and name fallback or degraded paths only with their entry conditions. `Architecture Context Hit` and `Decision Rationale Hit` make high-risk architecture and rationale checks explicit without creating new templates, roles or gates. They apply only when a task affects durable architecture/module ownership, API/schema/data contracts, state/runtime semantics, dependency direction, verification/deployment semantics or durable tradeoff rationale; small code tasks stay code-first unless they produce durable facts. A small task is determined by semantic impact, not code size: a one-line schema change can be high-risk, while a broad mechanical style cleanup can stay small. Commands, probes and current implementation shape are execution evidence; they do not independently define the module target. `Product Context Delta` and `Technical Context Delta` are optional sub-judgments for interpreting product/architecture sources and technical implementation plans; either `required` makes the overall `Context Delta: required`. `Context Delta` is the only formal durable-fact decision point inside contract-compilation scenarios, but source packets still require Source-to-Context Coverage so the agent cannot under-scope which durable constraints need Context. Context-to-Implementation Binding is the separate downstream check: once Context is known, the agent must show where high-risk Context constraints land in code, API/UI/runtime surfaces and verification paths. This avoids asking the agent to classify once, then classify again while compiling the task contract. The task contract is a temporary compiled artifact for the current task, not a new source of truth. If Conformance reveals an implementation miss, the code is fixed; if it reveals an incomplete task contract or binding, the contract is revised; if it reveals a missing durable fact or under-scoped source coverage, the agent returns to `Context Delta` and updates Context before continuing.

`Modularity Check` is a maintenance self-check inside engineering / RFC / implementation Task Contracts, not a second contract and not `validate-context`. Its values are `none` when there is no oversized touched-source risk or no new responsibility added to an over-limit file, `required` when decomposition is part of the task's acceptance criteria, and `exception` when an over-limit touched file is not split now and a narrow `<harnessRoot>/config.yaml` modularity waiver records file, category, reason and future split boundary. Newly generated configs default to `modularity.policy: strict_except_generated`; omitted policy remains compatible with old configs and is treated as `scoped_waivers`. `strict_except_generated` rejects waiver config and enforces the limit for touched/PR handwritten source except files already excluded as generated or non-source. The CLI provides facts with `ty-context check-modularity`; `validate-code-modularity` and composite `validate-harness` enforce touched-source findings as a separate maintainability gate, while the agent still chooses `none|required|exception` through module-boundary and decomposition reasoning.

For long tasks, multi-module work, multi-agent work, external product/architecture/technical/acceptance-plan inputs or changes likely to require several verification loops, `plan.md` or an equivalent temporary plan surface holds Source-to-Context Coverage, Context-to-Implementation Binding, the current task contract, implementation steps and Conformance notes as an execution scratchpad. This use is an aid to the workflow contract, not the workflow contract itself. It helps keep `Context Delta`, source coverage, implementation binding, `Task Contract` and Conformance visible while work is in flight, but it must not become a long-lived source of truth, a default project asset, a registered Context node, plan state, stage artifact or work-product tree. Small code tasks must not create `plan.md`, full trace tables, Source-to-Context Coverage or Context-to-Implementation Binding unless they discover durable Context changes, receive an external source packet or expand into high-risk/multi-surface work. Durable facts discovered there must be extracted into `project_context/**` or `DESIGN.md`; otherwise the temporary plan is only execution cache. A temporary plan cannot support a full-source-alignment claim while coverage still contains unresolved `new_context_required`, `needs_user_decision` or `under_scoped` rows, and it cannot support full implementation alignment while binding still contains non-bound rows.

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
- Preserve the Context Priority Ladder in managed guidance: Context read -> page product-positioning check when applicable -> durable-fact classification or `Context Delta` inside task-contract scenarios -> context-first/code-first choice -> drift check.
- Treat task-contract compilation as a light refactor of that workflow contract for higher-risk product, UI/UX and engineering tasks: `Context Delta` replaces a separate durable-fact classification inside those scenarios, `Task Contract` translates upstream principles into task-local constraints, and `Contract Conformance` checks the result before handoff.
- For module design, API/Schema, state/runtime and verification-design work, require the development engineer Skill to compile `Applicable Module Design` before choosing implementation, claim, command, probe or fallback paths.
- For engineering, RFC and implementation work, include `Modularity Check: none|required|exception` in the existing Task Contract; this catches oversized touched files without creating a new validator gate.
- Allow `plan.md` or an equivalent temporary plan surface to assist complex task-contract work as scratch space only; it must serve Context and the workflow contract without becoming either one, and it must not become a restored SDLC plan protocol. `validate-plan-contract` may check that surface for internal consistency, path-reference existence and declared Source-to-Context / Context-to-Implementation binding, but it does not prove product quality.
- Prevent workflow-contract ceremony creep: small code tasks are local implementation tasks with sufficient existing Context and no durable product/architecture/API/runtime/verification/security/surface ownership change; they should not create `plan.md`, full trace tables or plan-contract rows unless that classification changes.
- Allow an explicit `/normal-long-task` Skill for long-running or handoff-heavy plans when the user wants a temporary acceptance target for a plan-like source. It must copy the plan and checklist into `tmp/ty-context/plan-acceptance/**`, reuse any explicit concrete checklist already present in the plan instead of generating a competing checklist, read relevant Context, stop for confirmation when durable assumptions are unclear, and avoid executing the plan or claiming completion. If the generated prompt requires a target-mode local audit, that audit records acceptance progress and blockers only; it must not replace the workflow-contract `plan.md`, Task Contract, Context or project quality proof.
- Allow `/composite-long-task-workflow` to adapt a recommended three-input packet directly when Superpowers-backed execution is requested: Product / Architecture Source, Technical Realization Plan and full Acceptance Checklist. It must not require `/normal-long-task` when those documents already exist, must not perform complexity routing, and must not translate product intent into the technical plan. The external Technical Realization Plan must already satisfy the Superpowers-ready Markdown implementation plan fields; otherwise the Skill stops with a Missing Fields Report before prompt generation. Two-document compatibility is allowed only when the first document explicitly contains both source and technical-plan sections. Missing required input produces a structured Missing Fields Report. Future execution artifacts still live under `tmp/ty-context/plan-acceptance/<plan-slug>/`: `workflow-protocol.md`, `execution-binding.md`, `goal-objective.txt`, `task-state.schema.json`, canonical `task-state.json`, append-only `events.ndjson`, source copies and generated `derived/**` views. `task-state.json` is the only execution state source; generated local audit, plan-conformance matrix, final acceptance verdict, progress ledger, evidence index, context alignment and final summary files are reading views. Complete rows are externally reviewable evidence claims derived from `task-state.evidence[]`, with checklist-derived proof chains, no missing required layers and traceability to fresh evidence.
- Require `/composite-long-task-workflow` inputs to make capability-first delivery boundaries explicit inside the existing three inputs. Product / Architecture Source declares the overall delivery scope, full-population requirement, samples that validate the claim, samples that do not validate it and out-of-scope backlog. Each Technical Realization Plan item declares its own delivery scope, capability target, representative samples, full-population boundary and non-required population. Each Acceptance Checklist item declares acceptance scope, what it validates and does not validate, its sample boundary and whether full population is required. This preserves the three-input authority model while preventing a representative sample, a framework-only implementation or several concrete-object runs from being mistaken for full reusable capability or full-population completion.
- Compile the Superpowers three-input packet through a strict heading-based grammar. Product / Architecture Source remains a single document-level object with fixed fields. Technical Realization Plan definitions are only `## PI-001: ...` / `### PI-001: ...` style headings, and Acceptance Checklist definitions are only `## AC-001: ...` / `### AC-001: ...` headings. Object fields are fixed `key: value`, indented-list or `key: |` blocks scoped to that heading section. Prose, tables, mapping previews, `related_acs` and `related_plan_items` are references, not definitions; legacy `- PI-001: ...` or `- AC-001: ...` list-style definitions with fields are rejected with source-line compile errors rather than being parsed for compatibility.
- Treat strict V2 Product / PI / AC field groups as the canonical three-input contract. Product Source must carry Scope Fit and owner-boundary fields including `scope_fit_decision`, `selected_scope_fit_slice`, `owner_boundary`, `primary_capability_path`, `non_completing_outcomes` and `assertion_policy`; PI items must carry owner, primary capability, trigger, state-transition, observable-result, assertion-support and invalid-shortcut fields; ACs must carry assertion command, artifacts, positive/negative assertions, machine-blocking flag, invalid completion signals and assertion-result requirement. Unknown, duplicate, table or missing canonical fields block compile, and the Skill must not infer or repair them.
- Keep proof-layer names canonical in state: `code`, `api_schema`, `worker_runtime`, `data_artifact`, `integration`, `ui_browser`, `security_redaction`, `all_provider_all_runner`, `cleanup_stale_scan` and `test`. Legacy input aliases may map `runtime -> worker_runtime`, `browser -> ui_browser`, `api -> api_schema`, `data -> data_artifact` and `security -> security_redaction`, but generated state and derived views use canonical names; `code` cannot complete a machine-backed AC by itself.
- Treat `scope_conflict_requires_decision` as the blocking marker when Product / Architecture Source, Technical Realization Plan and Acceptance Checklist disagree between system capability build, representative sample validation and full-population operation. Validators should inspect explicit fields only; they should not infer business scope from prose. Full-population operation is valid when explicitly required by Product Source and Acceptance Checklist, while full population is reported as not in scope when it is not explicitly required.
- Keep plan conformance and acceptance evidence separate. Passing tests or sampled runtime paths do not prove the implementation followed the whole plan; a local audit cannot narrow scope or mark completion; the final verdict cannot replace the implementation-trace matrix.
- Allow `validate-superpowers-state` to check canonical `task-state.json`, source hashes, graph references, evidence/proof-layer consistency, assertion-backed evidence for machine-verifiable layers, negative evidence target proof layers, invalid completion signals, stale evidence, sibling substitution, auditor blockers, derived drift and final completion rules. Allow state-backed `validate-plan-acceptance` to validate generated `derived/plan-conformance-matrix.*`, `derived/final-acceptance-verdict.*` and `derived/evidence-index.json` when `task-state.json` exists, while retaining legacy matrix/verdict validation when no state file exists. Validator `errors` are blocking and drive non-zero exit codes; optional `warnings` and `hygiene` report non-blocking stale prose, unsupported milestone labels and cleanup hints. This keeps temporary acceptance artifacts honest without turning Tiny Context into the project's quality system.
- Elevate lightweight page product-positioning checks into managed AGENTS guidance for Web page, layout and information-placement tasks, and treat the check as input to change classification while keeping the default product/UIUX Skill triggers narrow.
- Keep broad product/UIUX principles as judgment philosophy, then put slightly more concrete reusable prompt questions in the default Skills. Going more specific than that becomes project or business logic and belongs in project Context or project-local Skills.
- Treat high-risk UI categories such as input, selection, search, filters, configuration, scheduling/time, budgets/quotas/limits and feedback states as triggers for thinking, not as a library of fixed control prescriptions.
- Read Context before making durable product, design or engineering judgments; treat `project_context/**` as intended ownership and boundary context, and code as current implementation evidence.
- Keep outputs lightweight: use Context and `DESIGN.md` for durable facts, keep implementation details in code, tests and concise comments when they are self-explanatory there, and keep per-change Context Conformance evidence in handoff / final / PR text rather than Context.
- Keep task contracts out of long-lived Context by default; only their durable `Context Delta` facts are extracted into `project_context/**` or `DESIGN.md`.
- Keep plan acceptance checklists, plan-conformance matrices and final acceptance verdicts out of long-lived Context: they are temporary execution inputs or evidence surfaces, while durable facts discovered through them must be extracted into `project_context/**` or `DESIGN.md`.
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

The ordinary long-task Skill (`/normal-long-task`) exists because long-running work fails most often when the execution target is ambiguous, not when the agent lacks another phase document. Tiny Context deliberately keeps Context read order, Context/code priority and drift checks as prompt-level soft constraints rather than machine-enforced gates. That is usually enough for short tasks, but on long tasks with large context windows, execution drift is expected; the amount of drift grows with task length, complexity and handoff pressure. Superpowers provides execution discipline; `/normal-long-task` provides the ordinary acceptance execution contract that tells that discipline which evidence can and cannot prove completion. The generic goal/target-mode prompt and full acceptance checklist compensate for this specific weakness by externalizing one falsifiable completion target before execution while still avoiding a restored phase workflow:

- It is recommended through explicit `/normal-long-task` invocation instead of broad automatic keyword routing.
- It copies the source plan into `tmp/ty-context/plan-acceptance/**` and writes any full checklist there as temporary execution input, never into `project_context/**`.
- It can consume a two-document upstream input packet from an external planner: `Development Plan / 开发方案` for execution direction and `Acceptance and Tests / 验收清单和测试用例` for target-mode acceptance input. These are source inputs, not proof, and the compiler preserves their source roles when building the checklist and prompt.
- If the source plan contains an explicit concrete acceptance checklist, it copies that checklist verbatim into the separate full-checklist file instead of deriving, strengthening, reordering, translating or adding acceptance items.
- For two-document input, strict mode applies. The acceptance-and-tests document is reused directly only when it is already complete enough for target-mode execution; otherwise the compiler preserves both inputs, reports missing required fields and stops without generating a checklist or goal/target prompt.
- If the source plan contains explicit test requirements, it treats them as plan-provided acceptance evidence inside the full checklist. Test requirements belong to acceptance evidence, not a fourth artifact, so the Skill does not create `<plan-slug>-test-requirements.md`.
- It combines the plan, relevant Context and real repository surfaces into falsifiable acceptance items with explicit evidence and invalidation rules.
- Its generated full checklist includes `Required automated tests / 必须新增或补强的自动化测试` when tests are required, recording test file path, test name or behavior description, covered acceptance item, verification command and failure condition. If exact test names are unsafe to infer, behavior-level descriptions are used instead of invented names.
- Its full checklist is the complete acceptance standard for target-mode execution. Compact prompt summaries can repeat high-priority items for recovery, but they do not override checklist details.
- Its generated generic goal/target prompt preserves plan/checklist/audit paths, local-audit semantics, state-machine rules, invalid evidence and hard-blocker rules, but it does not bind the external Superpowers workflow.
- Its generated goal/target prompt may require a local audit under `tmp/ty-context/plan-acceptance/**` for long-running execution recovery. The audit records overall status, per-AC evidence, commands, artifacts, blockers, invalid evidence and each required test's command, result and failure reason, but cannot prove completion by itself.
- Its current-state discipline starts ACs as `unknown / not_run`; fresh required evidence is required for `complete`, and fresh browser / API / runtime / data / test contradiction invalidates prior completion claims and downgrades affected AC and overall status.
- For UI-facing acceptance, component/viewmodel/mock/unit evidence is auxiliary unless the real page path and user-visible state match the full checklist requirement.
- It keeps target-mode acceptance progress above per-turn execution: when an executor works any acceptance item, the executor still follows the project's Tiny Context workflow contract, including Context reads, `Context Delta` handling, Task Contracts and workflow-contract `plan.md` when applicable.
- It uses a confirmation gate when the plan would silently encode new durable product, architecture, API, state, security or verification assumptions.
- It treats unresolved required blockers as non-completion: blocked-external or hard-blocked acceptance items keep their missing evidence and required user/external action, and if no executable core work remains except hard blockers, the future executor pauses for the user instead of marking the goal complete.
- It deliberately performs only one acceptance-standard pass; it does not execute the plan, become a task planner or workflow engine, manage global task state, run long validations, prove completion or revive stage gates.
- Its business logic must remain generic. Domain-specific acceptance rules come from the current plan and project Context during invocation, or from project-local Skills.

The Composite Long-Task Workflow Skill (`/composite-long-task-workflow`) is a separate adapter for a recommended three-input packet. Its design purpose is to strengthen the workflow constraints for complex long-running execution without restoring old lifecycle phases or replacing Superpowers. The extra Tiny Context gates exist because Superpowers alone can still drift under long-running execution pressure. Superpowers strengthens execution discipline, but it does not by itself preserve source authority, prevent scope shrinkage, prove full conformance to the Technical Realization Plan, or enforce AC-by-AC evidence against the Acceptance Checklist:

- It is recommended through explicit `/composite-long-task-workflow` invocation when Product / Architecture Source, Technical Realization Plan and Acceptance Checklist already exist and the next step needs Superpowers-backed execution. It does not perform complexity routing; invocation means composite long-task execution was already selected.
- Its expected runtime effect is an explicit fusion order rather than a request for the agent to improvise: apply the Tiny Context Workflow Contract, confirm the three upstream source authorities, compile `task-state.json`, enter Superpowers implementation slices, update canonical state/evidence, derive reading views, run slice/epoch gates and compute final completion only through final gate. This makes the workflow adjacent to the Workflow Contract but not identical to it.
- It is Tiny Context's adapter layer for Superpowers workflows, aligned to the official Superpowers skills while remaining a Tiny Context-owned adapter rather than an upstream-owned schema.
- It may wrap Superpowers with Tiny Context authority, conformance and acceptance gates, but it must not redefine, duplicate or fork official Superpowers execution mechanics. If a future Tiny Context-added step would conflict with, duplicate or override an official Superpowers responsibility, maintainers should stop and surface the boundary conflict instead of silently merging the workflows.
- It does not require `/normal-long-task` when the three documents already exist, and two-document compatibility requires the first document to explicitly contain both Product / Architecture Source and Technical Realization Plan sections.
- It does not generate, derive or infer the Technical Realization Plan. If the user supplies only product/architecture intent and a checklist, it stops for a missing technical plan.
- It stops with a structured Missing Fields Report when required three-input fields are missing: original requirement source, durable product/architecture intent when applicable, traceable Technical Realization Plan items, expected surfaces when applicable, explicit non-completing shortcuts when applicable, full checklist, required evidence, verification methods, fail conditions, required tests or explicit test scope, core paths or explicit non-UI/runtime scope, state-machine rules, invalid evidence rules, UI-facing gate and blockers.
- Its authority model is fixed: Product / Architecture Source owns scope, Technical Realization Plan owns plan conformance and Acceptance Checklist owns acceptance. Audit, matrix, verdict, validator output, optional proof index and auditor report cannot rewrite those upstream sources.
- Its required fields distinguish building reusable system capability, validating representative samples, operating on a full population and explicitly backlogging non-required population. The state kernel compiles these explicit fields into `delivery.product_architecture_scope`, `delivery.scope_conflicts`, plan item delivery fields, AC acceptance fields and progress accounting for system capability, representative samples, real-object coverage and full-population operation.
- It emits a visible Superpowers input packet and execution binding only after the Technical Realization Plan passes the required executable-plan input checks: install Superpowers through the current platform's official path when missing; record installation blockers in the local audit rather than treating them as completion; map Product / Architecture Source, Technical Realization Plan, full checklist, local audit, Context and required tests/core paths into execution roles; evaluate Product Context Delta and Technical Context Delta before implementation; bind the accepted Technical Realization Plan directly to `superpowers:subagent-driven-development` when subagents are available or `superpowers:executing-plans` otherwise; route plan/AC behavior gaps to TDD with `superpowers:test-driven-development`; and use `superpowers:verification-before-completion` before any completion claim.
- It requires `task-state.schema.json`, canonical `task-state.json`, append-only `events.ndjson`, source copies and generated `derived/**` views under the plan-acceptance workdir. `task-state.json` compiles Product / Architecture Source, Technical Realization Plan and Acceptance Checklist into source hashes, graph nodes, AC proof layers, evidence records, gate state and progress counters.
- It requires structured `slice-delta.json` entries for non-trivial execution slices. Each delta records slice identity, missing layer classes, touched plan/AC ids, commands, artifacts, runtime or browser evidence, what the slice proves, what it explicitly does not prove, closed and remaining missing layers, cleanup status, redaction/security status, freshness and `progress_value`. Default slice sizing groups 2-4 strongly related missing layers that share an AC, runtime scenario, proof environment or verification path; single-gap slices are reserved for blockers, contradictions or tiny metadata cleanup.
- It requires generated `derived/plan-conformance-matrix.*` views to answer whether implementation followed the Technical Realization Plan across code, API/schema, UI/page, worker/runtime, artifact, data, tests and evidence. Surface/IA/architecture-migration rows carry declared owner surface, required user paths, forbidden primary surfaces, real page evidence, assertion status, negative evidence findings, negative checks and Context fact refs when applicable. Status values distinguish `complete`, `partial`, `sampled_only`, `not_implemented`, `blocked`, `scope_changed_requires_user_approval`, `contradicted_by_current_state` and `out_of_scope_NA`.
- It requires generated `derived/final-acceptance-verdict.*` views at the final gate. This verdict judges each AC as `complete`, `partial`, `blocked`, `not_run`, `invalidated` or explicit `out_of_scope_NA` using fresh evidence, assertion-backed required proof layers and current contradictions. Complete AC rows must be externally reviewable: they expose the checklist-derived required proof chain, fresh evidence, assertion status, blocking assertion failures, negative evidence findings, missing required layers, drift severity, sibling-substitution state and any independent auditor finding when those fields are applicable. Matrix and verdict rows are generated views; they may summarize assertion status but cannot replace assertion execution.
- Before any completion claim, the future executor may derive views, run `superpowers:verification-before-completion`, run `ty-context validate-superpowers-state <dir>` and state-backed `ty-context validate-plan-acceptance <dir>`, use a read-only auditor when available and remove stale/overclaim wording. Those checks are execution hygiene, not proof authority. The actual completion decision is `ty-context composite-long-task final-gate <dir>`, which invokes the Trusted Evidence Kernel and applies the fixed recompute order over current attempt identity, source hashes, command specs/runs, registered EvidenceRecordV2 rows, stale evidence, contradictions, under-specified ACs, AC-010 bootstrap prevention, Harness Drift Lock and protected baseline state. Agents must not hand-set `product_goal_complete`. Superpowers review and verification remain useful execution checks, but they cannot override Tiny Context gates: passing Superpowers review, validators, auditor prose or generated views does not by itself prove plan conformance or checklist acceptance. The validators remain structural consistency checks and do not prove product quality.
- Local audit remains a process log: it may record candidate status, Context Delta decisions, evidence, blockers and invalidating evidence, but it cannot narrow source/plan/checklist scope or mark final completion.
- Overall completion requires the kernel-computed state to prove every required PI/AC with current assertion-backed evidence: no blocking implementation drift, no missing required proof layers, no under-specified machine AC, no stale artifact, no newer contradiction, no AC-010 bootstrap substitution, no harness drift violation, no protected-baseline product-task change, no unapproved sibling substitution and no blocking auditor gap when the subagent audit is available. Generated final verdict and matrix rows display that state but do not create it.
- Its final wording separates `audit_task_complete`, `acceptance_target_status` and `product_goal_complete`. A Superpowers implementation / execution Goal mode objective is complete only at `product_goal_complete=true`; a completed audit workflow or generated verdict is not product completion. A deliberately read-only audit / reporting goal may end at `audit_task_complete`, but when the verdict is not accepted/complete final responses must say `Audit workflow completed; acceptance target not complete.`, include available AC counts and avoid unqualified `Goal achieved` or treating `update_goal(status="complete")` as acceptance of the user target.
- It does not generate the technical plan, does not generate or repair the checklist and does not execute the plan; it only makes the Superpowers-specific target prompt explicit.

The Harness upgrade Skill exists because existing consumer projects need a short, repeatable procedure after package updates:

- It triggers on explicit Tiny Context / Project Tiny Context Harness upgrade requests, including English requests such as `upgrade Tiny Context` and `use the Tiny Context upgrade skill to upgrade this project`; Chinese trigger examples are compatibility-only additions.
- It treats `ty-context upgrade` as the default command after an npm package update and for explicit upgrade requests. `sync-only` release mode only means direct `sync` is an allowed managed-asset refresh shortcut, not the default upgrade path.
- It tells agents to handle only migration-scoped `manual_required` / `blocked` follow-up and to use `context.toml`, role placement scan and existing project Context rather than guessing business semantics.
- It is package-managed guidance for operating the Harness, not a project-local product/design/development customization surface.

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
- `<harnessRoot>/skills/context_surface_contract/SKILL.md`
- `<harnessRoot>/skills/context_full_project_export/SKILL.md`
- `<harnessRoot>/skills/context_harness_upgrade/SKILL.md`
- `<harnessRoot>/skills/normal-long-task/SKILL.md`
- `<harnessRoot>/skills/composite-long-task-workflow/SKILL.md`
- `<harnessRoot>/ty-context-managed/context_templates/**`
- `<harnessRoot>/ty-context-managed/make/ty-context.mk`
- `tools/**`
- `.github/workflows/harness.yml` when absent or managed

The package-managed `.github/workflows/harness.yml` is a consumer project workflow. It installs the Node runtime required by the Harness CLI and runs the selected `validate-context`, `validate-code-modularity` or composite `validate-harness` Make target. For pull requests it provides `TY_CONTEXT_MODULARITY_BASE` so the modularity target audits PR/base changes instead of full historical debt. Maintainer-only checks for this source repository, such as `npm test --workspace project-tiny-context-harness` and package source-drift checks, must live in separate source-repository CI and must not be copied into consumer projects.

`init` does not create business Product Surface Contract files, `.work_products/**`, lifecycle state, plan state, stage skills, stage templates or stage policies by default.

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

`check-modularity` audits selected handwritten source files for physical line-count risk. It is warning-only by default as a report command and supports `--fail-on-warning`; `validate-code-modularity` and composite `validate-harness` use that hard mode for touched/PR handwritten source. New generated config files set `modularity.policy: strict_except_generated` for strict enforcement that still auto-skips generated or non-source files; omitted policy remains `scoped_waivers` for compatibility. Valid `scoped_waivers` exceptions live in `<harnessRoot>/config.yaml` `modularity.waivers` with `path`, one of `generated`, `third_party_reference`, `legacy_migration`, `aggregate_styles` or `fixture_snapshot`, plus `reason` and `future_split_boundary`; `strict_except_generated` rejects any waiver config. It does not infer semantic module quality or replace the development engineer Skill's split-or-exception judgment.

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
