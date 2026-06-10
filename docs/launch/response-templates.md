# Launch Response Templates

Snapshot date: 2026-06-10.

Use these as starting points for Show HN, Reddit, Product Hunt and curated-list maintainer replies. Adapt every reply to the actual comment. Do not paste a long template when a link to the README, FAQ or demo is enough.

Public stance:

- Ask for technical feedback, not stars or upvotes.
- Keep the claim narrow: repo-native Minimal Context for fresh-agent recovery.
- Do not claim adoption, awards, benchmark wins or productivity multipliers.
- Use [claims-boundary.md](claims-boundary.md) before writing a new public reply pattern.
- Link the FAQ for repeated objections: [../faq.md](../faq.md).

## AGENTS.md Overlap

```text
AGENTS.md is the startup router in this design, not the whole memory layer.

The problem I ran into is that AGENTS.md becomes too broad if it carries product intent, architecture boundaries, validation paths, role-specific workflows and durable decisions all at once. Project Tiny Context Harness keeps AGENTS.md short and puts maintained project facts into project_context/** so a fresh agent has a predictable recovery path.
```

Use when someone says: "Isn't this just AGENTS.md?"

Link: [FAQ: Is this just AGENTS.md?](../faq.md#is-this-just-agentsmd)

## Just Documentation

```text
Partly, yes. The bet is that the documentation surface has to be deliberately small, repo-native and maintained for fresh-agent recovery.

It should not become a second spec system, task manager or release ledger. The validator checks the recovery surface and false durable test claims. Product quality still belongs to the repo's own tests, CI, review and human acceptance.
```

Use when someone says: "This is just docs" or "Why not write a better README?"

Link: [FAQ: Why not just write a better README?](../faq.md#why-not-just-write-a-better-readme)

## Stage Ceremony

```text
Fair concern. The project started from a heavier stage-based workflow, and the current direction intentionally moved the default down to Minimal Context.

Modern coding agents already internalize much of the ordinary understand, design, implement, test and repair loop. The current package preserves the part that still helps across fresh sessions: compact project memory. It does not require phase gates, task state or work-product trees by default.
```

Use when someone asks why the project still talks about SDLC, phases or ceremony.

Link: [FAQ: Why did you remove the old stage-based workflow?](../faq.md#why-did-you-remove-the-old-stage-based-workflow)

## Benchmark Questions

```text
I am intentionally not claiming speedups yet.

Old stage-based runs are not current evidence because they measured a heavier workflow that this project removed. The current claim is narrower: Minimal Context is useful if fresh agents repeatedly rediscover project intent, ownership and validation paths. Fresh benchmark claims need a new baseline and a Minimal Context Harness comparison.
```

Use when someone asks for numbers.

Do not say old stage-based results prove the current package is faster.

Link: [FAQ: Does this make every task slower?](../faq.md#does-this-make-every-task-slower)

## Tests And CI Boundary

```text
No, this does not replace tests or CI.

Context tells a fresh agent what the project intends and which validation path matters. Tests, CI, review and human acceptance still prove whether the product works. validate-context is a recovery-surface check, not a product-quality gate.
```

Use when someone worries that Context is being treated as proof of correctness.

Link: [FAQ: Does this replace tests or CI?](../faq.md#does-this-replace-tests-or-ci)

## Context Maintenance Cost

```text
That maintenance cost is the main design risk, so ordinary bug fixes should not update Context.

project_context/** is for durable facts that future sessions repeatedly need: goals, non-goals, architecture boundaries, ownership, validation entry points and long-lived decisions. One-off logs, transient notes and routine local edits should stay out.
```

Use when someone says this will become stale or too much to maintain.

Link: [FAQ: When should Context be updated?](../faq.md#when-should-context-be-updated)

## Context7 Or External Docs

```text
I see Context7 as complementary.

Context7 helps agents pull current external library docs. Project Tiny Context Harness is about the repo's own durable facts: goals, non-goals, architecture boundaries, ownership and validation entry points.
```

Use when someone compares it to external documentation retrieval.

## Code Intelligence Tools

```text
Code-intelligence tools help an agent navigate symbols and implementation.

This project stores the intent and boundary layer that code search often cannot answer cleanly: why a module exists, what is out of scope, which validation path matters and which old workflow should not be reintroduced.
```

Use when someone compares it to semantic code search, IDE memory or MCP code navigation.

## Existing Repos

```text
Yes, use it on a branch first.

The normal path is:

npm install -D project-tiny-context-harness@latest
npx --yes --package project-tiny-context-harness@latest sdlc-harness init --adopt
make validate-context

The README also has a source-preview path that packs the local workspace into a disposable repo for private review or package development.
```

Use when someone asks whether this is only for new projects.

Link: [README source preview](../../README.md#source-checkout-preview)

## Agent Surface Lock-In

```text
No lock-in is required for the core value.

The durable project memory is plain AGENTS.md plus project_context/**. Codex, Claude Code, Cursor, Gemini CLI, OpenCode, Cline, Roo or a human reviewer can read the same files. Tool-specific folders are only support surfaces.
```

Use when someone asks whether this is Codex-only or tied to one IDE.

Link: [Agent surface recipes](../agent-surface-recipes.md)

## Feedback Ask

```text
The most useful feedback is from repos where fresh agent sessions repeatedly rediscover the same facts.

I want to know which facts became easier to recover, which files felt too noisy or too thin, and which validation paths were missing. Recovery evidence is useful; benchmark claims need fresh controlled runs.
```

Use when the thread is receptive and you want concrete adoption reports.

Link: [Adoption report issue form](https://github.com/Seven128/project-tiny-context-harness/issues/new?template=adoption_report.yml)

## Reply Triage

| Comment type | Best action |
|---|---|
| Good-faith technical question | Answer directly, then link README/FAQ/demo. |
| Repeated confusion | Patch README/FAQ before the next channel post. |
| Benchmark demand | State the no-claim boundary and point to fresh rerun requirements. |
| Integration request | Ask which agent/tool and what fact recovery failed. Do not promise scope. |
| Dismissive one-liner | Do not argue. Save energy for substantive comments. |
| Real adoption example | Ask them to file or comment on the adoption report issue. |
