# Market Map

Snapshot date: 2026-06-10.

This file is a launch planning snapshot, not durable product truth. Recheck stars, descriptions, categories and eligibility before using it externally.

## Current Public State

Public state after the launch-readiness release, checked against public GitHub and npm APIs:

| Surface | Snapshot |
|---|---|
| GitHub repository | `Seven128/project-agent-sdlc` on default branch `main` |
| GitHub stars / forks | 0 stars, 0 forks |
| GitHub description / license | `Minimal project memory and validation harness for AI coding agents.`, MIT detected |
| GitHub topics | `agent-context`, `agents-md`, `ai-agents`, `claude-code`, `cli`, `codex`, `coding-agent`, `context-engineering`, `cursor`, `developer-productivity`, `developer-tools`, `sdlc`, `workflow` |
| GitHub release | `v0.2.39` published and marked latest |
| npm package | `agent-project-sdlc@0.2.39` |
| npm public metadata | Updated description, MIT license, homepage, repository, bugs URL and discovery keywords |
| npm downloads | 3,573 downloads for 2026-05-27 through 2026-06-02 |
| Launch readiness | `node tools/launch_readiness_check.mjs --strict-external` reports `Status: pass` |

Interpretation: repository and npm metadata are now launch-ready. The remaining blocker for serious public distribution is not metadata; it is the demo/evidence surface: a short recording, one primary launch post, then rapid README/FAQ updates from real feedback.

## Competitive Snapshot

GitHub public repository snapshot:

| Project | Stars | Positioning | What it owns |
|---|---:|---|---|
| [anomalyco/opencode](https://github.com/anomalyco/opencode) | 172,063 | Open source coding agent | Agent runtime |
| [github/spec-kit](https://github.com/github/spec-kit) | 110,772 | Spec-driven development toolkit | Spec workflow |
| [OpenHands/OpenHands](https://github.com/OpenHands/OpenHands) | 76,317 | AI-driven development platform | Agent/runtime platform |
| [upstash/context7](https://github.com/upstash/context7) | 57,057 | Up-to-date docs for LLMs/code editors | External documentation context |
| [bmad-code-org/BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) | 48,839 | Agile AI-driven development method | Role/process workflow |
| [eyaltoledano/claude-task-master](https://github.com/eyaltoledano/claude-task-master) | 27,358 | AI task-management system | Task state and decomposition |
| [oraios/serena](https://github.com/oraios/serena) | 25,157 | MCP toolkit and semantic code agent IDE | Semantic retrieval/editing |
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

1. Record the two-minute terminal demo from `docs/launch/README.md`.
2. Post one primary launch first, ideally Hacker News for technical feedback or Product Hunt for broader discovery.
3. Reuse the same claim on smaller communities only after the first feedback pass.
4. Update README/launch copy from actual confusion points within 24 hours.
5. Submit to curated lists after the demo is live and the README has absorbed first feedback.
6. Nominate for awards only after real use appears or a minimum eligibility threshold is met.

## Evidence To Gather Next

- One clean 60-90 second demo using `agent-project-sdlc@latest`.
- One example PR showing how `project_context/**` prevents agent drift.
- One fresh benchmark rerun that compares baseline vs Minimal Context without old stage results.
- User quotes or issues that mention real handoff/recovery value.
- npm download trend after launch.

## Adjacent Curated Lists

These are lower priority than the first public launch, but useful after the demo exists.

| List | Current scale | Fit | Gate before PR |
|---|---:|---|---|
| [awesome-ai-devtools](https://github.com/jamesmurdza/awesome-ai-devtools) | 3,825 stars | Broad AI developer tools list; likely the best first curated-list target. | Demo live, README concise, one-line category fit ready. |
| [awesome-opencode](https://github.com/awesome-opencode/awesome-opencode) | 7,766 stars | OpenCode ecosystem list; fit is indirect unless Harness documents OpenCode usage. | Add an OpenCode-specific usage note or skip. |
| [awesome-agents](https://github.com/kyrolabs/awesome-agents) | 2,403 stars | Broad AI agent list; Harness is support infrastructure, not an agent. | Position as agent workflow/context infrastructure, not an autonomous agent. |
| [awesome-opensource-ai](https://github.com/alvinreal/awesome-opensource-ai) | 3,833 stars | Broad open-source AI list; possible after visible adoption. | Wait for demo and at least one adoption report. |
