# npm Trusted Publishing Runbook

Snapshot date: 2026-06-10.

This runbook records the post-first-publish release path for `project-tiny-context-harness`. The package now exists on npm, and Trusted Publishing is the preferred path for each new version.

## Official npm Sources Checked

- Trusted publishing for npm packages: <https://docs.npmjs.com/trusted-publishers/>
- Generating provenance statements: <https://docs.npmjs.com/generating-provenance-statements/>

Important current constraints:

- Trusted publishing uses OIDC from a supported CI/CD workflow instead of long-lived npm publish tokens.
- GitHub Actions trusted publishing requires npm CLI version 11.5.1 or later and Node version 22.14.0 or higher.
- GitHub Actions workflows need `permissions: id-token: write` for npm trusted publishing and `permissions: contents: write` for the post-publish GitHub Release create/update step.
- GitHub-hosted runners are supported; self-hosted runners are not currently supported.
- npm does not verify trusted publisher fields when saving them. Repository, workflow filename and environment details must match exactly.
- Trusted publishing from GitHub Actions for a public package in a public repository automatically generates provenance attestations.

## Current Boundary

The renamed package exists on npm. Use local token publishing only as an emergency fallback.

The current published package is `project-tiny-context-harness@0.2.67`. Prefer the GitHub Actions Trusted Publishing workflow after a successful dry run; use the local fallback only when workflow dispatch is unavailable and the normal release checks pass. Do not run a real publish for an existing version again; npm versions are immutable.

Real publish runs also create or update the matching GitHub Release from `docs/launch/github-release-<version>.md` by running `node tools/github_release_publish.mjs --version <version> --target <github.sha>`. Dry runs do not create or edit GitHub releases.

Because npm package README content is also tied to the immutable published version, local README copy changes will not appear on npm until a new version is published. Treat a stale `npm-readme-renamed-surfaces` info item from `npm run launch:strict-external` as a conversion cleanup task for the next patch release, not as permission to republish the existing version.

Prepare a future release locally, then commit and push the versioned release surfaces before publishing:

```sh
npm run release:prepare -- --version patch --update-mode sync-only
git diff --stat
git add -A
git commit -m "Release <new-version>"
git push origin main
```

For an emergency local fallback after that committed preparation, use:

```sh
npm run release:publish -- --local-fallback --yes --registry-smoke
```

Use [npm-credential-unblock.md](npm-credential-unblock.md) if that fails with a 403 credentials error.

Now that `project-tiny-context-harness` exists on npm, use `.github/workflows/npm-publish.yml` instead of a local long-lived publish token for future releases whenever possible. Direct GitHub Actions URL:

<https://github.com/Seven128/project-tiny-context-harness/actions/workflows/npm-publish.yml>

## npm Trusted Publisher Configuration

On npmjs.com, open the package settings for `project-tiny-context-harness` and configure:

| Field | Value |
|---|---|
| Publisher | GitHub Actions |
| Organization or user | `Seven128` |
| Repository | `project-tiny-context-harness` |
| Workflow filename | `npm-publish.yml` |
| Environment name | `npm-publish` |
| Allowed actions | `npm publish` |

Enter only `npm-publish.yml` for the workflow filename, not `.github/workflows/npm-publish.yml`.

If the npm settings page cannot be opened because the package unexpectedly returns 404, recover the registry state before using this runbook.

## GitHub Workflow

The repository workflow is `.github/workflows/npm-publish.yml`:

<https://github.com/Seven128/project-tiny-context-harness/actions/workflows/npm-publish.yml>

It is manual-only:

- `workflow_dispatch` prevents accidental publish on every push or tag.
- `dry_run` defaults to `true`.
- `expected_version` must match `packages/ty-context/package.json`.
- Versioned release surfaces must be prepared before commit with `npm run release:prepare -- --version <patch|minor|major|x.y.z> --update-mode <sync-only|upgrade-required|manual-required>`; the workflow verifies this with `npm run release:check-version`.
- The job runs on `ubuntu-latest` with Node `24`.
- The workflow installs the latest npm CLI and asserts npm CLI 11.5.1 or later.
- It runs package tests, package source drift check, `make validate-context` and `npm pack --dry-run --workspace project-tiny-context-harness`.
- The publish step runs only when `dry_run` is false.
- The GitHub Release create/update step runs only after a real publish, uses the release packet body and marks `v<version>` as the latest release.
- The workflow must not define `NPM_TOKEN` or `NODE_AUTH_TOKEN`; publish authentication should come from OIDC.

## Dry Run

Open <https://github.com/Seven128/project-tiny-context-harness/actions/workflows/npm-publish.yml>, click **Run workflow**, choose branch `main`, then run **npm Trusted Publish** with the next committed package version:

```text
expected_version: <new-version>
dry_run: true
```

Expected result:

- package tests pass,
- source drift check passes,
- Context validation passes,
- `npm pack --dry-run --workspace project-tiny-context-harness` succeeds,
- no npm publish occurs,
- no GitHub Release is created or edited.

The maintainer verified the `0.2.41` dry run and real publish on 2026-06-10 after configuring npm Trusted Publishing.

## Real Publish

Only after a new package version is committed on `main`, run the workflow with that version:

```text
expected_version: <new-version>
dry_run: false
```

Then verify:

```sh
npm run launch:strict-external
npm run launch:demo -- --out-dir tmp/ty-context/launch-demo/latest --package-spec project-tiny-context-harness@latest --clean
npm view project-tiny-context-harness readme --json
gh release view v<new-version>
```

The strict external check must no longer fail `npm-fetch`. The npm README should no longer report stale pre-rename display, package or repository names. The latest GitHub Release should be `Project Tiny Context Harness <new-version>`.

## After Trusted Publishing Works

- Prefer this workflow over local token-based publishing.
- Revoke unused npm publish tokens.
- Consider npm package settings that require two-factor authentication and disallow traditional tokens after the trusted path has completed at least one release.
- Keep `docs/launch/npm-publish-runbook.md` for emergency local publish fallback and first-publish notes.

## Do Not Do

- Do not configure `NPM_TOKEN` or `NODE_AUTH_TOKEN` for the publish job.
- Do not claim future releases used Trusted Publishing unless that specific version was actually published by this workflow.
- Do not post broad launch copy if `npm-fetch` fails.
- Do not change the workflow filename, GitHub environment name or repository owner without updating the npm trusted publisher configuration.
