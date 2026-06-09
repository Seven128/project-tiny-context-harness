# Security Policy

Project Tiny Context Harness is a small developer tool that writes repo guidance, Context files, managed Skills, validation tools and optional GitHub workflow assets into user projects. Security reports are useful when a behavior can change files unexpectedly, weaken a repository's intended checks or expose sensitive project information.

## Supported Versions

The current `main` branch and the latest published npm package are supported. Older package versions may receive fixes when the impact is practical to patch without reintroducing legacy stage-workflow behavior.

## Reporting A Vulnerability

Please do not open a public issue for a suspected vulnerability.

Use GitHub's private vulnerability reporting flow for this repository if it is enabled. Include:

- A short description of the issue and expected impact.
- The affected command, version and operating system.
- Minimal reproduction steps or a small test repository if possible.
- Any files written or modified unexpectedly.

If private vulnerability reporting is not available, open a GitHub issue with the title `Security contact needed` and no exploit details. The maintainer will provide a private contact path.

## Scope

In scope:

- Unsafe file writes, path traversal or unexpected overwrites from `init`, `sync`, `upgrade`, `doctor`, `export-context` or `validate-context`.
- Managed workflow or Makefile behavior that silently weakens repository checks.
- Export behavior that can include secrets or private files despite the documented temporary-export boundary.
- Dependency vulnerabilities that affect the installed CLI in realistic usage.

Out of scope:

- Security issues in a user's own project after installing the Harness.
- Prompt-injection behavior caused by project-specific Context content.
- Unsupported legacy stage-workflow assets or old unpublished development snapshots.
- Social engineering, spam or generic npm/GitHub account issues not specific to this project.

## Disclosure

The maintainer will try to acknowledge reports within 7 days and will coordinate a fix, release or public advisory based on severity and exploitability.
