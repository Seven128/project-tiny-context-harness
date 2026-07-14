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
- Long-Task Workflow Contract V3 command wrapper: `packages/ty-context/src/commands/composite-long-task.ts`. The `composite-long-task` command is a stable compatibility identifier; there is no V2/legacy command alias.
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
- Strict Context manifest schema/parser and graph snapshots: `packages/ty-context/src/lib/context-manifest-schema.ts` and `packages/ty-context/src/lib/context-graph-snapshot.ts`.
- Validator dispatch: `packages/ty-context/src/lib/validators.ts`.
- Contract V3 schema/graph core: `packages/ty-context/src/schemas/composite-v3/**`, `long-task-contract-types-v3.ts`, `long-task-contract-parser.ts`, `long-task-contract-coverage.ts`, `long-task-contract-compiler.ts` and `long-task-path-policy.ts` own strict V3 parsing, Requirement/PI/Obligation/AC coverage and frozen three-input, Context, Oracle and verifier hashes.
- Contract V3 observation/proof core: `long-task-observation-v2.ts`, `long-task-operator-evaluator.ts`, `long-task-population-evaluator.ts`, `long-task-binding-evaluator.ts`, `long-task-counterfactual-runner.ts`, `long-task-counterfactual-mutation.ts` and `long-task-entity-projector.ts` own actual-only evaluation and bottom-up result propagation.
- Contract V3 execution core: `long-task-command-runner.ts`, `long-task-snapshot.ts` and `long-task-verifier.ts` own ordinary CLI execution against a frozen contract and workspace snapshot. The pre-stable path does not use dependency/browser content-addressed layers, Credential Manager or OS sandboxes.
- Contract V3 active/final core: `long-task-active-task.ts` owns the narrow project active binding and rejects a different contract or workdir with `active_contract_changed`; `long-task-final-gate.ts`, `long-task-final-receipt.ts`, `long-task-status.ts`, `long-task-goal.ts` and `long-task-stop-check.ts` own fresh full recomputation, dual ordinary-state result receipts, current final-result binding and Stop decisions. `long-task-hook-preflight.ts` admits only the exact package-managed Hook bytes and commands. The project-level Hook asset delegates Stop to this CLI path and is no-op without an active binding.
- The old state/evidence/slice/derived modules and `composite-long-task-renderer.ts` are absent and must not be restored.
- Composite Campaign schema/store entry: `schemas/composite-v5/**`, `composite-campaign-schema-registry.ts`, `composite-campaign-contract.ts`, `composite-campaign-schema-v5.ts`, `scope-fit-v4.ts` and `composite-campaign-v5.ts` own public schemas, contract discovery and active Campaign state. `composite-runtime-v5/{campaign-store,campaign-packet-store,campaign-packet-io,campaign-packet-verifier}.ts` separates V5-only transactions, Packet mutation, bounded IO and verification; `composite-audit-v4/campaign-store.ts` owns isolated historical creation/inspection and never enters automatic execution. Contract V3 remains the per-Slice acceptance worker.
- Composite Campaign V5 planning: `composite-campaign-graph.ts`, `composite-campaign-source-coverage.ts`, `composite-campaign-conflicts.ts` and `composite-campaign-scheduler.ts` own Scope Fit V4 Source Unit/DAG/global-constraint validation, Source Coverage V2 Context resolution (with V1 audit parsing isolated), maximal-coherent partition rules, complete end-to-end coverage, positive-evidence conflict reasons and deterministic ready-frontier waves.
- App Server transport and routing: `codex-app-server-protocol.ts`, `codex-app-server-client.ts`, `codex-model-catalog.ts`, `codex-model-routing-policy.ts` and `codex-model-router.ts` own typed JSONL framing, initialize/model/thread/Goal/turn methods, notifications, strict versioned policy loading, deterministic safe passthrough for missing/invalid policy, catalog-normalized availability and evidence-bounded explicit profile routing.
- Campaign thread execution: `composite-campaign-thread-state.ts`, `composite-campaign-thread-orchestrator.ts`, `composite-campaign-packet-author.ts`, `composite-campaign-source-units.ts`, `composite-campaign-goal-runner.ts`, `composite-campaign-repair-runner.ts` and `composite-campaign-host-recovery.ts` own the one-thread Authoring/Execution lifecycle, complete Source Unit entity chains, serialized Packet application, Goal binding, concurrent wave Turns, independent repair threads, same-thread needs-work/interruption, one reconnect and fail-closed launch reconciliation. The pure `advanceCampaignV5()` planner remains App-Server-adapter-free and emits actions consumed by the V5 host layer.
- Composite Campaign V5 Git/execution: `git-worktree-paths.ts`, `composite-campaign-git-baseline.ts`, `composite-campaign-worktree.ts`, `composite-campaign-change-envelope.ts`, `composite-campaign-transaction-store.ts`, `composite-campaign-lease.ts`, `composite-campaign-transaction-artifacts.ts`, `composite-campaign-transaction-io.ts`, `composite-campaign-transaction-recovery.ts`, `composite-campaign-goal-manifest.ts` and `composite-campaign-receipt.ts` own Git-safe path resolution, nonintrusive hidden-ref checkpoints, isolated Slice/repair worktrees, closed Change Envelopes, split WAL/live-owner-heartbeat lease/artifact/recovery mechanics, Goal Manifest V3 objectives and Envelope-bound Receipt V2 validation; V2 manifests and V1 receipts are audit-only.
- Composite Campaign V5 integration: `composite-campaign-integration.ts`, `composite-campaign-wave-impact.ts`, `composite-campaign-final-gate.ts` and `composite-campaign-orchestrator.ts` own deterministic merge/repair actions, actual-diff Wave Impact V2 selection and non-accepting Spec-granular Integration Gates, mandatory full Slice gates, one-shared-snapshot full Campaign recomputation with complete execution-identity result reuse and the adapter-free public `advance` action state machine. `composite-campaign-target-finalization.ts`, `composite-campaign-target-convergence.ts`, `composite-campaign-target-delivery.ts`, `composite-campaign-target-receipts.ts` and `composite-campaign-gh.ts` own authoritative Target resolution, commit/tree convergence, full Target Snapshot revalidation, non-force delivery, strict receipts and matching-open-PR fallback. `composite-campaign-accepted-authority.ts` and `composite-campaign-accepted-cleanup.ts` own accepted Final Result construction, receipt/authority validation, the atomic acceptance transaction and accepted-first idempotent cleanup. The App Server runner is a separate orchestration adapter.
- Capability profile selection and explicit enable/disable: `packages/ty-context/src/lib/profiles.ts`, `packages/ty-context/src/commands/enable.ts` and `packages/ty-context/src/commands/disable.ts`.
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
- Contract V3 focused behavior: `tests/ty-context/composite-long-task-lightweight-black-box.test.mjs` owns the six real CLI cases for happy implementation, missing obligation, source drift, Oracle/verifier drift, stale or missing final result and drift repair. Supporting unit tests may cover parser/evaluator details, but they cannot replace the real CLI/final-gate cases.
- Init/sync/doctor behavior: `tests/ty-context/sync-init-doctor.test.mjs`.
- Upgrade behavior: `tests/ty-context/upgrade.test.mjs` and `tests/ty-context/legacy-upgrade.test.mjs`.
- Package source drift: `tests/ty-context/package-source.test.mjs`.
- Context export: `tests/ty-context/export-context.test.mjs`.
- Surface Contract workflow: `tests/ty-context/surface-contract-workflow.test.mjs`.
- Modularity checks: `tests/ty-context/check-modularity.test.mjs` and `tests/ty-context/modularity-guidance.test.mjs`.
- Ordinary long-task Skill behavior: `tests/ty-context/normal-long-task-skill.test.mjs`.
- Long-Task Workflow Skill/Goal behavior is covered by explicit-invocation Skill tests and the lightweight CLI/project-Hook black-box suite; there is no lifecycle task-state, progress ledger or privileged Host protocol.
- Composite Campaign V5 and preparation Skill behavior lives in `tests/ty-context/composite-campaign-*.test.mjs` and `tests/ty-context/prepare-composite-long-task-skill.test.mjs`: Scope Fit V4 Source Unit/maximal-scope rules, graph/source coverage, conservative scheduler, App Server protocol/catalog/routing, thread lifecycle/recovery, real Git worktrees/per-worktree bindings, immutable `CompositeAuthoringPacketV3` projection, Slice receipts, merge/repair, Integration/Campaign gates and target finalization. `composite-campaign-target-finalization.test.mjs` owns commit/tree/Target-Gate/delivery/PR regressions; `composite-campaign-accepted-authority.test.mjs` owns terminal reentry, atomic authority and cleanup/crash recovery; `composite-campaign-lease.test.mjs` owns live-owner, heartbeat and operation-id cases. Transaction-store and worktree suites retain recovery and primary-worktree isolation. `tests/ty-context/fake-codex-app-server.mjs` is the deterministic local JSONL protocol double, and the V5 black-box suite uses it with real temporary Git repositories. Real App Server smoke is development-only.

