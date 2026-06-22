# GitHub Release Packet: 0.2.67

Snapshot date: 2026-06-22.

Use this packet to create the GitHub Release for the current public `project-tiny-context-harness` npm package line.

## Release Fields

Tag:

```text
v0.2.67
```

Target:

```text
Use the commit that bumps `packages/ty-context/package.json` to 0.2.67 and is published to npm.
```

Title:

```text
Project Tiny Context Harness 0.2.67
```

Update Mode: `sync-only`

Allowed modes: `sync-only`, `upgrade-required`, `manual-required`.

## Release Body

````markdown
Project Tiny Context Harness 0.2.67 is the current public release line under the renamed npm package:

```sh
npm install -D project-tiny-context-harness@latest
npx --yes --package project-tiny-context-harness@latest ty-context init
make validate-context
```

Update mode: `sync-only`. After updating the package, run:

```sh
npx --yes --package project-tiny-context-harness@latest ty-context upgrade --check
npx --yes --package project-tiny-context-harness@latest ty-context upgrade
```

This release mode means no new release migration is expected. Direct `sync` is an allowed shortcut only when you explicitly want managed-asset refresh without upgrade diagnostics:

```sh
npx --yes --package project-tiny-context-harness@latest ty-context sync
```

Sync does not run migrations. Upgrade plans report `safe_pending`, `manual_required` and `blocked`.

## What Changed

- Publishes `project-tiny-context-harness@0.2.67` with the synchronized package assets and CLI build.
- Keeps the install path on the renamed package: `project-tiny-context-harness`.
- Replaces the broad plan-acceptance Skill with explicit `/normal-long-task` and `/superpowers-long-task` Skills so long-running task acceptance and Superpowers prompt adaptation stay separate.
- Keeps long-task artifacts temporary under `tmp/ty-context/plan-acceptance/**`; they define acceptance targets and prompts but do not execute plans or prove completion.
- Changes Source Pack exports to write only `tmp/ty-context/context-exports/latest/` and remove old timestamped export rounds by default.
- Adds `project overall context` / `项目整体上下文` as an explicit full-project export trigger while keeping export artifacts out of durable Context.
- Keeps the core positioning tight: minimal repo-native project memory for AI coding agents.
- Keeps the Minimal Context boundary explicit: `AGENTS.md` is the startup router, `project_context/**` keeps durable recovery facts, and `validate-context` checks recoverability.
- This release is marked `sync-only`: no new migration is expected, `ty-context upgrade --check` / `ty-context upgrade` remain the default post-update diagnostic path, and direct `sync` is only the managed-asset refresh shortcut.
- Keeps the old stage-based Tiny Context workflow out of the default package surface.

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
node tools/github_release_publish.mjs --version 0.2.67
```

The npm Trusted Publishing workflow runs this automatically for real publish runs. Dry runs do not create or edit GitHub releases.

## Manual UI Fallback

1. Open `https://github.com/Seven128/project-tiny-context-harness/releases/new`.
2. Choose tag `v0.2.67`.
3. Confirm the target is the commit that was published to npm for `project-tiny-context-harness@0.2.67`.
4. Use title `Project Tiny Context Harness 0.2.67`.
5. Paste the release body above.
6. Publish the release.
7. Run `npm run launch:strict-external`.

## Do Not

- Do not retarget `v0.2.67` after the npm publish; it should point to the commit used by the published package.
- Do not claim benchmark wins or adoption in the release.
- Do not mark this as a pre-release if npm `project-tiny-context-harness@0.2.67` remains live and installable.
