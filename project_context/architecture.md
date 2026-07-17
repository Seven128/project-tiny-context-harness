# Architecture Context

This is the restrained architecture map for the Harness source repository. It records durable component and authority boundaries, not implementation narration.

## System Boundary

- The repository owns the `project-tiny-context-harness` npm package, `ty-context` CLI, Minimal Context assets, validators, source sync, explicit Long-Task Workflow capability, release automation and delivery benchmark skeleton.
- Consumer projects receive portable Minimal Context/default Workflow assets. The optional Source Plan Authoring Skill, Long-Task Workflow Skill and Codex Stop Hook are selected by the explicit `long-task` profile.
- Harness may run only safe verification commands declared in a compiled V2 Delivery Contract. Platform Goal/Turn lifecycle, agents, model routing, branches/worktrees, Git integration, PRs, CI, deployment and human acceptance remain outside the runtime.

## Component Map

- CLI routing: `packages/ty-context/src/commands/index.ts`; V2 Contract commands: `commands/long-task.ts`; Delivery Set/composite names are isolated retired tombstones.
- The sole active schema lives under `packages/ty-context/src/schemas/long-task-delivery-v2/**`; Claim, authority/progress/boundary, runner/evidence and Live Gate modules remain focused and separate.
- Source Authority: `long-task-source-item-parser.ts`, `long-task-source-inventory.ts` and `long-task-source-continuity.ts` derive a text-bound Material Source inventory and enforce marker/Claim set equality and typed disposition continuity without creating a second Source artifact.
- Shared activation safety: `long-task-activation-validation.ts` is called by read-only Preflight in collecting mode and by static Compile in fail-fast mode. It owns Source, criterion, Claim/all-of-surface, adapter, Observation, risk, owner/path/binding, runner/input, Counterfactual and sensitivity validation before Authority Lock.
- Static compiler: canonical normalized Contract/authority/compiled identity, first-class atomic Claims, Acceptance mapping, adapter/Observation identity, field-policy completeness and first-success Authority Lock.
- Evidence Kernel V2: runner-derived adapters, explicit command runner, Git-aware snapshot, canonical multi-project Playwright AC observations, passed-Check-only Claim/Population proof, Binding/value-sensitive Counterfactuals, precise enriched findings, targeted verifier and source-recompiled same-snapshot Live Final Gate.
- Recovery state: the user-authored `delivery-contract.yaml` and optional `source.md` live in the chosen workdir; existing `outcome_files` are physical compatibility only. Progress/Receipt and the workdir compiled file are audit/cache projections only. The Git common-dir Active Authority V3 record contains the complete compiled snapshot and immutable first base, while the matching worktree config marker binds task, revision and compiled identity.
- Stop adapter is a no-op without a binding and otherwise runs the Live Final Gate fail-closed; it never trusts a stored Receipt or compiled cache.
- Capability/profile selection: `packages/ty-context/src/lib/profiles.ts`, `commands/enable.ts`, `commands/disable.ts`, config parsing and upgrade migration. The profile-managed authoring surfaces are the non-authoritative upstream `source-plan-authoring` Skill and `long-task-workflow`, which owns Contract Draft authoring, Preflight, Compile, rolling execution and Final Gate as one lifecycle.
- Managed source: `.codex/ty-context-managed/**`; packaged assets: `packages/ty-context/assets/**`; mapping authority: `packages/ty-context/source-mappings.yaml`.
- Source-workspace durable facts: `project_context/**`; full stable workflow design: `PROJECT_SPEC.md`.

## Data / Control Flow

The lifecycle is:

`Source -> optional Source Plan -> Contract Draft -> Draft Outcome decomposition -> repository/Context binding -> Preflight repair loop -> Compile / Authority Lock -> Rolling Frontier -> targeted repair verification -> one-snapshot Final Gate`

