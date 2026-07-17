# Project / Delivery Context

## Project Goal

- Maintain `project-tiny-context-harness`, the npm package and `ty-context` CLI behind the public Project Tiny Context Harness name.
- Keep the default product small: Minimal Context preserves durable project facts; Workflow Contract defines the lightweight default agent loop; the explicitly enabled Long-Task Workflow authors one complete Contract and adds verifier-owned completion for work that needs recovery across long sessions.
- The explicit `long-task` profile also installs the optional `source-plan-authoring` Skill. It produces one self-contained Markdown Source Plan with stable semantic keys, traceable derivations and unresolved decisions as higher-fidelity ordinary Source input; it creates no Context update, Delivery Contract, runtime state or completion authority.
- Preventing false completion inside declared authority is the Long-Task Workflow's controlling objective. Intermediate implementation may drift or fail, but only fresh evidence for the complete current final snapshot may accept; otherwise the task stays explicitly unfinished or qualified.
- Qualified completion must survive every projection and terminal path: Final Gate, status, resume, stop-check, Stop Hook and close preserve `machine_accepted_external_pending` plus all declared confirmations; stale Receipts project no accepted workflow status, and clearing machine Authority never claims complete external delivery or creates external-confirmation tracking state.
- Contract Draft authoring belongs to `long-task-workflow` and may iteratively revise the same non-authoritative `delivery-contract.yaml` until the first successful formal Compile creates Authority Lock. There is no standalone Contract Draft Skill, state or Receipt.
- The Long-Task Workflow is Single-Goal Rolling Delivery V2: one complete user-selected delivery, one Contract, one platform-native continuing Goal, one selected workspace, compiled Source/REQ/CTRL/OBL/AC coverage, a rolling implementation frontier and one Live Evidence Kernel whose verification strength rises per risk Outcome.
- A Delivery Contract preserves product outcomes, non-goals, stable technical boundaries, acceptance checks and relevant Context. It does not freeze file-by-file implementation steps.
- New Contract authoring keeps inline Outcomes. Existing `outcome_files` remain only a physical compatibility representation of the same one-Contract authority and create no semantic, state or completion boundary. Delivery Set orchestration and top-level Contract splitting within one selected delivery are retired.
- Every Long Task has real Source; each declared Source file contains a Material Item, while background-only references stay outside Source Authority. Items are wrapped in non-rendering, text-preserving markers. Marker keys and `source_claim` keys are set-equal; each Source Item owns exactly one same-kind, text-identical canonical target, and no target may collapse multiple Source Items. Typed dispositions keep Requirement/Control/Technical Obligation/Acceptance/Result/Risk/Non-goal/Forbidden Shortcut/External/Decision meaning distinct, and `out_of_scope` is never resolved authority. Source Acceptance is criterion-identical to one named Assertion proving at least one Source-backed non-Result Claim. The first successful formal Compile is the Authority Lock and freezes an immutable task base. Every later revision compares declared Source/Product/Technical/Acceptance/Risk/Context and verifier materials against active authority; deleting progress, Receipts or cache and restoring implementation code cannot reopen a pre-lock weakening window.
- Targeted verify persists scoped per-Check progress only. Final Gate, Stop and close require a clean candidate commit, recompile source authority and bind Git HEAD/tree, workspace, source, Context, authority and complete verifier identity.

## Non-goals / Boundaries

- Harness does not create, simulate, reconnect or persist a platform Goal or physical Turn. The current Codex session is the execution Goal; a new session recovers semantic state through `ty-context long-task resume`.
- Harness does not schedule agents, launch Codex/AppServer workers, route models, manage process trees, create branches/worktrees, merge, push, open pull requests or perform deployment. Only Contract-declared project verification commands may create child processes.
- A long task uses the current workspace or the one worktree already chosen by the user. Task length never creates another worktree, and core execution has no internal parallel mutation.
- Outcome is an independently decidable and target-verifiable acceptance-result unit. A Draft Outcome is only the pre-Authority-Lock lifecycle of that same Outcome, not a runtime type, Worker or scheduling unit. The current Goal selects dependency-ready Outcomes as a temporary rolling Frontier; that Frontier is internal working state, not a persisted scheduling DAG. Outcome decomposes execution and diagnosis, not completion authority.
- Harness does not prove that the user declared every real requirement. It rejects internally incomplete or unverifiable Contracts but cannot manufacture semantic completeness from entity chains.
- A recommended Source Plan structure is an optional authoring fast path, never a required input protocol or proof that every real requirement was declared. Material Source Item markers are nevertheless mandatory activation metadata for a Long Task and are inserted without rewriting the original Source text.
- Product tests, CI, review, Git/PR delivery, deployment and human product confirmation remain external authorities.

## Background

- Fresh coding-agent sessions need a small repo-owned recovery path for product intent, architecture boundaries and repeatable verification instead of rediscovering them from code.
- The package previously included a multi-worker Campaign runtime. Version 0.6.0 completes its replacement with one native Goal, one selected workspace, one complete Contract authority and verifier-owned current-snapshot evidence.
- Historical names remain only where safe migration, non-executing tombstones or explicit design history require them.

