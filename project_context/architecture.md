# Architecture Context

This file is the restrained architecture context for the source repository. It is not a full architecture document; keep only durable structure that helps a fresh agent recover system shape quickly.

## System Boundary

- The repository owns the `project-tiny-context-harness` npm package and `ty-context` CLI, package-managed Minimal Context assets, source-sync checks, validators, release automation and delivery benchmark skeleton.
- Consumer projects receive Minimal Context guidance, templates, Skills, Makefile include, validator tool and optional GitHub workflow assets.
- Product quality remains outside Harness ownership and belongs to each project’s tests, CI, smoke checks, hidden probes or human acceptance.

## Component Map

- CLI command layer: `packages/ty-context/src/commands/**`.
- Package behavior libraries: `packages/ty-context/src/lib/**`.
- Managed source assets: `.codex/ty-context-managed/**`.
- Packaged canonical assets: `packages/ty-context/assets/**`, generated from source mappings.
- Source workspace Context: `project_context/**`.
- Composite Campaign V4 orchestration plane: an explicitly invoked, Git-trackable, user-owned campaign containing the immutable discussed source plan, complete source coverage, stable Scope Fit V3 SFC DAG and global constraints, immutable V3 structured-authoring revisions, deterministic schedule revisions, Goal/worktree/merge identities, Slice receipts and verifier-derived integration/final results. It is explicit project data, not a package-managed asset or default lifecycle/plan-state surface. The orchestrator owns the one authoritative graph and scheduling interpretation; Slice Goals never reinterpret the source plan or mutate campaign authority.
- Composite execution plane: every serial or parallel SFC runs through the same isolated Git worktree path and existing Contract V3 executor. Ordinary per-worktree state stores the active compiled-contract identity, verifier-owned findings, latest Slice final result and matching project/worktree-Git result receipts. The compiled identity binds the three inputs, registered Context, oracle/verifier identities, exact package-managed Hook, workdir and complete V3 graph; the receipt-bound final result additionally binds the current worktree snapshot. New activation invalidates an old final before binding. This plane prevents accidental or model-driven drift in the normal CLI/Hook path, but it is not privileged Host authority and does not claim resistance to a malicious same-user or administrator rewriting every ordinary state copy.
- Delivery benchmark skeleton: `examples/delivery-benchmark/**`.

## Data / Control Flow

