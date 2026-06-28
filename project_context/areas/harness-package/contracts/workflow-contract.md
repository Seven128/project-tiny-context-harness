---
context_role: contract
read_policy: default
---
# Harness Workflow Contract

## Role

This contract defines the prompt-level workflow expected when maintaining Project Tiny Context Harness. Read it before changing context-first rules, Task Contract behavior, temporary plan surfaces, target-mode local audits, Contract Conformance or the Context Priority Ladder.

Workflow Contract is a first-class Tiny Context concept alongside Minimal Context. Minimal Context defines the durable fact sources; Workflow Contract defines how agents read those sources, decide `Context Delta`, compile task-local constraints, update Context before implementation, and check conformance before handoff.

## Context Priority Ladder

For durable product, architecture, package-boundary, API/schema, state/runtime, verification-design or Context-topology work, expected agent order is:

1. Read `project_context/global.md`, `project_context/architecture.md`, `project_context/context.toml` and relevant area/role Context.
2. For product surfaces or information-placement work, run the lightweight product/page positioning check before narrowing to code.
3. For Context authoring or migration, run the role placement scan before choosing `area`, `contract`, `foundation`, `verification`, `implementation-index`, `decision-rationale` or another role.
4. Compile applicable module design and constraints before selecting implementation or verification paths.
5. Classify durable-fact impact, or use `Context Delta` inside Task Contract scenarios.
6. For product, architecture, technical-realization or acceptance-plan inputs, compile Source-to-Context Coverage before implementation so every durable source constraint is either covered by existing Context, updated into Context, task-local only, explicitly out of scope or waiting on a user decision.
7. Use context-first when durable facts change; use code-first only for small code tasks unless they produce a durable fact.
8. For high-risk implementation work, compile Context-to-Implementation Binding before handoff so Context facts are tied to expected surfaces, implemented paths and verification paths.
9. Before handoff, run Contract Conformance when applicable and a Context drift check.

The ladder is expected agent behavior. It must not become a phase gate, required document chain or machine-enforced edit-order gate. Plan validators may check temporary plan artifacts for internal consistency, evidence-reference existence and declared binding consistency, but they must not prove product quality or enforce code/context edit order.

## Context Delta And Task Contract

- `Context Delta: required` means the current task changes durable facts and the relevant `project_context/**` or `DESIGN.md` facts are updated before implementation continues.
- `Context Delta: none` means implementation proceeds against existing Context.
- For high-risk product/architecture or implementation-plan inputs, Task Contract may split the judgment into `Product Context Delta: none|required` and `Technical Context Delta: none|required`; either `required` makes the overall `Context Delta: required`.
- `Product Context Delta` asks whether product capability, user flow, business state/rule, page/surface responsibility, main/drilldown ownership, information architecture, user-visible terminology, status meaning, operation boundary, product/domain ownership or acceptance semantics changed.
- `Technical Context Delta` asks whether API/schema/event/data contract, module ownership, dependency direction, worker/runtime/state-machine semantics, data model, persistence, scheduling, failure/retry/recovery semantics, verification/deployment/bootstrap path or durable technical tradeoff changed.
- The split is a thinking aid for source interpretation. It must not become a validator, phase gate, edit-order gate, new Context role or required document chain.
- Task Contract is task-local and temporary. It should identify goal, boundary, owner, dependencies, state, failure/retry/recovery, security, non-goals, verification path and applicable module design.
- High-risk product, design and engineering Task Contracts that affect durable architecture/module ownership, API/schema/data contracts, state/runtime semantics, dependency direction, verification/deployment semantics or durable tradeoff rationale also name `Architecture Context Hit` and `Decision Rationale Hit: existing|required|none`.
- `Architecture Context Hit` is Context routing for the current decision. It names the architecture, area, contract, foundation, decision-rationale or verification/deployment Context that controls the task; it is not an architecture quality judgment.
- `Decision Rationale Hit` is a rationale coverage state, not a requirement to write a reason every time: `existing` means current Context already explains the durable reason, `required` means the task creates or changes durable rationale and must use `Context Delta: required`, and `none` means no stable rationale is needed.
- Missing durable architecture or rationale facts have only one workflow action: return to `Context Delta: required` and update the owning Context. Do not create Architecture Delta, Rationale Delta, a validator gate, an edit-order gate, a new Context role or a default rationale file.
- For external product, architecture, technical implementation or acceptance-plan inputs, `Context Delta` also requires a coverage judgment: durable source constraints must be checked against existing Context before implementation. It is not enough to update a status note or evidence rule when the source also changes surface ownership, runtime responsibility, API/schema meaning, verification boundary or architecture direction.
- Engineering, RFC and implementation Task Contracts include `Modularity Check: none|required|exception` so oversized touched files are handled inside the existing contract, not as a separate workflow type.
- `Modularity Check` covers physical maintainability risk in touched handwritten source, including file size, split need or an explicit waiver. It does not replace ownership, dependency, API/schema, state/runtime or verification-design judgment.
- A small code task is a local implementation task where existing Context is sufficient and the change does not alter durable product, architecture, API/schema/data, runtime/state/recovery, verification/deployment, security/redaction or surface-ownership facts. It is not measured by line count: a one-line schema change can be high risk, while a broad mechanical style cleanup can remain small.
- Ordinary bug fixes, local styling, small refactors, package/release chores, test repairs and spikes stay code-first unless they produce durable facts; oversized touched files remain `Modularity Check` concerns, not architecture/rationale triggers.
- Task Contract is not a source of truth and is not stored in `project_context/**` by default. Only durable facts discovered through it are extracted into Context.

