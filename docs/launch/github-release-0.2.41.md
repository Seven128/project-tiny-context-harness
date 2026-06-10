# GitHub Release Packet: 0.2.41

Snapshot date: 2026-06-10.

Use this packet to create the GitHub Release for the current public `project-tiny-context-harness` npm package line.

## Release Fields

Tag:

```text
v0.2.41
```

Target:

```text
dfda8fd2c07143fca137aa609a28a5eb6d8a6697
```

Title:

```text
Project Tiny Context Harness 0.2.41
```

## Release Body

````markdown
Project Tiny Context Harness 0.2.41 is the current public release line under the renamed npm package:

```sh
npm install -D project-tiny-context-harness@latest
npx --yes --package project-tiny-context-harness@latest sdlc-harness init
make validate-context
```

## What Changed

- Publishes `project-tiny-context-harness@0.2.41` through npm Trusted Publishing.
- Refreshes the npm README so the live package page matches the renamed Project Tiny Context Harness surface.
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
2. Choose tag `v0.2.41`.
3. Confirm the target is `dfda8fd2c07143fca137aa609a28a5eb6d8a6697`.
4. Use title `Project Tiny Context Harness 0.2.41`.
5. Paste the release body above.
6. Publish the release.
7. Run `npm run launch:strict-external`.

## Do Not

- Do not retarget `v0.2.41` after the npm publish; it should point to the commit used by the published package.
- Do not claim benchmark wins or adoption in the release.
- Do not mark this as a pre-release if npm `project-tiny-context-harness@0.2.41` remains live and installable.
