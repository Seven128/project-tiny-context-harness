# External PR Packets

Snapshot date: 2026-06-10.

These packets prepare curated-list pull requests for Project Tiny Context Harness. They are intentionally small and factual because the target repositories are maintained resource lists, not launch-post surfaces.

## Direct PR Status

Curated-list direct PRs opened from the maintainer-authenticated `gh` session on 2026-06-11:

- `ai-boost/awesome-harness-engineering`: https://github.com/ai-boost/awesome-harness-engineering/pull/58
- `Picrew/awesome-agent-harness`: https://github.com/Picrew/awesome-agent-harness/pull/22
- `Transcenda/awesome-agentic-coding`: https://github.com/Transcenda/awesome-agentic-coding/pull/4
- `jordimas/awesome-agentic-engineering`: https://github.com/jordimas/awesome-agentic-engineering/pull/4

Forks used:

- https://github.com/Seven128/awesome-harness-engineering
- https://github.com/Seven128/awesome-agent-harness
- https://github.com/Seven128/awesome-agentic-coding
- https://github.com/Seven128/awesome-agentic-engineering

Remaining P2 packets have not been opened. Wait for open curated-list maintainer feedback before opening broader lists.

Public PR creation should continue through the maintainer's GitHub-authenticated session so forks, branch ownership and notifications are correct.

## Packet Check

Run the local packet check before preparing branches:

```sh
npm run launch:external-prs
```

Run the live upstream check immediately before opening curated-list PRs:

```sh
npm run launch:external-prs -- --live --clean
```

Default mode is read-only and does not access the network. Live mode clones upstream repositories under `tmp/sdlc/external-pr-packets/repos`, verifies each patch with `git apply --check`, applies it in the temporary clone and runs `git diff --check`. It does not fork repositories, push branches or open PRs.

## Recommended Opening Order

Open PRs from narrowest category fit to broadest fit:

1. `ai-boost/awesome-harness-engineering` - opened as https://github.com/ai-boost/awesome-harness-engineering/pull/58
2. `Picrew/awesome-agent-harness` - opened as https://github.com/Picrew/awesome-agent-harness/pull/22
3. `Transcenda/awesome-agentic-coding` - opened as https://github.com/Transcenda/awesome-agentic-coding/pull/4
4. `jordimas/awesome-agentic-engineering` - opened as https://github.com/jordimas/awesome-agentic-engineering/pull/4
5. `awesome-opencode/awesome-opencode`
6. `jamesmurdza/awesome-ai-devtools`

Reason: a new 0-star package is easier for maintainers to evaluate when the target category already expects context delivery, working-state engineering or harness primitives. Broader AI dev-tool directories are useful after first feedback, an accepted narrow listing or clearer social proof.

## Transcenda Awesome Agentic Coding

Target: `Transcenda/awesome-agentic-coding`

Patch: [transcenda-awesome-agentic-coding.patch](transcenda-awesome-agentic-coding.patch)

Branch:

