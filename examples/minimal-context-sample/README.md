# Minimal Context Sample Repository

This directory is a small browseable example of a repository after adopting Project Tiny Context Harness. It is not a template requirement, benchmark result or product-quality proof.

The sample domain is an issue-labeling service:

- It reads issue title/body text.
- It suggests labels with short reasons.
- It never applies labels automatically.
- It keeps the "suggestion only" boundary in `project_context/**` so a fresh coding-agent session does not rediscover it from code every time.

## Try It

From this directory:

```sh
npm test
npm run validate-context
```

The test covers the tiny label-suggestion behavior. The Context validation checks that the recovery surface exists and does not store fake test-result claims.

## Recovery Surface

Start with these files:

```text
AGENTS.md
project_context/
  context.toml
  global.md
  architecture.md
  areas/main.md
  areas/main/verification.md
```

Then ask a fresh agent:

```text
Read AGENTS.md and project_context/** first. Summarize the project goal, non-goals, architecture boundaries, validation entry points and next safe action before proposing code changes.
```

A useful answer should recover that this project suggests labels, does not write labels to GitHub, owns suggestion behavior in `src/label-routing/**` and validates changes with `npm test`.

