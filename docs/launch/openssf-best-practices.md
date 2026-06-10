# OpenSSF Best Practices Badge Packet

Use this packet when the maintainer starts an OpenSSF Best Practices Badge or OpenSSF Baseline self-assessment. Do not add a Best Practices or Baseline badge to README until the project has actually earned it on the official site.

Official sources checked on 2026-06-10:

- OpenSSF Best Practices Badge Program: <https://openssf.org/projects/best-practices-badge/>
- OpenSSF Best Practices site: <https://www.bestpractices.dev/en>
- OpenSSF guide to getting a Baseline badge: <https://openssf.org/blog/2026/02/25/getting-an-openssf-baseline-badge-with-the-best-practices-badge-system/>

## Why This Matters

OpenSSF describes the Best Practices Badge as a no-cost, voluntary self-certification program for FLOSS projects. The badge site supports the OpenSSF Baseline criteria and the metal series criteria: passing, silver and gold.

For Project Tiny Context Harness, this is a stronger trust signal than another launch post:

- It is relevant to maintainers evaluating a new npm developer tool.
- It complements the existing OpenSSF Scorecard badge without duplicating it.
- It turns security and governance gaps into a public checklist instead of a vague claim.
- It should be treated as trust posture, not adoption proof or product-quality proof.

## Recommended Starting Point

Start with the Baseline series if the maintainer wants the smallest security-focused checklist first. The OpenSSF guide says the Best Practices site can use GitHub login, add a project by repository URL or homepage URL, run automated analysis for some answers, and let maintainers review any automation-filled values.

Repository URL:

```text
https://github.com/Seven128/project-tiny-context-harness
```

Homepage URL:

```text
https://github.com/Seven128/project-tiny-context-harness#readme
```

Series:

```text
OpenSSF Baseline first, then Best Practices metal series.
```

## Current Evidence To Reuse

Use current repository evidence only. Recheck paths before submitting.

| Area | Current evidence | Notes |
|---|---|---|
| FLOSS license | `LICENSE`, `package.json`, `packages/sdlc-harness/package.json` use MIT. | MIT is compatible with a public OSS badge self-assessment. |
| Project purpose | README first screen states Minimal project memory for AI coding agents. | Use README as the project website while no separate website exists. |
| How to obtain | README npm install path and source preview fallback. | `project-tiny-context-harness@latest` is the normal install route. |
| Contribution path | `CONTRIBUTING.md`, issue templates, PR template, starter issues. | Keep contribution requirements factual and lightweight. |
| Governance | `GOVERNANCE.md`. | Current single-maintainer governance is documented; do not overstate maturity or multi-maintainer coverage. |
| Security reporting | `SECURITY.md`. | Use private vulnerability reporting instructions from that file. |
| Conduct standards | `CODE_OF_CONDUCT.md`. | Short project-specific policy; do not claim it was selected through the GitHub template UI. |
| Support path | `SUPPORT.md`. | Routes bugs, adoption reports, security issues, conduct concerns and source-preview questions. |
| Dependency monitoring | `.github/dependabot.yml`. | Covers npm and GitHub Actions. |
| CI / validation | `.github/workflows/package.yml`, `.github/workflows/harness.yml`, `npm test --workspace project-tiny-context-harness`, `make validate-context`. | Do not imply Context validation replaces product tests. |
| Scorecard | `.github/workflows/scorecard.yml` and README OpenSSF Scorecard badge. | Scorecard is separate from Best Practices/Baseline. |
| Public discussion | GitHub issues and adoption-report template. | Use URL-addressable GitHub issues as public discussion/support surface. |

## Known Gaps To Review

Do not mark these as met without maintainer review:

- Governance maturity: if the form asks about multi-maintainer governance, bus factor or formal roles, answer conservatively; current governance is single-maintainer.
- DCO / CLA: do not claim a legal contribution mechanism unless it is actually required and documented.
- Release security policy: verify whether `SECURITY.md`, release workflow and npm publish runbook are enough for the selected criteria.
- npm availability: if a criterion asks how users obtain the software, cite `project-tiny-context-harness@latest` and the source preview fallback.
- Bus factor or multi-maintainer criteria: do not overstate if the project is still single-maintainer.

## Submission Steps

1. Run a fresh metrics snapshot:

```sh
npm run launch:metrics -- --output tmp/sdlc/launch-metrics/openssf-best-practices-before.md
```

2. Run readiness checks:

```sh
npm run launch:check
npm run launch:strict-external
```

3. Visit <https://www.bestpractices.dev/en> and log in with GitHub or a site account.
4. Add the project with the repository URL above.
5. Choose OpenSSF Baseline first unless the maintainer intentionally wants the metal series first.
6. Let the site run automated analysis, then review each automation-filled answer before accepting it.
7. Keep any filled worksheet or private notes under `tmp/sdlc/recognition/**`, not `project_context/**`.
8. After a badge is earned, add only the official badge Markdown from the Best Practices site to README/package README and add a follow-up readiness gate.

## Claims Boundary

Allowed before submission:

```text
Preparing an OpenSSF Best Practices / Baseline self-assessment.
```

Allowed after starting the application:

```text
OpenSSF Best Practices / Baseline self-assessment in progress.
```

Allowed only after the official site grants a badge:

```text
OpenSSF Baseline badge earned.
OpenSSF Best Practices passing badge earned.
```

Avoid before a badge is granted:

```text
OpenSSF certified.
OpenSSF approved.
OpenSSF Best Practices compliant.
Security-validated by OpenSSF.
```

Do not use badge progress as benchmark, adoption, award or productivity evidence. It is a trust and security-posture signal only.
