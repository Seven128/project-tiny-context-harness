# Launch Kit

This is the maintainer launch kit for AI SDLC Harness. It is copy-ready material for public release posts, repository metadata, demo scripting and submission prep.

Do not claim benchmark wins yet. Current public positioning is based on product design and smoke evidence: the package installs a small, durable recovery surface and `validate-context` gate. Fresh Minimal Context benchmark runs are still required before publishing efficiency claims.

For competitor and feasibility context, see [market-map.md](market-map.md). For current launch, award and curated-list execution targets, see [outreach-targets.md](outreach-targets.md). For the recording packet, see [demo.md](demo.md).

## Core Positioning

One-line description:

```text
Minimal project memory for AI coding agents: keep the repo facts a fresh agent needs to recover intent, boundaries and validation paths without a full SDLC ceremony.
```

Short description:

```text
AI SDLC Harness installs Minimal Context Harness into a repository: compact project_context files, a short AGENTS.md startup router, role Skills and a validate-context gate. It helps new agent chats, handoffs and debug/RFC turns recover project intent without requiring phase gates, task state or work-product trees.
```

Not this:

```text
Another autonomous SDLC framework, task manager, spec generator or benchmark-proven productivity multiplier.
```

## GitHub Metadata

Repository description:

```text
Minimal project memory and validation harness for AI coding agents.
```

Suggested topics:

```text
ai-agents
coding-agent
codex
claude-code
cursor
agent-context
context-engineering
agents-md
developer-tools
developer-productivity
cli
sdlc
workflow
```

Pinned repository note:

```text
Use this if agents keep losing project intent between chats. It adds a small project_context fact source, AGENTS.md router and validate-context gate; it does not replace tests, CI or review.
```

## Launch Checklist

- Merge current launch-readiness changes into the GitHub default branch.
- Run `npm run launch:check` locally; run it again without `--offline` before external launch to see current GitHub/npm metadata drift.
- Confirm README first screen shows badges, install command, positioning and 60-second trial.
- Set GitHub description and topics from this file.
- Publish a new npm version after `npm test --workspace agent-project-sdlc`, `npm run smoke:quickstart`, `make validate-context` and package source check pass.
- Confirm npm package page renders the updated package README and MIT license.
- Run `npm run smoke:quickstart` after publish against `agent-project-sdlc@latest` or a clean test project.
- Record a short terminal demo from the 60-second trial.
- Post to one primary technical venue first, then reuse the same claim across smaller channels.
- Ask for feedback on whether the recovery surface is useful, not for stars.

## Launch Operating Plan

Do not post everywhere at once. Use one primary launch to test whether strangers understand the wedge, then update copy from the actual questions people ask.

### Required Assets

| Asset | Owner action | Ready signal |
|---|---|---|
| GitHub metadata | Set description and topics from this file. | Online `launch_readiness_check` no longer reports GitHub metadata TODOs. |
| npm metadata | Publish a new package version after PR merge. | npm page shows updated README, MIT license, homepage and description. |
| 60-90 second demo | Record the demo storyboard below. | Viewer can see install, generated files and fresh-agent recovery prompt. |
| First support surface | Create a GitHub Discussion or pinned issue for adoption reports. | Launch posts have one feedback link beyond the README. |
| First contribution queue | Create low-risk docs/demo/example issues with `good first issue` and `help wanted`. | New visitors can contribute without understanding package internals. |

### Channel Matrix

| Channel | Primary audience | CTA | Success signal | Follow-up |
|---|---|---|---|---|
| Hacker News | Developers using agents on real repos. | Ask whether this recovery surface solves their handoff problem. | Comments discuss agent drift, AGENTS.md, Context files or workflow overhead. | Patch README/FAQ from confusion points within 24 hours. |
| Product Hunt | Broader developer-tool audience. | Watch the demo and try the 60-second install. | Upvotes plus concrete comments from agent users. | Add screenshots/GIF and answer every substantive comment. |
| Reddit / niche communities | Codex, Claude Code, Cursor and local-first tooling users. | Ask what facts their agents rediscover. | Replies describe real repo pain, not generic AI enthusiasm. | Convert repeated asks into issues or FAQ entries. |
| GitHub Discussions | People who tried the package. | Share adoption reports and missing recovery facts. | Real examples of Context preventing drift. | Extract durable product lessons into Context or README. |
| Awesome lists / directories | Maintainers of curated AI dev-tool indexes. | Submit only after README/npm metadata and demo are live. | Listing accepted or maintainers give positioning feedback. | Use rejection reasons to improve description/category fit. |
| X / LinkedIn | Existing network and second-wave traffic. | Point to the primary launch post and demo. | Clicks/stars from people already using coding agents. | Post milestone updates only when there is real adoption evidence. |

