# Fresh-Agent Recovery Walkthrough

This walkthrough shows the product value in one concrete story. It is illustrative, not an external adoption report and not benchmark evidence.

## The Problem

Imagine a small support-triage app where agents often need to change queue logic. The code is understandable, but fresh chats keep rediscovering the same project facts:

- The product goal is to route customer tickets without changing the operator review flow.
- Generated API fixtures should not be edited by hand.
- Queue behavior is owned by one module; notification copy is owned elsewhere.
- The useful validation path is one focused queue test plus the project smoke command.
- A previous debugging turn found that retry timing is intentionally conservative.

Those facts are too specific for a generic README and too durable to leave only in chat history.

## Before Minimal Context

A fresh agent can still be capable and still waste the first turn:

```text
I will inspect the repository and infer the architecture from the source tree.
```

The common failure is not bad code generation. It is project-memory loss:

| Fresh-agent question | Typical rediscovery cost |
|---|---|
| What is the project trying not to change? | Reads old issues, comments or unrelated docs. |
| Which module owns this behavior? | Searches broad code paths and may touch neighboring modules. |
| Which validation command matters? | Runs a slow full suite or a generic command that misses the queue path. |
| What did the last debugging turn learn? | Repeats the same investigation. |

## Add The Harness

Install and initialize the recovery surface:

```sh
npm install -D project-tiny-context-harness@latest
npx --yes --package project-tiny-context-harness@latest sdlc-harness init
make validate-context
```

Then keep the generated files small:

```text
AGENTS.md
project_context/
  context.toml
  global.md
  architecture.md
  areas/main.md
  areas/main/verification.md
```

Example durable facts:

```md
## Project Goal

- Route support tickets to the right queue while preserving operator review.

## Non-goals / Boundaries

- Do not edit generated API fixtures by hand.
- Do not move notification copy into queue routing.

## Verification Entry Points

- npm test -- queue-routing
- npm run smoke:support-triage
```

That is the whole point: keep the facts a new agent must recover, not a full task-management system.

## After Minimal Context

Use the README recovery prompt in a fresh chat:

```text
Read AGENTS.md and project_context/** first. Summarize the project goal, non-goals, architecture boundaries, validation entry points and next safe action before proposing code changes.
```

A useful first answer should look like this:

```text
The project goal is to route support tickets without changing operator review.
Queue routing owns this behavior; notification copy is outside scope.
Generated API fixtures should not be edited by hand.
The focused validation path is npm test -- queue-routing, then npm run smoke:support-triage.
Next safe action: inspect the queue routing module and the existing focused test before proposing a patch.
```

The agent is now starting from maintained project memory instead of reconstructing it from scratch.

## What Changed

| Before | After |
|---|---|
| The agent infers intent from file names and old comments. | The agent reads explicit project goal and boundaries first. |
| Validation is guessed or over-broad. | Validation entry points are durable and easy to repeat. |
| Previous debugging lessons live in chat history. | Durable lessons can be captured in Context when they will matter again. |
| README carries both human onboarding and agent recovery. | README stays broad; `project_context/**` carries compact recovery facts. |

## What Did Not Change

- Product quality still belongs to tests, CI, review and human acceptance.
- Context files do not prove that a change is correct.
- The Harness does not require phase gates, task state or work-product trees.
- This walkthrough is not a speedup claim. Fresh benchmark work must use the current Minimal Context design before publishing efficiency numbers.

## Turn This Into Real Evidence

After trying the Harness on a real repository, open an [adoption report](https://github.com/Seven128/project-tiny-context-harness/issues/new?template=adoption_report.yml) with:

- What your agent kept rediscovering.
- Which facts became easier to recover.
- Which generated files felt too noisy or too thin.
- Which validation paths were still missing.