## Source-to-Context Coverage

Source-to-Context Coverage is a task-local table used when a source packet or user request contains product, architecture, technical-plan or acceptance-plan constraints that may become durable facts. It only answers whether source constraints are covered by or written into Context; it does not describe implementation paths.

Use this table in `plan.md` or an equivalent temporary plan surface before implementation for high-risk source inputs:

```text
Source item | Durable constraint | Type | Existing Context Hit | Context action | Owning Context | Coverage status
```

Allowed coverage statuses:

- `covered`
- `new_context_required`
- `context_updated`
- `task_local_only`
- `out_of_scope_explicit`
- `needs_user_decision`
- `under_scoped`

Rules:

- Every durable product, architecture, surface, API/schema, runtime/state, verification/deployment or acceptance-semantics constraint in the source must appear in coverage.
- `new_context_required` must become `context_updated`, `out_of_scope_explicit` or `needs_user_decision` before implementation claims full source alignment.
- `under_scoped` means the Context update did not capture enough of the source constraint to guide implementation; it prevents claiming the plan or source was fully implemented.
- Current code shape, existing files or convenient UI components cannot downgrade a source constraint into `task_local_only`.
- If a source changes product surface ownership or information architecture, coverage must record the Product Surface Contract hit or the missing contract that requires Context update.
- Source-to-Context Coverage must not include implementation paths or `Implementation constraint`; those belong in Context-to-Implementation Binding.

## Context-to-Implementation Binding

Context-to-Implementation Binding is a task-local table used after Context and Task Contract facts are known. It answers whether Context constraints have concrete implementation obligations, expected surfaces, implemented paths and verification paths.

Use this table in `plan.md` or an equivalent temporary plan surface for high-risk implementation work:

```text
Context fact | Implementation obligation | Expected surfaces | Implemented paths | Forbidden shortcuts | Verification path | Binding status
```

Allowed binding statuses:

- `bound`
- `partial`
- `missing`
- `blocked`
- `out_of_scope_explicit`
- `needs_user_decision`
- `contradicted_by_current_state`

Rules:

- `bound` requires implemented paths, expected surfaces and verification paths.
- UI, page or product-surface binding requires real page, route, browser or screenshot evidence unless explicitly out of scope.
- Runtime, worker, API or schema binding requires the matching implementation surface; test names or browser checked paths alone do not prove binding.
- Forbidden shortcuts record evidence that cannot prove completion for that row. If implementation evidence uses a forbidden shortcut, the row cannot be `bound`.
- `partial`, `missing`, `blocked`, `needs_user_decision` or `contradicted_by_current_state` prevents a full implementation-alignment claim.
- Context-to-Implementation Binding is not product-quality proof. It checks that declared Context constraints are not silently dropped, narrowed or mapped only to convenient existing components.

