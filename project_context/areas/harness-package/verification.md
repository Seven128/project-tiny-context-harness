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
- Long-task tests explicitly cover Contract Bundle normalization, Boundary decisions, Source Claims, Authority Lock/immutable baseline, scoped Progress Records, verifier-source/retry safety, clean candidate Final Gates, Child-vs-Set authority, Set integration reruns, external-pending semantics and Hook deduplication.

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
3. Final Gate rejects and historical targeted proof cannot accept;
4. after implementation repair, both targeted verify and one-snapshot Final Gate pass;
5. workspace drift makes Stop reject immediately;
6. restoring/re-running Final Gate returns accepted; close succeeds;
7. no campaign/SFC/Packet/Codex worker/extra worktree/branch/model retry was created.

## Required Coverage

- Schema/preflight: minimum contract, duplicate Outcome/Check keys, invalid Context, missing package script/oracle/Playwright path, unsupported runner, Outcome without executable Check, UI without browser proof, deterministic identity freeze and no handwritten cross-entity ids.
- Risk: standard baseline; security/permission/migration/persistent/public-schema/full-population triggers; explicit strict upgrade; below-floor rejection; trigger-specific strict proof; actual path/boundary escalation.
- Verification: two-Outcome success/failure, targeted non-acceptance, same-snapshot all checks, stale code/Contract/relevant Context/oracle/verifier, unrelated referenced Context stability, in-Gate identity deduplication, Receipt binding and rejection of prose/handwritten/exit-only completion.
- Recovery: status states, read-only resume, no process/branch/worktree mutation, unique task identity, abandon preservation and fresh-only close.
- Platform boundary: fake executable observation proves no Codex/AppServer/agent/worktree/branch/merge/push/PR/model retry and Final Gate invokes only declared checks.
- Distribution: enable/disable, safe profile migration, historical-file preservation, no retired runtime in new consumer/tarball, source mappings, English/Chinese/package README alignment, version parity and Windows paths.

## Evidence Rules

- Tests/Context validators prove only their named property. They do not prove product completeness.
- Targeted verify is repair evidence only. Accepted authority comes from a complete current-snapshot Final Gate and remains valid only while every frozen identity is fresh.
- Store no one-off logs, reports, raw evidence, secrets or release ledgers in Context.
