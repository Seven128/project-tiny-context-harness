# Project Tiny Context Harness — Product And Workflow Specification

## 1. Product Purpose

Project Tiny Context Harness is repo-native memory and delivery-drift protection for AI coding agents. Its design is intentionally small:

1. **Minimal Context** preserves durable project facts that code cannot reliably explain: goals/non-goals, ownership, architecture/interface/state boundaries and repeatable verification/deployment paths.
2. **Workflow Contract** defines the lightweight default loop: core/default Context, manifest routing plus one bounded Context search, one `Context Delta`, a conditional Design Authority Check for material production UI, platform-internal planning, implementation, project verification, Contract Conformance and Context drift checking.
3. **Long-Task Workflow** turns an ordinary user request or external implementation proposal into one complete Canonical Delivery Contract, then adds verifier-owned current-snapshot acceptance for work that needs pause/compaction/new-session recovery or multiple observable outcomes.

The optional `source-plan-authoring` Skill is an upstream Source-quality helper, not a fourth authority layer. It turns either a nearly complete draft or a sparse goal plus mixed documents, screenshots, diagrams and other attachments into one self-contained Markdown Source Plan. It inventories every supplied input, preserves direct meaning, records traceable derivations and defensible recommended plan choices as delegated Source, expands interactive products to surface/region/control/state/feedback granularity, exposes only genuinely unresolved decisions and supplies observable acceptance scenarios. Before choice-sensitive research or a material product, technical or provider selection, it asks for any missing user preference that could change the research or recommendation; once the preference envelope is clear, it researches as needed and delegates the supported recommendation without another approval pause. It separates plan meaning from action authorization: real high-risk external actions remain explicit confirmations. It does not update Context, bind a repository, create Contract/runtime state or claim completion.

The complete approved Source Plan for the page-level UI/UX authority upgrade is indexed at [`docs/page-level-uiux-authority-source-plan.md`](docs/page-level-uiux-authority-source-plan.md). It records input provenance, stable requirement/outcome/acceptance keys, the Design Context Depth Model, UI Authority Closure, Control field semantics, non-goals, risks and verification impact. It is upstream Source/navigation rather than registered Context or completion authority.

Standalone design-resource generation stays outside Tiny Context. Dedicated Product Design, Figma, image-generation, prototype and human design systems may produce flows, low/high-fidelity targets, tokens, assets, components and prototypes in project-native formats. Tiny Context consumes those outputs as ordinary external Source; candidates authorize no fidelity, while selected exact targets and constraints control only declared conditions. The downstream default or Long-Task workflow performs UI Authority Closure, durable adoption, implementation and proof without a package-owned generation Skill, pack schema or validator.

Minimal Context optimizes two purposes: preserve durable non-implementation facts, and let an Agent recover and update those facts with low search and attention cost. Near-universal facts use the core files and default area root; specialized role Context is `on-demand`. Before `Context Delta`, manifest candidates are supplemented by one bounded text search over `project_context/**` using a small set of high-signal task terms. The search creates no index, cache, registry, state or authority. `ty-context doctor` reports the deterministic default read set, byte footprint, soft-budget overages, exact duplicate default files and `DESIGN.md` authority status; this is advisory observability only.

Material production UI adds UI Authority Closure and one conditional readiness question rather than a design phase or artifact chain. The depth model assigns global principles, cross-surface responsibility, Screen/Control semantics, visual-system facts, concrete targets and verification to distinct owners. Stable surface/control/target keys connect them. Relevant surface/interaction Context defines what the screen must let the user judge and do; `DESIGN.md` defines the visual system, one authored token source/generation direction and the interpretation of durable references; versioned authored targets remain project Source or verifier inputs. `exact-target` permits fidelity comparison only for its named conditions, `constraint` governs only its stated scope, and `inspiration`, a candidate or an unconfigured starter never authorizes invented production layout. Dedicated external design systems may author candidates and selected targets upstream; a material unresolved preference remains a genuine decision, and downstream adoption remains separate.

The Long-Task Workflow V2 product equation is:

> one complete delivery = one authoritative target-qualified Contract + one continuing platform-native Goal + one selected workspace + one user model-choice checkpoint + stage-constrained rolling technical implementation + one trustworthy capability-aware Evidence Kernel + one Final Gate

The controlling objective, trusted-result boundary, Draft lifecycle, upstream Source boundary and mechanism-admission rule below govern every later Long-Task section. Existing implementation convenience, historical progress or local wording cannot weaken them.

## Long-Task Workflow Controlling Objective

The highest Long-Task objective is to prevent false completion inside declared authority. This objective applies when the delivery Source is complete and fine-grained enough to cover every declared requirement and acceptance criterion, and each item has reliable, executable acceptance evidence that the executing Agent cannot weaken by itself. Under that prerequisite, no declared Plan Item or AC may be accepted or reported as complete until it is actually satisfied.

The workflow does not promise that implementation stays on course at every intermediate step, and it does not promise that a model can finish the work. The current Goal may explore, fail, rework and change implementation sequence. The workflow constrains the final acceptable state by requiring it to:

1. compare Source Authority, the Contract, relevant Context and the current final artifact continuously enough to identify delivery drift;
2. block false completion whenever a declared requirement or AC remains unsatisfied;
3. localize the problem to its Source Item, Stage, Outcome, Claim, Assertion, Check, Evidence Capability, execution target, Binding or ownership boundary;
4. give the current Goal an actionable repair direction;
5. revalidate the complete Contract against the current final snapshot before delivery; and
6. reject summaries, progress, historical tests, Receipts, a single command exit code and Agent judgment as completion substitutes.

Current-snapshot evidence outranks implementation narrative and historical results. If any declared item is unsatisfied, unverifiable or no longer backed by fresh evidence, the workflow must keep the task unfinished rather than soften the completion wording. This guarantee covers only declared and verifiable authority; it cannot prove that the user never omitted a real requirement.

The efficiency objective is the lowest practical total workflow cost that preserves this false-completion interception strength. Prefer equal protection with lower Authoring, Runtime, State, Recovery, model, maintenance and test cost, or equal cost with stronger independent protection. Admit a mechanism when its expected independent benefit is greater than its total cost; unusually high ROI is not required. Prefer one cohesive implementation when partial changes would leave semantic seams or cost more through repeated migration and maintenance. Efficiency never authorizes uncertain acceptance: when the evidence boundary is unclear, the workflow still fails closed.

## Authority Scope And Trusted Results

The complete authority and evidence chain is:

1. **Source** preserves original delivery meaning.
2. **`project_context/**`** preserves durable project facts.
3. **Contract Draft** is the still-editable structured expression before Authority Lock.
4. **Compiled Contract / Authority Lock** is the formal declared authority created by the first successful formal Compile.
5. **Execution-model choice** lets the user retain the current model or switch models before implementation; it is not authority or proof.
6. **Current Code** is implementation reality.
7. **Check Evidence** is typed, current-execution behavior evidence for declared Claims and Assertions, bound to the declared scenario, journey role, execution target and Evidence Capabilities.
8. **Final Gate** computes machine acceptance on one current final snapshot.
9. **External Confirmation** owns CI, deployment, Git-hosting, human product acceptance and other non-machine authorities.

Within machine authority, only two result classes are trustworthy:

1. reliable evidence on the current final snapshot proves every declared requirement and AC is satisfied; or
2. something is unsatisfied, unverifiable, insufficiently evidenced, stale or awaiting external confirmation, so the task remains explicitly unfinished or qualified.

`machine_accepted_external_pending` is the second class with a precise boundary: all machine-verifiable authority passed, but complete external delivery did not. Public reporting must name the pending external confirmations. It is not full delivery completion and not a vague third state between complete and incomplete.