## Plan Validator Boundary

Tiny Context plan validators stay inside the Harness boundary:

- Built-in consistency checks reject internally contradictory temporary artifacts, such as `complete` rows with missing evidence, contradictions, weak-proof language, unresolved Source-to-Context rows or missing implementation/verification bindings.
- Built-in evidence-reference checks verify that cited Context, code, test, artifact, matrix and verdict paths exist and that declared plan/AC cross-references are not empty or dangling.
- Built-in surface/architecture binding checks are structural only: they compare declared ownership, expected surfaces, implemented paths, forbidden shortcuts and evidence references. They do not judge whether the product, UX, runtime or business behavior is actually complete.
- `validate-plan-acceptance` errors are blocking and exit-driving. Optional `warnings` and `hygiene` report stale non-complete prose, unsupported milestone labels, optional evidence-manifest cleanup and partial active-count drift without becoming product-quality proof.
- Complete-claim proof gaps stay blocking: raw secrets/tokens/cookies, material drift, missing required layers, unapproved sibling substitution, wrong owner-surface proof, live-proof substitution, dangling `evidence_id` references and stale generated active-count blocks under a complete verdict remain errors.
- Project-quality gates remain project-owned: tests, CI, smoke, real browser runs, hidden probes, production observation and human acceptance prove product behavior.

## Temporary Plan Surface

- `plan.md` or an equivalent temporary plan surface may hold `Context Delta`, Source-to-Context Coverage, Task Contract, Context-to-Implementation Binding, implementation steps and Conformance notes for long or multi-module work.
- Use a temporary plan surface for high-risk product/architecture/technical/acceptance-plan inputs, product surface ownership changes, runtime/state/API/schema changes, multi-module work, multi-agent work or tasks likely to require several verification loops.
- Small code tasks must not create `plan.md`, full trace tables, Source-to-Context Coverage or Context-to-Implementation Binding unless they discover durable Context changes, receive an external source packet or expand into high-risk/multi-surface work.
- The plan surface serves the workflow contract and Context; it does not replace either.
- Temporary plan surfaces must not become default project assets, plan state, stage artifacts, work-product trees or registered `context.toml` nodes.
- Durable facts discovered while using a plan surface must be extracted into `project_context/**` or `DESIGN.md`; ordinary execution details stay temporary.
- A plan surface must not claim source alignment while Source-to-Context Coverage still contains unresolved `new_context_required`, `needs_user_decision` or `under_scoped` rows.
- A plan surface must not claim implementation alignment while Context-to-Implementation Binding still contains `partial`, `missing`, `blocked`, `needs_user_decision` or `contradicted_by_current_state` rows.

## Target-Mode Local Audit

- Target-mode local audit artifacts live under `tmp/ty-context/plan-acceptance/**` when a generated goal/target prompt asks for them.
- A local audit records acceptance progress, current evidence, commands, blockers, missing evidence, deferred scope and invalid/stale evidence for one long-running objective.
- A target-mode local audit does not replace Task Contract or workflow-contract `plan.md`.
- A local audit is not Context, not product-quality proof, not a global task manager and not a substitute for tests, CI, review, human acceptance or the repository's Tiny Context workflow contract.
- A local audit is process state only. For Superpowers long-task execution it must not mark final completion; plan conformance belongs in `plan-conformance-matrix.*`, and acceptance completion belongs in `final-acceptance-verdict.*`.
- When target-mode execution works through an acceptance item, each concrete execution slice still follows current Context, `Context Delta`, Task Contract and any workflow-contract `plan.md` in force.

## Product Surface Contract Boundary

