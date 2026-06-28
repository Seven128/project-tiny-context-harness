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
  - Use after changing Superpowers canonical task state, derived view generation, slice/epoch/final gates or state-backed plan-acceptance validation.
  - Expected signal: command exits with no errors for a consistent state workdir and reports blocking source hash, evidence, proof-layer, derived-drift or completion-rule errors for inconsistent state.
- `node --test tests/ty-context/superpowers-task-state.test.mjs tests/ty-context/superpowers-task-derive.test.mjs tests/ty-context/superpowers-task-validator.test.mjs tests/ty-context/superpowers-long-task-state-skill.test.mjs`
  - Use after changing the Superpowers long-task state kernel or managed Skill state-kernel prompt rules.
  - Expected signal: Node test runner exits with no failing subtests.
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
- `node packages/ty-context/dist/cli.js package check-source`
  - Use after source sync or when checking package asset drift.

## Scope Notes

- Context-only source-workspace topology changes normally require `validate-context`, the relevant focused test, `make validate-harness` and `git diff --check`.
- Do not run `package sync-source` for source-workspace `project_context/**`-only changes unless package-managed assets were also touched.
- Verification Context records repeatable paths and expected signals only. Do not add one-off logs, raw command output, temporary JSON, CI artifacts, release ledgers, secrets or result claims.
