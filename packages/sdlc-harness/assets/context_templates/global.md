# Project / Delivery Context

## Project Goal

- Describe the user-visible goal this project is trying to achieve.

## Non-goals / Boundaries

- List what this project intentionally does not do.

## Background

- Capture the minimum background a fresh agent needs before changing code.

## Design Rationale

- Record durable choices that are hard to infer from code or tests. Classify changes before implementation; if a change alters product ownership/plans, module responsibilities, information architecture, API/Schema, state/scheduler semantics, cross-area boundaries or verification entry points, update Context before code with enough durable context to guide implementation.

## Architecture Context

- Link to `project_context/architecture.md`; keep architecture notes minimal and focused on boundaries, components and constraints that are not obvious from code.

## Context Graph

- Link to `project_context/context.toml` and keep its default area, role, trigger, read policy and boundary metadata aligned with this Context.

## Product / Delivery Brief

- Capture durable product goals, users, core flows, acceptance signals and non-goals.

## UX / Screen Brief

- Capture durable screen, flow, interaction, responsive and accessibility facts. Use `DESIGN.md` for visual identity and design tokens when needed.

## Verification Entry Points

- List project-level default commands or durable smoke paths that prove product behavior.
- For reusable complex paths, keep only special preparation, shortest command, expected stage/signal, acceptable warnings and excluded dead ends.
- Do not record one-off logs, full output, temporary JSON, CI artifacts, reports, secrets, tokens, cookies, device ids or raw payloads.

## Current State

- Summarize what is implemented, blocked or risky right now.

## Next Safe Action

- State the safest next step for a fresh agent, including whether the next change should update Context before code.

## Context Index

- [main](areas/main.md)