Qualification continuity is end-to-end. `final-gate`, `status`, `resume`, `stop-check`, the package-owned Stop Hook and `close` preserve the same accepted `workflow_status` and complete declared `external_confirmations`. A stale Final Receipt exposes no accepted workflow status. Stop/close may clear the accepted machine Authority through CAS, but `closed` means only that the machine lifecycle ended, never that external delivery completed. This adds no external-confirmation state, Receipt or completion tracker.

Authority conflict indicates drift, omission, stale information or a genuine decision. Source or Contract meaning must never be silently changed to fit current code. Progress, Receipt, status and compiled cache are recovery or audit projections, not acceptance authority. `resume` restores semantic state rather than a previous physical Turn. Source, Controlling Context, Contract, verifier, runner or workspace changes stale affected results. A supporting-only Context revision may preserve otherwise-fresh scoped Progress, but it clears the Final Receipt and Final Gate still binds the complete current Context snapshot. Historical evidence cannot be spliced into current completion.

The current platform session is the execution Goal. Harness does not create, simulate, persist or reconnect physical Goals or Turns, and Git history remains the ordinary record of Contract edits rather than a second plan or completion authority.

Authority Revision adoption likewise is not a delivery completion. When rolling implementation meets a blocker, implementation difficulty alone cannot reclassify machine-verifiable work as external or remove it. A real Product, Acceptance or machine/external boundary change first becomes marked Source and then a protected exact revision. Adoption invalidates affected evidence and returns the current Goal to rolling implementation or repair under the revised Authority. Revision output makes that no-completion effect explicit.

Machine acceptance remains limited to declared machine Authority and has no direct effect on the platform-native Goal. Before completing that Goal, the Agent performs a veto-only conformance review against the current user/Goal meaning and accepted marked Source, including pending revisions, blockers and omitted requirements. A mismatch keeps the Goal active and triggers Source/Contract repair; a clean review is not positive acceptance evidence and never substitutes Agent judgment for Final Gate proof.

## Contract Draft And Draft Outcome Semantics

`delivery-contract.yaml` is a **Contract Draft** until the first successful formal Compile. The Draft is one continuously revised, non-authoritative object: it may take multiple model responses and multiple rounds of repository reading, Context reading, Preflight diagnostics and repair before it is complete. It has no separate Draft Receipt, Authoring State, second plan, draft schema, draft CLI or draft runtime state. The first successful formal Compile creates Authority Lock; that lifecycle change does not replace the file with another authoring product.

A **Draft Outcome** is simply an Outcome in that pre-lock Contract Draft. It is a lifecycle qualifier, not a new entity. Formal Compile places the same Outcome under Contract Authority without converting a `DraftOutcome` runtime type or creating `draft_outcomes`, a state file, Worker, scheduling queue or independent completion authority.

**Plan Item** is a design-level collective term, not V2 schema. It covers atomic Requirements; applicable Control fields, locations and states; Non-completing Outcomes; Technical Obligations; Global Non-goals, Constraints and Forbidden Shortcut Claims; and every other declared requirement that must be expressed as a non-Result Claim. An AC corresponds to one stably named Acceptance Assertion. An Outcome Result cannot substitute for a Plan Item or AC. V2 therefore adds no `plan_items` field, PI file/state/Worker or restored three-input execution chain.

Draft Outcomes decompose requirement coupling. Create an Outcome only when its result is independently observable, independently decidable, target-verifiable, able to express dependencies and localizable to its own Claim, Assertion, Check and owner boundary. That decomposition lets the current Goal:

1. expand implementation detail only for dependency-ready Outcomes and keep a smaller working set;
2. run targeted verification for one Outcome or Check and shorten feedback;
3. localize failure to an Outcome, Claim, Assertion, Check, Proof Surface, Binding and path;
4. resume ready Outcomes, findings and the next safe action without re-deriving the whole task;
5. mark formerly passing local results stale when their authority or evidence changes; and
6. use Outcome dependencies to order rolling implementation and verification.

`depends_on` means acceptance readiness. Source-declared delivery stages add only a product-delivery order: each vertical Outcome belongs to one stage, each stage names a gate Outcome, the gate transitively depends on the rest of that stage, and later stages transitively depend on prerequisite gates. Every Stage Gate executes from the root entrypoint of every required product target and proves `target_runtime`; a Stage containing multiple Outcomes additionally proves `cross_surface_consistency` over at least two distinct surfaces in one current runtime state. The current Goal derives its Rolling Frontier from those existing edges and current Outcome Progress. No Stage Receipt, persisted scheduler, Worker queue, model-routing plane, process tree, second Gate or separate execution DAG exists, and Final Gate still revalidates the complete Contract on one current snapshot.

Outcome boundaries must not be based on model-output length, YAML/file length, frontend/backend layers, file/module count, Agent capacity, Worker assignment or desired parallelism.

> Outcome decomposes execution and diagnosis, not completion authority.

## Source Plan And Contract Draft Boundary

**Source** may be a user request, ordinary prose plan, research proposal, external proposal, optional Source Plan or externally authored design resource. It preserves original delivery semantics and need not follow a recommended authoring format.

The optional **Source Plan** authored by `source-plan-authoring` is an upstream Source-quality aid. It accepts refinement, mixed-input synthesis and hybrid authoring without requiring a fixed intake form. It inventories and fully accounts for supplied artifacts, preserves direct requirements and qualifiers, and makes necessary derivations traceable. An instruction to synthesize, refine, complete, flesh out or use judgment is default plan-authoring delegation, but it does not invent the user's tradeoff priorities. Before comparative research or a material product, technical, architecture or provider selection, the Skill identifies the decision criteria that could change the research scope, candidate set or recommendation. If a priority such as quality versus cost, delivery speed, reliability, privacy, lock-in or operational burden is unknown or ambiguous, it stops and asks one concise targeted clarification before research or selection. Known preferences are not re-asked, and minor reversible choices whose recommendation would not change do not trigger this conditional gate.

After the material preference envelope is clear, the Skill decides what research is needed. Current external capability, pricing, quota, licensing, compatibility, regional availability, security posture and support claims use authoritative or primary sources. When those preferences and evidence support one defensible recommendation, the Skill records that choice as `delegated` with its instruction, basis and exact added meaning instead of asking the user to approve it. A conservative no-effect baseline can preserve an unapproved action gate, but it cannot stand in for an unknown product or technical priority. High impact alone does not make plan semantics unresolved.

A delegated plan choice authorizes meaning, not action. Payment or purchase, contract acceptance, production deployment or public release, destructive production mutation, a real permission grant, sensitive-data transmission and required legal/security/human approval remain named External Confirmations. The plan may select zero spend, disabled production capability, least privilege, explicit opt-in, minimum justified retention, staging/POC or another conservative pre-authorization baseline while preserving the intended later capability behind that gate. Only conflicting authority, an explicitly user-reserved choice, a missing material preference or semantics with no defensible recommendation remain `decision_required`.

For an interactive product, the Source Plan enumerates in-scope surfaces and material controls through region, type/label, placement, task, visibility/availability, trigger/input/validation/default, interaction/navigation, loading/empty/success/failure/recovery/permission/feedback and accessibility. It gives important content stable semantic keys and anchors; each Risk names a Fact and Affected Outcome; each AC represents one scenario and names its accepted REQ/CTRL/OBL/NCOMP keys; and HINT remains non-material advice. A recorded delegated item is ordinary Source meaning for later Contract authoring, not permission for `long-task-workflow` to extend the delegation or invent another product choice.

The Skill emits no `ty-source-item` markers. It is not a Contract Draft, Delivery Contract, project Context, repository binding, workflow Authority, implementation plan or completion proof. Its recommended structure is an Authoring Fast Path rather than an input protocol; missing recommended headings, keys, anchors or type labels does not block Contract authoring.