- `init` creates `project_context/global.md`, `project_context/architecture.md`, `project_context/areas/main.md`, `project_context/areas/main/verification.md`, then runs `sync`.
- `init` also creates `project_context/context.toml`, declaring the default `main` product/domain area and its default `verification` role context for ordinary projects.
- CLI write commands check the configured schema major before writing; unsupported future schemas fail fast with the canonical package-qualified `npx` command hint.
- `upgrade` migrates legacy `project_context/modules/**/*.md` files into `project_context/areas/**/*.md`, creates missing `project_context/context.toml` by registering area Context files, and only rewrites legacy module paths in manifest/global references.
- `sync` reads `packages/ty-context/assets/**` and writes managed guidance, templates, tools and Skills into the configured harness root.
- Skill customization uses separate project-local Skills such as `<harnessRoot>/skills/product_plan/SKILL.md`, `<harnessRoot>/skills/uiux_design/SKILL.md` and `<harnessRoot>/skills/development_engineer/SKILL.md`; `sync` overwrites package-managed default `context_*` Skills and leaves those separate local Skills untouched. Project-local Skill front matter `description` trigger keywords are expected to stay aligned with the default Skill trigger intent and the project `AGENTS.md` role-trigger rule.
- `package sync-source` copies source workspace assets into `packages/ty-context/assets/**`; `package check-source` verifies no drift.
- `validate-context` checks Context recoverability, validates graph metadata, treats non-area roles as semantic labels, and rejects fake verification-result claims.
- `validate-code-modularity` checks touched handwritten source modularity separately from Context recoverability; `validate-harness` composes both gates.
- `validate-plan-contract` checks temporary `plan.md` workflow-contract surfaces for internal consistency, referenced path existence and declared Context-to-Implementation binding. `validate-plan-acceptance` remains an ordinary long-task matrix/verdict consistency check only. Composite Contract V3 owns integrity and acceptance through its compiler, active verifier, final gate and Stop checker rather than a generic state validator.
- `ty-context composite-long-task ...` remains the explicit temporary Slice executor for `/composite-long-task-workflow`. `init` creates V3 source templates; `compile` freezes the first active contract in ordinary per-worktree state and is idempotent only for the same contract and workdir; a changed contract or workdir in that worktree fails with `active_contract_changed`. `verify` runs affected frozen specs and writes repair-only `needs_work` findings; `status` renders current machine state; `final-gate` reruns every in-scope AC against the current worktree and recomputes Obligation, PI and Requirement results; `stop-check` applies the same final-result freshness rules; `render-goal` produces a thin recovery objective.
- Composite runtime is separated into focused components: V3 machine schemas/parser/graph compiler; actual-only Observation V2/operator/population evaluators; binding/proof/entity projectors; obligation-sensitive counterfactual runner; oracle/verifier identity checks; active-contract storage; verifier; bottom-up final gate; workspace freshness; Stop adapter. These components use ordinary project/user permissions and do not require a Rust Helper, OS sandbox, administrator registry, Credential Manager or external audit runner.
- `/prepare-composite-long-task` is the explicit upstream Campaign V4 capability, not an extension or replacement of the strict Slice executor. Explicit invocation authorizes the complete prepare-and-execute loop: preserve the discussed plan and complete source coverage, publish one stable Scope Fit V3 DAG, author immutable packets for the current dependency-ready frontier, require binding/proof/counterfactual/oracle-ready preflight, compute conservative waves, create all wave worktrees/Goal objectives before waiting, integrate accepted Slices, repair ordinary conflicts/regressions, and continue until the target branch is finalized or a genuine semantic/external blocker remains.
- Preparation and execution remain separate authorities inside one orchestrated loop. Immutable sanitized source-plan provenance outranks campaign coordination and append-only audit history; the full graph is authoritative; `authoring-packet.json` is the only editable authoring source for an SFC revision; and rendered V3 YAML is its deterministic projection. Downstream packets are authored only when their dependencies are integration-verified so they use current Context/code. Each Goal executes one frozen Slice through Contract V3 and cannot modify the graph, other packets, integration branch or campaign completion state.
- Campaign scheduling requires positive independence evidence. Dependency/produced-consumed-contract edges, overlapping implementation or verification paths, shared API/schema/route/runtime/state-machine keys, shared durable Context ownership or non-isolatable resource locks force different waves; unknown conflicts default to serial. Stable priority/stable-key/SFC ordering makes scheduler choices deterministic and never turns ordinary ties into user decisions.
- One accepted Slice final result is not Campaign completion. Every wave is merged in stable Slice order to one Integration Branch and passes an impact-aware Integration Gate. After all SFCs integrate, Campaign Final Gate recompiles and reruns every Slice contract, global constraint and source-coverage rule against one final integration snapshot. Only that derived result, followed by target-branch resynchronization, revalidation and successful merge/push-or-PR transition, may yield Campaign `accepted`.
- The Integration Branch and all Slice/repair branches use independent worktrees from a frozen wave base. Ordinary Git conflicts and integration regressions produce machine repair actions/Goals; only semantically contradictory requirements, unavailable credentials/MFA/permission/approval or an unautomatable protected-branch rule become blockers. Active binding and final receipts resolve the current worktree Git directory rather than assuming `.git` is a directory.
- Campaign writes fail before mutation on unsupported schema majors, unsafe or escaping paths, redaction violations, immutable revision changes, oversize content or optimistic-concurrency conflicts. `init`, `sync` and `upgrade` install or refresh package capability only; they never create, discover, migrate or scan user campaigns.

## Design Rationale

