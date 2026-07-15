---
context_role: implementation-index
read_policy: on-demand
---
# Harness Package Implementation Index

## Role

Navigation for current implementation surfaces. Behavior is defined by owning contract/area Context and `PROJECT_SPEC.md`.

## CLI And Profiles

- CLI entry/routing: `packages/ty-context/src/cli.ts`, `packages/ty-context/src/commands/index.ts`.
- Long-Task Contract command: `packages/ty-context/src/commands/long-task.ts`; Delivery Set command: `commands/delivery-set.ts`.
- Retired command tombstones: `commands/composite-long-task.ts`, `commands/composite-campaign.ts`.
- Profile enable/disable and selection: `commands/enable.ts`, `commands/disable.ts`, `lib/profiles.ts`, `lib/types.ts`, config parser and migrations.

## Canonical Delivery Contract

- Normative JSON Schema: `packages/ty-context/src/schemas/long-task-delivery-v1/**`.
- Contract/runtime types and public barrel: `long-task-contract-types.ts`, `long-task-runtime-types.ts`, `long-task-delivery-types.ts`.
- Strict YAML and shape parsing: `strict-codec.ts`, `long-task-delivery-shape.ts`, `long-task-check-shape.ts`, `long-task-delivery-parser.ts`, `long-task-delivery-validation.ts`.
- Composition and protected authority: `long-task-boundary-check.ts`, `long-task-delivery-set-*`, `long-task-authority.ts`, `long-task-progress.ts`, `long-task-risk-surfaces.ts` and both schema folders.
- Static compile, generated ids, runner identity and risk proof: `long-task-delivery-compiler.ts`, `long-task-runner-freeze.ts`, `long-task-risk.ts`, `long-task-paths.ts`, `long-task-verifier-identity.ts`.
- Context graph snapshot/path containment/stable JSON utilities are shared package primitives and must not depend on retired runtime.

## Evidence Kernel

- Workspace snapshot and declared command execution: `long-task-workspace.ts`, `long-task-check-runner.ts`.
- Observation/assertion, artifacts, population/binding/counterfactual and derived evidence: `long-task-assertions-v1.ts`, `long-task-evidence-v1.ts`.
- Exclusive Contract/Set active binding, Authority Revision and persisted verifier-owned state: `long-task-state.ts`, `long-task-delivery-set-state.ts`.
- Scoped targeted progress, status/resume projection, Child/standalone/Set Final Gates, Receipts and freshness: `long-task-verifier-v1.ts`, `long-task-progress.ts`, `long-task-status-*`, `long-task-final-v1.ts`, `long-task-delivery-set-final.ts`, `long-task-freshness.ts`.
- Hook installation/preflight: `long-task-hook-install.ts`, `long-task-hook-preflight.ts` and the package-managed `long-task-hook.mjs`.
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
- CLI/Evidence Kernel/Stop real temporary-Git black box: `tests/ty-context/long-task-workflow-*.test.mjs`.
- Profile/init/sync/upgrade/package assets: existing focused profile/package/upgrade tests updated for `long-task`.
- Suite partitioning: `tests/ty-context/run-package-suite.mjs`; package scripts expose `test:delivery-contract` and `test:long-task-workflow`.
- Consumer/package smoke: `tools/quickstart_smoke.mjs`, `tools/release_tarball_smoke.mjs`, `npm run preview:pack`.

## Release And Documentation

- Version sync: `tools/sync_release_version.mjs`.
- Release prepare/publish: `tools/release_prepare.mjs`, `tools/release_publish.mjs`, compatibility wrapper `tools/release_npm.mjs`.
- Public docs: `README.md`, `README.zh-CN.md`, `packages/ty-context/README.md`.
- Stable design: `PROJECT_SPEC.md`; durable source-workspace facts: `project_context/**`.
