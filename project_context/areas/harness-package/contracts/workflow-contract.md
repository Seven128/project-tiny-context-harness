---
context_role: contract
read_policy: on-demand
---
# Harness Workflow Contract

## Role

This contract defines the lightweight default workflow and the explicit Single-Goal Long-Task Workflow boundary. It controls authority and order of thought, not a required plan file or scheduler.

## Default Workflow

When no active long-task binding or explicit `/long-task-workflow` invocation applies:

1. Read `project_context/global.md`, `project_context/architecture.md`, `project_context/context.toml`, the default area root and graph/trigger candidate role Context.
2. Before deciding `Context Delta`, run one bounded text search over `project_context/**` using a small set of high-signal terms from the task, including explicit area/module names and relevant API/schema/state/security/verification/deployment terms. Merge matching Context with manifest candidates and read only relevant files.
3. For product-surface or information-placement work, perform the lightweight positioning check for information ownership/layout and role placement before narrowing to code.
4. Decide exactly one `Context Delta: none|required`; update owning Context first when required.
5. Use platform-internal planning with no required `plan.md` to keep goal, boundaries, controlling Context, likely implementation surfaces and verification clear.
6. Implement, run project-owned verification in proportion to risk, perform Contract Conformance and check Context drift.
7. Hand off implementation, verification, Context status and blockers without a result artifact.

The bounded search supplements manifest routing and Agent semantic judgment. It creates no persistent index, cache, search state, Context registry or second authority. The default path requires no `plan.md`, Task Contract, mapping table, matrix, verdict, evidence ledger or implementation-summary file. Existing `plan.md` files remain ordinary user files; other existing artifacts likewise have no Harness authority.

## Context Priority And External Sources

- Context owns durable intent; code owns current implementation; tests/CI/smoke/browser/human observation own product evidence.
- `Context Delta: required` covers durable product capability, surface responsibility, ownership, architecture/interface/schema/data/state/recovery/dependency/security or repeatable verification/deployment changes. Local semantics-preserving fixes are `none`.
- For every material external source constraint, internally classify it as covered by Context, requiring a Context update, task-local, explicitly out of scope or requiring a genuine user decision. This judgment creates no table.
- Final Conformance checks that controlling Context reached the owning modules/surfaces/interfaces/state machines and verification paths and that no forbidden shortcut or duplicate authority was used.

## Product Surface Responsibility

- Product-surface and surface/page responsibility remains project-owned Context using existing `contract`, area/subdomain and verification roles.
- Source-to-Context judgment replaces the former Context-to-Implementation Markdown table; Contract Conformance is the internal implementation-alignment check.
- Do not add Product, Architecture, Rationale or Verification delta fields. `Context Delta: none|required` remains the only durable-fact result.

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

`request/source -> optional Source Plan -> relevant Context -> one continuously revised Contract Draft -> Draft Outcome decomposition -> repository/Context binding -> Source/REQ/CTRL/OBL/NCOMP/AC coverage -> read-only Preflight repair loop -> formal Compile / Authority Lock -> one-time execution-model choice -> native Goal Rolling Frontier -> targeted repair verification -> clean candidate commit -> source-recompiled one-snapshot Final Gate -> qualified machine result -> Stop/close qualification-preserving output -> external Git/CI/deployment/human confirmation -> Context drift check`

The optional Source Plan remains ordinary Source, the Contract Draft remains the one Contract rather than an artifact chain, the execution-model choice is a single user pause rather than model routing, and the Rolling Frontier remains temporary Goal working state rather than a scheduler. The lifecycle still has exactly one Contract and one Final Gate.

Capacity, file length, implementation layers, module count, parallelism and Agent preference never create a Contract or Outcome boundary. Existing `outcome_files` remain only a physical compatibility form of the same Contract; new authoring uses inline Outcomes. Delivery Set and top-level splitting within one selected delivery stay retired. Protected authority reductions require explicit revision approval, risk downgrade is rejected, and the immutable first baseline remains. Machine acceptance is limited to declared Claims/Checks and does not imply external confirmation.

