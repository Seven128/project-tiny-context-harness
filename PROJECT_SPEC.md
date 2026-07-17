# Project Tiny Context Harness — Product And Workflow Specification

## 1. Product Purpose

Project Tiny Context Harness is repo-native memory and delivery-drift protection for AI coding agents. Its design is intentionally small:

1. **Minimal Context** preserves durable project facts that code cannot reliably explain: goals/non-goals, ownership, architecture/interface/state boundaries and repeatable verification/deployment paths.
2. **Workflow Contract** defines the lightweight default loop: graph-directed Context reads, one `Context Delta`, platform-internal planning, implementation, project verification, Contract Conformance and Context drift checking.
3. **Long-Task Workflow** turns an ordinary user request or external implementation proposal into one complete Canonical Delivery Contract, then adds verifier-owned current-snapshot acceptance for work that needs pause/compaction/new-session recovery or multiple observable outcomes.

The optional `source-plan-authoring` Skill is an upstream Source-quality helper, not a fourth authority layer. It turns discussions, research and initial plans into one self-contained Markdown Source Plan with stable semantic keys, traceable derivations, explicit unresolved decisions and observable acceptance scenarios. It does not update Context, bind a repository, create Contract/runtime state or claim completion.

The Long-Task Workflow V2 product equation is:

> one complete delivery = one authoritative Contract + one continuing platform-native Goal + one selected workspace + rolling technical implementation + one trustworthy Evidence Kernel + one Final Gate

The controlling objective, trusted-result boundary, Draft lifecycle, upstream Source boundary and mechanism-admission rule below govern every later Long-Task section. Existing implementation convenience, historical progress or local wording cannot weaken them.

## Long-Task Workflow Controlling Objective

The highest Long-Task objective is to prevent false completion inside declared authority. This objective applies when the delivery Source is complete and fine-grained enough to cover every declared requirement and acceptance criterion, and each item has reliable, executable acceptance evidence that the executing Agent cannot weaken by itself. Under that prerequisite, no declared Plan Item or AC may be accepted or reported as complete until it is actually satisfied.

The workflow does not promise that implementation stays on course at every intermediate step, and it does not promise that a model can finish the work. The current Goal may explore, fail, rework and change implementation sequence. The workflow constrains the final acceptable state by requiring it to:

1. compare Source Authority, the Contract, relevant Context and the current final artifact continuously enough to identify delivery drift;
2. block false completion whenever a declared requirement or AC remains unsatisfied;
3. localize the problem to its Source Item, Outcome, Claim, Assertion, Check, Proof Surface, Binding or ownership boundary;
4. give the current Goal an actionable repair direction;
5. revalidate the complete Contract against the current final snapshot before delivery; and
6. reject summaries, progress, historical tests, Receipts, a single command exit code and Agent judgment as completion substitutes.

Current-snapshot evidence outranks implementation narrative and historical results. If any declared item is unsatisfied, unverifiable or no longer backed by fresh evidence, the workflow must keep the task unfinished rather than soften the completion wording. This guarantee covers only declared and verifiable authority; it cannot prove that the user never omitted a real requirement.

## Authority Scope And Trusted Results

The complete authority and evidence chain is:

1. **Source** preserves original delivery meaning.
2. **`project_context/**`** preserves durable project facts.
3. **Contract Draft** is the still-editable structured expression before Authority Lock.
4. **Compiled Contract / Authority Lock** is the formal declared authority created by the first successful formal Compile.
5. **Current Code** is implementation reality.
6. **Check Evidence** is current behavior evidence for declared Claims and Assertions.
7. **Final Gate** computes machine acceptance on one current final snapshot.
8. **External Confirmation** owns CI, deployment, Git-hosting, human product acceptance and other non-machine authorities.

Within machine authority, only two result classes are trustworthy:

1. reliable evidence on the current final snapshot proves every declared requirement and AC is satisfied; or
2. something is unsatisfied, unverifiable, insufficiently evidenced, stale or awaiting external confirmation, so the task remains explicitly unfinished or qualified.

`machine_accepted_external_pending` is the second class with a precise boundary: all machine-verifiable authority passed, but complete external delivery did not. Public reporting must name the pending external confirmations. It is not full delivery completion and not a vague third state between complete and incomplete.

Qualification continuity is end-to-end. `final-gate`, `status`, `resume`, `stop-check`, the package-owned Stop Hook and `close` must preserve the same accepted `workflow_status` and the complete declared `external_confirmations`. `status` and `resume` expose an accepted `final_workflow_status` only while the Final Receipt is valid and fresh; drift makes that projection `null` even though the active Contract's declared external confirmations remain visible. Stop/close may clear the accepted machine Authority through CAS, but `closed` and a non-blocking Hook message mean only that the machine lifecycle ended, never that external delivery completed. This adds no external-confirmation state, Receipt or completion tracker.

Authority conflict indicates drift, omission, stale information or a genuine decision. Source or Contract meaning must never be silently changed to fit current code. Progress, Receipt, status and compiled cache are recovery or audit projections, not acceptance authority. `resume` restores semantic state rather than a previous physical Turn. Source, Context, Contract, verifier, runner or workspace changes stale affected results. Final Gate recomputes the complete decision on the current snapshot; historical evidence cannot be spliced into current completion.

The current platform session is the execution Goal. Harness does not create, simulate, persist or reconnect physical Goals or Turns, and Git history remains the ordinary record of Contract edits rather than a second plan or completion authority.

## Contract Draft And Draft Outcome Semantics

`delivery-contract.yaml` is a **Contract Draft** until the first successful formal Compile. The Draft is one continuously revised, non-authoritative object: it may take multiple model responses and multiple rounds of repository reading, Context reading, Preflight diagnostics and repair before it is complete. It has no separate Draft Receipt, Authoring State, second plan, draft schema, draft CLI or draft runtime state. The first successful formal Compile creates Authority Lock; that lifecycle change does not replace the file with another authoring product.

