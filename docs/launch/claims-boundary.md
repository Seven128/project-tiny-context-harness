# Launch Claims Boundary

Snapshot date: 2026-06-10.

Use this before publishing Show HN, Product Hunt, Reddit, curated-list PRs, directory submissions, award forms or private-review summaries. The goal is to keep the public story credible enough that technical readers can trust it.

## Core Rule

Say exactly what the project has evidence for:

```text
Project Tiny Context Harness provides minimal repo-native project memory for AI coding agents.
```

Do not turn that into a proof claim:

```text
It is not benchmark-proven faster, not adoption-proven, not award-winning and not a replacement for tests, CI, review or issue tracking.
```

## Allowed Claims

These are safe for README, npm copy, Show HN, Product Hunt and curated-list PRs:

- Minimal project memory for AI coding agents.
- Helps fresh agent chats recover project intent, non-goals, architecture boundaries and validation paths.
- Keeps `AGENTS.md` as the startup router and `project_context/**` as the maintained fact source.
- Provides `validate-context` as a recovery-surface check.
- Complements tests, CI, review, issue tracking, specs and code-intelligence tools.
- Avoids Tiny Context phase ceremony, task state and work-product trees by default.
- Works through plain repository files that Codex, Claude Code, Cursor, Gemini CLI, OpenCode and similar agents can read.
- `project-tiny-context-harness@latest` is installable from npm.

## Claims That Need Evidence First

Do not use these until the underlying evidence exists and is linked:

| Claim | Required evidence first |
|---|---|
| Benchmark faster | Fresh baseline and Minimal Context Harness runs with the same product-quality bar. |
| Saves N% time | Repeated benchmark runs with clear timing, quality and operator-intervention records. |
| Used by teams | Public adoption report, consented quote or visible downstream usage. |
| Trusted by developers | Public adoption evidence or third-party listing that supports the wording. |
| Award-winning | Actual award result. |
| OpenSSF Best Practices / Baseline badge | Official badge granted by the OpenSSF Best Practices site. |
| Recommended by a tool ecosystem | Public source from that ecosystem. |

## Avoid In Public Copy

Avoid these phrases unless they are explicitly framed as a thing the project does not claim:

- benchmark-proven faster
- 2x faster
- 10x
- productivity multiplier
- replaces tests
- replaces CI
- replaces review
- automates the Tiny Context
- autonomous Tiny Context framework
- used by teams
- trusted by developers
- award-winning
- officially recommended

## Channel Checks

Before Show HN:

- npm package is published and installable.
- `npm run launch:strict-external` has no TODOs.
- Show HN body asks for technical feedback, not stars.
- Benchmark answer points to [../benchmarking.md](../benchmarking.md).

Before Product Hunt:

- Product copy uses the tagline `Minimal project memory for AI coding agents`.
- First comment says it does not replace tests, CI or review.
- Media points to the actual recovery loop, not a generic AI promise.
- No review, adoption or award language appears unless already public.

Before curated-list PRs:

- Use the GitHub repository URL, not npm, unless the maintainer requires a package URL.
- Run `npm run launch:external-prs`.
- Run `npm run launch:external-prs -- --live --clean` immediately before PR creation.
- Keep the entry under context recovery, agent instructions, team adoption or developer tooling categories.

Before private-review summaries:

- Do not turn private feedback into adoption proof.
- Quote only with explicit consent.
- Use the consent levels in [reviewer-quickstart.md](reviewer-quickstart.md) and [private-review-log-template.md](private-review-log-template.md).

## Safe Replacement Wording

Use this instead of speed claims:

```text
The current claim is recovery quality, not speed: a fresh agent gets a small maintained surface for project intent, boundaries and validation paths.
```

Use this instead of adoption claims:

```text
Early feedback is being collected through private review and adoption reports; public examples will be linked only with consent.
```

Use this instead of Tiny Context automation claims:

```text
The project keeps durable context and intentionally avoids phase gates, task state and work-product trees by default.
```

## Final Manual Check

Before posting or submitting, read the exact final text and answer:

1. Would a skeptical maintainer think this claims more than the repo proves?
2. Does it ask for feedback instead of stars, upvotes or awards?
3. Does it make clear that product quality still belongs to tests, CI, review and humans?
4. If it mentions benchmarks, does it also say fresh Minimal Context benchmark runs are still needed?
5. If it mentions adoption, is there a public consented source?
