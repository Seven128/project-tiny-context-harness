# Project / Delivery Context

## Project Goal

- Maintain `project-tiny-context-harness`, the npm package and `ty-context` CLI behind the public Project Tiny Context Harness name.
- Keep the default product small: Minimal Context preserves durable project facts; Workflow Contract defines the lightweight default agent loop; the explicitly enabled Long-Task Workflow adds one top-level Contract/Bundle authority and verifier-owned completion for work that needs recovery across long sessions.
- The Long-Task Workflow is Single-Goal Rolling Delivery V2: one platform-native continuing Goal and selected workspace with one Contract/Contract Bundle authority, compiled Product Claim Coverage, a rolling implementation frontier and one Live Evidence Kernel whose verification strength rises per risk Outcome.
- A Delivery Contract preserves product outcomes, non-goals, stable technical boundaries, acceptance checks and relevant Context. It does not freeze file-by-file implementation steps.
- A large atomic delivery may use `outcome_files` as one logical Contract Bundle. Independent release/rollback/owner/risk/product boundaries run as separate top-level Contracts; Delivery Set orchestration is retired.
- Original source requirements remain directly covered by Source Claims for strict and Bundle work. First compile freezes an immutable task base. Source hashes/file sets, selected Context topology/files/hashes and canonical Product/Global semantic projections are revision materials; after execution, semantic changes require exact material-bound user approval.
- Targeted verify persists scoped per-Check progress only. Final Gate, Stop and close require a clean candidate commit, recompile source authority and bind Git HEAD/tree, workspace, source, Context, authority and complete verifier identity.

## Non-goals / Boundaries

- Harness does not create, simulate, reconnect or persist a platform Goal or physical Turn. The current Codex session is the execution Goal; a new session recovers semantic state through `ty-context long-task resume`.
- Harness does not schedule agents, launch Codex/AppServer workers, route models, manage process trees, create branches/worktrees, merge, push, open pull requests or perform deployment. Only Contract-declared project verification commands may create child processes.
- A long task uses the current workspace or the one worktree already chosen by the user. Task length never creates another worktree, and core execution has no internal parallel mutation.
- Outcome is the acceptance-result unit. It is not a Goal, worker, branch, worktree or fixed implementation slice. The current Goal selects one or more dependency-ready Outcomes as a temporary rolling Frontier; that Frontier is internal working state, not a persisted scheduling DAG.
- Harness does not prove that the user declared every real requirement. It rejects internally incomplete or unverifiable Contracts but cannot manufacture semantic completeness from entity chains.
- Product tests, CI, review, Git/PR delivery, deployment and human product confirmation remain external authorities.

## Background

- Fresh coding-agent sessions need a small repo-owned recovery path for product intent, architecture boundaries and repeatable verification instead of rediscovering them from code.
- The package previously included a multi-worker Campaign runtime. Version 0.6.0 completes its replacement with one native Goal, one selected workspace, one top-level Contract/Bundle authority and verifier-owned current-snapshot evidence.
- Historical names remain only where safe migration, non-executing tombstones or explicit design history require them.

## Design Rationale

- Keep durable project memory and completion authority, but leave mutable implementation sequencing inside the current agent/platform Goal.
- For sufficiently explicit and observable declared scope, eliminate authoritative false completion: rolling implementation may drift, but the workflow must detect and block observable divergence, direct repair and accept only a current-snapshot result aligned with the Contract and relevant Context.
- Retain a workflow mechanism only while its distinct drift-prevention benefit justifies its authoring, runtime, state and recovery cost; stop before diminishing returns turn the Harness back into an orchestration plane.
- Use one nested Contract and compiler-generated Outcome/Check identities to avoid cross-file semantic duplication.
- Increase proof obligations deterministically with risk instead of imposing strict ceremony on every task.
- Do not invent rationale or store implementation summaries, command output or test-result claims in Context.

## Workflow Direction