A **Draft Outcome** is simply an Outcome in that pre-lock Contract Draft. It is a lifecycle qualifier, not a new entity. Formal Compile places the same Outcome under Contract Authority without converting a `DraftOutcome` runtime type or creating `draft_outcomes`, a state file, Worker, scheduling queue or independent completion authority.

**Plan Item** is a design-level collective term, not V2 schema. It covers atomic Requirements; applicable Control fields, locations and states; Non-completing Outcomes; Technical Obligations; Global Non-goals, Constraints and Forbidden Shortcut Claims; and every other declared requirement that must be expressed as a non-Result Claim. An AC corresponds to one stably named Acceptance Assertion. An Outcome Result cannot substitute for a Plan Item or AC. V2 therefore adds no `plan_items` field, PI file/state/Worker or restored three-input execution chain.

Draft Outcomes decompose requirement coupling. Create an Outcome only when its result is independently observable, independently decidable, target-verifiable, able to express dependencies and localizable to its own Claim, Assertion, Check and owner boundary. That decomposition improves intermediate execution and repair by allowing the current Goal to:

1. expand implementation detail only for dependency-ready Outcomes and keep a smaller working set;
2. run targeted verification for one Outcome or Check and shorten feedback;
3. localize failure to an Outcome, Claim, Assertion, Check, Proof Surface, Binding and path;
4. resume ready Outcomes, findings and the next safe action without re-deriving the whole task;
5. mark formerly passing local results stale when their authority or evidence changes; and
6. use Outcome dependencies to order rolling implementation and verification.

`depends_on` means acceptance readiness, not a mandatory implementation schedule. The current Goal's Rolling Frontier is temporary working state, never a persisted scheduler, Worker queue, model-routing plane, process tree or execution DAG. Outcomes do not promise parallelism or fewer model calls, and Final Gate still revalidates the complete Contract on one current snapshot.

Outcome boundaries must not be based on model-output length, YAML/file length, frontend/backend layers, file/module count, Agent capacity, Worker assignment or desired parallelism.

> Outcome decomposes execution and diagnosis, not completion authority.

## Source Plan And Contract Draft Boundary

**Source** may be a user request, ordinary prose plan, research proposal, external proposal or optional Source Plan. It preserves original delivery semantics and need not follow a recommended Source Plan format.

The optional **Source Plan** authored by `source-plan-authoring` is an upstream Source-quality aid. It preserves direct requirements and qualifiers, makes necessary derivations traceable, exposes `decision_required`, and gives important content stable semantic keys and anchors. Each decided Control field retains independent meaning, each Risk names a Fact and Affected Outcome, each AC represents one scenario and names its accepted REQ/CTRL/OBL keys, and HINT remains non-material advice. The Skill emits no `ty-source-item` markers. It is not a Contract Draft, Delivery Contract, project Context, repository binding, workflow Authority, implementation plan or completion proof. Its recommended structure is an Authoring Fast Path rather than an input protocol; missing recommended headings, keys, anchors or type labels does not block Contract authoring.

Before Long-Task activation, every Material Source Item still receives a non-rendering, meaning-preserving marker in the original Source without rewriting its text. Contract authoring may add only:

- meaning-preserving structural decomposition; and
- repository bindings for owners, Context, paths, runners, verification inputs, proof surfaces and Bindings that are supported by real repository or Context evidence.

A new business rule, default, threshold, permission, recovery behavior, platform/data scope, persistence/retention policy, irreversible behavior or other choice that changes user capability, business rules or product scope is `decision_required`. The executing Agent must not relabel its own product inference as a necessary derivation. Missing preferred formatting does not block; missing a real product decision does.

## Integrated Contract Authoring Rationale

Contract Draft authoring belongs inside `long-task-workflow`; there is no separate `contract-authoring`, `draft-authoring` or `prepare-long-task-draft` Skill. A previously considered separate, single-response authoring surface was rejected because a complete Contract may exceed one response and cannot reliably be required to emerge complete in one pass.

The integrated design is also required because:

1. a Contract Draft must inspect the real repository and relevant Context before binding owners, paths, runners, verification inputs, proof surfaces and Bindings;
2. Preflight findings feed directly back into the same Draft;
3. a separate Skill adds a handoff where Source meaning, repository evidence or unresolved findings can be lost;
4. a separate product tends to create a second plan, Authoring Authority or Authoring Receipt;
5. Draft-to-Compile is a lifecycle transition of one authority object, not a handoff between two products; and
6. one Skill can keep revising the same Draft across as many responses as needed, then continue through Preflight, Compile, rolling execution, verification and Final Gate.

`source-plan-authoring` remains a platform-neutral optional upstream helper. It does not replace the repository-aware Contract Draft authoring owned by `long-task-workflow`.

## Mechanism Admission Rule

Every proposed or retained Long-Task mechanism must answer:

1. Which concrete false-completion or delivery-drift path does it close?
2. Which invariant does it establish?
3. Which test, verification or current-snapshot evidence proves that invariant?
4. Does another mechanism already cover the same risk?
5. Which exact false-completion path would reopen if it were removed?
6. What Authoring, Runtime, State, Recovery and maintenance cost does it add?
7. Does its independent drift-prevention benefit still exceed that cost?
8. Does it fail closed?
9. Does it create a second Authority, second plan or scheduling plane?

Retain a mechanism only when it provides clear, non-substitutable drift-prevention value. This is a specification and code-review rule, not a new mechanism matrix, Receipt or runtime Registry. Apply it proportionally: L0 work must not pay Contract cost; L1 pays for one complete Contract, rolling execution and a current-snapshot Final Gate; L2 raises proof only on affected high-risk Outcomes. Risk must escalate automatically or explicitly and can never be downgraded by the executing Agent.

