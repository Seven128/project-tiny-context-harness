---
context_role: implementation-index
read_policy: on-demand
---
# Harness Package Implementation Index

## Role

This index helps future agents find implementation surfaces quickly. It is navigation Context, not behavior definition. Read it when locating CLI, sync, validator, migration, asset, Skill, test or release-tool entry points.

## CLI And Commands

- CLI entry: `packages/ty-context/src/cli.ts`.
- Command routing: `packages/ty-context/src/commands/index.ts`.
- `upgrade` command parsing: `packages/ty-context/src/commands/upgrade.ts`.
- `export-context` command behavior: `packages/ty-context/src/commands/export-context.ts`.
- `check-modularity` command parsing: `packages/ty-context/src/commands/check-modularity.ts`.
- Package source commands: `packages/ty-context/src/commands/package-source.ts`.
- Validator command wrapper: `packages/ty-context/src/commands/validate.ts`.
- Composite long-task state command wrapper: `packages/ty-context/src/commands/composite-long-task.ts`; hidden legacy alias wrapper: `packages/ty-context/src/commands/superpowers.ts`.

## Core Libraries

- Default config and harness root behavior: `packages/ty-context/src/lib/config.ts`.
- Shared constants: `packages/ty-context/src/lib/constants.ts`.
- Unsupported schema guard: `packages/ty-context/src/lib/schema-guard.ts`.
- Init behavior: `packages/ty-context/src/lib/init.ts`.
- Sync behavior: `packages/ty-context/src/lib/sync-engine.ts`.
- Upgrade orchestration: `packages/ty-context/src/lib/upgrade.ts`.
- Migration registry and migration application: `packages/ty-context/src/lib/migrations.ts`.
- Context manifest helpers: `packages/ty-context/src/lib/context-manifest.ts`.
- Validator dispatch: `packages/ty-context/src/lib/validators.ts`.
- Plan contract validator: `packages/ty-context/src/lib/plan-contract-validator.ts`.
- Plan acceptance validator: `packages/ty-context/src/lib/plan-acceptance-validator.ts`.
- Shared plan validator helpers: `packages/ty-context/src/lib/plan-validator-common.ts` and `packages/ty-context/src/lib/plan-acceptance-json.ts`.
- Superpowers-backed composite task state kernel: `packages/ty-context/src/lib/superpowers-task-state.ts`, `packages/ty-context/src/lib/superpowers-task-fields.ts`, `packages/ty-context/src/lib/superpowers-task-state-schema.ts`, `packages/ty-context/src/lib/superpowers-task-compile.ts`, `packages/ty-context/src/lib/superpowers-task-source-compile.ts`, `packages/ty-context/src/lib/superpowers-task-compile-diagnostics.ts`, `packages/ty-context/src/lib/superpowers-task-compile-guards.ts`, `packages/ty-context/src/lib/superpowers-task-derive.ts`, `packages/ty-context/src/lib/superpowers-task-events.ts`, `packages/ty-context/src/lib/superpowers-task-validator.ts`, `packages/ty-context/src/lib/superpowers-task-conformance.ts`, `packages/ty-context/src/lib/superpowers-task-assertions.ts`, `packages/ty-context/src/lib/superpowers-task-assertion-normalizers.ts`, `packages/ty-context/src/lib/superpowers-task-status.ts`, `packages/ty-context/src/lib/superpowers-task-gates.ts`, `packages/ty-context/src/lib/superpowers-task-next-slices.ts` and `packages/ty-context/src/lib/composite-long-task-renderer.ts`.
- Modularity/source-file checks: `packages/ty-context/src/lib/modularity.ts` and `packages/ty-context/src/lib/source-files.ts`.
- Context export implementation: `packages/ty-context/src/lib/context-export.ts`.

## Managed Assets And Skills

- Managed source assets: `.codex/ty-context-managed/**`.
- Package assets shipped to consumers: `packages/ty-context/assets/**`.
- Source-to-package mapping: `packages/ty-context/source-mappings.yaml`.
- Source workspace generated/default Skills: `.codex/skills/context_*`, `.codex/skills/context_full_project_export`, `.codex/skills/context_harness_upgrade`, `.codex/skills/normal-long-task`, `.codex/skills/composite-long-task-workflow`.
- Source-workspace-only authoring Skill: `.codex/skills/authoring/harness_package_design/SKILL.md`.

## Tests

- Orientation/recovery surface: `tests/ty-context/orientation-fast-path.test.mjs`.
- Validator behavior: `tests/ty-context/validators.test.mjs`.
- Plan artifact validator behavior: `tests/ty-context/plan-validators.test.mjs`.
- Superpowers-backed composite state kernel behavior: `tests/ty-context/composite-long-task-state.test.mjs`, `tests/ty-context/superpowers-task-compile-strict.test.mjs`, `tests/ty-context/superpowers-task-compile-guards.test.mjs`, `tests/ty-context/superpowers-task-derive.test.mjs`, `tests/ty-context/superpowers-task-validator.test.mjs`, `tests/ty-context/composite-long-task-assertion-gate.test.mjs` and `tests/ty-context/composite-long-task-expanded-assertion-gate.test.mjs`.
- Init/sync/doctor behavior: `tests/ty-context/sync-init-doctor.test.mjs`.
- Upgrade behavior: `tests/ty-context/upgrade.test.mjs` and `tests/ty-context/legacy-upgrade.test.mjs`.
- Package source drift: `tests/ty-context/package-source.test.mjs`.
- Context export: `tests/ty-context/export-context.test.mjs`.
- Surface Contract workflow: `tests/ty-context/surface-contract-workflow.test.mjs`.
- Modularity checks: `tests/ty-context/check-modularity.test.mjs` and `tests/ty-context/modularity-guidance.test.mjs`.
- Ordinary long-task Skill behavior: `tests/ty-context/plan-acceptance-skill.test.mjs`.
- Composite long-task workflow Skill and renderer behavior: `tests/ty-context/composite-long-task-workflow-skill.test.mjs`, `tests/ty-context/composite-long-task-goal-renderer.test.mjs`, `tests/ty-context/composite-long-task-protocol-snapshot.test.mjs` and `tests/ty-context/composite-long-task-execution-binding.test.mjs`. These tests own the package-managed Expected Runtime Effect / `预期实现效果` wording, explicit fusion order, hallucination guard, runtime protocol snapshot and thin Goal objective contract. Maintenance placement for README, Context and test surfaces belongs in this implementation index and related docs/tests, not in the per-task runtime protocol.

## Release And Maintainer Tools

- Release version surface sync: `tools/sync_release_version.mjs`.
- Release preparation: `tools/release_prepare.mjs`.
- Release publication: `tools/release_publish.mjs`.
- Legacy npm release compatibility wrapper: `tools/release_npm.mjs`.
- GitHub release publishing: `tools/github_release_publish.mjs`.
- Launch readiness checks: `tools/launch_readiness_check.mjs`.
- Quickstart smoke: `tools/quickstart_smoke.mjs`.
- Consumer lab: `tools/consumer_lab_full_test.mjs`.

## Documentation Surfaces

- Full source-workspace design explanation: `PROJECT_SPEC.md`.
- Root user-facing package README: `README.md`.
- Package README: `packages/ty-context/README.md`.
- Source workspace Context: `project_context/**`.
