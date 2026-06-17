# Awesome List Submission Packet

Snapshot date: 2026-06-10.

This packet prepares curated-list pull requests. It is intentionally narrower than the broad launch kit: the goal is durable discovery in agentic-coding resource lists, not mass-market traffic.

## Submission Rules

- Submit only to lists where Project Tiny Context Harness fits the maintainer's stated scope.
- Keep the listing factual and short.
- Do not claim adoption, benchmark wins, awards or superiority over other tools.
- Prefer "project memory / context recovery for coding agents" over "Tiny Context framework".
- Link to the GitHub repository, not npm, because list maintainers usually review source and README quality.
- Prioritize targets by `fit x maintenance activity x audience scale`; a high-star list with stale PR handling is lower priority than an active, well-matched list.
- Run `npm run launch:external-prs` before preparing PR branches; run `npm run launch:external-prs -- --live --clean` immediately before opening PRs to verify the prepared patches against current upstream repositories.

## Recommended Order

Open PRs by score: category fit x maintenance activity x audience scale.

Current opened set:

1. `ai-boost/awesome-harness-engineering` - open as https://github.com/ai-boost/awesome-harness-engineering/pull/58
2. `Picrew/awesome-agent-harness` - open as https://github.com/Picrew/awesome-agent-harness/pull/22
3. `Transcenda/awesome-agentic-coding` - open as https://github.com/Transcenda/awesome-agentic-coding/pull/4
4. `jordimas/awesome-agentic-engineering` - open as https://github.com/jordimas/awesome-agentic-engineering/pull/4
5. `jamesmurdza/awesome-ai-devtools` - open as https://github.com/jamesmurdza/awesome-ai-devtools/pull/636
6. `bradAGI/awesome-cli-coding-agents` - open as https://github.com/bradAGI/awesome-cli-coding-agents/pull/125
7. `ai-for-developers/awesome-ai-coding-tools` - open as https://github.com/ai-for-developers/awesome-ai-coding-tools/pull/408

Reason: the first four PRs used narrow category fit. The second wave adds higher-score directories where the category still fits and maintainers have recent activity. Do not wait on lower-activity lists simply because they appeared earlier in the previous plan.

## P1: Transcenda Awesome Agentic Coding

