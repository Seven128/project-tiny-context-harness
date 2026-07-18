# Architecture Context

This is the minimum durable architecture map for the Harness source repository. Detailed role contracts and design rationale are selected on demand through `project_context/context.toml`.

## System Boundary

- The repository owns the `project-tiny-context-harness` npm package, `ty-context` CLI, managed Minimal Context/default Workflow assets, validators, source sync, explicit Long-Task capability, release automation and delivery benchmark.
- Consumer projects receive portable core/default workflow assets. `ty-context enable long-task` adds the optional Source Plan Skill, Long-Task Workflow Skill and package-owned Stop Hook.
- Harness owns durable Context and declared workflow authority, not product quality. Project tests, CI, runtime observation and human acceptance remain the evidence authorities.
- Harness does not own platform Goal/Turn lifecycle, models, agents, process trees, network isolation, branches/worktrees, merge/push/PR, CI, deployment or external confirmation execution.

## Component Map

- CLI and command routing: `packages/ty-context/src/commands/**`.
- Context manifest, graph, validation, export, sync and doctor: `packages/ty-context/src/lib/context-*`, `validators.ts`, `sync-engine.ts`, `doctor.ts`.
- Active Contract schema: `packages/ty-context/src/schemas/long-task-delivery-v2/**` plus focused `long-task-*` parser/compiler/claims/risk modules.
- Shared activation safety: `long-task-activation-validation.ts`, used by collecting Preflight and fail-fast Compile.
- Source authority: Source marker/parser/inventory/target-continuity modules derive text-bound Source/REQ/CTRL/OBL/NCOMP/AC projections without another editable Source authority.
- Evidence Kernel: runner-derived adapters, explicit runners, structured/Playwright observations, Counterfactual and Population sensitivity, targeted verifier, Git-aware snapshot and source-recompiled same-snapshot Live Final Gate.
- Authority/recovery: one common-dir Active Authority V3 snapshot plus matching worktree marker; workdir compiled output, Progress and Receipts are rebuildable audit/recovery projections.
- Managed source: `.codex/ty-context-managed/**`; package assets: `packages/ty-context/assets/**`; mapping authority: `packages/ty-context/source-mappings.yaml`.
- Full stable mental model: `PROJECT_SPEC.md`; high-frequency durable facts: `project_context/**`.

## Default Context Read Architecture

- Near-universal startup Context is limited to `global.md`, `architecture.md`, `context.toml` and the default area root.
- Foundation, workflow-contract, package-managed-surface and verification detail is task-triggered `on-demand` Context. This changes loading cost, not fact authority.
- `ty-context doctor` deterministically reports selected default files, bytes, soft-budget overages and exact duplicate content. The report is advisory and creates no Context state or completion authority.
- A Context fact has one primary owning file. Other high-frequency surfaces use short routing pointers instead of copying detailed rules.

## Design Rationale

- Keep the startup graph small because every fresh Agent pays that read and attention cost; preserve specialized facts by routing them on demand rather than deleting them.
- Keep ordinary planning and architecture judgment inside the platform Goal. Persist only durable project facts and use project-native executable checks for objective boundaries.
- Keep Long-Task acceptance separate from implementation sequencing: one Contract and one Final Gate provide completion authority without a scheduler, second plan or worker state.

## Default Workflow And Architecture Quality

- Default execution uses one `Context Delta: none|required`, platform-internal planning, precise implementation, project-owned verification, Contract Conformance and Context drift checking.
- A risk-triggered architecture gate applies when work creates or changes a durable module/capability, public API/schema/data/persistence, state/source of truth, ownership/dependency direction, cross-area boundary, migration/security/recovery behavior or reusable abstraction.
- The gate resolves owner, unique source of truth, dependency direction, interface/state/lifecycle, failure/retry/recovery/compatibility, forbidden shortcuts and the project-owned executable check that protects the boundary.
- Durable results update owning Context; local implementation choices remain task-local. Small fixes do not pay architecture-ceremony cost.
- Harness may route project-owned architecture checks but must not become a language-generic dependency analyzer. Repositories use their native lint/AST/architecture tools.
- Modularity checks report physical and semantic risk, including the highest-risk function location, without changing project thresholds or creating lifecycle state.

