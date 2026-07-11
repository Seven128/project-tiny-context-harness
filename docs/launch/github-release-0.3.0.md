# GitHub Release Packet: 0.3.0

Snapshot date: 2026-07-11.

Use this packet to create the GitHub Release for the current public `project-tiny-context-harness` npm package line.

## Release Fields

Tag:

```text
v0.3.0
```

Target:

```text
Use the commit that bumps `packages/ty-context/package.json` to 0.3.0 and is published to npm.
```

Title:

```text
Project Tiny Context Harness 0.3.0
```

Update Mode: `manual-required`

Allowed modes: `sync-only`, `upgrade-required`, `manual-required`.

## Upgrade Impact

Upgrade Impact: `manual follow-up required`.

Release preparation classified this version as `manual-required`: automatic upgrade is insufficient for the full user-project change, and the release body must tell users which `manual_required` items to inspect or change after `ty-context upgrade --check`.

The manual item for 0.3.0 is the one-time repository Hook trust/smoke confirmation plus regeneration of V2 YAML authorities. It is not a legacy runtime migration.

## Release Body

````markdown
Project Tiny Context Harness 0.3.0 is the current public release line under the renamed npm package:

```sh
npm install -D project-tiny-context-harness@latest
npx --yes --package project-tiny-context-harness@latest ty-context init
make validate-context
```

Update mode: `manual-required`. After updating the package, run:

```sh
npx --yes --package project-tiny-context-harness@latest ty-context upgrade --check
npx --yes --package project-tiny-context-harness@latest ty-context upgrade
```

Use `sync` directly only for releases explicitly marked `sync-only`; sync does not run migrations. Upgrade plans report `safe_pending`, `manual_required` and `blocked`.

Publishing a new npm version does not automatically migrate existing repositories. Users receive new upgrade behavior only when they run the newly published CLI through `ty-context upgrade`, `ty-context sync` or another `@latest` package invocation.

## What Changed

- Publishes `project-tiny-context-harness@0.3.0` with the synchronized package assets and CLI build.
- Replaces the composite long-task runtime with the breaking V2 YAML contract, independent active verifier, one-snapshot full final gate and mandatory Codex lifecycle/Stop enforcement.
- Removes the old command/evidence/task-state/slice/epoch/derived runtime and its execution-method dependency; agent planning, native subagents, TDD and review remain implementation choices rather than completion proof.
- Makes `/composite-long-task-workflow` explicit-only and leaves ordinary questions and bug work untouched.
- Adds verifier-owned findings, trusted external-blocker classification, repository-bound active-state mirroring and Stop-time full re-verification before Codex may report completion.
- Keeps the install path on the renamed package: `project-tiny-context-harness`.
- Keeps the core positioning tight: minimal repo-native project memory for AI coding agents.
- Keeps the Minimal Context boundary explicit: `AGENTS.md` is the startup router, `project_context/**` keeps durable recovery facts, and `validate-context` checks recoverability.
- Makes package updates explicit through release update modes: `sync-only`, `upgrade-required`, `manual-required`.
- Keeps the old stage-based Tiny Context workflow out of the default package surface.

## Breaking Composite Migration Boundary

- V1/Markdown authorities, old composite campaigns/workdirs, `task-state.json`, agent-registered evidence and historical final cards are unsupported and are not imported.
- Regenerate `product-architecture-source.yaml`, `technical-realization-plan.yaml` and `acceptance-checklist.yaml`, then run a fresh `compile`, `verify` and `final-gate`.
- Run `ty-context sync`, approve the repository `.codex/hooks.json` trust prompt once, and let a Stop Hook smoke heartbeat occur before starting strict execution. `host_completion_gate_unavailable` is intentional until this trust root exists.
- The package does not remove or disable user-global plugins. `doctor` only reports an opt-in disable location when the user wants to change their global setup.
- Release preparation writes `docs/launch/release-artifact-0.3.0.json` and the prepared tarball. Local or Trusted Publishing must verify that SHA-256 and publish the matching tarball path; repacking without a byte-for-byte hash match is rejected.

## Boundary

This release does not claim benchmark-proven speedups, production adoption, awards, or replacement of tests, CI, review, specs or project management. It packages the smaller recovery surface: keep the memory, drop the ceremony.

## Useful Links

- npm: https://www.npmjs.com/package/project-tiny-context-harness
- README: https://github.com/Seven128/project-tiny-context-harness#readme
- Fresh-agent recovery walkthrough: https://github.com/Seven128/project-tiny-context-harness/blob/main/docs/examples/fresh-agent-recovery.md
- Minimal Context sample: https://github.com/Seven128/project-tiny-context-harness/blob/main/docs/examples/minimal-context-sample.md
- Comparison guide: https://github.com/Seven128/project-tiny-context-harness/blob/main/docs/comparison.md
````

## GitHub Release Automation

After npm publish and registry verification, run:

```sh
node tools/github_release_publish.mjs --version 0.3.0
```

The npm Trusted Publishing workflow runs this automatically for real publish runs. Dry runs do not create or edit GitHub releases.

## Manual UI Fallback

1. Open `https://github.com/Seven128/project-tiny-context-harness/releases/new`.
2. Choose tag `v0.3.0`.
3. Confirm the target is the commit that was published to npm for `project-tiny-context-harness@0.3.0`.
4. Use title `Project Tiny Context Harness 0.3.0`.
5. Paste the release body above.
6. Publish the release.
7. Run `npm run launch:strict-external`.

## Do Not

- Do not retarget `v0.3.0` after the npm publish; it should point to the commit used by the published package.
- Do not claim benchmark wins or adoption in the release.
- Do not mark this as a pre-release if npm `project-tiny-context-harness@0.3.0` remains live and installable.
