---
context_role: contract
read_policy: default
---
# Harness Workflow Contract

## Role

This contract defines the lightweight default workflow and the explicit Single-Goal Long-Task Workflow boundary. It controls authority and order of thought, not a required plan file or scheduler.

## Default Workflow

When no active long-task binding or explicit `/long-task-workflow` invocation applies:

1. Read `project_context/global.md`, `project_context/architecture.md`, `project_context/context.toml` and minimum graph-relevant role Context.
2. For product-surface or information-placement work, perform the lightweight positioning check for information ownership/layout and role placement before narrowing to code.
3. Decide exactly one `Context Delta: none|required`; update owning Context first when required.
4. Use platform-internal planning with no required `plan.md` to keep goal, boundaries, controlling Context, likely implementation surfaces and verification clear.
5. Implement, run project-owned verification in proportion to risk, perform Contract Conformance and check Context drift.
6. Hand off implementation, verification, Context status and blockers without a result artifact.

The default path requires no `plan.md`, Task Contract, mapping table, matrix, verdict, evidence ledger or implementation-summary file. Existing `plan.md` files remain ordinary user files; other existing artifacts likewise have no Harness authority.

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

`request/ordinary Source -> optional Source Plan -> relevant Context -> one complete Compact V2 Contract Draft with Draft Outcome decomposition and repository/Context binding -> Source/REQ/CTRL/OBL/AC coverage -> read-only Preflight repair loop -> formal Compile/Authority Lock -> native Goal Rolling Frontier -> scoped targeted repair verification -> clean candidate commit -> source-recompiled one-snapshot Final Gate -> external Git/CI/deploy/human confirmation -> Context drift check`

Capacity, file length, implementation layers, module count, parallelism and Agent preference never create a Contract or Outcome boundary. Existing `outcome_files` remain only a physical compatibility form of the same Contract; new authoring uses inline Outcomes. Delivery Set and top-level splitting within one selected delivery stay retired. Protected authority reductions require explicit revision approval, risk downgrade is rejected, and the immutable first baseline remains. Machine acceptance is limited to declared Claims/Checks and does not imply external confirmation.

- Harness does not create or simulate the native Goal. The current session is the Goal; a new session recovers semantic state, not the prior physical Turn.
- The user-selected workspace is the execution surface. No internal parallel mutation, extra worktree, branch, agent or worker is created.
- Before the first successful formal Compile, the same `delivery-contract.yaml` is a mutable, non-authoritative Contract Draft. It may be repaired across multiple repository/Context reads and Preflight passes, requires no single-response generation and has no Draft schema, CLI, Receipt, Authoring State, second plan or independent Authority. Contract Draft authoring is part of `long-task-workflow`; no standalone Contract Authoring Skill exists.
- A Draft Outcome is only an Outcome before Authority Lock, not a schema/runtime type, Worker, queue, scheduler item or completion boundary. Outcome is an independently decidable and target-verifiable acceptance unit. Decomposition reduces requirement coupling for rolling implementation, targeted verification, failure localization, stale-result precision and recovery without splitting delivery authority.
- Dependencies determine acceptance readiness only. The current Goal chooses dependency-ready Outcomes as a temporary Rolling Frontier and rolls out file/function/test details only for that Frontier. The Frontier is never persisted and `depends_on` never becomes mandatory implementation scheduling.
- `delivery-contract.yaml` contains Product, Technical Boundary and Acceptance logical authority in one strict file. At least one real Source file is mandatory provenance. Every Material Source Item is wrapped in the original Markdown with a non-rendering marker; the derived inventory is compiled authority projection, not a second file or workflow state.
- An external research proposal, ordinary prose plan or optional Source Plan remains ordinary Source input after marker-only enumeration and does not need to match the recommended Source Plan structure. Marker keys and `source_claim` keys are set-equal and globally unique; `statement` preserves marked text after limited whitespace normalization.
- Typed dispositions separate overall Result, non-Result Claim, criterion-identical Acceptance, Global Constraint/Non-goal, Risk Fact, External Confirmation and Decision. `out_of_scope` is retired and excluding an in-scope item requires a genuine decision.
- Missing recommended Source Plan headings or labels does not block authoring; missing mandatory Material Item markers does. Semantic authoring returns for a decision when requirements conflict, critical meaning is missing, materially different product designs remain, a product rule requires user choice or falsifiable acceptance cannot be formed.
- Contract expansion distinguishes three cases: meaning-preserving structural decomposition may continue; repository/Context binding may continue when supported by real evidence; a new business rule, default, recovery behavior, permission, platform scope or other product semantic becomes `decision_required` instead of being silently added.
- The Contract records complete observable ends, atomic Requirements, applicable control states and placement, stable obligations/boundaries/path envelopes/forbidden shortcuts/recovery requirements and named falsifiable AC Assertions. It does not record a complete file-level procedure.
- Compiler-generated Outcome/Check/Claim ids replace handwritten cross-entity references. Source AC references use stable `<outcome>.<check>.<assertion>` ids. Contract edits are normal Git history; there is no Packet chain or second plan.

