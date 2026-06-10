# Roadmap

Snapshot date: 2026-06-10.

This roadmap is for visitors deciding whether Project Tiny Context Harness is worth trying, watching or contributing to. It is not a promise of delivery dates, benchmark wins or broad adoption.

The product direction stays narrow:

```text
Repo-native project memory for fresh-agent recovery.
```

## Now

- Keep the npm package installable and aligned with README/package README.
- Keep the first-screen README clear: problem, install, demo, non-goals and 60-second trial.
- Collect private review and public adoption reports that describe real project-memory drift.
- Convert only consented examples into public adoption stories.
- Keep launch claims bounded: no benchmark speedup claims until fresh Minimal Context comparisons exist.

## Next

- Improve the [existing-repo adoption guide](adopt-existing-repo.md) for `init --adopt`, especially for projects that already have `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md` or tool-specific rules.
- Add more small before/after examples showing what belongs in `project_context/**` and what should stay in code, tests or issue trackers.
- Re-run delivery benchmarks against the current Minimal Context design, not the removed stage-based workflow.
- Monitor the four open narrow/P1 curated-list PRs and expand to broader lists only after feedback or acceptance.
- Expand agent-surface recipes only when users report real friction with Codex, Claude Code, Cursor, Gemini CLI, OpenCode or similar tools.

## Later

- Consider lightweight integrations only if users consistently ask for them and they preserve the repo-owned Context contract.
- Add public adoption stories when reports include explicit quote/story consent.
- Revisit awards and larger directories after visible adoption, contribution or benchmark evidence exists.
- Improve validator ergonomics where users hit confusing recovery-surface failures.

## Not Planned

- Autonomous coding-agent runtime.
- Task manager, backlog owner or issue tracker replacement.
- Full SDLC phase gates, lifecycle state or work-product trees as the default workflow.
- Semantic code index, external documentation retriever or vector memory system.
- Claims that `validate-context` proves product quality.

## How To Help

- Try `project-tiny-context-harness@latest` or the source preview path and open an [adoption report](https://github.com/Seven128/project-tiny-context-harness/issues/new?template=adoption_report.yml).
- Pick a starter issue: [demo](https://github.com/Seven128/project-tiny-context-harness/issues/5), [sample walkthrough](https://github.com/Seven128/project-tiny-context-harness/issues/6), [benchmark rerun](https://github.com/Seven128/project-tiny-context-harness/issues/7) or [launch FAQ](https://github.com/Seven128/project-tiny-context-harness/issues/8).
- File focused feature requests only when the problem is durable project-memory recovery, not project-specific testing, CI, review or local agent preference.
