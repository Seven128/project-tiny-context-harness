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
- Design Authority scaffold and advisory inspection: `packages/ty-context/src/lib/design-md.ts` and `doctor.ts`; inspection reports observable system-level index/token/reference signals but never infers per-surface implementation readiness. Project-authored visual targets remain referenced Source/verifier inputs rather than a package-owned design artifact tree.
- UI authority authoring surfaces: managed `product-surface-contract.md` owns cross-surface responsibility and `screen-contract.md` provides optional on-demand Screen/Control Context structure using existing roles. Managed product, surface, UI/UX and engineering Skills apply UI Authority Closure and stable surface/control/target keys.
- External design-resource boundary: dedicated Product Design, Figma, image-generation, prototype or human workflows own resource generation. Tiny Context consumes their stable selected targets/constraints as ordinary Source through UI Authority Closure and existing default/Long-Task Source, Context, verification-input and evidence mechanisms; it owns no design-generation Skill, pack schema, validator, fixed directory or plugin dependency.
- Context Authority projection: `long-task-context-authority-topology.ts` separates selected delivery-authority structure from retrieval-only manifest guidance before `context-graph-snapshot.ts` freezes Long-Task Context.
- Active Contract schema: `packages/ty-context/src/schemas/long-task-delivery-v2/**` plus focused `long-task-*` parser/compiler/claims/risk modules. The existing Control projection carries control identity, placement/task, visibility/availability, input/validation/default, interaction/navigation, states/recovery/permission/feedback and accessibility; it does not create a UI-specific Contract block or lifecycle.
- Shared activation safety: `long-task-activation-validation.ts`, used by collecting Preflight and fail-fast Compile.
- Source authority: Source marker/parser/inventory/target-continuity modules derive text-bound Source/REQ/CTRL/OBL/NCOMP/AC projections without another editable Source authority.
- Evidence Kernel: runner-derived adapters, explicit runners, structured/Playwright observations, Counterfactual and Population sensitivity, target-runtime-current-execution proof, targeted verifier, Git-aware snapshot and source-recompiled same-snapshot Live Final Gate.
- Authority/recovery: one common-dir Active Authority V3 snapshot plus matching worktree marker; workdir compiled output, Progress and Receipts are rebuildable audit/recovery projections.
- Revision diagnosis: `long-task-authority-revision*.ts` deterministically classifies and summarizes the candidate, including exact changed semantic fields, Source/Product Claim reductions and external-confirmation keys; `long-task-authority-revision-diagnosis.ts` exercises only scope-only candidates through existing active Check identities with unchanged runner/verifier authority, without publishing authority or evidence.
- Compile handoff: `commands/long-task.ts` emits an additive one-time `execution_model_checkpoint` after first Authority Lock; it does not switch models or persist acknowledgement/model-route state.
- Release pipeline: `.github/workflows/npm-publish.yml` separates one complete prepare/test/pack/smoke job from the protected publish job. The second job downloads and verifies the exact prepared artifact for the same source commit; it never rebuilds, retests or repacks.
- Managed source: `.codex/ty-context-managed/**`; package assets: `packages/ty-context/assets/**`; mapping authority: `packages/ty-context/source-mappings.yaml`.
- Full stable mental model: `PROJECT_SPEC.md`; high-frequency durable facts: `project_context/**`.

## Default Context Read Architecture

- Near-universal startup Context is limited to `global.md`, `architecture.md`, `context.toml` and the default area root.
- Foundation, workflow-contract, package-managed-surface and verification detail is task-triggered `on-demand` Context. This changes loading cost, not fact authority.
- Before `Context Delta`, the Agent combines graph/trigger candidates with one bounded text search over `project_context/**`, using a small set of high-signal task terms such as explicit area/module names and API/schema/state/security/verification/deployment language.
- The bounded search only discovers candidates. Semantic judgment decides relevance; it creates no vector/persistent index, cache, registry, search state or second authority.
- `ty-context doctor` deterministically reports selected default files, bytes, soft-budget overages, exact duplicate content and `DESIGN.md` authority status. The report is advisory and creates no Context state or completion authority.
- A Context fact has one primary owning file. Other high-frequency surfaces use short routing pointers instead of copying detailed rules.
- `context.toml` retrieval fields (`triggers`, `read_when`, `read_policy`, default selection and unselected nodes) guide future Agent reads. Referenced Long-Task authority instead hashes the selected area/role/dependency projection plus selected Context contents, so retrieval-only maintenance does not create an Authority Revision or stale scoped Progress.

## Design Rationale

