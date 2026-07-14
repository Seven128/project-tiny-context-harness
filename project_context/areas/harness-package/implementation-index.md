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
- Contract V3 schema/graph core: `packages/ty-context/src/schemas/composite-v3/**`, `long-task-contract-types-v3.ts`, `long-task-contract-parser.ts`, `long-task-contract-coverage.ts`, `long-task-contract-compiler.ts` and `long-task-path-policy.ts` own strict V3 parsing, Requirement/PI/Obligation/AC coverage and frozen three-input, Context, Oracle and verifier hashes.
- Contract V3 observation/proof core: `long-task-observation-v2.ts`, `long-task-operator-evaluator.ts`, `long-task-population-evaluator.ts`, `long-task-binding-evaluator.ts`, `long-task-counterfactual-runner.ts`, `long-task-counterfactual-mutation.ts` and `long-task-entity-projector.ts` own actual-only evaluation and bottom-up result propagation.
- Contract V3 execution core: `long-task-command-runner.ts`, `long-task-snapshot.ts` and `long-task-verifier.ts` own ordinary CLI execution against a frozen contract and workspace snapshot. The pre-stable path does not use dependency/browser content-addressed layers, Credential Manager or OS sandboxes.
- Contract V3 active/final core: `long-task-active-task.ts` owns the narrow project active binding and rejects a different contract or workdir with `active_contract_changed`; `long-task-final-gate.ts`, `long-task-final-receipt.ts`, `long-task-status.ts`, `long-task-goal.ts` and `long-task-stop-check.ts` own fresh full recomputation, dual ordinary-state result receipts, current final-result binding and Stop decisions. `long-task-hook-preflight.ts` admits only the exact package-managed Hook bytes and commands. The project-level Hook asset delegates Stop to this CLI path and is no-op without an active binding.
- The old state/evidence/slice/derived modules and `composite-long-task-renderer.ts` are absent and must not be restored.
- Composite Campaign V5 schema/store entry: `schemas/composite-v5/**`, `composite-campaign-schema-registry.ts`, `composite-campaign-contract.ts`, `composite-campaign-schema-v5.ts`, `scope-fit-v4.ts` and `composite-campaign-v5.ts` own public schema artifacts and contract discovery, strict Campaign/Scope validation, immutable discussed-plan/Packet/schedule identities, safe tracked persistence, host/thread/profile state and derived transitions. The V4 schema is accepted for inspection only; shared V4-named Packet/storage helpers remain beneath V5, but V4 campaigns cannot enter automatic execution. Contract V3 remains the per-Slice acceptance worker.
- Composite Campaign V5 planning: `composite-campaign-graph.ts`, `composite-campaign-source-coverage.ts`, `composite-campaign-conflicts.ts` and `composite-campaign-scheduler.ts` own Scope Fit V4 Source Unit/DAG/global-constraint validation, maximal-coherent partition rules, complete end-to-end coverage, positive-evidence conflict reasons and deterministic ready-frontier waves.
- App Server transport and routing: `codex-app-server-protocol.ts`, `codex-app-server-client.ts`, `codex-model-catalog.ts` and `codex-model-router.ts` own typed JSONL framing, initialize/model/thread/Goal/turn methods, notifications, catalog-normalized availability and evidence-bounded explicit profile routing.
- Campaign thread execution: `composite-campaign-thread-state.ts`, `composite-campaign-thread-orchestrator.ts`, `composite-campaign-packet-author.ts`, `composite-campaign-source-units.ts`, `composite-campaign-goal-runner.ts`, `composite-campaign-repair-runner.ts` and `composite-campaign-host-recovery.ts` own the one-thread Authoring/Execution lifecycle, complete Source Unit entity chains, serialized Packet application, Goal binding, concurrent wave Turns, independent repair threads, same-thread needs-work/interruption, one reconnect and fail-closed launch reconciliation. The pure `advanceCampaignV4()` planner remains App-Server-adapter-free and emits actions consumed by this V5 host layer.
- Composite Campaign V5 Git/execution: `git-worktree-paths.ts`, `composite-campaign-git-baseline.ts`, `composite-campaign-worktree.ts`, `composite-campaign-goal-manifest.ts` and `composite-campaign-receipt.ts` own Git-safe path resolution, checkpoint/base/integration topology, isolated Slice/repair worktrees, Goal Manifest V2 objectives and commit-before-final receipt validation.
- Composite Campaign V5 integration: `composite-campaign-integration.ts`, `composite-campaign-final-gate.ts` and `composite-campaign-orchestrator.ts` own deterministic merge/repair actions, impact-aware Wave Integration Gates, one-snapshot full Campaign recomputation, target resynchronization/finalization and the adapter-free public `advance` action state machine. The App Server runner is a separate orchestration adapter.
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
- Contract V3 focused behavior: `tests/ty-context/composite-long-task-lightweight-black-box.test.mjs` owns the six real CLI cases for happy implementation, missing obligation, source drift, Oracle/verifier drift, stale or missing final result and drift repair. Supporting unit tests may cover parser/evaluator details, but they cannot replace the real CLI/final-gate cases.
- Init/sync/doctor behavior: `tests/ty-context/sync-init-doctor.test.mjs`.
- Upgrade behavior: `tests/ty-context/upgrade.test.mjs` and `tests/ty-context/legacy-upgrade.test.mjs`.
- Package source drift: `tests/ty-context/package-source.test.mjs`.
- Context export: `tests/ty-context/export-context.test.mjs`.
- Surface Contract workflow: `tests/ty-context/surface-contract-workflow.test.mjs`.
- Modularity checks: `tests/ty-context/check-modularity.test.mjs` and `tests/ty-context/modularity-guidance.test.mjs`.
- Ordinary long-task Skill behavior: `tests/ty-context/plan-acceptance-skill.test.mjs`.
- Composite long-task Skill/Goal behavior is covered by explicit-invocation Skill tests and the lightweight CLI/project-Hook black-box suite; there is no lifecycle task-state, progress ledger or privileged Host protocol.
- Composite Campaign V5 and preparation Skill behavior lives in `tests/ty-context/composite-campaign-*.test.mjs` and `tests/ty-context/prepare-composite-long-task-skill.test.mjs`: Scope Fit V4 Source Unit/maximal-scope rules, graph/source coverage, conservative scheduler, App Server protocol/catalog/routing, thread lifecycle/recovery, real Git worktrees/per-worktree bindings, immutable `CompositeAuthoringPacketV3` projection, Slice receipts, merge/repair, Integration/Campaign gates and target finalization. `tests/ty-context/fake-codex-app-server.mjs` is the deterministic local JSONL protocol double, and the V5 black-box suite uses it with real temporary Git repositories. Real App Server smoke is development-only.

## Release And Maintainer Tools

- Release version surface sync: `tools/sync_release_version.mjs`.
- Release preparation: `tools/release_prepare.mjs`.
- Release publication: `tools/release_publish.mjs`.
- Legacy npm release compatibility wrapper: `tools/release_npm.mjs`.
- GitHub release publishing: `tools/github_release_publish.mjs`.
- Composite workflow self-test entrypoints: `packages/ty-context/package.json` owns the explicit full/focused commands; `tests/ty-context/workflow-test-entrypoints.test.mjs` prevents Package CI, trusted publication or consumer Harness gates from acquiring an automatic Campaign self-test step.
- Launch readiness checks: `tools/launch_readiness_check.mjs`.
- Quickstart smoke: `tools/quickstart_smoke.mjs`.

## Documentation Surfaces

- Full source-workspace design explanation: `PROJECT_SPEC.md`.
- Root user-facing package README: `README.md`.
- Package README: `packages/ty-context/README.md`.
- Source workspace Context: `project_context/**`.
