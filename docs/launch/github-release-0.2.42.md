# GitHub Release Packet: 0.2.42

Snapshot date: 2026-06-12.

Use this packet to create the GitHub Release for the current public `project-tiny-context-harness` npm package line.

## Release Fields

Tag:

```text
v0.2.42
```

Target:

```text
Use the commit that bumps `packages/sdlc-harness/package.json` to 0.2.42 and is published to npm.
```

Title:

```text
Project Tiny Context Harness 0.2.42
```

## Release Body

````markdown
Project Tiny Context Harness 0.2.42 is the current public release line under the renamed npm package:

```sh
npm install -D project-tiny-context-harness@latest
npx --yes --package project-tiny-context-harness@latest sdlc-harness init
make validate-context
```

## What Changed

- Publishes `project-tiny-context-harness@0.2.42` through npm Trusted Publishing.
- Adds boundary-review guidance to the product planning and development engineer Skills.
- Keeps the install path on the renamed package: `project-tiny-context-harness`.
- Keeps the core positioning tight: minimal repo-native project memory for AI coding agents.
- Keeps the Minimal Context boundary explicit: `AGENTS.md` is the startup router, `project_context/**` keeps durable recovery facts, and `validate-context` checks recoverability.
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

## Manual UI Path

1. Open `https://github.com/Seven128/project-tiny-context-harness/releases/new`.
2. Choose tag `v0.2.42`.
3. Confirm the target is the commit that was published to npm for `project-tiny-context-harness@0.2.42`.
4. Use title `Project Tiny Context Harness 0.2.42`.
5. Paste the release body above.
6. Publish the release.
7. Run `npm run launch:strict-external`.

## Do Not

- Do not retarget `v0.2.42` after the npm publish; it should point to the commit used by the published package.
- Do not claim benchmark wins or adoption in the release.
- Do not mark this as a pre-release if npm `project-tiny-context-harness@0.2.42` remains live and installable.
