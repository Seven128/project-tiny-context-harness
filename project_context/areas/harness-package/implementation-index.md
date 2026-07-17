---
context_role: implementation-index
read_policy: on-demand
---
# Harness Package Implementation Index

## Role

Navigation for current implementation surfaces. Behavior is defined by owning contract/area Context and `PROJECT_SPEC.md`.

- Long-Task design rationale and mechanism-to-risk map: `project_context/areas/harness-package/decision-rationale/long-task-workflow.md`.

## CLI And Profiles

- CLI entry/routing: `packages/ty-context/src/cli.ts`, `packages/ty-context/src/commands/index.ts`.
- Long-Task V2 command: `packages/ty-context/src/commands/long-task.ts`.
- Retired command tombstones: `commands/delivery-set.ts`, `commands/composite-long-task.ts`, `commands/composite-campaign.ts`.
- Profile enable/disable and selection: `commands/enable.ts`, `commands/disable.ts`, `lib/profiles.ts`, `lib/types.ts`, config parser and migrations.

## Canonical Delivery Contract

- Normative JSON Schema: `packages/ty-context/src/schemas/long-task-delivery-v2/**`; V1 parses only to the retirement error.
- Focused Contract/runtime type surfaces and public barrel: `long-task-contract-types.ts`, `long-task-runtime-types.ts`, `long-task-authority-types.ts`, `long-task-source-authority-types.ts`, `long-task-evidence-adapter-types.ts`, `long-task-workspace-runtime-types.ts`, `long-task-delivery-types.ts`.
- Strict YAML, Compact defaults and shape parsing: `strict-codec.ts`, `long-task-delivery-shape.ts`, `long-task-check-shape.ts`, `long-task-delivery-parser.ts`, `long-task-outcome-parser.ts`, `long-task-delivery-validation.ts`.
- Composition and protected authority: `long-task-boundary-check.ts`, `long-task-authority.ts`, `long-task-authority-revision*.ts`, `long-task-protected-files.ts`, `long-task-progress.ts` and `long-task-risk-surfaces.ts`; canonical Source/Context/Product/Global revision materials live in the authority modules.
- Context authority classification and old-snapshot fail-closed normalization: `context-graph-snapshot.ts` assigns referenced-mode controlling/supporting files; `long-task-context-authority.ts` normalizes stored snapshots, projects only controlling Context for scoped Progress and distinguishes support-only revision from controlling authority drift.
- Mandatory Source marker parsing/inventory/text, exact Risk Fact/Outcome metadata, Non-completing targets, unified Outcome/Global Acceptance references and canonical-target continuity: `long-task-source-item-parser.ts`, `long-task-source-inventory.ts`, `long-task-acceptance-reference.ts`, `long-task-source-target-index.ts`, `long-task-source-target-continuity.ts`, `long-task-source-continuity.ts`, `long-task-source-shape.ts`, `long-task-source-claim-validation.ts`.
- Shared read-only Preflight/static Compile safety: `long-task-activation-validation.ts`, `long-task-authoring-preflight.ts`, `long-task-delivery-compiler.ts`, `long-task-delivery-preflight.ts`. The former duplicated repository-preflight module is retired.
- Claim/operator/all-of proof, shared proof-surface parsing, adapter/Raw Execution Observation ownership, Outcome/Global Counterfactual-to-Binding and structured/weak-Playwright sensitivity policy, authority field policy, planned-path validation, paths/risk and runner freeze: `long-task-claims.ts`, `long-task-claim-proof-policy.ts`, `long-task-required-proof-surfaces.ts`, `long-task-evidence-adapter-policy.ts`, `long-task-observation-ownership.ts`, `long-task-counterfactual-claim-policy.ts`, `long-task-evidence-sensitivity-policy.ts`, `long-task-authority-policy.ts`, `long-task-check-execution-policy.ts`, `long-task-delivery-preflight.ts`, `long-task-runner-freeze.ts`, `long-task-risk.ts`, `long-task-paths.ts`.
- Context graph snapshot/path containment/stable JSON utilities are shared package primitives and must not depend on retired runtime.

## Evidence Kernel

- Workspace snapshot and declared command execution: `long-task-workspace.ts`, `long-task-check-runner.ts`, `long-task-runner-environment.ts`, `long-task-check-evidence-decoder.ts`.
- Declared-only single-AC-per-Test multi-project Playwright decoding, report/instance diagnostics, exact exit-one Counterfactual classification, detailed assertion evaluation, per-Check review artifacts, passed-Check-only Claim/Population proof and Binding/value-sensitive Counterfactual evaluation: `long-task-playwright-evidence.ts`, `long-task-playwright-counterfactual-policy.ts`, `long-task-check-evidence-decoder.ts`, `long-task-assertions-v2.ts`, `long-task-artifacts.ts`, `long-task-evidence-v2.ts` and the declared-surface-only `long-task-counterfactual-sandbox.ts`.
- Common-dir Active Authority V3 snapshot, old-V2 manual-required boundary, task/revision/identity marker, CAS commit, compiled-cache projection, Authority Revision and audit state: `long-task-state.ts`.
- Scoped progress, precise Source/Claim/AC findings, status/resume/explain/doctor, targeted verification and Live Final Gate: `long-task-verifier-v2.ts`, `long-task-progress.ts`, `long-task-status-v2.ts`, `long-task-final-v2.ts`, `long-task-freshness.ts`.
- Package-owned Hook entry/install/preflight and exact entry-level cleanup: `src/long-task-hook.ts`, `long-task-hook-install.ts`, `long-task-hook-preflight.ts`.
- No active module may import Campaign, SFC, Packet, Codex/AppServer, model routing, process identity/tree or Git worktree orchestration.

