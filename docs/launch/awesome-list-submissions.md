# Awesome List Submission Packet

Snapshot date: 2026-06-10.

This packet prepares curated-list pull requests. It is intentionally narrower than the broad launch kit: the goal is durable discovery in agentic-coding resource lists, not mass-market traffic.

## Submission Rules

- Submit only to lists where AI SDLC Harness fits the maintainer's stated scope.
- Keep the listing factual and short.
- Do not claim adoption, benchmark wins, awards or superiority over other tools.
- Prefer "project memory / context recovery for coding agents" over "SDLC framework".
- Link to the GitHub repository, not npm, because list maintainers usually review source and README quality.

## P0: Transcenda Awesome Agentic Coding

Target: [Transcenda/awesome-agentic-coding](https://github.com/Transcenda/awesome-agentic-coding)

Why it fits now: the list has an `Agent instructions and Skills` section and asks for concrete use cases, a clear why and an "In practice" prompt. AI SDLC Harness directly supports repo-level agent instructions plus maintained Context recovery.

Suggested section: `Agent instructions and Skills`.

Suggested entry:

```md
- [AI SDLC Harness](https://github.com/Seven128/project-agent-sdlc) - Minimal repo-native project memory for AI coding agents. It installs `AGENTS.md`, `project_context/**` and a `validate-context` gate so fresh agent sessions recover project intent, boundaries and validation paths without a full SDLC ceremony.

**Why:** agent instructions are more reliable when they point to a small maintained fact source instead of forcing every new chat to rediscover the project goal, non-goals and test commands.

**In practice:** before asking a new agent to change code, have it read `AGENTS.md` and `project_context/**`, then summarize the project goal, boundaries and validation commands; run `validate-context` to keep those recovery facts honest.
```

PR title:

```text
Add AI SDLC Harness for minimal agent context recovery
```

PR body:

```text
Adds AI SDLC Harness as a practical repo-level context recovery tool for agentic coding teams.

It fits the Agent instructions and Skills section because it keeps AGENTS.md short while maintaining project_context facts that fresh coding-agent sessions can read before editing code.
```

## P0: Awesome Agentic Engineering

Target: [jordimas/awesome-agentic-engineering](https://github.com/jordimas/awesome-agentic-engineering)

Why it fits now: the list prioritizes practical, team-applicable resources for teams adopting agentic engineering.

Suggested section: `Team Adoption`.

Suggested entry:

```md
- [AI SDLC Harness](https://github.com/Seven128/project-agent-sdlc) - Minimal Context Harness for teams using coding agents; keeps project goals, non-goals, architecture boundaries and validation paths in repo-native files so new agent sessions recover intent before editing code.
```

PR title:

```text
Add AI SDLC Harness to team adoption resources
```

PR body:

```text
Adds AI SDLC Harness as a practical team-adoption resource for keeping coding-agent context recoverable across new chats, handoffs and debugging sessions.

It is not an autonomous coding agent; it complements tools like Codex, Claude Code, Cursor and OpenCode by maintaining the repo facts those agents should read before proposing changes.
```

## P1: Awesome AI Devtools

Target: [jamesmurdza/awesome-ai-devtools](https://github.com/jamesmurdza/awesome-ai-devtools)

Gate before submitting: publish a demo GIF/video or a concrete walkthrough that proves the tool improves an AI-agent workflow. The list is a higher-exposure AI developer-tool directory, but the current project is a harness/context tool rather than a direct AI-powered product. The submission is stronger after the demo shows the agent workflow end to end.

Candidate category: `Configuration & Context Management` if it still exists when submitting.

Candidate line:

```md
- [AI SDLC Harness](https://github.com/Seven128/project-agent-sdlc) - Minimal repo-native project memory for AI coding agents, with `AGENTS.md`, `project_context/**` and a `validate-context` gate for fresh-agent recovery.
```

## P1: Awesome Agent Skills

Target: [heilcheng/awesome-agent-skills](https://github.com/heilcheng/awesome-agent-skills)

Gate before submitting: expose a clean, standalone Skill URL or package story. This list is about the `SKILL.md` ecosystem, while AI SDLC Harness currently ships several project-local and package-managed Skills as part of the harness. A generic repo submission would be weaker than a clear Skill-specific entry.

## Execution Order

1. Submit Transcenda PR after the Show HN packet is ready.
2. Submit jordimas PR after Transcenda, using the shorter team-adoption copy.
3. Wait for demo video/GIF before `awesome-ai-devtools`.
4. Wait for standalone Skill packaging before `awesome-agent-skills`.
5. If a maintainer rejects the wording as too framework-like, revise toward "repo-native context recovery" and away from "SDLC".
