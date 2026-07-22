---
context_role: contract
read_policy: on-demand
---
# Harness Workflow Contract

## Role

This contract defines the lightweight default workflow and the explicit Single-Goal Long-Task Workflow boundary. It controls authority and order of thought, not a required plan file or scheduler.

## Shared Architecture Quality Obligation

Every implementation delivery completes one `Architecture Deliberation` before its first implementation edit. The checkpoint is externally observable and repository-bound rather than hidden reasoning: it identifies the affected capability and owners, current extension point and unique source of truth, dependency direction and interface/state/lifecycle boundaries, failure/recovery/compatibility concerns, selected design and material rejected alternatives, one plausible future-change challenge, touched technical debt and its disposition, forbidden shortcuts, and project-owned architecture checks. Depth is risk-proportional. A small semantics-preserving change may record that existing architecture remains valid, but it still names the concrete owner/extension point and why the change creates no new or worsened debt. A material scope, owner, Context or design change makes the checkpoint stale and requires refinement before implementation continues.

After implementation and project-owned verification, one `Architecture Conformance` closure checks the current candidate snapshot against those conclusions and every controlling architecture invariant. It checks scope/path escape, owner or dependency-direction violations, service/facade bypass, duplicate authority or a second source of truth, undeclared API/schema/state/persistence change, forbidden shortcuts, required project-native checks and new or worsened debt. A correction returns to implementation and verification; any later candidate change invalidates the closure. Default work carries this closure inside Contract Conformance. Long-Task work carries it only through declared Technical/Global authority and executable Checks in Final Gate. The two carriers are mutually exclusive for one candidate snapshot.

The obligation makes the performance of architecture work visible; it does not prove private reasoning or promise an architecture that anticipates every unknowable future requirement. It creates no required architecture artifact, second `Context Delta`, Contract, Authority, Gate, state machine, scheduler or language-generic analyzer.

## Default Workflow

When no active long-task binding or explicit `/long-task-workflow` invocation applies:

1. Read `project_context/global.md`, `project_context/architecture.md`, `project_context/context.toml`, the default area root and graph/trigger candidate role Context.
2. Before deciding `Context Delta`, run one bounded text search over `project_context/**` using a small set of high-signal terms from the task, including explicit area/module names and relevant API/schema/state/security/verification/deployment terms. Merge matching Context with manifest candidates and read only relevant files.
3. For product-surface or information-placement work, perform the lightweight positioning check for information ownership/layout and role placement before narrowing to code.
4. For material production UI, perform UI Authority Closure and the conditional Design Authority Check below before the first implementation edit.
5. Perform the shared `Architecture Deliberation` and surface its concise repository-bound conclusions before the first implementation edit.
6. Decide exactly one `Context Delta: none|required`; update owning Context or `DESIGN.md` first when required.
7. Use platform-internal planning with no required `plan.md` to keep goal, boundaries, controlling Context, likely implementation surfaces and verification clear.
8. Implement, run project-owned verification in proportion to risk, perform Contract Conformance including `Architecture Conformance`, and then check Context drift.
9. Hand off implementation, verification, architecture conformance, Context status and blockers without a result artifact.

The bounded search supplements manifest routing and Agent semantic judgment. It creates no persistent index, cache, search state, Context registry or second authority. The default path requires no `plan.md`, Task Contract, mapping table, matrix, verdict, evidence ledger or implementation-summary file. Existing `plan.md` files remain ordinary user files; other existing artifacts likewise have no Harness authority.

## Context Priority And External Sources

- Context owns durable intent; code owns current implementation; tests/CI/smoke/browser/human observation own product evidence.
- `Context Delta: required` covers durable product capability, surface responsibility, ownership, architecture/interface/schema/data/state/recovery/dependency/security or repeatable verification/deployment changes. Local semantics-preserving fixes are `none`.
- For every material external source constraint, internally classify it as covered by Context, requiring a Context update, task-local, explicitly out of scope or requiring a genuine user decision. This judgment creates no table.
- Final Conformance checks that controlling Context reached the owning modules/surfaces/interfaces/state machines and verification paths and that no forbidden shortcut or duplicate authority was used. Context drift remains separately named because it asks the reverse question: whether implementation or a newly selected decision changed durable truth that Context does not yet record.

