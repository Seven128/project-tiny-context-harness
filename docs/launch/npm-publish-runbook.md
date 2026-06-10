# npm Publish Runbook

Snapshot date: 2026-06-10.

This runbook exists for the repository rename window. The GitHub repository and package metadata now use Project Tiny Context Harness, but the renamed npm package is not public until `project-tiny-context-harness` has a registry entry.

## Current Registry State

- `npm whoami` returns an authenticated npm user.
- `npm view agent-project-sdlc name version dist-tags --json` returns `agent-project-sdlc@0.2.39`.
- `npm view project-tiny-context-harness name version dist-tags --json` returns 404.
- `node tools/launch_readiness_check.mjs --strict-external` should keep failing on `npm-fetch` until the renamed package is published.

Do not post broad launch copy while the renamed package still returns 404.

## First Renamed Publish

The first publish should create:

```text
project-tiny-context-harness@0.2.39
```

Run the dry run first:

```sh
npm run release:npm
```

Expected dry-run outcome while the renamed package has no registry entry:

```text
Prepared project-tiny-context-harness@0.2.39
```

Then publish with the full gate:

```sh
npm run release:npm -- --version 0.2.39 --publish --yes --full-gate --registry-smoke
```

If npm requires a one-time password for publish, pass it without storing it in the release report:

```sh
npm run release:npm -- --version 0.2.39 --publish --yes --full-gate --registry-smoke --otp 123456
```

## If Publish Fails

If publish fails with auth or permission errors:

1. Confirm the active account:

   ```sh
   npm whoami
   ```

2. If the failure is:

   ```text
   npm error 403 Forbidden - PUT https://registry.npmjs.org/project-tiny-context-harness - You may not perform that action with these credentials.
   ```

   treat it as an npm credential, account policy or token permission issue. The tarball, package version and local gates may still be correct.

3. Confirm the renamed package is still absent:

   ```sh
   npm view project-tiny-context-harness name version dist-tags --json
   ```

4. Re-authenticate npm locally or replace the npm token with one allowed to publish new public packages.
5. If the npm account has publish 2FA enabled, rerun with `--otp`.
6. Do not create a GitHub release for the renamed npm package until registry verification passes.

If publish succeeds but smoke fails, stop broad launch and publish the fix as a new patch version. npm versions cannot be reused.

## Post-Publish Verification

After publish, run:

```sh
node tools/launch_readiness_check.mjs --strict-external
npm run launch:demo -- --out-dir tmp/sdlc/launch-demo/latest --package-spec project-tiny-context-harness@0.2.39 --clean
```

The strict external check should pass npm metadata, and the demo should install the renamed package from the registry.

Only after that:

- create a new GitHub Release for the renamed npm package,
- update launch docs that currently say npm is pending,
- post Show HN or any broad public launch,
- submit curated-list PRs that assume the package is installable.
