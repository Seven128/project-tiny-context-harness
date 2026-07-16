---
context_role: verification
read_policy: default
---
# Harness Package Verification

## Focused Gates

- `npm run format:check`: TypeScript formatting.
- `npm run typecheck --workspace project-tiny-context-harness`: type safety after schema/state/CLI/profile changes.
- `npm run build --workspace project-tiny-context-harness`: compiled package and CLI.
- `npm run test:delivery-contract --workspace project-tiny-context-harness`: strict parser, generated ids, Context/source/path/runner/proof preflight, risk floor and scope escalation tests. Small-fixture compile target is under two seconds.
- `npm run test:long-task-workflow --workspace project-tiny-context-harness`: targeted verify/status/resume/final/Stop/profile/consumer workflow tests. Focused loop target is under five minutes; complete workflow suite under fifteen minutes.
- `npm run test:long-task-performance --workspace project-tiny-context-harness`: independent 10k tracked/100 untracked Git matrix with status/resume/compile/Snapshot/Stop budgets.
- Long-task tests explicitly cover V2 Claim Coverage, Bundle normalization, immutable baseline, concrete authority-reduction revision reasons/risk downgrade, Assertion fail-closed behavior, protected symlink/hardlink inputs, scoped progress, forged Receipt/cache resistance, common-dir binding, Counterfactual/Population/minimal-Environment V2, runner freeze, Live Final Gate and package-owned Hook migration.

## Full Gates

- `npm test`: complete default plus Long-Task Workflow package suite; no real Codex, AppServer, external service, VM, browser matrix or worktree farm.
- `npm run smoke:quickstart`: clean temporary consumer init/enable/sync/upgrade behavior.
- `npm run preview:pack`: clean pack preview and content assertions.
- `npm run launch:check`: offline launch-surface consistency.
- `node packages/ty-context/dist/cli.js package sync-source` twice, then `package check-source`: idempotent managed-source/package parity.
- `make validate-harness`: Context recoverability plus touched-source modularity.
- `git diff --check`: whitespace/conflict-marker gate.

## Controlled Real CLI Smoke

A real temporary Git repository must prove:

1. initialize and compile one two-Outcome Delivery Contract;
2. first Outcome targeted verify passes and second fails;
3. two self-consistent forged Receipts and a recomputed cache cannot accept; Stop executes both Checks and rejects;
4. after implementation repair, both targeted verify and one-snapshot Final Gate pass;
5. source code drift makes Stop reject;
6. restoring/committing code lets Stop or close run the Live Gate and clear binding;
7. no campaign/SFC/Packet/Codex worker/extra worktree/branch/model retry was created.

## Required Coverage

- Schema/preflight: V2 only, V1 retirement, generated Product/Control/Non-completing/Obligation/Shortcut Claims, unknown/cross-Outcome refs, owner/binding boundaries, duplicate keys and UI browser proof.
- Risk: standard baseline; security/permission/migration/persistent/public-schema/full-population triggers; explicit strict upgrade; below-floor rejection; trigger-specific strict proof; actual path/boundary escalation.
- Verification: two-Outcome success/failure, targeted non-acceptance, raw-command/per-Check evidence split, artifacts, zero/all-skipped Playwright rejection, structured environment probes, exact Counterfactual failure and entity Population proof.
- Recovery/authority: audit-only status/Receipt/cache, source-recompiled Stop/close, malformed/mismatched active state fail-closed, atomic binding clear, read-only resume and no process/branch/worktree mutation.
- Platform boundary: fake executable observation proves no Codex/AppServer/agent/worktree/branch/merge/push/PR/model retry and Final Gate invokes only declared checks.
- Distribution: enable/disable, safe profile migration, historical-file preservation, no retired runtime in new consumer/tarball, source mappings, English/Chinese/package README alignment, version parity and Windows paths.

## Evidence Rules

- Tests/Context validators prove only their named property. They do not prove product completeness.
- Targeted verify is repair evidence only. Acceptance comes only from the currently executing source-recompiled Live Final Gate; no stored result is reusable authority.
- Store no one-off logs, reports, raw evidence, secrets or release ledgers in Context.
