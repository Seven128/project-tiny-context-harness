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
- Composite Campaign V6 schema/store entry: `schemas/composite-v6/**`, `composite-campaign-schema-registry-v6.ts`, `composite-authoring-packet-v3.ts`, `composite-campaign-contract-v6.ts`, `composite-campaign-schema-v6.ts`, `composite-campaign-v6.ts` and `composite-runtime-v6/{campaign-store,campaign-packet-store,campaign-packet-io,campaign-packet-verifier}.ts` own public V6 state/contract, the AppServer-independent Packet type, strict parsing, generations, atomic writes, append-only events and Packet mutation/verification. `composite-audit-v5/campaign-store.ts` isolates accepted V5 inspection; unfinished V5 cannot execute or migrate.
- Composite Campaign V6 planning: `composite-campaign-planner-v6.ts`, `composite-campaign-graph.ts`, `composite-campaign-source-coverage.ts`, `composite-campaign-conflicts.ts` and `composite-campaign-scheduler.ts` own side-effect-free ready-frontier/next-stage planning, Scope Fit V4 validation, Source Coverage V2 Context resolution, maximal-coherent partition rules, positive-evidence conflicts and deterministic waves. Unknown conflict is serial.
- Codex Exec transport and policy: `codex-exec-client.ts` owns safe spawn argv, stdin prompts, JSONL parsing, output caps, timeout, abort and targeted child-tree termination. `codex-model-profile.ts`, `composite-campaign-exec-policy.ts` and `codex-model-routing-policy.ts` own AppServer-independent profile/effort/reason types, command/sandbox policy, strict YAML routing, Sol xhigh/max/ultra-to-medium and deterministic passthrough/fallback reasons. `codex-model-router.ts` re-exports the shared profile surface for historical V5 callers; its catalog/AppServer chain is unreachable from V6.
- Campaign bounded workers: `composite-campaign-exec-worker.ts` owns independent read-only Packet authoring, workspace-write SFC execution and workspace-write Integration repair prompts/attempt normalization. `composite-campaign-wave-runner-v6.ts`, `composite-campaign-repair-v6.ts` and `composite-campaign-gates-v6.ts` own bounded parallel authoring/execution, settled child observation, machine-result verification and serial repair. Packet/Contract/Envelope/Receipt is the authority chain; worker exit and output are non-authoritative.
- Composite Campaign V6 Git/execution: `composite-campaign-worktree-budget.ts` owns package-managed fixed paths, one Integration branch/worktree, at most four detached SFC worktrees, one reusable detached repair worktree, hard budget/orphan reconciliation and cleanup. `composite-campaign-reconcile-v6.ts`, `composite-campaign-bootstrap-v6.ts`, `composite-campaign-runtime-helpers-v6.ts`, `composite-campaign-control-v6.ts` and `composite-campaign-runner-types-v6.ts` own simple process-identity locks, durable-stage reconciliation, fixed-profile bootstrap, interrupts and shared scheduler types. `composite-campaign-receipt.ts` owns Receipt V3 bindings alongside historical receipt readers.
- Composite Campaign V6 orchestration: `composite-campaign-runner-v6.ts` is the single foreground mechanical loop. `composite-campaign-dry-run-v6.ts`, `composite-campaign-wave-gate-v6.ts`, `composite-campaign-finalizer-v6.ts`, `composite-campaign-accepted-authority-v6.ts` and `composite-campaign-schema-registry-v6.ts` separate dry-run projection, Wave gating, finalization, accepted authority and version routing. Existing `composite-campaign-integration.ts`, Wave Impact, Final Gate and target finalization/delivery modules retain deterministic merge, current-snapshot Gate and Target authority. V6 injects fixed detached repair paths and never imports AppServer/Thread/Goal runners.
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
- Campaign V6 infrastructure tests are `codex-exec-client-v1.smoke.test.mjs`, `composite-campaign-worktree-budget-v6.smoke.test.mjs`, `composite-campaign-exec-routing-v6.test.mjs` and `composite-campaign-cli-v6-dry-run.test.mjs`. They cover an ordinary fake child executable, safe bounded process behavior, temporary real-Git detached worktrees/budget/commit-SHA merge/repair reuse, pure routing and non-mutating dry-run without starting a real Campaign. Historical V5/AppServer tests and sources are not formal V6 runtime coverage.

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