Externally authored design resources are ordinary Source regardless of whether they arrive as Figma frames, images, prototypes, token exports, component specifications or another project-native format. Tiny Context requires no common pack or upstream sequence. A candidate, inspiration reference, mutable latest locator or implementation-generated screenshot authorizes no fidelity Claim. A selected exact target needs recorded selection basis, declared condition coverage and stable immutable identity, but remains upstream Source until the consuming workflow reconciles it against Context/`DESIGN.md` and adopts it. Tool-specific generation/export validation creates no Design Authority, Contract authority or acceptance.

Before Long-Task activation, every Material Source Item receives a non-rendering, meaning-preserving marker in the original Source without rewriting its text. Contract authoring may add only:

- meaning-preserving structural decomposition; and
- repository bindings for owners, Context, paths, runners, verification inputs, proof surfaces and Bindings that are supported by real repository or Context evidence; and
- a defensible recommended plan choice after material preferences are known and after appending or revising real Source to record its delegation, basis and exact meaning without rewriting the user's original text.

The executing Agent must not place a new business rule, default, threshold, permission, recovery behavior, platform/data scope, persistence/retention policy, irreversible behavior or other product choice only in Contract YAML or relabel it as a necessary derivation. If an unknown user preference could materially change comparative research or selection, Authoring asks before proceeding. If a defensible recommendation then exists, it first becomes delegated real Source and any high-risk external action remains an External Confirmation. If authority conflicts, the user reserves the choice, a material preference remains unknown or no defensible recommendation exists, it remains `decision_required`. Missing preferred formatting does not block; missing genuine Source resolution does.

## Integrated Contract Authoring Rationale

Contract Draft authoring belongs inside `long-task-workflow`; there is no separate `contract-authoring`, `draft-authoring` or `prepare-long-task-draft` Skill. A separate single-response authoring surface was rejected because a complete Contract may exceed one response and cannot reliably be required to emerge complete in one pass.

The integrated design is also required because:

1. a Contract Draft must inspect the real repository and relevant Context before binding owners, paths, runners, verification inputs, proof surfaces and Bindings;
2. Preflight findings feed directly back into the same Draft;
3. a separate Skill adds a handoff where Source meaning, repository evidence or unresolved findings can be lost;
4. a separate product tends to create a second plan, Authoring Authority or Authoring Receipt;
5. Draft-to-Compile is a lifecycle transition of one authority object, not a handoff between two products; and
6. one Skill can keep revising the same Draft across as many responses as needed, then continue through Preflight, Compile, the one-time model choice, rolling execution, verification and Final Gate.

`source-plan-authoring` remains a platform-neutral optional upstream helper. External design systems likewise produce ordinary Source without replacing the repository-aware Contract Draft authoring owned by `long-task-workflow`.

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

Retain an acceptance mechanism only when it provides clear, non-substitutable drift-prevention value. A non-authority workflow affordance may additionally be retained when existing fail-closed protection makes a material total-cost reduction possible and the affordance adds no acceptance bypass, second Authority, second plan, scheduler or persistent control state. The first-lock execution-model choice uses this second rule. This remains a specification and code-review principle, not a new mechanism matrix, Receipt or runtime Registry.

Revision-return and terminal-scope affordances use that same non-authority rule. Compile/revision JSON reports `delivery_completed_by_this_event: false` and a rolling next action; Final Gate/Stop/close output reports `acceptance_scope: declared_machine_authority` and `native_goal_effect: none`; close additionally reports `closed_scope: machine_authority`; and the Stop Hook emits one non-blocking scope message. These fields and guidance close state-transition ambiguity without a persistent `authority_revision_in_progress`, native-Goal state, second semantic Gate or Goal restoration runtime.

Apply protection proportionally: L0 work must not pay Contract cost; L1 pays for one complete Contract, rolling execution and a current-snapshot Final Gate; L2 raises proof only on affected high-risk Outcomes. Risk must escalate automatically or explicitly and can never be downgraded by the executing Agent.

## 3. Workflow Levels

### L0 — Default Local Work

Use the default Workflow Contract when work is local, reversible, directly testable, covered by current Context, needs no cross-session recovery and does not change durable API/schema/data/security/recovery/product semantics. No Delivery Contract or long-task binding is created.

Default Context discovery reads the core/default set, collects manifest area/role/trigger candidates and then performs one bounded text search over `project_context/**` before `Context Delta`. The search uses a small set of high-signal task terms, reads only relevant matches and creates no vector/persistent index, cache, registry or search state. Keyword matching supplements semantic judgment and final Conformance rather than replacing them.

`Architecture Context Hit` is an internal high-risk routing question. `Decision Rationale Hit` is an internal `existing|required|none` coverage question. They are not a durable fact, role, validator or artifact, and the check never creates a rationale delta or required file. `Context Delta` remains the only durable-fact decision point.

The architecture gate is risk-triggered rather than universal. It applies to new durable modules/capabilities, public API/schema/data/persistence, source-of-truth or state ownership, dependency direction, cross-area boundaries, migration/security/recovery/compatibility and reusable abstractions. It resolves owner, unique source of truth, dependency direction, interface/state lifecycle, failure/retry/recovery/compatibility, forbidden shortcuts and a project-owned executable architecture check. Small local fixes do not pay this cost. Harness may route repository-native lint/AST/dependency/contract checks but does not become a language-generic architecture analyzer.

Product Surface Contract work uses `context_surface_contract` and the existing `contract`, area/subdomain and verification roles. It must not add a new product-surface role; Source-to-Context judgment and Contract Conformance remain internal workflow checks.

The Design Context Depth Model adds no role: global principles, cross-surface Product Surface Contracts, optional on-demand Screen/Control Context, `DESIGN.md`, project-native authored targets and verification remain distinct fact depths. `product-surface-contract.md` owns cross-surface responsibility; `screen-contract.md` is the portable Screen/Control structure. UI Authority Closure reconciles stable surface/control/target keys as Context-covered, Context update, task-local, out of scope or decision-required before material implementation.

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

Users may raise risk to strict. A requested `standard` level below the computed floor fails with `risk_level_below_required`. Skill or executor logic can never lower risk. L1 and L2 use the same workflow and Outcome model; L2 only raises proof requirements on affected Outcomes.

## 4. Single-Goal Rolling Delivery

The active flow is:

```text
request, discussion, research or external implementation source
-> optional self-contained Source Plan
-> optional externally authored and selected design Source
-> minimum relevant Context
-> one continuously revised Contract Draft
-> Draft Outcome decomposition
-> repository/Context binding and Source -> REQ/CTRL/OBL/NCOMP/AC coverage
-> read-only Authoring Preflight repair loop
-> first formal static Compile and Authority Lock
-> one-time execution-model choice
-> current native Goal executes in current workspace
-> temporary dependency-ready Outcome Frontier
-> targeted repair verification
-> same-Goal repair and Context Delta updates as needed
-> optional stateless diagnosis of the same Contract's scope-only revision candidate
-> one exact pending approval and atomic Authority replacement when protected
-> one-snapshot complete Final Gate
-> Stop freshness
-> external Git/PR/CI/deployment/human confirmation
```

Outcome is an independently decidable and target-verifiable acceptance-result unit. It is not a Goal, branch, worktree, worker, frontend/backend layer, file group, output-length fragment or fixed implementation slice. `depends_on` determines acceptance readiness. The current Goal dynamically chooses one or more ready Outcomes as an internal Frontier and forms only the technical detail needed for that Frontier.

The Frontier is not persisted as a scheduler graph. Full file/function/component/test order is intentionally not frozen before implementation discovers current-code reality.