## Product Surface Responsibility

- Product-surface and surface/page responsibility remains project-owned Context using existing `contract`, area/subdomain and verification roles.
- Source-to-Context judgment replaces the former Context-to-Implementation Markdown table; Contract Conformance is the internal implementation-alignment check.
- Do not add Product, Architecture, Rationale or Verification delta fields. `Context Delta: none|required` remains the only durable-fact result.

## UI Authority Closure

- Use stable surface, control and target keys to reconcile current Source, owning Product Surface/Screen/interaction Context, `DESIGN.md`, authored targets and verification before material implementation. Product Surface Context owns cross-surface responsibility; Screen/interaction Context owns stable screen hierarchy and behavior; `DESIGN.md` owns visual-system semantics/reference interpretations; authored targets own concrete declared compositions; the Delivery Contract only binds this delivery.
- Classify each affected item as `context-covered`, `context-update`, `task-local`, `out-of-scope` or `decision-required`. Update durable owners before code when required. Contract YAML, current code and implementation screenshots cannot become the sole owner of a missing product/design decision.
- Use an on-demand Screen Contract when stable screen identity, entry/exit/shared state, region order, fixed/scroll/overlay ownership, navigation, variants or material controls exceed the coarse Product Surface Contract. Do not require one for semantics-preserving local style/UI fixes or an explicit non-fidelity prototype.
- A material Control may need independent surface, region/location, type/label, user task, visibility/availability, trigger/input/validation/default, interaction/navigation, loading/empty/success/failure/recovery/permission/feedback and accessibility meaning. Missing applicable meaning is resolved through Source/Context/delegated design or remains a genuine decision; it is not silently filled by an implementation agent.
- Conflicting controlling owners fail closed. Resolve the stale Source/Context/design target, or preserve `decision-required`; file order, timestamps, code shape and Contract convenience do not establish precedence.

This closure is an internal reconciliation and routing check. It creates no required table/artifact, second `Context Delta`, UI state machine, readiness cache or acceptance authority.

## Design Authority Readiness

- Material production UI means a new or redesigned screen, primary layout/navigation/theme/component system, high-fidelity implementation or substantial visual polish. Local style bugs, narrow existing-component edits and explicitly throwaway prototypes remain on the lightweight path.
- Before material implementation, read the owning surface/interaction Context, `DESIGN.md`, its one authored exact-value token source and generation direction, and the design references for the affected production routes/components.
- Classify each material reference as `exact-target`, `constraint` or `inspiration`. An exact target supports only its declared surface/viewport/mode/state fidelity; a constraint supports only its named rule; inspiration and an unconfigured starter never authorize an implicit reproduction or invented production layout.
- Explicit project design-system initialization/adoption routes to `design-system-authoring`, which never auto-runs. For standalone resources, `design-resource-authoring` classifies style dependency: style-bearing work stops on unconfigured authority and points to that explicit Skill, while low-fidelity/IA/semantics-only work remains available. Configured style-bearing Open Design projects must verify the adopted `designSystemId`. Do not promote an implementation screenshot into its own target.
- A configured project visual system is necessary but not sufficient page authority. Surface-level implementation readiness additionally depends on the owning Screen/Control meaning, the selected target/constraints for the claimed conditions and a project-owned verification path; `doctor` reports only advisory file-level signals.
- Fidelity verification renders the production route/component in the declared combinations and compares it with the selected target when one exists. Token/raw-value checks, layout/DOM/accessibility assertions and target-runtime checks remain project-owned. Report only checked combinations and keep subjective approval external.
- This is conditional order-of-thought guidance, not a required design directory, new Context role, new delta, workflow state, generic validator or pixel-perfect mandate.

## External Design Resources

