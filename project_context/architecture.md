# Architecture Context

This is the restrained architecture map for the Harness source repository. It records durable component and authority boundaries, not implementation narration.

## System Boundary

- The repository owns the `project-tiny-context-harness` npm package, `ty-context` CLI, Minimal Context assets, validators, source sync, explicit Long-Task Workflow capability, release automation and delivery benchmark skeleton.
- Consumer projects receive portable Minimal Context/default Workflow assets. Codex Stop Hook and Long-Task Workflow Skill are selected by the explicit `long-task` profile.
- Harness may run only safe verification commands declared in a compiled V2 Delivery Contract. Platform Goal/Turn lifecycle, agents, model routing, branches/worktrees, Git integration, PRs, CI, deployment and human acceptance remain outside the runtime.

## Component Map

- CLI routing: `packages/ty-context/src/commands/index.ts`; V2 Contract commands: `commands/long-task.ts`; Delivery Set/composite names are isolated retired tombstones.
- The sole active schema lives under `packages/ty-context/src/schemas/long-task-delivery-v2/**`; Claim, authority/progress/boundary, runner/evidence and Live Gate modules remain focused and separate.
- Static compiler: strict YAML parsing, generated `OUT.<outcome-key>` / `CHECK.<outcome-key>.<check-key>` identities, dependency validation, deterministic risk floor, Context/source/runner/path/proof preflight and compiled identity.
- Evidence Kernel V2: explicit command runner, Git-aware snapshot, Assertion/Population/Counterfactual evaluators, per-Check evidence projection, targeted verifier and source-recompiled same-snapshot Live Final Gate.
- Recovery state: the user-authored `delivery-contract.yaml` and optional `source.md` live in the chosen workdir; progress/Receipt and the workdir compiled file are audit/cache projections only. The Git common-dir Active Authority V3 record contains the complete compiled snapshot and immutable first base, while the matching worktree config marker binds task, revision and compiled identity.
- Stop adapter is a no-op without a binding and otherwise runs the Live Final Gate fail-closed; it never trusts a stored Receipt or compiled cache.
- Capability/profile selection: `packages/ty-context/src/lib/profiles.ts`, `commands/enable.ts`, `commands/disable.ts`, config parsing and upgrade migration.
- Managed source: `.codex/ty-context-managed/**`; packaged assets: `packages/ty-context/assets/**`; mapping authority: `packages/ty-context/source-mappings.yaml`.
- Source-workspace durable facts: `project_context/**`; full stable workflow design: `PROJECT_SPEC.md`.

## Data / Control Flow

1. `long-task init <workdir>` creates only a `delivery-contract.yaml` template.
2. `compile` strictly parses the one Contract, computes Global and Outcome Claim Coverage plus the risk floor, validates dependencies/Context/source/paths/runners/proof, derives canonical Product/Global semantic projections, freezes repository/workdir/source/Contract/selected-Context/verifier/oracle/command identities and activates the worktree binding. It does not invoke a model or modify product code.
3. The current native Goal reads Contract and relevant Context, selects dependency-ready Outcomes as its internal Frontier, implements in the current workspace and runs project-focused tests.
4. `verify --outcome/--check` runs the selected checks on a current snapshot and stores repair-only derived status. It cannot emit accepted.
5. Contract `status` projects `unverified|progress_passing|progress_failing|progress_stale|blocked_external`; resume is read-only and starts no execution.
6. `final-gate`, Stop and close recompile source authority, validate the common-dir record/config marker, create one Git-tree snapshot, rerun every global/Outcome Check, deduplicate only identical raw execution inside that Gate and write an audit-only Receipt.
7. Workspace, Contract, relevant Context, source, command/oracle or verifier drift stales audit results. Stop/close execute the current Live Gate and clear the binding only on success; `abandon` removes temporary task state without touching Git or authored source/Contract.

## Contract Shape And Risk