The host and user own model selection. Harness cannot switch the model of a running conversation or Goal and creates no model-tier scheduler, model-route state or checkpoint acknowledgement. The first Authority Lock is the one deliberate exception to uninterrupted execution: Compile emits `execution_model_checkpoint.required: true`, the Agent stops before implementation, and the user chooses `continue_current_model` or switches models and resumes the active task. A task-specific model choice already stated explicitly satisfies the checkpoint. Later revisions return `required: false`; no repeated model pause occurs. The choice reduces execution cost by using the already locked Contract and Final Gate protection, but it is not completion authority.

Harness never proactively spawns, assigns, coordinates, retries or recovers parallel subagents. Platform-native internal delegation may occur as opaque Agent behavior, but Harness neither depends on nor persists it and never treats it as progress or proof. Every change must converge into the one current workspace snapshot before Contract-declared verification can count.

`Context Delta` remains live after Authority Lock. When implementation or repair discovers a durable fact, the current Goal updates the owning Context rather than preserving a known stale fact until the end. In referenced mode, core Context, explicit `context_refs`, verification/deployment Context and every selected requirement-bearing role are **Controlling Context**; changes require protected Authority Revision and may require exact user approval. Only graph-derived, non-explicit `implementation-index` and `archive` files are **Supporting Context**; a supporting-only content revision may auto-revise through `compile --revise` and preserve otherwise-fresh targeted Progress. Full snapshot mode and explicit references treat every selected file as controlling. Final Gate always recompiles and records the complete current Context snapshot.

Target-runtime feedback is also rolling, but remains non-authoritative. If a declared result can pass on a proxy surface while failing in its target runtime, the earliest Outcome that owns the first runnable boundary declares a project-owned Check that exercises the target during the current Raw Execution and derives its asserted Observation from that session. A tracked status report, screenshot, binary, log or historical run cannot be the sole proof of that Claim. The Check declares its runtime-affecting `input_paths`, Binding carriers, verification inputs and environment requirements through existing Contract fields.

The Contract declares one bounded target profile, its exact non-empty required product target refs and each target's runtime family and root entrypoint. A Web/process proxy cannot satisfy an independently required Native/desktop target. Browser target execution uses `playwright_test`; Native and desktop target execution uses `project_binary`. Every `critical_user_path` Outcome and every Stage Gate proves every required target from its root entrypoint.

The current Goal targeted-verifies those Checks after the first runnable slice and again before dependent work grows when accumulated relevant changes have made their Progress stale. Related edits are coalesced and the cheapest reliable target Check is used; there is no mandatory full environment rebuild per Outcome or per edit. This adds no open-ended `platform_impact` taxonomy, per-platform progress state, scheduler or alternate acceptance path. Final Gate still reruns every declared target-runtime Check on the final snapshot.

## 5. Canonical Delivery Contract V2

The root authoring file is `delivery-contract.yaml`, schema `long-task-delivery-v2`. It remains a non-authoritative Contract Draft until the first successful formal Compile. New authoring uses inline Outcomes in one file. Existing `outcome_files` parsing remains compatible only as a physical storage choice; fragments create no additional semantic boundary, state or completion authority. Every complete delivery selected by the user stays in one Contract and one Final Gate even when its Outcomes are weakly related.

Every Long Task has at least one real Source file, and every declared Source file contains at least one Material Source Item; background-only material belongs in Context or ordinary references. During Contract authoring, every Material Source Item is wrapped in its original Markdown with a non-rendering `<!-- ty-source-item:start key=... kind=... -->` / `<!-- ty-source-item:end -->` pair without rewriting its text. Source markers support overall results, requirements, independently decided control fields, acceptance criteria, technical obligations, non-completing statements, non-goals, forbidden shortcuts, risk facts, external confirmations and decisions. A `risk_fact` marker also carries exact `fact=<fact-name> outcome=<outcome-key>` metadata. A research proposal, ordinary prose plan or optional Source Plan remains ordinary Source input after this marker-only enumeration and does not need to become strict Contract YAML.

When Source contains stable semantic keys and Markdown anchors, Contract authoring preserves their meaning and reuses them where practical. Meaning-preserving structural decomposition and evidence-backed repository binding may add control states, Assertions, owners, paths, runners and proof. A defensible recommended plan choice may proceed only after its delegation, basis and exact meaning are recorded in real Source; it cannot be an implicit Contract expansion. Conflicting, user-reserved or unsupported product semantics remain real `decision_required` blockers, and high-risk external actions remain External Confirmations.

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
  target_profile:
    key: selected-delivery
    description: Exact target scope
    required_state: target_profile_usable
    required_target_refs: [product-runtime]
  execution_targets:
    - key: product-runtime
      description: Required product runtime
      role: product
      runtime_family: process
      root_entrypoint: package-script
  source_paths: [plans/source.md]
  context_refs: []
  context_snapshot_mode: referenced
stages:
  - key: delivery
    title: Complete delivery
    depends_on: []
    gate_outcome: delivery-result
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

Each Outcome has a stable `key`, title, exactly one `stage`, dependencies, Product, Technical and Acceptance sections. Product explicitly declares whether success and degradation paths are required and contains a complete set of atomic `requirements`; each Requirement declares its required proof surfaces. Interactive Controls require a stable key and location and may independently declare surface, region, type/label, user task, visibility/availability, trigger/input/validation/default, interaction/navigation, loading/empty/success/failure/recovery/permission/feedback and accessibility. Every non-empty field is one Source-backed Control Claim and protected product semantic; omitted optional fields create no Claim. Every Outcome has at least one executable Check.

Checks support `package_script`, `project_binary`, `node_oracle` and `playwright_test` runners and `ui_browser`, `runtime_behavior`, `api_contract`, `data_state`, `security_boundary`, `population_coverage` and `implementation_structure` proof surfaces. Every Check declares a bounded journey role, a product/support/observer execution target and root/internal entrypoint, plus keyed Given and When scenario steps. Each Assertion declares an all-of Evidence Capability set. `presence` proves static existence only; behavioral capabilities require exactly one typed V3 current-execution record. Required success and degradation journeys use distinct Checks, and an Outcome Result may be proved only by a success Check.

Boundary invocation or external-side-effect evidence executes from an observer target instead of trusting the producing component's self-report. `input_variation` includes at least two distinct inputs, two distinct output hashes and a failing case. `cross_surface_consistency` names at least two distinct `surface_ref` values and one matching state hash; multiple surfaces may share one runtime target. Unknown, undeclared, duplicate or missing capability records fail closed.

Model-authored identifiers stop at task, Outcome and Check keys. The compiler generates internal `OUT.<outcome-key>`, `CHECK.<outcome-key>.<check-key>` and `CHECK.GLOBAL.<check-key>` identities plus canonical Outcome-qualified Requirement, control-field, non-completing, obligation and forbidden-shortcut Claim ids and Global Claim ids. Non-empty control location requires `ui_browser` proof. Global non-goals and forbidden shortcuts require negative proof; Global constraints accept either polarity. Global forbidden paths remain static changed-path authority.

The Source marker key set and `source_claim` key set must be exactly equal across all Source files. Marker keys are globally unique; nested, overlapping, unclosed, empty and invalid markers are rejected. Each Source Claim `statement` equals its marked text after limited whitespace normalization. The compiled Source inventory records key, kind, source path, normalized text and text hash inside authority/revision/explain projections; it is not a second authoring file or state surface.

Typed dispositions preserve meaning. Every non-decision Source item owns exactly one canonical target of the same semantic kind and normalized text; a target has one Source owner. Outcome `acceptance` points to one stable `<outcome>.<check>.<assertion>` whose criterion is Source-text-identical and which proves at least one independently Source-backed non-Result Claim. Global `acceptance` uses `GLOBAL.<check>.<assertion>`, proves no Outcome Claim and must prove at least one independently Source-backed Global non-goal, constraint or forbidden-shortcut Claim. A `risk_fact` marker's Fact/Outcome metadata, disposition and declared risk pair match exactly and each pair has one Source owner. Source Plan authoring uses exactly the ten Runtime risk names, including `data_migration`, separate `critical_user_path` and `weak_observability`, and retained `multi_repository_change`. `out_of_scope` is retired: an explicit Source non-goal maps to a negatively proven Global non-goal, while removing an in-scope item is a compile-blocking `decision_required`.