- Harness does not create or simulate the native Goal. The current session is the Goal; a new session recovers semantic state, not the prior physical Turn.
- The user-selected workspace is the execution surface. No internal parallel mutation, extra worktree, branch, agent or worker is created.
- Outcome is an independently decidable and target-verifiable acceptance unit. Dependencies determine readiness only. It is never an output-length/file/module/frontend/backend fragment. The current Goal chooses a temporary Frontier and rolls out file/function/test details only for that Frontier.
- `delivery-contract.yaml` contains Product, Technical Boundary and Acceptance logical authority in one strict file. At least one real Source file is mandatory provenance. Every Material Source Item is wrapped in the original Markdown with a non-rendering marker; the derived inventory is compiled authority projection, not a second file or workflow state.
- A research proposal, ordinary prose plan or optional Source Plan remains ordinary Source input after marker-only enumeration and does not need to match the recommended Source Plan structure. Marker keys and `source_claim` keys are set-equal and globally unique; `statement` preserves marked text after limited whitespace normalization.
- Typed dispositions bind each Material Source Item to exactly one same-kind, text-identical canonical target with a unique Source owner. They separate overall Result, Requirement, Control field, Technical Obligation, Non-completing Claim, criterion-identical Acceptance, Global Constraint/Non-goal, Forbidden Shortcut, Risk Fact, External Confirmation and Decision. A Risk marker's exact Fact/Outcome metadata equals its disposition and `risk.facts`; ambiguity remains `decision_required`. `out_of_scope` is retired and excluding an in-scope item requires a genuine decision.
- Missing recommended Source Plan headings or labels does not block authoring; missing mandatory Material Item markers does. Semantic authoring returns for a decision when requirements conflict, critical meaning is missing, materially different product designs remain, a product rule requires user choice or falsifiable acceptance cannot be formed.
- Contract expansion distinguishes three cases: meaning-preserving structural decomposition may continue; repository/Context binding may continue when supported by real evidence; a new business rule, default, recovery behavior, permission, platform scope or other product semantic becomes `decision_required` instead of being silently added.
- The Contract records complete observable ends, atomic Requirements, applicable control states and placement, stable obligations/boundaries/path envelopes/forbidden shortcuts/recovery requirements and named falsifiable AC Assertions. It does not record a complete file-level procedure.
- Compiler-generated Outcome/Check/Claim ids replace handwritten cross-entity references. Source AC references use stable `<outcome>.<check>.<assertion>` ids for Outcome Assertions and `GLOBAL.<check>.<assertion>` for Global Assertions. Contract edits are normal Git history; there is no Packet chain or second plan.

## Contract Draft, Authority Lock And Model Choice

- Before the first successful formal Compile, `delivery-contract.yaml` is one continuously revised, non-authoritative Contract Draft. `long-task-workflow` owns its authoring and may update it across multiple repository/Context reads, Preflight repair rounds and model responses. No separate Contract Draft Skill, schema, CLI, Receipt, Authoring State, Authority or second plan is allowed.
- The first successful formal Compile creates Authority Lock and returns `execution_model_checkpoint.required: true`. Before product implementation, the Agent asks the user to choose `continue_current_model` or switch models and then resume the active Long-Task.
- A task-specific model strategy already stated explicitly by the user satisfies the checkpoint. Later Compile revisions return `required: false`; no repeated pause, checkpoint file, acknowledgement state, model route, scheduler or automatic model switch is created.
- A Draft Outcome is simply an Outcome before Authority Lock; Compile places the same Outcome under Contract Authority without creating `draft_outcomes`, a `DraftOutcome` runtime type, state file, Worker, queue or independent completion boundary.
- Create Outcome boundaries only for results that are independently observable, decidable, target-verifiable, dependency-expressible and localizable to their own Claims, Assertions, Checks and owner boundary. Outcome decomposition must support a smaller dependency-ready working set, targeted verification, precise failure localization, semantic resume and stale-result invalidation.
- `depends_on` controls acceptance readiness. The current Goal may use ready Outcomes and findings as a temporary Rolling Frontier, but no persisted scheduler, mandatory implementation order, Worker allocation, model route or process DAG may be derived from it. Outcome decomposes execution and diagnosis, not completion authority.
- Response/YAML/file length, implementation layers, file/module count, Agent capacity, desired Worker assignment and parallelism never create Outcome boundaries. Outcome decomposition cannot reduce the complete one-snapshot Final Gate.
- Contract authoring may add only meaning-preserving structural decomposition and repository/Context bindings supported by real evidence. New business rules, defaults, thresholds, permissions, recovery behavior, platform/data scope, persistence/retention or irreversible behavior are `decision_required`; the executing Agent must not disguise product inference as necessary derivation.

## False-Completion And Drift-Control Objective

