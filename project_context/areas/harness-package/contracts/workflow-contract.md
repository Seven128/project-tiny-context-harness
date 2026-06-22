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
- High-risk product, design and engineering Task Contracts that affect durable architecture/module ownership, API/schema/data contracts, state/runtime semantics, dependency direction, verification/deployment semantics or durable tradeoff rationale also name `Architecture Context Hit` and `Decision Rationale Hit: existing|required|none`.
- `Architecture Context Hit` is Context routing for the current decision. It names the architecture, area, contract, foundation, decision-rationale or verification/deployment Context that controls the task; it is not an architecture quality judgment.
- `Decision Rationale Hit` is a rationale coverage state, not a requirement to write a reason every time: `existing` means current Context already explains the durable reason, `required` means the task creates or changes durable rationale and must use `Context Delta: required`, and `none` means no stable rationale is needed.
- Missing durable architecture or rationale facts have only one workflow action: return to `Context Delta: required` and update the owning Context. Do not create Architecture Delta, Rationale Delta, a validator gate, an edit-order gate, a new Context role or a default rationale file.
- Engineering, RFC and implementation Task Contracts include `Modularity Check: none|required|exception` so oversized touched files are handled inside the existing contract, not as a separate workflow type.
- `Modularity Check` covers physical maintainability risk in touched handwritten source, including file size, split need or an explicit waiver. It does not replace ownership, dependency, API/schema, state/runtime or verification-design judgment.
- Ordinary bug fixes, local styling, small refactors, package/release chores, test repairs and spikes stay code-first unless they produce durable facts; oversized touched files remain `Modularity Check` concerns, not architecture/rationale triggers.
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
- It supports a two-document upstream input packet when the user provides both `Development Plan / 开发方案` and `Acceptance and Tests / 验收清单和测试用例`. The first document is execution direction; the second is target-mode acceptance input. Both are preserved source input, not proof.
- The compiler maps two-document input into Superpowers input boundary semantics: the development plan feeds plan execution and possible `writing-plans`, while the acceptance-and-tests packet feeds checklist authority, TDD gaps, required verification and completion gates.
- If the source plan contains an explicit concrete acceptance checklist, the compiler reuses that plan-provided checklist verbatim as the full checklist instead of generating a new one.
- For a two-document upstream input packet, the acceptance-and-tests document is reused as the full checklist only when it already contains AC ID, scope, required evidence, verification method, fail condition, state-machine rules and invalid evidence rules; otherwise it becomes source material for a generated checklist that fills or marks gaps.
- Test requirements belong to acceptance evidence, not a fourth artifact. The full checklist may contain a `Required automated tests / 必须新增或补强的自动化测试` section, but the compiler must not create a separate `<plan-slug>-test-requirements.md` file.
- If the source plan contains explicit test requirements, those requirements are plan-provided acceptance evidence and should be preserved in the full checklist rather than replaced with generic AC10 wording or an unrelated test list.
- The materialized plan and full checklist remain separate files even when the checklist originally appeared inside the plan.
- The generated goal/target prompt uses a conservative 3850-character effective maximum, including line breaks, so it stays below Codex's 4000-character practical paste boundary after small counting differences.
- The compiler guidance must preserve required plan/checklist/audit paths and all core acceptance categories while fitting the 3850-character budget. When over budget, it should increase information density through compact wording, merged phrasing and references to the full checklist, not drop required evidence, blocker or false-completion semantics merely to be short.
- For target-mode execution, the full acceptance checklist is the authoritative acceptance standard. Compact prompt summaries provide direction, priority and recovery navigation only.
- Overlap between the full checklist and compact summary is allowed. If they conflict, the full checklist wins.
- Target-mode prompts may recommend the specific Superpowers plugin/workflow as the long-task execution layer. Superpowers can turn the target into bite-sized implementation tasks, execute with subagents or inline plan execution, apply TDD to behavior changes and run review/finish checks, but those checks cannot override the full acceptance checklist.
- Target-mode prompts must name the Superpowers input boundary: use `writing-plans` when the implementation/source plan is not bite-sized, use TDD for behavior gaps, and use `verification-before-completion` before completion claims against the full checklist and current evidence.
- The local audit must record each required test's command, result and failure reason when test evidence is required, blocked or invalid.
- It does not execute the plan, prove completion, own durable task state, replace Task Contract/workflow-contract `plan.md`, or store acceptance evidence as Context.
- Hard blockers in a generated checklist remain non-completion until the missing evidence or user/external action exists.

## Contract Conformance

- Contract Conformance compares implementation against relevant Context, Task Contract and durable boundaries before handoff.
- Implementation misses are fixed in code.
- Task Contract omissions return to the Task Contract while work is active.
- Missing durable facts return to `Context Delta: required` and Context-first handling.
- Conformance evidence belongs in handoff/final/PR text. Do not store one-off proof, screenshots, logs or test output in Context.

## Current-State Conformance

- Before claiming current product, API, UI, runtime, data, artifact or evidence-state completion, compare the claim against current evidence and the applicable acceptance contract.
- Evidence ledger discipline is prompt-level completion discipline: missing current evidence means incomplete, stale evidence cannot prove current completion, and contradictions between implementation, API/UI/data/runtime artifacts and tests must be resolved or reported as blockers.
- Current-state ACs start as `unknown / not_run`; only fresh required evidence may prove completion. Any fresh browser/API/runtime/data/test contradiction downgrades the affected AC and overall status and must be recorded as invalidating evidence.
- UI-facing acceptance requires real page path evidence with matching user-visible state unless the full checklist explicitly scopes the UI out; component, viewmodel, mock or unit evidence alone is auxiliary.
- This discipline is not a CLI validator, not a `validate-context` product-state check, not product-quality proof, not a lifecycle phase, not a phase gate and not a stage artifact.

## Non-Goals

- Do not restore PRD/UX/tech-plan/review/test/release document chains as default workflow.
- Do not restore lifecycle phases, phase gates, plan state, stage Skills or `.work_products/**`.
- Do not make edit order a `validate-context` requirement. Automation may warn about possible context-first drift, but should not block only because of edit order.
