# Outreach Targets

Snapshot date: 2026-06-10.

This is the execution map after `agent-project-sdlc@0.2.39` was published and launch readiness passed. Recheck rules, deadlines and categories before submitting anywhere.

## Current Launch Position

Ready now:

- GitHub metadata is complete: description, homepage, MIT license and discovery topics are visible.
- npm latest is `agent-project-sdlc@0.2.39` with updated description, MIT license, homepage, repository, bugs URL and keywords.
- GitHub Release `v0.2.39` is published.
- `node tools/launch_readiness_check.mjs --strict-external` reports `Status: pass`.
- Adoption handoff issue #4 is pinned; starter issues #5-#8 exist.

Not ready yet:

- No public demo recording.
- No external launch post.
- No outside adoption report, testimonial or contribution.
- 0 GitHub stars and 0 forks at snapshot time.

Practical implication: public launch is now feasible, but awards and high-star outcomes are still evidence-gated.

## Priority Sequence

| Priority | Target | Why now | Required packet | Success signal |
|---:|---|---|---|---|
| 1 | Hacker News Show HN | HN's Show HN format is for something people can try and discuss; this package is now installable. | GitHub URL, short text post, demo link if possible, explicit feedback ask. | Comments discuss agent handoff/context drift rather than generic AI tooling. |
| 2 | Product Hunt | Product Hunt is useful for distribution, feedback and social proof; submissions can be scheduled up to one month ahead. | Demo media, tagline, maker comment, screenshots/GIF, GitHub/npm links. | Reviews/comments from developer-tool users and enough traffic to validate messaging. |
| 3 | Reddit / niche communities | Good for focused feedback from Codex, Claude Code, Cursor and local-first tool users. | Reddit draft from launch kit, demo, #4 adoption issue link. | Replies describe missing facts agents rediscover in real repos. |
| 4 | Awesome lists | Curated lists create durable discovery after the README/demo are clear. | One-line description, category fit, demo link, no award/benchmark claims. | Listing accepted or maintainer feedback gives clearer positioning. |
| 5 | Awards | Awards need visible adoption or explicit eligibility thresholds. | Launch metrics, adoption reports, demo, docs quality evidence. | Nomination accepted or shortlist feedback. |

## Channel Details

### Hacker News

Source: [Show HN Guidelines](https://news.ycombinator.com/showhn.html).

Use `Show HN: Minimal project memory for AI coding agents`.

Do:

- Link to the GitHub repository, not a blog post.
- Make clear that the package can be installed and tried immediately.
- Ask for technical feedback from people using agents on real repositories.
- Keep language factual and avoid award/star asks.

Do not:

- Post before the demo or README first screen can explain the product quickly.
- Claim benchmark-proven speedups.
- Frame it as a full autonomous SDLC framework.

### Product Hunt

Sources: [Product Hunt Launch Guide](https://www.producthunt.com/launch), [Preparing for Launch](https://www.producthunt.com/launch/preparing-for-launch), [How Product Hunt Works](https://www.producthunt.com/launch/how-product-hunt-works).

Use Product Hunt after the demo exists. Product Hunt is better for broader distribution than deep technical critique, so the page needs visuals and very simple language.

Submission packet:

- URL: `https://github.com/Seven128/project-agent-sdlc`
- Name: `AI SDLC Harness`
- Tagline: `Minimal project memory for AI coding agents`
- Topics: Developer Tools, Artificial Intelligence, Open Source
- First comment: use the Product Hunt draft in `docs/launch/README.md`, updated with the demo link.
- Media: terminal demo GIF or short video, plus one screenshot of generated `project_context/**`.

### Curated Lists

Start with [awesome-ai-devtools](https://github.com/jamesmurdza/awesome-ai-devtools) after the demo is live. It is broad enough for a repo-native agent-context tool.

Possible listing text:

```text
AI SDLC Harness - Minimal repo-native project memory for AI coding agents. Installs project_context files, AGENTS.md guidance and a validate-context gate so fresh agent chats can recover project intent and validation paths.
```

Hold on [awesome-opencode](https://github.com/awesome-opencode/awesome-opencode) unless the README gains an OpenCode-specific note. It is an ecosystem list, and a generic Harness entry would be weaker without a concrete OpenCode usage story.

### Awards

| Target | Current official signal | Fit now | Gate |
|---|---|---|---|
| [The Commits](https://www.commits.dev/) | 2026 event page lists Small/Large Project, Documentation & Design Excellence and Community Choice categories. | Medium later; docs angle is plausible. | Submit after demo, first launch and at least one real adoption signal. |
| [JavaScript Open Source Awards](https://osawards.com/javascript/) | Requirements include OSI-approved license, active contribution in last 6 months and 100+ stars. | Not eligible now because stars are 0. | Revisit at 100+ stars. |
| [OpenUK Awards](https://openuk.uk/awards/) | 2026 awards are UK-focused open tech, with ceremony on 2026-11-05; OpenUK notes nominations in June. | Low unless maintainer/project geography and category fit are confirmed. | Confirm eligibility before spending effort. |
| [DevOps Dozen](https://devopsdozen.com/) | 2025 page lists public nominations, finalist voting and DevOps categories; community nominations are closed on the category page. | Low now; project is not primarily DevOps. | Revisit only with DevOps adoption evidence. |
| [Product Hunt Golden Kitty Awards](https://www.producthunt.com/golden-kitty-awards) | Product Hunt has Engineering & Development and AI Agents award surfaces. | Possible only after Product Hunt launch. | Product Hunt launch must happen first and show traction. |

## Operating Rules

- Lead with the problem: new agent chats lose project intent.
- Keep the claim narrow: repo-native Minimal Context for fresh-agent recovery.
- Ask for feedback and missing facts, not stars.
- Treat stars as distribution telemetry, not proof of quality.
- Turn repeated questions into README/FAQ or issues within 24 hours.
- Do not submit to award programs before the demo and first public feedback exist.

## Next Concrete Actions

1. Finish #5: record the 60-90 second recovery demo.
2. Post one Show HN or Product Hunt launch, not both on the same day.
3. Track stars, forks, npm downloads and comments for 24 hours.
4. Patch README/FAQ from repeated confusion.
5. Submit the first curated-list PR only after the demo link is stable.
