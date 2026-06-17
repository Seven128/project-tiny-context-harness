# npm Credential Unblock Checklist

Snapshot date: 2026-06-10.

Use this checklist when an emergency local publish reaches npm and fails with:

```text
403 Forbidden - PUT https://registry.npmjs.org/project-tiny-context-harness - You may not perform that action with these credentials.
```

This means the local package artifact may be valid, but the active npm credentials cannot create or publish `project-tiny-context-harness`.

Current state: the original first-publish blocker has been cleared and `project-tiny-context-harness@0.2.42` is published. Prefer [npm-trusted-publishing.md](npm-trusted-publishing.md) for future releases. Keep this file only as the fallback path if a future local publish must be retried with `<new-version>`.

Do not paste tokens into issues, commits, release reports, shell transcripts or `project_context/**`.

## Official npm References

- npm access tokens: <https://docs.npmjs.com/about-access-tokens/>
- Creating access tokens: <https://docs.npmjs.com/creating-and-viewing-access-tokens/>
- 2FA for publishing: <https://docs.npmjs.com/requiring-2fa-for-package-publishing-and-settings-modification/>
- CI/CD token guidance: <https://docs.npmjs.com/using-private-packages-in-a-ci-cd-workflow/>
- Trusted publishing: <https://docs.npmjs.com/trusted-publishers/>
- Project Trusted Publishing runbook: [npm-trusted-publishing.md](npm-trusted-publishing.md)

## Historical First-Publish Failure Pattern

Known historical pattern from the rename window:

```text
npm whoami
-> steve1998

npm access list collaborators agent-project-ty-context steve1998 --json
-> read-write on the legacy package

npm publish project-tiny-context-harness tarball
-> 403 credentials error
```

Interpretation:

- The account is authenticated.
- The token can still see or maintain the legacy package.
- The token does not have enough authority to create or publish the renamed package.
- If the package name returns 404 again, broad launch should remain blocked until registry state is recovered.

## Choose One Publish Path

### Path A: Interactive Login With OTP

Use this if you can log in interactively and respond to npm 2FA.

```sh
npm login
npm whoami
npm profile get name email tfa --json
npm run release:npm -- --version <new-version> --publish --yes --full-gate --registry-smoke --otp <current-otp>
```

Use a fresh OTP for each publish attempt. Do not store OTP values in notes.

### Path B: Website-Created Granular Token

Use this if local publishing needs a token.

Create the token on npmjs.com, not from this repository:

1. Sign in to npmjs.com.
2. Open account menu -> Access Tokens.
3. Generate a new granular token.
4. Set package/scopes access broad enough to publish a new package.
5. Use read/write permissions for packages and scopes.
6. Enable bypass 2FA only if this non-interactive token publish path requires it.
7. Use a short expiration.
8. Avoid CIDR restrictions unless the publishing machine has a stable outbound IP.
9. Copy the token once and store it only in the local credential store or a trusted secret manager.

Temporary local use on PowerShell:

```powershell
$env:NPM_TOKEN = "<token>"
npm config set //registry.npmjs.org/:_authToken "$env:NPM_TOKEN" --location=user
npm whoami
npm run release:npm -- --version <new-version> --publish --yes --full-gate --registry-smoke
```

After publish succeeds, either keep the token only if needed for future releases or revoke it on npmjs.com and remove it from local config:

```powershell
npm config delete //registry.npmjs.org/:_authToken --location=user
Remove-Item Env:NPM_TOKEN
```

### Path C: Trusted Publishing After First Publish

Use this after `project-tiny-context-harness` exists on npm and the package settings page is available.

Trusted Publishing is the preferred future release path because GitHub Actions can publish through OIDC without storing a long-lived npm publish token. If the renamed package ever returns 404 and package settings are unavailable, recover the registry state before relying on this path.

Follow [npm-trusted-publishing.md](npm-trusted-publishing.md) to configure:

- GitHub owner `Seven128`,
- repository `project-tiny-context-harness`,
- workflow filename `npm-publish.yml`,
- environment `npm-publish`,
- allowed action `npm publish`.

## Safety Checks Before Retrying

Start with the read-only access diagnostic. It checks npm login, registry reachability and whether the renamed package already exists; it does not publish and does not print token, OTP or `.npmrc` values.

Run:

```sh
npm run launch:npm-access
npm run release:npm
npm run launch:check
node packages/ty-context/dist/cli.js package check-source
make validate-context
git diff --check
```

Then confirm:

```sh
npm view project-tiny-context-harness name version dist-tags --json
```

Expected if registry state is broken before recovery:

```text
404 Not Found
```

Expected current state:

```json
{
  "name": "project-tiny-context-harness",
  "version": "0.2.41"
}
```

## Retry Publish

Run:

```sh
npm run release:npm -- --version <new-version> --publish --yes --full-gate --registry-smoke
```

If using interactive OTP:

```sh
npm run release:npm -- --version <new-version> --publish --yes --full-gate --registry-smoke --otp <current-otp>
```

## Post-Publish Gate

After publish succeeds:

```sh
npm run launch:strict-external
npm run launch:demo -- --out-dir tmp/ty-context/launch-demo/latest --package-spec project-tiny-context-harness@latest --clean
```

Only after these pass:

- create a new GitHub Release for the renamed npm package,
- remove or revise any stale README copy that says npm publish is pending,
- post Show HN or Product Hunt,
- submit curated-list PRs that assume the npm package is installable.

## Do Not Do

- Do not publish broad launch copy if `npm-fetch` fails.
- Do not commit `.npmrc`, tokens, OTP values or screenshots showing token values.
- Do not infer that `agent-project-ty-context` read/write access means the renamed package can be created.
- Do not create a GitHub Release for the renamed package until registry smoke passes.
- Do not reuse a published version if a publish partially succeeds and a fix is needed; npm versions are immutable.