Target: [Transcenda/awesome-agentic-coding](https://github.com/Transcenda/awesome-agentic-coding)

Status: opened as https://github.com/Transcenda/awesome-agentic-coding/pull/4.

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

## P1: Awesome Agentic Engineering

Target: [jordimas/awesome-agentic-engineering](https://github.com/jordimas/awesome-agentic-engineering)

Status: opened as https://github.com/jordimas/awesome-agentic-engineering/pull/4.

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

## P0: Awesome AI Devtools

Target: [jamesmurdza/awesome-ai-devtools](https://github.com/jamesmurdza/awesome-ai-devtools)

Status: opened as https://github.com/jamesmurdza/awesome-ai-devtools/pull/636.

Why it fits now: the list has a matching `Agent Infrastructure / Configuration & Context Management` section, a larger AI developer-tool audience and recent upstream activity. The entry is framed as AI coding-agent context/configuration infrastructure, not a general-purpose Tiny Context framework.

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

## P0: Awesome CLI Coding Agents

Target: [bradAGI/awesome-cli-coding-agents](https://github.com/bradAGI/awesome-cli-coding-agents)

Status: opened as https://github.com/bradAGI/awesome-cli-coding-agents/pull/125.

Why it fits now: the list explicitly covers CLI coding agents and the harnesses that orchestrate, sandbox or extend them. Project Tiny Context Harness is a CLI-distributed repo-memory harness for Codex, Claude Code, Cursor, Gemini CLI, OpenCode and similar agents.

Suggested section: `Harnesses & orchestration / Agent infrastructure`.

Suggested entry:

```md
- **[Project Tiny Context Harness](https://github.com/Seven128/project-tiny-context-harness)** `⭐ 0` — Minimal repo-native project memory for CLI coding agents. Installs `AGENTS.md`, `project_context/**`, role Skills, and a `validate-context` gate so Codex, Claude Code, Cursor, Gemini CLI, OpenCode, and similar agents can recover project intent, boundaries, and validation paths across fresh sessions. MIT.
```

PR title:

```text
Add Project Tiny Context Harness to agent infrastructure
```

PR body:

```text
Adds Project Tiny Context Harness under Agent infrastructure.

It fits this list as a small CLI-distributed harness for coding-agent recovery: repo-local AGENTS.md guidance, project_context/** files, role Skills, and validate-context checks help fresh Codex, Claude Code, Cursor, Gemini CLI, OpenCode, and similar sessions recover project intent and validation paths.
```

## P0: Awesome AI Coding Tools

Target: [ai-for-developers/awesome-ai-coding-tools](https://github.com/ai-for-developers/awesome-ai-coding-tools)

Status: opened as https://github.com/ai-for-developers/awesome-ai-coding-tools/pull/408.

Why it fits now: the list has a `Developer Productivity Tools` section with adjacent project-memory and coding-agent productivity tools, a larger audience and recent merge activity.

Suggested section: `Developer Productivity Tools`.

Suggested entry:

```md
- **[Project Tiny Context Harness](https://github.com/Seven128/project-tiny-context-harness)** – Minimal repo-native project memory for AI coding agents. Installs `AGENTS.md`, `project_context/**`, role Skills, and a `validate-context` gate so fresh Codex, Claude Code, Cursor, Gemini CLI, OpenCode, and similar sessions can recover project intent, boundaries, and validation paths.
```

PR title:

```text
Add Project Tiny Context Harness
```

PR body:

```text
Adds Project Tiny Context Harness under Developer Productivity Tools.

It is an open-source CLI for AI coding-agent context recovery: repo-local AGENTS.md, project_context/**, role Skills, and validate-context checks help fresh agent sessions recover project intent and validation paths without adding a full Tiny Context workflow.
```

## P1: Awesome OpenCode

Target: [awesome-opencode/awesome-opencode](https://github.com/awesome-opencode/awesome-opencode)

Why it fits, but lower priority now: the list accepts YAML entries under `data/projects/` for tools, integrations and utilities. Project Tiny Context Harness now has a documented OpenCode setup path in `docs/agent-surface-recipes.md`, while the product remains tool-neutral and avoids claiming to be an OpenCode plugin. Its audience is good, but recent maintainer activity is weaker than the opened P0 targets.

Suggested category: `data/projects/`.

Patch packet: [external-prs/README.md](external-prs/README.md).

Suggested entry:

```yaml
name: Project Tiny Context Harness
repo: https://github.com/Seven128/project-tiny-context-harness
tagline: Minimal project memory for coding agents
description: Repo-native context recovery for OpenCode and other AI coding agents. Installs AGENTS.md, project_context/**, role Skills, and validate-context so fresh sessions can recover project intent, boundaries, and validation paths without Tiny Context phase ceremony.
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

## P3: Awesome Agent Skills

Target: [heilcheng/awesome-agent-skills](https://github.com/heilcheng/awesome-agent-skills)

Gate before submitting: expose a clean, standalone Skill URL or package story. This list is about the `SKILL.md` ecosystem, while Project Tiny Context Harness currently ships several project-local and package-managed Skills as part of the harness. A generic repo submission would be weaker than a clear Skill-specific entry.

## P0: Awesome Harness Engineering

Target: [ai-boost/awesome-harness-engineering](https://github.com/ai-boost/awesome-harness-engineering)

Why it fits now: the list has a `Context Delivery & Compaction` section for context-shaping resources in coding-agent harnesses. Project Tiny Context Harness fits as repo-native project memory and fresh-agent recovery, not as a benchmark-speed claim.

Suggested section: `Context Delivery & Compaction`.

Patch packet: [external-prs/README.md](external-prs/README.md).

Suggested entry:

```md
- [Project Tiny Context Harness](https://github.com/Seven128/project-tiny-context-harness) — Minimal repo-native project memory for AI coding agents: `project_context/**`, `AGENTS.md` guidance, role Skills, and `validate-context` help fresh agent sessions recover project intent, boundaries, ownership, and validation paths without adding Tiny Context phase ceremony.
```

PR title:

```text
Add Project Tiny Context Harness to context delivery resources
```

## P0: Awesome Agent Harness

Target: [Picrew/awesome-agent-harness](https://github.com/Picrew/awesome-agent-harness)

Why it fits now: the data-driven catalog has a `Context & Working-State Engineering` category, no hard star threshold, and accepts practical harness engineering projects. Project Tiny Context Harness fits as a small repo-local context recovery package.

Suggested category: `Context & Working-State Engineering`.

Patch packet: [external-prs/README.md](external-prs/README.md).

Suggested entry:

```yaml
name: Project Tiny Context Harness
repo_url: https://github.com/Seven128/project-tiny-context-harness
category: Context & Working-State Engineering
summary_en: Minimal Context Harness package that installs repo-local project memory, AGENTS.md guidance, role Skills, and validation for fresh-agent recovery without Tiny Context phase ceremony.
```

PR title:

```text
Add Project Tiny Context Harness to context engineering catalog
```

## Execution Order

1. Monitor `ai-boost/awesome-harness-engineering#58`; respond only within the same claim boundary.
2. Monitor `Picrew/awesome-agent-harness#22`; respond only within the same claim boundary.
3. Monitor `Transcenda/awesome-agentic-coding#4`; respond only within the same claim boundary.
4. Monitor `jordimas/awesome-agentic-engineering#4`; respond only within the same claim boundary.
5. Monitor `jamesmurdza/awesome-ai-devtools#636`; respond only within the same claim boundary.
6. Monitor `bradAGI/awesome-cli-coding-agents#125`; respond only within the same claim boundary.
7. Monitor `ai-for-developers/awesome-ai-coding-tools#408`; respond only within the same claim boundary.
8. Revisit `kyrolabs/awesome-agents` only after traction or accepted-list signal because its rules caution against brand-new projects without demonstrated traction.
9. Submit `awesome-opencode` only if OpenCode-specific relevance becomes useful or maintainer activity improves.
10. Wait for standalone Skill packaging before `awesome-agent-skills`.
11. If a maintainer rejects the wording as too framework-like, revise toward "repo-native context recovery" and away from "Tiny Context".
