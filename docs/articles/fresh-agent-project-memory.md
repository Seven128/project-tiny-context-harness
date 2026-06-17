# Fresh Coding-Agent Sessions Need Project Memory, Not More Ceremony

AI coding agents are often strong inside one focused thread. The harder failure mode is the next thread.

A new session may have the same repository, the same tests and the same issue, but it no longer has the project-specific context that shaped the last decision:

- why the repository is organized this way
- which old approach should not come back
- which validation path is the maintainer's first stop
- which facts belong in a shared project memory rather than a chat transcript
- when a task should stay code-first instead of becoming a planning exercise

Project Tiny Context Harness is built for that smaller problem. It is repo-native project memory for AI coding agents, not an autonomous Tiny Context system.

## The Small Shape

The package installs a compact recovery surface:

```text
AGENTS.md
project_context/
  context.toml
  global.md
  architecture.md
  areas/main.md
  areas/main/verification.md
```

The intended split is simple:

- `AGENTS.md` stays the short startup router and hard-boundary surface.
- `project_context/**` holds durable project facts a fresh agent should recover.
- role Skills keep reusable agent workflows out of the startup path.
- `validate-context` checks that the recovery surface is present and not misleading.

This is not a task log. It is not a second issue tracker. It is not a place to store test results.

The useful Context answers questions a fresh agent repeatedly needs:

- What is this project trying to preserve?
- What is explicitly out of scope?
- Where are the architecture and ownership boundaries?
- What validation command should be tried first?
- Which previous design should not be reintroduced?

## Why Not Just Keep Growing AGENTS.md?

`AGENTS.md` is useful because it is predictable. A fresh agent can start there.

The problem is that a single startup file becomes noisy when it carries every kind of information:

- permanent project boundaries
- temporary task state
- design rationale
- validation commands
- role-specific checklists
- local tool quirks
- onboarding notes

Project Tiny Context Harness treats `AGENTS.md` as the router:

```text
Read the project Context first.
Use the Context graph to find relevant areas.
Respect project non-goals and validation boundaries.
Update Context only when durable facts change.
Do not treat Context as proof that tests passed.
```

Then the long-lived facts live in smaller files with clearer ownership.

## Why Drop The Stage Ceremony?

Earlier versions of this project were closer to a full Tiny Context workflow: lifecycle phases, task state, stage-specific skills, work-product trees and frequent gates.

That shape had a real cost. Ordinary and medium-sized coding tasks spent too much time moving through phases and checking artifacts. More importantly, modern coding agents already internalize much of the local loop: understand the request, inspect code, choose an implementation path, edit, test and repair.

The current design keeps the part with the clearest return:

```text
durable project facts that survive fresh sessions
```

It drops the default requirement that every task become a staged process.

## What The Validator Does

`validate-context` is intentionally narrow. It checks recoverability:

- required Context files exist
- the Context graph points to valid paths
- role names and metadata are shaped correctly
- obvious fake verification-result claims are rejected

It does not prove product quality.

That separation matters. The repository's own tests, CI, review and human acceptance still prove whether the product works. The Harness only helps future agent sessions find the right project facts and validation entry points.

## When It Helps

This approach is most useful when:

- agents keep rediscovering the same project intent
- multiple tools or chats touch the same repository
- reviews reveal that agents missed an old boundary
- validation commands are easy to forget
- decisions are stable enough to belong in the repo

It is less useful when:

- the repository is tiny and self-evident
- a task needs only one local code edit
- the missing knowledge is external library documentation
- the team actually wants a full spec-first or task-state workflow

## Try It

Use npm for the normal install path:

```sh
npm install -D project-tiny-context-harness@latest
npx --yes --package project-tiny-context-harness@latest ty-context init
make validate-context
```

Use the source checkout path for private review, source-preview testing or package development:

```sh
git clone https://github.com/Seven128/project-tiny-context-harness.git
cd project-tiny-context-harness
npm ci
npm run smoke:quickstart
```

Then run a fresh-agent recovery check:

```text
Read AGENTS.md and project_context/** first. Summarize the project goal, non-goals, architecture boundaries, validation entry points and next safe action before proposing code changes.
```

If that answer is accurate without rediscovering the repository from scratch, the Harness is doing its job.

## The Claim Boundary

The current public claim is deliberately narrow:

```text
Project Tiny Context Harness helps fresh coding-agent sessions recover durable project intent, boundaries and validation paths.
```

It is not a benchmark-proven productivity multiplier. It does not replace tests, CI, review, issue trackers, specs, retrieval tools or human judgment.

The question worth testing in real repositories is smaller and more useful:

```text
Which project facts should every fresh agent recover before it edits code?
```