- Product Surface Contract workflow turns broad page/UI/product positioning principles into project-owned Context for a user-facing surface.
- The workflow is agent-mediated and prompt-level. `init` and `upgrade` install or refresh generic Skill/template support, but they do not infer or create business surface contract files.
- Surface contracts use existing Context roles such as `contract`, `area`, `subdomain`, `verification`, `decision-rationale` and `implementation-index`. Do not add surface-specific Context roles or a surface-specific validator gate; the generic plan-contract validator may check declared surface binding consistency when a temporary plan surface exists.

## Ordinary Long-Task Skill Boundary

- The ordinary long-task Skill (`/normal-long-task`) is a pre-execution acceptance-standard pass for a user-provided plan-like source.
- It is recommended through explicit Skill invocation instead of broad automatic keyword routing.
- It materializes temporary plan/checklist artifacts under `tmp/ty-context/plan-acceptance/**`, reads relevant Context and may output a generic target-mode prompt.
- It supports a two-document upstream input packet when the user provides both `Development Plan / 开发方案` and `Acceptance and Tests / 验收清单和测试用例`. The first document is execution direction; the second is target-mode acceptance input. Both are preserved source input, not proof. This packet path is strict mode.
- In strict mode the Skill must stop when required fields cannot be fully parsed from both documents. Missing required fields must be reported to the user, and the Skill must not generate a checklist or goal/target-mode prompt from an incomplete two-document packet.
- If the source plan contains an explicit concrete acceptance checklist, the Skill reuses that plan-provided checklist verbatim as the full checklist instead of generating a new one.
- For a two-document upstream input packet, the acceptance-and-tests document is reused as the full checklist only when it already contains AC ID, scope, required evidence, verification method, fail condition, state-machine rules and invalid evidence rules; otherwise strict mode requires stopping for missing required fields.
- Test requirements belong to acceptance evidence, not a fourth artifact. The full checklist may contain a `Required automated tests / 必须新增或补强的自动化测试` section, but the Skill must not create a separate `<plan-slug>-test-requirements.md` file.
- If the source plan contains explicit test requirements, those requirements are plan-provided acceptance evidence and should be preserved in the full checklist rather than replaced with generic AC10 wording or an unrelated test list.
- The materialized plan and full checklist remain separate files even when the checklist originally appeared inside the plan.
- The generated goal/target prompt uses a conservative 3850-character effective maximum, including line breaks, so it stays below Codex's 4000-character practical paste boundary after small counting differences.
- The Skill guidance must preserve required plan/checklist/audit paths and all core acceptance categories while fitting the 3850-character budget. When over budget, it should increase information density through compact wording, merged phrasing and references to the full checklist, not drop required evidence, blocker or false-completion semantics merely to be short.
- For target-mode execution, the full acceptance checklist is the authoritative acceptance standard. Compact prompt summaries provide direction, priority and recovery navigation only.
- Overlap between the full checklist and compact summary is allowed. If they conflict, the full checklist wins.
- The local audit must record each required test's command, result and failure reason when test evidence is required, blocked or invalid.
- It does not execute the plan, prove completion, own durable task state, replace Task Contract/workflow-contract `plan.md`, or store acceptance evidence as Context.
- Generated target prompts require maximum safe autonomous progress within current platform, repository, tool and user-authorized permission boundaries. Locally satisfiable discovery, execution, inspection and verification remain agent work, not user work.
- Existing local app sessions, browser cookies, CLI auth, OS credential helpers and user-authorized accounts are self-service resources. Generated prompts must tell executors to open the relevant app, page, CLI tool or system setting and try the existing session before asking the user; absent login, MFA, missing permission, failed elevation or external approval becomes a blocker only after attempted access shows it cannot be satisfied locally.
- Generated target prompts inherit the current repository/global agent-instruction permission policy. Authorized `sudo` / `gsudo` / administrator elevation is not a user blocker; executors try it before pausing and only report a blocker when elevation is unavailable, fails or requires user/system authorization.
- When only locally unsatisfiable hard blockers remain, generated prompts require a minimal user action list with the exact page/system/command/owner, field or value location, redaction guidance, values not to send and the agent's next step after receiving input.
- Hard blockers in a generated checklist remain non-completion until the missing evidence or user/external action exists.

## Superpowers Long-Task Skill Boundary