- Keep the startup graph small because every fresh Agent pays that read and attention cost; preserve specialized facts by routing them on demand rather than deleting them.
- Add one bounded Context search because manifest triggers are cheap but natural-language recall is imperfect. Searching only the small durable Context surface adds low fixed cost and reduces the direct trigger-miss path without introducing retrieval infrastructure.
- Keep ordinary planning and architecture judgment inside the platform Goal. Persist only durable project facts and use project-native executable checks for objective boundaries.
- Keep Long-Task acceptance separate from implementation sequencing: one Contract and one Final Gate provide completion authority without a scheduler, second plan or worker state.
- Use the first Authority Lock as a one-time user model-choice boundary. The locked Contract and Final Gate make lower-cost execution a viable user choice, while Harness still owns no model routing and adds no repeated pause or state.
- Keep retrieval guidance outside active delivery authority because it changes how a future Agent finds facts, not the meaning of the Context files already selected for the current delivery. Selected ownership, role/dependency structure and file contents remain fail-closed.

## Default Workflow And Architecture Quality

- Default execution uses manifest routing plus bounded Context search, one `Context Delta: none|required`, a conditional Design Authority Check for material production UI, platform-internal planning, precise implementation, project-owned verification, Contract Conformance and Context drift checking.
- The UI check first performs UI Authority Closure over affected stable surface/control/target keys, then reads relevant screen/surface Context, `DESIGN.md`, one authored token source/generation direction and selected versioned design references. Exact targets may support fidelity claims, constraints prove only their declared scope, and inspiration never becomes an implicit reproduction target. Missing authority routes to a Context update, task-local explicit design authoring/delegation or a genuine decision before production styling; local style fixes and explicit prototypes stay lightweight.
- A risk-triggered architecture gate applies when work creates or changes a durable module/capability, public API/schema/data/persistence, state/source of truth, ownership/dependency direction, cross-area boundary, migration/security/recovery behavior or reusable abstraction.
- The gate resolves owner, unique source of truth, dependency direction, interface/state/lifecycle, failure/retry/recovery/compatibility, forbidden shortcuts and the project-owned executable check that protects the boundary.
- Durable results update owning Context; local implementation choices remain task-local. Small fixes do not pay architecture-ceremony cost.
- Harness may route project-owned architecture checks but must not become a language-generic dependency analyzer. Repositories use their native lint/AST/architecture tools.
- Modularity checks report physical and semantic risk, including the highest-risk function location, without changing project thresholds or creating lifecycle state.

## Data / Control Flow

`Source -> optional Source Plan -> UI Authority Closure / owning Context and design targets -> one Contract Draft -> Outcome decomposition and full Control projection -> repository/Context binding -> read-only Preflight -> Compile / Authority Lock -> one-time execution-model choice -> Rolling Frontier -> targeted verifier repair -> optional same-Contract stateless revision diagnosis -> exact pending approval when protected -> Authority Revision adoption -> Rolling Frontier under revised authority -> clean candidate commit -> source-recompiled same-snapshot Live Final Gate`

- Product, Technical Boundary and Acceptance are distinct logical authorities inside one Contract.
- Outcomes are independently observable, decidable and target-verifiable acceptance/diagnosis units. Dependencies express readiness only; no scheduler or mandatory implementation DAG is persisted.
- A Draft Outcome is the pre-Authority-Lock lifecycle of that same Outcome, not a runtime type; it adds no schema field, state file, Worker or completion boundary.
- Preflight and Compile share activation safety. Preflight diagnostics may include stable references, repair hints, duplicate occurrence counts and narrowly proven primary/dependent repair links, but remain read-only and non-authoritative.
- First Compile emits the one-time model choice. A prior explicit user model strategy satisfies it; later revisions do not repeat it. The choice is not completion proof.
- Targeted verify may localize repair and store scoped current-snapshot Progress; it cannot accept.
- A target-runtime Claim that can diverge from a proxy surface is owned by the earliest runnable Outcome and proved by a Check that exercises the exact declared target in its current Raw Execution. A target profile explicitly names its required product targets; bounded runtime-family and root-entry bindings prevent one target from substituting for another. The current Goal runs that existing Check at the first runnable boundary and after coalesced changes to its declared runtime inputs; this creates no scheduler or per-target progress state.
- Revision diagnosis is a non-authoritative repair loop, not extended Preflight: monotonic proof strengthening needs no approval, a candidate whose only protected reasons are scope expansion may run existing active Check identities with unchanged runner/verifier authority without writing Progress, semantic changes, proof weakening, runner or verifier-content changes, and risk increases are summarized but never executed as candidates, and risk downgrade is rejected. Only `compile --revise` may create the single pending decision and only approved atomic Compile may replace Active Authority.
- Revision adoption invalidates affected evidence and returns control to rolling implementation; it never creates delivery acceptance or changes the platform-native Goal. CLI revision results expose that no-completion effect and a next action without adding lifecycle state.
- Final Gate, Stop and close recompile Source authority, bind active task/revision/worktree/Git-tree identity and rerun all declared Global and Outcome checks. Only this complete current snapshot can create machine acceptance, and public JSON/Hook output identifies its scope as declared machine Authority rather than native-Goal completion.

## Contract And Architecture Closure

