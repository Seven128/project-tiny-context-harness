---
context_role: decision-rationale
read_policy: on-demand
---
# Minimal Context Rationale

## Role

This rationale explains why the current product direction is Minimal Context Harness. Read it when evaluating proposals to restore lifecycle phases, thick documents, stage gates, validator-driven workflow or broad default process artifacts.

## Why Minimal Context

- The original stage-based workflow tried to make requirements, design, architecture, implementation, review, testing, release and requirement changes explicit so later agents would recover faster.
- Benchmark pilots showed that default fact-source writes, stage decisions, phase transitions and gates create real time and token cost even when final product quality is unchanged.
- Modern coding agents already internalize much of the ordinary single-task loop: understand compact requirements, make local design choices, edit code, run focused checks and repair simple failures.
- The durable value with the clearest return is fast recovery of project intent, non-goals, ownership, architecture constraints, integration direction and repeat-execution paths across fresh conversations.
- Context therefore preserves the smallest stable fact set that code alone does not reliably communicate.

## Why Not Restore The Old SDLC Default

- Lifecycle phases, plan state, stage Skills, phase gates and `.work_products/**` make every project pay ceremony cost before evidence shows the structure is needed.
- Thick PRD/UX/tech-plan/review/test/release document chains duplicate reasoning that agents can often perform inside the current task loop.
- Validator-driven workflow should be limited to recoverability, generated-asset consistency and fake verification-claim prevention. Harness must not claim product quality or enforce edit order as a product substitute.
- Historical stage design is documentation-only in the current source tree. It remains useful as rationale in `PROJECT_SPEC.md`, not as runnable default package behavior.

## Current Design Choice

- Keep `project_context/**` as the durable recovery surface.
- Keep `AGENTS.md` as startup router and hard-boundary surface, not a full design manual.
- Keep role Skills as prompt-level thinking frameworks that write only durable conclusions to Context.
- Keep temporary plans and target-mode audits as execution cache, never as long-lived fact sources.
- Keep tests, CI, review, smoke checks, hidden probes and human acceptance responsible for product quality.

## Historical Material Boundary

`PROJECT_SPEC.md` keeps the complete design explanation and historical notes: why the stage workflow existed, how it worked, what benchmark work found and why the product converged to Minimal Context. This rationale Context keeps only the stable reasons that should affect future maintenance choices.
