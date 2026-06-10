# Prelaunch External Blockers

Snapshot date: 2026-06-10.

Broad public launch is blocked until the strict external launch check has no TODOs. Private review can continue before that point, but it should use the no-install preview, Codespaces or source-preview path and should not ask for stars.

Run the gate before posting broad launch copy:

```sh
npm run launch:strict-external
```

Equivalent direct command:

```sh
node tools/launch_readiness_check.mjs --strict-external
```

Expected state before unblock:

```text
npm-fetch: TODO
github-homepage: TODO
```

Expected state after unblock:

```text
npm-fetch: PASS
github-homepage: PASS
```

## Current TODOs

| Check | Blocker | Owner action | Evidence |
|---|---|---|---|
| `npm-fetch` | `https://registry.npmjs.org/project-tiny-context-harness/latest` still returns 404. | Publish `project-tiny-context-harness@0.2.39` with [npm-publish-runbook.md](npm-publish-runbook.md). If publish fails with 403, use [npm-credential-unblock.md](npm-credential-unblock.md). | The strict external check no longer reports `npm-fetch`. |
| `github-homepage` | GitHub About homepage must not point to a missing npm package page while npm returns 404. | Run `npm run launch:github-metadata` to dry-run the current/desired metadata. From a trusted shell with `GITHUB_TOKEN` or `GH_TOKEN`, run `npm run launch:github-metadata -- --apply`, or use [github-metadata.md](github-metadata.md) to set the homepage manually. The prepublish homepage is `https://github.com/Seven128/project-tiny-context-harness`; the postpublish homepage is `https://www.npmjs.com/package/project-tiny-context-harness`. | The strict external check no longer reports `github-homepage`. |

## Launch Rule

Do not post broad launch copy while either `npm-fetch` or `github-homepage` is still a TODO.

Allowed before unblock:

- Private review with [private-review.md](private-review.md).
- No-install preview links from the README first screen.
- Codespaces or local source-preview testing.
- Source preview failure reports through `source_preview_report.yml`.

Not allowed before unblock:

- Show HN or broad Reddit launch.
- Product Hunt launch.
- New GitHub Release for the renamed npm package.
- Curated-list PRs that imply the npm package is already installable.

No token, OTP, `.npmrc` or account credential should be stored in this repository. Keep credential handling in the maintainer shell or npm website only.
