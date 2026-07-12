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
  - Use after changing V3 campaign/packet schemas, store security, deterministic V3 YAML render, graph/binding/proof/counterfactual preflight, handoff/start/result behavior or the managed preparation Skill.
  - Expected signal: Node exits with no failing subtests across path/redaction/atomic recovery, V3 full-graph/oracle preflight, Goal-free handoff, explicit binding and current signed-final-result projection.
- `node packages/ty-context/dist/cli.js package sync-source` twice, then `node packages/ty-context/dist/cli.js package check-source`
  - Use after changing canonical managed Skills, AGENTS guidance, managed Host Gate assets or public README sources.
  - Expected signal: the first sync copies canonical assets, the second reports `changed=0`, and check-source reports no drift; a following workspace `sync` installs the generated Skill without creating or scanning campaigns.
- `node --test tests/ty-context/long-task-contract-v3*.test.mjs tests/ty-context/long-task-observation-v2.test.mjs tests/ty-context/long-task-binding*.test.mjs tests/ty-context/long-task-counterfactual*.test.mjs`
  - Use after changing V3 YAML/full graph coverage, actual-only observation operators/population, implementation bindings, proof projection or counterfactual sensitivity.
  - Expected signal: every malformed/under-covered/unrelated/self-signed/constant-success fixture is rejected or `needs_work`, while the real implementation fixture passes and its declared counterfactual flips.
- `node --test tests/ty-context/long-task-oracle-bundle*.test.mjs tests/ty-context/long-task-dependency*.test.mjs tests/ty-context/long-task-sandbox*.test.mjs tests/ty-context/long-task-artifact-trust.test.mjs`
  - Use after changing Node bundle closure, exact command adapters, dependency/browser layers, Host secret/redaction, OS sandbox, snapshots or artifact collection.
  - Expected signal: transitive/dynamic/native/unfrozen/escape/secret attacks fail and real npm/monorepo/Vitest/Jest/Playwright/build consumers run through sealed layers.
- `node --test tests/ty-context/long-task-host*.test.mjs tests/ty-context/composite-long-task-managed-hook*.test.mjs tests/ty-context/long-task-environment-probe.test.mjs tests/ty-context/long-task-final-v3*.test.mjs`
  - Use after changing workspace-external registry, attestations/journal/recovery, Managed requirements/Hook heartbeat, blocker probes, fixed final ordering, durable result or Stop semantics.
  - Expected signal: recompile/rebind/pointer deletion/disabled or non-managed Hook/forged result/unprobed blocker attacks cannot accept; ordinary no-active Hook calls are no-op; Windows/Linux real managed smokes pass.
- `node --test tests/ty-context/long-task-host-gate-cli.test.mjs tests/ty-context/long-task-managed-host-install.test.mjs`
  - Use after changing the public administrator-only Host Gate lifecycle surface, signed release archive parsing or OS installer behavior.
  - Expected signal: the official archive installs in an isolated admin test namespace, tampered/path-traversal/link/special/foreign-target archives fail before mutation, uninstall refuses an active registry, and no registry close/reset/key-management command appears in the project CLI.
- `node --test tests/ty-context/composite-long-task-v3-black-box.test.mjs`
  - Durable Contract V3 release blocker for the structured manifest under `tests/ty-context/fixtures/composite-long-task-v3/**`.
  - Expected signal: every manifest case constructs a temporary Git repository and executes the installed candidate CLI/Host/Hook; source-regex, case-name and file-existence security proof is rejected; only the real happy path reaches final and Stop-time `accepted`.
- `node tools/external_long_task_audit.mjs --candidate-tarball <exact-audited-package.tgz> --host-release <pre-signed-target-host.tgz> --host-release-sha256 <sha256> --result <provisional-result.json>`
  - Required for Harness self-development release candidates after the candidate tarball is packed once.
  - Expected signal: the independently versioned/integrity-pinned external runner verifies the exact tarball and pre-signed target Host release on Windows/Linux, runs candidate build/CLI/Hook processes under a disposable non-administrator identity with protected audit/Host/key/result paths and no residual same-identity process, and returns an all-cases/consumer pass signed only by a disposable key locally; candidate-owned tests cannot substitute. The protected external workflow then validates the complete payload on a fresh signer job and applies the durable signature without exposing either durable private key to candidate execution.
- Old V2 assertion/state/derived/equivalence/source-regex tests are removed. Durable false-completion semantics belong only in the real V3 black-box matrix; do not restore an equivalence or compatibility gate.
- `git diff --check`
  - Use before handoff to catch whitespace and conflict marker issues.
  - Expected signal: no whitespace error output.
- `npm test --workspace project-tiny-context-harness`
  - Use for broader package behavior changes or when focused tests do not cover the touched package surface.
- `node tools/consumer_lab_full_test.mjs --candidate-tarball <exact.tgz> --candidate-sha256 <sha256> --external-result <signed-result.json> --reset-lab`
  - Use for Contract V3 release candidates. The clean consumer must install the exact packed artifact, verify the signed 8+6 independent result, run init/doctor/two idempotent syncs/upgrade/validators and the public V3 CLI surface, and confirm no repository Hook fallback or obsolete packaged trust asset exists.
- `node tools/prepare_host_release_artifact.mjs --version 0.4.0 --target <windows-x64|linux-x64|macos-x64|macos-arm64> ...`
  - Use only after final Rust and managed Hook/worker sources are stable. It verifies the private root matches the pinned public root without exposing the key, signs a platform/architecture-bound manifest and emits a deterministic Host release archive plus hash metadata for the release packet.
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
- Contract V3 release acceptance treats Windows and Linux managed Host/consumer/external-audit jobs as hard blockers. macOS remains a first-class compatibility job and must not be documented as strict when its required sandbox capability is unavailable.
- Pack the candidate once and use that byte-identical tarball for local black-box, consumer and external audit evidence; a repack invalidates cross-gate identity.
- Do not run `package sync-source` for source-workspace `project_context/**`-only changes unless package-managed assets were also touched.
- Verification Context records repeatable paths and expected signals only. Do not add one-off logs, raw command output, temporary JSON, CI artifacts, release ledgers, secrets or result claims.