Compile derives canonical Product, target-profile, Stage, Acceptance and Global semantic projections and combines them with Source hashes/mappings plus the complete selected Context authority projection and file hashes. Retrieval metadata such as `triggers`, `read_when`, `read_policy`, default selection and unselected nodes is excluded from the selected delivery-authority projection; selected area ownership, role/dependency structure and selected Context contents remain protected. A separate Controlling Context projection determines whether a Context revision needs approval and whether scoped Progress remains fresh. Supporting Context never becomes acceptance proof.

The first successful Compile is Authority Lock. It also emits the additive one-time execution-model checkpoint. From Authority Lock onward, revisions have three fail-closed classes. Machine-proven monotonic evidence strengthening, pure verifier relocation, machine-proven tightening and supporting-only Context content revisions revise automatically. A candidate whose only protected reasons are owner, expected-change or allowed-support expansion is scope-only: safe monotonic strengthening may coexist, it still requires exact approval, and existing active Check identities whose runner and verifier are unchanged may exercise it before approval. Source/Controlling-Context/Product/Global semantic changes, Product Claim additions/removals/rewrites, verifier content changes, removing forbidden paths, changing runners or existing verification inputs, reducing `input_paths`, weakening `expected_output_paths`, or weakening artifacts, environment requirements, bindings, obligations, counterfactuals, population or rollback/recovery are protected and are never candidate-executed. Risk downgrade is rejected.

`ty-context long-task diagnose-revision <workdir> [--outcome <key>] [--check <key>]` recompiles the current `delivery-contract.yaml` against Active Authority without enforcement side effects. It may run only existing active Check identities with unchanged runner/verifier authority and only when every protected reason is scope expansion. It returns `acceptance_authorized: false`, writes no pending/approval file, Active Authority, marker, compiled cache, Progress or Receipt, and disposes its temporary snapshot. Semantic changes, proof weakening, runner or verifier-content changes, and risk increases return a deterministic preview without running project code; risk downgrade is rejected. Repeated diagnosis creates no revision Draft object: edits accumulate only in the same Contract authoring file.

Ordinary `compile --revise` remains the only pending-decision boundary. For a protected candidate it writes one exact revision identity plus a concise deterministic summary covering semantic, Source/Claim, proof, verifier/runner, scope, risk, external-confirmation and added verification-dependency changes. Status and resume project that same decision so a host can deduplicate one approval prompt without a Harness-owned Goal waiting state. The previous Authority remains active until exact approval and compare-and-swap adoption. Any candidate edit changes the identity and invalidates old approval. Adoption clears the pending decision, invalidates derived evidence for protected revisions and still requires the complete source-recompiled same-snapshot Final Gate; candidate diagnostics never count as Progress or acceptance.

Contract length, model output capacity, implementation layers, module count, parallelism and Agent preference never split a delivery or Outcome. Existing `outcome_files` are only a compatible physical representation of the same one-Contract authority. An incomplete Draft is never formally compiled.

## 6. Composition, Authority And Finalization

One user-selected delivery always produces one Contract and one Final Gate. The workflow does not perform a top-level Contract-capacity or separation decision. `delivery-set` remains a fixed non-executing retirement tombstone.

The first formal Contract Compile freezes `initial_task_base` with commit, tree and workspace manifest and immediately becomes Authority Lock. The complete `CompiledDeliveryContractV2` becomes an internal `active-long-task-authority-v3` snapshot under Git common-dir; its hash and the worktree Git-config marker bind task id, authority revision and compiled identity. `.ty-context/compiled-contract.json` is only a rebuildable projection and can never define previous authority, the initial base, risk floor or Final Gate identity. The additive execution-model checkpoint is returned to the caller but is not stored in Authority, Progress or Receipt state.

Authority publication is compare-and-swap against the expected previous compiled identity. Commit, verifier migration, accepted clear, valid abandon and corrupt cleanup share one active-state lock. Compile stages the cache, commits common-dir authority and marker, then publishes the cache. It clears the Final Receipt for every changed compiled identity and invalidates derived Progress unless the revision changes only Supporting Context while preserving every Progress freshness identity. Stop/close clear only the exact identity accepted by the Live Gate. Failed compile/revision/CAS leaves the previous snapshot, initial base and progress intact.

Targeted verification persists independent per-Check Progress Records scoped to protected authority, check/runner/verifier identity, Controlling Context, input paths, binding carriers and dependency interfaces. Counterfactual Findings are projected into their owning Check Result before Progress creation. Immediately before writing, targeted verification re-reads active task/revision/compiled/worktree identity; a concurrent revision writes no stale progress.

Live Final Gate requires a clean candidate commit after all required Context updates. It captures active identity, recompiles the source Contract and complete current Context snapshot, validates the common-dir snapshot/marker, creates one Git-tree snapshot and reruns the complete Contract without historical proof reuse. It re-reads active identity after the checks; a concurrent revision yields `needs_work`, never an accepted Receipt. Verify, status and resume read common-dir authority rather than workdir cache. Receipts remain audit-only.

## 7. Authoring Preflight And Static Compile

`ty-context long-task preflight <workdir>` is a read-only, model-free Authoring check. After parseable structure is normalized, it calls the same activation-safety kernel as Compile in collecting mode and returns every independent diagnostic reliably discoverable from that structure. Preflight never creates or updates Active Authority, initial base, worktree marker, compiled cache, progress, Receipt or pending revision; it never runs project verification.

Preflight diagnostics are repair-oriented without becoming repair authority. Exact duplicate diagnostics are emitted once with `occurrences`; known codes may expose stable `refs` and safe `repair_hint`. When a structural duplicate makes the same Claim ambiguous, only the deterministic pair receives `diagnostic_id`, `repair_group`, `repair_priority` and `blocked_by`. No finding is hidden, reclassified or treated as resolved; no repair state, YAML location registry or second authoring schema is added.

New authoring uses Compact V2 YAML. The parser fills only deterministic defaults. Goal, target profile and required target refs, execution targets/root entrypoints, Stages, Source/Source Claims, Context, vertical Outcomes, required success/degradation paths, owners/paths, Requirements, applicable control states, obligations, proof surfaces, journey roles, keyed Given/When scenarios, Evidence Capabilities, runner targets, verification inputs, Assertions, risk facts, forbidden shortcuts and typed external confirmations remain explicit. Compact and expanded forms normalize to the same Contract object, hashes, risk, Claim Coverage and compiled identity.

Compile is deterministic, static and model-free. It calls the shared activation-safety kernel in fail-fast mode, so skipping Preflight bypasses no safety rule. The kernel strictly parses YAML, validates schema, Stage closure/dependencies and vertical Outcome placement, inventories Source Items, validates canonical targets, required-target/root/runner bindings, scenario and success/degradation separation, Evidence Capability adequacy, typed external impact, bounded Product Conformance, Context refs, safe paths, owners, Bindings, runners and verification inputs, rejects unsafe authority/proof files, compiles and requires all-of Claim Coverage, validates Source-to-Claim/Acceptance/Result/Global/Risk/external/decision mappings, enforces explicit Assertions and compatible adapters, computes risk, enforces Counterfactual/Population/security/environment/recovery proof and freezes Source, Contract, selected Context, verifier, runner, workdir and repository identity.

Every path-bearing Contract field uses one canonical segment grammar. Windows separators and one leading `./` normalize to `/`; internal `.`/`..`, control characters, empty segments, absolute/drive/UNC paths and unsupported wildcard syntax fail closed. Pattern matching, subset and overlap/disjoint use the same AST.

