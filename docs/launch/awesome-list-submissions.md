# Awesome List Submission Packet

Snapshot date: 2026-06-10.

This packet prepares curated-list pull requests. It is intentionally narrower than the broad launch kit: the goal is durable discovery in agentic-coding resource lists, not mass-market traffic.

## Submission Rules

- Submit only to lists where Project Tiny Context Harness fits the maintainer's stated scope.
- Keep the listing factual and short.
- Do not claim adoption, benchmark wins, awards or superiority over other tools.
- Prefer "project memory / context recovery for coding agents" over "SDLC framework".
- Link to the GitHub repository, not npm, because list maintainers usually review source and README quality.

## P0: Transcenda Awesome Agentic Coding

Target: [Transcenda/awesome-agentic-coding](https://github.com/Transcenda/awesome-agentic-coding)

Why it fits now: the list has an `Agentic Coding Toolbox` section with `Agent instructions and Skills`. Project Tiny Context Harness directly supports repo-level agent instructions plus maintained Context recovery.

Suggested section: `Agent instructions and Skills`.

Patch packet: [external-prs/README.md](external-prs/README.md).

Suggested entry:

```md
- [Project Tiny Context Harness](https://github.com/Seven128/project-tiny-context-harness) — minimal project-memory harness for AI coding agents, installing `AGENTS.md`, `project_context/**`, role Skills, and `validate-context`.
```

PR title:

```text
Add Project Tiny Context Harness to agent instructions and skills
```

PR body:

```text
Adds Project Tiny Context Harness to the Agent instructions and Skills toolbox.

It gives teams a practical in-repo recovery path for AI coding agents: project intent, boundaries, verification paths, role Skills, and a `validate-context` check across new chats, handoffs, and tool changes.
```

## P0: Awesome Agentic Engineering

Target: [jordimas/awesome-agentic-engineering](https://github.com/jordimas/awesome-agentic-engineering)

Why it fits now: the list prioritizes practical, team-applicable resources for teams adopting agentic engineering.

Suggested section: `Team Adoption`.

Patch packet: [external-prs/README.md](external-prs/README.md).

Suggested entry:

```md
- [Project Tiny Context Harness](https://github.com/Seven128/project-tiny-context-harness) — Minimal project-memory and validation harness for teams adopting AI coding agents, so fresh agents recover project intent, boundaries, and verification paths across chats and handoffs.
```

PR title:

```text
Add Project Tiny Context Harness to team adoption resources
```

PR body:

```text
Adds Project Tiny Context Harness under Team Adoption.

It is a practical, team-applicable resource for keeping minimal durable project memory in-repo so AI coding agents can recover intent, boundaries, and validation paths across chats and handoffs.
```

## P1: Awesome AI Devtools

Target: [jamesmurdza/awesome-ai-devtools](https://github.com/jamesmurdza/awesome-ai-devtools)

Gate before submitting: npm package publish should succeed first, and the README should keep the demo GIF, fresh-agent walkthrough and agent-surface recipes visible. The list is a higher-exposure AI developer-tool directory, so the entry must be framed as AI coding-agent context/configuration infrastructure, not a general-purpose SDLC framework.

Suggested category: `Agent Infrastructure / Configuration & Context Management`.

Patch packet: [external-prs/README.md](external-prs/README.md).

Suggested entry:

```md
- [Project Tiny Context Harness](https://github.com/Seven128/project-tiny-context-harness) — Open-source CLI for AI coding-agent project memory. Installs `AGENTS.md`, `project_context/**`, role Skills, and a `validate-context` gate so Codex, Claude Code, Cursor, Gemini CLI, OpenCode, and similar agents can recover project intent, boundaries, and validation paths across fresh sessions.
```

PR title:

```text
Add Project Tiny Context Harness
```

PR body:

```md
## Description

Adds Project Tiny Context Harness to Agent Infrastructure / Configuration & Context Management.

It is a developer-focused tool for AI coding-agent context recovery: it installs `AGENTS.md`, `project_context/**`, role Skills, and a `validate-context` gate so agents can recover project intent, boundaries, and validation paths across fresh sessions.

## Checklist

- [x] The entry is a tool that uses AI
- [x] The entry is a developer-focused tool
- [x] The description is unambiguous and clear
- [x] The description matches the style of other entries
```

## P1: Awesome OpenCode

Target: [awesome-opencode/awesome-opencode](https://github.com/awesome-opencode/awesome-opencode)

Why it fits now: the list accepts YAML entries under `data/projects/` for tools, integrations and utilities. Project Tiny Context Harness now has a documented OpenCode setup path in `docs/agent-surface-recipes.md`, while the product remains tool-neutral and avoids claiming to be an OpenCode plugin.

Suggested category: `data/projects/`.

Patch packet: [external-prs/README.md](external-prs/README.md).

Suggested entry:

```yaml
name: Project Tiny Context Harness
repo: https://github.com/Seven128/project-tiny-context-harness
tagline: Minimal project memory for coding agents
description: Repo-native context recovery for OpenCode and other AI coding agents. Installs AGENTS.md, project_context/**, role Skills, and validate-context so fresh sessions can recover project intent, boundaries, and validation paths without SDLC phase ceremony.
```

PR title:

```text
Add Project Tiny Context Harness to projects
```

PR body:

```text
Adds Project Tiny Context Harness under Projects.

It is a repo-native context recovery tool that OpenCode users can adopt through root AGENTS.md, project_context/** and an optional .opencode support-assets folder without creating separate project memories per agent.
```

## P1: Awesome Agent Skills

Target: [heilcheng/awesome-agent-skills](https://github.com/heilcheng/awesome-agent-skills)

Gate before submitting: expose a clean, standalone Skill URL or package story. This list is about the `SKILL.md` ecosystem, while Project Tiny Context Harness currently ships several project-local and package-managed Skills as part of the harness. A generic repo submission would be weaker than a clear Skill-specific entry.

## P1: Awesome Harness Engineering

Target: [ai-boost/awesome-harness-engineering](https://github.com/ai-boost/awesome-harness-engineering)

Why it fits now: the list has a `Context Delivery & Compaction` section for context-shaping resources in coding-agent harnesses. Project Tiny Context Harness fits as repo-native project memory and fresh-agent recovery, not as a benchmark-speed claim.

Suggested section: `Context Delivery & Compaction`.

Patch packet: [external-prs/README.md](external-prs/README.md).

Suggested entry:

```md
- [Project Tiny Context Harness](https://github.com/Seven128/project-tiny-context-harness) — Minimal repo-native project memory for AI coding agents: `project_context/**`, `AGENTS.md` guidance, role Skills, and `validate-context` help fresh agent sessions recover project intent, boundaries, ownership, and validation paths without adding SDLC phase ceremony.
```

PR title:

```text
Add Project Tiny Context Harness to context delivery resources
```

## P1: Awesome Agent Harness

Target: [Picrew/awesome-agent-harness](https://github.com/Picrew/awesome-agent-harness)

Why it fits now: the data-driven catalog has a `Context & Working-State Engineering` category, no hard star threshold, and accepts practical harness engineering projects. Project Tiny Context Harness fits as a small repo-local context recovery package.

Suggested category: `Context & Working-State Engineering`.

Patch packet: [external-prs/README.md](external-prs/README.md).

Suggested entry:

```yaml
name: Project Tiny Context Harness
repo_url: https://github.com/Seven128/project-tiny-context-harness
category: Context & Working-State Engineering
summary_en: Minimal Context Harness package that installs repo-local project memory, AGENTS.md guidance, role Skills, and validation for fresh-agent recovery without SDLC phase ceremony.
```

PR title:

```text
Add Project Tiny Context Harness to context engineering catalog
```

## Execution Order

1. Submit Transcenda PR after the Show HN packet is ready.
2. Submit jordimas PR after Transcenda, using the shorter team-adoption copy.
3. Submit `ai-boost/awesome-harness-engineering` when the launch packet is ready and the wording stays focused on context delivery.
4. Submit `Picrew/awesome-agent-harness` when the generated catalog workflow can be run locally.
5. Submit `awesome-opencode` after npm publish if the README still links the OpenCode setup note.
6. Submit `awesome-ai-devtools` after npm publish if the README still shows the demo GIF and agent-surface recipes.
7. Wait for standalone Skill packaging before `awesome-agent-skills`.
8. If a maintainer rejects the wording as too framework-like, revise toward "repo-native context recovery" and away from "SDLC".
