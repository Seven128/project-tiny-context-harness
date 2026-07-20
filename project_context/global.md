# Project / Delivery Context

## Project Goal

- Maintain `project-tiny-context-harness`, the npm package and `ty-context` CLI behind Project Tiny Context Harness.
- Keep three cooperating capabilities small and distinct: **Minimal Context** preserves durable project facts, **Workflow Contract** defines the lightweight default engineering loop, and the explicitly enabled **Long-Task Workflow** adds one complete Contract authority plus current-snapshot machine completion for work that needs durable recovery.
- Preventing false completion inside declared authority is the Long-Task Workflow's controlling objective. Intermediate implementation may drift or fail; only fresh evidence for every declared Plan Item/Claim and AC on the complete current final snapshot may accept. Otherwise the task remains explicitly unfinished or `machine_accepted_external_pending` when only named external confirmation remains.
- Preserve that protection at the lowest practical total Authoring, Runtime, State, Recovery, maintenance and test cost. Retain a mechanism only when it closes a distinct false-completion/delivery-drift path or enables a material total-cost reduction without weakening acceptance, and its non-substitutable benefit materially exceeds its total cost.

## Background

- Fresh coding-agent sessions need a repo-owned recovery path for product intent, ownership, architecture boundaries and repeatable verification instead of rediscovering them from code.
- The package previously carried a multi-worker Campaign runtime; the active design now keeps durable Context and verifier-owned completion while leaving mutable implementation sequencing to the current platform Goal.

## Durable Context Purpose

- `project_context/**` stores the smallest durable non-implementation facts future agents need to recover product intent, ownership, architecture and dependency boundaries, contracts, state/recovery semantics, and repeatable verification/deployment paths.
- The default recovery path is intentionally small: read `global.md`, `architecture.md`, `context.toml`, the default area root, collect manifest candidates, then run one bounded text search over `project_context/**` with a small set of high-signal task terms before `Context Delta`. Specialized workflow, package-management and verification detail remains `on-demand`, not near-universal startup context.
- The bounded search supplements triggers and semantic judgment, reads only relevant Context matches, and creates no vector/persistent index, cache, registry, state or second authority.
- Context owns intended durable truth; code owns current implementation; tests, CI, runtime evidence and human observation prove behavior. A disagreement is implementation drift, missing work or stale Context, never permission for code convenience to silently redefine intent.
- Every task decides exactly one `Context Delta: none|required`. Durable ownership, architecture, API/schema/data, state/recovery, dependency, security, product-surface responsibility or repeatable verification/deployment changes are `required` and update the owning Context. Semantics-preserving local fixes are `none`.
- Context is not a plan, implementation summary, log, evidence ledger, Receipt or result claim. Do not store one-off output, secrets, screenshots, temporary JSON, raw evidence or delivery state in it.

## Design Rationale

- Keep one primary owner for each durable fact, use the smallest near-universal Context set, and combine cheap manifest routing with a bounded search fallback so trigger wording is not the only discovery path.
- Prefer existing Context, Contract and project-verification mechanisms over new artifacts or state. Add a mechanism only when it closes a distinct failure path or delivers a material net cost reduction.
- Keep acceptance fail-closed: efficiency may reduce authoring, model or recovery cost but never substitutes historical evidence, prose or Agent judgment for current-snapshot proof.
- When a declared result can pass on a proxy surface while failing in its target runtime, require a project-owned Check that exercises that target during the current Check execution. A tracked report, screenshot, binary or prior run is review material, not live runtime proof.

## Non-goals / Boundaries

- The default Workflow Contract reads minimum relevant Context through manifest routing plus bounded Context search, uses platform-internal planning, implements, runs project-owned verification, performs Contract Conformance and checks Context drift. It requires no `plan.md`, matrix, verdict, evidence ledger or result artifact.
- Product Surface Contract work uses `context_surface_contract` with existing `contract`, area/subdomain and verification roles. It must not add a new product-surface Context role; durable surface responsibility remains project-owned Context.
- The active long-task design is **Single-Goal Rolling Delivery V2**: one user-selected delivery, one complete Contract authority, one native Goal, one selected workspace, one user model-choice checkpoint after first Authority Lock, dependency-ready rolling implementation, targeted verifier repair evidence and one source-recompiled same-snapshot Live Final Gate.
- `delivery-contract.yaml` is the only Contract authoring file and remains a non-authoritative Draft until the first successful formal Compile creates Authority Lock. New authoring uses inline Outcomes; existing `outcome_files` are physical compatibility only and create no semantic or completion boundary.
- Source Plan authoring is an optional upstream helper. It can refine one plan or synthesize a sparse brief plus mixed attachments, accounts for every input, records defensible recommended plan choices as delegated Source and expands interactive scope to surface/region/control/state/feedback detail. A recommendation is defensible only when the material decision criteria are already known from the user, supplied Source/Context or controlling constraints. If an unknown priority such as quality versus cost, delivery speed, privacy, lock-in or operational burden could materially change the research scope, candidate set or recommendation, Authoring stops before comparative research and asks a concise targeted question; this is a conditional clarification, not a fixed intake questionnaire. Once that preference envelope is clear, research current authoritative sources when needed and delegate the supported recommendation without a second approval pause. A delegated plan choice is not authorization to perform a high-risk external action: payment, contracting, production release, destructive production mutation, real permission grant or sensitive-data transmission remains an explicit external confirmation. Conflicting inputs, a user-reserved choice, a missing material preference or semantics with no defensible recommendation remain `decision_required`.
- Harness never creates or recovers platform Goals, invokes or switches models, persists model routes/checkpoint acknowledgement, schedules agents, creates branches/worktrees, merges, pushes, opens PRs, deploys or manages process trees. The selected workspace and external platform own those operations.
- No Source Inventory file, Coverage authority, Packet/SFC/Wave/Campaign runtime, second Contract plan, scheduler, Worker registry or external-confirmation state machine belongs in the active product.

