# Governance

Project Tiny Context Harness is currently a small single-maintainer open source project. This file explains how decisions are made while the project is still early.

## Project Scope

The project direction is:

```text
Repo-native project memory for fresh-agent recovery.
```

The default product remains Minimal Context Harness. Governance decisions should preserve these boundaries:

- keep durable project facts in `project_context/**`,
- keep `AGENTS.md` as a short startup router,
- leave product quality to each repository's tests, CI, review and human acceptance,
- avoid restoring lifecycle phases, phase gates, stage state or work-product trees as the default workflow,
- avoid benchmark, adoption, award or productivity claims without public evidence.

## Maintainer Role

The maintainer currently owns:

- final product scope decisions,
- release decisions,
- npm publishing,
- issue and pull request triage,
- security advisory coordination,
- conduct moderation.

This is a pragmatic early-project model, not a claim that the governance structure is mature or multi-maintainer.

## Decision Process

Changes are accepted when they are small enough to review and fit the Minimal Context boundary.

For most contributions, a pull request should show:

- the problem being solved,
- why the change belongs in the Harness instead of a user project,
- validation commands,
- whether `project_context/**` changed,
- any launch, documentation or package asset impact.

For larger changes, open an issue first. Maintainer decisions should prefer:

- simpler recovery surfaces over broader workflow machinery,
- explicit non-goals over ambiguous features,
- evidence over growth claims,
- source-compatible migration paths over breaking package behavior,
- documentation that helps users decide when not to use the project.

## Releases

Maintainers handle releases.

The renamed npm package `project-tiny-context-harness` is published. For future releases or registry/credential failures, follow:

- [docs/launch/npm-publish-runbook.md](docs/launch/npm-publish-runbook.md)
- [docs/launch/npm-credential-unblock.md](docs/launch/npm-credential-unblock.md)
- [docs/launch/npm-trusted-publishing.md](docs/launch/npm-trusted-publishing.md)

Do not create a renamed npm-package GitHub Release or broad launch post if registry verification or the strict external launch gate fails.

## Security And Conduct

- Security reports follow [SECURITY.md](SECURITY.md).
- Community behavior follows [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
- Support routing follows [SUPPORT.md](SUPPORT.md).

## Roadmap

The roadmap is public, but it is not a delivery promise. See [docs/roadmap.md](docs/roadmap.md).

Feature scope can change from real adoption feedback, but growth pressure should not expand the project into a general SDLC platform, task manager, code index or autonomous agent runtime.

## Future Governance

If the project gains regular contributors, external maintainers or production adoption, this file should be revisited to document:

- maintainer nomination,
- review authority,
- release authority,
- security response expectations,
- conflict-of-interest handling.

Until then, the project should be transparent about being single-maintainer and evidence-gated.