Outcome decomposes execution and diagnosis, not completion authority. Every Draft/formal Outcome remains inside one Contract; targeted progress never accepts; the complete Contract must pass one Final Gate on the current final snapshot.

## False-Completion And Drift-Control Objective

- When the source and Contract are sufficiently detailed and unambiguous, every atomic requirement, control state, technical obligation and acceptance criterion must resolve to observable Claims or named falsifiable Assertions. A specific Source item cannot collapse into the broad Outcome Result. Authoritative completion is impossible while any such declared item remains unimplemented, even if agent prose or a local checklist says otherwise.
- The Harness does not promise drift-free intermediate model behavior. Rolling implementation may diverge; compile, scope/risk escalation, targeted findings, Final Gate and Stop must detect observable drift, block acceptance, identify the owning Outcome/Claim/Check or boundary and direct repair.
- Machine acceptance means the final current-snapshot artifact has no remaining observable drift relative to the declared Contract and relevant Context. It does not extend to omitted or non-falsifiable requirements, hostile-host tampering or external CI/deployment/human confirmation.
- Machine authority has only two honest result classes: all declared Requirements/ACs have reliable current-snapshot evidence, or the task remains explicitly unfinished/qualified because something is unmet, unverifiable, insufficient, stale or externally pending. `machine_accepted_external_pending` means machine-verifiable scope passed, must report the pending confirmations and never means complete external delivery.
- Admit or retain a workflow mechanism only when it names a distinct false-completion/delivery-drift path, establishes a testable invariant, is not already covered, fails closed, reopens a specific risk if removed and provides independent value greater than its authoring/runtime/state/recovery/maintenance cost without creating a second Authority, plan or scheduling plane. This review rule creates no matrix, Receipt or runtime Registry.

## Compile, Verification And Completion

- Authoring Preflight performs only read-only static work and calls the shared activation-safety validator in collecting mode. It returns all independent diagnostics reliably discoverable from a parseable structure and creates no authority, lock, marker, cache, progress, Receipt or pending revision.
- Formal Compile calls the same validator in fail-fast mode, so direct Compile cannot bypass Source inventory/continuity, criterion, atomic/all-of Claim coverage, adapter compatibility, Raw Execution Observation ownership, risk, binding, runner/input, Counterfactual or weak-sensitivity rules. It freezes declared Source/Product/Technical/Acceptance/Risk/Context plus adapter/runner/verifier identity and creates Authority Lock on first success.
- Static Contract errors block product implementation. Product/acceptance/architecture semantic conflicts return to the user; local code/check failures stay in the same Goal; retry defaults to none and one transient retry requires explicit idempotent read-only/test-sandbox policy.
- Targeted verify may run one Check, one Outcome or all requested repair checks. It rechecks active task/revision/compiled/worktree identity before writing derived current-snapshot status and is never accepted authority.
- Final Gate creates one current snapshot and reruns all global and Outcome Checks, then rechecks active identity before acceptance. Raw execution identity binds the runner-derived adapter, frozen runner and canonical Environment Requirements. One Claim-bearing Observation belongs to one Assertion across all Checks sharing that identity. Only Playwright AC `passed equals true` proves browser Claims; all required surfaces are all-of, Counterfactuals accept only Binding-linked value mismatches, and proof is emitted only for fully passed Checks.
- Bottom-up Task acceptance requires at least one executable Check per Outcome plus every strict/global obligation. Human, CI, deployment and product confirmations exist only in `external_confirmations`, never contribute machine proof, and yield `machine_accepted_external_pending` after all machine Checks pass.
- Contract/source/relevant Context/runner/oracle/verifier/workspace changes stale audit results. Development-period V2 Active Authority/Progress/Receipts are never migrated and require manual Contract upgrade plus a new Authority Lock. Stop and close always run the Live Final Gate and never trust prior Receipts/cache; success clears the matching common-dir record/config marker.

## Scope And Risk Escalation

- The Contract declares Outcome expected change paths, allowed support paths, forbidden paths and relevant Context owners/boundaries.
- Actual changes outside the combined allowed envelope or a newly touched undeclared boundary return a `scope_escape` Finding.
- The same current Goal revises the Contract and recompiles. Harness never responds by starting a worker/new Goal.
- The first successful compile is Authority Lock. Any later Source/Context/Product/Global semantic or verifier-content change is a user-reviewed Authority Revision, independent of whether verify ran or progress/Receipt/cache exists. Product Claim additions/removals/rewrites, runner/input replacement, reduced `input_paths`, weakened `expected_output_paths` and unproved pattern containment are authority reductions. Only mechanical proof additions, pure verifier relocation and proven path/binding/input/output tightening may revise automatically. Stop/close clear only through accepted-identity CAS.

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