## 3. Workflow Levels

### L0 — Default Local Work

Use the default Workflow Contract when work is local, reversible, directly testable, covered by current Context, needs no cross-session recovery and does not change durable API/schema/data/security/recovery/product semantics. No Delivery Contract or long-task binding is created.

`Architecture Context Hit` is an internal high-risk routing question. `Decision Rationale Hit` is an internal `existing|required|none` coverage question. They are not a durable fact, role, validator or artifact, and the check never creates a rationale delta or required file. `Context Delta` remains the only durable-fact decision point.

Product Surface Contract work uses `context_surface_contract` and the existing `contract`, area/subdomain and verification roles. It must not add a new product-surface role; Source-to-Context judgment and Contract Conformance remain internal workflow checks.

### L1 — Standard Long Task

Use one Delivery Contract, one native Goal and one workspace when work has multiple observable Outcomes, crosses modules or needs pause/compaction recovery, but does not hit an L2 risk floor and has reliable executable proof.

### L2 — Strict Long Task

The compiler requires strict when any declared fact is true:

- public API or schema change;
- persistent data change;
- data migration;
- security boundary change;
- permission boundary change;
- irreversible external effect;
- full-population operation;
- multi-repository change is rejected as unsupported;
- critical user path with weak end-to-end observability.

Users may raise risk to strict. A requested `standard` level below the computed floor fails with `risk_level_below_required`. Skill or executor logic can never lower risk.

## 4. Single-Goal Rolling Delivery

The active flow is:

```text
request, discussion, research or external implementation source
-> optional self-contained Source Plan
-> minimum relevant Context
-> one continuously revised Contract Draft
-> Draft Outcome decomposition
-> repository/Context binding and Source -> REQ/CTRL/OBL/AC coverage
-> read-only Authoring Preflight repair loop
-> first formal static Compile and Authority Lock
-> current native Goal executes in current workspace
-> temporary dependency-ready Outcome Frontier
-> targeted repair verification
-> same-Goal repair as needed
-> one-snapshot complete Final Gate
-> Stop freshness
-> external Git/PR/CI/deployment/human confirmation
-> required Context update and drift check
```

Outcome is an independently decidable and target-verifiable acceptance-result unit. It is not a Goal, branch, worktree, worker, frontend/backend layer, file group, output-length fragment or fixed implementation slice. `depends_on` determines acceptance readiness. The current Goal dynamically chooses one or more ready Outcomes as an internal Frontier and forms only the technical detail needed for that Frontier.

The Frontier is not persisted as a scheduler graph. Full file/function/component/test order is intentionally not frozen before implementation discovers current-code reality.

Core execution has no internal parallel mutation. Users may explicitly use platform-native parallel or Git facilities, but those facilities are external and do not change Harness completion authority.

## 5. Canonical Delivery Contract V2

The root authoring file is `delivery-contract.yaml`, schema `long-task-delivery-v2`. It remains a non-authoritative Contract Draft until the first successful formal Compile. New authoring uses inline Outcomes in one file. Existing `outcome_files` parsing remains compatible only as a physical storage choice; fragments create no additional semantic boundary, state or completion authority. Every complete delivery selected by the user stays in one Contract and one Final Gate even when its Outcomes are weakly related.

Every Long Task has at least one real Source file, and every declared Source file contains at least one Material Source Item; background-only material belongs in Context or ordinary references. During Contract authoring, every Material Source Item is wrapped in its original Markdown with a non-rendering `<!-- ty-source-item:start key=... kind=... -->` / `<!-- ty-source-item:end -->` pair without rewriting its text. Source markers support overall results, requirements, independently decided control fields, acceptance criteria, technical obligations, non-completing statements, non-goals, forbidden shortcuts, risk facts, external confirmations and decisions. A `risk_fact` marker also carries exact `fact=<fact-name> outcome=<outcome-key>` metadata. A research proposal, ordinary prose plan or optional Source Plan remains ordinary Source input after this marker-only enumeration and does not need to become strict Contract YAML.

When Source contains stable semantic keys and Markdown anchors, Contract authoring preserves their meaning and reuses them where practical. Meaning-preserving structural decomposition and evidence-backed repository binding may add control states, Assertions, owners, paths, runners and proof. A new business rule, default, threshold, recovery behavior, permission, platform/data scope or other product semantic is a real `decision_required` blocker rather than an implicit Contract expansion.

The Contract keeps three logical authorities in one file:

- **Product Authority**: complete observable end states, first-class atomic Requirements, ownership/surfaces/controls, non-goals and non-completing results.
- **Technical Boundary Authority**: stable obligations, allowed/forbidden path and architecture boundaries, bindings/forbidden shortcuts and strict rollback/recovery constraints.
- **Acceptance Authority**: falsifiable executable Checks, named acceptance criteria, claimed proof surfaces, positive/negative assertions, population/counterfactual obligations and environment requirements.

The required top-level shape is:

```yaml
schema_version: long-task-delivery-v2
task:
  id: stable-task-key
  title: Human title
  goal: Complete delivery goal
  source_paths: [plans/source.md]
  context_refs: []
  context_snapshot_mode: referenced
risk:
  requested_level: auto
  facts:
    public_api_or_schema_change: []
    persistent_data_change: []
    data_migration: []
    security_boundary_change: []
    permission_boundary_change: []
    irreversible_external_effect: []
    critical_user_path: []
    full_population_operation: []
    multi_repository_change: []
    weak_observability: []
global:
  product:
    non_goals: []
  technical:
    constraints: []
    forbidden_paths: []
    forbidden_shortcuts: []
  acceptance:
    checks: []
outcomes: []
```