- Open Design remains the generation engine. `design-system-authoring` is explicit-only and adopts one selected system into canonical project authority. `design-resource-authoring` fixes the output/development ceiling, gates only style-bearing work, binds the adopted system and commissions the smallest sufficient set. During iteration it buffers decision effects; after final selection it reconciles accepted decisions into the initial proposal once. It never edits a Source Plan, Context/`DESIGN.md`, code or Contract. Outputs enter as ordinary Source.
- A candidate, inspiration reference, mutable external locator or implementation-generated render cannot authorize fidelity. A selected exact target records selection/delegation basis, precise surface/viewport/mode/state/content coverage and immutable identity, then remains upstream Source until this workflow completes UI Authority Closure and durable adoption.
- Preserve stable surface/flow/region/component/control/state/target keys and semantic Control/state meaning from the controlling brief or Source when available. An implementation handoff maps every material in-scope condition to existing/generated Source or an explicit non-applicable/excluded/unresolved disposition, but this task-local mapping is not durable adoption or acceptance. Images, Figma frames or a design-system label alone do not silently supply missing product, interaction, motion, responsive, accessibility or recovery semantics.
- The package mandates no plugin, pack schema, fixed directory, artifact count, three-option rule, Cartesian coverage or universal pixel threshold. Tool-specific generation/export validation is authoring QA only and never substitutes for Design Authority readiness, product verification or Contract acceptance.

## Routing And Activation

Routing order is:

1. A valid common-dir active record plus matching worktree Git-config marker resumes through `/long-task-workflow` and `ty-context long-task resume`.
2. Explicit `/long-task-workflow` creates, preflights, compiles, executes or resumes exactly one complete V2 Contract authority for the selected delivery in the current native Goal.
3. Explicit `/normal-long-task` returns a retirement pointer to `/long-task-workflow`; it creates no artifacts.
4. Otherwise remain on the default Workflow Contract, regardless of apparent duration or file count.

Do not auto-detect or auto-activate long-task state.

## Entry Risk Levels

- L0 local: reversible, Context-complete, no durable API/schema/data/security/recovery/product change, directly testable and no cross-session recovery need. Use default Workflow only.
- L1 standard: multiple observable Outcomes or recovery need, no L2 trigger, reliable executable verification. Use one complete Contract authority, native Goal/workspace, scoped progress and Live Final Gate.
- L2 strict: public API/schema, persistent data, migration, security/permission boundary, irreversible external effect, full population, or critical-path work with weak end-to-end observability. Compiler raises the floor and enforces proof on each affected Outcome; multi-repository delivery is rejected.

An explicit user request may raise risk to strict. Neither Skill nor execution may lower the compiler floor.

## Single-Goal Long-Task Workflow

The workflow is:

`initial/revised proposal + selected design resources -> integrated Source inventory/synthesis/refinement -> relevant Context -> Architecture Deliberation -> one Contract Draft -> target/stage/Outcome/Control/repository binding -> Preflight -> Compile / Authority Lock -> one-time model choice -> Rolling Frontier -> targeted repair -> protected revision when needed -> clean candidate commit -> source-recompiled one-snapshot Final Gate including Architecture Conformance -> qualified machine result -> Stop/close -> native Goal veto review -> external confirmations -> Context drift check`

Legacy Source Plans and external design resources remain ordinary Source, not a Contract Draft. Source-quality authoring now occurs inside `long-task-workflow`; the Contract Draft remains the one Contract rather than an artifact chain. The lifecycle still has exactly one Contract and Final Gate.

Capacity, file length, implementation layers, module count, parallelism and Agent preference never create a Contract or Outcome boundary. Existing `outcome_files` remain only a physical compatibility form of the same Contract; new authoring uses inline Outcomes. Delivery Set and top-level splitting within one selected delivery stay retired. Protected authority reductions require explicit revision approval, risk downgrade is rejected, and the immutable first baseline remains. Machine acceptance is limited to declared Claims/Checks and does not imply external confirmation.