## Managed Assets And Skills

- Managed source: `.codex/ty-context-managed/**`.
- Packaged assets: `packages/ty-context/assets/**`.
- Source mappings: `packages/ty-context/source-mappings.yaml`.
- Optional Source Plan Skill: `.codex/skills/source-plan-authoring/SKILL.md` and managed/package copies.
- Active Long-Task Skill: `.codex/skills/long-task-workflow/SKILL.md` and managed/package copies.
- Retirement pointer: `.codex/skills/normal-long-task/SKILL.md` and managed/package copies.
- Source-workspace authoring Skill: `.codex/skills/authoring/harness_package_design/SKILL.md`.

## Tests

- Delivery Contract Compact/parser/compiler/risk/preflight/Source-target/AC coverage: `tests/ty-context/long-task-delivery-*.test.mjs` plus `long-task-closure-invariants.test.mjs`, `long-task-source-authority-closure.test.mjs` and focused authoring/Requirement/Observation tests.
- Semantic authority, field completeness, conservative pattern containment/overlap and Global Claim coverage: `long-task-semantic-authority-revision.test.mjs`, `long-task-authority-field-completeness.test.mjs`, `long-task-pattern-containment.test.mjs`, `long-task-pattern-overlap.test.mjs`, `long-task-global-claim-coverage.test.mjs`.
- Context evolution and scoped Progress preservation: `long-task-context-evolution.test.mjs`, `long-task-authority-progress-retry.test.mjs`.
- Focused closure: `long-task-global-evidence-sensitivity.test.mjs`, `long-task-source-risk-binding.test.mjs`, `long-task-non-completing-source.test.mjs`, `long-task-playwright-trust-boundary.test.mjs`, `long-task-planned-counterfactual.test.mjs`, `long-task-public-contract-example.test.mjs` and `long-task-release-tarball-contract.test.mjs`.
- CLI/Evidence Kernel/Stop real temporary-Git black box: `tests/ty-context/long-task-workflow-*.test.mjs`.
- Profile/init/sync/upgrade/package assets: existing focused profile/package/upgrade tests updated for `long-task`.
- Source Plan Skill contract and parity: `tests/ty-context/source-plan-authoring-skill.test.mjs`.
- Controlling objective, Draft lifecycle, Outcome decomposition and mechanism-admission consistency: `tests/ty-context/long-task-design-context.test.mjs`.
- Efficiency, continuous Goal, no proactive subagent scheduling, Context evolution and affected-test boundaries: `tests/ty-context/long-task-efficiency-design.test.mjs`, `tests/ty-context/affected-test-selection.test.mjs`.
- Adversarial suites: `long-task-active-authority-continuity.test.mjs`, `long-task-authority-adversarial.test.mjs`, `long-task-assertion-safety.test.mjs`, `long-task-schema-parser-parity.test.mjs`, `long-task-counterfactual-integrity.test.mjs`, `long-task-playwright-ac-evidence.test.mjs`, `long-task-runner-freeze-v2.test.mjs`, `long-task-final-closure-mutation-smoke.test.mjs`, population/environment and Hook relocation tests.
- Suite partitioning: `tests/ty-context/run-package-suite.mjs`; package scripts expose `test:delivery-contract`, `test:long-task-workflow` and independent `test:long-task-performance`.
- Development routing: `tools/affected_test_selection.mjs`, `tools/run_affected_tests.mjs`; root scripts expose affected, focused Long-Task and focused Delivery Contract loops while unknown runtime changes fail safe to complete suites.
- Consumer/package smoke: `tools/quickstart_smoke.mjs`, `tools/release_tarball_smoke.mjs`, reusable `tools/release_tarball_smoke_fixture.mjs`, `long-task-release-tarball-contract.test.mjs`, `npm run preview:pack`.

## Release And Documentation

- Version sync: `tools/sync_release_version.mjs`.
- Release prepare/publish: `tools/release_prepare.mjs`, `tools/release_publish.mjs`, compatibility wrapper `tools/release_npm.mjs`.
- Public docs: `README.md`, `README.zh-CN.md`, `packages/ty-context/README.md`.
- Stable design: `PROJECT_SPEC.md`; durable source-workspace facts: `project_context/**`.