Each Outcome has a stable `key`, title, dependencies, Product, Technical and Acceptance sections. Product contains a complete set of atomic `requirements`; each Requirement declares its required proof surfaces. UI controls declare location, trigger, input/precondition, loading, empty, success, failure and feedback states. Every Outcome has at least one executable Check.

Checks support the runner kinds `package_script`, `project_binary`, `node_oracle` and `playwright_test` and proof surfaces `ui_browser`, `runtime_behavior`, `api_contract`, `data_state`, `security_boundary`, `population_coverage` and `implementation_structure`.

Model-authored identifiers stop at task, Outcome and Check keys. The compiler deterministically generates internal identities such as:

```text
OUT.<outcome-key>
CHECK.<outcome-key>.<check-key>
CHECK.GLOBAL.<check-key>
```

Authors use stable local keys for Requirements, controls, obligations, bindings and Assertions. The compiler creates canonical Outcome-qualified Requirement, control-field, non-completing, obligation and forbidden-shortcut Claim ids plus `GLOBAL.non_goal.<key>`, `GLOBAL.constraint.<key>` and `GLOBAL.forbidden_shortcut.<key>`. Non-empty control location generates a `control.<key>.location` Claim that requires `ui_browser` proof. Global Claims are covered only by Global Checks; Outcome and Global Assertions cannot cross scope. Global non-goals and forbidden shortcuts require negative proof, while Global constraints accept either polarity. Global forbidden paths remain static changed-path authority and do not become Assertion Claims.

The Source marker key set and `source_claim` key set must be exactly equal across all Source files. Marker keys are globally unique; nested, overlapping, unclosed, empty and invalid markers are rejected. Each Source Claim `statement` equals its marked text after only CRLF/LF normalization, surrounding blank-line removal and trailing-space cleanup. The compiled Source inventory records key, kind, source path, normalized text and text hash inside authority/revision/explain projections; it is not a second authoring file or state surface.

Typed dispositions preserve meaning. Every non-decision Source item owns exactly one canonical target of the same semantic kind and normalized text; a target has one Source owner. `claim` points only to the corresponding non-Result Requirement/Control/Obligation/Non-completing or Global Claim. Outcome `acceptance` points to one stable `<outcome>.<check>.<assertion>` whose criterion is Source-text-identical and which proves at least one non-Result Claim independently backed by a Requirement, Control, Obligation or Non-completing Source item. Global `acceptance` instead uses `GLOBAL.<check>.<assertion>`, remains criterion-identical, proves no Outcome Claim and must prove at least one Global non-goal, constraint or forbidden-shortcut Claim independently backed by another Source item. `outcome_result` is reserved for an explicitly marked overall result. A `risk_fact` marker's Fact/Outcome metadata, disposition and declared risk pair must match exactly, and each pair has one Source owner; ambiguity is `decision_required`. Source Plan authoring uses exactly the ten Runtime names in `risk.facts`, including `data_migration`, separate `critical_user_path` and `weak_observability`, and retained `multi_repository_change`; aliases such as `migration` or a combined critical/weak fact are invalid. Global constraints/non-goals, external confirmations and genuine decisions use their dedicated forms. `out_of_scope` is retired: an explicit Source non-goal maps to a negatively proven Global non-goal, while removing an in-scope item is a compile-blocking `decision_required`.

Compile derives canonical, key-sorted Product, Acceptance and Global semantic projections and combines them with Source hashes/mappings and the selected Context topology/file set/file hashes as Authority Revision materials. Requirement statements, control locations, Assertion criteria and Source-to-Acceptance mappings participate in authority and revision classification. Any Contract authority or material change requires `--revise`; Source or Context cannot be silently refrozen by ordinary compile.

The first successful compile is Authority Lock. From that point, Source/Context/Product/Global semantic changes, Product Claim additions/removals/rewrites, verifier content changes, expanding owner/change/support/binding paths, removing forbidden paths, changing runners or existing verification inputs, reducing `input_paths`, weakening `expected_output_paths`, or weakening artifacts, environment requirements, bindings, obligations, counterfactuals, population or rollback/recovery creates a pending revision whose identity binds previous/next authority hashes, actual materials, verifier projections, diff, risk floor and affected Outcomes. Progress, Receipt/cache deletion and implementation restoration never reopen a weakening window. Every Contract authority structure has a compile-time field-policy registry so newly added fields cannot silently escape authority hashing and revision classification. Only mechanical proof additions, pure verifier relocation and machine-proven scope/input/output tightening may revise automatically. Risk downgrade is rejected and every revision invalidates old progress and Receipts.

Contract length, model output capacity, implementation layers, module count, parallelism and Agent preference never split a delivery or Outcome. If an existing Contract uses `outcome_files`, they are only a compatible physical representation of the same one-Contract authority. The author continues editing until the whole Contract is complete; an incomplete Draft is never formally compiled.

## 6. Composition, Authority And Finalization

One user-selected delivery always produces one Contract and one Final Gate. The workflow does not perform a top-level Contract-capacity or separation decision. `delivery-set` remains a fixed non-executing retirement tombstone.

The first formal Contract compile freezes `initial_task_base` with commit, tree and workspace manifest and immediately becomes Authority Lock. Recompile retains that base. The complete `CompiledDeliveryContractV2` becomes an internal `active-long-task-authority-v3` snapshot under Git common-dir; its hash and the worktree Git-config marker bind task id, authority revision and compiled identity. `.ty-context/compiled-contract.json` is only a rebuildable projection and can never define previous authority, the initial base, risk floor or Final Gate identity. Protected Source/Product/Acceptance/risk/verifier-content changes require `--revise`; reductions create a pending hash-bound Authority Revision, while risk downgrade is rejected. The executing Agent must not approve its own pending revision.

