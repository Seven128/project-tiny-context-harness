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
- Composite long-task V2 command wrapper: `packages/ty-context/src/commands/composite-long-task.ts`. There is no legacy command alias.
- Composite campaign preparation command wrapper: `packages/ty-context/src/commands/composite-campaign.ts`.

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
- Composite V2 contract core: `packages/ty-context/src/lib/long-task-contract-schema.ts`, `long-task-contract-parser.ts`, `long-task-contract-coverage.ts`, `long-task-contract-compiler.ts` and `long-task-path-policy.ts` own strict YAML parsing, complete graph coverage and source/Context/oracle/verifier freezing.
- Composite V2 verifier core: `long-task-snapshot.ts`, `long-task-command-runner.ts`, `long-task-artifact-collector.ts`, `long-task-assertion-evaluator.ts`, `long-task-negative-evidence.ts`, `long-task-run-result.ts` and `long-task-verifier.ts` own isolated observation. `long-task-impact.ts`, `long-task-status.ts`, `long-task-goal.ts`, `long-task-final-gate.ts`, `long-task-external-blocker.ts`, `long-task-active-task.ts`, `long-task-hook-install.ts`, `long-task-hook-preflight.ts` and `long-task-stop-check.ts` own repair guidance and completion enforcement.
- The old state/evidence/slice/derived modules and `composite-long-task-renderer.ts` are absent and must not be restored.
- Composite campaign authoring core: `composite-campaign-v2.ts` owns the no-compatibility V2 campaign/packet schema, immutable revision hashes, strict input loading, deterministic YAML projection, oracle-ready preflight, Goal-free handoff and fresh-final-result-only projection.
- Modularity/source-file checks: `packages/ty-context/src/lib/modularity.ts` and `packages/ty-context/src/lib/source-files.ts`.
- Context export implementation: `packages/ty-context/src/lib/context-export.ts`.

## Managed Assets And Skills

- Managed source assets: `.codex/ty-context-managed/**`.
- Package assets shipped to consumers: `packages/ty-context/assets/**`.
- Source-to-package mapping: `packages/ty-context/source-mappings.yaml`.
- Source workspace generated/default Skills: `.codex/skills/context_*`, `.codex/skills/context_full_project_export`, `.codex/skills/context_harness_upgrade`, `.codex/skills/normal-long-task`, `.codex/skills/prepare-composite-long-task`, `.codex/skills/composite-long-task-workflow`.
- Source-workspace-only authoring Skill: `.codex/skills/authoring/harness_package_design/SKILL.md`.

## Tests

- Orientation/recovery surface: `tests/ty-context/orientation-fast-path.test.mjs`.
- Validator behavior: `tests/ty-context/validators.test.mjs`.
- Plan artifact validator behavior: `tests/ty-context/plan-validators.test.mjs`.
- Composite V2 behavior: `tests/ty-context/long-task-contract-*.test.mjs`, `long-task-snapshot.test.mjs`, `long-task-command-trust.test.mjs`, `long-task-verifier.test.mjs`, `long-task-artifact-trust.test.mjs`, `long-task-impact.test.mjs`, `long-task-status.test.mjs`, `long-task-final-gate.test.mjs`, `composite-long-task-cli-v2.test.mjs`, `composite-long-task-hook-install.test.mjs`, `composite-long-task-hook-smoke.test.mjs`, `composite-long-task-hook-v2.test.mjs` and `composite-long-task-v2-regression.test.mjs`.
- Init/sync/doctor behavior: `tests/ty-context/sync-init-doctor.test.mjs`.
- Upgrade behavior: `tests/ty-context/upgrade.test.mjs` and `tests/ty-context/legacy-upgrade.test.mjs`.
- Package source drift: `tests/ty-context/package-source.test.mjs`.
- Context export: `tests/ty-context/export-context.test.mjs`.
- Surface Contract workflow: `tests/ty-context/surface-contract-workflow.test.mjs`.
- Modularity checks: `tests/ty-context/check-modularity.test.mjs` and `tests/ty-context/modularity-guidance.test.mjs`.
- Ordinary long-task Skill behavior: `tests/ty-context/plan-acceptance-skill.test.mjs`.
- Composite long-task Skill/Goal behavior is covered by the V2 CLI/routing/Hook regression suites; there is no runtime protocol snapshot or execution-binding artifact.
- Composite campaign and preparation Skill behavior remains in `tests/ty-context/composite-campaign-*.test.mjs` and `tests/ty-context/prepare-composite-long-task-skill.test.mjs`, updated for `CompositeAuthoringPacketV2`, YAML projection, oracle-ready handoff and current-final-result projection.

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
