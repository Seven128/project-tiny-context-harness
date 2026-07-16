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
2. Explicit `/long-task-workflow` performs one semantic Boundary Check, then creates, compiles, executes or resumes one V2 Contract/Bundle authority in the current native Goal.
3. Explicit `/normal-long-task` returns a retirement pointer to `/long-task-workflow`; it creates no artifacts.
4. Otherwise remain on the default Workflow Contract, regardless of apparent duration or file count.

Do not auto-detect or auto-activate long-task state.

## Entry Risk Levels

- L0 local: reversible, Context-complete, no durable API/schema/data/security/recovery/product change, directly testable and no cross-session recovery need. Use default Workflow only.
- L1 standard: multiple observable Outcomes or recovery need, no L2 trigger, reliable executable verification. Use one Contract/Bundle authority, native Goal/workspace, scoped progress and Live Final Gate.
- L2 strict: public API/schema, persistent data, migration, security/permission boundary, irreversible external effect, full population, or critical-path work with weak end-to-end observability. Compiler raises the floor and enforces proof on each affected Outcome; multi-repository delivery is rejected.

An explicit user request may raise risk to strict. Neither Skill nor execution may lower the compiler floor.

## Single-Goal Long-Task Workflow

The workflow is:

`request/source -> Source Claims -> relevant Context -> V2 Contract/Bundle -> Claim Coverage/static compile -> native Goal rolling Frontier -> scoped targeted progress -> clean candidate commit -> source-recompiled Live Final Gate -> external Git/CI/deploy/human confirmation -> Context drift check`

Capacity never creates semantic Children. Bundle fragments remain one authority; independent top-level boundaries run as separate Contracts and Delivery Set stays retired. Protected authority reductions require explicit revision approval, risk downgrade is rejected, and the immutable first baseline remains. Machine acceptance is limited to declared Claims/Checks and does not imply external confirmation.

- Harness does not create or simulate the native Goal. The current session is the Goal; a new session recovers semantic state, not the prior physical Turn.
- The user-selected workspace is the execution surface. No internal parallel mutation, extra worktree, branch, agent or worker is created.
- Outcome is an acceptance unit. Dependencies determine readiness only. The current Goal chooses a temporary Frontier and rolls out file/function/test details only for that Frontier.
- `delivery-contract.yaml` contains Product, Technical Boundary and Acceptance logical authority in one strict file. `source.md` may preserve provenance but has no execution authority.
- The Contract records complete observable ends, stable obligations/boundaries/path envelopes/forbidden shortcuts/recovery requirements and falsifiable checks. It does not record a complete file-level procedure.
- Compiler-generated Outcome/Check/Claim ids replace handwritten cross-entity references. Contract edits are normal Git history; there is no Packet chain or second plan.

## Compile, Verification And Completion

- Compile performs only static work: strict V2 schema/key validation, Claim generation/coverage, owner/binding/path checks, resolved-runner/verification-input freeze, per-Outcome risk proof and complete identity freeze.
- Static Contract errors block product implementation. Product/acceptance/architecture semantic conflicts return to the user; local code/check failures stay in the same Goal; retry defaults to none and one transient retry requires explicit idempotent read-only/test-sandbox policy.
- Targeted verify may run one Check, one Outcome or all requested repair checks. It writes derived current-snapshot status but never accepted authority.
- Final Gate creates one current snapshot and reruns all global and Outcome Checks. Only fully equal execution identities may be deduplicated inside that Gate; historical results are never reused.
- Bottom-up Task acceptance requires at least one executable Check per Outcome plus every strict/global obligation. Human, CI, deployment and product confirmations exist only in `external_confirmations`, never contribute machine proof, and yield `machine_accepted_external_pending` after all machine Checks pass.
- Contract/source/relevant Context/runner/oracle/verifier/workspace changes stale audit results. Stop and close always run the Live Final Gate and never trust prior Receipts/cache; success clears the matching common-dir record/config marker.

## Scope And Risk Escalation

- The Contract declares Outcome expected change paths, allowed support paths, forbidden paths and relevant Context owners/boundaries.
- Actual changes outside the combined allowed envelope or a newly touched undeclared boundary return `scope_or_risk_escalation_required`.
- The same current Goal revises the Contract and recompiles. Harness never responds by starting a worker/new Goal.
- Product Outcome, non-completing result or Acceptance semantic changes are scope changes and may not be silently weakened. Additional implementation/support paths or local technical constraints may be added when product and acceptance meaning remains intact.

## Contract Conformance

Before handoff:

- fix implementation misses;
- update missing durable facts;
- account for every material source constraint;
- confirm controlling Context reached the correct owners and verification;
- confirm no forbidden shortcut, duplicate workflow artifact, stale authority or risk downgrade;
- confirm implementation, docs, Skills/assets and Context are aligned.

## Non-Goals

- No lifecycle phases, fixed plans, Source Unit tables, Source Coverage records, SFC/Packet/Change Envelope/Wave/Campaign state, agent/worker retry state, integration branches, worktree orchestration, matrices/verdicts or hand-written completion state.
- No validator-enforced edit order or claim that schema proves users declared everything.
- No targeted verification acceptance and no Historical Result aggregation.
