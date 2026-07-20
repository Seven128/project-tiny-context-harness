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
- Long-Task V2 commands: `packages/ty-context/src/commands/long-task.ts`, `long-task-revision.ts` and `long-task-command-args.ts`; the thin entry router delegates revision compile/diagnosis/approval, projects one hash-bound pending approval summary, classifies supporting-only Context revisions before derived Progress invalidation, and emits the additive one-time `execution_model_checkpoint` on first Compile.
- Retired command tombstones: `commands/delivery-set.ts`, `commands/composite-long-task.ts`, `commands/composite-campaign.ts`.
- Profile enable/disable and selection: `commands/enable.ts`, `commands/disable.ts`, `lib/profiles.ts`, `lib/types.ts`, config parser and migrations.

## Canonical Delivery Contract

- Normative JSON Schema: `packages/ty-context/src/schemas/long-task-delivery-v2/**`; V1 parses only to the retirement error.
- Focused Contract/runtime type surfaces and public barrel: `long-task-contract-types.ts`, `long-task-runtime-types.ts`, `long-task-authority-types.ts`, `long-task-source-authority-types.ts`, `long-task-evidence-adapter-types.ts`, `long-task-workspace-runtime-types.ts`, `long-task-delivery-types.ts`.
- Strict YAML, Compact defaults and shape parsing: `strict-codec.ts`, `long-task-delivery-shape.ts`, `long-task-check-shape.ts`, `long-task-delivery-parser.ts`, `long-task-outcome-parser.ts`, `long-task-delivery-validation.ts`.
- Composition and protected authority: `long-task-boundary-check.ts`, `long-task-authority.ts`, `long-task-authority-revision*.ts`, `long-task-protected-files.ts`, `long-task-progress.ts` and `long-task-risk-surfaces.ts`; canonical Source/Context/Product/Global revision materials, three-way classification and concise approval summary live in the authority modules.
- Context evolution and Progress retention: `long-task-context-authority-topology.ts` projects selected authority-bearing manifest structure, `context-graph-snapshot.ts` captures selected files, `long-task-context-authority.ts` normalizes legacy snapshots and compares Controlling Context, `long-task-authority-materials.ts`/`long-task-authority-material-diff.ts` distinguish supporting-only revisions, and `long-task-progress.ts` binds Progress to the controlling projection.
- Mandatory Source marker parsing/inventory/text, exact Risk Fact/Outcome metadata, Non-completing targets, unified Outcome/Global Acceptance references and canonical-target continuity: `long-task-source-item-parser.ts`, `long-task-source-inventory.ts`, `long-task-acceptance-reference.ts`, `long-task-source-target-index.ts`, `long-task-source-target-continuity.ts`, `long-task-source-continuity.ts`, `long-task-source-shape.ts`, `long-task-source-claim-validation.ts`.
- Shared read-only Preflight/static Compile safety and repair diagnostics: `long-task-activation-validation.ts`, `long-task-authoring-preflight.ts`, `long-task-authoring-preflight-diagnostics.ts`, `long-task-authoring-preflight-repair-order.ts`, `long-task-delivery-compiler.ts`, `long-task-delivery-preflight.ts`. The former duplicated repository-preflight module is retired.
- Claim/operator/all-of proof, shared proof-surface parsing, adapter/Raw Execution Observation ownership, Outcome/Global Counterfactual-to-Binding and structured/weak-Playwright sensitivity policy, authority field policy, planned-path validation, paths/risk and runner freeze: `long-task-claims.ts`, `long-task-claim-proof-policy.ts`, `long-task-required-proof-surfaces.ts`, `long-task-evidence-adapter-policy.ts`, `long-task-observation-ownership.ts`, `long-task-counterfactual-claim-policy.ts`, `long-task-evidence-sensitivity-policy.ts`, `long-task-authority-policy.ts`, `long-task-check-execution-policy.ts`, `long-task-delivery-preflight.ts`, `long-task-runner-freeze.ts`, `long-task-risk.ts`, `long-task-paths.ts`.
- Context graph snapshot/path containment/stable JSON utilities are shared package primitives and must not depend on retired runtime.

