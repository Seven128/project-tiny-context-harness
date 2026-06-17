# Codex For OSS Application Packet

Use this packet when the maintainer applies to OpenAI Codex for Open Source. Do not submit by automation. The maintainer must review current metrics, account details and terms before using any copy here.

Official sources checked on 2026-06-10:

- Program page: <https://developers.openai.com/community/codex-for-oss>
- Application form: <https://openai.com/form/codex-for-oss/>

## Program Fit

Current fit:

- Project Tiny Context Harness is an active MIT open-source repository.
- The project directly supports coding-agent maintainers by keeping repo-local project memory recoverable across fresh sessions.
- The maintainer is actively maintaining package release, validation, docs, launch, issue templates and security posture.
- The public repo, README, launch assets and OpenSSF Scorecard surface are live.

Current weak points:

- The npm package is published, but stars are still low and adoption evidence is early.
- Stars are still low; do not overstate broad adoption.
- No public adoption report exists yet; describe ecosystem importance and maintainer workflow fit, not validation by users.

## Form Fields

Use these fields only after running a fresh metrics snapshot:

```sh
npm run launch:metrics -- --output tmp/ty-context/launch-metrics/codex-for-oss-before.md
```

Repository URL:

```text
https://github.com/Seven128/project-tiny-context-harness
```

Role:

```text
Primary maintainer
```

Interested in:

```text
API credits for my project
Codex Security
```

Only select Codex Security if the maintainer is comfortable with conditional security access review and any required follow-up.

## 500-Character Copy

The application form limits several answers to 500 characters. Keep the text factual and current.

### Why Does This Repository Qualify?

```text
Project Tiny Context Harness is an active MIT developer tool for AI coding-agent maintainers. It installs repo-local Minimal Context, AGENTS.md guidance and validate-context checks so fresh Codex, Claude Code, Cursor and OpenCode sessions recover project intent, boundaries and validation paths. It is designed for maintainers who need durable repo memory without Tiny Context-stage ceremony.
```

Character count: 384.

If the latest metrics snapshot shows useful npm download or star signals, add them only if the result stays under 500 characters and remains accurate.

### How Will You Use API Credits?

```text
Use Codex to review PRs, triage issues, test release workflows, run fresh-agent recovery checks, improve docs/examples and harden the npm package. API credits would support maintainer automation around validation, release checks and docs quality without making unsupported benchmark or adoption claims.
```

Character count: 302.

### Anything Else We Should Know?

```text
The project is intentionally narrow: it keeps durable project memory in plain repo files and leaves product quality to tests, CI, review and maintainers. The GitHub repo, npm package and source preview path are public; current evidence is launch readiness, not broad adoption.
```

Character count: 276.

## Submission Checklist

Before submitting:

- [ ] Confirm the maintainer's GitHub profile visibility is public.
- [ ] Confirm the repository visibility is public.
- [ ] Confirm the ChatGPT account email and OpenAI organization ID.
- [ ] Run `npm run launch:metrics -- --output tmp/ty-context/launch-metrics/codex-for-oss-before.md`.
- [ ] Run `npm run launch:strict-external` and note any external blocker if it appears.
- [ ] Update any metrics in the copy from current evidence only.
- [ ] Do not claim official OpenAI integration, broad adoption, awards, benchmark wins or productivity multipliers.
- [ ] Save the submitted form timestamp and non-private summary under `tmp/ty-context/recognition/**`, not in `project_context/**`.

## Claims Boundary

Allowed:

```text
Applied to Codex for Open Source.
```

Only after selection:

```text
Selected for Codex for Open Source.
```

Avoid before selection:

```text
OpenAI-backed.
Official Codex integration.
Funded by OpenAI.
Validated by OpenAI.
Codex partner.
```

Do not mention the application in README or launch copy unless the maintainer intentionally wants to disclose it. Application status is not product-quality evidence.
