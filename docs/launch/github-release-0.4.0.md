# GitHub Release Packet: 0.4.0

Snapshot date: 2026-07-12.

Use this packet only after the separately authorized byte-identical `project-tiny-context-harness@0.4.0` publication. Until then, 0.4.0 is a prepared release candidate, not the current public package line.

## Release Fields

Tag:

```text
v0.4.0
```

Target:

```text
Use the commit that bumps `packages/ty-context/package.json` to 0.4.0 and is published to npm.
```

Title:

```text
Project Tiny Context Harness 0.4.0
```

Update Mode: `manual-required`

Allowed modes: `sync-only`, `upgrade-required`, `manual-required`.

## Upgrade Impact

Upgrade Impact: `manual follow-up required`.

Release preparation classified this version as `manual-required`: automatic upgrade is insufficient for the full user-project change, and the release body must tell users which `manual_required` items to inspect or change after `ty-context upgrade --check`.

Composite workflow users must regenerate V1/V2 packets and authorities as Contract V3, start from a fresh workdir, and remove any reviewed legacy project `.codex/hooks.json` / `.codex/hooks/long-task-hook.mjs` configuration. There is no importer, alias, dual read or silent conversion. Strict execution additionally requires the administrator-installed signed 0.4.0 Host Gate release; repository, user and plugin Hooks are never a fallback.

## Release Body

````markdown
Project Tiny Context Harness 0.4.0 is the audited Contract V3 release under the renamed npm package:

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

For Composite Long-Task users, automatic upgrade is insufficient: regenerate V1/V2 packets and authorities as Contract V3, use a fresh workdir, review and remove legacy repository Hook configuration, and install the signed 0.4.0 Host Gate with administrator authorization. Observation V1 and repo-local Hook authority are not supported.

## What Changed

- Publishes `project-tiny-context-harness@0.4.0` with the synchronized package assets and CLI build.
- Replaces the Composite executor with strict Contract V3: complete Requirement → PI → Obligation → Binding → AC → Proof → Spec → Counterfactual coverage, Harness-evaluated Observation V2, frozen Oracle closure, sealed dependency/browser sandboxes and one fixed final recomputation.
- Seals first authority in the workspace-external Host registry and requires the managed-only Codex Stop Gate; project/user/plugin Hooks and repository pointers cannot authorize completion.
- Adds the structured 60-case real CLI/managed-Hook matrix, six real dependency consumers, Windows/Linux release blockers, macOS compatibility, and the separately released integrity-pinned external audit.
- Rejects V1/V2 authorities, Scope Fit V2/slice fields, Observation V1, old workdirs and repo Hook trust without an importer or compatibility alias.
- Keeps the install path on the renamed package: `project-tiny-context-harness`.
- Adds a recoverable `ty-context upgrade` path for older `sdlc-harness` / `pjsdlc_managed` installations, with conflicts and overrides reported as manual follow-up instead of guessed.
- Keeps the core positioning tight: minimal repo-native project memory for AI coding agents.
- Keeps the Minimal Context boundary explicit: `AGENTS.md` is the startup router, `project_context/**` keeps durable recovery facts, and `validate-context` checks recoverability.
- Makes package updates explicit through release update modes: `sync-only`, `upgrade-required`, `manual-required`.
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
node tools/github_release_publish.mjs --version 0.4.0
```

The npm Trusted Publishing workflow runs this automatically for real publish runs. Dry runs do not create or edit GitHub releases.

## Manual UI Fallback

1. Open `https://github.com/Seven128/project-tiny-context-harness/releases/new`.
2. Choose tag `v0.4.0`.
3. Confirm the target is the commit that was published to npm for `project-tiny-context-harness@0.4.0`.
4. Use title `Project Tiny Context Harness 0.4.0`.
5. Paste the release body above.
6. Publish the release.
7. Run `npm run launch:strict-external`.

## Do Not

- Do not retarget `v0.4.0` after the npm publish; it should point to the commit used by the published package.
- Do not claim benchmark wins or adoption in the release.
- Do not mark this as a pre-release if npm `project-tiny-context-harness@0.4.0` remains live and installable.
- Do not rebuild or repack after audit; npm publication must consume the byte-identical attested tarball whose exact commit passed `external-long-task-audit`.
