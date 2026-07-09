---
context_role: verification
read_policy: default
---
# Harness Package Verification

## Verification Paths

- `node packages/ty-context/dist/cli.js validate-context`
  - Use after Context graph, role Context or recovery facts change.
  - Expected signal: command exits with no errors and reports the Context graph files it loaded.
- `node --test tests/ty-context/orientation-fast-path.test.mjs`
  - Use after changing recoverability surfaces, Context topology, managed/default Skill boundaries, README/package README positioning or fast-path orientation expectations.
  - Expected signal: Node test runner exits with no failing subtests.
- `make validate-harness`
  - Composite local gate for Context recoverability and touched-source modularity.
  - Expected signal: Make exits successfully after running the configured Harness gates.
- `node packages/ty-context/dist/cli.js validate-plan-contract <plan.md|dir>`
  - Use after changing workflow-contract plan surface semantics, Source-to-Context Coverage, Context-to-Implementation Binding or plan-contract validator behavior.
  - Expected signal: command exits with no errors, reports source/binding row counts and does not claim product quality.
- `node packages/ty-context/dist/cli.js validate-plan-acceptance tmp/ty-context/plan-acceptance/<slug>`
  - Use after changing long-task matrix/verdict artifact semantics or plan-acceptance validator behavior.
  - Expected signal: command exits with no errors, reports matrix/verdict row counts and rejects contradictory complete claims.
- `node packages/ty-context/dist/cli.js validate-superpowers-state tmp/ty-context/plan-acceptance/<slug>`
  - Use after changing Superpowers-backed composite canonical task state, derived view generation, slice/epoch/final gates, goal rendering or state-backed plan-acceptance validation.
  - Expected signal: command exits with no errors for a consistent state workdir and reports blocking source hash, evidence, assertion, negative-evidence, proof-layer, derived-drift or completion-rule errors for inconsistent state.
- `node --test tests/ty-context/composite-long-task-assertion-gate.test.mjs tests/ty-context/composite-long-task-workflow-skill.test.mjs tests/ty-context/composite-long-task-goal-renderer.test.mjs tests/ty-context/composite-long-task-protocol-snapshot.test.mjs tests/ty-context/composite-long-task-execution-binding.test.mjs tests/ty-context/composite-long-task-state.test.mjs tests/ty-context/superpowers-task-derive.test.mjs tests/ty-context/superpowers-task-validator.test.mjs tests/ty-context/plan-acceptance-skill.test.mjs`
  - Use after changing the composite long-task state kernel, protocol snapshot, execution binding, goal renderer, managed Skill state-kernel prompt rules, README/Context placement wording or runtime-vs-maintenance protocol boundary.
  - Expected signal: Node test runner exits with no failing subtests.
- `node tools/verify_composite_long_task_equivalence.mjs --baseline-sha <sha> --current-sha <sha> --run-id <id>`
  - Use after changing the Composite Long-Task Workflow command namespace, Superpowers compatibility alias, state kernel, strict source parser, delivery-scope semantics, derived views, gates or Goal/protocol runtime contract.
  - Expected signal: the generated equivalence report declares zero semantic and rejected diffs across the required happy-path, full-population, scope-conflict, strict-parse and multi-slice fixtures; one-off reports remain under `tmp/ty-context/composite-equivalence/**` and are not Context.
  - Baseline wording rule: reports must identify whether the baseline is a pure pre-change baseline or a fixed semantic baseline. If a baseline commit includes a semantic correction, separate that correction from carrier/equivalence validation and do not describe the branch as pure verification or as equivalence to earlier buggy behavior.
- `node --test tests/ty-context/composite-long-task-equivalence-golden.test.mjs tests/ty-context/composite-long-task-invariants.test.mjs tests/ty-context/composite-long-task-legacy-alias.test.mjs`
  - Use with the focused composite long-task tests when the equivalence runner, golden snapshots, core invariants or hidden legacy alias behavior changes.
  - Expected signal: Node test runner exits with no failing subtests and the golden fixture comparison reports no semantic drift.
