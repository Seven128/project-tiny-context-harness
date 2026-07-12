# Area Context: harness-package

## Responsibility

- Provide the `ty-context` CLI, package-managed Minimal Context assets, validators, migrations, source-sync checks and maintainer automation for user projects.
- Keep Project Tiny Context Harness focused on repo-native project memory for AI coding agents: durable Context recovery, package-managed guidance and repeatable validation paths, without restoring the old stage workflow.
- Provide explicitly invoked composite preparation and strict Contract V3 execution capabilities that keep campaign authoring/provenance separate from temporary verifier runs and make accepted delivery depend on a complete immutable contract, Harness-owned observations/projections, obligation-sensitive counterfactuals, one final snapshot, workspace-external Host authority, managed-only Codex Stop enforcement and independent external audit rather than model prose.
- Own this source workspace's package behavior facts while delegating full design rationale to `PROJECT_SPEC.md` and high-frequency role facts to the role Context files listed below.

## User / System Contract

- `init` installs Minimal Context Harness into the current repository without deleting user files. It creates `project_context/context.toml`, default global/architecture/area Context, a default area-owned verification role Context, managed guidance, managed Skills, tools, Makefile wrappers and optional workflow assets.
- `sync` refreshes package-managed assets only. It must not generate project semantics, run the full migration registry, infer business Context, repair project-local Skills or perform whole-project rewriting.
- After a public npm package update, the default user path is `ty-context upgrade`. `sync-only` release mode allows direct `sync` only when the user explicitly wants managed-asset refresh without upgrade diagnostics.
- `upgrade` owns safe migration orchestration. It applies only known safe migrations when no `blocked` item exists, refreshes managed assets through internal `sync`, runs diagnostics and leaves semantic or user-judgment follow-up as `manual_required`.
- `validate-context` checks Context recoverability, graph metadata and fake verification-claim risks. It does not prove product behavior or replace project tests, smoke checks, CI, review or human acceptance.
- `validate-code-modularity` is separate from `validate-context`; `validate-harness` composes Context recoverability and touched-source modularity.
- `validate-plan-contract` and ordinary `validate-plan-acceptance` remain separate temporary-artifact consistency checks and are not product proof. Composite Contract V3 has no generic task-state validator: trusted compile/verify/final-gate/Host Stop own its contract, actual observations and completion decision.
- `ty-context composite-long-task ...` is the public strict executor with only `init`, `compile`, `verify`, `status`, `final-gate`, `stop-check` and `render-goal`. It accepts only the three V3 YAML authorities, asks the Host Helper to seal the complete graph and Node Oracle closures, runs exact frozen specs in real dependency/OS sandboxes, evaluates actual-only observations, writes repair findings to current status, recomputes all real/counterfactual proof on one final snapshot, durably signs `final-result.json`, and allows Codex completion only through the managed-only Stop Hook. The agent cannot submit a command, evidence artifact, observation result, blocker classification, binding/AC/PI/Requirement state or closed proof layer.
- `ty-context host-gate install|uninstall` is the separate administrator-only lifecycle surface for the signed Host Gate release; it is not a Composite runtime or registry-admin surface. Install accepts the official platform archive or an already extracted release, safely rejects archive traversal/link/special-entry attacks, verifies the embedded root key and signed platform/architecture manifest before copying anything, atomically installs managed assets/policy/service and requires an explicit absolute Codex launcher identity. Uninstall refuses while any active sealed registry exists and never exposes close/reset/key-rotation/recovery through the project CLI; those operations remain exclusive to the separately installed interactive `ty-context-host-admin` binary.
- Independent audit candidate jobs consume a byte-identified, platform-specific Host release that was signed before candidate execution. They never receive the Host release root private key; the independently pinned audit package safely extracts and verifies the archive, root key, target manifest and every file before the candidate Host is started. Candidate-controlled build, CLI and Hook processes execute only as a disposable non-administrator OS identity with an allowlisted environment; audit code/install, Host release, provisional key and result locations are read-only or inaccessible to that identity, candidate-owned trees are resealed after trusted checks, and residual same-identity processes are killed before the next evidence phase. Durable external-result signing remains a later isolated job that never runs candidate code.
- `/prepare-composite-long-task` is the explicit upstream path for a raw requirement that needs multi-SFC composite preparation. It records Scope Fit with stable non-renumbering SFC identifiers, selects only a unique dependency-ready candidate automatically, authors only the current SFC as `CompositeAuthoringPacketV3`, renders strict Product / Architecture Source, Technical Realization Plan and Acceptance Checklist V3 YAML deterministically, and requires complete graph/binding/proof/counterfactual/oracle preflight without creating runtime proof.
- Preparation ends at `handoff_ready`. Handoff freezes packet/projection/oracle identity and never creates a Goal; explicit start creates an idempotent one-Goal/one-SFC binding. Goal execution rereads current Context/code and resolves any candidate Context Delta before implementation. `record-result` only mirrors a matching current `final-result.json` identity and cannot promote status prose or intermediate verifier runs into completion.
- Campaign request, coordination, audit and packet revisions are Git-trackable user-owned authoring/provenance. Scope Fit V3 uses stable `SFC-###` components through `sfcs`, `sfc_id`, `selected_sfc_id` and CLI `--sfc`; old slice fields/options and Scope Fit V2 are rejected without aliases. Compiled mirrors, command runs, artifacts, status and final results remain under `tmp`; Host-written status/final/trace views are durably committed and user-readable, and the privileged service returns only the validated workdir output tree and its Host-created repo mirror to the authenticated peer identity. Mutation or replacement never changes Host authority and is rejected on the next read/Stop; Host Managed State ownership is never delegated. Active authority/bundles/layers/attestations live in Host Managed State; V3 has no aggregate campaign product-completion state. Unknown schema majors fail fast, and `init`, `sync` and `upgrade` never create, scan or migrate campaigns. V2/Observation V1/Markdown campaigns and workdirs are unsupported and receive no compatibility reader or migration.
- Campaign behavior must require in-root paths and reject path traversal or symlink escapes, Windows reserved names, secrets or raw credentials, oversized tracked files/events, mutation of immutable revisions and stale optimistic-concurrency snapshots before partial writes. A material sanitized-request hash change starts a new campaign rather than rewriting provenance.
- `export-context` keeps legacy `--full`, `--code` and `--all` as temporary single-artifact fallback exports, while Source Pack modes (`--code-index`, `--source-pack`, `--code-bundles`, `--task-context`) produce deterministic temporary artifacts for external LLM upload under `tmp/ty-context/context-exports/**`.
- Source Pack and task-context exports are script-first and bounded: standard packs and task packs must not exceed five output files, must label inferred path/context groupings as export routing only, must not run project verification commands, must not register generated artifacts in `project_context/context.toml`, and must keep only the current `tmp/ty-context/context-exports/latest/` export round by default.
- Secret redaction and safety exclusions apply across export indexes, bundles, task context artifacts and manifests; package behavior must not expose an option that disables secret redaction.
- Default Context authoring Skills write durable conclusions to `project_context/**` or `DESIGN.md`. They must stay Minimal Context oriented and must not recreate PRD / UX / tech-plan / review / test / release document chains.
- Product Surface Contract workflow is prompt-level and project-owned. It uses existing Context roles such as `contract`, `area`, `subdomain`, `verification`, `decision-rationale` and `implementation-index`; the package must not add a surface-specific Context role or infer business surface contracts during `init`/`upgrade`.
- Public package surfaces are English-complete. Non-English trigger examples are additive compatibility only.
- The public package runtime floor is Node.js `>=24`; maintainer CI and npm publishing workflows use Node 24 as the supported execution line.
- `PROJECT_SPEC.md` remains the full source-workspace design-spec and historical rationale surface. It is not a consumer default asset and should not be copied wholesale into Context.