- Harness does not create or simulate the native Goal. The current session is the Goal; a new session recovers semantic state, not the prior physical Turn.
- The user-selected workspace is the execution surface. No internal parallel mutation, extra worktree, branch, agent or worker is created.
- Outcome is an independently decidable, vertical user result that belongs to exactly one Source-declared stage and is verifiable against a declared execution target. Outcome dependencies plus stage gate dependencies determine readiness. Each target profile has non-empty `required_target_refs`; every required ref resolves to a product execution target, and every Stage Gate and critical journey proves each required target from its root entrypoint. It is never an output-length/file/module/frontend/backend fragment. Stage status is derived from existing Outcome Progress and creates no Receipt, authority or persistent scheduler state.
- If a declared result can pass on a proxy surface while failing in its target runtime, the earliest Outcome that owns the runnable boundary declares a project-owned target-runtime Check. The Check binds to the declared runtime family and root/internal entry mode; its accepting Raw Execution must exercise that exact target in the current run and emit matching typed evidence. Browser target runtime requires Playwright, Native/Desktop requires a project binary, and a static report, screenshot, binary, log, deep/internal entry or historical run cannot substitute for a required root journey.
- Every Check declares one Given/When scenario and a journey role. Every Assertion declares an all-of evidence capability set. Presence-only evidence cannot prove behavior; exactly one typed record per non-presence capability must pass the interaction, state change, cross-surface consistency, durable readback, boundary invocation, external side effect, failure injection, visual render, target runtime or input-variation invariant. Multi-Outcome Stage Gates require cross-surface consistency records with distinct surface refs; boundary/external-effect proof executes on an independent observer target.
- Every Outcome explicitly separates required success and degradation paths. A degradation/recovery Check cannot prove the Result Claim. External confirmations declare kind, impacted Claims and target-blocking effect; functional prerequisites block the selected target, while production-only gates can remain pending for a lower target.
- `delivery-contract.yaml` contains Product, Technical Boundary and Acceptance logical authority in one strict file. At least one real Source file is mandatory provenance. Every Material Source Item is wrapped in the original Markdown with a non-rendering marker; the derived inventory is compiled authority projection, not a second file or workflow state.
- A research proposal, ordinary prose plan, legacy Source Plan or external design resource remains ordinary Source. When raw/mixed input is incomplete, integrated Source authoring inventories and refines it before marker-only enumeration; no recommended format is required.
- For interactive work, carry every applicable authored Source Control field through the existing projection rather than collapsing or dropping it. Every non-empty field is an independently Source-backed Claim.
- Combined design-and-implementation work may use ordinary design Outcomes/Stages while targets are being authored, but candidate/planned artifacts do not authorize downstream fidelity Claims. Selection must first become real marked Source plus the owning `DESIGN.md`/target registry input and, after Authority Lock, an adopted protected revision. This remains the same Contract/Authority/Final Gate and adds no target-selection state.
- Typed dispositions bind each Material Source Item to exactly one same-kind, text-identical canonical target with a unique Source owner. They separate overall Result, Requirement, Control field, Technical Obligation, Non-completing Claim, criterion-identical Acceptance, Global Constraint/Non-goal, Forbidden Shortcut, Risk Fact, External Confirmation and Decision. A Risk marker's exact Fact/Outcome metadata equals its disposition and `risk.facts`; ambiguity remains `decision_required`. `out_of_scope` is retired and excluding an in-scope item requires a genuine decision.
- Legacy Source Plan headings never block authoring; missing Material Item markers does. Integrated Source authoring preserves the existing preference/research/delegation gate and asks only when an unknown preference would change research or recommendation.
- Once the material preference envelope is known, use current authoritative evidence when the choice depends on external capability, price, quota, license, compatibility, region or support, and record one supported recommendation explicitly as delegated Source instead of pausing for approval. A conservative no-effect default may preserve an unapproved action gate, but it does not substitute for an unknown product or technical tradeoff. Semantic authoring returns for a decision only when requirements conflict, the user reserves the choice, a material preference remains unknown, critical meaning has no defensible recommendation or falsifiable acceptance cannot be formed.
- Contract expansion distinguishes four cases: meaning-preserving structural decomposition may continue; repository/Context binding may continue when supported by real evidence; a defensible recommended plan choice may continue only after it is written into real Source with its delegation and basis; any remaining new product semantic is `decision_required` instead of being silently added only in Contract YAML.
- A rolling blocker is not itself an External Confirmation or permission to reduce Source. If the blocker changes Product, Acceptance, machine/external scope or completion meaning, author the exact change in marked Source and use protected Authority Revision. Earlier blanket authorization never approves that later identity. Adoption invalidates affected evidence and resumes rolling implementation; it is never reported as delivery or native-Goal completion.
- Default plan delegation never authorizes a real high-risk external action. Payment, contracting, production deployment or publication, destructive production mutation, real permission grants, sensitive-data transmission and required legal/security/human approval remain named `external_confirmation` items even when the plan records the recommended configuration or disabled-until-approved default.
- The Contract records complete observable ends, atomic Requirements, applicable control states and placement, stable obligations/boundaries/path envelopes/forbidden shortcuts/recovery requirements and named falsifiable AC Assertions. It does not record a complete file-level procedure.
- Compiler-generated Outcome/Check/Claim ids replace handwritten cross-entity references. Source AC references use stable `<outcome>.<check>.<assertion>` ids for Outcome Assertions and `GLOBAL.<check>.<assertion>` for Global Assertions. Contract edits are normal Git history; there is no Packet chain or second plan.

