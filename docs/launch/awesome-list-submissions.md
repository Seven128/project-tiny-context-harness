# Awesome List Submission Packet

Snapshot date: 2026-06-10.

This packet prepares curated-list pull requests. It is intentionally narrower than the broad launch kit: the goal is durable discovery in agentic-coding resource lists, not mass-market traffic.

## Submission Rules

- Submit only to lists where Tiny Context Harness fits the maintainer's stated scope.
- Keep the listing factual and short.
- Do not claim adoption, benchmark wins, awards or superiority over other tools.
- Prefer "project memory / context recovery for coding agents" over "SDLC framework".
- Link to the GitHub repository, not npm, because list maintainers usually review source and README quality.

## P0: Transcenda Awesome Agentic Coding

Target: [Transcenda/awesome-agentic-coding](https://github.com/Transcenda/awesome-agentic-coding)

Why it fits now: the list has an `Agentic Coding Toolbox` section with `Agent instructions and Skills`. Tiny Context Harness directly supports repo-level agent instructions plus maintained Context recovery.

Suggested section: `Agent instructions and Skills`.

Patch packet: [external-prs/README.md](external-prs/README.md).

Suggested entry:

```md
- [Tiny Context Harness](https://github.com/Seven128/project-agent-sdlc) — minimal project-memory harness for AI coding agents, installing `AGENTS.md`, `project_context/**`, role Skills, and `validate-context`.
```

PR title:

```text
Add Tiny Context Harness to agent instructions and skills
```

PR body:

```text
Adds Tiny Context Harness to the Agent instructions and Skills toolbox.

It gives teams a practical in-repo recovery path for AI coding agents: project intent, boundaries, verification paths, role Skills, and a `validate-context` check across new chats, handoffs, and tool changes.
```

## P0: Awesome Agentic Engineering

Target: [jordimas/awesome-agentic-engineering](https://github.com/jordimas/awesome-agentic-engineering)

Why it fits now: the list prioritizes practical, team-applicable resources for teams adopting agentic engineering.

Suggested section: `Team Adoption`.

Patch packet: [external-prs/README.md](external-prs/README.md).

Suggested entry:

```md
- [Tiny Context Harness](https://github.com/Seven128/project-agent-sdlc) — Minimal project-memory and validation harness for teams adopting AI coding agents, so fresh agents recover project intent, boundaries, and verification paths across chats and handoffs.
```

PR title:

```text
Add Tiny Context Harness to team adoption resources
```

PR body:

```text
Adds Tiny Context Harness under Team Adoption.

It is a practical, team-applicable resource for keeping minimal durable project memory in-repo so AI coding agents can recover intent, boundaries, and validation paths across chats and handoffs.
```

## P1: Awesome AI Devtools

Target: [jamesmurdza/awesome-ai-devtools](https://github.com/jamesmurdza/awesome-ai-devtools)

Gate before submitting: publish a demo GIF/video or a concrete walkthrough that proves the tool improves an AI-agent workflow. The list is a higher-exposure AI developer-tool directory, but the current project is a harness/context tool rather than a direct AI-powered product. The submission is stronger after the demo shows the agent workflow end to end.

Candidate category: `Configuration & Context Management` if it still exists when submitting.

Candidate line:

```md
- [Tiny Context Harness](https://github.com/Seven128/project-agent-sdlc) - Minimal repo-native project memory for AI coding agents, with `AGENTS.md`, `project_context/**` and a `validate-context` gate for fresh-agent recovery.
```

## P1: Awesome Agent Skills

Target: [heilcheng/awesome-agent-skills](https://github.com/heilcheng/awesome-agent-skills)

Gate before submitting: expose a clean, standalone Skill URL or package story. This list is about the `SKILL.md` ecosystem, while Tiny Context Harness currently ships several project-local and package-managed Skills as part of the harness. A generic repo submission would be weaker than a clear Skill-specific entry.

## Execution Order

1. Submit Transcenda PR after the Show HN packet is ready.
2. Submit jordimas PR after Transcenda, using the shorter team-adoption copy.
3. Wait for demo video/GIF before `awesome-ai-devtools`.
4. Wait for standalone Skill packaging before `awesome-agent-skills`.
5. If a maintainer rejects the wording as too framework-like, revise toward "repo-native context recovery" and away from "SDLC".