Authority publication is compare-and-swap against the expected previous compiled identity. Commit, verifier migration, accepted clear, valid abandon and corrupt cleanup all use the single `<active-record>.lock`, which contains only pid, operation and creation time for diagnosis and never becomes authority. Compile stages the cache, commits the common-dir authority and marker, then publishes the cache and invalidates derived progress/Receipts. Stop/close clear only when task id, revision, compiled identity and worktree identity still match the Live Gate result. Failed compile/revision/CAS leaves the previous snapshot, initial base and progress intact; a cache publish failure leaves the new common-dir authority valid and repairable. Development-period `active-long-task-binding-v2`, Progress and Receipts are never migrated; they produce `manual_required`, after which the operator upgrades the Contract and forms a new Authority Lock.

Targeted verification persists independent per-Check Progress Records scoped to protected authority, check/runner/verifier identity, relevant Context, input paths, binding carriers and dependency interfaces. Counterfactual Findings are projected into their owning Check Result before Progress creation: a passed Main Check becomes `invalid_evidence`, Claim Proofs are cleared, and the same Finding is recoverable through status/resume. Global Checks use the same record without adding a Global Outcome state. Immediately before writing, targeted verification re-reads active task/revision/compiled/worktree identity; a concurrent revision returns `active_authority_changed_during_verify` and writes no stale progress.

Live Final Gate requires a clean candidate commit after all required Context updates. It captures active task/revision/compiled/worktree identity, recompiles the source Contract, validates the complete common-dir snapshot/marker, creates one Git-tree snapshot and reruns the complete Contract without historical proof reuse. After workspace freshness checks it re-reads active identity; a concurrent revision yields `active_authority_changed_during_final_gate` and `needs_work`, never an accepted Receipt. Verify, status and resume read common-dir authority rather than workdir cache. Receipts remain audit-only.

## 7. Authoring Preflight And Static Compile

`ty-context long-task preflight <workdir>` is a read-only, model-free Authoring check. After parseable structure is normalized, it calls the same activation-safety kernel as Compile in collecting mode and returns every independent diagnostic that can be reliably discovered from that structure. Invalid YAML or invalid root structure stops only the affected structural branch. Preflight never creates or updates Active Authority, initial base, worktree marker, compiled cache, progress, Receipt or pending revision; it does not acquire the active-state mutation lock and never runs project verification.

New authoring uses Compact V2 YAML. The parser fills only deterministic defaults such as empty optional arrays, `context_snapshot_mode: referenced`, `requested_level: auto`, runner `cwd: .`, `timeout_ms: 30000`, `retry_policy: none` and `idempotent: false`. Goal, Source/Source Claims, Context, Outcomes, owners/paths, Requirements, applicable control states, obligations, proof surfaces, runner targets, verification inputs, Assertions, risk facts, forbidden shortcuts and external confirmations remain explicit. Compact and fully expanded forms normalize to the same Contract object, Contract hash, authority hashes, risk, Claim Coverage and compiled identity.

Compile is deterministic, static and model-free. It calls the shared activation-safety kernel in fail-fast mode, so skipping Preflight cannot bypass any safety rule. The kernel:

- strictly parses YAML and rejects duplicate/unknown keys, aliases, merges, tags and multiple documents;
- validates Contract schema and unique Outcome/Check keys;
- generates internal ids and validates Outcome dependencies/cycles;
- inventories all marked Source Items, requires Source/Claim key-set equality and text/kind/file continuity, and validates typed dispositions, registered Context refs and optional real `file#anchor` locations;
- validates repository-contained safe paths, owner/binding semantics, resolved command targets, explicit verification inputs, package scripts, project binaries, Oracle/Playwright targets and structured environment probes;
- rejects symlink and detectable hardlink authority/proof files, including the Contract, fragments, Source, Context, runner targets, verification inputs, frozen package/config files, Counterfactual fixtures and package-owned verifier files;
- compiles and requires coverage for Global non-goal/constraint/forbidden-shortcut Claims plus Outcome result, Requirement, control-field including location, non-completing, obligation and forbidden-shortcut Claims; every Outcome must have at least one non-Result atomic Claim and every Claim must cover all required proof surfaces;
- validates Source-to-Claim/Acceptance/Result/Global/Risk/external/decision coverage, including exact Source Acceptance criterion continuity and rejection of indirect Result compression;
- requires a readable `criterion` for every Assertion, enforces explicit Claim-bearing comparison strength and rejects reuse of a claim-bearing Observation across all Checks sharing one Raw Execution identity;
- derives evidence adapter from runner kind and rejects proof surfaces incompatible with that adapter;
- requires executable falsifiable proof for every Outcome;
- requires `ui_browser` proof when a UI owner surface or controls exist;
- computes effective risk and rejects a requested level below the floor;
- enforces risk-trigger-specific negative, Counterfactual, population, security, environment and rollback/recovery proof, including Binding-carrier mutation containment, value-mismatch-only Counterfactual validity and bounded weak-evidence sensitivity;
- freezes source, Contract, selected Context topology/files, verifier, runner/oracle/command, workdir and repository identity;
- activates the one long-task binding for the current worktree only after a formal successful Compile.

