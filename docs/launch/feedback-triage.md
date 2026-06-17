# Launch Feedback Triage

Snapshot date: 2026-06-10.

Use this runbook after Show HN, Product Hunt, Reddit, curated-list PRs, private review or any other launch channel creates real feedback.

The goal is to turn attention into clearer product copy, useful issues and consented adoption evidence without overstating proof.

Do not store raw private logs, secrets, customer details, private repository names or private code here. Filled notes belong under `tmp/ty-context/launch-feedback/**`.

## Inputs

Before triage, collect:

- Channel name and URL.
- Timestamp.
- Metrics snapshot from `npm run launch:metrics`.
- HN story snapshot from `npm run launch:hn-snapshot` when the channel is Show HN.
- Comment links or summarized objection themes.
- Any adoption report issue links.
- Any maintainer feedback from curated-list PRs.

Use one temporary note per channel:

```text
tmp/ty-context/launch-feedback/YYYY-MM-DD-<channel>.md
```

Create the note with:

```sh
npm run launch:feedback-note -- --channel show-hn --url <channel-url>
```

The generated note is intentionally temporary. It repeats the metrics snapshot commands, theme table, docs/package patch checklist, adoption evidence boundary and next-channel decision fields so channel feedback does not get lost in chat history.

## First Hour

Do:

- Answer direct technical questions.
- Link the smallest relevant README, FAQ, demo, comparison or profile section.
- Ask clarifying questions when a user describes a real repo or agent-surface problem.
- Save repeated confusion themes in the temporary channel note.

Do not:

- Ask for stars, upvotes, awards or nominations.
- Argue with dismissive one-liners.
- Claim benchmark wins, adoption, productivity gains or production validation.
- Patch README from a single ambiguous comment unless it reports a real install failure.

## Six-Hour Triage

Classify each substantive comment:

| Comment type | Signal | Action |
|---|---|---|
| Install failure | Command does not work or npm package is unavailable. | Pause promotion, reproduce, fix docs or package, then reply with the correction. |
| Positioning confusion | Reader thinks it is an autonomous agent, full Tiny Context framework or task manager. | Patch README/FAQ/profile before the next channel. |
| AGENTS.md overlap | Reader asks why this is not just `AGENTS.md`. | Link comparison/FAQ; patch only if multiple readers miss the router-plus-context model. |
| Benchmark demand | Reader asks for speed or quality numbers. | State no-claim boundary; link benchmark rerun issue if useful. |
| Real recovery problem | Reader names project facts their agents rediscover. | Ask for adoption report or consented story. |
| Integration request | Reader asks for a specific agent/editor workflow. | Ask which recovery fact is missing; create an issue only for repeated friction. |
| Curated-list category feedback | Maintainer challenges category or wording. | Update profile/external PR wording before submitting adjacent lists. |

## Patch Rules

Patch public docs within 24 hours when:

- Two or more good-faith readers misunderstand the same first-screen point.
- One reader reports a reproducible install/source-preview failure.
- A curated-list maintainer gives category or wording feedback that applies to other submissions.
- A response template would prevent repeated hand-written explanation.

Do not patch public docs when:

- The comment is a one-off preference outside the Minimal Context scope.
- The requested feature would turn Harness into task management, semantic search, CI, test automation or autonomous coding.
- The feedback includes private repo details that cannot be generalized safely.

## Issue Rules

Open or update an issue when feedback is:

- repeatable across more than one reader,
- actionable without private data,
- inside the repo-native context-recovery scope,
- small enough for a contributor or follow-up PR.

Good issue titles:

```text
Clarify AGENTS.md vs project_context in the README first screen
Add a Cursor adoption friction note to agent surface recipes
Document when not to put facts in project_context/**
Re-run Minimal Context benchmark without old stage workflow results
```

Avoid issues for:

- "get more stars"
- broad roadmap wishes
- private customer details
- benchmark or adoption claims without evidence

## Adoption Evidence

Use adoption evidence only when the user described a concrete recovery problem.

If public:

- Ask them to open an adoption report issue.
- Ask what attribution level is acceptable.
- Convert with `docs/launch/adoption-story-template.md` only after explicit consent.

If private:

- Track with `docs/launch/private-review-log-template.md`.
- Keep notes under `tmp/ty-context/private-review/**`.
- Do not quote or paraphrase publicly without consent.

Allowed summary after real evidence exists:

```text
Users reported that fresh agent sessions repeatedly rediscover project goals, boundaries or validation paths.
```

Avoid:

```text
Validated by teams.
Trusted in production.
Proven faster.
Benchmark-backed.
```

## Channel Decision

After 24 hours, choose the next move:

| Condition | Next move |
|---|---|
| Install path failed | Fix package/docs first; do not post another channel. |
| Most comments misunderstand the product category | Patch README, FAQ and profile before any second channel. |
| Comments understand the wedge but ask for examples | Improve example docs or demo before Product Hunt. |
| One or more users describe real recovery failures | Ask for adoption reports; then submit curated-list PRs. |
| Curated-list maintainer accepts or improves wording | Reuse that wording in the next adjacent list. |
| Feedback is thin but not negative | Try one narrower community or private review, not a broad second blast. |

## 24-Hour Summary Template

```md
# Launch Feedback Summary

Channel:
URL:
Posted at:
Metrics before:
Metrics after 24h:

## Repeated Themes

| Theme | Count | Evidence | Action |
|---|---:|---|---|
|  |  |  |  |

## Docs Or Package Changes

- [ ] README patch needed:
- [ ] FAQ patch needed:
- [ ] Profile or external PR wording patch needed:
- [ ] Install/package fix needed:

## Evidence

- Adoption report links:
- Public quote consent:
- Private-only notes:

## Next Channel Decision

Decision:
Reason:
Owner:
```

## Claims Boundary

This triage process is not product proof. It is a way to improve launch copy and capture evidence safely.

Treat stars, upvotes, comments and downloads as distribution telemetry. Treat install success, smoke tests, public adoption reports and fresh benchmark reruns as stronger product evidence.
