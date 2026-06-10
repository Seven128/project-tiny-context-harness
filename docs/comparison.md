# Comparison Guide

Project Tiny Context Harness is intentionally narrow. It is not trying to be the coding agent, the task manager, the spec system or the retrieval engine.

Use this guide when evaluating how it fits beside tools you may already use.

## Core Difference

```text
Project Tiny Context Harness owns durable repo memory for fresh-agent recovery.
```

It installs a small recovery surface:

- `AGENTS.md` as the startup router
- `project_context/**` as maintained project facts
- role Skills for explicit product, UI/UX, engineering and export requests
- `validate-context` to check that the recovery surface exists and avoids fake test-result claims

It leaves product quality to the repository's own tests, CI, review and human acceptance.

## At A Glance

| Adjacent category | What it usually owns | How Harness fits |
|---|---|---|
| `AGENTS.md` alone | Startup instructions and hard boundaries. | Harness keeps `AGENTS.md` short and puts durable project facts behind it in `project_context/**`. |
| Spec-first kits | Feature specs, plans and implementation tasks. | Complementary. Keep final durable project facts in Context; do not require a spec chain for every task. |
| Full SDLC / role workflows | Coordinated process, phase artifacts, reviews and approvals. | Lighter default. Use those processes when ceremony is warranted; Harness keeps ordinary repo memory small. |
| Task planners | Backlog decomposition, task state and execution tracking. | Complementary. Harness does not own task state; it owns recovery facts fresh agents should know before work. |
| Code intelligence / retrieval | Symbols, references, external docs and semantic lookup. | Complementary. Harness stores local project intent, boundaries and validation paths that should travel with the repo. |
| IDE or agent memory | Tool-specific continuity inside one product. | Portable fallback. Harness files are plain repo assets that Codex, Claude Code, Cursor, Gemini CLI, OpenCode and humans can read. |
| Project docs | Human onboarding, user docs, API docs and release notes. | Complementary. Context is the smaller machine-readable recovery path for coding-agent work. |

## Use Harness When

- New agent chats keep rediscovering the same project goal, non-goals or boundaries.
- You use more than one coding-agent surface on the same repository.
- Existing agent rules have grown into duplicated project memory.
- Agents often ask which tests or validation path matters before a change.
- You want a small repo-owned memory contract before adopting heavier process.

## Use Something Else When

- You need a full autonomous coding agent runtime.
- You need backlog ownership, task assignment, sprint planning or issue state.
- You need semantic code search, symbol navigation or external documentation retrieval.
- You need compliance-grade SDLC approvals and audit evidence.
- You need proof that a code change works; use tests, CI, review and human acceptance.

## Common Combinations

With `AGENTS.md`:

```text
AGENTS.md says what to read first and what must not happen.
project_context/** says what the project is, where boundaries live and how to validate changes.
```

With spec-first tools:

```text
Use specs for high-uncertainty features.
After decisions stabilize, extract durable project facts into project_context/**.
```

With task planners:

```text
Keep backlog and task status in the planner.
Keep stable project memory and validation paths in the repo.
```

With code-intelligence tools:

```text
Use retrieval for symbols, APIs and docs.
Use Context for project intent, ownership, non-goals and repeatable validation paths.
```

With multiple agent surfaces:

```text
Route each tool-specific file back to root AGENTS.md and project_context/**.
Do not maintain separate project memories per tool.
```

## Decision Rule

Ask this before adding information to Harness Context:

```text
Would a fresh coding agent need this fact before proposing a safe code change?
```

If yes, it may belong in `project_context/**`.

If no, keep it in README, tests, source comments, issue trackers, specs, release notes, local tool memory or team docs.

## Claims Boundary

Do not evaluate Harness as:

- a benchmark-proven productivity multiplier
- a replacement for tests or review
- a better coding agent
- a full SDLC framework
- a semantic index

Evaluate it as:

```text
Does this small repo-owned recovery surface reduce repeated context rediscovery across fresh agent sessions?
```