Every path-bearing Contract field uses one canonical segment grammar before Contract hashing, revision comparison, runner/input freeze and matching. `/` and Windows `\` are accepted and normalized to `/`; exactly one leading `./` is removed; runner `cwd` alone may be `.`. Internal `.`/`..`, NUL/CR/LF/Tab, empty segments, absolute paths, Windows drives, UNC paths, brackets, braces, parentheses/extglob and non-segment `**` are rejected. Repository pattern matching, subset and overlap/disjoint use the resulting AST. `not_subset` and `unknown` both fail closed for owner/binding validation and count as expansion in Authority Revision.

Preflight and Compile never implement code, invoke a model, create a process/worktree/branch or run project verification. The first successful formal Compile still creates Authority Lock; Compile does not persist or consult a Preflight receipt.

If actual changes escape declared expected/support paths or touch an undeclared Context owner/boundary, verify/final returns a `scope_escape` Finding. The same current Goal reviews risk/ownership, updates the Contract and recompiles.

## 8. Evidence Kernel

The Evidence Kernel retains only low-level capabilities that directly close false-completion paths:

- repository/workspace snapshot and identity;
- explicit argv command runner with bounded timeout/output and a minimal environment whitelist; only Check-declared `env_var` requirements are additionally passed;
- Raw Execution identity derived from frozen runner identity plus canonical, complete declared Environment Requirements; actual env values never enter compiled identity, findings or Receipts, and per-Check artifacts/Assertions remain independently evaluated after raw command reuse;
- AC-level observation and positive/negative assertion evaluation, including distinct missing/type-mismatch/value-mismatch results;
- implementation binding/path evaluation;
- population coverage evaluation;
- counterfactual controls where strict risk requires them;
- selected Context/source/runner/oracle/verifier hashes;
- Git common-dir Active Authority V3 snapshot plus matching task/revision/identity worktree Git-config marker;
- outcome/check projection and derived status;
- source-recompiled Live Final Gate and audit-only Receipt;
- Stop Hook preflight and decision.

The compiled internal graph is deliberately small:

```text
Task -> Outcome -> Check -> Observation/Assertion
```

Agent/worker prose, hand-written state and command exit code alone cannot create accepted authority. Every Assertion needs an explicit Observation. Missing or type-incomparable values fail closed; negative operators never pass by inverting a type error, implicit absence operators are unsupported, and negative proof uses explicit values such as `equals: false`. Positive Assertions may be empty when exit/artifact/population or negative proof is the intended Check evidence, while Global non-goal/forbidden-shortcut coverage still requires negative Assertions.

Evidence adapters are compiler-derived: `playwright_test` produces `playwright_json_v1` and is the only adapter compatible with `ui_browser`; package scripts, project binaries and Node oracles produce `structured_json_v2` for every non-browser surface. Adapter identity participates in Acceptance Authority, Raw Execution, compiled authority, progress freshness and Final Receipt.

Across all Checks sharing one Raw Execution identity, one claim-bearing Observation belongs to exactly one Assertion. Claims from the same acceptance scenario belong in that one named Assertion instead of duplicating a broad boolean. A Claim-bearing Playwright Assertion has only the canonical form `playwright.case.<ac-key>.passed equals true`, and one Test Instance may bind at most one declared AC through `[ac:<assertion-key>]`. Undeclared tags are ignored and legacy `[<key>]` binds only a declared AC. Aggregate pass/execution/status plus report-error, declared/unbound-unexpected and per-AC unexpected/timeout/interruption counts are diagnostic-only. Missing cases do not synthesize `passed` or `skipped`; missing, skipped, flaky, unexpected, timed-out, interrupted, failed, multi-AC, duplicate-within-project or structurally invalid cases fail closed. The same AC across distinct Playwright projects aggregates only when every observed instance executes and passes.

Claim-bearing Product/Global assertions use explicit expected-value comparisons; unary `truthy`/`falsy` are prohibited and `exists` is limited to an `implementation_structure` obligation. An Outcome Counterfactual names an Outcome Binding; a Global Counterfactual names `binding_ref: <outcome>.<binding>` and reuses an Outcome-owned carrier rather than creating Global Bindings. Both mutate only a proven subset of carriers. `structured_json_v2` remains valid only for completed exit-zero execution with exactly designated `assertion_value_mismatch` failures. `playwright_json_v1` may accept exit one only when the parsed report has no root error and every unexpected Test Instance is uniquely accounted for by the designated, executed, non-skipped/non-flaky/non-timeout/non-interrupted ACs while every unspecified declared AC passes. Unbound/extra Test failures, other Evidence failures, exit zero with unexpected ACs and exit codes above one fail closed. Only a completely explained Playwright exit may drop the generic non-Assertion `test_failed` and normalize designated unexpected ACs to `assertion_value_mismatch`; ordinary Baseline Checks still require exit zero. An `existing` mutation target must exist at Preflight/Compile; a `planned` target may be absent until implementation but must exist at Final Gate and participates in Progress freshness. Every Claim-bearing structured Check needs same-Check Counterfactual coverage for each related Claim, including Global structured Checks. Controls from another Check, unrelated Claims and Artifacts do not satisfy sensitivity; same-Check Population exempts only its own Claims under normal observability and none under weak observability. A Result assertion additionally needs a failing Counterfactual rooted in Result plus a related non-Result Claim.

Standard Playwright content is frozen trusted verifier input, so normally observable Playwright Checks require no Counterfactual. For an Outcome marked `weak_observability`, every claim-bearing Playwright AC and each related Claim requires a same-Check Counterfactual. During that controlled comparison, an executed designated unexpected AC is normalized to `assertion_value_mismatch`; missing, skipped, partial, other-Check and extra failures remain invalid. Frozen Playwright input changes still enter freshness and Authority Revision.

Check evaluation finishes exit, artifact, Assertion and Population evaluation before emitting proof. Claim and Population proofs are empty unless the complete Check status is `passed`.

## 9. Verification And Recovery Semantics

### Targeted Verify

`verify` can select one Outcome, one Check or all repair checks. It runs on a current snapshot, records precise findings and projects current status, but always has `acceptance_authorized: false`. Assertion findings carry the owning Source Claim keys, Product/Technical Claim keys, Assertion key and criterion, Observation, expected/actual values, owner paths and a scoped next action without exposing environment values or secrets.

### Status

`status` is machine JSON and reports each Outcome as:

- `unverified`;
- `progress_passing`;
- `progress_failing`;
- `progress_stale`;
- `blocked_external`.

It is not completion authority.

For compatibility, `final_result` retains its audit classification. Additive `final_workflow_status` reports the fresh Final Receipt's exact `workflow_status`, or `null` when no valid fresh Receipt exists. `external_confirmations` reports the complete declaration from the active compiled authority and is not Outcome Progress.

### Resume

`resume` is read-only and reports Contract/compiled identity, effective risk, relevant Context, current Git HEAD/dirty state, freshness of recent verify/final results, the additive `final_workflow_status`, declared `external_confirmations`, passing/failing/stale/ready Outcomes, recent findings and the next safe action. It starts no process, changes no Git state and does not claim to reconnect a physical Turn.

### Final Gate

`final-gate` creates one current workspace snapshot and reruns all global and Outcome Checks. Fully identical Raw Execution identities may run once inside that Gate and project raw observations to owning Checks, while each Check still evaluates its own AC-level observations, artifacts and Assertions. Global hard failure outranks blocked state; otherwise any Global or Outcome `blocked_external` projects to task `blocked_external`, not `needs_work`.

Bottom-up acceptance succeeds only when all required executable Checks, Outcomes, global constraints and risk-specific obligations pass. Human, CI, deployment and product confirmations exist only as `external_confirmations` and never contribute machine proof. A machine pass with pending external confirmations reports `machine_accepted_external_pending`.

### Freshness And Stop

Receipts and status describe the last audit only. Status/resume report missing or mismatched cache as a diagnostic while retaining common-dir authority, and never project a stale Receipt as a fresh accepted workflow status. Verifier content authority contains package name plus bundle/schema/hook bytes; runtime locator contains package version/root. Pure locator change requires explicit `compile --revise` and auto-increments authority, while content change requires exact user approval; Verify/Final Gate/Stop/close reject stale verifier authority. `stop-check` returns the Final Gate workflow status and confirmations when the Gate ran; external pending is a successful machine stop with a precise non-blocking message, whereas `needs_work`, `blocked_external`, Gate error and CAS failure remain fail-closed. The Stop Hook forwards that message through `systemMessage`. `close` runs the Gate once and returns `closed` plus the accepted workflow status and confirmations only after accepted-identity CAS clear. Doctor reports deterministic `abandon <workdir> --force-corrupt-state` recovery for unrecoverable record/marker/cache/lock state. Force cleanup trusts only current repository/worktree-derived state paths and the contained supplied workdir, removing no Contract, Source, Context or Git content.

## 10. Retry And Decision Boundaries

- Static Contract errors block implementation and are fixed in the same current Goal before product code work.
- Local test/Check failures are repaired in the same Goal with no new Agent or model session.
- Retry defaults to none. A transient verification command gets one mechanical retry only when it explicitly declares `transient_once`, idempotency and a read-only/test-sandbox effect; timeout alone does not establish safety.
- Product, acceptance or architecture semantic conflicts pause for user/main-conversation decision and are not disguised as implementation failures.
- If the current Goal truly ends, a new session uses `resume` for semantic recovery. Harness does not simulate the old Turn or invent a Campaign identity.

## 11. CLI Contract

The active public surface is:

```text
ty-context long-task init <workdir>
ty-context long-task preflight <workdir>
ty-context long-task compile <workdir>
ty-context long-task compile <workdir> --revise
ty-context long-task approve-authority-revision <workdir> --revision <sha>
ty-context long-task explain <workdir>
ty-context long-task verify <workdir> [--outcome <key>] [--check <key>]
ty-context long-task status <workdir>
ty-context long-task resume <workdir>
ty-context long-task doctor <workdir>
ty-context long-task final-gate <workdir>
ty-context long-task stop-check <workdir> [--message <text>]
ty-context long-task close <workdir>
ty-context long-task abandon <workdir>
```

No Long-Task CLI command may start Codex/AppServer/agents, create/delete worktrees or branches, merge, push, open PRs, retry model calls or manage process trees. Only a Contract-declared project verification command may create a child process.

`composite-campaign` and `composite-long-task` are lightweight retirement tombstones only. They report `retired`, do not execute historical state and direct users to `ty-context long-task`.

## 12. Skills And Distribution Profiles

`/source-plan-authoring` is an explicit-trigger upstream Skill for users who ask for an initial plan, source plan or an audit/refinement of such a plan for later implementation or Contract authoring. It produces one self-contained Markdown document. Direct requirements retain their qualifiers; necessary derivations cite their source and must not change product meaning; unsupported new product semantics become `DEC`/`decision_required`. Outcomes split only by independently decidable results, stable lowercase-kebab keys and explicit anchors reduce later Source mapping drift. Each decided CTRL independently records Location, User task, Trigger, Input, Loading, Empty, Success, Failure and Feedback. `NCOMP` records an explicit non-completing meaning. Each RISK records an exact Fact, one Affected Outcome, Basis and Consequence; uncertainty becomes `DEC`. One Given/When/Then AC scenario names its accepted REQ/CTRL/OBL/NCOMP keys. `OBL` remains mandatory while `HINT` is advisory and non-material.

The Skill is intentionally model-guidance only. It creates no Source Plan Schema, CLI, Preflight, Compile, Receipt, Coverage Cache, Authority, state file, dedicated Validator, mandatory format gate, Context update, repository binding, Delivery Contract, implementation or completion result. Its recommended structure improves declared Source quality but cannot prove that the user stated every real requirement. This anti-goal preserves the Harness rule that a mechanism is added only when its distinct drift-prevention value justifies its authoring/runtime/recovery cost.

`context_product_plan` keeps its existing responsibility: make product judgments inside a Tiny Context project, classify durable product facts and update the owning `project_context/**` surfaces. It is not a required stage before or after Source Plan authoring.

`/long-task-workflow` remains the only active long-task execution Skill. It preserves the user/external proposal or optional Source Plan as Source, inserts only Material Source Item markers into the original text, authors one complete Compact V2 Contract with set-equal Source Claims and semantic Outcomes using REQ/CTRL/OBL/AC, runs read-only Authoring Preflight, formally compiles only when Preflight is ready, continuously implements rolling Frontiers in the current native Goal, resumes semantic state, runs the Live Final Gate and reports results. It creates no second Contract plan, Source Inventory file/Receipt, intermediate Contract-authoring product, matrix or top-level Contract split.

`/normal-long-task` is a retirement pointer and creates no checklist, prompt or Local Audit.

Profiles are:

- `core-portable`;
- `workflow-default`;
- explicit `long-task`.

`ty-context enable long-task` installs the Source Plan Authoring Skill, Long-Task Workflow Skill, Stop Hook and required templates. Disabling the profile removes both package-owned Skills and the package-owned Hook while preserving user Skills and Hooks. Enable, disable and upgrade share one entry-level Hook cleanup function. Current or relocated package-owned absolute commands are recognized only with a known Tiny Context managed status, an exact `node "<absolute>/dist/long-task-hook.js"` shape and a known `node_modules`, pnpm or workspace-package layout; exact retired repo-local commands remain migratable. User entries in the same group, no-status lookalikes, user-only groups and commands merely containing `composite` are preserved.

Upgrade safely changes package-owned `composite-codex` profile selection to `long-task`, removes package-owned retired assets and leaves user-authored historical campaign/source/Contract files untouched. It never imports an unfinished campaign or automatically executes it.

## 13. Managed And Packaged Surfaces

- `.codex/ty-context-managed/**` is managed source.
- `packages/ty-context/assets/**` is package canonical output.
- `packages/ty-context/source-mappings.yaml` defines source-to-package mapping.
- `.codex/ty-context-managed/skills/source-plan-authoring/SKILL.md` is canonical Source Plan Skill source; sync generates the source-workspace and package copies through the existing managed skills tree mapping.
- `.codex/skills/authoring/**` remains source-workspace-only.
- README, Chinese README, package README, Context, AGENTS managed block, Skills, tests, release scripts and package assets must describe the same current workflow.
- Public surfaces are English-complete; Chinese is an aligned translation.

The package version for this architecture is `0.6.0`, the first public V2 semantic contract. The schema name remains `long-task-delivery-v2` and existing `outcome_files` remain a physical parser form, but development-period Draft activation compatibility is not promised. Missing Source markers/criteria, Result compression, retired `out_of_scope`, adapter spoofing and incomplete required surfaces receive explicit migration diagnostics. Development-period V2 Active Authority, Progress and Receipts report `manual_required` and are not migrated.

## 13. Performance And Cost Boundaries

Release update mode is part of the release contract. Every published version declares `sync-only`, `upgrade-required` or `manual-required`; `ty-context upgrade --check` reports `safe_pending`, `manual_required` and `blocked`, and direct `sync` does not run migrations. The reusable exact-tarball fixture contains marked Source, a Source-backed non-Result Claim, criterion, Binding and real same-Check Counterfactual covering Result plus that Claim; both Trusted Publishing and emergency fallback run the full fixture against the same prepared tarball before publish.

- Compact single-Outcome fixtures are at least 35% shorter than the expanded template while compiling identically.
- Small-fixture Authoring Preflight target: at most two seconds.
- Small-fixture Compile target: at most two seconds.
- Small-fixture status/resume target: at most one second.
- Focused new loop tests target: at most five minutes.
- Complete Long-Task Workflow suite: at most fifteen minutes.
- Harness makes no model calls, implements no model retry and starts no long-lived child process outside declared verification commands.
- Automated tests call no real Codex, VM, browser matrix, large worktree farm or real external service.
- Local timing may report compile/verify/final wall time, invocation count and failure stage. Harness does not fabricate tokens, model calls, parent-agent attention or platform Goal duration.

## 14. Completion And Honest Limits

The architecture is complete only when CLI, Compact/expanded Contract normalization, marked Source/REQ/CTRL/OBL/AC coverage, shared activation-safety validation, adapter-bound AC-level Evidence Kernel, Counterfactual sensitivity, passed-Check-only proof, precise findings, Skill/profile/Hook/assets, compatibility diagnostics, docs/Context, tests, consumer smoke, package tarball and source sync all agree; the active runtime contains none of the retired orchestration plane; controlled temporary-repository tests prove Preflight non-mutation and repair/final/stale/close behavior; and a local commit records the change.

Stable honest limits:

- Harness does not create or restore a platform physical Goal.
- Harness does not prove the user never omitted an undeclared requirement.
- Harness provides no core parallel mutation.
- Harness does not observe platform token/model-call accounting.
- Git/PR/CI/deployment/human product confirmation remain external.
- Local mode trusts the installed package-owned verifier and Git metadata.
- Network isolation remains the responsibility of the external platform.

## 15. Historical Design Boundary

Earlier pre-0.5 designs experimented with stage document chains and later with multi-SFC campaign orchestration, including Source Unit inventories, Scope Fit, Packets, Codex/AppServer workers, Waves, worktrees and integration/finalization gates. Those designs provided useful evidence-freshness lessons but made Harness own platform/process/Git responsibilities with diminishing delivery-drift benefit.

Version 0.6.0 keeps the reusable Evidence Kernel lesson—static falsifiability, current-snapshot recomputation, identity binding and Stop freshness—while retiring the orchestration plane. It also closes the remaining declared-authority and evidence bypasses through machine-enumerated Source Items, shared activation validation, runner-derived adapters, all-of proof coverage, globally owned observations, value-sensitive Counterfactuals and passed-Check-only proof. This refinement is implemented under the ordinary default workflow and proves Long-Task behavior only in temporary fixture repositories, avoiding circular self-acceptance. Historical names may appear only in explicit history, migration tests or command tombstones, never as current product behavior.
