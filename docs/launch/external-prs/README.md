# External PR Packets

Snapshot date: 2026-06-10.

These packets prepare curated-list pull requests for Project Tiny Context Harness. They are intentionally small and factual because the target repositories are maintained resource lists, not launch-post surfaces.

## Direct PR Status

No direct pull request was opened by automation in this workspace.

Reason:

- `gh` is not installed in the local environment.
- The GitHub connector can read upstream repositories, but it does not have push permission there.
- No `Seven128` fork of these upstream repositories currently exists.
- Public PR creation should use the maintainer's GitHub-authenticated session so forks, branch ownership and notifications are correct.

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

## Submission Notes

- Use the GitHub repository URL, not npm.
- Do not include benchmark, adoption, award or star claims.
- If a maintainer asks for a different category, keep the same claim boundary: repo-native project memory for coding-agent recovery.
- If either upstream changes before submission, re-clone and re-apply the patch before opening the PR.
