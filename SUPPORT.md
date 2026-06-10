# Support

Use this file to choose the right support path for Project Tiny Context Harness.

## Before Opening An Issue

Check:

- [README.md](README.md) for the current install and source-preview paths.
- [docs/faq.md](docs/faq.md) for common adoption and positioning questions.
- [docs/adopt-existing-repo.md](docs/adopt-existing-repo.md) for adding Minimal Context to an existing repository.
- [docs/agent-surface-recipes.md](docs/agent-surface-recipes.md) for Codex, Claude Code, Cursor, Gemini CLI, OpenCode and custom harness-folder setup notes.
- [GOVERNANCE.md](GOVERNANCE.md) for decision, release and maintainer authority.

Use the GitHub issue chooser instead of blank issues; it routes public feedback through privacy-aware forms and keeps security reports private.

## Where To Ask

| Need | Use |
|---|---|
| Bug in `init`, `sync`, `upgrade`, `doctor`, `export-context` or `validate-context` | GitHub bug report issue template |
| Feature idea that preserves the Minimal Context boundary | GitHub feature request issue template |
| Codespaces, local checkout or source-preview tarball failed | Source preview report issue template |
| Missing recovery fact, README confusion or fresh-agent handoff gap | Context recovery gap issue template |
| Real adoption feedback from a repository | Adoption report issue template |
| Security vulnerability | [SECURITY.md](SECURITY.md) |
| Conduct or moderation concern | [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) |
| Governance or release authority question | [GOVERNANCE.md](GOVERNANCE.md) |
| npm install or registry metadata is failing | Run the README source-preview path, then open a bug report with the command and environment |

## Project Scope

Supported:

- package installation and generated file behavior,
- Minimal Context guidance and validation,
- source-preview smoke reports,
- documentation clarity,
- reproducible cross-platform issues.

Not supported:

- debugging private application code unrelated to the Harness,
- replacing a user's project tests, CI, review or acceptance process,
- benchmark speedup claims without fresh baseline and Minimal Context comparison evidence,
- requests to restore the old stage-based SDLC workflow as the default product.

## Response Expectations

This is a small project. The fastest useful reports include:

- exact command,
- package version or commit SHA,
- operating system and Node/npm versions,
- expected behavior,
- actual behavior,
- minimal reproduction steps or a small public reproduction repository.

Do not paste secrets, tokens, private customer data or raw private chat logs into issues.