## Design Rationale

- Keep durable project memory and completion authority, but leave mutable implementation sequencing inside the current agent/platform Goal.
- For sufficiently explicit and observable declared scope, eliminate authoritative false completion: rolling implementation may drift, but the workflow must detect and block observable divergence, direct repair and accept only a current-snapshot result aligned with the Contract and relevant Context.
- Retain a workflow mechanism only when it closes an independent false-completion or delivery-drift path and its distinct benefit exceeds its Authoring, Runtime, State, Recovery and maintenance cost; it must fail closed and must not create another Authority, plan or scheduling plane.
- Use one complete Contract with Compact deterministic defaults and compiler-generated Outcome/Check/Claim identities to avoid duplicate plans and mechanical authoring cost.
- Increase proof obligations deterministically with risk instead of imposing strict ceremony on every task.
- Do not invent rationale or store implementation summaries, command output or test-result claims in Context.

## Workflow Direction

- L0 local, reversible work stays on the default Workflow Contract and creates no Delivery Contract.
- L1 standard long work uses one complete Contract authority, one native Goal, one workspace, scoped repair progress, a same-snapshot Final Gate and Stop freshness.
- L2 strict work is selected deterministically per Outcome. Public API/schema, persistent data, migrations, security/permission boundaries, irreversible external effects, full-population operations or a weakly observable critical user path require strict proof on the affected Outcome. Risk downgrade and multi-repository delivery are rejected.
- `requested_level: standard` below the computed risk floor fails compile. Execution cannot downgrade risk.
- One root V2 `delivery-contract.yaml` is the Contract authoring file and remains a non-authoritative Draft until formal Compile. Existing Outcome fragments are physical compatibility only. Compiled Source inventory, Coverage, findings and adapters are derived projections, never second editable authority or workflow state; there is no Packet revision chain, Source Unit inventory file, SFC graph, Wave, Delivery Set, top-level Contract split or second plan.
- Ordinary prose and an optional Source Plan are equally valid Source inputs after marker-only Material Item enumeration. Structural decomposition and evidence-backed repository binding may continue without changing product meaning; new product semantics require an explicit decision instead of silent Contract expansion.
- `preflight` applies Compact defaults and invokes the shared activation-safety validator in collecting mode. It aggregates every independently reliable schema, Source target kind/text/cardinality/ownership, disposition, criterion/Source-backed Claim, Claim/surface/operator, adapter/Observation, Context, risk, owner/path/binding, runner/input, Counterfactual and per-Check sensitivity diagnostic without creating Authority Lock, cache, progress, Receipt, pending revision or running project checks.
- Formal Compile invokes the same validator in fail-fast mode, so skipping Preflight bypasses no completion-safety rule. It requires a non-Result atomic Claim per Outcome, non-empty unique all-of proof surfaces, explicit comparison operators for Claim proof (`exists` only for implementation-structure Obligations; `truthy`/`falsy` are diagnostic-only), runner-compatible adapters, canonical single-AC-per-test Playwright proof, globally unique Raw Execution Observations, explicit Claim comparison strength and executable acceptance. One leading `./` and Windows separators normalize to `/`; internal `.`/`..`, control characters, empty segments, absolute/drive/UNC paths and unsupported glob syntax are rejected.
- Every compile creates an immutable compiled identity. Contract authority, Source, referenced Context, canonical Product/Global semantics, runner/oracle, verifier or workspace drift invalidates prior derived results and requires recompilation; ordinary compile cannot silently adopt changed Source or Context.
- Targeted `verify` exists only for repair findings and can never accept a task. `final-gate`, Stop and close rerun every Outcome/global Check on one current snapshot; stored Receipts are audit-only.
- Evidence adapters derive from runner kind: only Playwright may prove `ui_browser`; structured runners prove non-browser surfaces. Every `structured_json_v2` Check must have same-Check Counterfactual coverage for each declared Claim not covered by that Check's Population; weak-observability Outcomes require Counterfactual coverage even for Population Claims. Artifact hashes are review material, not Claim-sensitivity proof. Across all Checks sharing a Raw Execution, one Claim-bearing Observation belongs to one Assertion. Playwright Claim proof is only AC `passed equals true`; one Test Instance may identify at most one declared AC, ordinary tags are ignored, missing/skipped/flaky/unexpected and duplicate-per-project cases fail closed while distinct projects aggregate all-of. Counterfactual proof binds a declared implementation carrier and is valid only for designated value mismatches. Claim and Population proofs are emitted only for a fully passed Check.
- Runners receive a minimal environment whitelist plus only Check-declared env vars. Protected Contract/Source/Context/verifier/proof inputs reject symlinks and detectable hardlinks, and Source Claims require real declared Source files.
- Active authority is a complete compiled snapshot in a Git common-dir V3 record paired with a worktree Git-config marker that binds task id, authority revision and compiled identity. Commit, verifier migration, CAS clear, valid abandon and corrupt-state cleanup share one diagnostic active-state lock. Development-period V2 Active Authority/Progress/Receipts report `manual_required` and are never migrated. Final Gate and targeted verify recheck task/revision/compiled/worktree identity before acceptance or progress writes; Stop/close clear only the identity actually accepted. The workdir compiled file remains a rebuildable projection only.

