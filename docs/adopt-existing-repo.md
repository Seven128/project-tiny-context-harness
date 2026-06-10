# Adopt An Existing Repository

Use this guide when a repository already has code, tests, documentation, agent rules or team conventions. The goal is to add Minimal Context Harness without turning the project into a full SDLC process.

If the renamed npm package is not published yet, use the source preview path from the root README before trying this on an important repository.

## Before You Start

Create a branch and check the current state:

```sh
git switch -c try-project-tiny-context-harness
git status --short
```

Skim existing project-memory surfaces:

- `AGENTS.md`, `CLAUDE.md`, `.cursor/rules`, `.opencode`, `.gemini`, `.codex`, `.github/copilot-instructions.md`
- `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `docs/**`
- test and release commands in package scripts, Makefiles or CI

The Harness should preserve useful local guidance. It should not replace project tests, review, CI or issue tracking.

## Add The Harness

After npm publish:

```sh
npm install -D project-tiny-context-harness@latest
npx --yes --package project-tiny-context-harness@latest sdlc-harness init --adopt
make validate-context
```

Source preview while npm publish is pending:

```sh
git clone https://github.com/Seven128/project-tiny-context-harness.git
cd project-tiny-context-harness
npm ci
npm run smoke:quickstart
```

For an external repository before npm publish, use a local packed tarball only if you are comfortable testing unpublished packages.

## What To Check

The expected recovery surface is small:

```text
AGENTS.md
project_context/
  context.toml
  global.md
  architecture.md
  areas/main.md
  areas/main/verification.md
```

Review the generated files for three things:

1. Do they describe the project goal and non-goals accurately?
2. Do they point to the right architecture boundaries and validation paths?
3. Do they avoid storing one-off test results, release logs, raw CI output or private notes?

If something is wrong, edit the generated Context before asking another agent to use it.

## Existing Agent Files

Keep one shared durable memory contract:

```text
AGENTS.md + project_context/**
```

Tool-specific files can still exist, but they should route back to that shared contract:

- `CLAUDE.md`: tell Claude Code to read `AGENTS.md` and `project_context/**`.
- Cursor rules: keep editor-specific behavior there, not a second copy of project facts.
- OpenCode/Gemini/Codex folders: use them for support assets, not separate project memory.

Avoid copying the same project goal, architecture boundary or validation command into every tool-specific file. Duplicated memory drifts.

## Existing Docs

Do not move everything from README or CONTRIBUTING into Context.

Good Context facts:

- project goal and explicit non-goals
- ownership and architecture boundaries
- validation entry points a fresh agent should know before code changes
- durable lessons from repeated debugging or handoff failures

Keep elsewhere:

- complete user documentation
- full test reports
- issue backlog and task state
- release notes
- detailed API reference
- team-specific process docs that agents do not need at session start

## Validation

Run:

```sh
make validate-context
git diff --check
```

Then run the project's own focused test or smoke command. `validate-context` checks recovery facts; it does not prove product quality.

## First Fresh-Agent Test

Use a new chat and ask:

```text
Read AGENTS.md and project_context/** first. Summarize the project goal, non-goals, architecture boundaries, validation entry points and next safe action before proposing code changes.
```

A useful answer should recover the project memory without rediscovering the whole repository from scratch. It should not claim tests passed unless it actually ran them.

## Commit Shape

Keep the first adoption commit easy to review:

- generated Harness files
- small edits that correct project goal, boundaries and validation paths
- optional routing notes in existing tool-specific agent files

Avoid bundling unrelated refactors, test rewrites or feature work into the adoption commit.

## Report Back

After trying it on a real repository, open an [adoption report](https://github.com/Seven128/project-tiny-context-harness/issues/new?template=adoption_report.yml) with:

- what your agents kept rediscovering
- what the generated Context made easier to recover
- what was too noisy, too thin or unclear
- which existing agent files or docs were hard to reconcile

Recovery evidence is useful. Benchmark or productivity claims need fresh controlled runs.
