# npm Publish Runbook

Snapshot date: 2026-06-10.

This runbook records the first renamed publish path from the repository rename window and remains the fallback for emergency local publishes. The GitHub repository and package metadata now use Project Tiny Context Harness, and `project-tiny-context-harness` has a registry entry.

For future releases after the first renamed publish, use [npm-trusted-publishing.md](npm-trusted-publishing.md) to configure GitHub Actions OIDC publishing instead of a long-lived npm publish token.

Current state: `project-tiny-context-harness@0.2.40` is published. Do not reuse `0.2.40`; npm versions are immutable.

## Historical First-Publish State

- `npm whoami` returns an authenticated npm user.
- `npm view agent-project-sdlc name version dist-tags --json` returns `agent-project-sdlc@0.2.39`.
- `npm view project-tiny-context-harness name version dist-tags --json` returns 404.
- `npm run launch:strict-external` should keep failing on `npm-fetch` until the renamed package is published.

Historical first-publish rule: Do not post broad launch copy while the renamed package still returns 404.

## First Renamed Publish Record

The first publish created:

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

Use [npm-credential-unblock.md](npm-credential-unblock.md) for the detailed interactive-login and granular-token checklist.

If publish fails with auth or permission errors:

1. Run the read-only npm access diagnostic:

   ```sh
   npm run launch:npm-access
   ```

   It checks registry reachability, active npm login and whether the renamed package already exists without publishing or printing token values.

2. Confirm the active account if you need a raw npm check:

   ```sh
   npm whoami
   ```

3. If the failure is:

   ```text
   npm error 403 Forbidden - PUT https://registry.npmjs.org/project-tiny-context-harness - You may not perform that action with these credentials.
   ```

   treat it as an npm credential, account policy or token permission issue. The tarball, package version and local gates may still be correct.

4. Run the low-level permission probes only if the diagnostic is not enough:

   ```sh
   npm profile get name email tfa --json
   npm access list packages steve1998 --json
   npm access list collaborators agent-project-sdlc steve1998 --json
   ```

   A useful diagnostic pattern is: `npm whoami` works, the legacy package reports `read-write`, but profile or package-list commands return E403. That means the current token can maintain the legacy package but cannot create or manage the renamed package namespace.

5. Confirm the renamed package is still absent:

   ```sh
   npm view project-tiny-context-harness name version dist-tags --json
   ```

6. Re-authenticate npm locally or replace the npm token with one allowed to publish new public packages. npm granular access tokens must be created on npmjs.com, not from the CLI. For a token-based publish path, create a granular access token with package read/write access broad enough for a new package and enable bypass 2FA if the account or package policy requires it.
7. If using an interactive login with publish 2FA, rerun with `--otp`.
8. Do not create a GitHub release for the renamed npm package until registry verification passes.

If publish succeeds but smoke fails, stop broad launch and publish the fix as a new patch version. npm versions cannot be reused.

## Post-Publish Verification

After the first publish and any postpublish patch, run:

```sh
npm run launch:strict-external
npm run launch:demo -- --out-dir tmp/sdlc/launch-demo/latest --package-spec project-tiny-context-harness@latest --clean
npm view project-tiny-context-harness readme --json
```

The strict external check should pass npm metadata, and the demo should install the renamed package from the registry. If the live npm README still has stale pre-rename wording, publish the next patch version after the normal gates pass; do not try to overwrite an existing npm version.

Only after that:

- create a new GitHub Release for the current renamed npm package if it has not been created yet,
- configure and verify Trusted Publishing with [npm-trusted-publishing.md](npm-trusted-publishing.md) for future releases,
- update any launch docs that still say npm is pending,
- post Show HN or any broad public launch,
- submit curated-list PRs that assume the package is installable.