- The Superpowers long-task Skill (`/superpowers-long-task`) is a separate prompt-adapter Skill for a recommended three-input packet: Product / Architecture Source, Technical Realization Plan and full Acceptance Checklist. It produces a Superpowers-specific target-mode prompt only after the external Technical Realization Plan satisfies the required Superpowers-ready Markdown implementation plan fields, then binds that accepted plan directly to execution; it does not generate, repair or strengthen the checklist.
- It is recommended through explicit Skill invocation when the next step needs Superpowers execution. `/normal-long-task` remains useful for ordinary acceptance preparation, but Superpowers input does not require it when the product/architecture source, technical realization plan and acceptance checklist already exist.
- It does not perform complexity routing. Invocation means the user or upstream process has already selected Superpowers long-task execution.
- Two-document compatibility is allowed only when the first document explicitly contains both Product / Architecture Source and Technical Realization Plan sections. If the user supplies only a product/architecture source plus checklist, the Skill stops for missing Technical Realization Plan instead of translating product intent into a technical plan.
- This is Tiny Context's adapter layer for Superpowers workflows, aligned to the official Superpowers skills while remaining a Tiny Context-owned adapter rather than an upstream-owned schema. It maps the product/architecture source, technical realization plan, full checklist, local audit, relevant Context and required tests/core paths into the external workflow's input roles.
- The extra Tiny Context gates exist because Superpowers alone can still drift under long-running execution pressure. Superpowers strengthens execution discipline, but it does not by itself preserve source authority, prevent scope shrinkage, prove full conformance to the Technical Realization Plan or enforce AC-by-AC evidence against the Acceptance Checklist.
- The Superpowers long-task prompt may wrap Superpowers with Tiny Context authority, conformance and acceptance gates, but it must not redefine, duplicate or fork official Superpowers execution mechanics. If a Tiny Context-added step would conflict with, duplicate or override an official Superpowers responsibility, stop and surface the boundary conflict instead of silently merging the workflows.
- The Skill stops with a structured Missing Fields Report when required three-input fields cannot be parsed: original requirement/source summary, durable product/architecture intent when applicable, traceable Technical Realization Plan items, expected surfaces when applicable, explicit non-completing shortcuts when applicable, full checklist, required evidence, verification methods, fail conditions, required tests or explicit test scope, core paths or explicit non-UI/runtime scope, state-machine rules, invalid evidence rules and blocker policy.
- Its authority model is fixed: Product / Architecture Source owns intent/scope/boundaries, Technical Realization Plan owns plan items/execution blueprint/plan conformance, and Acceptance Checklist owns ACs/completion semantics/proof layers. Audit, matrix, verdict, validator output, optional proof index and auditor report cannot rewrite those sources.
- It must visibly output `Superpowers input packet` / `Superpowers 输入包` and `Superpowers execution binding` / `Superpowers 执行绑定`.
- It binds official workflow names only after the full checklist and executable Technical Realization Plan exist: `superpowers:subagent-driven-development` when subagents are available, `superpowers:executing-plans` otherwise, AC gap -> TDD via `superpowers:test-driven-development`, and `superpowers:verification-before-completion` before any completion claim.
- Before implementation, the generated Superpowers prompt requires a parent-level Product Context Delta and Technical Context Delta check; if either is `required`, the executor updates the smallest owning `project_context/**` or `DESIGN.md` fact before code work continues. Implementation slices inherit the parent decision and only add a slice-level new durable fact check.
- The Technical Realization Plan controls Plan Conformance Gate through `plan-conformance-matrix.*`, an execution-time trace artifact initialized early and updated as work lands. Passing tests, sampled paths, local audit scope notes or subagent summaries cannot prove full plan conformance. Complete rows should record required proof layers, satisfied proof layers, missing proof layers and whether substitute evidence was used when the checklist or plan requires layered evidence.
- The Product / Architecture Source prevents scope shrinkage and constrains the Technical Realization Plan; local execution cannot silently narrow it.
- The full checklist controls Acceptance Evidence Gate through `final-acceptance-verdict.*`, a final AC-by-AC verdict generated only after conformance and current evidence checks. Review, finish or execution discipline cannot override incomplete or contradicted acceptance evidence. Complete AC rows should expose the required proof chain, fresh evidence, missing required layers, drift severity, sibling-substitution state and any independent auditor finding when those fields are applicable.
- The Superpowers target prompt should add an external-reviewer evidence gate: final verdicts are not completion proof unless a third party can reproduce every complete AC from fresh command, API, UI, runtime, artifact or browser evidence. Matrix rows, verdict prose, local audit, validator pass and subagent summaries can point to evidence but cannot replace it. A separate Evidence Ledger / proof index is optional; complete rows still require evidence traceability directly or through an optional `evidence_id`.
- For non-trivial execution slices, the Superpowers target prompt should recommend an optional rolling evidence manifest at `tmp/ty-context/plan-acceptance/<plan-slug>-evidence-manifest.md/json`. The evidence manifest is not a fourth input, not durable Context, not proof by itself and not required by `validate-plan-acceptance`; it is a slice-level source for synchronizing matrix, verdict and audit updates. Entries record `evidence_id`, `slice_id`, `slice_goal`, `missing_layer_classes`, touched plan/AC ids, commands, artifacts, runtime/browser evidence, what the slice proves and explicitly does not prove, closed/remaining missing layers, cleanup status, redaction/security status and freshness. Evidence manifests must not contain secrets, raw credentials, tokens, cookies or long raw payloads.
- Slice selection should prefer 2-4 strongly related missing layers sharing the same AC, runtime scenario, proof environment or verification path. Single-gap slices are reserved for blockers, contradictions or tiny metadata cleanup. Missing layers should be classified before slice selection as functional gap, proof gap, stale wording/artifact sync, upstream blocker, live DB/runtime proof, Browser/UI proof, security/redaction proof or all-provider/all-runner coverage.
- Matrix and local audit should be updated from the evidence manifest after each slice; verdict evidence and missing-layer fields should be updated conservatively without marking ACs complete before the final gate. Related DB/API/Browser environments may be reused only with unique proof prefixes and final cleanup count/assertion.
- Superpowers execution uses Slice Gate / Epoch Gate / Final Gate cadence. Slice Gate synchronizes manifest/matrix/audit and conservative verdict fields for one slice; Epoch Gate batches shared provider/browser/runtime/security epoch proof environments and cross-slice cleanup; Final Gate runs the full fixed completion order. Do not run the full final gate after every slice.
- Progress Accounting is mandatory for multi-slice execution: track AC acceptance completion, engineering implementation progress, runtime/proof progress and workflow overhead separately. A temporary progress ledger (`progress-ledger.md/json`) under `tmp/ty-context/plan-acceptance/**` may record those counts, gate cadence, artifact budget, proof-layer milestone status and Next 3-5 high-value clusters; it is not Context, proof or a fourth input.
- Workflow overhead backpressure applies when stale-sync cleanup, artifact volume, gate loops or review burden grow faster than proof progress. The executor should batch proof-environment work, prune obsolete temporary artifacts and choose clusters that close the most blocking AC/proof-layer gaps with the least added workflow overhead.
- When subagents are available, the Superpowers target prompt should use an independent reviewer gate after the executor has produced matrix/verdict evidence and run validator checks. The auditor subagent is read-only: it reconstructs each AC proof chain from the source, plan and checklist; looks for stale evidence, missing layers, current contradictions and sibling substitution; and returns gaps. The auditor is not a proof source and does not replace the executor's self-evidence.
- The read-only auditor uses a fixed auditor checklist: source/plan/checklist consistency, closed gaps have fresh evidence, active matrix/verdict wording removed closed missing layers, remaining blockers are preserved, live evidence is fresh and not dry-run/sample substitution, UI proof uses real owner surface evidence, no unapproved sibling substitution or scope narrowing, no overclaim and final status matches the proof chain.
- Final gate order is fixed: evidence manifest update when used, matrix/verdict/audit sync, `superpowers:verification-before-completion`, `validate-plan-acceptance`, read-only auditor when available, rerun `validate-plan-acceptance` if auditor-driven fixes change artifacts, final stale/overclaim scan, then completion claim only if no blocking conflict remains.
- Superpowers review and verification remain useful execution checks, but they cannot override Tiny Context gates. Passing Superpowers review does not by itself prove plan conformance or checklist acceptance; incomplete matrix rows, incomplete verdict rows, weak evidence, missing proof layers or blocking auditor findings still prevent completion.
- Overall done requires the executor self-evidence, validator consistency and any available auditor review to agree: no blocking plan drift in the matrix, all required ACs complete in the final verdict, no material/critical drift, no missing required proof layer, no unapproved sibling substitution and no blocking auditor gap.
- Goal and acceptance wording stays disambiguated: `audit_task_complete` means only the workflow or audit finished, `acceptance_target_status` is the final verdict status, and `product_goal_complete` is true only when the verdict is accepted/complete, required ACs are complete, validator passes and any auditor has no blocker. In Codex Goal mode, implementation / execution goals complete only at `product_goal_complete=true`; a non-accepted verdict continues work or reports blockers / missing evidence. A deliberately read-only audit / reporting goal may end at `audit_task_complete`, but non-accepted verdicts must say `Audit workflow completed; acceptance target not complete.` and must not use unqualified `Goal achieved` or `update_goal(status="complete")` as product acceptance.
- The Superpowers target prompt also requires maximum safe autonomous progress within current platform, repository, tool and user-authorized permission boundaries, including self-service attempts through existing local app/browser sessions and CLI/system auth where available. Locally unsatisfiable blockers must be reduced to a minimal user action list instead of vague pause requests.
- The same inherited permission policy applies to the Superpowers target prompt: authorized `sudo` / `gsudo` / administrator elevation is self-service work, not a blocker, until it is unavailable, fails or needs user/system authorization.

