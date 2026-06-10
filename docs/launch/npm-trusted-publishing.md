# npm Trusted Publishing Runbook

Snapshot date: 2026-06-10.

This runbook prepares the post-first-publish release path for `project-tiny-context-harness`. It does not replace the first renamed package publish while `npm view project-tiny-context-harness` still returns 404 and package settings are unavailable.

## Official npm Sources Checked

- Trusted publishing for npm packages: <https://docs.npmjs.com/trusted-publishers/>
- Generating provenance statements: <https://docs.npmjs.com/generating-provenance-statements/>

Important current constraints:

- Trusted publishing uses OIDC from a supported CI/CD workflow instead of long-lived npm publish tokens.
- GitHub Actions trusted publishing requires npm CLI version 11.5.1 or later and Node version 22.14.0 or higher.
- GitHub Actions workflows need `permissions: id-token: write` and `permissions: contents: read`.
- GitHub-hosted runners are supported; self-hosted runners are not currently supported.
- npm does not verify trusted publisher fields when saving them. Repository, workflow filename and environment details must match exactly.
- Trusted publishing from GitHub Actions for a public package in a public repository automatically generates provenance attestations. Do not claim a provenance badge or trusted-publish release until a real publish has used this path.

## Current Boundary

The renamed package is still absent from the npm registry. The current first-publish path remains:

```sh
npm run release:npm -- --version 0.2.39 --publish --yes --full-gate --registry-smoke
```

Use [npm-credential-unblock.md](npm-credential-unblock.md) if that fails with a 403 credentials error.

After `project-tiny-context-harness@0.2.39` exists on npm, configure Trusted Publishing for future releases and use `.github/workflows/npm-publish.yml` instead of a local long-lived publish token.

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

If the npm settings page cannot be opened because the package still returns 404, finish the first renamed publish before using this runbook.

## GitHub Workflow

The repository workflow is `.github/workflows/npm-publish.yml`.

It is manual-only:

- `workflow_dispatch` prevents accidental publish on every push or tag.
- `dry_run` defaults to `true`.
- `expected_version` must match `packages/sdlc-harness/package.json`.
- The job runs on `ubuntu-latest` with Node `24`.
- The workflow installs the latest npm CLI and asserts npm CLI 11.5.1 or later.
- It runs package tests, package source drift check, `make validate-context` and `npm pack --dry-run --workspace project-tiny-context-harness`.
- The publish step runs only when `dry_run` is false.
- The workflow must not define `NPM_TOKEN` or `NODE_AUTH_TOKEN`; publish authentication should come from OIDC.

## Dry Run

In GitHub Actions, run **npm Trusted Publish** with:

```text
expected_version: 0.2.39
dry_run: true
```

Expected result:

- package tests pass,
- source drift check passes,
- Context validation passes,
- `npm pack --dry-run --workspace project-tiny-context-harness` succeeds,
- no npm publish occurs.

## Real Publish

Only after the first renamed package exists and the npm trusted publisher configuration above is saved, run:

```text
expected_version: 0.2.39
dry_run: false
```

Then verify:

```sh
npm run launch:strict-external
npm run launch:demo -- --out-dir tmp/sdlc/launch-demo/latest --package-spec project-tiny-context-harness@0.2.39 --clean
```

The strict external check must no longer fail `npm-fetch`.

## After Trusted Publishing Works

- Prefer this workflow over local token-based publishing.
- Revoke unused npm publish tokens.
- Consider npm package settings that require two-factor authentication and disallow traditional tokens after the trusted path has completed at least one release.
- Keep `docs/launch/npm-publish-runbook.md` for emergency local publish fallback and first-publish notes.

## Do Not Do

- Do not configure `NPM_TOKEN` or `NODE_AUTH_TOKEN` for the publish job.
- Do not claim Trusted Publishing or provenance until a real release used this workflow.
- Do not post broad launch copy while `npm-fetch` still fails.
- Do not change the workflow filename, GitHub environment name or repository owner without updating the npm trusted publisher configuration.
