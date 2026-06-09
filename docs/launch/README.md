# Launch Kit

This is the maintainer launch kit for AI SDLC Harness. It is copy-ready material for public release posts, repository metadata, demo scripting and submission prep.

Do not claim benchmark wins yet. Current public positioning is based on product design and smoke evidence: the package installs a small, durable recovery surface and `validate-context` gate. Fresh Minimal Context benchmark runs are still required before publishing efficiency claims.

For competitor and feasibility context, see [market-map.md](market-map.md).

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
