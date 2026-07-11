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
- `node --test tests/ty-context/composite-campaign-*.test.mjs tests/ty-context/prepare-composite-long-task-skill.test.mjs`
  - Use after changing V2 campaign schemas/store/security/YAML render/preflight/handoff/start/result behavior or the managed preparation Skill.
  - Expected signal: Node exits with no failing subtests across path/redaction/atomic recovery, V2 obligation/oracle preflight, Goal-free handoff, explicit binding and current-final-result projection.
- `node packages/ty-context/dist/cli.js package sync-source` twice, then `node packages/ty-context/dist/cli.js package check-source`
  - Use after changing canonical managed Skills, AGENTS guidance, protected baseline or public README sources.
  - Expected signal: the first sync copies canonical assets, the second reports `changed=0`, and check-source reports no drift; a following workspace `sync` installs the generated Skill without creating or scanning campaigns.
- `node --test tests/ty-context/long-task-contract-*.test.mjs tests/ty-context/long-task-snapshot.test.mjs tests/ty-context/long-task-command-trust.test.mjs tests/ty-context/long-task-verifier.test.mjs tests/ty-context/long-task-artifact-trust.test.mjs`
  - Use after changing V2 YAML parsing, obligation/negative coverage, Context/oracle/verifier freezing, content snapshots, exact command execution, artifact collection or assertion evaluation.
  - Expected signal: all malformed/under-covered/self-proof fixtures remain non-passing and the canonical contract/verifier fixture passes.
- `node --test tests/ty-context/long-task-impact.test.mjs tests/ty-context/long-task-status.test.mjs tests/ty-context/long-task-final-gate.test.mjs tests/ty-context/composite-long-task-cli-v2.test.mjs`
  - Use after changing impact selection, findings, current status, final all-spec recomputation, public CLI or Goal recovery output.
  - Expected signal: intermediate verify never authorizes acceptance, unmapped changes run all specs, only one complete final snapshot can produce `accepted`, and old commands are unknown.
- `node --test tests/ty-context/composite-long-task-hook-install.test.mjs tests/ty-context/composite-long-task-hook-smoke.test.mjs tests/ty-context/composite-long-task-hook-v2.test.mjs tests/ty-context/long-task-stop-check.test.mjs`
  - Use after changing managed Hook installation, trust heartbeat, active-task binding, SessionStart/PostCompact recovery, Stop enforcement or explicit-only Skill routing.
  - Expected signal: needs-work continues, accepted unchanged exits, stale/false/blocked wording is rejected, unavailable/conflicting Hook blocks start and ordinary prompts remain no-op.
- `node --test tests/ty-context/composite-long-task-v2-regression.test.mjs`
  - Durable V2 release blocker for the complete fixture manifest under `tests/ty-context/fixtures/composite-long-task-v2/**`.
  - Expected signal: every contract/command/artifact/snapshot/final/Hook/legacy-false-completion attack is non-accepted, every required fixture is present, and only `happy_path_accepted` reaches `accepted`.
- Old assertion/state/derived/equivalence tests are removed. Their durable false-completion semantics belong only in the V2 attack manifest; do not restore an equivalence or compatibility gate.
- `git diff --check`
  - Use before handoff to catch whitespace and conflict marker issues.
  - Expected signal: no whitespace error output.
- `npm test --workspace project-tiny-context-harness`
  - Use for broader package behavior changes or when focused tests do not cover the touched package surface.
- `node tools/consumer_lab_full_test.mjs --source-root <repo> --lab-dir <clean-dir> --reset-lab --keep-lab`
  - Use for Composite V2 release candidates. The clean consumer must install the packed artifact, sync and smoke the repository Hook, observe verifier-owned `needs_work`, repair the fixture, reach a one-snapshot `accepted`, pass Stop-time full re-verification and return to ordinary Hook no-op after terminal cleanup.
- `node --test tests/ty-context/release-flow-scripts.test.mjs tests/ty-context/sync-release-version.test.mjs tests/ty-context/launch-unblock-script.test.mjs tests/ty-context/launch-readiness-script.test.mjs tests/ty-context/npm-publish-access-script.test.mjs`
  - Use after changing release preparation/publication automation, release packet generation or launch runbooks that print owner-facing release commands.
  - Expected signal: release preparation remains the only mutating phase, publication stays publish-only, upgrade impact evidence is present in release packets and launch/readiness guidance matches the split flow.
- `npm run release:prepare -- --fast --version patch --update-mode sync-only`
  - Use for ordinary managed Skill, package asset, docs or release metadata patch preparation when no upgrade/migration code changed.
  - Expected signal: the fast gate runs build, package source sync/check, release-version check, `upgrade --check --json`, release-focused tests, creates one immutable prepared tarball plus `docs/launch/release-artifact-<version>.json`, and runs `git diff --check` without publishing. Publication must verify and use the attested byte-identical tarball.
- `node packages/ty-context/dist/cli.js package sync-source`
  - Use only after changing package-managed source assets that should be copied into `packages/ty-context/assets/**`.
  - For release or pre-upgrade closeout, run it twice; the second run must report `changed=0` or an equivalent no-op signal.
- `node packages/ty-context/dist/cli.js package check-source`
  - Use after source sync or when checking package asset drift.

## Scope Notes

- Context-only source-workspace topology changes normally require `validate-context`, the relevant focused test, `make validate-harness` and `git diff --check`.
- Do not run `package sync-source` for source-workspace `project_context/**`-only changes unless package-managed assets were also touched.
- Verification Context records repeatable paths and expected signals only. Do not add one-off logs, raw command output, temporary JSON, CI artifacts, release ledgers, secrets or result claims.