## Data / Control Flow

`Source -> optional Source Plan -> one Contract Draft -> Outcome decomposition -> repository/Context binding -> read-only Preflight -> Compile / Authority Lock -> Rolling Frontier -> targeted verifier repair -> clean candidate commit -> source-recompiled same-snapshot Live Final Gate`

- Product, Technical Boundary and Acceptance are distinct logical authorities inside one Contract.
- Outcomes are independently observable, decidable and target-verifiable acceptance/diagnosis units. Dependencies express readiness only; no scheduler or mandatory implementation DAG is persisted.
- A Draft Outcome is the pre-Authority-Lock lifecycle of that same Outcome, not a runtime type; it adds no schema field, state file, Worker or completion boundary.
- Preflight and Compile share activation safety. Preflight diagnostics may include stable references, repair hints and duplicate occurrence counts, but remain read-only and non-authoritative.
- Targeted verify may localize repair and store scoped current-snapshot Progress; it cannot accept.
- Final Gate, Stop and close recompile Source authority, bind active task/revision/worktree/Git-tree identity and rerun all declared Global and Outcome checks. Only this complete current snapshot can create machine acceptance.

## Contract And Architecture Closure

- Stable architecture requirements are represented through existing Source-backed technical obligations, global constraints or forbidden shortcuts, owner/path envelopes, Bindings and project-owned executable Checks.
- Functional behavior and architecture structure are separate claims when either can pass without the other. Both must have falsifiable proof when both are required.
- Unsupported architecture preference, inferred product semantics or an unverifiable “good design” claim must not become false authority. Resolve it as durable Context, task-local judgment or `decision_required`.
- Scope/path escape, duplicate authority, bypass of an owning service/facade, wrong dependency direction or second source of truth blocks only when the Contract or controlling Context declares the invariant and a reliable check can observe it.

## Constraints And Tradeoffs

- Minimal default Context trades automatic reading of every specialized rule for lower recurring attention cost; task triggers and explicit Context references preserve access to the full durable fact set.
- Architecture enforcement is limited to declared, falsifiable project invariants. Subjective design quality remains engineering review rather than false machine proof.
- The first successful Compile creates Authority Lock and immutable initial base. Later protected reductions cannot be silently adopted.
- One user-selected delivery has one Contract, one selected workspace and one Final Gate. Existing `outcome_files` are physical compatibility only.
- No active Source Inventory/Coverage file, SFC/Packet/Wave/Campaign runtime, Worker scheduler, execution registry, second plan or external-confirmation tracker exists.
- `init`, `sync` and `upgrade` never import or execute retired Campaign or development-period authority state.
- Package-managed asset changes require source/package parity, idempotent sync and consumer-facing verification.

## Verification Implications

- `ty-context doctor` reports default Context footprint and exact duplicate default files as advisory maintenance signals.
- `make validate-context` protects required recovery structure and registered role consistency; it is not relaxed to obtain a smaller Context.
- Preflight remains read-only and Compile remains the fail-closed activation boundary. Added references, repair hints and occurrence counts may improve repair but cannot change acceptance.
- Project-native architecture checks and `check-modularity` protect declared structural boundaries; Final Gate alone reruns the complete long-task authority on one current snapshot.
- Managed source/package/generated copies must remain byte-aligned through source sync and package parity checks.

## Open Risks

- A structurally complete Contract cannot discover undeclared requirements.
- Same-user files, installed package code and Git metadata are trusted drift boundaries, not hostile-host security isolation.
- Architecture quality beyond declared and observable invariants still depends on engineering judgment and review.
- Public docs, managed source, package assets and generated workspace copies can drift unless parity checks remain enforced.