```text
add-project-tiny-context-harness
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

Entry added:

```md
- [Project Tiny Context Harness](https://github.com/Seven128/project-tiny-context-harness) — minimal project-memory harness for AI coding agents, installing `AGENTS.md`, `project_context/**`, role Skills, and `validate-context`.
```

Commands:

Save the PR body block above to `pr-body.md` before running the final `gh pr create` command, or replace `--body-file` with an inline `--body` value.

```sh
PATCH_ROOT=/path/to/project-tiny-context-harness/docs/launch/external-prs
gh repo fork Transcenda/awesome-agentic-coding --clone
cd awesome-agentic-coding
git checkout -b add-project-tiny-context-harness
git apply "$PATCH_ROOT/transcenda-awesome-agentic-coding.patch"
git diff --check
git commit -am "Add Project Tiny Context Harness"
git push -u origin add-project-tiny-context-harness
gh pr create --base main --head Seven128:add-project-tiny-context-harness --title "Add Project Tiny Context Harness to agent instructions and skills" --body-file /path/to/pr-body.md
```

## Awesome Agentic Engineering

Target: `jordimas/awesome-agentic-engineering`

Patch: [jordimas-awesome-agentic-engineering.patch](jordimas-awesome-agentic-engineering.patch)

Branch:

```text
add-project-tiny-context-harness
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

Entry added:

```md
- [Project Tiny Context Harness](https://github.com/Seven128/project-tiny-context-harness) — Minimal project-memory and validation harness for teams adopting AI coding agents, so fresh agents recover project intent, boundaries, and verification paths across chats and handoffs.
```

Commands:

Save the PR body block above to `pr-body.md` before running the final `gh pr create` command, or replace `--body-file` with an inline `--body` value.

```sh
PATCH_ROOT=/path/to/project-tiny-context-harness/docs/launch/external-prs
gh repo fork jordimas/awesome-agentic-engineering --clone
cd awesome-agentic-engineering
git checkout -b add-project-tiny-context-harness
git apply "$PATCH_ROOT/jordimas-awesome-agentic-engineering.patch"
git diff --check
git commit -am "Add Project Tiny Context Harness"
git push -u origin add-project-tiny-context-harness
gh pr create --base main --head Seven128:add-project-tiny-context-harness --title "Add Project Tiny Context Harness to team adoption resources" --body-file /path/to/pr-body.md
```

## Awesome OpenCode

Target: `awesome-opencode/awesome-opencode`

Patch: [awesome-opencode-project-tiny-context-harness.patch](awesome-opencode-project-tiny-context-harness.patch)

Branch:

```text
add-project-tiny-context-harness
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

Entry added:

```yaml
name: Project Tiny Context Harness
repo: https://github.com/Seven128/project-tiny-context-harness
tagline: Minimal project memory for coding agents
description: Repo-native context recovery for OpenCode and other AI coding agents. Installs AGENTS.md, project_context/**, role Skills, and validate-context so fresh sessions can recover project intent, boundaries, and validation paths without SDLC phase ceremony.
```

Commands:

Save the PR body block above to `pr-body.md` before running the final `gh pr create` command, or replace `--body-file` with an inline `--body` value.

```sh
PATCH_ROOT=/path/to/project-tiny-context-harness/docs/launch/external-prs
gh repo fork awesome-opencode/awesome-opencode --clone
cd awesome-opencode
git checkout -b add-project-tiny-context-harness
git apply "$PATCH_ROOT/awesome-opencode-project-tiny-context-harness.patch"
npm install
npm run validate
git diff --check
git add data/projects/project-tiny-context-harness.yaml
git commit -m "docs: add Project Tiny Context Harness to projects"
git push -u origin add-project-tiny-context-harness
gh pr create --base main --head Seven128:add-project-tiny-context-harness --title "Add Project Tiny Context Harness to projects" --body-file /path/to/pr-body.md
```

## Awesome AI Devtools

Target: `jamesmurdza/awesome-ai-devtools`

Patch: [jamesmurdza-awesome-ai-devtools.patch](jamesmurdza-awesome-ai-devtools.patch)

Branch:

```text
add-project-tiny-context-harness
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

Entry added:

```md
- [Project Tiny Context Harness](https://github.com/Seven128/project-tiny-context-harness) — Open-source CLI for AI coding-agent project memory. Installs `AGENTS.md`, `project_context/**`, role Skills, and a `validate-context` gate so Codex, Claude Code, Cursor, Gemini CLI, OpenCode, and similar agents can recover project intent, boundaries, and validation paths across fresh sessions.
```

Commands:

Save the PR body block above to `pr-body.md` before running the final `gh pr create` command, or replace `--body-file` with an inline `--body` value.

```sh
PATCH_ROOT=/path/to/project-tiny-context-harness/docs/launch/external-prs
gh repo fork jamesmurdza/awesome-ai-devtools --clone
cd awesome-ai-devtools
git checkout -b add-project-tiny-context-harness
git apply "$PATCH_ROOT/jamesmurdza-awesome-ai-devtools.patch"
git diff --check
git commit -am "Add Project Tiny Context Harness"
git push -u origin add-project-tiny-context-harness
gh pr create --base main --head Seven128:add-project-tiny-context-harness --title "Add Project Tiny Context Harness" --body-file /path/to/pr-body.md
```

## Awesome Harness Engineering

Target: `ai-boost/awesome-harness-engineering`

Patch: [ai-boost-awesome-harness-engineering.patch](ai-boost-awesome-harness-engineering.patch)

Branch:

```text
add-project-tiny-context-harness
```

PR title:

```text
Add Project Tiny Context Harness to context delivery resources
```

PR body:

```text
Adds Project Tiny Context Harness under Context Delivery & Compaction.

It fits this list because it addresses repo-local context delivery and fresh-agent recovery: durable project facts, AGENTS.md guidance, role Skills, and validate-context checks for recovering project intent, boundaries, ownership, and validation paths across sessions.

No benchmark, adoption, award, star-growth or productivity-speed claims are included.
```

Entry added:

```md
- [Project Tiny Context Harness](https://github.com/Seven128/project-tiny-context-harness) — Minimal repo-native project memory for AI coding agents: `project_context/**`, `AGENTS.md` guidance, role Skills, and `validate-context` help fresh agent sessions recover project intent, boundaries, ownership, and validation paths without adding SDLC phase ceremony. ![Stars](https://img.shields.io/github/stars/Seven128/project-tiny-context-harness?style=flat-square&label=★&color=yellow)
```

Commands:

Save the PR body block above to `pr-body.md` before running the final `gh pr create` command, or replace `--body-file` with an inline `--body` value.

```sh
PATCH_ROOT=/path/to/project-tiny-context-harness/docs/launch/external-prs
gh repo fork ai-boost/awesome-harness-engineering --clone
cd awesome-harness-engineering
git checkout -b add-project-tiny-context-harness
git apply "$PATCH_ROOT/ai-boost-awesome-harness-engineering.patch"
git diff --check
git commit -am "Add Project Tiny Context Harness"
git push -u origin add-project-tiny-context-harness
gh pr create --base main --head Seven128:add-project-tiny-context-harness --title "Add Project Tiny Context Harness to context delivery resources" --body-file /path/to/pr-body.md
```

## Awesome Agent Harness

Target: `Picrew/awesome-agent-harness`

Patch: [picrew-awesome-agent-harness-data.patch](picrew-awesome-agent-harness-data.patch)

Branch:

```text
add-project-tiny-context-harness
```

PR title:

```text
Add Project Tiny Context Harness to context engineering catalog
```

PR body:

```text
Adds Project Tiny Context Harness to Context & Working-State Engineering.

It is a small MIT npm package for repo-local fresh-agent recovery: project context files, AGENTS.md guidance, role Skills, and validation checks. The entry is intentionally scoped to context recovery rather than claiming autonomous coding, benchmark wins, broad adoption, awards, or star growth.
```

Entry added:

```yaml
name: Project Tiny Context Harness
repo_url: https://github.com/Seven128/project-tiny-context-harness
category: Context & Working-State Engineering
summary_en: Minimal Context Harness package that installs repo-local project memory, AGENTS.md guidance, role Skills, and validation for fresh-agent recovery without SDLC phase ceremony.
summary_zh: Minimal Context Harness 包，用于安装仓库本地项目记忆、AGENTS.md 指引、角色 Skills 与验证入口，帮助新的编码代理会话恢复项目事实，而不引入 SDLC 阶段仪式。
```

Commands:

Save the PR body block above to `pr-body.md` before running the final `gh pr create` command, or replace `--body-file` with an inline `--body` value. This upstream is data-driven, so run its renderer and verification scripts after applying the data patch and commit the generated files together.

```sh
PATCH_ROOT=/path/to/project-tiny-context-harness/docs/launch/external-prs
gh repo fork Picrew/awesome-agent-harness --clone
cd awesome-agent-harness
git checkout -b add-project-tiny-context-harness
git apply "$PATCH_ROOT/picrew-awesome-agent-harness-data.patch"
python3 scripts/sync_github_metadata.py
python3 scripts/render_readme.py
python3 scripts/verify_catalog.py
git diff --check
git add data/projects.yaml README.md README_zh.md reports/verification
git commit -m "Add Project Tiny Context Harness"
git push -u origin add-project-tiny-context-harness
gh pr create --base main --head Seven128:add-project-tiny-context-harness --title "Add Project Tiny Context Harness to context engineering catalog" --body-file /path/to/pr-body.md
```

## Submission Notes

- Use the GitHub repository URL, not npm.
- Do not include benchmark, adoption, award or star claims.
- Run `npm run launch:external-prs` before branch preparation and `npm run launch:external-prs -- --live --clean` just before PR creation.
- If a maintainer asks for a different category, keep the same claim boundary: repo-native project memory for coding-agent recovery.
- If either upstream changes before submission, re-clone and re-apply the patch before opening the PR.
