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

Homepage while npm publish is pending:

```text
https://github.com/Seven128/project-tiny-context-harness
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
sdlc
workflow
```

## Manual UI Path

Use the repository page, not the npm page, while `project-tiny-context-harness` still returns 404 on npm.

1. Open `https://github.com/Seven128/project-tiny-context-harness`.
2. In the right-hand About box, choose the settings gear or edit control.
3. Set Website to `https://github.com/Seven128/project-tiny-context-harness` while npm publish is pending.
4. Keep the description as `Minimal project memory and validation harness for AI coding agents.`
5. Keep topics aligned with the list above.
6. Save changes.
7. Run `node tools/launch_readiness_check.mjs --strict-external`.

Expected prepublish result:

```text
github-homepage: PASS
npm-fetch: TODO
```

After the renamed npm package is published, switch Website to the npm package URL and run the same strict check again.

## API Path

Only use this from a trusted local shell with a GitHub token that has permission to update repository metadata. Do not commit tokens, paste tokens into docs, or save them in the repository.

PowerShell:

```powershell
$body = @{
  description = "Minimal project memory and validation harness for AI coding agents."
  homepage = "https://github.com/Seven128/project-tiny-context-harness"
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Patch `
  -Uri "https://api.github.com/repos/Seven128/project-tiny-context-harness" `
  -Headers @{
    "Accept" = "application/vnd.github+json"
    "Authorization" = "Bearer $env:GH_TOKEN"
    "X-GitHub-Api-Version" = "2022-11-28"
  } `
  -Body $body
```

If the renamed npm package is already published, set `homepage` to:

```text
https://www.npmjs.com/package/project-tiny-context-harness
```

Then verify:

```sh
node tools/launch_readiness_check.mjs --strict-external
```

## Do Not

- Do not point GitHub homepage to the npm package while npm returns 404.
- Do not use the old package name as the homepage.
- Do not add topics that imply autonomous SDLC, benchmark wins, production adoption or official integration.
- Do not keep a live npm homepage after unpublishing, failed first publish or package-name rollback.

