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
- Complete-claim proof gaps stay blocking: raw secrets/tokens/cookies, material drift, missing required layers, missing or failed machine-verifiable assertion reports, failed negative evidence scans, unapproved sibling substitution, wrong owner-surface proof, live-proof substitution, dangling `evidence_id` references and stale generated active-count blocks under a complete verdict remain errors.
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
- A local audit is ordinary-long-task process state only and must not mark final completion. Composite Contract V3 does not consume local audit, plan-conformance matrix or final-verdict files; it recomputes findings and final result directly from the active compiled contract and verifier runs.
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

## Pre-stable Lightweight Verification Principle

- Before a stable release, prioritize proving the core compile → implementation → verification → completion loop instead of pre-building release-grade Host security, compatibility or platform matrices.
- Default mechanism and end-to-end tests use the smallest common environment that can exercise the real CLI and `final-gate` path.
- Heavy Host security, hostile-OS resistance, compatibility labs and cross-platform release validation are deferred until the core workflow is stable and are built as separate capabilities rather than default prerequisites.
- Every default test names the concrete implementation drift or false-completion path it prevents.
- When a default test exceeds its time budget, simplify it or move it out of the default path; increasing a timeout alone is not completion.
- Do not introduce administrator privileges or complex infrastructure solely to defend against a hypothetical malicious Host before the product claims that threat model.

## Composite Long-Task Preparation Skill Boundary

The explicit Composite Long-Task Preparation Skill (`/prepare-composite-long-task`) is the upstream authoring boundary for a raw requirement. It is separate from `/composite-long-task-workflow`, which executes only an already-complete Contract V3 Product / Architecture Source, Technical Realization Plan and Acceptance Checklist.

- Preparation performs Scope Fit before authoring and keeps stable, never-renumbered `SFC-###` identities. Only a unique dependency-ready SFC is selected automatically; product ties/decisions require one user choice.
- Only the current SFC is authored just in time through `CompositeAuthoringPacketV3`. Package code deterministically renders the three V3 YAML authorities and stateless preflight checks complete Requirement/PI/Obligation/Binding/AC/Proof/Spec/Counterfactual coverage plus oracle readiness without creating a Goal, run or result.
- Tracked authority remains immutable sanitized request provenance → campaign coordination/audit → immutable packet revisions → deterministic V3 projections. Handoff freezes matching packet/projection/oracle identities and never creates a Goal. Explicit start creates one idempotent Goal/SFC binding.
- The campaign remains a narrow user-owned authoring/provenance exception. Active `compiled-contract.json` state, verifier runs and the latest `final-result.json` use ordinary user/project storage and do not become aggregate campaign product-completion state.
- Goal execution rereads current Context/code and resolves Context Delta before implementation. The first compile fixes the active contract and workdir identity. `record-result` may mirror only a matching current final result and cannot promote status, historical runs or prose.
- V2 sources/Observation V1, V1/Markdown campaigns, partial bundles and old workdirs have no importer or compatibility path. `init`, `sync` and `upgrade` install/refresh capability only and never create or scan campaigns.

## Composite Long-Task Workflow Skill Boundary

- The explicit `/composite-long-task-workflow` is a lightweight false-completion-prevention executor, not a Superpowers adapter, security boundary or implementation-method prescription. It has one path only: compile the three inputs → freeze the contract and relevant identities → allow free implementation → `verify` → repair while `needs_work` → `final-gate` full recomputation → Stop freshness check → allow completion only for current `accepted`.
- The guarantee is conditional on complete V3 inputs, sound observers and use of the normal CLI/Hook path: no declared Requirement, PI, Obligation, Binding, AC, Proof, Spec or Counterfactual may remain unrun or failed while the workflow emits `accepted`. The compiler cannot prove omitted product intent, so strict authoring/preflight remains mandatory.
- The three strict V3 YAML inputs use `product-source-v3`, `technical-plan-v3` and `acceptance-checklist-v3`. Parsing rejects V2, Observation V1, ambiguous YAML constructs, unknown fields and incomplete graph coverage.
- `compiled-long-task-contract-v3` preserves the three-input hashes, registered Context hash, oracle/verifier identities, workdir identity and complete Requirement/PI/Obligation/Binding/AC/Proof/Spec/Counterfactual graph. Oracle V2 returns typed actual observations only; Harness-owned operators, population rules, binding projection and counterfactual checks compute results without trusting Oracle pass/status fields.
- The pre-stable execution surface accepts exactly one Node Oracle step that matches the declared entrypoint, with network mode `none` and empty environment refs, requirements and probes. Browser/package/project commands, network access and environment-dependent contracts fail compile explicitly; none may remain as an ignored or half-enabled mode.
- While an active task exists, compiling the identical contract for the identical workdir is idempotent. A changed Product source, Plan, AC/acceptance input, registered Context, oracle/verifier identity, contract graph or workdir is rejected with `active_contract_changed`; it cannot silently weaken or replace the active contract. Once an accepted Stop clears the active binding, a later activation invalidates the preceding final result before writing the new binding, even when contract and workspace hashes happen to be identical.
- `verify` accepts no Agent-supplied pass/result or entity status. It runs frozen in-scope verification and writes repair-oriented `needs_work` findings; it never produces acceptance.
- `final-gate` reruns every in-scope AC against the current workspace, recomputes Obligation, PI and Requirement results bottom-up and binds the result to the current workspace hash. Historical pass records are not final evidence. Only a fully passing current recomputation produces `accepted`.
- Compile must verify that all required events point through the exact package-managed Hook commands and that the installed Hook bytes match the packaged implementation; a similarly named or no-op script is not a completion gate.
- The Stop Hook is no-op when no active task exists. With an active task it requires the final-result bytes to match identical verifier-written receipts in ordinary project and Git state, then blocks a missing result/receipt, `needs_work`, a non-accepted result or any workspace/final-result identity mismatch; it allows completion only while the latest receipt-bound `accepted` result remains fresh.
- Active contracts, result receipts and final results may use ordinary user-level, project-level storage. Current guarantees cover omitted obligations, changed compile inputs or observers, candidate rewriting of only the workdir result, stale/missing final results, post-final workspace drift and silent active-contract replacement. They do not cover a malicious same-user or administrator deliberately rewriting all ordinary receipt/state copies or deleting state or Hooks, Credential Manager/Registry attacks, system-level managed-Hook bypass, deletion of all host state or kernel/sandbox escape.
- Rust Host Helpers, administrator privileges, Credential Manager, AppContainer, WFP, administrator Registry policy, complex ACLs, Host attack matrices, external audit runners, release-grade consumer matrices and default cross-platform infrastructure are outside the pre-stable workflow. They must not remain as half-enabled production paths, feature flags or current security claims; any future work starts as a separate post-stability decision.
- The public composite CLI remains limited to `init`, `compile`, `verify`, `status`, `final-gate`, `stop-check` and `render-goal`; it contains no force/reset/cancel-active, arbitrary verifier, evidence registration, slice/epoch/task-state/derived/progress commands or compatibility alias.
- Context Delta, source coverage, implementation binding and Conformance remain Tiny Context workflow behavior, not duplicate runtime gates. The workflow does not prescribe TDD, subagent review, slice cadence or multiple execution modes.

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