1. Source may be a user request, ordinary prose, research or an external plan. An optional upstream Source Plan may improve keys, anchors, derivation provenance and unresolved decisions; it remains ordinary Source and creates no Harness state or authority.
2. `long-task init <workdir>` may create a Compact inline-Outcome `delivery-contract.yaml` template. Until the first successful formal Compile, that file is one non-authoritative Contract Draft that `long-task-workflow` may revise across multiple repository/Context reads and responses.
3. The Skill decomposes independently observable, decidable and target-verifiable results into Draft Outcomes. `Draft Outcome` adds no schema field or runtime type; it is the authoring-time lifecycle of the same Outcome that later enters Authority Lock.
4. Repository/Context binding adds owners, paths, existing Bindings, runners, verification inputs and proof surfaces only from real evidence. Contract authoring inserts non-rendering Material Source Item markers into the original Source, producing a text-exact, typed, set-equal compiled inventory without changing Source meaning.
5. `preflight` parses and normalizes the Draft, invokes shared activation validation in collecting mode and returns findings to the same Draft. The repair loop leaves Active Authority, marker, cache, progress, Receipt, pending revision, Git state and project runners untouched.
6. `compile` invokes the same validation in fail-fast mode, computes atomic all-of Claim Coverage and risk floor, derives canonical Source/Product/Technical/Acceptance/Risk/Context projections, freezes adapter/runner/source/verifier identities and makes the first success Authority Lock. It does not invoke a model or modify product code.
7. The current native Goal uses `depends_on` acceptance readiness and current findings to form a temporary Rolling Frontier, implement in the current workspace and run project-focused tests. The Frontier is not persisted and is not a scheduler or mandatory implementation plan.
8. `verify --outcome/--check` runs selected checks on a current snapshot, emits proof only for fully passed Checks and stores repair-only status after re-reading active identity. It improves the repair loop but has no completion authority.
9. Contract `status` projects `unverified|progress_passing|progress_failing|progress_stale|blocked_external`; `resume` restores semantic ready Outcomes, findings and next action without starting execution or reconnecting a physical Turn.
10. `final-gate`, Stop and close recompile source authority, validate the common-dir record/config marker, create one Git-tree snapshot, rerun every Global and Outcome Check, deduplicate only identical raw execution, then re-read active identity. Outcome decomposition never reduces this complete current-snapshot verification; Stop/close use accepted-identity CAS clear.
11. Workspace, Contract, relevant Context, Source, command/oracle or verifier drift stales affected results. `abandon` removes temporary task state without touching Git or authored Source/Contract.

## Contract Shape And Risk

- The Contract has `task`, `source_claims`, `risk`, `global` and `outcomes`. Product, Technical Boundary and Acceptance remain separate logical authorities inside the one file.
- Model-authored public identifiers are only task, Outcome and Check keys. Compiler-generated internal identifiers remove the former cross-file reference namespace.
- Outcome dependencies form the acceptance readiness relation only; they do not prescribe implementation slices or parallel scheduling. Requirements are atomic Product Claims; control location is a `ui_browser` Claim; named Assertions preserve Source AC identity.
- Standard proof requires executable falsifiable checks, a non-Result atomic Claim per Outcome and all required surfaces. Only Playwright adapter evidence may prove `ui_browser`; Claim-bearing Playwright Assertions are AC `passed equals true`. A Claim-bearing Observation is unique across every Check sharing its Raw Execution identity. Strict and weak-evidence routing enforce Binding/value-sensitive Counterfactual, population, security, environment and rollback/recovery obligations as applicable.
- Actual changed paths outside declared expected/support paths, or a newly touched undeclared Context owner/boundary, return a `scope_escape` Finding; the current Goal reviews risk/ownership, revises and recompiles the Contract.

## Safety And Storage Boundaries

