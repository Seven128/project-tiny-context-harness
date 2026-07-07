# Area Context: harness-package

## Responsibility

- Provide the `ty-context` CLI, package-managed Minimal Context assets, validators, migrations, source-sync checks and maintainer automation for user projects.
- Keep Project Tiny Context Harness focused on repo-native project memory for AI coding agents: durable Context recovery, package-managed guidance and repeatable validation paths, without restoring the old stage workflow.
- Own this source workspace's package behavior facts while delegating full design rationale to `PROJECT_SPEC.md` and high-frequency role facts to the role Context files listed below.

## User / System Contract

- `init` installs Minimal Context Harness into the current repository without deleting user files. It creates `project_context/context.toml`, default global/architecture/area Context, a default area-owned verification role Context, managed guidance, managed Skills, tools, Makefile wrappers and optional workflow assets.
- `sync` refreshes package-managed assets only. It must not generate project semantics, run the full migration registry, infer business Context, repair project-local Skills or perform whole-project rewriting.
- After a public npm package update, the default user path is `ty-context upgrade`. `sync-only` release mode allows direct `sync` only when the user explicitly wants managed-asset refresh without upgrade diagnostics.
- `upgrade` owns safe migration orchestration. It applies only known safe migrations when no `blocked` item exists, refreshes managed assets through internal `sync`, runs diagnostics and leaves semantic or user-judgment follow-up as `manual_required`.
- `validate-context` checks Context recoverability, graph metadata and fake verification-claim risks. It does not prove product behavior or replace project tests, smoke checks, CI, review or human acceptance.
- `validate-code-modularity` is separate from `validate-context`; `validate-harness` composes Context recoverability and touched-source modularity.
- `validate-plan-contract`, `validate-plan-acceptance` and `validate-superpowers-state` are separate workflow/state consistency checks. `validate-plan-acceptance` prefers canonical Superpowers state validation when `task-state.json` exists, while preserving legacy matrix/verdict validation for old workdirs. These validators reject contradictory temporary artifacts, weak-proof complete rows, missing/failed assertion-backed evidence for machine-verifiable layers, negative evidence contradictions, stale/non-current-attempt evidence, missing command-spec/run coverage, under-specified machine ACs, AC-010 summary-only bootstrap, Harness Drift Lock violations, protected baseline violations, state/derived drift and declared surface/architecture binding gaps, but they do not prove product behavior and are not part of `validate-harness`.
- `ty-context composite-long-task ...` is the public `/composite-long-task-workflow` execution-state command group. It initializes and compiles workdirs, starts attempts, records assertion command runs, registers EvidenceRecordV2 artifacts, applies slice deltas, derives generated views, runs state-backed gates, recommends next slices, freezes `workflow-protocol.md`, writes `execution-binding.md` and renders `goal-objective.txt` under `tmp/ty-context/plan-acceptance/**`; it is not part of `init`, `sync` or `upgrade`, and it must not register temporary task state in `project_context/context.toml`. `ty-context superpowers ...` may remain only as a hidden/internal alias for the same state kernel.
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
- Context graph helpers live in `packages/ty-context/src/lib/context-manifest.ts`; validator dispatch lives in `packages/ty-context/src/lib/validators.ts`; plan artifact validator helpers live in `packages/ty-context/src/lib/plan-*-validator.ts`; Superpowers state-kernel helpers live in `packages/ty-context/src/lib/superpowers-task-*.ts`.
- Context export and Source Pack generation live in `packages/ty-context/src/lib/context-export.ts`; CLI parsing for export modes lives in `packages/ty-context/src/commands/export-context.ts`.
- Source mappings live in `packages/ty-context/source-mappings.yaml`.
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
- Do not let Superpowers `task-state.json`, `events.ndjson`, slice deltas, generated derived views or evidence artifacts become durable Context, default `init`/`upgrade` assets or `context.toml` entries.
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