Preflight and Compile never implement code, invoke or switch a model, create a process/worktree/branch or run project verification. First Compile creates Authority Lock and emits the user model-choice signal; it does not persist a Preflight receipt or checkpoint acknowledgement.

If actual changes escape declared expected/support paths or touch an undeclared Context owner/boundary, verify/final returns a `scope_escape` Finding. The same current Goal reviews risk/ownership, updates the Contract and recompiles.

## 8. Evidence Kernel

The Evidence Kernel retains only low-level capabilities that directly close false-completion paths:

- repository/workspace snapshot and identity;
- explicit argv command runner with bounded timeout/output and a minimal environment whitelist;
- Raw Execution identity derived from frozen runner identity plus declared Environment Requirements;
- AC-level observation and positive/negative assertion evaluation;
- implementation binding/path evaluation;
- population coverage evaluation;
- counterfactual controls where required;
- complete selected Context/source/runner/oracle/verifier hashes plus Controlling Context freshness;
- current-execution target-runtime observation when a declared Claim can fail independently from its proxy surface;
- typed, Assertion-bound Evidence Capability records for interaction, state change, cross-surface consistency, durable readback, boundary invocation, external effect, failure injection, rendered UI, target runtime and input variation;
- exact Stage closure, required-target qualification and bounded Product Conformance rules;
- Git common-dir Active Authority V3 snapshot plus matching worktree marker;
- outcome/check projection and derived status;
- source-recompiled Live Final Gate and audit-only Receipt;
- Stop Hook preflight and decision.

The compiled internal graph is deliberately small:

```text
Task -> Outcome -> Check -> Observation/Assertion
```

Agent/worker prose, hand-written state and command exit code alone cannot create accepted authority. Every Assertion needs an explicit Observation and its declared all-of Evidence Capabilities. Except for static `presence`, each capability has exactly one typed current-execution record keyed to that Assertion. Missing, duplicate, unknown, undeclared or type-incomparable evidence fails closed; negative proof uses explicit values such as `equals: false`.

Evidence adapters are compiler-derived: `playwright_test` produces `playwright_json_v1` and is the only adapter compatible with `ui_browser`; package scripts, project binaries and Node oracles use the `structured_json_v2` adapter for non-browser surfaces and emit the additive `long-task-check-result-v3` payload when capability records are required. V2 payloads remain decodable for compatibility but cannot satisfy non-presence capabilities and therefore cannot create false behavioral proof. Adapter identity participates in Acceptance Authority, Raw Execution, compiled authority, Progress freshness and Final Receipt.

Across all Checks sharing one Raw Execution identity, one claim-bearing Observation belongs to exactly one Assertion. Claim-bearing Playwright proof uses `playwright.case.<ac-key>.passed equals true`; one Test Instance binds at most one declared AC through `[ac:<assertion-key>]`. Missing, skipped, flaky, unexpected, timed-out, interrupted, failed, multi-AC, duplicate-within-project or structurally invalid cases fail closed. The same AC across distinct projects aggregates only when every instance executes and passes.

Claim-bearing Product/Global assertions use explicit expected-value comparisons; `truthy`/`falsy` are prohibited and `exists` is limited to an `implementation_structure` obligation. Outcome Counterfactuals name an Outcome Binding; Global Counterfactuals use an Outcome-owned `binding_ref`. Both mutate only a proven subset of carriers. Structured evidence requires completed exit-zero execution with exactly designated `assertion_value_mismatch` failures. Weak-observability Playwright Counterfactuals accept exit one only under complete exact accounting of every unexpected instance; ordinary Baselines still require exit zero. Same-Check sensitivity is required for structured Claim proof, and Population exempts only its own Claims under normal observability. Claim and Population proofs are empty unless the complete Check passes.

For target-runtime Claims, “current snapshot” and “current execution” are both required. Rerunning an oracle that merely reads a committed or generated status file proves only the file's contents, not the target runtime. Build, installation, process start and absence of fatal logs likewise prove only those named assertions. A broader runnable-result Claim needs a stable product-owned sentinel or declared interaction observed from the same target session. Artifacts remain review material; they may accompany but never replace the structured Observation produced by the live Check.

The Evidence Kernel separates required success, degradation and recovery journeys. The same Check cannot be both success and degradation, and honest degradation is not successful Result proof. A boundary or external effect is observed at a declared observer target, never solely by its producer. Input-sensitive behavior requires varied inputs and distinguishable outputs, including failure. A multi-Outcome Stage Gate proves distinct declared surfaces against the same runtime state; merely repeating one surface or one status value is insufficient.

Semantic Product Conformance is deliberately risk-proportional. A separate read-only Global `conformance` Check is required only when `weak_observability` is combined with either multiple Stages or multiple required product runtime families. It starts at a required root product target, declares `target_runtime`, has a Raw Execution identity independent from Outcome Checks and runs inside the existing Final Gate. Single-Stage, single-family work keeps the ordinary same-Check sensitivity path and pays no extra conformance execution.

## 9. Verification And Recovery Semantics

### Targeted Verify

`verify` can select one Outcome, one Check or all repair checks. It runs on a current snapshot, records precise findings and projects current status, but always has `acceptance_authorized: false`. Findings carry the owning Source/Claim/Assertion/Observation/owner-path repair context without exposing secrets.

When a target-runtime Check exists, the Goal runs it at the first runnable boundary and after coalesced changes to declared runtime inputs before relying on that boundary for more work. This is a feedback-cost policy, not a persisted trigger queue: no per-Outcome rebuild is required, identical Raw Execution may still deduplicate, and only the later complete Final Gate can accept.

### Status

`status` reports each Outcome as `unverified`, `progress_passing`, `progress_failing`, `progress_stale` or `blocked_external`. It is not completion authority. `final_workflow_status` reports a fresh Final Receipt's exact workflow status or `null`; `external_confirmations` reports current declarations from active authority.

User-facing reporting must preserve those meanings. `progress_passing` is described as current targeted repair evidence, never “Outcome complete”; `progress_stale` cannot be reported as a current pass; and `final_workflow_status: null` means the Goal remains unfinished. Status derives `ready_stages`, Stage blockage and the stage-constrained ready Outcome frontier from current Outcome Progress; it persists no Stage pass. `machine_accepted_external_pending` is reported exactly with its pending confirmations.

Terminal reporting uses only the Contract's bounded target vocabulary. Before a fresh accepted Final Gate, `target_state` is `not_accepted`; a target-blocking external confirmation produces `blocked_external`; machine acceptance produces the declared `implementation_complete`, `target_profile_usable` or `production_release_ready`. A Final Receipt derives each Stage as `passed`, `failed`, `blocked_external` or `blocked_dependency`. These are terminal qualification projections, not per-platform or per-Outcome progress state.

### Resume

`resume` is read-only and reports Contract/compiled identity, effective risk, relevant Context, current Git state, freshness, `final_workflow_status`, target profile/state, the Progress-derived Stage frontier, external confirmations, ready Outcomes, findings and the next safe action. Final Gate output/Receipt—not resumed Progress—owns terminal `stage_results`. Resume starts no process and does not reconnect a physical Turn.

### Final Gate

`final-gate` creates one current workspace snapshot and reruns all Global and Outcome Checks. Identical Raw Execution identities may execute once inside the Gate while each Check still evaluates its own Assertions and artifacts. Bottom-up acceptance succeeds only when all executable Checks, Outcomes, global constraints and risk obligations pass. External confirmations never contribute machine proof; a machine pass with pending confirmations reports `machine_accepted_external_pending`.