- Minimal Context keeps only durable facts that improve recovery, iteration, debug and requirements changes.
- Architecture deserves one small shared file because system boundaries and component relationships are cross-module facts that code alone can make slow to recover.
- Context graph support is metadata-first: it improves read targeting and validation without turning Harness into a monorepo dependency analyzer or import/path scanner.
- Prompt guidance, Context recoverability validation, composite contract/verifier/final/Stop enforcement, source-sync drift checks and code modularity checks stay separate because each can only prove a different thing: expected agent behavior, recoverable Context shape, declared product acceptance on one snapshot, generated asset consistency or touched-source maintainability risk.
- Legacy stage semantic migration support has been removed now that users have completed migration; Schema v4 upgrade migrations remain safe and narrow.
- Keeping tracked authoring/provenance separate from temporary execution preserves durable source authority without restoring lifecycle state. Keeping the three rendered inputs preserves the intent/obligation/acceptance authority split while Contract V3 replaces V2 and the old state/evidence runtime completely. Before stable release, ordinary user/project state plus hash and freshness checks are the deliberate boundary: they prevent workflow drift without claiming to be a Host trust root.
- A single worktree-based execution topology keeps serial and parallel SFCs on the same Git, Goal, receipt, merge and recovery path. Positive-evidence scheduling is deliberately conservative because an unnecessary serial wave costs time, while an unsafe parallel wave can invalidate contracts or source coverage. Slice, Wave and Campaign gates remain separate because each proves a different snapshot boundary and historical Slice acceptance cannot prove the merged state.
- A clean-start campaign model is safer than importing historical attachments, partial bundles or old workdirs whose authority and schema cannot be proven; complete legacy three-input bundles already have a compatible strict execution route.

## Constraints And Tradeoffs

- Do not restore lifecycle phases, plan state, stage Skills, work-product trees or phase gates as default package behavior.
- Do not let `sync` perform semantic project rewriting; it refreshes managed assets only.
- Do not let `init`, `sync` or `upgrade` create, scan, import, mutate or delete user-owned composite campaigns.
- Do not retain a V2 source/Observation V1 reader, Superpowers namespace, hidden compatibility alias, Markdown parser, task-state/evidence reader, dual runtime or old-workdir importer for composite Contract V3.
- Do not accept Oracle-signed status or let a post-compile change to the three inputs, registered Context, oracle/verifier identity or workdir reuse an old contract or final result.
- Do not describe project/user-level active state or the Stop Hook as protection against intentional same-user deletion, administrator/Registry/Credential Manager attacks, system-level Hook bypass or kernel/sandbox escape.
- Do not make Rust Host Helpers, administrator installation, AppContainer/WFP/complex ACL policy, external audit runners, real-consumer release labs or cross-platform release matrices prerequisites for the pre-stable Composite core.
- Do not store raw command logs, Oracle payloads, mutable verifier evidence or active compiled-contract workdirs in tracked campaigns. V4 may retain Goal/worktree/commit identities, immutable receipt hashes, schedule revisions and verifier-derived integration/final results needed for recovery, but a Goal cannot hand-write status and Campaign state cannot override a current Slice, Wave or Campaign gate.
- Keep product/design/development Skill customization project-local through separate Skills, not package-managed default Skill edits or override merging.
- Keep `architecture.md` concise; implementation details belong in code, tests, owner area Context, or verification/deployment role Context only when not obvious and useful for future repeat execution.

## Verification Implications

- `npm test` and `npm test --workspace project-tiny-context-harness` remain explicit maintainer full-suite gates.
- `npm run test:composite-workflow:built --workspace project-tiny-context-harness` is the focused Campaign V4 E2E/mechanism profile. It runs only through explicit maintainer invocation, never from Package CI, trusted publication or consumer Harness gates.
- `node packages/ty-context/dist/cli.js package sync-source`
- `node packages/ty-context/dist/cli.js package check-source`
- `make validate-harness`
- `git diff --check`

## Open Risks

- Context files can become too broad if architecture notes duplicate code or release history.
- Package assets can drift if source mappings are changed without sync/check.