## Contract Draft, Authority Lock And Model Choice

- Before the first successful formal Compile, `delivery-contract.yaml` is one continuously revised, non-authoritative Contract Draft. `long-task-workflow` owns its authoring and may update it across multiple repository/Context reads, Preflight repair rounds and model responses. No separate Contract Draft Skill, schema, CLI, Receipt, Authoring State, Authority or second plan is allowed.
- The first successful formal Compile creates Authority Lock and returns `execution_model_checkpoint.required: true` with a machine-readable terminal-turn contract. Unless already satisfied by an explicit task-specific user strategy, the Agent ends the current turn before product implementation, file edits, builds or tests and asks the user to choose `continue_current_model` or switch models and then resume the active Long-Task.
- Only a task-specific choice explicitly naming the model strategy satisfies the checkpoint; generic continue/resume/finish/continue-goal language does not. Later Compile revisions return `required: false`; no repeated pause, checkpoint file, acknowledgement state, model route, scheduler or automatic model switch is created.
- A Draft Outcome is simply an Outcome before Authority Lock; Compile places the same Outcome under Contract Authority without creating `draft_outcomes`, a `DraftOutcome` runtime type, state file, Worker, queue or independent completion boundary.
- Create Outcome boundaries only for results that are independently observable, decidable, target-verifiable, dependency-expressible and localizable to their own Claims, Assertions, Checks and owner boundary. Outcome decomposition must support a smaller dependency-ready working set, targeted verification, precise failure localization, semantic resume and stale-result invalidation.
- `depends_on` controls Outcome readiness and Source-declared stage dependencies control delivery order. Each stage names one gate Outcome; that Outcome transitively depends on the rest of its stage, and later-stage Outcomes transitively depend on prerequisite gate Outcomes. The current Goal derives its temporary Frontier from these existing edges. No persisted scheduler, stage Receipt, Worker allocation, model route or process DAG is created. Outcome and Stage decompose execution and diagnosis, not completion authority.
- Response/YAML/file length, implementation layers, file/module count, Agent capacity, desired Worker assignment and parallelism never create Outcome boundaries. Outcome decomposition cannot reduce the complete one-snapshot Final Gate.
- Contract authoring may add meaning-preserving structural decomposition and repository/Context bindings supported by real evidence. It may also preserve a defensible recommended choice only after material tradeoff preferences are known and that choice is recorded as delegated real Source with its authoring instruction, evidence basis and added meaning; it must never hide new product semantics solely in Contract YAML or call them necessary derivation. If an unknown preference could materially change research or selection, ask before comparative research and keep it `decision_required` until answered. Conflicting, user-reserved or otherwise unsupported choices remain `decision_required`, while any real high-risk external effect remains an explicit external confirmation.

## False-Completion And Drift-Control Objective

