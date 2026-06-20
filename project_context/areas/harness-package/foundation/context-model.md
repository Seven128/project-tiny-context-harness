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
- Durable facts are facts expected to guide later work, including product/domain ownership, surface responsibility, information architecture, API/schema semantics, state/runtime semantics, cross-domain boundaries and verification/deployment paths.
- Workflow contract is prompt-level order of thought for handling Context, code, tests, temporary plans and one-off evidence in the right authority order. It is not a validator, phase gate or machine-enforced edit-order gate.
- Task Contract is a temporary task-local compilation of relevant Context and principles into implementation constraints. It is not durable Context by default.
- Temporary plan surfaces and target-mode local audits are execution cache. They may expose state for a running task, but they are not Context, product-quality proof or global task management.
- Conformance is a handoff self-check against the relevant Context and task contract. It creates delivery evidence, not durable Context by itself.

## Fact-Source Authority

- `project_context/**` is the intended fact source for ownership, responsibility, architecture boundaries, integration direction, dependency constraints and verification/deployment entry paths.
- `DESIGN.md` is the intended fact source for durable visual design-system facts when a project uses it.
- Code is current implementation evidence. It shows what is implemented now, but it must not silently redefine intended product, architecture or Context ownership.
- Tests, smoke checks, CI, review, hidden probes and human acceptance prove product quality. Context can point to repeatable verification paths, but it must not claim that a run already succeeded.
- `PROJECT_SPEC.md` owns the full Harness design explanation and historical rationale in this source workspace. Role Context keeps the recoverable, high-frequency facts extracted from that spec.

## Priority When Sources Disagree

1. Treat Context as the intended target for ownership, boundaries, contracts and repeat-execution paths.
2. Treat code as evidence of current state.
3. Treat tests and external evidence as proof only for the claims they actually exercise.
4. If Context and code disagree, call it implementation drift, missing work or stale Context. Do not let current code shape silently replace intended facts.
5. If a task discovers a missing durable fact, update the owning Context before continuing implementation when `Context Delta: required`.

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

## Evidence Boundaries

- Do not store one-off logs, command output, screenshots, CI artifacts, release ledgers, temporary JSON, raw payloads, secrets, tokens, cookies or test result claims in Context.
- Do not copy full implementation summaries into Context when code, tests or comments are clearer.
- Do not register temporary exports, local audits, generated acceptance checklists or plan files in `project_context/context.toml`.
- Use Context to shorten future recovery and guide decisions; use code/tests/runtime evidence to prove current behavior.