### Community Handoff Surface

Create these after merge and before the first broad launch:

- Discussion or pinned issue: `Show how AI SDLC Harness helped or failed in your repo`.
- Labels: `good first issue`, `help wanted`, `docs`, `demo`, `question`, `adoption-report`, `benchmark`.
- Starter issues:
  - Add a small example repository showing Minimal Context before and after.
  - Record an asciinema or GIF from the 60-second demo.
  - Improve docs for adopting an existing repo with `init --adopt`.
  - Test the package with Claude Code, Cursor, Codex and Gemini CLI and report rough friction.
  - Design a fresh Minimal Context benchmark rerun without old stage-result claims.

### Star / Adoption Milestones

Treat stars as distribution signals, not proof that the product works.

| Signal | Action |
|---|---|
| 10 stars or first external issue | Ask what made the repo worth saving; update README/FAQ from that reason. |
| 50 stars or 3 adoption reports | Publish a short follow-up with examples, not a victory claim. |
| 100 stars or first outside contribution | Create a small roadmap focused on examples, integrations and benchmark evidence. |
| 500 stars | Re-evaluate award submissions and curated-list outreach with visible adoption proof. |
| 1,000+ stars | Consider deeper integrations only if users consistently ask for them; do not abandon the minimal-memory wedge automatically. |

## Award / Recognition Targets

Verify current eligibility, deadlines and categories before submitting. Treat these as optional follow-up channels after the package has a clean public launch, working demo and at least some real adoption signal.