- When Source and Contract are sufficiently detailed and unambiguous, every atomic requirement, control state, technical obligation and acceptance criterion must resolve to its same-kind/text canonical Claim or named falsifiable Assertion. Authoritative completion is impossible while any such declared item remains unimplemented, even if agent prose or a local checklist says otherwise.
- The Harness does not promise drift-free intermediate model behavior. Rolling implementation may diverge; Compile, scope/risk escalation, targeted findings, Final Gate and Stop must detect observable drift, block acceptance, identify the owning Outcome/Claim/Check or boundary and direct repair.
- Machine acceptance means the final current-snapshot artifact has no remaining observable drift relative to the declared Contract and relevant Context. It does not extend to omitted or non-falsifiable requirements, hostile-host tampering or external CI/deployment/human confirmation.
- Targeted verify is scoped repair evidence only. Only the source-recompiled Final Gate may accept after rechecking the complete Contract on one current snapshot.
- Every Long-Task change preserves the controlling purpose and accounts for total cost by including the cost of introducing the change in its ROI judgment. Mechanism semantics, invariant, authority/proof-boundary or runtime-behavior changes modify the owning mechanism and verification; other changes stay at their owning point. Add or retain a workflow mechanism only when review identifies its distinct false-completion/drift or total-cost path, invariant, proof, overlap, deletion risk, Authoring/Runtime/State/Recovery/maintenance cost, materially positive ROI, fail-closed behavior and second-Authority/plan/scheduler risk. Use data when available; without it, require user/owner discussion, rigorous causal reasoning and bounded validation. At comparable cost optimize purpose fulfillment; at comparable effect optimize implementation and operating cost. The model-choice checkpoint is admitted as a one-time execution-cost mechanism enabled by locked acceptance, not as proof.

## Compile, Verification And Completion

- Authoring Preflight performs only read-only static work and calls the shared activation-safety validator in collecting mode. In the same pass it validates stage closure and cross-surface gates, vertical/path declarations, required-target/runner/root compatibility, scenario/action identity, evidence capability compatibility, success/degradation separation, external impact refs and bounded conformance coverage. It returns all independent diagnostics reliably discoverable from a parseable structure and creates no authority, lock, marker, cache, progress, adequacy Receipt or pending revision.
- Formal Compile calls the same validator in fail-fast mode, freezes declared Source/Product/Technical/Acceptance/Risk/Context plus adapter/runner/verifier identity, creates Authority Lock on first success, and emits the additive execution-model checkpoint result.
- Static Contract errors block product implementation. Product/acceptance/architecture semantic conflicts return to the user; local code/check failures stay in the same Goal; retry defaults to none and one transient retry requires explicit idempotent read-only/test-sandbox policy.
- Targeted verify may run one Check, one Outcome or all requested repair checks. It rechecks active task/revision/compiled/worktree identity before writing derived current-snapshot status and is never accepted authority.
- During rolling execution, run an applicable target-runtime Check once at the first runnable boundary and rerun it before dependent work grows after accumulated changes to its declared runtime-affecting inputs or Binding carriers. Coalesce related edits and use the cheapest reliable Check; do not require a full environment rebuild per Outcome or per edit.
- Final Gate creates one current snapshot and reruns all global and Outcome Checks, including the distinct read-only conformance Check when weak observability combines with multiple stages or required runtime families, then rechecks active identity before acceptance. Human, CI, deployment and product confirmations never contribute machine proof. A target-blocking confirmation yields `blocked_external`; non-blocking confirmations yield `machine_accepted_external_pending` after all machine Checks pass.
- Final Gate is also the sole Long-Task carrier for the shared `Architecture Conformance`: every material architecture conclusion must already be represented by Source-backed obligations/constraints/forbidden shortcuts, owners/paths/Bindings and project-owned executable Checks. Do not run a separate default Contract Conformance closure before or after it. A changed snapshot, Contract or controlling Context requires the existing Final Gate freshness path again.
- Reporting follows existing verifier state: `progress_passing` is targeted repair evidence, `progress_stale` is not a current pass, and `final_workflow_status: null` means the Goal is unfinished. The workflow status is accompanied by the declared target profile, `target_state` (`implementation_complete`, `target_profile_usable`, `production_release_ready`, `not_accepted` or `blocked_external`) and derived stage results (`passed`, `failed`, `blocked_external` or `blocked_dependency`); these are receipt/status qualifications, not another persistent completion state machine.
- `final-gate`, `status`, `resume`, `stop-check`, the Stop Hook and `close` preserve the same accepted workflow qualification. Stop/close may CAS-clear an accepted machine Authority; pending external delivery remains named in their output, `closed` means only machine Authority cleanup, and no confirmation tracker or Receipt is created.
- Compile/revision, Final Gate, Stop and close JSON expose their effect and scope: revision adoption has `delivery_completed_by_this_event: false`, accepted terminal commands identify `acceptance_scope: declared_machine_authority` and `native_goal_effect: none`, and cleanup identifies `closed_scope: machine_authority`; none mutates the platform-native Goal.
- Before invoking platform-native Goal completion, compare the current Goal and user instructions with accepted marked Source and check for pending revisions, unresolved blockers or omitted requirements. This is a veto-only conformance guard: a mismatch keeps the Goal active and triggers Source/Contract repair, while a clean review supplies no acceptance proof and never substitutes Agent judgment for Final Gate proof.

