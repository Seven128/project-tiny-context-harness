# External PR Packets

Snapshot date: 2026-06-10.

These packets prepare two curated-list pull requests for Tiny Context Harness. They are intentionally small and factual because both target repositories are maintained resource lists, not launch-post surfaces.

## Direct PR Status

No direct pull request was opened by automation in this workspace.

Reason:

- `gh` is not installed in the local environment.
- The GitHub connector can read both upstream repositories, but it does not have push permission there.
- No `Seven128` fork of either upstream repository currently exists.
- Public PR creation should use the maintainer's GitHub-authenticated session so forks, branch ownership and notifications are correct.

## Transcenda Awesome Agentic Coding

Target: `Transcenda/awesome-agentic-coding`

Patch: [transcenda-awesome-agentic-coding.patch](transcenda-awesome-agentic-coding.patch)

Branch:

```text
add-tiny-context-harness
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

Entry added:

```md
- [Tiny Context Harness](https://github.com/Seven128/project-agent-sdlc) — minimal project-memory harness for AI coding agents, installing `AGENTS.md`, `project_context/**`, role Skills, and `validate-context`.
```

Commands:

Save the PR body block above to `pr-body.md` before running the final `gh pr create` command, or replace `--body-file` with an inline `--body` value.

```sh
PATCH_ROOT=/path/to/project-agent-sdlc/docs/launch/external-prs
gh repo fork Transcenda/awesome-agentic-coding --clone
cd awesome-agentic-coding
git checkout -b add-tiny-context-harness
git apply "$PATCH_ROOT/transcenda-awesome-agentic-coding.patch"
git diff --check
git commit -am "Add Tiny Context Harness"
git push -u origin add-tiny-context-harness
gh pr create --base main --head Seven128:add-tiny-context-harness --title "Add Tiny Context Harness to agent instructions and skills" --body-file /path/to/pr-body.md
```

## Awesome Agentic Engineering

Target: `jordimas/awesome-agentic-engineering`

Patch: [jordimas-awesome-agentic-engineering.patch](jordimas-awesome-agentic-engineering.patch)

Branch:

```text
add-tiny-context-harness
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

Entry added:

```md
- [Tiny Context Harness](https://github.com/Seven128/project-agent-sdlc) — Minimal project-memory and validation harness for teams adopting AI coding agents, so fresh agents recover project intent, boundaries, and verification paths across chats and handoffs.
```

Commands:

Save the PR body block above to `pr-body.md` before running the final `gh pr create` command, or replace `--body-file` with an inline `--body` value.

```sh
PATCH_ROOT=/path/to/project-agent-sdlc/docs/launch/external-prs
gh repo fork jordimas/awesome-agentic-engineering --clone
cd awesome-agentic-engineering
git checkout -b add-tiny-context-harness
git apply "$PATCH_ROOT/jordimas-awesome-agentic-engineering.patch"
git diff --check
git commit -am "Add Tiny Context Harness"
git push -u origin add-tiny-context-harness
gh pr create --base main --head Seven128:add-tiny-context-harness --title "Add Tiny Context Harness to team adoption resources" --body-file /path/to/pr-body.md
```

## Submission Notes

- Use the GitHub repository URL, not npm.
- Do not include benchmark, adoption, award or star claims.
- If a maintainer asks for a different category, keep the same claim boundary: repo-native project memory for coding-agent recovery.
- If either upstream changes before submission, re-clone and re-apply the patch before opening the PR.
