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
- Default Context authoring Skills write durable conclusions to `project_context/**` or `DESIGN.md`. They must stay Minimal Context oriented and must not recreate PRD / UX / tech-plan / review / test / release document chains.
- Product Surface Contract workflow is prompt-level and project-owned. It uses existing Context roles such as `contract`, `area`, `subdomain`, `verification`, `decision-rationale` and `implementation-index`; the package must not add a surface-specific Context role or infer business surface contracts during `init`/`upgrade`.
- Public package surfaces are English-complete. Non-English trigger examples are additive compatibility only.
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
- Context graph helpers live in `packages/ty-context/src/lib/context-manifest.ts`; validator behavior lives in `packages/ty-context/src/lib/validators.ts`.
- Source mappings live in `packages/ty-context/source-mappings.yaml`.
- Managed source assets live in `.codex/ty-context-managed/**`; packaged consumer assets live in `packages/ty-context/assets/**`.
- Maintainer release/version automation lives in `tools/sync_release_version.mjs`, `tools/release_npm.mjs` and `tools/github_release_publish.mjs`.

## Key Constraints

- Do not restore lifecycle phases, plan state, stage Skills, phase gates, `.work_products/**` or thick default document chains.
- Do not put authoring-only Skills under `.codex/skills/authoring/**` into package assets.
- Do not edit package-managed default Skills directly for project-specific rules; create separate project-local Skills when customization is needed.
- Do not turn Context-first guidance, page product-positioning checks, role placement scans, Task Contracts or Product Surface Contracts into validators or edit-order gates.
- Do not make Context graph roles mandatory writing templates for ordinary projects. Roles are semantic reading/authoring labels; graph boundary rules are metadata validation only.
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
