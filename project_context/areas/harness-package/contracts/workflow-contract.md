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
- A local audit is ordinary-long-task process state only and must not mark final completion. Composite V2 does not consume local audit, plan-conformance matrix or final-verdict files; it recomputes findings and final result directly from the frozen contract and verifier runs.
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

## Composite Long-Task Preparation Skill Boundary

The explicit Composite Long-Task Preparation Skill (`/prepare-composite-long-task`) is the upstream authoring boundary for a raw requirement. It is separate from `/composite-long-task-workflow`, which remains the strict executor for an already-complete V2 YAML Product / Architecture Source, Technical Realization Plan and Acceptance Checklist.

- Preparation performs Scope Fit before authoring. Outcomes are `fit_for_three_inputs`, `split_required`, `blocked_for_decision` or `not_long_task`; a chosen split becomes `selected_from_split` with a stable, never-renumbered `SFC-###` identity. Only a unique dependency-ready SFC is auto-selected; ties and unresolved product decisions require one user choice.
- Only the current SFC is authored just in time. Semantic authoring writes `CompositeAuthoringPacketV2`; package code deterministically renders the three strict YAML authorities and stateless preflight reports coverage/oracle diagnostics without creating a Goal, verifier run or product result.
- Preparation authority is ordered: immutable sanitized `request.md` provenance; current `campaign.yaml` coordination; append-only `events.ndjson` audit; `authoring-packet.json` as the only editable authoring source before handoff, with every change creating a new immutable revision; deterministic rendered three-input projections; post-start `tmp` compiled contract and verifier runs; then current final gate as the only SFC product-completion authority. Campaign audit and status prose cannot promote completion.
- The campaign is a narrow Git-trackable, user-owned authoring/provenance exception. Compiled contracts, command runs, artifacts, current status and final results remain under `tmp`; no aggregate campaign product-completion state exists.
- Preparation ends at `handoff_ready`. Handoff freezes matching packet/projection/oracle hashes and never creates a Goal. Explicit `start` or `prepare and execute` authorization creates an idempotent binding from one SFC to one Goal and must not create a second unfinished Goal.
- A campaign Context Delta is only an authoring candidate. Goal execution rereads current Context and code and resolves required Context updates before implementation. After a verified result is recorded or no active Goal remains, the next dependency-ready SFC is refreshed against current Context/code rather than pre-generated from stale assumptions.
- `record-result` validates and mirrors the matching current `final-result.json` source/contract/snapshot hashes; it cannot compute campaign completion or promote current-status, intermediate runs or prose output. `needs_work` remains non-terminal and `externally_blocked` remains narrowly classified.
- Unknown future campaign or packet schema majors fail before writes. Campaign writes also enforce normalized in-root paths, symlink-escape and Windows reserved-name rejection, redaction, bounded files/events, immutable revisions, atomic writes and optimistic concurrency.
- No legacy attachment, partial-bundle, V1/Markdown campaign, old-workdir or historical campaign importer is added. Only complete V2 YAML bundles continue directly through `/composite-long-task-workflow`; `init`, `sync` and `upgrade` install/refresh capability only and never create or scan campaigns.

## Composite Long-Task Workflow Skill Boundary