- The Contract has `task`, `risk`, `global` and `outcomes`. Product, Technical Boundary and Acceptance remain separate logical authorities inside the one file.
- Model-authored public identifiers are only task, Outcome and Check keys. Compiler-generated internal identifiers remove the former cross-file reference namespace.
- Outcome dependencies form the acceptance readiness relation only; they do not prescribe implementation slices or parallel scheduling.
- Standard proof requires executable falsifiable checks. UI surfaces/controls require `ui_browser` proof. Strict risk triggers compiler-enforced negative, counterfactual, population, security, environment and rollback/recovery obligations as applicable.
- Actual changed paths outside declared expected/support paths, or a newly touched undeclared Context owner/boundary, return `scope_or_risk_escalation_required`; the current Goal revises and recompiles the Contract.

## Safety And Storage Boundaries

- Contract parsing rejects unknown keys, duplicate keys, YAML aliases/merges/tags and multiple documents.
- Paths are repository-relative and realpath-contained. Matching, subset and overlap/disjoint use one restricted repository-pattern AST; unsupported bracket/brace/extglob/non-segment-`**` syntax is rejected, and unproved subset/disjoint relationships fail closed. Protected Contract, fragment, Source, Context, runner, verification-input, Counterfactual-fixture and package-verifier files reject symlinks and detectable hardlinks; the snapshot-owned read-only `node_modules` junction is the sole explicit exception.
- Commands use argv arrays with no shell, bounded output/time and a minimal environment whitelist. Only env vars explicitly declared by the current Check are additionally passed.
- Worker/Agent prose, handwritten status, command exit alone and historical targeted passes cannot create accepted authority.
- Final acceptance binds the same snapshot plus Contract, source, selected Context, runner/oracle, verifier, workdir and repository identity. History is not spliced into current proof.
- Runtime state is ordinary same-user project state, not a hostile-host security boundary. The product does not claim resistance to deliberate same-user/admin deletion, system Hook bypass or kernel compromise.
- Local mode trusts the installed package-owned verifier and Git metadata; external platforms remain responsible for network isolation.

## Distribution And Migration

- Default profiles remain `core-portable` and `workflow-default`; `long-task` is explicit.
- `sync` refreshes enabled managed assets only. Long-task enable/disable/upgrade share entry-level Hook cleanup that recognizes current and relocated package-owned absolute commands only through known managed status plus known package layout, while preserving same-group and similar-name user entries. `upgrade` owns the deterministic safe migration from package-owned `composite-codex` selection/assets to `long-task`.
- Migration never imports or executes an unfinished historical campaign and never deletes user-authored campaign/source/contract files.
- Package tarballs contain the Delivery Contract schema, Long-Task Skill/Hook/templates and Evidence Kernel, but no Campaign/AppServer/Codex-worker/SFC/Packet/Wave/worktree scheduler runtime.

## Design Rationale

- Keep platform Goal/session lifecycle and Git orchestration outside Harness because duplicating them creates recovery state without improving acceptance evidence.
- Preserve only an Evidence Kernel that closes concrete false-completion paths: strict preflight, executable assertions, current-snapshot Final Gate and exact freshness.
- Use one workspace snapshot and one Contract authority so stale or historically spliced evidence cannot silently pass.

## Constraints And Tradeoffs

- Do not restore stages, fixed plan files, Source Unit inventories, SFC graphs, Packets, Waves, integration branches, worker attempts, model routing or a second completion authority.
- Do not auto-trigger Long-Task Workflow from duration/file count/complexity.
- Do not let targeted verify accept, reuse historical results in Final Gate, or allow Skill prose to weaken compiler-enforced proof.
- Do not let `init`, `sync` or `upgrade` activate tasks or infer project semantics.
- Keep `architecture.md` concise; detailed schema and operational usage belong in code/tests/README/PROJECT_SPEC.

## Verification Implications

- Focused schema/compiler/risk tests prove preflight and deterministic routing.
- Real temporary-Git black boxes prove the one-workspace verify/final/stale/close loop and platform non-orchestration boundary.
- Source sync/check, consumer quickstart, exact tarball inspection and full package gates prove distributed-surface alignment.

## Open Risks

- Contract structure cannot prove that an author declared every real product requirement.
- Package-managed Hooks and state protect against accidental drift, not deliberate same-user/admin or system-level tampering.
- Snapshotting and complete Final Gates trade runtime cost for trustworthy current evidence; performance budgets keep that cost bounded.
