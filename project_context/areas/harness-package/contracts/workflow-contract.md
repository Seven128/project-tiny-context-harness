---
context_role: contract
read_policy: default
---
# Harness Workflow Contract

## Role

This contract defines the prompt-level workflow expected when maintaining Project Tiny Context Harness. Read it before changing context-first rules, Task Contract behavior, temporary plan surfaces, target-mode local audits, Contract Conformance or the Context Priority Ladder.

## Context Priority Ladder

For durable product, architecture, package-boundary, API/schema, state/runtime, verification-design or Context-topology work, expected agent order is:

1. Read `project_context/global.md`, `project_context/architecture.md`, `project_context/context.toml` and relevant area/role Context.
2. For product surfaces or information-placement work, run the lightweight product/page positioning check before narrowing to code.
3. For Context authoring or migration, run the role placement scan before choosing `area`, `contract`, `foundation`, `verification`, `implementation-index`, `decision-rationale` or another role.
4. Compile applicable module design and constraints before selecting implementation or verification paths.
5. Classify durable-fact impact, or use `Context Delta` inside Task Contract scenarios.
6. Use context-first when durable facts change; use code-first only for ordinary bug fixes, local styling, drift repair, test fixes or spikes unless they produce a durable fact.
7. Before handoff, run Contract Conformance when applicable and a Context drift check.

The ladder is expected agent behavior. It must not become a validator, phase gate, required document chain or machine-enforced edit-order gate.

## Context Delta And Task Contract

- `Context Delta: required` means the current task changes durable facts and the relevant `project_context/**` or `DESIGN.md` facts are updated before implementation continues.
- `Context Delta: none` means implementation proceeds against existing Context.
- Task Contract is task-local and temporary. It should identify goal, boundary, owner, dependencies, state, failure/retry/recovery, security, non-goals, verification path and applicable module design.
- Engineering, RFC and implementation Task Contracts include `Modularity Check: none|required|exception` so oversized touched files are handled inside the existing contract, not as a separate workflow type.
- Task Contract is not a source of truth and is not stored in `project_context/**` by default. Only durable facts discovered through it are extracted into Context.

## Temporary Plan Surface

- `plan.md` or an equivalent temporary plan surface may hold `Context Delta`, Task Contract, implementation steps and Conformance notes for long or multi-module work.
- The plan surface serves the workflow contract and Context; it does not replace either.
- Temporary plan surfaces must not become default project assets, plan state, stage artifacts, work-product trees or registered `context.toml` nodes.
- Durable facts discovered while using a plan surface must be extracted into `project_context/**` or `DESIGN.md`; ordinary execution details stay temporary.

## Target-Mode Local Audit

- Target-mode local audit artifacts live under `tmp/ty-context/plan-acceptance/**` when a generated goal/target prompt asks for them.
- A local audit records acceptance progress, current evidence, commands, blockers, missing evidence, deferred scope and invalid/stale evidence for one long-running objective.
- A target-mode local audit does not replace Task Contract or workflow-contract `plan.md`.
- A local audit is not Context, not product-quality proof, not a global task manager and not a substitute for tests, CI, review, human acceptance or the repository's Tiny Context workflow contract.
- When target-mode execution works through an acceptance item, each concrete execution slice still follows current Context, `Context Delta`, Task Contract and any workflow-contract `plan.md` in force.

## Product Surface Contract Boundary

- Product Surface Contract workflow turns broad page/UI/product positioning principles into project-owned Context for a user-facing surface.
- The workflow is agent-mediated and prompt-level. `init` and `upgrade` install or refresh generic Skill/template support, but they do not infer or create business surface contract files.
- Surface contracts use existing Context roles such as `contract`, `area`, `subdomain`, `verification`, `decision-rationale` and `implementation-index`. Do not add surface-specific roles or validator gates.

## Plan Acceptance Checklist Boundary

- The plan acceptance checklist compiler is a pre-execution acceptance-standard pass for a user-provided plan-like source.
- It materializes temporary plan/checklist artifacts under `tmp/ty-context/plan-acceptance/**`, reads relevant Context and outputs a goal/target prompt.
- It does not execute the plan, prove completion, own durable task state, replace Task Contract/workflow-contract `plan.md`, or store acceptance evidence as Context.
- Hard blockers in a generated checklist remain non-completion until the missing evidence or user/external action exists.

## Contract Conformance

- Contract Conformance compares implementation against relevant Context, Task Contract and durable boundaries before handoff.
- Implementation misses are fixed in code.
- Task Contract omissions return to the Task Contract while work is active.
- Missing durable facts return to `Context Delta: required` and Context-first handling.
- Conformance evidence belongs in handoff/final/PR text. Do not store one-off proof, screenshots, logs or test output in Context.

## Non-Goals

- Do not restore PRD/UX/tech-plan/review/test/release document chains as default workflow.
- Do not restore lifecycle phases, phase gates, plan state, stage Skills or `.work_products/**`.
- Do not make edit order a `validate-context` requirement. Automation may warn about possible context-first drift, but should not block only because of edit order.
