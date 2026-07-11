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
- A local audit is ordinary-long-task process state only and must not mark final completion. Composite Contract V3 does not consume local audit, plan-conformance matrix or final-verdict files; it recomputes findings and final result directly from the Host-sealed contract and verifier runs.
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

The explicit Composite Long-Task Preparation Skill (`/prepare-composite-long-task`) is the upstream authoring boundary for a raw requirement. It is separate from `/composite-long-task-workflow`, which executes only an already-complete Contract V3 Product / Architecture Source, Technical Realization Plan and Acceptance Checklist.

- Preparation performs Scope Fit before authoring and keeps stable, never-renumbered `SFC-###` identities. Only a unique dependency-ready SFC is selected automatically; product ties/decisions require one user choice.
- Only the current SFC is authored just in time through `CompositeAuthoringPacketV3`. Package code deterministically renders the three V3 YAML authorities and stateless preflight checks complete Requirement/PI/Obligation/Binding/AC/Proof/Spec/Counterfactual coverage plus oracle readiness without creating a Goal, run or result.
- Tracked authority remains immutable sanitized request provenance → campaign coordination/audit → immutable packet revisions → deterministic V3 projections. Handoff freezes matching packet/projection/oracle identities and never creates a Goal. Explicit start creates one idempotent Goal/SFC binding.
- The campaign remains a narrow user-owned authoring/provenance exception. Active authority, compiled sealed bytes, bundles/layers/attestations live in Host Managed State; workdir runs/results remain temporary; no aggregate campaign product-completion state exists.
- Goal execution rereads current Context/code and resolves Context Delta before implementation. The first trusted compile seals the authority. `record-result` only mirrors a matching current signed final result and cannot promote status, historical runs or prose.
- V2 sources/Observation V1, V1/Markdown campaigns, partial bundles and old workdirs have no importer or compatibility path. `init`, `sync` and `upgrade` install/refresh capability only and never create or scan campaigns.

## Composite Long-Task Workflow Skill Boundary

- The explicit `/composite-long-task-workflow` remains a false-completion-prevention executor, not a Superpowers adapter or implementation-method prescription. The only default stages are managed Host preflight/seal, free implementation plus affected-spec verify/repair, one full final recomputation and managed Stop enforcement.
- The formal guarantee is conditional on complete V3 inputs and sound independent observers: no declared Requirement, PI, Obligation, Binding, AC, Proof, Spec, Counterfactual or full-population rule may be unrun/failed while the workflow emits `accepted`. The compiler cannot prove omitted product intent, so strict authoring/preflight remains mandatory.
- The three strict V3 YAML inputs use `product-source-v3`, `technical-plan-v3` and `acceptance-checklist-v3`. Parsing is a strict YAML 1.2 JSON-compatible subset and rejects V2, Observation V1, duplicates, aliases/merges/tags/multidoc, unknown fields, unsafe/protected paths and noncanonical scalars.
- Stable full graph nodes/edges are preserved in `compiled-long-task-contract-v3` and exposed through the signed workdir UX mirror `compiled-contract.json`, including owner surfaces, requirements, product boundaries/NCOs, PIs, atomic obligations, observable implementation bindings, ACs, proof requirements, specs, assertions, population rules and obligation-specific counterfactual controls. Bidirectional relations and related negative/browser/proof coverage are compile-time invariants.
- Oracle execution is Node-bundle-only. A trusted pinned bundler freezes the complete local/npm transitive closure and executes only content-addressed sealed bytes. Oracle V2 returns typed actual observations through a dedicated protocol; pass/status/blocker fields are rejected. Harness-owned strict operators, proof-surface validators and population evaluator compute results without coercion.
- Every obligation passes only when all bindings, proof requirements, ACs and counterfactual controls pass. Final/Stop counterfactuals mutate copies of the same final snapshot and require declared real assertions to flip; a verifier that still passes is `verifier_not_sensitive_to_obligation`.
- Real package-manager lockfile dependencies and Playwright browsers use content-addressed read-only layers. Node permissions supplement, but do not replace, the OS sandbox. Only declared environment refs are injected from Host secret stores and all retained output/artifacts are redacted/scanned.
- First contract authority is create-only and workspace-external. The Host registry binds repository/workdir, sources/Context, bundles, verifier, dependency/sandbox and managed policy identities. Same authority is idempotent; a different contract/workdir cannot replace it and requires a user Host-admin contract decision. Repo/workdir files are non-authoritative mirrors.
- Strict completion requires system `requirements.toml` with managed hooks pinned on and `allow_managed_hooks_only = true`, an admin-installed managed Hook/helper, a fresh real Hook heartbeat and a valid Host registry. Repo/user/plugin Hook fallback is forbidden; ordinary no-active tasks are no-op.
- `verify` accepts no Agent command, artifact, observation/result, evidence record, binding/AC/PI/Requirement status or blocker. It selects affected frozen specs, always runs global invariants, executes exact Harness command-step adapters, collects only fresh verifier artifacts and writes repair-only `needs_work` status.
- External blockers are classified only after the Harness runs every frozen required environment probe and local alternative. Product/proof/integrity failure plus an environment failure remains `needs_work`; only fresh MFA, unavailable credential/permission, user contract decision, external approval, platform/legal restriction or persistently unavailable irreplaceable service can produce `externally_blocked` with the frozen minimal action.
- `final-gate` uses one final source snapshot and a fixed order: Host registry; compiled contract; source/Context; Oracle closure; trusted tool/policy identity; snapshot; dependency layers; all real specs; probes; bindings; counterfactuals; Proof; AC; Obligation; PI; Requirement; negative evidence; population; workspace stability; signed durable atomic result. Global integrity findings fail every downstream entity.
- `accepted` and `externally_blocked` are the only legal user-visible terminal outcomes. `needs_work` is persisted internal loop state and must trigger an exact repair continuation. Stop repeats the entire final gate; historical/copied/forged/truncated/stale results cannot authorize exit.
- Harness self-development requires a separately versioned/integrity-pinned external audit runner over the exact candidate tarball. Security regression cases must construct real temporary Git repositories and execute the CLI/Managed Hook; source regex, case-name and file-existence checks cannot be false-accept proof.
- The public composite CLI remains `init`, `compile`, `verify`, `status`, `final-gate`, `stop-check` and `render-goal`; it contains no force/reset/cancel-active, arbitrary verifier, evidence registration, slice/epoch/state/derived commands or compatibility alias.
- Workdir runtime remains limited to the three YAML sources, signed compiled mirror, thin goal pointer, current/final views and verifier-owned runs. Host registry/bundles/layers/keys never enter the repo or Context. Context Delta, source coverage, implementation binding and Conformance remain Tiny Context workflow behavior, not duplicate runtime gates.

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