- When Source and Contract are sufficiently detailed and unambiguous, every atomic requirement, control state, technical obligation and acceptance criterion must resolve to its same-kind/text canonical Claim or named falsifiable Assertion. Authoritative completion is impossible while any such declared item remains unimplemented, even if agent prose or a local checklist says otherwise.
- The Harness does not promise drift-free intermediate model behavior. Rolling implementation may diverge; Compile, scope/risk escalation, targeted findings, Final Gate and Stop must detect observable drift, block acceptance, identify the owning Outcome/Claim/Check or boundary and direct repair.
- Machine acceptance means the final current-snapshot artifact has no remaining observable drift relative to the declared Contract and relevant Context. It does not extend to omitted or non-falsifiable requirements, hostile-host tampering or external CI/deployment/human confirmation.
- Targeted verify is scoped repair evidence only. Only the source-recompiled Final Gate may accept after rechecking the complete Contract on one current snapshot.
- Add or retain a workflow mechanism only when review identifies its distinct false-completion/drift or total-cost path, invariant, proof, overlap, deletion risk, Authoring/Runtime/State/Recovery/maintenance cost, net benefit, fail-closed behavior and second-Authority/plan/scheduler risk. The model-choice checkpoint is admitted as a one-time execution-cost mechanism enabled by locked acceptance, not as proof.

## Compile, Verification And Completion

- Authoring Preflight performs only read-only static work and calls the shared activation-safety validator in collecting mode. It returns all independent diagnostics reliably discoverable from a parseable structure and creates no authority, lock, marker, cache, progress, Receipt or pending revision.
- Formal Compile calls the same validator in fail-fast mode, freezes declared Source/Product/Technical/Acceptance/Risk/Context plus adapter/runner/verifier identity, creates Authority Lock on first success, and emits the additive execution-model checkpoint result.
- Static Contract errors block product implementation. Product/acceptance/architecture semantic conflicts return to the user; local code/check failures stay in the same Goal; retry defaults to none and one transient retry requires explicit idempotent read-only/test-sandbox policy.
- Targeted verify may run one Check, one Outcome or all requested repair checks. It rechecks active task/revision/compiled/worktree identity before writing derived current-snapshot status and is never accepted authority.
- Final Gate creates one current snapshot and reruns all global and Outcome Checks, then rechecks active identity before acceptance. Human, CI, deployment and product confirmations exist only in `external_confirmations`, never contribute machine proof, and yield `machine_accepted_external_pending` after all machine Checks pass.
- `final-gate`, `status`, `resume`, `stop-check`, the Stop Hook and `close` preserve the same accepted workflow qualification. Stop/close may CAS-clear an accepted machine Authority; pending external delivery remains named in their output, `closed` means only machine Authority cleanup, and no confirmation tracker or Receipt is created.

## Scope And Risk Escalation

- The Contract declares Outcome expected change paths, allowed support paths, forbidden paths and relevant Context owners/boundaries.
- Actual changes outside the combined allowed envelope or a newly touched undeclared boundary return a `scope_escape` Finding.
- The same current Goal revises the Contract and recompiles. Harness never responds by starting a worker/new Goal or repeating the model-choice checkpoint.
- Any later Source/Context/Product/Global semantic or verifier-content change is a user-reviewed Authority Revision. Only mechanical proof additions, pure verifier relocation and proven path/binding/input/output tightening may revise automatically. Stop/close clear only through accepted-identity CAS.

## Contract Conformance

Before handoff:

- fix implementation misses;
- update missing durable facts;
- account for every material source constraint;
- confirm controlling Context reached the correct owners and verification;
- confirm no forbidden shortcut, duplicate workflow artifact, stale authority or risk downgrade;
- confirm implementation, docs, Skills/assets and Context are aligned.

## Non-Goals

- No lifecycle phases, fixed Contract plans, separate Contract-Authoring Skill, intermediate Contract-authoring product, Source Inventory/Source Coverage files or Receipts, Source Unit tables, SFC/Packet/Change Envelope/Wave/Campaign state, agent/worker retry state, integration branches, worktree orchestration, matrices/verdicts or hand-written completion state.
- No multiple top-level Contracts for one selected delivery, capacity-based Outcome fragmentation, execution registry, proof recipe, runner inheritance, Preflight Receipt or second Coverage authority.
- No validator-enforced edit order or claim that schema proves users declared everything.
- No targeted verification acceptance and no Historical Result aggregation.
- No automatic model switching, persistent model routing, model-tier scheduler, repeated model checkpoint or acknowledgement state.
