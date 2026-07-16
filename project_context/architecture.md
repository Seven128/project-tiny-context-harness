# Architecture Context

This is the restrained architecture map for the Harness source repository. It records durable component and authority boundaries, not implementation narration.

## System Boundary

- The repository owns the `project-tiny-context-harness` npm package, `ty-context` CLI, Minimal Context assets, validators, source sync, explicit Long-Task Workflow capability, release automation and delivery benchmark skeleton.
- Consumer projects receive portable Minimal Context/default Workflow assets. The optional Source Plan Authoring Skill, Long-Task Workflow Skill and Codex Stop Hook are selected by the explicit `long-task` profile.
- Harness may run only safe verification commands declared in a compiled V2 Delivery Contract. Platform Goal/Turn lifecycle, agents, model routing, branches/worktrees, Git integration, PRs, CI, deployment and human acceptance remain outside the runtime.

## Component Map

- CLI routing: `packages/ty-context/src/commands/index.ts`; V2 Contract commands: `commands/long-task.ts`; Delivery Set/composite names are isolated retired tombstones.
- The sole active schema lives under `packages/ty-context/src/schemas/long-task-delivery-v2/**`; Claim, authority/progress/boundary, runner/evidence and Live Gate modules remain focused and separate.
- Authoring parser/preflight: strict YAML parsing plus Compact deterministic defaults, real Source-anchor and Source-to-Claim/Assertion coverage, generated `OUT.<outcome-key>` / `CHECK.<outcome-key>.<check-key>` identities, dependency/risk/Context/runner/path/proof diagnostics and no state mutation.
- Static compiler: canonical normalized Contract/authority/compiled identity, first-class Requirement and control-field Claims, Acceptance mapping, field-policy completeness and first-success Authority Lock.
- Evidence Kernel V2: explicit command runner, Git-aware snapshot, AC-level Playwright observations, detailed Assertion/Population/Counterfactual evaluators, per-Check evidence projection, precise findings, targeted verifier and source-recompiled same-snapshot Live Final Gate.
- Recovery state: the user-authored `delivery-contract.yaml` and optional `source.md` live in the chosen workdir; existing `outcome_files` are physical compatibility only. Progress/Receipt and the workdir compiled file are audit/cache projections only. The Git common-dir Active Authority V3 record contains the complete compiled snapshot and immutable first base, while the matching worktree config marker binds task, revision and compiled identity.
- Stop adapter is a no-op without a binding and otherwise runs the Live Final Gate fail-closed; it never trusts a stored Receipt or compiled cache.
- Capability/profile selection: `packages/ty-context/src/lib/profiles.ts`, `commands/enable.ts`, `commands/disable.ts`, config parsing and upgrade migration. The profile-managed authoring surfaces are the non-authoritative `source-plan-authoring` Skill and the authoritative-workflow `long-task-workflow` Skill.
- Managed source: `.codex/ty-context-managed/**`; packaged assets: `packages/ty-context/assets/**`; mapping authority: `packages/ty-context/source-mappings.yaml`.
- Source-workspace durable facts: `project_context/**`; full stable workflow design: `PROJECT_SPEC.md`.

## Data / Control Flow

1. `long-task init <workdir>` creates one Compact inline-Outcome `delivery-contract.yaml` template.
2. An optional upstream Source Plan may organize discussion and research into one self-contained Markdown Source with stable semantic keys, anchors, derivation provenance and unresolved decisions. It creates no Harness state or authority.
3. The Long-Task Skill continuously authors the same complete Contract from ordinary prose or Source Plan input and relevant Context; recommended Source Plan formatting is never an input gate, and Outcome boundaries are semantic rather than capacity/file/layer/Agent boundaries.
4. `preflight` parses and normalizes the Contract, aggregates Source/Claim/Assertion/risk/repository diagnostics and leaves Active Authority, marker, cache, progress, Receipt, pending revision, Git state and project runners untouched.
5. `compile` strictly compiles the normalized Contract, computes Source plus Global and Outcome Result/Requirement/control-field/non-completing/obligation/shortcut Claim Coverage and risk floor, derives canonical Product/Acceptance/Global projections, freezes repository/workdir/source/Contract/selected-Context/verifier/oracle/command identities and activates the worktree binding. It does not invoke a model or modify product code.
6. The current native Goal reads Contract and relevant Context, selects dependency-ready Outcomes as its internal Frontier, implements in the current workspace and runs project-focused tests.
7. `verify --outcome/--check` runs the selected checks on a current snapshot and stores repair-only derived status only after re-reading the active task/revision/compiled/worktree identity; a concurrent revision returns `active_authority_changed_during_verify` and writes no progress.
8. Contract `status` projects `unverified|progress_passing|progress_failing|progress_stale|blocked_external`; resume is read-only and starts no execution.
9. `final-gate`, Stop and close recompile source authority, validate the common-dir record/config marker, create one Git-tree snapshot, rerun every global/Outcome Check, deduplicate only identical raw execution inside that Gate, then re-read active identity before writing the audit-only result. Stop/close use accepted-identity CAS clear and cannot remove a newer revision.
10. Workspace, Contract, relevant Context, source, command/oracle or verifier drift stales audit results. Stop/close execute the current Live Gate and clear the binding only on success; `abandon` removes temporary task state without touching Git or authored source/Contract.