| Target | Why it may fit | Gate before submitting |
|---|---|---|
| [Product Hunt Golden Kitty Awards](https://www.producthunt.com/golden-kitty-awards) | Product Hunt has Developer Tools, Open Source and AI-adjacent categories for products launched on Product Hunt. | First launch on Product Hunt with a clear demo and user feedback. |
| [The Commits](https://www.commits.dev/) | Open source categories include Small Project of the Year, Documentation & Design Excellence and Community Choice. | Public repo must show active maintenance, clear docs and real community use. |
| [JavaScript Open Source Awards](https://osawards.com/javascript/) | Relevant if the package is positioned as a JavaScript/TypeScript open source developer tool. | Wait until it meets the listed open-source requirements, including meaningful recent activity and the public star threshold. |
| [OpenUK Awards](https://openuk.uk/awards/) | Open technology awards include software and AI categories. | Only submit if maintainer/project eligibility and geography/community fit are confirmed. |
| [DevOps Dozen](https://devopsdozen.com/) | Developer workflow and DevOps tooling recognition channel. | Submit only if the project has DevOps/tooling adoption evidence and the current fee/category terms make sense. |

Do not submit to CI/CD-specific community awards unless the product scope changes; Minimal Context Harness is not a continuous delivery project.

## Demo Storyboard

Use a clean terminal and keep the recording under 90 seconds.

| Beat | Screen | Narration |
|---|---|---|
| Problem | Empty demo repo or new terminal. | "Agents are strong in one thread. The next thread often loses repo-specific intent." |
| Install | Run the 60-second install commands. | "This adds minimal repo-native project memory, not a task manager." |
| Generated surface | Show `AGENTS.md` and the `project_context/` tree. | "These are the files a fresh agent should read before changing the repo." |
| Recovery test | Paste the fresh-agent test prompt from README. | "A good result is a summary of intent, boundaries and validation paths before code changes." |
| Boundary | Show `make validate-context`. | "This validates recovery facts; it does not replace tests or review." |
| Ask | Show GitHub README. | "Try it where new agent chats currently drift, and tell me what facts are missing." |

Thumbnail text:

```text
Minimal project memory for AI coding agents
```

## Demo Script

Goal: show the problem, install path and generated recovery surface in under two minutes.

1. Start with: "AI agents are fast in one thread, but new chats lose project-specific intent."
2. Show an empty demo repository.
3. Run:

```sh
npm install -D agent-project-sdlc@latest
npx --yes --package agent-project-sdlc@latest sdlc-harness init
make validate-context
```

4. Open `AGENTS.md`, `project_context/global.md` and `project_context/architecture.md`.
5. Say: "This is not a task manager or full SDLC workflow. It is a small memory surface any agent can read before changing the repo."
6. End with the ask: "Try it on a project where agent handoffs or new chats currently drift."

## Hacker News Draft

Title:

```text
Show HN: Minimal project memory for AI coding agents
```

Body:

```text
I built AI SDLC Harness after seeing coding agents do well inside one chat but lose project-specific intent across new chats, handoffs, RFC/debug turns and tool changes.

The current package installs Minimal Context Harness: project_context files, a short AGENTS.md startup router, role Skills and a validate-context gate. The goal is not to create another full SDLC ceremony. It keeps durable repo facts small and leaves product quality to tests, CI, review and human acceptance.

Install:
npm install -D agent-project-sdlc@latest
npx --yes --package agent-project-sdlc@latest sdlc-harness init
make validate-context

I am looking for feedback from people who use Codex, Claude Code, Cursor or other coding agents on larger repos: is this recovery surface useful, too much, or missing the real handoff problem?
```

## Product Hunt Draft

Tagline:

```text
Minimal project memory for AI coding agents
```

Description:

```text
AI SDLC Harness helps coding agents recover project intent across new chats, handoffs and debugging turns. It installs compact project_context files, AGENTS.md guidance and a validate-context gate without adding a full SDLC ceremony.
```

First comment:

```text
I built this for the boring failure mode of AI coding: the agent is capable, but each new chat has to rediscover the project goal, architecture boundaries, validation commands and what must not change.

AI SDLC Harness keeps those durable facts in the repo as Minimal Context. It is not a benchmark-proven productivity claim yet and it does not replace tests, CI or review. I would like feedback on whether this is the right minimal surface for teams using coding agents across real repos.
```

## Reddit Draft

Title:

```text
I made a minimal project-memory harness for AI coding agents
```

Body:

```text
I am working on AI SDLC Harness, an npm package that installs Minimal Context Harness into a repo.

The idea is simple: new agent chats often lose project-specific context. Instead of adding a full SDLC workflow, the package creates a small project_context fact source, AGENTS.md startup guidance and a validate-context gate so a fresh agent can recover intent, boundaries and validation paths.

It is meant to complement specs, tests, CI and code intelligence tools. It does not own task state or claim to replace review.

I would appreciate feedback from people using coding agents on non-trivial projects: what facts do your agents keep rediscovering, and would you want those facts maintained in the repo?
```

## Social Thread Draft

```text
AI coding agents are strong inside one thread.

The boring failure mode is the next thread: project intent, architecture boundaries, validation commands and "do not change this" constraints get rediscovered again.

I built AI SDLC Harness as minimal project memory for that handoff.

It installs:
- project_context/** durable facts
- AGENTS.md startup router
- role Skills for product/design/engineering asks
- validate-context gate

It does not install:
- phase gates
- task state
- work-product trees
- benchmark victory claims

The goal is small repo-native memory that any agent can read before changing code.

npm install -D agent-project-sdlc@latest
npx --yes --package agent-project-sdlc@latest sdlc-harness init
```

## Follow-Up Signals

Track:

- Stars and forks after each launch venue.
- npm downloads after publish.
- Issues that mention real repo adoption or confusion.
- Whether users understand "Minimal Context" without a long explanation.
- Whether people ask for task planning, spec generation or retrieval integrations; those are positioning signals, not automatic product scope changes.

Do not track:

- One-off benchmark anecdotes as proof.
- Raw private repo data.
- User secrets, logs or CI artifacts.