## Role Context Map

- [Context Model](harness-package/foundation/context-model.md): foundation Context for Context types, durable facts, fact-source authority, role placement and Context/code/evidence priority.
- [Workflow Contract](harness-package/contracts/workflow-contract.md): contract Context for Context Priority Ladder, `Context Delta`, Task Contract, temporary `plan.md`, target-mode local audit and Contract Conformance boundaries.
- [Package-Managed Surface Contract](harness-package/contracts/package-managed-surfaces.md): contract Context for `.codex/ty-context-managed/**`, `.codex/skills/**`, `packages/ty-context/assets/**`, `.codex/skills/authoring/**`, README surfaces and source sync boundaries.
- [Minimal Context Rationale](harness-package/decision-rationale/minimal-context.md): on-demand rationale for why Minimal Context replaced the old stage workflow and why phase gates, thick docs and validator-driven workflow are not restored by default.
- [Implementation Index](harness-package/implementation-index.md): on-demand code/test/tool navigation for CLI, sync, validators, migrations, assets, Skills, tests and release tools.
- [Verification](harness-package/verification.md): default-read repeatable verification paths for this source workspace.

## Core Data / API / State

- CLI command routing lives in `packages/ty-context/src/commands/index.ts`.
- Init behavior lives in `packages/ty-context/src/lib/init.ts`.
- Sync behavior and direct asset-refresh safety blockers live in `packages/ty-context/src/lib/sync-engine.ts`.
- Upgrade orchestration and migration status handling live in `packages/ty-context/src/lib/upgrade.ts` and `packages/ty-context/src/lib/migrations.ts`.
- Context graph helpers live in `packages/ty-context/src/lib/context-manifest.ts`; validator dispatch lives in `packages/ty-context/src/lib/validators.ts`; plan artifact validator helpers live in `packages/ty-context/src/lib/plan-*-validator.ts`. Composite Contract V3 is split across V3 schema/graph compiler, Observation/operator/population evaluators, binding/counterfactual/entity projectors, Oracle bundle policy, dependency/browser/sandbox/secret adapters, snapshot/artifact trust, trusted probes, Host RPC client, fixed final orchestrator and Stop client; the Rust Host Helper owns registry/attestation/journal/cache/managed-Hook enforcement. The old state/evidence/slice/derived runtime remains removed.
- Context export and Source Pack generation live in `packages/ty-context/src/lib/context-export.ts`; CLI parsing for export modes lives in `packages/ty-context/src/commands/export-context.ts`.
- Source mappings live in `packages/ty-context/source-mappings.yaml`.
- Composite preparation's durable data contract is request provenance -> campaign coordination plus append-only audit -> immutable `CompositeAuthoringPacketV3` revisions -> deterministic V3 YAML projections -> frozen packet/projection/oracle handoff. After explicit start, the Host-sealed contract/registry, verifier-owned runs and the current signed full final gate retain execution and SFC completion authority; workdir files are mirrors/views only.
- Managed source assets live in `.codex/ty-context-managed/**`; packaged consumer assets live in `packages/ty-context/assets/**`.
- Maintainer release/version automation is split into preparation and publication. Release preparation owns version bumps, release-surface sync, package asset sync and local validation before commit; release publication owns only already-committed version publication, registry verification, tag/GitHub Release handling and optional registry smoke.
- Release preparation has a full gate and a fast gate. The fast gate is for ordinary docs, managed Skill, package asset and release metadata patch releases; it still builds, syncs/checks package assets, checks release-version surfaces, runs `upgrade --check --json`, release-focused tests and `git diff --check`, but skips the complete workspace test suite. Fast preparation is only valid for `sync-only`.
- Release preparation owns upgrade impact review before npm publication. `sync-only` must fail on upgrade-sensitive implementation, config, schema, sync/init, source-mapping or structural managed-asset changes; `upgrade-required` must have upgrade/migration implementation and upgrade test evidence; `manual-required` must produce release-packet text for the user action that remains outside automatic upgrade.
- Publishing to npm does not automatically migrate existing repositories. It publishes the current CLI code and package assets; users receive new upgrade behavior only when they run the newly published CLI through `ty-context upgrade`, `ty-context sync` or another `@latest` package invocation.
- Trusted Publishing remains the preferred npm release path. Local npm publication is an explicit fallback that must not claim Trusted Publishing provenance and must require an explicit local-fallback confirmation.
- Maintainer release/version automation lives in `tools/sync_release_version.mjs`, `tools/release_prepare.mjs`, `tools/release_publish.mjs`, compatibility wrapper `tools/release_npm.mjs` and `tools/github_release_publish.mjs`.