## Release And Maintainer Tools

- Release version surface sync: `tools/sync_release_version.mjs`.
- Release preparation: `tools/release_prepare.mjs`.
- Release publication: `tools/release_publish.mjs`.
- Legacy npm release compatibility wrapper: `tools/release_npm.mjs`.
- GitHub release publishing: `tools/github_release_publish.mjs`.
- Long-Task Workflow self-test entrypoints: `packages/ty-context/package.json` owns the default and explicit `test:long-task-workflow` commands; `tests/ty-context/run-package-suite.mjs` partitions them by stable filename families; `tests/ty-context/workflow-test-entrypoints.test.mjs` permits the complete workflow suite through direct `npm test`, its dedicated command or PR/main/publish CI, and prevents Hooks, local release scripts and consumer Harness gates from acquiring it, and requires pinned Action SHAs. `tools/release_artifact_identity.mjs` and the prepare/verify/publish tools bind Release Artifact V2 environment and byte identity around the exact tarball smoke.
- Launch readiness checks: `tools/launch_readiness_check.mjs`.
- Quickstart smoke: `tools/quickstart_smoke.mjs`.

## Documentation Surfaces

- Full source-workspace design explanation: `PROJECT_SPEC.md`.
- Root user-facing package README: `README.md`.
- Package README: `packages/ty-context/README.md`.
- Source workspace Context: `project_context/**`.