- The Composite Long-Task Workflow Skill (`/composite-long-task-workflow`, Chinese display name `多组合长程任务工作流 Skill`) is an explicitly invoked Tiny Context executor for an already-complete Product / Architecture Source, Technical Realization Plan and Acceptance Checklist. It is not a Superpowers adapter, does not require or name Superpowers Skills, does not prescribe subagent/TDD/review mechanics and does not perform complexity routing.
- Its design purpose is false-completion prevention: implementation may drift while work is in progress, but the workflow must detect contract, scope, implementation, evidence and final-workspace drift; block delivery; return machine findings with a repair direction; and permit an accepted final answer only after the current implementation has no known contract gap on one final snapshot.
- Every default runtime step must close a named drift path. The only default steps are contract compilation, implementation–verification iteration, final full verification and Codex Stop enforcement. Slice, epoch, progress-ledger, local-audit, review, TDD, next-slices, matrix/verdict/final-card and separately derived-report workflows are forbidden as package-owned completion steps.
- The formal guarantee is conditional on input and oracle soundness: when the three inputs completely declare the product requirements, atomic implementation obligations, acceptance semantics and sound executable oracles, there is no workflow path where a declared obligation or AC has an unrun/failed verifier and the workflow emits `accepted`. The compiler proves structural coverage and integrity; it cannot prove an omitted requirement or a semantically weak oracle.
- The three authorities are strict YAML 1.2 JSON-compatible subsets named `product-architecture-source.yaml`, `technical-realization-plan.yaml` and `acceptance-checklist.yaml`. Parsing rejects duplicate keys, anchors, aliases, merge keys, custom tags, multiple documents, unknown fields, unsafe paths and non-canonical scalar forms rather than preserving Markdown compatibility.
- Product requirements, product boundaries, non-completing outcomes, plan items, atomic plan obligations, ACs, verification specs and positive/negative assertions have stable IDs. Coverage is executable and complete: every in-scope product requirement maps to at least one obligation; every obligation maps to at least one AC; every AC maps to at least one verification spec; and every boundary, forbidden shortcut and non-completing outcome maps through a negative assertion to an executable verification spec. A text-only forbidden shortcut is not coverage.
- Acceptance assertions are executable predicates or IDs owned by a frozen oracle/evaluator, not free-form prose interpreted by the agent. A task-specific oracle must already exist and carry independent provenance before product implementation begins; otherwise compile fails. Implementation tests may change but cannot alone prove an AC. `proof_surfaces` say what product surface is proved, while `runner_type` says how it is observed; `test` is a runner mechanism, not a product proof surface.
- UI owner surfaces require real browser route/action/state assertions plus negative forbidden-state checks. Full-population claims require a frozen population enumerator, denominator/exclusion rules and a coverage result; representative samples cannot substitute. Population policy is scoped per requirement/spec when a task mixes system-capability, sample-validation and full-population obligations.
- `compiled-contract.json` is the only compiled runtime authority. It freezes the three source hashes, the complete requirement→obligation→AC→verifier graph, the whole registered `project_context/**` set and manifest hashes, oracle/evaluator paths and hashes, verifier package/binary identity, normalized verification-spec hashes, scope/population rules and workflow schema version. Source, Context, oracle or verifier drift invalidates prior runs and requires trusted recompilation.
- The trusted verifier, compiler, final gate and Stop checker must execute from a pinned package identity outside the product implementation surfaces. Hashes written by the same mutable workdir are not a trust root. Harness self-development uses a previously released baseline or independent CI verifier; a product task cannot modify an oracle, verifier, compiler or Hook and use that modified component to prove the same task.
- `verify <workdir>` accepts no agent command, artifact, evidence record, assertion result, closed layer or AC/PI status. It selects affected verification specs from frozen `input_paths`, always runs global contract/context/scope/security invariants, conservatively runs all specs for unmapped changes, executes exact frozen executable/argv/cwd/env definitions, collects stdout/stderr/exit code and verifier-owned artifacts, evaluates assertions and writes `current-status.json` with `needs_work` findings and exact reverify actions. Intermediate verification guides repair but is never final acceptance evidence.
- Each verification run creates an isolated content-addressed workspace snapshot that includes current tracked content, all relevant untracked/ignored runtime inputs, file mode/type/size/path, lockfile/dependency/runtime/browser/environment identity and oracle/verifier hashes. Unknown inputs are conservative failures. Each spec receives a fresh execution copy of the same source snapshot so one spec cannot mutate another; original product worktree, frozen oracle and verifier remain unchanged before, during and after execution.
- Verifier artifacts live only under a newly created `runs/<run-id>/artifacts/` directory. Collection rejects undeclared paths, pre-existing artifacts, symlink/junction/hardlink escape, outside-run realpaths, path collisions and files created before the command. The verifier computes hashes/times itself and generates assertion results from trusted observations; same-named agent JSON is ignored.
- `final-gate <workdir>` is an active full verifier, not an evidence consumer. It revalidates source/Context/oracle/verifier identities, creates one new final snapshot, runs every in-scope spec and invariant, recomputes every product requirement/obligation/AC, checks positive and negative predicates, forbidden shortcuts, scope/population substitution and original-worktree stability, and atomically writes `final-result.json`. Only this run can produce `accepted`; historical or intermediate runs cannot be combined.
- Runtime status is `needs_work`, `accepted` or `externally_blocked`. `needs_work` is a persisted internal loop state and is never a legal completion reply. `externally_blocked` is emitted only by trusted classification with fresh machine evidence for MFA, unavailable credentials/permissions, required user contract decisions, external approval, platform/legal restriction or persistently unavailable external infrastructure without a local substitute; product/test/evidence failures remain `needs_work`. Process interruption is not a product terminal state.
- The Codex completion gate is mandatory. A project has no composite effect without matching repository and `.git` active-binding copies. With an active task, a trusted and Stop-smoke-tested Hook validates binding/contract/verifier/Hook identities, then repeats the complete final verification before allowing an accepted or externally-blocked exit. Needs-work returns `decision: "block"` with the next finding; externally-blocked permits only the frozen minimal user action and rejects completion wording. SessionStart/PostCompact restore the compiled-contract identity and current findings. Missing, untrusted, conflicting or failed Hook capability produces `host_completion_gate_unavailable`; there is no degraded mode.
- The active binding, Hook bundle and compiled/final identities are task- and repository-bound. Deletion, retargeting, binding-mirror disagreement, copying another task's result, Hook definition drift or a conflicting Stop Hook invalidates strict mode. Hook heartbeat and binding files are verifier-owned runtime metadata excluded from the product snapshot, and terminal binding copies are removed only after Stop allows exit.
- The only public composite CLI is `init`, `compile`, `verify`, `status`, `final-gate`, `stop-check` and `render-goal`. `ty-context superpowers`, `start-attempt`, `run-assertion`, `record-evidence`, `apply-slice-delta`, `derive`, `slice-gate`, `epoch-gate`, `next-slices` and `validate-superpowers-state` do not exist.
- The task workdir contains only the three YAML inputs, `compiled-contract.json`, `goal-objective.txt`, `current-status.json`, `final-result.json` and verifier-owned `runs/**`. `workflow-protocol.md`, `execution-binding.md`, `events.ndjson`, writable task-state AC/PI status, slice deltas and `derived/**` are removed. Generated status/result files remain recomputable views, not independent proof sources.
- The Skill is package-managed, English-complete and configured with `policy.allow_implicit_invocation: false`. Ordinary questions and bug work must not create a workdir. User-level Superpowers installation is outside package ownership; `doctor` may diagnose and print opt-in disable instructions, but the workflow itself simply has no Superpowers dependency.
- This is a breaking replacement with no compatibility alias, dual runtime, importer, silent migration or audit-only legacy executor. Old Markdown inputs, old campaigns/workdirs, `task-state.json`, EvidenceRecordV2 and Superpowers namespaces are unsupported; users must provide or regenerate the V2 YAML inputs and run a fresh compile/final verification. Release notes must say this explicitly.
- The composite workflow remains adjacent to the Tiny Context Workflow Contract rather than replacing it. Context Delta, Source-to-Context Coverage, Context-to-Implementation Binding, Contract Conformance and Context drift checks compile into contract/context hashes and bindings instead of surviving as separate runtime tables or gates. Temporary run data never enters `project_context/**`.

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
