# GitHub Release Packet: 0.2.53

Snapshot date: 2026-06-12.

Use this packet to create the GitHub Release for the current public `project-tiny-context-harness` npm package line.

## Release Fields

Tag:

```text
v0.2.53
```

Target:

```text
Use the commit that bumps `packages/sdlc-harness/package.json` to 0.2.53 and is published to npm.
```

Title:

```text
Project Tiny Context Harness 0.2.53
```

Update Mode: `manual-required`

Allowed modes: `sync-only`, `upgrade-required`, `manual-required`.

## Release Body

````markdown
Project Tiny Context Harness 0.2.53 is the current public release line under the renamed npm package:

```sh
npm install -D project-tiny-context-harness@latest
npx --yes --package project-tiny-context-harness@latest sdlc-harness init
make validate-context
```

Update mode: `manual-required`. After updating the package, run:

```sh
npx --yes --package project-tiny-context-harness@latest sdlc-harness upgrade --check
npx --yes --package project-tiny-context-harness@latest sdlc-harness upgrade
```

Use `sync` only for releases explicitly marked `sync-only`; sync does not run migrations. Upgrade plans report `safe_pending`, `manual_required` and `blocked`.

## What Changed

- Publishes `project-tiny-context-harness@0.2.53` through npm Trusted Publishing.
- Adds `sdlc-harness check-modularity` as a warning-only source-file line-count audit, with `--fail-on-warning` for projects that intentionally opt into CI enforcement.
- Adds `Modularity Check: none|required|exception` to engineering / RFC / implementation Task Contracts so oversized touched files force split-or-exception reasoning through the existing development engineer decomposition guidance.
- Tightens upgrade safety: `blocked` migration items now stop writes before safe migrations or managed-asset sync, so conflicting targets cannot be partially migrated.
- Keeps the install path on the renamed package: `project-tiny-context-harness`.
- Keeps the core positioning tight: minimal repo-native project memory for AI coding agents.
- Keeps the Minimal Context boundary explicit: `AGENTS.md` is the startup router, `project_context/**` keeps durable recovery facts, and `validate-context` checks recoverability.
- Makes package updates explicit through release update modes: `sync-only`, `upgrade-required`, `manual-required`.
- Keeps the old stage-based SDLC workflow out of the default package surface.

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
node tools/github_release_publish.mjs --version 0.2.53
```

The npm Trusted Publishing workflow runs this automatically for real publish runs. Dry runs do not create or edit GitHub releases.

## Manual UI Fallback

1. Open `https://github.com/Seven128/project-tiny-context-harness/releases/new`.
2. Choose tag `v0.2.53`.
3. Confirm the target is the commit that was published to npm for `project-tiny-context-harness@0.2.53`.
4. Use title `Project Tiny Context Harness 0.2.53`.
5. Paste the release body above.
6. Publish the release.
7. Run `npm run launch:strict-external`.

## Do Not

- Do not retarget `v0.2.53` after the npm publish; it should point to the commit used by the published package.
- Do not claim benchmark wins or adoption in the release.
- Do not mark this as a pre-release if npm `project-tiny-context-harness@0.2.53` remains live and installable.
