# Prelaunch External Blockers

Snapshot date: 2026-06-10.

Broad public launch is blocked only when the strict external launch check reports required TODOs. Current expected state is clear: `npm-fetch` and `github-homepage` should both pass.

Private review can continue even if a future external drift appears, but it should use the no-install preview, npm install path, Codespaces or source-preview path and should not ask for stars.

Run the gate before posting broad launch copy:

```sh
npm run launch:unblock
```

Then run the strict external gate:

```sh
npm run launch:strict-external
```

Equivalent direct command:

```sh
node tools/launch_readiness_check.mjs --strict-external
```

Expected current state:

```text
npm-fetch: PASS
github-homepage: PASS
```

Fallback failure state if npm registry or GitHub metadata drifts again:

```text
npm-fetch: TODO
github-homepage: TODO
```

## Current Stop/Go Checks

| Check | Blocker | Owner action | Evidence |
|---|---|---|---|
| `npm-fetch` | `https://registry.npmjs.org/project-tiny-context-harness/latest` must resolve before broad launch. | If it returns 404 again, run `npm run launch:npm-access`, then use [npm-publish-runbook.md](npm-publish-runbook.md). If publish fails with 403, use [npm-credential-unblock.md](npm-credential-unblock.md). | The strict external check no longer reports `npm-fetch`. |
| `github-homepage` | GitHub About homepage should point to the npm package page once npm is live. | Run `npm run launch:github-metadata` to dry-run the current/desired metadata. From a trusted shell with `GITHUB_TOKEN` or `GH_TOKEN`, run `npm run launch:github-metadata -- --apply`, or use [github-metadata.md](github-metadata.md) to set the homepage manually. The postpublish homepage is `https://www.npmjs.com/package/project-tiny-context-harness`; the fallback repository URL is `https://github.com/Seven128/project-tiny-context-harness`. | The strict external check no longer reports `github-homepage`. |

## Launch Rule

Do not post broad launch copy if either `npm-fetch` or `github-homepage` returns as a TODO.

Allowed while the strict external gate is blocked:

- Private review with [private-review.md](private-review.md).
- No-install preview links from the README first screen.
- Codespaces or local source-preview testing.
- Source preview failure reports through `source_preview_report.yml`.

Not allowed while the strict external gate is blocked:

- Show HN or broad Reddit launch.
- Product Hunt launch.
- New GitHub Release for the renamed npm package.
- Curated-list PRs that imply the npm package is installable while the strict external gate says otherwise.

No token, OTP, `.npmrc` or account credential should be stored in this repository. Keep credential handling in the maintainer shell or npm website only.