For behavioral Claims changed by a blocker-driven revision, Contract authoring reviews only the affected weak-observability or high-risk Outcomes. Their evidence must reach the furthest independently failing boundary named by the Claim; proxy/self-reported success cannot prove a downstream result, and a Counterfactual should disrupt the claimed causal capability rather than only carrier existence when those can diverge. This uses the bounded target profile, Stages, scenarios, Evidence Capabilities, proof surfaces, Checks, Bindings and mutation forms; it creates no open-ended platform taxonomy or universal runtime mandate.

### Freshness And Stop

Receipts and status describe the last audit only. Status/resume never project a stale Receipt as accepted. Verifier content changes require protected revision. `stop-check` returns the Live Gate result; external pending is a successful machine stop with a precise non-blocking message, while `needs_work`, `blocked_external`, Gate error and CAS failure remain fail-closed. `close` runs the Gate and clears only accepted identity. Doctor provides deterministic corrupt-state recovery without removing Contract, Source, Context or Git content.

Every accepted Stop result emits a non-blocking terminal-scope message, not only external-pending results. CLI output identifies machine acceptance and Authority cleanup without claiming native-Goal completion. This message causes no approval pause and owns no state.

## 10. Retry And Decision Boundaries

- Static Contract errors block implementation and are fixed in the same current Goal before product code work.
- First Authority Lock requires the one execution-model choice before product implementation unless the user already stated the task-specific choice.
- Local test/Check failures are repaired in the same Goal with no new Agent or mandatory model session.
- Retry defaults to none. A transient verification command gets one mechanical retry only when it declares `transient_once`, idempotency and a read-only/test-sandbox effect.
- Product, acceptance or architecture semantic conflicts, explicitly user-reserved choices, missing decision-changing preferences and choices with no defensible recommendation pause for user decision and are not disguised as implementation failures. Preference clarification happens before choice-sensitive research; a later defensible recommended plan choice is recorded as delegated Source instead of creating an approval pause. Any real high-risk external action remains an External Confirmation.
- A rolling blocker does not by itself authorize scope reduction or External Confirmation reclassification. When the selected delivery genuinely changes, record the exact marked Source change, expose material Claim/proof/external-confirmation deltas in the hash-bound approval summary, adopt only the exact approved identity and resume rolling execution under it. Revision completion vocabulary must never be used for delivery or native-Goal completion.
- Outside the one first-lock checkpoint, a healthy Goal is not paused solely for a model downgrade. Harness cannot switch the host-selected model, and model choice provides no completion authority.
- Harness never proactively schedules parallel subagents. Opaque platform-internal delegation cannot create Progress, authority or proof.
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

No Long-Task CLI command may start agents, create/delete worktrees or branches, merge, push, open PRs, retry model calls, switch models, schedule subagents or manage process trees. `compile` may only emit the additive model-choice result. Only a Contract-declared project verification command may create a child process.

`composite-campaign` and `composite-long-task` are lightweight retirement tombstones only. They report `retired`, do not execute historical state and direct users to `ty-context long-task`.

## 12. Skills And Distribution Profiles

`/source-plan-authoring` is an explicit-trigger upstream Skill. It accepts a near-complete plan or a sparse brief with mixed attachments and needs no fixed intake form. It produces one self-contained Markdown document with complete input coverage; direct requirements retain qualifiers and necessary derivations cite their source. Before choice-sensitive research or a material product, technical, architecture or provider selection, it asks only for missing decision criteria that could change the candidate set or recommendation. After that preference envelope is clear, it uses current authoritative external evidence when needed and records each defensible recommended plan choice as delegated with its instruction, basis and exact meaning. High-impact plan semantics do not create an approval pause by themselves, while real payment/contract/release/destructive/permission/sensitive-data/legal-security actions remain External Confirmations and only conflicting, user-reserved, missing-preference or unsupported semantics become `DEC`/`decision_required`. Outcomes split by independently decidable results, interactive work reaches surface/region/control/state/feedback granularity, NCOMP preserves non-completing meaning, Risks use exact Runtime Fact names and ACs name their accepted REQ/CTRL/OBL/NCOMP keys. It creates no Source Plan Schema, CLI, Preflight, Compile, Receipt, cache, Authority, questionnaire state, repository binding, implementation or completion result.

`context_product_plan` keeps its existing responsibility: make product judgments inside a Tiny Context project, classify durable product facts and update owning `project_context/**` surfaces. It is not a required stage before or after Source Plan authoring.

`context_uiux_design` owns downstream portable design-authority judgment and repairs/adopts missing or conflicting durable Design Authority without creating a visual workflow. Standalone low/high-fidelity, candidate, prototype or Figma-handoff production stays with dedicated external Product Design capabilities; `context_uiux_design` consumes selected Source during a development workflow, performs UI Authority Closure and writes only stable conclusions to their owning Context/`DESIGN.md`. For material design-system, redesign or high-fidelity work it reconciles externally declared coverage with a task-local, risk-proportional **Visual Coverage Set** across production surface/component, viewport, theme/mode, interaction/state, content stress and accessibility/motion conditions. The downstream set is internal planning, not a competing file, Cartesian matrix, Context role or authority. Product Surface Context owns cross-surface responsibility, Screen/interaction Context owns durable hierarchy/behavior, `DESIGN.md` owns visual-system semantics, one authored exact token source/generation direction and the selected design-reference registry, and versioned target assets own concrete declared composition at project-native paths.

`context_development_engineer` carries that intent into implementation by confirming Design Authority readiness, locating the production token/component/route owners, preventing undeclared raw-value, circular self-baseline or detached-demo bypasses, and running project-owned rendered verification on the combinations actually claimed. Static kits, mocks and marketing specimens may inform review but cannot substitute for production components or real product routes. Both Skills report only combinations actually checked; omitted combinations remain unproven.

`/long-task-workflow` remains the only active long-task execution Skill. It preserves Source, asks before choice-sensitive research when a material user preference is missing, records the later defensible recommended plan choice in real Source instead of Contract-only inference, keeps real high-risk actions as External Confirmations, inserts Material Source Item markers, authors one complete Compact V2 Contract, runs read-only Preflight, formally Compiles only when ready, stops once for the user model choice after first Authority Lock, continuously implements rolling Frontiers after that choice, keeps `Context Delta` live, resumes semantic state, runs the Live Final Gate and reports results. It creates no automatic model switch, model route/checkpoint state, proactive subagent scheduler, second Contract plan, Source Inventory file/Receipt, intermediate Contract-authoring product, questionnaire state, matrix or top-level Contract split.

Its package-managed instruction surface uses progressive disclosure. The main `SKILL.md` owns objective, boundaries, phase routing and lifecycle summary; one-level Contract-authoring, Evidence-design and Authority-lifecycle references load only when relevant. References are prompt packaging, not workdir files, state, Contract projections or another authority. Declared architecture invariants reuse existing Contract mechanisms; no architecture-specific authority layer is added.

Visual Long-Task delivery is likewise an authoring/evidence specialization, not a new mechanism. External design briefs or indexes may enter `source_paths` as ordinary marked Source; acceptance-affecting selected targets, token sources and fixed prototype fixtures enter `verification_inputs`; production owners enter `input_paths`/Bindings; generated implementation renders/diffs/reports remain `artifact_globs`. Before Compile, material production UI performs UI Authority Closure, classifies references as exact targets, partial constraints or inspiration and resolves an unconfigured/candidate/style-only gap through existing Source delegation or a genuine `decision_required` item. The generic existing Control projection preserves each applicable surface, region/location, type/label, user task, visibility/availability, trigger/input/validation/default, interaction/navigation, loading/empty/success/failure/recovery/permission/feedback and accessibility field as an independent Source-backed Claim and protected product semantic. Material visual expectations otherwise remain existing atomic Requirements and named Assertions with explicit coverage. Combined work may author candidates in ordinary Outcomes/Stages, but candidate/planned targets authorize no fidelity Claim; selection becomes real marked Source/registry input and, after lock, an adopted protected revision. Existing `ui_browser` Checks prove declared browser ACs; generated implementation screenshots/diffs remain review artifacts and cannot become their own targets, and subjective direction or approval stays an external confirmation or genuine decision. Native target proof uses a project-owned current-execution Check when representable and otherwise remains external; a browser proxy cannot prove a native target. This adds no `uiux_delivery` block, visual Claim type, risk level, lifecycle state, baseline authority, Gate or required artifact, and it cannot infer completeness beyond declared coverage.