## Long-Task Authority

- Real Source is mandatory. Non-rendering Material Source Item markers preserve original text; compiled Source/REQ/CTRL/OBL/NCOMP/AC coverage is a derived projection, never a second editable authority.
- Preflight is read-only and Compile uses the same activation-safety kernel. Preflight may aggregate repair diagnostics but creates no authority, cache, progress, Receipt or pending revision and runs no project check.
- The first successful Compile creates Authority Lock and emits `execution_model_checkpoint.required: true`. Before implementation the Agent asks the user to continue with the current model or switch models and resume; a prior explicit model strategy satisfies the checkpoint, later revisions do not repeat it, and the choice is not proof.
- Outcome decomposes execution, dependency readiness, targeted verification and diagnosis; it does not split completion authority. File count, layers, capacity, model context, desired parallelism or output length never create an Outcome or Contract boundary.
- Targeted verify is repair evidence only. Final Gate, Stop and close recompile Source authority and rerun the complete Contract on one clean current Git-tree snapshot. Status, Progress, Receipts and compiled cache are audit/recovery projections only.
- Put target-runtime proof in the earliest Outcome that owns the runnable boundary, declare its runtime-affecting `input_paths` and Binding carriers, and use the existing targeted verifier after the first runnable slice and after coalesced relevant changes. This rolling feedback never accepts, does not require a build per Outcome/edit and adds no platform-impact metadata, scheduler or completion state; Final Gate still reruns the same live Check.
- Authority revisions use three fail-closed classes. Machine-proven monotonic evidence strengthening auto-revises; a candidate whose only protected reasons are owner/change/support scope expansion remains inactive but may be exercised through stateless diagnosis, with safe monotonic strengthening allowed to coexist; every other protected semantic change, proof weakening, runner or verifier-content change, or risk change requires the exact revision identity. The executing Agent never approves its own protected revision.
- `diagnose-revision` recompiles the same `delivery-contract.yaml` against the active Authority and may run only existing active Check identities with unchanged runner/verifier authority for a scope-only candidate. It writes no pending/approval state, Active Authority, cache, Progress or Receipt and never authorizes acceptance. Repeated edits accumulate only in the existing Contract Draft; ordinary `compile --revise` creates one hash-bound pending decision and concise deterministic summary. Until approval and atomic adoption, the old Authority remains active; adoption invalidates derived evidence and the complete current-snapshot Final Gate remains mandatory.
- Architecture requirements that matter to acceptance must use existing Contract mechanisms: Source-backed technical obligations or forbidden shortcuts, owner/path/binding boundaries and project-owned executable checks. A functional AC cannot substitute for a declared architecture invariant.
- Machine acceptance never implies Git hosting, CI, deployment, network isolation, migration/payment execution or human product acceptance. Those remain explicit external confirmations.

## Architecture Context

- `project_context/architecture.md` owns the minimum component, authority, data-flow and verification-boundary map.
- Specialized foundation, workflow-contract, package-managed-surface, verification and decision-rationale facts are registered in `project_context/context.toml` and read on demand.
- `PROJECT_SPEC.md` owns the full stable product/workflow explanation; Context keeps only the durable facts needed for recovery and decisions.

## Current State

- Package version `0.7.0` defines the public `long-task-delivery-v2` path, explicit `long-task` profile, package-owned Stop Hook, stateless Authority Revision diagnosis and manual boundary for development-period authority state.
- Managed source lives under `.codex/ty-context-managed/**`; packaged assets live under `packages/ty-context/assets/**`; `packages/ty-context/source-mappings.yaml` is the copy authority.
- Root `AGENTS.md` is a startup router and hard-boundary surface. Skills own role procedures, `PROJECT_SPEC.md` owns the full stable design explanation, role Context owns durable facts, README owns human usage, and tests own machine proof.
- `ty-context doctor` reports the deterministic default Context read footprint and warns on excessive or byte-identical default content without creating a new validation gate.
- `ty-context long-task compile` exposes the first-lock model choice as additive JSON rather than a persistent workflow state.

## Verification Entry Points

- `make validate-context`: Context recoverability.
- `make validate-harness`: Context plus touched-source modularity.
- `npm run test:affected`: fail-safe affected test selection.
- `npm run test:long-task:trust`: bounded high-impact Long-Task Trust Boundary regression after a candidate diff is frozen.
- `npm test --workspace project-tiny-context-harness`: complete package and Long-Task release-regression suites.
- `npm run test:long-task-performance --workspace project-tiny-context-harness`: large-repository runtime budgets.
- `node packages/ty-context/dist/cli.js package check-source`: managed source/package parity.
- `git diff --check`: patch hygiene.

## Next Safe Action

Keep implementation, managed source, package assets, Context, `PROJECT_SPEC.md`, English/Chinese README and behavior tests aligned. Use affected/focused loops while editing, the Trust Boundary Gate on a frozen Long-Task candidate, and the complete suite only when release routing requires it.

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

See `project_context/context.toml` for registered areas, role Context, triggers and read policy.
