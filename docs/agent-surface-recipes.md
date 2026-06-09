# Agent Surface Recipes

Project Tiny Context Harness is intentionally tool-neutral. The durable recovery contract is the same across agent tools:

- root `AGENTS.md`
- `project_context/context.toml`
- `project_context/global.md`
- `project_context/architecture.md`
- `project_context/areas/**/*.md`
- `make validate-context` or `sdlc-harness validate-context`

The configurable harness folder only decides where package-managed helper assets live, such as default Skills, templates, tools and `config.yaml`. It should not create a separate memory source per agent.

## Quick Setup

Default Codex-oriented setup:

```sh
npm install -D project-tiny-context-harness@latest
npx --yes --package project-tiny-context-harness@latest sdlc-harness init --harness-folder .codex
make validate-context
```

Claude Code-oriented helper assets:

```sh
npm install -D project-tiny-context-harness@latest
npx --yes --package project-tiny-context-harness@latest sdlc-harness init --harness-folder .claude
make validate-context
```

Cursor-oriented helper assets:

```sh
npm install -D project-tiny-context-harness@latest
npx --yes --package project-tiny-context-harness@latest sdlc-harness init --harness-folder .cursor
make validate-context
```

Gemini CLI-oriented helper assets:

```sh
npm install -D project-tiny-context-harness@latest
npx --yes --package project-tiny-context-harness@latest sdlc-harness init --harness-folder .gemini
make validate-context
```

Cline or Roo-oriented helper assets:

```sh
npm install -D project-tiny-context-harness@latest
npx --yes --package project-tiny-context-harness@latest sdlc-harness init --harness-folder .cline
npx --yes --package project-tiny-context-harness@latest sdlc-harness init --harness-folder .roo
make validate-context
```

For an existing repository, add `--adopt`:

```sh
npx --yes --package project-tiny-context-harness@latest sdlc-harness init --adopt --harness-folder .codex
```

## OpenCode And Other Agents

For OpenCode or any agent surface that is not in the interactive menu, use a custom harness folder only for support assets:

```sh
npm install -D project-tiny-context-harness@latest
npx --yes --package project-tiny-context-harness@latest sdlc-harness init --harness-folder .opencode
make validate-context
```

The important part is still the root `AGENTS.md` plus `project_context/**`. If an agent does not automatically read the helper folder, point it at the root recovery contract explicitly:

```text
Read AGENTS.md and project_context/** first. Summarize the project goal, non-goals, architecture boundaries, validation entry points and next safe action before proposing code changes.
```

## Sharing One Repo Across Tools

Use one source of durable truth:

- Keep `AGENTS.md` as the short startup router.
- Keep durable project facts in `project_context/**`.
- Keep visual identity facts in `DESIGN.md` when relevant.
- Keep tool-specific helper assets under one configured harness folder.
- Run `sdlc-harness sync` after changing the configured harness folder.
- Run `sdlc-harness doctor` if an agent seems to be reading the wrong helper folder.

Avoid this pattern:

```text
.codex/project_context/**
.claude/project_context/**
.cursor/project_context/**
```

That splits the repo memory and creates drift. If multiple tools need different local preferences, keep those preferences in tool-specific config, not in separate copies of project truth.