## Key Constraints

- Do not restore lifecycle phases, plan state, stage Skills, phase gates, `.work_products/**` or thick default document chains.
- Do not put authoring-only Skills under `.codex/skills/authoring/**` into package assets.
- Do not edit package-managed default Skills directly for project-specific rules; create separate project-local Skills when customization is needed.
- Do not turn Context-first guidance, page product-positioning checks, role placement scans, Task Contracts or Product Surface Contracts into edit-order gates. Plan validators may check temporary artifact consistency and declared binding references only.
- Do not make Context graph roles mandatory writing templates for ordinary projects. Roles are semantic reading/authoring labels; graph boundary rules are metadata validation only.
- Do not let temporary Source Pack profiles, inferred routing buckets, generated indexes or bundle summaries become durable product/architecture facts; profiles are export selectors only.
- Do not let composite compiled contracts, current/final status, run manifests, command output or artifacts become durable Context, default `init`/`upgrade` project state or `context.toml` entries.
- Do not treat tracked composite campaigns as default plan state, put runtime/evidence into them, compute aggregate campaign completion, or scan/import them from `init`, `sync` or `upgrade`.
- Do not add a legacy attachment, partial-bundle or old-workdir importer. Existing complete three-input bundles continue through the strict composite workflow.
- Do not accept V2 sources, Observation V1, Oracle status fields, repository-active authority, non-managed Hook fallback, unfrozen Oracle dependencies, source-regex security proof or candidate-owned external-audit proof in Contract V3.
- Managed Host requirements/Hook/helper are separately installed system assets. Package `sync` may distribute signed installer templates and diagnostics but must not claim to install, activate or replace the system trust root without the explicit Host installer/admin path.
- Do not let `sync` call the full migration registry or accumulate legacy compatibility checks as a permanent asset-refresh tax.
- Do not claim Minimal Context benchmark wins without fresh, high-confidence Minimal Context comparison evidence.
- Package source changes that affect managed assets require source sync and source-drift checks. Source-workspace `project_context/**`-only changes do not.

## Code Entry Points

- See [Implementation Index](harness-package/implementation-index.md) for detailed code, test, asset and tool entry points.

## Test Entry Points

- See [Verification](harness-package/verification.md) for repeatable validation paths and when to run package source sync/check.

## Open Risks

- Context files can become too broad if they duplicate `PROJECT_SPEC.md`, release history or implementation narration.
- Package assets can drift if managed source mappings change without source sync/check.
- Public package messaging can drift if README, package README, npm/release copy and Context are not updated together for behavior changes.
