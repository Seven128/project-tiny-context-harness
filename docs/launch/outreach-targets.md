# Outreach Targets

Snapshot date: 2026-06-10.

This is the execution map after the GitHub repository was renamed to Project Tiny Context Harness. npm publication for `project-tiny-context-harness@0.2.39` is still required before broad launch. Recheck rules, deadlines and categories before submitting anywhere.

## Current Launch Position

Ready now:

- GitHub metadata is complete: description, homepage, MIT license and discovery topics are visible.
- Adoption handoff issue #4 is pinned; starter issues #5-#8 exist.
- Repo-hosted launch media exists: README GIF, two Product Hunt gallery PNGs and a 240x240 thumbnail.
- Trust surface exists: `SECURITY.md`, Dependabot and issue templates.
- Fresh-agent recovery walkthrough is linked from README.

Not ready yet:

- npm latest for `project-tiny-context-harness` is not published; current registry state is 404.
- GitHub Release for the renamed package should wait until npm publish succeeds.
- `node tools/launch_readiness_check.mjs --strict-external` fails until npm publish succeeds.
- No external launch post.
- No outside adoption report, testimonial or contribution.
- 0 GitHub stars and 0 forks at snapshot time.

Practical implication: broad public launch should wait for npm publish. Awards and high-star outcomes are still evidence-gated.

## Priority Sequence

| Priority | Target | Why now | Required packet | Success signal |
|---:|---|---|---|---|
| 1 | Hacker News Show HN | HN's Show HN format is for something people can try and discuss; this package is now installable. | GitHub URL, short text post, demo link if possible, explicit feedback ask. | Comments discuss agent handoff/context drift rather than generic AI tooling. |
| 2 | Agentic-coding awesome lists | Two smaller lists match repo-level agent instructions and team adoption now. | PR copy and exact patches from `docs/launch/awesome-list-submissions.md` and `docs/launch/external-prs/`, no benchmark/adoption claims. | Listing accepted or maintainer feedback clarifies the category. |
| 3 | Product Hunt | Product Hunt is useful for distribution, feedback and social proof; submissions can be scheduled up to one month ahead. | Demo media, tagline, maker comment, at least two gallery images/GIFs, GitHub/npm links. | Reviews/comments from developer-tool users and enough traffic to validate messaging. |
| 4 | Reddit / niche communities | Good for focused feedback from Codex, Claude Code, Cursor and local-first tool users. | Reddit draft from launch kit, demo, #4 adoption issue link. | Replies describe missing facts agents rediscover in real repos. |
| 5 | Broader awesome lists | Higher-exposure lists create durable discovery after the README/demo are clear. | One-line description, category fit, demo link, no award/benchmark claims. | Listing accepted or maintainers give positioning feedback. |
| 6 | Awards | Awards need visible adoption or explicit eligibility thresholds. | Launch metrics, adoption reports, demo, docs quality evidence. | Nomination accepted or shortlist feedback. |

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

Use Product Hunt after Show HN or first feedback unless there is a scheduling reason to move sooner. Product Hunt is better for broader distribution than deep technical critique, so the page needs visuals and very simple language. The current repo already has a GIF, two gallery images and a thumbnail under `docs/launch/assets/`.

Submission packet:

- URL: `https://github.com/Seven128/project-tiny-context-harness`
- Name: `Project Tiny Context Harness`
- Tagline: `Minimal project memory for AI coding agents`
- Topics: Developer Tools, Artificial Intelligence, Open Source
- First comment: use the Product Hunt draft in `docs/launch/README.md`, updated with the demo link.
- Media: `docs/launch/assets/product-hunt-gallery-1.png`, `docs/launch/assets/product-hunt-gallery-2.png`, `docs/launch/assets/product-hunt-thumbnail.png` and optional YouTube demo video. Product Hunt recommends a square 240x240 thumbnail under 3MB, a tagline under 60 characters, a description under 500 characters, up to three launch tags and a first maker comment.

### Curated Lists

Start with the two P0 agentic-coding lists in [awesome-list-submissions.md](awesome-list-submissions.md). Exact patch files, PR titles, PR bodies and manual `gh` commands live in [external-prs/README.md](external-prs/README.md):

- [Transcenda/awesome-agentic-coding](https://github.com/Transcenda/awesome-agentic-coding), under `Agent instructions and Skills`.
- [jordimas/awesome-agentic-engineering](https://github.com/jordimas/awesome-agentic-engineering), under `Team Adoption`.

Then try [awesome-ai-devtools](https://github.com/jamesmurdza/awesome-ai-devtools) after the demo is live. It is broad enough for a repo-native agent-context tool, but the submission is stronger once the demo proves the AI-agent workflow.

Possible listing text:

```text
Project Tiny Context Harness - Minimal repo-native project memory for AI coding agents. Installs project_context files, AGENTS.md guidance and a validate-context gate so fresh agent chats can recover project intent and validation paths.
```

Hold on [awesome-opencode](https://github.com/awesome-opencode/awesome-opencode) unless the README gains an OpenCode-specific note. It is an ecosystem list, and a generic Harness entry would be weaker without a concrete OpenCode usage story.

### Awards

| Target | Current official signal | Fit now | Gate |
|---|---|---|---|
| [The Commits](https://www.commits.dev/) | 2026 event page lists Small/Large Project, Documentation & Design Excellence and Community Choice categories, with an August 11, 2026 award show. | Medium after first launch; docs angle is plausible. | Submit after demo, first launch and at least one real adoption signal, or submit Documentation & Design Excellence if nomination timing is at risk. |
| [JavaScript Open Source Awards](https://osawards.com/javascript/) | Requirements include OSI-approved license, active contribution in last 6 months and 100+ stars. | Not eligible now because stars are 0. | Revisit at 100+ stars. |
| [OpenUK Awards](https://openuk.uk/awards/) | 2026 awards are UK-focused open tech, with ceremony on 2026-11-05. | Low unless maintainer/project geography and category fit are confirmed. | Confirm UK presence and category eligibility before spending effort. |
| [DevOps Dozen](https://devopsdozen.com/) | 2025 process had public nominations, finalist voting and judge weighting; the OSS category recognizes community value around open source development assets. | Low now; project is not primarily DevOps and has no community evidence yet. | Revisit only with DevOps/tooling adoption evidence. |
| [Product Hunt Golden Kitty Awards](https://www.producthunt.com/golden-kitty-awards) | Product Hunt has Engineering & Development and AI Agents award surfaces. | Possible only after Product Hunt launch. | Product Hunt launch must happen first and show traction. |

## Operating Rules

- Lead with the problem: new agent chats lose project intent.
- Keep the claim narrow: repo-native Minimal Context for fresh-agent recovery.
- Ask for feedback and missing facts, not stars.
- Treat stars as distribution telemetry, not proof of quality.
- Turn repeated questions into README/FAQ or issues within 24 hours.
- Do not submit to award programs before the demo and first public feedback exist.

## Next Concrete Actions

1. Post Show HN first using `docs/launch/primary-launch.md` and the repo-hosted GIF if useful.
2. Submit the two P0 agentic-coding awesome-list PRs from `docs/launch/external-prs/README.md`.
3. Track stars, forks, npm downloads and comments for 24 hours.
4. Patch README/FAQ from repeated confusion.
5. Use the Product Hunt media packet only after the first feedback loop or with a deliberate scheduling decision.
