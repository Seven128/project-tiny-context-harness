# Market Map

Snapshot date: 2026-06-10.

This file is a launch planning snapshot, not durable product truth. Recheck stars, descriptions, categories and eligibility before using it externally.

## Current Public State

Public state before the launch-readiness changes are merged and published, checked against public GitHub and npm APIs:

| Surface | Snapshot |
|---|---|
| GitHub repository | `Seven128/project-agent-sdlc` on default branch `main` |
| GitHub stars / forks | 0 stars, 0 forks |
| GitHub description / license | Empty description, no detected license in public metadata |
| npm package | `agent-project-sdlc@0.2.38` |
| npm public metadata | Old description, no public license/homepage yet |
| npm downloads | 3,573 downloads for 2026-05-27 through 2026-06-02 |

Interpretation: the project is not currently discoverable on GitHub, but npm has enough existing usage/download noise to justify a serious README, metadata and launch cleanup before public posting.

## Competitive Snapshot

GitHub public repository snapshot:

| Project | Stars | Positioning | What it owns |
|---|---:|---|---|
| [anomalyco/opencode](https://github.com/anomalyco/opencode) | 172,052 | Open source coding agent | Agent runtime |
| [github/spec-kit](https://github.com/github/spec-kit) | 110,757 | Spec-driven development toolkit | Spec workflow |
| [OpenHands/OpenHands](https://github.com/OpenHands/OpenHands) | 76,316 | AI-driven development platform | Agent/runtime platform |
| [upstash/context7](https://github.com/upstash/context7) | 57,057 | Up-to-date docs for LLMs/code editors | External documentation context |
| [bmad-code-org/BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) | 48,838 | Agile AI-driven development method | Role/process workflow |
| [eyaltoledano/claude-task-master](https://github.com/eyaltoledano/claude-task-master) | 27,358 | AI task-management system | Task state and decomposition |
| [oraios/serena](https://github.com/oraios/serena) | 25,155 | MCP toolkit and semantic code agent IDE | Semantic retrieval/editing |
| [SuperClaude-Org/SuperClaude_Framework](https://github.com/SuperClaude-Org/SuperClaude_Framework) | 23,235 | Claude Code commands, personas and methodology | Agent configuration framework |

Interpretation: the visible AI coding/dev workflow market already has several 20k-170k star projects. AI SDLC Harness should not compete head-on as another agent, task manager, full SDLC method or retrieval engine.

## Wedge

AI SDLC Harness has the strongest wedge if it stays narrow:

```text
Repo-native project memory for fresh-agent recovery.
```

The message should be:

- Agents are strong inside one thread.
- The next thread often loses project-specific facts.
- Minimal Context keeps those facts in the repository.
- It complements tests, specs, task planners, coding agents and retrieval tools.
- It does not promise benchmark-proven speedups yet.

## Audience

Prioritize:

- Developers using Codex, Claude Code, Cursor, Cline, Roo, Gemini CLI or multiple agent tools on the same repo.
- Maintainers who already write `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md` or handoff notes.
- Small teams doing repeated agent handoffs, RFC changes, debugging turns or reviews.
- People who like Spec Kit/BMAD/Task Master but want a lighter default for ordinary repos.

Deprioritize:

- Users looking for a complete autonomous coding agent.
- Teams that want Jira/backlog ownership.
- Users who expect external documentation retrieval.
- Organizations that need a heavy compliance SDLC suite.

## Feasibility

Short-term realistic outcomes after GitHub default branch, npm metadata and launch kit are fixed:

- 10-100 stars: feasible with a clear HN/Reddit/Product Hunt style launch and working smoke/demo.
- 100-1,000 stars: requires repeated distribution, a short demo, adoption examples and clear differentiation from task/spec/agent tools.
- 1,000+ stars: likely requires integration stories, third-party mentions or benchmark/adoption evidence.
- Awards: possible only after a real public launch and visible adoption signal; treat awards as follow-up channels, not the first proof of value.
- 10k+ stars or major awards: not realistic from documentation alone. It would need category-level traction or a strong integration with the broader AI coding agent ecosystem.

## Positioning Rules

Say:

- Minimal project memory for AI coding agents.
- Fresh-agent recovery across new chats, handoffs and debug/RFC turns.
- Small repo-native files any agent can read.
- Context quality, not product quality.

Do not say:

- Autonomous SDLC.
- Replaces tests, CI or review.
- Faster delivery proven by benchmark.
- Better than Spec Kit, BMAD, Task Master, Context7 or Serena.
- Enterprise compliance workflow.

## Channel Plan

Recommended sequence:

1. Merge and publish the launch-readiness changes.
2. Set GitHub description/topics and confirm npm page metadata.
3. Record the two-minute terminal demo from `docs/launch/README.md`.
4. Post one primary launch first, ideally Hacker News or Product Hunt.
5. Reuse the same claim on smaller communities after feedback.
6. Update README/launch copy from actual confusion points.
7. Only after real use appears, nominate for awards or submit to curated awesome lists.

## Evidence To Gather Next

- One clean published-package smoke using `agent-project-sdlc@latest`.
- One example PR showing how `project_context/**` prevents agent drift.
- One fresh benchmark rerun that compares baseline vs Minimal Context without old stage results.
- User quotes or issues that mention real handoff/recovery value.
- npm download trend after launch.