- Stable architecture requirements are represented through existing Source-backed technical obligations, global constraints or forbidden shortcuts, owner/path envelopes, Bindings and project-owned executable Checks.
- Functional behavior and architecture structure are separate claims when either can pass without the other. Both must have falsifiable proof when both are required.
- Unsupported architecture preference, inferred product semantics or an unverifiable “good design” claim must not become false authority. Resolve it as durable Context, task-local judgment or `decision_required`.
- A material UI request with only an unconfigured starter, style prose or inspiration cannot use the implementation itself as its own target. A design authored under explicit delegation must be selected and frozen as Source before fidelity implementation or comparison begins.
- Scope/path escape, duplicate authority, bypass of an owning service/facade, wrong dependency direction or second source of truth blocks only when the Contract or controlling Context declares the invariant and a reliable check can observe it.

## Constraints And Tradeoffs

- Minimal default Context trades automatic reading of every specialized rule for lower recurring attention cost; manifest routing plus bounded search reduces recall risk without loading the whole Context graph.
- Keyword search cannot understand every synonym or indirect dependency, so it supplements rather than replaces semantic reasoning, Architecture Context Hit and final Conformance.
- Retrieval-only manifest edits may preserve active Authority and scoped Progress, but they never preserve a Final Receipt across a changed Git tree; Final Gate still runs against the final committed snapshot.
- Architecture enforcement is limited to declared, falsifiable project invariants. Subjective design quality remains engineering review rather than false machine proof.
- Runtime evidence is likewise project-owned: Harness can require current-execution semantics, a Source-authored bounded target/runtime-family/root profile, evidence to the furthest independently failing declared boundary, causal Counterfactuals when carrier presence can diverge from capability, and frozen runner/verifier identity. It cannot infer which targets the product requires or independently attest that a trusted project oracle exercises the intended target.
- The first successful Compile creates Authority Lock and immutable initial base. Later protected changes cannot be silently adopted; candidate diagnosis leaves the old Authority active and cannot create a second Draft authority, state plane or acceptance path.
- The execution-model checkpoint is one additive compile signal and Agent pause; no model switch, route, tier scheduler, acknowledgement file or repeated checkpoint exists.
- One user-selected delivery has one Contract, one selected workspace and one Final Gate. Existing `outcome_files` are physical compatibility only.
- No active Source Inventory/Coverage file, SFC/Packet/Wave/Campaign runtime, Worker scheduler, execution registry, second plan or external-confirmation tracker exists.
- No persistent `authority_revision_in_progress`, native-Goal completion state or Goal-restoration runtime exists; current candidate files, pending exact revision identity and the host Goal remain the respective owners.
- `init`, `sync` and `upgrade` never import or execute retired Campaign or development-period authority state.
- Package-managed asset changes require source/package parity, idempotent sync and consumer-facing verification.

## Verification Implications

- `ty-context doctor` reports default Context footprint, exact duplicate default files and Design Authority system/index/token/reference signals as advisory maintenance information; it explicitly does not compute surface-level implementation readiness.
- `make validate-context` protects required recovery structure and registered role consistency; it is not relaxed to obtain a smaller Context.
- Workflow guidance tests must prove manifest routing and bounded search are both present, search remains limited to `project_context/**`, and no index/state is introduced.
- Context Authority topology tests prove retrieval-only edits preserve selected authority while selected area, role and dependency changes remain hash-visible; Context evolution tests prove the same boundary through Compile, Progress and status.
- Long-Task CLI tests must prove first Compile emits `execution_model_checkpoint.required: true`, later Compile emits `false`, and Skill/reference/package copies preserve the same one-time/no-state semantics.
- Preflight remains read-only and Compile remains the fail-closed activation boundary. Added references, repair hints, occurrence counts and repair-order metadata may improve repair but cannot change acceptance.
- Revision tests must prove the three-way classifier, exact summary/hash binding, scope-only candidate execution with zero durable-state mutation, red-candidate non-execution, stable pending projection in status/resume, approval invalidation after edits and full evidence invalidation after adoption.
- Project-native architecture checks and `check-modularity` protect declared structural boundaries; Final Gate alone reruns the complete long-task authority on one current snapshot.
- Managed source/package/generated copies must remain byte-aligned through source sync and package parity checks.
- Guidance parity tests prove that a proxy, tracked status report or historical artifact cannot be the sole proof of a target-runtime Claim; rolling reruns remain coalesced through existing input freshness, and only the bounded required-target/runtime-family/root profile plus exact terminal target/Stage projections are added—never open-ended `platform_impact`, per-platform Progress or a per-Outcome rebuild rule.
- Trusted publication binds the tested tarball SHA-256, dispatch source commit and a CRLF/LF-stable lockfile identity across the job boundary. Node/npm versions remain build provenance, not a requirement that the later publisher process use byte-identical tools.

## Open Risks

- A structurally complete Contract cannot discover undeclared requirements.
- Bounded keyword search can still miss synonyms or indirect semantics; real Agent routing evidence is required to quantify residual recall risk.
- Same-user files, installed package code and Git metadata are trusted drift boundaries, not hostile-host security isolation.
- Architecture quality beyond declared and observable invariants still depends on engineering judgment and review.
- Public docs, managed source, package assets and generated workspace copies can drift unless parity checks remain enforced.
