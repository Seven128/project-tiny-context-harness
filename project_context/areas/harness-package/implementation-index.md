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
- Composite long-task Contract V3 command wrapper: `packages/ty-context/src/commands/composite-long-task.ts`. There is no V2/legacy command alias.
- Signed Host Gate install/uninstall command wrapper: `packages/ty-context/src/commands/host-gate.ts`; safe official archive extraction lives in `packages/ty-context/src/lib/long-task-host-release-archive.ts`, while signed release verification, atomic OS installation and active-registry-protected removal remain in the existing Host release/installer libraries.
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
- Contract V3 schema/graph core: `packages/ty-context/src/schemas/composite-v3/**`, `long-task-contract-types-v3.ts`, `long-task-contract-parser.ts`, `long-task-contract-coverage.ts`, `long-task-contract-compiler.ts` and `long-task-path-policy.ts` own strict V3 parsing, the full Requirement/PI/Obligation/Binding/AC/Proof/Spec/Counterfactual graph and Host-sealed identities.
- Contract V3 observation/proof core: `long-task-observation-v2.ts`, `long-task-operator-evaluator.ts`, `long-task-population-evaluator.ts`, `long-task-binding-evaluator.ts`, `long-task-counterfactual-runner.ts`, `long-task-counterfactual-mutation.ts` and `long-task-entity-projector.ts` own actual-only evaluation and bottom-up result propagation.
- Contract V3 execution core: `long-task-oracle-bundler.ts`, `long-task-oracle-bundle-policy.ts`, `long-task-oracle-runner.ts`, package-manager/dependency/browser/environment/redaction/sandbox modules, `long-task-playwright-supervisor.ts`, `long-task-snapshot.ts`, `long-task-command-runner.ts`, `long-task-artifact-collector.ts`, `long-task-negative-evidence.ts` and `long-task-verifier.ts` own sealed isolated execution, including one Host sandbox for the browser/CDP/Playwright worker group.
- Contract V3 trust/completion core: `long-task-host-protocol.ts`, `long-task-host-client.ts`, `long-task-current-final-result.ts`, `long-task-environment-probe.ts`, `long-task-final-orchestrator.ts`, `long-task-final-steps.ts`, `long-task-result-projector.ts`, `long-task-durable-json.ts`, `long-task-status.ts`, `long-task-goal.ts`, `long-task-final-gate.ts`, `long-task-external-blocker.ts`, `long-task-hook-preflight.ts` and `long-task-stop-check.ts` own repair/status clients and current Host-commit-only result projection; `host/ty-context-host-helper/**` owns workspace-external registry, journal, attestations, caches, OS sandbox/secret adapters and Managed Hook enforcement.
- The old state/evidence/slice/derived modules and `composite-long-task-renderer.ts` are absent and must not be restored.
- Composite campaign authoring core: `composite-campaign-v3.ts` owns no-compatibility Scope Fit V3/SFC and packet schemas, immutable revision hashes, stable acyclic SFC dependencies, strict input loading, deterministic V3 YAML projection, full-graph/oracle-ready preflight, Goal-free handoff and current Host-committed signed-final-result-only projection.
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
- Contract V3 behavior: `tests/ty-context/long-task-contract-v3*.test.mjs`, `long-task-observation-v2.test.mjs`, binding/counterfactual/oracle-bundle/dependency/sandbox/Host/probe/final V3 tests and `composite-long-task-v3-black-box.test.mjs` with real fixture repositories under `tests/ty-context/fixtures/composite-long-task-v3/**`.
- Init/sync/doctor behavior: `tests/ty-context/sync-init-doctor.test.mjs`.
- Upgrade behavior: `tests/ty-context/upgrade.test.mjs` and `tests/ty-context/legacy-upgrade.test.mjs`.
- Package source drift: `tests/ty-context/package-source.test.mjs`.
- Context export: `tests/ty-context/export-context.test.mjs`.
- Surface Contract workflow: `tests/ty-context/surface-contract-workflow.test.mjs`.
- Modularity checks: `tests/ty-context/check-modularity.test.mjs` and `tests/ty-context/modularity-guidance.test.mjs`.
- Ordinary long-task Skill behavior: `tests/ty-context/plan-acceptance-skill.test.mjs`.
- Composite long-task Skill/Goal behavior is covered by the V3 CLI/routing/Managed Hook black-box suites; there is no package-owned runtime protocol document, task-state or execution-binding artifact.
- Composite campaign and preparation Skill behavior remains in `tests/ty-context/composite-campaign-*.test.mjs` and `tests/ty-context/prepare-composite-long-task-skill.test.mjs`, updated for `CompositeAuthoringPacketV3`, V3 YAML projection, full-graph/oracle-ready handoff and current signed-final-result projection.

## Release And Maintainer Tools

- Release version surface sync: `tools/sync_release_version.mjs`.
- Release preparation: `tools/release_prepare.mjs`.
- Release publication: `tools/release_publish.mjs`.
- Legacy npm release compatibility wrapper: `tools/release_npm.mjs`.
- GitHub release publishing: `tools/github_release_publish.mjs`.
- Launch readiness checks: `tools/launch_readiness_check.mjs`.
- Quickstart smoke: `tools/quickstart_smoke.mjs`.
- Consumer lab: `tools/consumer_lab_full_test.mjs`.
- Structured 60-case candidate runner: `tools/run_composite_v3_black_box.mjs`.
- Independent audit pin/adapter: `tools/external-audit-lock.json` and `tools/external_long_task_audit.mjs`.
- Signed platform Host release assembly: `tools/prepare_host_release_artifact.mjs`; its manifest binds release version, platform, architecture and every file hash before deterministic archive creation.

## Documentation Surfaces

- Full source-workspace design explanation: `PROJECT_SPEC.md`.
- Root user-facing package README: `README.md`.
- Package README: `packages/ty-context/README.md`.
- Source workspace Context: `project_context/**`.
