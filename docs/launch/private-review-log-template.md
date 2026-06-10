# Private Review Log Template

Snapshot date: 2026-06-10.

Use this template for the 5-10 person private review pass before broad launch. The npm package is now published; source preview remains an optional fallback for reviewers who want to inspect a local package build or report setup friction.

Keep filled logs under `tmp/sdlc/private-review/**`, not in `project_context/**`, because private review notes are launch evidence and feedback triage, not durable project context.

Do not commit filled logs unless every reviewer explicitly approved the exact public details.

## Review Pass

```text
Review window:
Maintainer:
Repo URL reviewed: https://github.com/Seven128/project-tiny-context-harness
Source preview used: yes/no
npm package installable: yes/no
Baseline metrics file:
```

## Reviewer Tracker

Use broad descriptions by default. Do not write private repo names, company names, customer details, secrets, raw chat logs or private code.

| ID | Profile | Agent surface | Repo type | Tried source preview? | Would try after npm publish? | Consent level | Follow-up |
|---|---|---|---|---|---|---|---|
| R1 | <solo maintainer / staff engineer / OSS maintainer> | <Codex / Claude Code / Cursor / OpenCode / mixed> | <public-safe repo type> | <yes/no> | <yes/no/maybe> | <none / anonymous / public name / public link> | <issue/docs/story/no action> |
| R2 |  |  |  |  |  |  |  |

## Per-Reviewer Notes

### R1

**Concrete recovery problem:**

```text
What project facts did their agents repeatedly rediscover?
```

**Harness fit:**

```text
Would AGENTS.md plus project_context/** have helped? Why or why not?
```

**README or trial confusion:**

```text
What did they misunderstand in the first screen, source preview or demo?
```

**Missing recovery fact or recipe:**

```text
What one field, file, example or agent-surface recipe would make the project more useful?
```

**Consent note:**

```text
Attribution level:
Approved surfaces:
Approved quote or paraphrase:
```

## Triage Summary

Write this after the review pass. Count repeated themes before changing public copy.

| Theme | Count | Evidence strength | Action |
|---|---:|---|---|
| AGENTS.md overlap unclear | 0 | <weak/medium/strong> | <README/FAQ/reply/no action> |
| Source preview friction | 0 | <weak/medium/strong> | <README/demo/npm/no action> |
| Missing existing-repo adoption detail | 0 | <weak/medium/strong> | <docs/adopt-existing-repo.md/issue/no action> |
| Wants benchmark proof | 0 | <weak/medium/strong> | <FAQ/benchmark issue/no claim> |
| Wants task planning or full SDLC | 0 | <weak/medium/strong> | <comparison guide/no scope change> |

## Conversion Decisions

Only convert feedback into public material when the reviewer gave explicit consent and the example describes a concrete recovery problem.

| Candidate | Public surface | Consent confirmed? | Safe wording | Next action |
|---|---|---|---|---|
| <R-id/theme> | <README / FAQ / issue / launch reply / adoption story> | <yes/no> | <exact approved wording> | <owner/date> |

## 24-Hour Actions

- [ ] Patch README or FAQ for repeated confusion.
- [ ] Open a GitHub issue for repeated missing recovery facts.
- [ ] Convert explicitly consented examples with `docs/launch/adoption-story-template.md`.
- [ ] Leave private-only notes under `tmp/sdlc/private-review/**`.
- [ ] Do not claim adoption, benchmark wins, productivity gains or production validation from this pass.

## Claims Boundary

Allowed if the notes support it:

```text
Private reviewers named concrete fresh-agent recovery failures this project is designed to address.
```

Avoid:

```text
Validated by teams.
Proven faster.
Production-ready.
Trusted by maintainers.
Benchmark-backed.
```