## Scope And Risk Escalation

- The Contract declares Outcome expected change paths, allowed support paths, forbidden paths and relevant Context owners/boundaries.
- Actual changes outside the combined allowed envelope or a newly touched undeclared boundary return a `scope_escape` Finding.
- The same current Goal revises the Contract and recompiles. Harness never responds by starting a worker/new Goal or repeating the model-choice checkpoint.
- Any later Source/Context/Product/Global semantic change, target/stage/path reduction, evidence capability removal, root-to-internal entry change, external impact reclassification or verifier-content weakening is a user-reviewed Authority Revision. Mechanically monotonic proof/capability additions, pure verifier relocation and proven path/binding/input/output tightening may revise automatically. Stop/close clear only through accepted-identity CAS.
- Pending approval summaries enumerate changed semantic fields, Source/Product Claim reductions, proof reductions and external-confirmation keys. Compile/status/resume derive the same concise human decision brief from that canonical summary, naming the approval reason, material categories, affected Outcomes, previous-Authority continuity, no-completion effect and mandatory post-adoption Final Gate before asking for the exact revision identity. No separate revision plan, editable brief, review artifact or approval registry is created.

## Contract Conformance

Contract Conformance is the default path's internal implementation-alignment review, not a `delivery-contract.yaml`, independent verifier or additional Gate. Before handoff:

- fix implementation misses;
- update missing durable facts;
- account for every material source constraint;
- confirm controlling Context reached the correct owners and verification;
- perform `Architecture Conformance` on the current candidate snapshot, including the deliberated owner/source-of-truth/dependency/lifecycle boundaries, future-change extension point, debt disposition and declared project-native checks;
- confirm no forbidden shortcut, duplicate workflow artifact, stale authority or risk downgrade;
- confirm implementation, docs, Skills/assets and Context are aligned.

The following Context drift check remains explicit and directional: Contract Conformance asks whether implementation follows current Source and Context; Context drift asks whether implementation or new decisions made durable Context stale or incomplete. If either check finds a miss, repair the owner, rerun affected project verification and repeat conformance on the new candidate.

## Non-Goals

- No lifecycle phases, fixed Contract plans, separate Contract-Authoring Skill, intermediate Contract-authoring product, Source Inventory/Source Coverage files or Receipts, Source Unit tables, SFC/Packet/Change Envelope/Wave/Campaign state, agent/worker retry state, integration branches, worktree orchestration, matrices/verdicts or hand-written completion state.
- No multiple top-level Contracts for one selected delivery, capacity-based Outcome fragmentation, execution registry, proof recipe, runner inheritance, Preflight Receipt or second Coverage authority.
- No validator-enforced edit order or claim that schema proves users declared everything.
- No targeted verification acceptance and no Historical Result aggregation.
- No `uiux_delivery` authority block, per-surface readiness state, design Receipt, planned-target implementation bypass, visual Claim kind or second UI/UX Gate.
- No automatic model switching, persistent model routing, model-tier scheduler, repeated model checkpoint or acknowledgement state.
