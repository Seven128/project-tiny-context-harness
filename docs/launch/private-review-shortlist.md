# Private Review Shortlist

Use this before sending the private review DM in [private-review.md](private-review.md). The goal is to pick reviewers who can evaluate the fresh-agent recovery problem from real experience, not people who will only give polite encouragement.

Do not commit a filled shortlist with private names, companies, private repositories, email addresses, handles, DMs or raw feedback. Keep filled copies under `tmp/sdlc/private-review/**`.

## Reviewer Mix

Aim for 5-10 people across at least three profiles:

| Profile | Why They Matter | Good Signal |
|---|---|---|
| Solo OSS maintainer using coding agents | They feel repeated repo rediscovery directly. | Can name one project fact agents keep missing. |
| Staff or senior engineer on a larger repo | They know handoff and validation-path drift. | Can judge whether `project_context/**` is too much or too little. |
| Multi-agent user | They switch among Codex, Claude Code, Cursor, OpenCode or similar tools. | Can say whether repo-native memory beats tool-specific rules. |
| Docs or DX-minded maintainer | They notice first-screen confusion quickly. | Can improve README, FAQ or demo wording. |
| Skeptical non-user of workflow tools | They test whether the pitch sounds like ceremony. | Can identify why they would not try it. |

Avoid filling the list with generic AI-tool fans, product launch friends or people who have not used coding agents on real repositories.

## Candidate Scoring

Score candidates before outreach. Use broad public-safe descriptions only.

| Candidate ID | Public-safe profile | Uses coding agents on real repos? | Has handoff/context pain? | Likely to be candid? | Can try source preview? | Consent sensitivity | Priority |
|---|---|---:|---:|---:|---:|---|---:|
| C1 | <solo OSS maintainer> | 0-2 | 0-2 | 0-2 | 0-2 | <low/medium/high> | <1-5> |
| C2 |  |  |  |  |  |  |  |

Scoring:

- `0`: unknown or weak fit
- `1`: plausible fit
- `2`: strong fit

Prioritize people with a total score of 6+ across the four numeric columns. Do not send the review DM to anyone who expects promotion, compensation or a reciprocal star.

## Outreach Batch

Send in two waves:

| Wave | Size | When | Why |
|---|---:|---|---|
| 1 | 3-4 reviewers | While npm publish is blocked | Tests whether source preview and README are understandable. |
| 2 | 3-6 reviewers | After wave 1 confusion is patched | Checks whether the corrected pitch works better. |

Stop after 10 reviewers unless there is a repeated, actionable confusion pattern that needs one more targeted check.

## Ask Shape

Use the copy-paste DM from [private-review.md](private-review.md). Keep the ask narrow:

- Ask for one concrete agent-memory failure.
- Ask whether `AGENTS.md + project_context/**` would help.
- Ask what felt unclear in the first screen.
- Ask whether source preview is enough before npm publish.

Do not ask for:

- stars
- reposts
- public endorsements
- benchmark claims
- "would you use this in production?"

## Tracking

Create a filled working file only under `tmp/sdlc/private-review/**`:

```text
tmp/sdlc/private-review/YYYY-MM-DD-shortlist.md
```

After replies arrive, summarize only repeatable themes in [private-review-log-template.md](private-review-log-template.md). Convert public examples only through [adoption-story-template.md](adoption-story-template.md) and only with explicit consent.

## Success Bar

The private review pass is useful if it produces any of these:

- one concrete fresh-agent recovery failure
- one repeated README confusion point
- one missing recovery fact or recipe
- one reviewer who would try the package after npm publish

It is not useful as a popularity signal. Do not describe private review as adoption, validation, production use or benchmark proof.