- L0 local, reversible work stays on the default Workflow Contract and creates no Delivery Contract.
- L1 standard long work uses one Contract/Bundle authority, one native Goal, one workspace, scoped repair progress, a same-snapshot Final Gate and Stop freshness.
- L2 strict work is selected deterministically per Outcome. Public API/schema, persistent data, migrations, security/permission boundaries, irreversible external effects, full-population operations or a weakly observable critical user path require strict proof on the affected Outcome. Risk downgrade and multi-repository delivery are rejected.
- `requested_level: standard` below the computed risk floor fails compile. Execution cannot downgrade risk.
- One root V2 `delivery-contract.yaml` (with optional Outcome fragments) is authoring authority. Declared original sources remain provenance and Source Claims preserve direct coverage to generated Claims; there is no Packet revision chain, Source Unit inventory, SFC graph, Wave, Delivery Set or second plan.
- Compile is pure static preflight. It validates strict YAML/schema, Global and Outcome Claim Coverage, one restricted repository-pattern AST shared by matching/subset/overlap, Context/source/path/runner/proof identities, risk floor, UI proof, strict obligations and executable acceptance before product implementation begins. Unsupported glob syntax is rejected and unproved containment/disjointness fails closed.
- Every compile creates an immutable compiled identity. Contract authority, Source, referenced Context, canonical Product/Global semantics, runner/oracle, verifier or workspace drift invalidates prior derived results and requires recompilation; ordinary compile cannot silently adopt changed Source or Context.
- Targeted `verify` exists only for repair findings and can never accept a task. `final-gate`, Stop and close rerun every Outcome/global Check on one current snapshot; stored Receipts are audit-only.
- Assertions fail closed when an Observation is missing or type-incomparable. Negative proof requires an explicit Observation/value and implicit absence operators are unsupported. Counterfactual proof is valid only when the designated Assertions are the complete finding set.
- Runners receive a minimal environment whitelist plus only Check-declared env vars. Protected Contract/Source/Context/verifier/proof inputs reject symlinks and detectable hardlinks, and Source Claims require real declared Source files.
- Active authority is a complete compiled snapshot in a Git common-dir V3 record paired with a worktree Git-config marker that binds task id, authority revision and compiled identity. The workdir compiled file is only a rebuildable projection; previous authority, immutable initial base and risk floor never come from it. Authority updates use compare-and-swap, legacy V2 state migrates only from a fully matching cache, and Stop/close atomically clear the binding only after a successful Live Gate.

## Durable-Fact And Authority Rules

- `project_context/**` is authoritative for intended product ownership, architecture, interface, state/recovery and repeat-execution facts; code is authoritative for current implementation; project verification is authoritative for behavior.
- Product Surface Contract work uses `context_surface_contract` with the existing `contract`, area/subdomain and verification roles; it must not add a new product-surface Context role.
- The default Workflow reads minimum graph-relevant Context, decides exactly one `Context Delta: none|required`, uses platform-internal planning, implements, verifies, performs Contract Conformance and checks Context drift.
- Long-Task Workflow inherits Context priority, one `Context Delta`, context-first durable updates and final drift checking. It replaces informal long-task intent and completion with the Delivery Contract and Evidence Kernel, not with task scheduling state.
- `PROJECT_SPEC.md` owns the stable Harness mental model and design rationale. AGENTS is a startup router/hard-boundary surface, Skills own role procedures, README owns human usage and tests own machine proof.

## Current State

- v0.6.0 defines `long-task-delivery-v2` as the only active schema, the package-owned Hook, V1 retirement migration and retired Delivery Set tombstone.
- `ty-context enable long-task` installs the Long-Task Workflow Skill, Stop Hook and required templates. Hook lifecycle operations remove current or historical package-owned absolute commands only when their managed status and known package layout match, while preserving user entries even when they share a group or use similar names. Non-Codex/default consumers do not receive those assets unless enabled.
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
  - [implementation index](areas/harness-package/implementation-index.md)
  - [verification](areas/harness-package/verification.md)
- [delivery-benchmark](areas/delivery-benchmark.md)

## Context Graph

- See `project_context/context.toml` for registered area/role Context and graph metadata.
