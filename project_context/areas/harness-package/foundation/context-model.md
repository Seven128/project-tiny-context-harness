---
context_role: foundation
read_policy: default
---
# Harness Context Model

## Role

This foundation Context defines the durable vocabulary and fact-source priority for the Project Tiny Context Harness source workspace. Read it before changing Context roles, durable fact placement, fact-source authority, Context/code/evidence priority or the meaning of Minimal Context recovery.

## Core Terms

- Harness is the portable managed guidance, Context templates, default Skills and validators that shape expected agent behavior; it does not own project quality or ordinary task execution state.
- Context is durable project fact stored in `project_context/**` or `DESIGN.md` so future agents can recover intent, ownership, boundaries and repeat-execution paths.
- Minimal Context is the durable fact layer: the smallest repo-owned facts needed to recover project intent, ownership, boundaries and repeat-execution paths.
- Workflow Contract is the default agent behavior layer: read the minimum relevant Context, decide one `Context Delta: none|required`, update durable facts first when required, use the agent's internal planning, implement, run project-owned verification, then perform Contract Conformance and Context drift check.
- Tiny Context has three cooperating capabilities: Minimal Context owns durable facts; Workflow Contract owns the lightweight default behavior; explicitly enabled Long-Task Workflow owns one Canonical Delivery Contract and verifier-derived current-snapshot completion authority for a platform-native Goal.
- Repo-owned intent layer is the durable project fact surface that tells agents which product, architecture, ownership and dependency facts outrank current-code convenience.
- Durable facts include product/domain ownership, surface responsibility, information architecture, API/schema semantics, state/runtime/recovery semantics, cross-domain boundaries, security boundaries and repeatable verification/deployment paths.
- Workflow Contract is prompt-level order of thought, not a validator, phase gate, artifact schema, edit-order gate or long-task detector.
- Internal plan means the agent's current reasoning about goal, boundaries, controlling Context, implementation surfaces and verification. It has no mandatory file, name or schema.
- Small code task means a local implementation task where existing Context is sufficient and the change does not alter durable product, architecture, API/schema/data, runtime/state/recovery, verification/deployment, security/redaction or surface-ownership facts. It is not defined by lines changed.
- Architecture Context Hit and Decision Rationale Hit are internal routing questions for high-risk work; they do not create additional deltas, Context roles, files or validators.
- Source-to-Context judgment is the internal classification of each external product, architecture, technical or acceptance constraint as covered, requiring a Context update, task-local, explicitly out of scope or requiring a user decision. It is required thinking, not a Markdown table.
- Context-to-Implementation alignment is checked during Conformance by asking whether controlling Context actually reached the correct modules, surfaces, APIs, state machines and verification paths and whether forbidden shortcuts were avoided. It is not a Markdown table.
- Scratch files are optional, user/agent-owned temporary memory. They have no fixed name or schema, are not Context or completion proof, are not registered in `context.toml`, and never become Workflow or Long-Task authority.
- One root V2 `delivery-contract.yaml` (optionally with Outcome fragments) is explicit long-task authoring authority. Original sources are provenance; compiled cache, per-Check progress, receipts and status are verifier-owned temporary audit/recovery state, never Context or acceptance authority.
- Conformance is a handoff self-check against relevant Context and current task constraints. It creates delivery evidence, not durable Context by itself.

## Fact-Source Authority

- `project_context/**` is authoritative for ownership, responsibility, architecture boundaries, integration direction, dependency constraints and repeatable verification/deployment paths.
- `DESIGN.md` is authoritative for durable visual design-system facts when a project uses it.
- Foundation, contract, decision-rationale, architecture, verification and deployment Context interpret current implementation paths before code convenience is allowed to redefine product or architecture intent.
- Code is current implementation evidence. It shows what is implemented now but cannot silently redefine intended product, architecture or ownership.
- Tests, smoke checks, CI, review, hidden probes and human acceptance prove product quality. Context can identify repeatable verification paths, but neither Context nor Harness validators claim that behavior passed.
- `PROJECT_SPEC.md` owns the full Harness design explanation and historical rationale in this source workspace. Role Context keeps only high-frequency durable facts.
- Agent internal plans are current execution state only. Existing `plan.md`, matrices, verdicts or other user files have no implicit authority.
- Explicit Long-Task authority is: one complete source V2 Contract (with `outcome_files` only as physical compatibility); generated Source/REQ/CTRL/OBL/AC coverage; immutable initial base and protected authority hashes; targeted per-Check repair progress; a common-dir Active Authority V3 record containing the complete compiled snapshot plus a task/revision/identity Git-config marker; and a source-recompiled same-snapshot Live Final Gate run by final-gate, Stop or close. The workdir compiled file is never previous-authority or baseline authority.

## Priority When Sources Disagree

1. Treat Context as the intended target for ownership, boundaries, contracts and repeat-execution paths.
2. Let principle-like Context roles interpret current-code convenience.
3. Treat code as evidence of current state.
4. Treat tests and external evidence as proof only for the claims they exercise.
5. Treat an existing `plan.md`, matrix, verdict, local audit or prose completion claim as ordinary user/task data unless an explicitly invoked Skill owns it.
6. If Context and code disagree, report implementation drift, missing work or stale Context; do not silently replace intended facts with code shape.
7. If a task discovers a missing durable fact, set `Context Delta: required` and update the owning Context before implementation continues.

## Role Placement

- `area` / `domain` owns product or package responsibility.
- `subdomain` owns a smaller product/domain slice.
- `contract` owns API, schema, event, workflow or cross-surface interface semantics.
- `foundation` owns stable concepts, vocabulary and theory.
- `verification` owns repeatable test, smoke, CI, probe and validation paths.
- `deployment` owns repeatable deploy, runtime bootstrap, topology, health-check and rollback/degradation paths.
- `implementation-index` owns code navigation entry points, not behavior definitions.
- `decision-rationale` owns stable reasons that still affect future choices.
- `archive` owns non-default historical or external material.

## Evidence Boundaries

- Do not store one-off logs, command output, screenshots, CI artifacts, release ledgers, temporary JSON, raw payloads, secrets, tokens, cookies or result claims in Context.
- Do not copy full implementation summaries into Context when code, tests or comments are clearer.
- Do not invent rationale from current code shape.
- Do not register scratch files, exported source packs, Delivery Contracts, optional source provenance, compiled long-task state or verification runs in `project_context/context.toml`.
- Do not require or validate a fixed `plan.md`, Source-to-Context table, Context-to-Implementation table, matrix, verdict or evidence ledger for the default workflow.
- Use Context to shorten future recovery and guide decisions; use code/tests/runtime evidence to prove current behavior.