- Contract parsing rejects unknown keys, duplicate keys, YAML aliases/merges/tags and multiple documents.
- Paths are repository-relative and realpath-contained. Exact paths and patterns share one canonical segment grammar before Contract hashing: Windows separators and one leading `./` normalize to `/`; internal `.`/`..`, NUL/CR/LF/Tab, empty segments, absolute/drive/UNC paths and unsupported wildcard syntax are rejected. Matching, subset and overlap/disjoint use the same restricted AST. Protected Contract, fragment, Source, Context, runner, verification-input, Counterfactual-fixture and package-verifier files reject symlinks and detectable hardlinks; the snapshot-owned read-only `node_modules` junction is the sole explicit exception.
- Commands use argv arrays with no shell, bounded output/time and a minimal environment whitelist. Only env vars explicitly declared by the current Check are additionally passed.
- Worker/Agent prose, handwritten status, command exit alone and historical targeted passes cannot create accepted authority.
- Raw command reuse binds evidence adapter, frozen runner identity and canonical declared Environment Requirements, never actual env values. Claim-bearing Observation ownership spans all Checks sharing the identity; artifacts and Assertion evaluation remain per Check.
- Final acceptance binds the same snapshot plus Contract, source, selected Context, runner/oracle, verifier content/runtime locator, workdir and repository identity. History is not spliced into current proof.
- Runtime state is ordinary same-user project state, not a hostile-host security boundary. The product does not claim resistance to deliberate same-user/admin deletion, system Hook bypass or kernel compromise.
- Local mode trusts the installed package-owned verifier and Git metadata; external platforms remain responsible for network isolation.
- `abandon --force-corrupt-state` is the only stale-lock/invalid-record/marker-mismatch continuity cleanup. It derives record, marker and lock paths from the current repository/worktree, requires a repository-contained supplied workdir and removes only active state plus that workdir's `.ty-context/**`.

## Distribution And Migration

- Default profiles remain `core-portable` and `workflow-default`; `long-task` is explicit and owns both optional Source Plan authoring and the Long-Task execution Skill.
- `sync` refreshes enabled managed assets only. Long-task enable/disable/upgrade share entry-level Hook cleanup that recognizes current and relocated package-owned absolute commands only through known managed status plus known package layout, while preserving same-group and similar-name user entries. `upgrade` owns the deterministic safe migration from package-owned `composite-codex` selection/assets to `long-task`.
- Migration never imports or executes an unfinished historical campaign or development-period V2 Active Authority/Progress/Receipts and never deletes user-authored campaign/source/contract files.
- Package tarballs contain the Delivery Contract schema, Long-Task Skill/Hook/templates and Evidence Kernel, but no Campaign/AppServer/Codex-worker/SFC/Packet/Wave/worktree scheduler runtime.

## Design Rationale

- Keep platform Goal/session lifecycle and Git orchestration outside Harness because duplicating them creates recovery state without improving acceptance evidence.
- Preserve only an Evidence Kernel that closes concrete false-completion paths: strict preflight, executable assertions, current-snapshot Final Gate and exact freshness.
- Use one workspace snapshot and one Contract authority so stale or historically spliced evidence cannot silently pass.

## Constraints And Tradeoffs

- Do not restore stages, fixed plan files, Source Unit inventories, SFC graphs, Packets, Waves, integration branches, worker attempts, model routing, top-level Contract splitting or a second completion authority.
- Do not introduce a separate Contract Authoring Skill, Authoring receipt/state, Coverage authority, execution registry, runner/proof recipe, YAML alias or capacity-based Outcome fragmentation.
- Do not introduce `draft_outcomes`, a `DraftOutcome` runtime type or persistent Rolling Frontier. Draft Outcome is a lifecycle qualifier; Outcome decomposition improves intermediate execution and diagnosis, not completion authority.
- Do not turn optional Source Plan authoring into a schema, CLI, preflight, validator, cache, receipt, authority or completion gate.
- Do not auto-trigger Long-Task Workflow from duration/file count/complexity.
- Do not let targeted verify accept, reuse historical results in Final Gate, or allow Skill prose to weaken compiler-enforced proof.
- Do not let `init`, `sync` or `upgrade` activate tasks or infer project semantics.
- Keep `architecture.md` concise; detailed schema and operational usage belong in code/tests/README/PROJECT_SPEC.

## Verification Implications

- Focused Skill/profile tests prove explicit Source Plan triggering, semantic-boundary guidance, managed-source parity and long-task profile install/remove behavior; schema/parser/compiler/risk tests continue to prove Compact equivalence, Source/REQ/CTRL/OBL/AC coverage, read-only Preflight and deterministic routing.
- Real temporary-Git black boxes prove the one-workspace verify/final/stale/close loop and platform non-orchestration boundary.
- Source sync/check, consumer quickstart, exact tarball inspection and full package gates prove distributed-surface alignment.

## Open Risks

- Contract structure cannot prove that an author declared every real product requirement.
- Package-managed Hooks and state protect against accidental drift, not deliberate same-user/admin or system-level tampering.
- Snapshotting and complete Final Gates trade runtime cost for trustworthy current evidence; performance budgets keep that cost bounded.