- Strict V2 composite-long-task field/assertion changes also require the strict canonical happy-path fixture and adversarial fixture set to compile, validate and final-gate consistently. HFC-001 focused Trusted Evidence Kernel coverage lives in `tests/ty-context/composite-long-task-trusted-evidence-kernel.test.mjs` and must cover historical complete ignored, stale passed/current failed command, unregistered passed JSON, AC-010 summary-only bootstrap, target AC mismatch, target proof-layer mismatch, source hash mismatch, dirty worktree mismatch, missing assertion result and a current-evidence happy path. HFC-002 focused completion-output hard-gate coverage lives in `tests/ty-context/composite-long-task-completion-output-gate.test.mjs` and must cover final-summary, final-card, matrix/verdict diagnostic pass, final-gate not-run, validator-pass/final-gate-false, audit-complete/acceptance-partial, goal-objective, execution-binding/protocol, false-completion phrase scan and true final-gate accept fixtures. HFC-003 full false-completion regression coverage lives in `tests/ty-context/composite-long-task-false-completion-regression.test.mjs` and `tests/ty-context/fixtures/composite-long-task/false-completion-regression/**`; it must run all manifest fixtures, compare expected final-gate and completion-output outcomes, scan official generated output surfaces for forbidden completion wording under non-accept statuses, include library-level and CLI-level smoke coverage, cover stale evidence, unregistered evidence, historical complete, summary-only bootstrap, derived/matrix/verdict/final-card, validator-only, output mismatch, Harness Drift Lock, scope leakage, missing UI browser proof, missing semantic negative proof and a happy path, and report only a harness regression verdict. HFC-004 final-gate blocker triage coverage lives in `tests/ty-context/composite-long-task-final-gate-triage.test.mjs` and `tests/ty-context/fixtures/composite-long-task/final-gate-triage/**`; it must include library coverage and CLI smoke for current kernel accept with old final/gates/meta blocked bookkeeping, candidate-driven scanner mode, protocol/execution-binding/rule-text allowed wording, machine JSON allowed status fields, current user-visible false completion blocked, missing current evidence not self-recoverable, environment/contract/harness-drift blockers, blocker category and next-action output, and one-pass self-recovery for regenerable generated-output mismatch. The HFC-003 manifest completeness check is a hard gate: any missing required fixture id, missing mini workdir or missing `expected.json` must make `tests/ty-context/composite-long-task-false-completion-regression.test.mjs` fail. The required fixture ids include `missing_boundary_semantic_proof_refresh_catalog` and `missing_boundary_semantic_proof_import_evidence`.
  - Expected signal: `strict-v2-canonical-happy-path` reaches `product_goal_complete=true` only through current-attempt assertion-backed evidence and negative scans, while missing canonical fields, unknown/duplicate/table/list definitions, weak evidence, target mismatches, failed assertions, invalid signals, source drift, worktree drift, stale attempt evidence, historical final-gate events, current Playwright/JUnit/test-result failures, derived/state contradictions, AC-010 summary-only bootstrap, under-specified machine ACs, product-task harness edits, harness-task fixture gaps, protected baseline violations, scope conflicts and audit-only completion claims fail for their specific reasons.
- `git diff --check`
  - Use before handoff to catch whitespace and conflict marker issues.
  - Expected signal: no whitespace error output.
- `npm test --workspace project-tiny-context-harness`
  - Use for broader package behavior changes or when focused tests do not cover the touched package surface.
- `node --test tests/ty-context/release-flow-scripts.test.mjs tests/ty-context/sync-release-version.test.mjs tests/ty-context/launch-unblock-script.test.mjs tests/ty-context/launch-readiness-script.test.mjs tests/ty-context/npm-publish-access-script.test.mjs`
  - Use after changing release preparation/publication automation, release packet generation or launch runbooks that print owner-facing release commands.
  - Expected signal: release preparation remains the only mutating phase, publication stays publish-only, upgrade impact evidence is present in release packets and launch/readiness guidance matches the split flow.
- `npm run release:prepare -- --fast --version patch --update-mode sync-only`
  - Use for ordinary managed Skill, package asset, docs or release metadata patch preparation when no upgrade/migration code changed.
  - Expected signal: the fast gate runs build, package source sync/check, release-version check, `upgrade --check --json`, release-focused tests and `git diff --check`, then prints staged next commands without publishing.
- `node packages/ty-context/dist/cli.js package sync-source`
  - Use only after changing package-managed source assets that should be copied into `packages/ty-context/assets/**`.
  - For release or pre-upgrade closeout, run it twice; the second run must report `changed=0` or an equivalent no-op signal.
- `node packages/ty-context/dist/cli.js package check-source`
  - Use after source sync or when checking package asset drift.

## Scope Notes

- Context-only source-workspace topology changes normally require `validate-context`, the relevant focused test, `make validate-harness` and `git diff --check`.
- Do not run `package sync-source` for source-workspace `project_context/**`-only changes unless package-managed assets were also touched.
- Verification Context records repeatable paths and expected signals only. Do not add one-off logs, raw command output, temporary JSON, CI artifacts, release ledgers, secrets or result claims.