## Evidence Kernel

- Workspace snapshot and declared command execution: `long-task-workspace.ts`, `long-task-check-runner.ts`, `long-task-runner-environment.ts`, `long-task-check-evidence-decoder.ts`.
- Declared-only single-AC-per-Test multi-project Playwright decoding, report/instance diagnostics, exact exit-one Counterfactual classification, detailed assertion evaluation, per-Check review artifacts, passed-Check-only Claim/Population proof and Binding/value-sensitive Counterfactual evaluation: `long-task-playwright-evidence.ts`, `long-task-playwright-counterfactual-policy.ts`, `long-task-check-evidence-decoder.ts`, `long-task-assertions-v2.ts`, `long-task-artifacts.ts`, `long-task-evidence-v2.ts` and the declared-surface-only `long-task-counterfactual-sandbox.ts`.
- Common-dir Active Authority V3 snapshot, old-V2 manual-required boundary, task/revision/identity marker, CAS commit, compiled-cache projection, Authority Revision and audit state: `long-task-state.ts`.
- Scoped progress, precise Source/Claim/AC findings, status/resume/explain/doctor, targeted verification, stateless scope-only candidate exercise and Live Final Gate: `long-task-verifier-v2.ts`, `long-task-authority-revision-diagnosis.ts`, `long-task-progress.ts`, `long-task-status-v2.ts`, `long-task-final-v2.ts`, `long-task-freshness.ts`.
- Package-owned Hook entry/install/preflight and exact entry-level cleanup: `src/long-task-hook.ts`, `long-task-hook-install.ts`, `long-task-hook-preflight.ts`.
- No active module may import Campaign, SFC, Packet, Codex/AppServer, persistent model routing/checkpoint state, process identity/tree, parallel-subagent scheduling or Git worktree orchestration.

## Managed Assets And Skills

- Managed source: `.codex/ty-context-managed/**`.
- Packaged assets: `packages/ty-context/assets/**`.
- Source mappings: `packages/ty-context/source-mappings.yaml`.
- Optional Source Plan Skill: `.codex/skills/source-plan-authoring/SKILL.md` and managed/package copies.
- Default Workflow and engineering Skills require manifest routing plus one bounded text search over `project_context/**` before `Context Delta`; this remains guidance, not a search service or persisted index.
- Active Long-Task Skill: `.codex/skills/long-task-workflow/SKILL.md` and managed/package copies; it owns the one-time post-Authority-Lock model choice, no automatic model switch/persistent model state, no proactive parallel-subagent scheduling, live `Context Delta`, current-execution target-runtime proof, coalesced rolling runtime feedback and exact progress/final-status reporting. Its Contract-authoring, Evidence-design and Authority-lifecycle references own the detailed boundaries.
- Retirement pointer: `.codex/skills/normal-long-task/SKILL.md` and managed/package copies.
- Source-workspace authoring Skill: `.codex/skills/authoring/harness_package_design/SKILL.md`.

## Tests

