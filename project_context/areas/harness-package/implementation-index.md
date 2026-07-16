---
context_role: implementation-index
read_policy: on-demand
---
# Harness Package Implementation Index

## Role

Navigation for current implementation surfaces. Behavior is defined by owning contract/area Context and `PROJECT_SPEC.md`.

## CLI And Profiles

- CLI entry/routing: `packages/ty-context/src/cli.ts`, `packages/ty-context/src/commands/index.ts`.
- Long-Task V2 command: `packages/ty-context/src/commands/long-task.ts`.
- Retired command tombstones: `commands/delivery-set.ts`, `commands/composite-long-task.ts`, `commands/composite-campaign.ts`.
- Profile enable/disable and selection: `commands/enable.ts`, `commands/disable.ts`, `lib/profiles.ts`, `lib/types.ts`, config parser and migrations.

## Canonical Delivery Contract

- Normative JSON Schema: `packages/ty-context/src/schemas/long-task-delivery-v2/**`; V1 parses only to the retirement error.
- Contract/runtime types and public barrel: `long-task-contract-types.ts`, `long-task-runtime-types.ts`, `long-task-delivery-types.ts`.
- Strict YAML and shape parsing: `strict-codec.ts`, `long-task-delivery-shape.ts`, `long-task-check-shape.ts`, `long-task-delivery-parser.ts`, `long-task-outcome-parser.ts`, `long-task-delivery-validation.ts`.
- Composition and protected authority: `long-task-boundary-check.ts`, `long-task-authority.ts`, `long-task-authority-revision*.ts`, `long-task-protected-files.ts`, `long-task-progress.ts` and `long-task-risk-surfaces.ts`; canonical Source/Context/Product/Global revision materials live in the authority modules.
- Static compile, Global/Outcome Claim Coverage, field-policy completeness, shared repository-pattern AST/subset/overlap, runner identity and risk proof: `long-task-delivery-compiler.ts`, `long-task-delivery-preflight.ts`, `long-task-authority-policy.ts`, `long-task-claims.ts`, `long-task-claim-definitions.ts`, `long-task-runner-freeze.ts`, `long-task-runner-files.ts`, `long-task-risk.ts`, `long-task-risk-types.ts`, `long-task-paths.ts`, `long-task-verifier-identity.ts`.
- Context graph snapshot/path containment/stable JSON utilities are shared package primitives and must not depend on retired runtime.

## Evidence Kernel

- Workspace snapshot and declared command execution: `long-task-workspace.ts`, `long-task-check-runner.ts`, `long-task-runner-environment.ts`, `long-task-check-evidence-decoder.ts`.
- Observation/assertion, per-Check artifacts, Population V2 and exact Counterfactual evaluation: `long-task-assertions-v2.ts`, `long-task-artifacts.ts`, `long-task-evidence-v2.ts`.
- Common-dir Active Authority V3 snapshot, legacy V2 continuity migration, task/revision/identity marker, CAS commit, compiled-cache projection, Authority Revision and audit state: `long-task-state.ts`.
- Scoped progress, status/resume/doctor, targeted verification and Live Final Gate: `long-task-verifier-v2.ts`, `long-task-progress.ts`, `long-task-status-v2.ts`, `long-task-final-v2.ts`, `long-task-freshness.ts`.
- Package-owned Hook entry/install/preflight and exact entry-level cleanup: `src/long-task-hook.ts`, `long-task-hook-install.ts`, `long-task-hook-preflight.ts`.
- No active module may import Campaign, SFC, Packet, Codex/AppServer, model routing, process identity/tree or Git worktree orchestration.

## Managed Assets And Skills

- Managed source: `.codex/ty-context-managed/**`.
- Packaged assets: `packages/ty-context/assets/**`.
- Source mappings: `packages/ty-context/source-mappings.yaml`.
- Active Long-Task Skill: `.codex/skills/long-task-workflow/SKILL.md` and managed/package copies.
- Retirement pointer: `.codex/skills/normal-long-task/SKILL.md` and managed/package copies.
- Source-workspace authoring Skill: `.codex/skills/authoring/harness_package_design/SKILL.md`.

## Tests

- Delivery Contract parser/compiler/risk/preflight: `tests/ty-context/long-task-delivery-*.test.mjs`.
- Semantic authority, field completeness, conservative pattern containment/overlap and Global Claim coverage: `long-task-semantic-authority-revision.test.mjs`, `long-task-authority-field-completeness.test.mjs`, `long-task-pattern-containment.test.mjs`, `long-task-pattern-overlap.test.mjs`, `long-task-global-claim-coverage.test.mjs`.
- CLI/Evidence Kernel/Stop real temporary-Git black box: `tests/ty-context/long-task-workflow-*.test.mjs`.
- Profile/init/sync/upgrade/package assets: existing focused profile/package/upgrade tests updated for `long-task`.
- Adversarial suites: `long-task-active-authority-continuity.test.mjs`, `long-task-authority-adversarial.test.mjs`, `long-task-assertion-safety.test.mjs`, `long-task-schema-parser-parity.test.mjs`, `long-task-counterfactual-integrity.test.mjs`, `long-task-runner-freeze-v2.test.mjs`, population/environment and Hook relocation tests.
- Suite partitioning: `tests/ty-context/run-package-suite.mjs`; package scripts expose `test:delivery-contract`, `test:long-task-workflow` and independent `test:long-task-performance`.
- Consumer/package smoke: `tools/quickstart_smoke.mjs`, `tools/release_tarball_smoke.mjs`, `npm run preview:pack`.

## Release And Documentation

- Version sync: `tools/sync_release_version.mjs`.
- Release prepare/publish: `tools/release_prepare.mjs`, `tools/release_publish.mjs`, compatibility wrapper `tools/release_npm.mjs`.
- Public docs: `README.md`, `README.zh-CN.md`, `packages/ty-context/README.md`.
- Stable design: `PROJECT_SPEC.md`; durable source-workspace facts: `project_context/**`.