## Contract Conformance

- Contract Conformance compares implementation against relevant Context, Task Contract and durable boundaries before handoff.
- Implementation misses are fixed in code.
- Task Contract omissions return to the Task Contract while work is active.
- Missing durable facts return to `Context Delta: required` and Context-first handling.
- When a `plan.md` or equivalent plan surface exists, Contract Conformance must check Source-to-Context Coverage, Task Contract entries and Context-to-Implementation Binding before handoff. Remaining `under_scoped`, unresolved `new_context_required` or non-bound implementation rows mean the implementation cannot be described as fully aligned to the source and Context.
- Conformance for product surface, information architecture, runtime governance or API/schema migration checks that implementation did not preserve current-code convenience against Context intent, such as moving only a component while leaving the owning surface or runtime responsibility unchanged.
- Conformance evidence belongs in handoff/final/PR text. Do not store one-off proof, screenshots, logs or test output in Context.

## Current-State Conformance

- Before claiming current product, API, UI, runtime, data, artifact or evidence-state completion, compare the claim against current evidence and the applicable acceptance contract.
- Evidence ledger discipline is prompt-level completion discipline: missing current evidence means incomplete, stale evidence cannot prove current completion, and contradictions between implementation, API/UI/data/runtime artifacts and tests must be resolved or reported as blockers.
- Current-state ACs start as `unknown / not_run`; only fresh required evidence may prove completion. Any fresh browser/API/runtime/data/test contradiction downgrades the affected AC and overall status and must be recorded as invalidating evidence.
- UI-facing acceptance requires real page path evidence with matching user-visible state unless the full checklist explicitly scopes the UI out; component, viewmodel, mock or unit evidence alone is auxiliary.
- This discipline may be supported by `validate-plan-contract` or `validate-plan-acceptance` artifact consistency checks. It is still not a `validate-context` product-state check, not product-quality proof, not a lifecycle phase, not a phase gate and not a stage artifact.

## Non-Goals

- Do not restore PRD/UX/tech-plan/review/test/release document chains as default workflow.
- Do not restore lifecycle phases, phase gates, plan state, stage Skills or `.work_products/**`.
- Do not make edit order a `validate-context` requirement. Automation may warn about possible context-first drift, but should not block only because of edit order.