- Delivery Contract Compact/parser/compiler/risk/preflight/Source-target/AC coverage: `tests/ty-context/long-task-delivery-*.test.mjs` plus `long-task-closure-invariants.test.mjs`, `long-task-source-authority-closure.test.mjs` and focused authoring/Requirement/Observation tests.
- Semantic authority, revision classification/diagnosis/approval UX, Context evolution, field completeness, conservative pattern containment/overlap and Global Claim coverage: `long-task-context-authority-topology.test.mjs`, `long-task-semantic-authority-revision.test.mjs`, `long-task-authority-revision-classification.test.mjs`, `long-task-authority-revision-diagnosis.test.mjs`, `long-task-context-evolution.test.mjs`, `long-task-authority-field-completeness.test.mjs`, `long-task-pattern-containment.test.mjs`, `long-task-pattern-overlap.test.mjs`, `long-task-global-claim-coverage.test.mjs`.
- Focused closure: `long-task-global-evidence-sensitivity.test.mjs`, `long-task-source-risk-binding.test.mjs`, `long-task-non-completing-source.test.mjs`, `long-task-playwright-trust-boundary.test.mjs`, `long-task-planned-counterfactual.test.mjs`, `long-task-public-contract-example.test.mjs` and `long-task-release-tarball-contract.test.mjs`.
- CLI/Evidence Kernel/Stop real temporary-Git black box: `tests/ty-context/long-task-workflow-*.test.mjs`.
- One-time first-Compile model choice: `tests/ty-context/long-task-model-choice-checkpoint.test.mjs`.
- Default Context discovery guidance and generated parity: `tests/ty-context/workflow-contract-routing.test.mjs`.
- Profile/init/sync/upgrade/package assets: existing focused profile/package/upgrade tests updated for `long-task`.
- Source Plan Skill contract and parity: `tests/ty-context/source-plan-authoring-skill.test.mjs`.
- Controlling objective, Draft lifecycle, Outcome decomposition, live target-runtime/rolling-feedback guidance and mechanism-admission consistency: `tests/ty-context/long-task-design-context.test.mjs`.
- Efficiency boundaries and affected routing: `tools/test_suite_policy.mjs` owns the canonical focused/Trust lists; `tools/affected_change_discovery.mjs` owns explicit/local/CI change sources; `tools/affected_test_selection.mjs` owns fail-safe tier selection; `tools/run_affected_tests.mjs` executes the plan; `tests/ty-context/affected-change-discovery.test.mjs`, `affected-test-selection.test.mjs` and `long-task-efficiency-design.test.mjs` prove the boundaries.
- Adversarial suites: `long-task-active-authority-continuity.test.mjs`, `long-task-authority-adversarial.test.mjs`, `long-task-assertion-safety.test.mjs`, `long-task-schema-parser-parity.test.mjs`, `long-task-counterfactual-integrity.test.mjs`, `long-task-playwright-ac-evidence.test.mjs`, `long-task-runner-freeze-v2.test.mjs`, `long-task-final-closure-mutation-smoke.test.mjs`, population/environment and Hook relocation tests.
- Suite partitioning and timing: `tests/ty-context/run-package-suite.mjs` emits ephemeral `test-suite-timing-v1`; root scripts expose `test:affected`, `test:long-task:focused`, `test:long-task:trust` and `test:delivery-contract:focused`; package `test:trust:built` runs complete default plus canonical Long-Task Trust coverage for PRs, while `test:built`/`npm test` retains complete release coverage for `main` and publish.
- Consumer/package smoke: `tools/quickstart_smoke.mjs`, `tools/release_tarball_smoke.mjs`, reusable `tools/release_tarball_smoke_fixture.mjs`, `long-task-release-tarball-contract.test.mjs`, `npm run preview:pack`.

## Release And Documentation

- Version sync: `tools/sync_release_version.mjs`.
- Release prepare/publish: `tools/release_prepare.mjs`, `tools/release_publish.mjs`, compatibility wrapper `tools/release_npm.mjs`.
- Trusted artifact handoff: `.github/workflows/npm-publish.yml` owns the one-prepare/one-publish job graph; `tools/workflow_release_artifact.mjs` records the runtime artifact and source commit; `tools/verify_workflow_release_artifact.mjs` verifies the downloaded tarball before publication; `tools/publish_prepared_artifact.mjs` makes same-integrity retries safe; `tools/release_artifact_identity.mjs` owns CRLF/LF-stable lockfile identity and separates source identity from build-environment provenance.
- Release behavior tests: `tests/ty-context/workflow-release-artifact.test.mjs`, `release-flow-scripts.test.mjs`, `launch-readiness-script.test.mjs`, `launch-unblock-script.test.mjs` and `launch-next-steps-script.test.mjs`.
- Public docs: `README.md`, `README.zh-CN.md`, `packages/ty-context/README.md`.
- Stable design: `PROJECT_SPEC.md`; durable source-workspace facts: `project_context/**`.
