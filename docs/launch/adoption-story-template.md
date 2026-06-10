# Adoption Story Template

Snapshot date: 2026-06-10.

Use this template after a private review, adoption report or public launch reply produces a real example. The public adoption-report issue form already asks for quote/story consent; use those fields as the source of truth before publishing. The goal is to turn useful feedback into a concise evidence surface without overstating adoption, speed or product quality.

Do not publish a story without explicit consent for the quoted detail and attribution level.

## When To Use

Use this when someone can describe a specific project-memory failure:

- a fresh agent chat forgot project intent
- a handoff lost architecture boundaries
- a debugging turn rediscovered a validation path
- a repo had duplicated or drifting agent rules
- a team had to repeat "do not change this" context across tools

Do not use it for generic praise, private repo details, benchmark claims or anonymous comments that cannot be tied to a concrete recovery problem.

## Consent

Record consent before publishing:

```text
Attribution level:
- none
- anonymous role only
- public name
- public name and link

Approved surfaces:
- README
- launch post
- GitHub issue/comment
- Product Hunt/HN/Reddit reply
- future case-study doc

Quote approved:
<exact approved quote or paraphrase>
```

If consent is unclear, keep the story private under `tmp/sdlc/private-review/**`.

## Story Shape

Keep each story short enough to fit in a README paragraph or launch reply.

```md
### <Short Context>

**Repo / team type:** <public-safe description, e.g. "small TypeScript SaaS repo" or "solo maintainer CLI project">

**Agent surface:** <Codex / Claude Code / Cursor / OpenCode / mixed agents / human reviewer>

**Before:** <specific recovery failure, written without private code or customer detail>

**Harness surface used:** <AGENTS.md, project_context/global.md, architecture.md, area Context, verification Context, agent-surface recipe, etc.>

**After:** <what the next agent could recover or what became clearer>

**Still missing:** <one limitation, confusion point or follow-up issue>

**Public quote:** "<only if explicitly approved>"
```

## Copy-Ready Example

Use this as shape only. Replace it with real feedback before publishing.

```md
### Small CLI Maintainer

**Repo / team type:** solo maintainer, Node CLI project

**Agent surface:** Codex and Claude Code

**Before:** new chats repeatedly rediscovered which files were generated and which validation command mattered before release.

**Harness surface used:** `AGENTS.md`, `project_context/global.md` and `project_context/areas/main/verification.md`

**After:** the next agent could summarize the project goal, generated-file boundary and focused validation path before proposing changes.

**Still missing:** the maintainer wanted a shorter adoption checklist for existing repositories.

**Public quote:** not approved
```

## Public Snippets

README-safe:

```text
Early reviewers reported the same concrete failure mode: fresh agent chats could implement code, but first had to rediscover repo-specific goals, boundaries and validation paths. Project Tiny Context Harness is aimed at that recovery problem, not at replacing tests or review.
```

Launch-reply-safe:

```text
The most useful early feedback so far is about repeated rediscovery: which files are generated, what should not change, and which validation path matters. That is the narrow problem the harness is trying to solve.
```

Only use these after the underlying feedback exists.

## Not Allowed

Do not publish:

```text
Used by production teams.
Proven to reduce task time.
Validated by private beta.
Trusted by maintainers.
Benchmark-backed speedup.
```

Those claims require stronger public evidence than one private review or adoption note.

## Conversion Checklist

- [ ] The story describes a concrete recovery failure.
- [ ] No private repo name, customer detail, secret, raw chat log or private code is included.
- [ ] Attribution and quote consent are explicit.
- [ ] The "after" statement says what context became recoverable, not that the product is proven.
- [ ] Any limitation becomes a README/FAQ patch or GitHub issue.
- [ ] The story does not claim benchmark, award, productivity or production adoption proof.
