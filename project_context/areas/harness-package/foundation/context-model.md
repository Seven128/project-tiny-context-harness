---
context_role: foundation
read_policy: default
---
# Harness Context Model

## Role

This foundation Context defines the durable vocabulary and fact-source priority for the Project Tiny Context Harness source workspace. Read it before changing Context roles, durable fact placement, fact-source authority, Context/code/evidence priority or the meaning of Minimal Context recovery.

## Core Terms

- Harness is the managed guidance, Context templates, default Skills, validators and source-sync checks that shape expected agent behavior; it is not a workflow engine.
- Context is durable project fact stored in `project_context/**` or `DESIGN.md` so future agents can recover intent, ownership, boundaries and repeat-execution paths.
- Minimal Context defines the durable fact layer: the smallest repo-owned facts needed to recover project intent, ownership, boundaries and repeat-execution paths.
- Workflow Contract defines the agent behavior layer: Context Priority Ladder, `Context Delta`, Task Contract, temporary `plan.md` / equivalent plan surfaces, Source-to-Context Coverage, Context-to-Implementation Binding, Contract Conformance and Context drift check. It tells agents how to read, update, implement and verify against Minimal Context.
- Tiny Context relies on both layers. Minimal Context answers what the long-lived fact sources are; Workflow Contract answers how agents must use those sources when current code, external plans, temporary evidence or implementation convenience disagree.
- Repo-owned intent layer is the durable project fact surface that tells agents which product, architecture, ownership and dependency facts outrank current-code convenience. It is the layer that answers whether an apparently available implementation path is allowed project intent.
- Durable facts are facts expected to guide later work, including product/domain ownership, surface responsibility, information architecture, API/schema semantics, state/runtime semantics, cross-domain boundaries and verification/deployment paths.
- Workflow contract is prompt-level order of thought for handling Context, code, tests, temporary plans and one-off evidence in the right authority order. It is not a validator, phase gate or machine-enforced edit-order gate.
- Task Contract is a temporary task-local compilation of relevant Context and principles into implementation constraints. It is not durable Context by default.
- Small code task means a local implementation task where existing Context is sufficient and the change does not alter durable product, architecture, API/schema/data, runtime/state/recovery, verification/deployment, security/redaction or surface-ownership facts. It is not defined by lines changed.
- Architecture Context Hit and Decision Rationale Hit are task-local fields for high-risk Task Contracts. They name controlling Context and rationale state; they do not create architecture/rationale deltas, a second durable-fact gate, a Context role or a verification entry.
- Temporary plan surfaces and target-mode local audits are execution cache. They may expose state for a running task, but they are not Context, product-quality proof or global task management.
- Source-to-Context Coverage is a task-local table, usually in `plan.md` or an equivalent temporary plan surface, that maps external product, architecture, technical or acceptance-plan constraints to existing Context hits, Context actions and owning Context files. It is used to prevent under-scoped Context updates before code work and must not include implementation paths.
- Context-to-Implementation Binding is a task-local table that maps Context facts and Task Contract constraints to implementation obligations, expected surfaces, implemented paths, forbidden shortcuts, verification paths and binding status. It is used to prevent Context-to-code drift after Context has been read or updated.
- Plan validators are optional Harness CLI checks for temporary workflow artifacts. They check internal consistency, evidence-reference existence and declared surface/architecture binding consistency; they do not prove product quality.
- Conformance is a handoff self-check against the relevant Context and task contract. It creates delivery evidence, not durable Context by itself.

## Fact-Source Authority

- `project_context/**` is the intended fact source for ownership, responsibility, architecture boundaries, integration direction, dependency constraints and verification/deployment entry paths.
- `DESIGN.md` is the intended fact source for durable visual design-system facts when a project uses it.
- Foundation, contract, decision-rationale, architecture, verification and deployment Context interpret the meaning and priority of current implementation paths. They are read before letting current code shape redefine product, architecture, surface, runtime or verification intent.
- Code is current implementation evidence. It shows what is implemented now, but it must not silently redefine intended product, architecture or Context ownership.
- Tests, smoke checks, CI, review, hidden probes and human acceptance prove product quality. Context can point to repeatable verification paths, and plan validators can reject contradictory proof artifacts, but neither Context nor Harness validators claim that a product behavior actually passed.
- `PROJECT_SPEC.md` owns the full Harness design explanation and historical rationale in this source workspace. Role Context keeps the recoverable, high-frequency facts extracted from that spec.

## Priority When Sources Disagree

1. Treat Context as the intended target for ownership, boundaries, contracts and repeat-execution paths.
2. Treat principle-like Context roles such as `foundation`, `contract`, `decision-rationale`, `architecture`, `verification` and `deployment` as controlling interpretation before following current-code convenience.
3. Treat code as evidence of current state.
4. Treat tests and external evidence as proof only for the claims they actually exercise.
5. If Context and code disagree, call it implementation drift, missing work or stale Context. Do not let current code shape silently replace intended facts.
6. If a task discovers a missing durable fact, update the owning Context before continuing implementation when `Context Delta: required`.

## Role Placement

- `area` / `domain` Context owns product or package responsibility.
- `subdomain` Context owns a smaller product/domain slice.
- `contract` Context owns API, schema, event, workflow or interface semantics across implementation surfaces.
- `foundation` Context owns stable concepts, vocabulary and theory used to interpret other Context.
- `verification` Context owns repeatable test, smoke, CI, probe and validation paths.
- `deployment` Context owns repeatable deploy, runtime bootstrap, topology, health-check and rollback/degradation paths.
- `implementation-index` Context owns code navigation entry points, not behavior definitions.
- `decision-rationale` Context owns stable reasons that still affect future choices.
- `archive` Context owns non-default historical or external material.

## Task Field Placement

- `workflow-contract` records how task-local fields such as `Architecture Context Hit`, `Decision Rationale Hit`, `Context Delta` and `Modularity Check` are used during a task.
- `workflow-contract` also records when high-risk source inputs need Source-to-Context Coverage and when high-risk implementation work needs Context-to-Implementation Binding in `plan.md` or an equivalent temporary plan surface.
- `decision-rationale` records stable reasons for adopting or rejecting mechanisms when those reasons still affect future implementation or verification choices.
- The field names `Architecture Context Hit` and `Decision Rationale Hit` are not durable fact types and do not require entries in `project_context/context.toml`; use the existing owning Context role for the fact being recorded.

## Evidence Boundaries

- Do not store one-off logs, command output, screenshots, CI artifacts, release ledgers, temporary JSON, raw payloads, secrets, tokens, cookies or test result claims in Context.
- Do not copy full implementation summaries into Context when code, tests or comments are clearer.
- Do not invent rationale. Stable rationale may record rejected alternatives or tradeoffs when they affect future choices, but not PR notes, debug history, agent reasoning or reasons inferred only from current code shape.
- Do not register temporary exports, local audits, generated acceptance checklists, plan-conformance matrices, final acceptance verdicts or plan files in `project_context/context.toml`.
- Use Context to shorten future recovery and guide decisions; use code/tests/runtime evidence to prove current behavior.
