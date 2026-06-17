# GitHub Metadata Runbook

Snapshot date: 2026-06-10.

Use this runbook when updating the GitHub repository About box, description, homepage and topics for Project Tiny Context Harness.

Do not treat metadata as product evidence. It is a routing surface: it helps new visitors land on a working page and understand the project category quickly.

## Current Values

Repository:

```text
https://github.com/Seven128/project-tiny-context-harness
```

Description:

```text
Minimal project memory and validation harness for AI coding agents.
```

Homepage after `project-tiny-context-harness` is published on npm:

```text
https://www.npmjs.com/package/project-tiny-context-harness
```

Topics:

```text
ai-agents
coding-agent
codex
claude-code
cursor
gemini-cli
opencode
agent-context
context-engineering
context-management
agents-md
project-memory
agent-memory
ai-coding
developer-tools
developer-productivity
cli
ty-context
workflow
```

## Manual UI Path

1. Open `https://github.com/Seven128/project-tiny-context-harness`.
2. In the right-hand About box, choose the settings gear or edit control.
3. Set Website to `https://www.npmjs.com/package/project-tiny-context-harness`.
4. Keep the description as `Minimal project memory and validation harness for AI coding agents.`
5. Keep topics aligned with the list above.
6. Save changes.
7. Run `npm run launch:strict-external`.

Expected postpublish result:

```text
github-homepage: PASS
npm-fetch: PASS
```

If npm ever returns 404 again, use the repository URL as a temporary homepage and rerun the strict check.

## API Path

Only use this from a trusted local shell with a GitHub token that has permission to update repository metadata. Do not commit tokens, paste tokens into docs, or save them in the repository.

Dry-run current and desired metadata:

```sh
npm run launch:github-metadata
```

Apply from a trusted shell after setting `GITHUB_TOKEN` or `GH_TOKEN`:

```sh
npm run launch:github-metadata -- --apply
```

The script auto-detects whether `project-tiny-context-harness/latest` is published on npm. When npm returns 404, it sets the homepage to:

```text
https://github.com/Seven128/project-tiny-context-harness
```

When the renamed npm package is published, it sets the homepage to:

```text
https://www.npmjs.com/package/project-tiny-context-harness
```

Then verify:

```sh
npm run launch:strict-external
```

## Do Not

- Do not point GitHub homepage to the npm package while npm returns 404.
- Do not use the old package name as the homepage.
- Do not add topics that imply autonomous Tiny Context, benchmark wins, production adoption or official integration.
- Do not keep a live npm homepage after unpublishing, failed first publish or package-name rollback.
