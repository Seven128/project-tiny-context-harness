# Market Map

Snapshot date: 2026-06-10.

This file is a launch planning snapshot, not durable product truth. Recheck stars, descriptions, categories and eligibility before using it externally.

## Current Public State

Public state after the repository rename, checked against public GitHub and npm APIs:

| Surface | Snapshot |
|---|---|
| GitHub repository | `Seven128/project-tiny-context-harness` on default branch `main` |
| GitHub stars / forks | 0 stars, 0 forks |
| GitHub description / license | `Minimal project memory and validation harness for AI coding agents.`, MIT detected |
| GitHub homepage | `https://www.npmjs.com/package/project-tiny-context-harness` |
| GitHub topics | `agent-context`, `agent-memory`, `agents-md`, `ai-agents`, `ai-coding`, `claude-code`, `cli`, `codex`, `coding-agent`, `context-engineering`, `context-management`, `cursor`, `developer-productivity`, `developer-tools`, `gemini-cli`, `opencode`, `project-memory`, `sdlc`, `workflow` |
| GitHub release | Latest release is `Project Tiny Context Harness 0.2.41` |
| npm package | `project-tiny-context-harness@0.2.41` is published and installable through `@latest` |
| npm public metadata | Live npm package metadata |
| npm downloads | Renamed package download window is not available yet through the npm downloads API; legacy package last-week downloads remain useful only as historical distribution telemetry |
| Launch readiness | Local `npm run launch:check` and strict external check pass; the first public Show HN post is live |

Interpretation: GitHub metadata, npm distribution, the renamed GitHub Release and demo media are live. The remaining work for serious public distribution is feedback handling and durable discovery: post the HN maintainer comment, track 6-hour and 24-hour metrics, patch README/FAQ from repeated confusion, then submit narrow curated-list PRs.

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

Interpretation: the visible AI coding/dev workflow market already has several 20k-170k star projects. Project Tiny Context Harness should not compete head-on as another agent, task manager, full SDLC method or retrieval engine.

## Wedge

Project Tiny Context Harness has the strongest wedge if it stays narrow:

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

Short-term realistic outcomes after GitHub default branch, npm metadata and launch kit are aligned:

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

1. Keep the Show HN thread focused on technical feedback and missing recovery facts.
2. Update README/launch copy from actual confusion points within 24 hours.
3. Submit narrow curated-list PRs after the first feedback pass, starting with harness/context lists.
4. Reuse the same claim on smaller communities only after the first feedback pass.
5. Use Product Hunt only after the HN feedback loop or with a deliberate scheduling decision.
6. Nominate for awards only after real use appears or a minimum eligibility threshold is met.

## Evidence To Gather Next

- HN first-comment feedback and direct replies from the live Show HN thread.
- 6-hour and 24-hour metrics after the first public post.
- One example PR showing how `project_context/**` prevents agent drift.
- One fresh benchmark rerun that compares baseline vs Minimal Context without old stage results.
- User quotes or issues that mention real handoff/recovery value.
- npm download trend after launch.

## Adjacent Curated Lists

These are lower priority than the first public launch, but useful after the demo exists. Start with narrow harness/context lists before broader AI dev-tool lists because a new 0-star package is easier to evaluate on category fit than on social proof.

| List | Current scale | Fit | Gate before PR |
|---|---:|---|---|
| [awesome-harness-engineering](https://github.com/ai-boost/awesome-harness-engineering) | niche | Direct context-delivery and harness-engineering fit. | Use the prepared context-delivery patch and avoid benchmark claims. |
| [awesome-agent-harness](https://github.com/Picrew/awesome-agent-harness) | niche | Direct Context & Working-State Engineering fit. | Run the upstream renderer/verification workflow after applying the data patch. |
| [awesome-ai-devtools](https://github.com/jamesmurdza/awesome-ai-devtools) | 3,825 stars | Broad AI developer tools list; likely the best larger-list target after a narrow listing or public feedback. | Demo live, README concise, one-line category fit ready. |
| [awesome-opencode](https://github.com/awesome-opencode/awesome-opencode) | 7,766 stars | OpenCode ecosystem list; fit is now plausible because README links an OpenCode setup note. | Submit the prepared `data/projects/` YAML patch after npm publish; do not claim this is an OpenCode plugin. |
| [awesome-agents](https://github.com/kyrolabs/awesome-agents) | 2,403 stars | Broad AI agent list; Harness is support infrastructure, not an agent. | Position as agent workflow/context infrastructure, not an autonomous agent. |
| [awesome-opensource-ai](https://github.com/alvinreal/awesome-opensource-ai) | 3,833 stars | Broad open-source AI list; possible after visible adoption. | Wait for demo and at least one adoption report. |