## Contract Shape And Risk

- The Contract has `task`, `source_claims`, `risk`, `global` and `outcomes`. Product, Technical Boundary and Acceptance remain separate logical authorities inside the one file.
- Model-authored public identifiers are only task, Outcome and Check keys. Compiler-generated internal identifiers remove the former cross-file reference namespace.
- Outcome dependencies form the acceptance readiness relation only; they do not prescribe implementation slices or parallel scheduling. Requirements are atomic Product Claims; control location is a `ui_browser` Claim; named Assertions preserve Source AC identity.
- Standard proof requires executable falsifiable checks. UI surfaces/controls and placement require `ui_browser` proof. Distinct Assertions in one Check cannot share an Observation. Strict risk triggers compiler-enforced negative, counterfactual, population, security, environment and rollback/recovery obligations as applicable.
- Actual changed paths outside declared expected/support paths, or a newly touched undeclared Context owner/boundary, return a `scope_escape` Finding; the current Goal reviews risk/ownership, revises and recompiles the Contract.

## Safety And Storage Boundaries

- Contract parsing rejects unknown keys, duplicate keys, YAML aliases/merges/tags and multiple documents.
- Paths are repository-relative and realpath-contained. Exact paths and patterns share one canonical segment grammar before Contract hashing: Windows separators and one leading `./` normalize to `/`; internal `.`/`..`, NUL/CR/LF/Tab, empty segments, absolute/drive/UNC paths and unsupported wildcard syntax are rejected. Matching, subset and overlap/disjoint use the same restricted AST. Protected Contract, fragment, Source, Context, runner, verification-input, Counterfactual-fixture and package-verifier files reject symlinks and detectable hardlinks; the snapshot-owned read-only `node_modules` junction is the sole explicit exception.
- Commands use argv arrays with no shell, bounded output/time and a minimal environment whitelist. Only env vars explicitly declared by the current Check are additionally passed.
- Worker/Agent prose, handwritten status, command exit alone and historical targeted passes cannot create accepted authority.
- Raw command reuse binds frozen runner identity plus canonical declared Environment Requirements, never actual env values. AC-level observations, artifacts and Assertions remain per-Check evidence even when a Raw Execution is shared.
- Final acceptance binds the same snapshot plus Contract, source, selected Context, runner/oracle, verifier content/runtime locator, workdir and repository identity. History is not spliced into current proof.
- Runtime state is ordinary same-user project state, not a hostile-host security boundary. The product does not claim resistance to deliberate same-user/admin deletion, system Hook bypass or kernel compromise.
- Local mode trusts the installed package-owned verifier and Git metadata; external platforms remain responsible for network isolation.
- `abandon --force-corrupt-state` is the only stale-lock/invalid-record/marker-mismatch continuity cleanup. It derives record, marker and lock paths from the current repository/worktree, requires a repository-contained supplied workdir and removes only active state plus that workdir's `.ty-context/**`.

## Distribution And Migration

- Default profiles remain `core-portable` and `workflow-default`; `long-task` is explicit and owns both optional Source Plan authoring and the Long-Task execution Skill.
- `sync` refreshes enabled managed assets only. Long-task enable/disable/upgrade share entry-level Hook cleanup that recognizes current and relocated package-owned absolute commands only through known managed status plus known package layout, while preserving same-group and similar-name user entries. `upgrade` owns the deterministic safe migration from package-owned `composite-codex` selection/assets to `long-task`.
- Migration never imports or executes an unfinished historical campaign and never deletes user-authored campaign/source/contract files.
- Package tarballs contain the Delivery Contract schema, Long-Task Skill/Hook/templates and Evidence Kernel, but no Campaign/AppServer/Codex-worker/SFC/Packet/Wave/worktree scheduler runtime.

## Design Rationale

- Keep platform Goal/session lifecycle and Git orchestration outside Harness because duplicating them creates recovery state without improving acceptance evidence.
- Preserve only an Evidence Kernel that closes concrete false-completion paths: strict preflight, executable assertions, current-snapshot Final Gate and exact freshness.
- Use one workspace snapshot and one Contract authority so stale or historically spliced evidence cannot silently pass.

## Constraints And Tradeoffs

- Do not restore stages, fixed plan files, Source Unit inventories, SFC graphs, Packets, Waves, integration branches, worker attempts, model routing, top-level Contract splitting or a second completion authority.
- Do not introduce a separate Contract Authoring Skill, Authoring receipt/state, Coverage authority, execution registry, runner/proof recipe, YAML alias or capacity-based Outcome fragmentation.
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
