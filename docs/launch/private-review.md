# Private Review Packet

Snapshot date: 2026-06-10.

Use this packet while the renamed npm package is still blocked or before the first broad launch. The goal is to get high-signal feedback from a small number of real coding-agent users, not to create a public launch wave.

Do not ask private reviewers for stars. Ask whether the recovery surface solves a real handoff problem and which facts were still missing.

## When To Use

Use this before Show HN, Product Hunt, Reddit or curated-list PRs when any of these are true:

- `project-tiny-context-harness@latest` is not installable yet.
- The README and demo are ready, but the project has no outside adoption report.
- You want one concrete before/after story before spending a broad launch channel.

Do not use it as a substitute for npm publish. Broad launch still waits for the renamed package to be installable.

## Reviewer Profile

Invite 5-10 people who already use coding agents on non-trivial repositories:

- Codex, Claude Code, Cursor, Gemini CLI, OpenCode, Cline or Roo users.
- Maintainers who already write `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md` or handoff notes.
- Small-team developers who regularly restart chats, switch agents or hand off agent-generated changes.

Avoid generic AI-tool collectors for this pass. The useful signal is about project-memory recovery, not broad AI enthusiasm.

For candidate scoring and a two-wave outreach plan, use [private-review-shortlist.md](private-review-shortlist.md). Keep filled shortlists under `tmp/sdlc/private-review/**`, not in the repository.

## Copy-Paste DM

```text
I am preparing a small open-source tool called Project Tiny Context Harness.

It adds minimal repo-native project memory for AI coding agents: AGENTS.md plus project_context/** so fresh chats can recover project goal, non-goals, architecture boundaries and validation paths before changing code.

I am not asking for a star or a public post. I am looking for private feedback from people who use Codex, Claude Code, Cursor, OpenCode or similar agents on real repos.

If you have 10-15 minutes, could you skim the README and try the source preview path? The renamed npm package is still pending, so this is not a public launch yet.

Repo:
https://github.com/Seven128/project-tiny-context-harness

Source preview:
git clone https://github.com/Seven128/project-tiny-context-harness.git
cd project-tiny-context-harness
npm ci
npm run smoke:quickstart

The main question: does this minimal recovery surface solve a real "new agent chat lost the project context" problem, or is the missing context somewhere else?
```

## Reviewer Task

Ask reviewers to answer only what they can answer from experience:

1. What project facts do your agents repeatedly rediscover?
2. Would `AGENTS.md` plus `project_context/**` have helped in that situation?
3. Which file or concept felt unclear in the README first screen?
4. Was the source preview enough before npm publish?
5. What would make this worth trying on one real repo after npm publish?

Optional hands-on path:

```sh
git clone https://github.com/Seven128/project-tiny-context-harness.git
cd project-tiny-context-harness
npm ci
npm run smoke:quickstart
```

Then open `docs/examples/minimal-context-sample.md` and `docs/examples/fresh-agent-recovery.md`.

## Feedback Log

Track private feedback with [private-review-log-template.md](private-review-log-template.md) in a temporary file, not in `project_context/**`:

```text
tmp/sdlc/private-review/YYYY-MM-DD-review-notes.md
```

Capture:

- reviewer profile, not private identity unless they consent
- agent/tool they use
- repo size/type in broad terms
- confusion points
- missing recovery facts
- whether they would try it after npm publish
- quote consent: none, anonymous, public name, or public link

Do not store secrets, private repo names, raw chat logs or private code.

## Convert Feedback

Within 24 hours of the private pass:

- Patch README or FAQ for repeated confusion.
- Turn repeated missing-fact requests into GitHub issues.
- Move public-consent examples into an adoption report, launch reply or [adoption story](adoption-story-template.md).
- Leave one-off private notes in `tmp/sdlc/private-review/**`.
- Do not claim adoption, benchmark wins or productivity multipliers from private feedback.

## Success Signals

Strong signal:

- A reviewer names a specific handoff/debug/new-chat failure this would have helped.
- A reviewer asks for one concrete missing Context field or recipe.
- A reviewer says they would try it after npm publish.

Weak signal:

- Generic "looks cool" feedback.
- Star without a trial or specific comment.
- Requests to turn it into an autonomous agent, task manager or full SDLC suite.

## Claims Boundary

Allowed after private review:

```text
Early reviewers confirmed that fresh-agent project-memory drift is a real pain point.
```

Only use this if reviewers actually said that, and avoid naming them without consent.

Avoid:

```text
Proven to improve delivery speed.
Validated by teams.
Trusted by developers.
```

Private review is for copy and product clarity, not proof of quality.