`/normal-long-task` is a retirement pointer and creates no checklist, prompt or Local Audit.

Profiles are `core-portable`, `workflow-default` and explicit `long-task`. `ty-context enable long-task` installs the Source Plan Skill, Long-Task Skill, Stop Hook and templates. Disable removes only those Long-Task-owned surfaces and preserves user entries. Upgrade removes package-owned retired assets and leaves user historical files untouched.

## 13. Managed And Packaged Surfaces

- `.codex/ty-context-managed/**` is managed source.
- `packages/ty-context/assets/**` is package canonical output.
- `packages/ty-context/source-mappings.yaml` defines source-to-package mapping.
- `.codex/skills/authoring/**` remains source-workspace-only.
- README, Chinese README, package README, Context, AGENTS managed block, Skills, tests, release scripts and package assets must describe the same current workflow.
- Public surfaces are English-complete; Chinese is an aligned translation.

The package version for this architecture is `0.7.2`. The schema name remains `long-task-delivery-v2` and existing `outcome_files` remain a physical parser form. Older V2 Contracts that lack required Stage, target-profile/required-target, scenario, journey, success/degradation, capability or typed external-impact fields report indexed manual migration `long-task-v2-semantic-drift-authority`; those meanings must be re-authored from Source. Old Progress and Receipts are never promoted into the strengthened Authority or acceptance evidence.

## 14. Performance And Cost Boundaries

Release update mode is part of the release contract. Every published version declares `sync-only`, `upgrade-required` or `manual-required`; `ty-context upgrade --check` reports `safe_pending`, `manual_required` and `blocked`, and direct `sync` does not run migrations. Release fixtures prove the same marked Source/Binding/Counterfactual Contract against the prepared tarball before publish.

Trusted publication uses one prepare/test/pack/smoke execution per source commit. The protected publisher reuses that exact workflow artifact and verifies source commit, stable lockfile identity and tarball hash without rebuilding, retesting or repacking. Optional dry runs stop after preparation; they are not a mandatory second full-suite invocation. Build-tool versions remain provenance, while retry after a partial publish proceeds only when npm registry integrity matches the prepared bytes exactly.

- The near-universal default Context set remains under advisory byte budgets; `doctor` reports but does not block overages.
- Bounded Context discovery searches only `project_context/**`, uses a small high-signal term set and creates no persistent retrieval infrastructure.
- First Authority Lock emits one model-choice checkpoint; later revisions do not repeat it and no acknowledgement/model-route state exists.
- Compact single-Outcome fixtures are at least 35% shorter than expanded form while compiling identically.
- Small-fixture Preflight and Compile targets are each at most two seconds; status/resume at most one second.
- Focused loops target at most five minutes. Dirty local affected discovery uses only current worktree paths, clean local discovery uses the current commit parent, and explicit/CI bases are exact; no local working set is unioned with an inferred historical branch diff.
- Affected/focused loops are non-authoritative developer feedback. Unmapped Long-Task runtime changes widen to the canonical Trust Boundary Gate; shared fixtures, package/dependency boundaries and unknown broad changes still widen to complete suites.
- Project target-runtime checks use the same cost shape: run once at the first runnable boundary, coalesce relevant input changes, and rerun before dependent work expands plus in Final Gate. Do not impose a full target rebuild on every Outcome/edit; reuse caches, installed test targets and identical Raw Execution only when the declared Claim remains reliably falsifiable.
- Required-target and Stage checks reuse ordinary Checks, Outcome dependencies, Progress and the one Final Gate; they add no scheduler, Stage Receipt or alternate Gate. Multi-surface consistency is paid only at multi-Outcome Stage gates.
- The separate Product Conformance run is paid only for weak-observability work that is also multi-Stage or spans multiple required product runtime families. Simpler work retains existing sensitivity proof and no extra audit invocation.
- The canonical Long-Task Trust Boundary Gate targets p95 at most eight minutes and proves high-impact authority continuity/CAS, forged evidence, revision, Context freshness, Final Gate/Stop/close, Hook/profile, qualification and platform-boundary regressions. It is package regression evidence, never Contract acceptance.
- Pull-request Package CI builds once and runs the complete default suite plus the Trust Boundary Gate. `main`, publish and release build once and execute the complete built package suites; the complete Long-Task Workflow suite remains at most fifteen minutes.
- Aggregate repair is fail-closed without making the complete suite an edit loop. Tracked source/test/config/shared-runner changes, plausible cross-suite contamination or a locally owned final validation claim require one clean complete pass after repair. A proven environment-only local failure with unchanged tracked verification inputs may defer that pass only to a guaranteed downstream `main`/release complete gate; failed plus partial reruns never become a local complete-pass claim.
- Package-suite timing is ephemeral diagnostic output only. It creates no result cache, workflow state, Receipt or reusable authority.
- Full package, source-parity, smoke, pack and release gates remain required before release.
- Harness makes no model calls, implements no model retry, cannot switch the host-selected model and starts no long-lived child process outside declared verification commands.
- Local timing may report wall time, invocation count and failure stage. Harness does not fabricate token/model-call or platform Goal accounting.

## 15. Completion And Honest Limits

The architecture is complete only when CLI, Compact/expanded normalization, marked Source/REQ/CTRL/OBL/NCOMP/AC coverage, shared activation safety, Evidence Kernel, precise findings, Skill/profile/Hook/assets, compatibility diagnostics, docs/Context, tests, consumer smoke, package tarball and source sync all agree; the active runtime contains none of the retired orchestration plane; controlled temporary repositories prove Preflight non-mutation and repair/final/stale/close behavior; and a local commit records the change.

Stable honest limits:

- Harness does not create or restore a platform physical Goal.
- Harness cannot switch the model selected by the host or user; it can only request the one post-lock choice.
- Harness does not observe opaque platform-internal delegation and never treats it as authority.
- Harness does not prove the user never omitted an undeclared requirement.
- Bounded keyword search cannot guarantee every synonym or indirect Context dependency is found.
- Harness provides no core parallel mutation.
- Harness does not observe platform token/model-call accounting.
- Git/PR/CI/deployment/human product confirmation remain external.
- Local mode trusts the installed package-owned verifier and Git metadata.
- Harness cannot semantically attest that a trusted project oracle really exercised its claimed target runtime or that a typed evidence record is truthful; bounded runner-family/root binding, Contract authoring, verifier review and protected verifier identity own that boundary.
- Network isolation remains the responsibility of the external platform.

## 16. Historical Design Boundary

Earlier pre-0.5 designs experimented with stage document chains and later with multi-SFC campaign orchestration, including Source Unit inventories, Scope Fit, Packets, workers, Waves, worktrees and integration/finalization gates. Those designs provided useful evidence-freshness lessons but made Harness own platform/process/Git responsibilities with diminishing delivery-drift benefit.

Version 0.6.0 keeps the reusable Evidence Kernel lesson—static falsifiability, current-snapshot recomputation, identity binding and Stop freshness—while retiring the orchestration plane. It closes declared-authority and evidence bypasses through machine-enumerated Source Items, shared activation validation, runner-derived adapters, all-of proof coverage, globally owned observations, value-sensitive Counterfactuals and passed-Check-only proof. The bounded Context search and one-time model choice improve retrieval and execution cost without recreating a retrieval service or model-routing plane. Historical names may appear only in explicit history, migration tests or command tombstones, never as current product behavior.