## Durable-Fact And Authority Rules

- `project_context/**` is authoritative for intended product ownership, architecture, interface, state/recovery and repeat-execution facts; code is authoritative for current implementation; project verification is authoritative for behavior.
- Product Surface Contract work uses `context_surface_contract` with the existing `contract`, area/subdomain and verification roles; it must not add a new product-surface Context role.
- The default Workflow reads minimum graph-relevant Context, decides exactly one `Context Delta: none|required`, uses platform-internal planning, implements, verifies, performs Contract Conformance and checks Context drift.
- Long-Task Workflow inherits Context priority, one `Context Delta`, context-first durable updates and final drift checking. It replaces informal long-task intent and completion with the Delivery Contract and Evidence Kernel, not with task scheduling state.
- `PROJECT_SPEC.md` owns the stable Harness mental model and design rationale. AGENTS is a startup router/hard-boundary surface, Skills own role procedures, README owns human usage and tests own machine proof.

## Current State

- v0.6.0 defines the first public `long-task-delivery-v2` semantics, the package-owned Hook, old-state manual upgrade boundary and retired Delivery Set tombstone. The V2 name and physical `outcome_files` parser form remain, but development-period Draft activation compatibility is not promised.
- Compact and fully expanded V2 authoring normalize to the same Contract/authority/compiled identity. Machine-enumerated same-kind/text/cardinality Source target continuity, typed dispositions including Control, Source-backed ACs, atomic all-of Claims, runner-derived adapters, same-Check structured sensitivity, canonical single-AC-per-test multi-project Playwright proof, Binding-sensitive Counterfactuals and passed-Check-only Claim Proof are activation rules. Findings/explain project Source/target/Claim/AC/surface/Check/adapter/Observation/owner-path repair context.
- Verifier authority separates content bytes from runtime package version/root. Pure relocation requires explicit `compile --revise` and auto-increments authority; content changes create a hash-bound pending user revision. Verify/Final Gate/Stop/close reject stale verifier authority until migration.
- `ty-context enable long-task` installs the Source Plan Authoring Skill, Long-Task Workflow Skill, Stop Hook and required templates. Hook lifecycle operations remove current or historical package-owned absolute commands only when their managed status and known package layout match, while preserving user entries even when they share a group or use similar names. Non-Codex/default consumers do not receive those assets unless enabled.
- V2 Source Authority includes exact Risk Fact/Outcome marker metadata and `non_completing` items. Structured Global Claims use Global Counterfactual controls bound to Outcome-owned Bindings; planned carriers may be absent only before implementation. Standard Playwright verifier content is trusted when frozen, while `weak_observability` requires same-Check AC/Claim sensitivity.
- Upgrade safely converts the package-owned `composite-codex` profile selection to `long-task` and removes only package-owned retired assets. Existing user campaign/source/contract files remain ordinary historical files and are never executed, imported or deleted.
- `composite-campaign` and `composite-long-task` may remain only as lightweight command tombstones that return `retired` and direct users to `ty-context long-task`; they import no retired runtime.
- `/normal-long-task` is a retirement pointer to `/long-task-workflow`; it no longer creates a checklist, target prompt, Local Audit or a competing authority.

## Architecture Context

- See `project_context/architecture.md`.

## Verification Entry Points

- `npm run format:check`
- `npm run typecheck --workspace project-tiny-context-harness`
- `npm run build --workspace project-tiny-context-harness`
- `npm run test:delivery-contract --workspace project-tiny-context-harness`
- `npm run test:long-task-workflow --workspace project-tiny-context-harness`
- `npm test`
- `npm run smoke:quickstart`
- `npm run preview:pack`
- `npm run launch:check`
- `node packages/ty-context/dist/cli.js package sync-source`
- `node packages/ty-context/dist/cli.js package check-source`
- `make validate-harness`
- `git diff --check`

## Next Safe Action

- Keep public behavior aligned across implementation, managed source, package assets, Context, PROJECT_SPEC, English/Chinese README, focused tests, release smoke and tarball contents.
- Run focused Delivery Contract tests before the full workflow/package/release gates.

## Context Index

- [harness-package](areas/harness-package.md)
  - [context model](areas/harness-package/foundation/context-model.md)
  - [workflow contract](areas/harness-package/contracts/workflow-contract.md)
  - [package-managed surfaces](areas/harness-package/contracts/package-managed-surfaces.md)
  - [Minimal Context rationale](areas/harness-package/decision-rationale/minimal-context.md)
  - [Long-Task Workflow rationale](areas/harness-package/decision-rationale/long-task-workflow.md)
  - [implementation index](areas/harness-package/implementation-index.md)
  - [verification](areas/harness-package/verification.md)
- [delivery-benchmark](areas/delivery-benchmark.md)

## Context Graph

- See `project_context/context.toml` for registered area/role Context and graph metadata.
