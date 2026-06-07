# Area Context: main

## Responsibility

- Describe this area or context unit's responsibility.

## User / System Contract

- Describe the external behavior, API, CLI, UI, screen state, interaction or data contract. Contract changes should be captured here before implementation alignment.
- For UI/page areas, name the page responsibility, core user judgment, persistent information/actions/feedback, non-persistent information, and what belongs in downstream consumption, ops, detail or other surfaces when those facts are durable.

## Core Data / API / State

- Summarize important data structures, APIs, state transitions or rules.

## Key Constraints

- List constraints that are not obvious from code alone, including product rules, responsive/a11y needs or visual boundaries.

## Code Entry Points

- `src/` or the concrete file/function entry points.

## Test Entry Points

- `npm test` or focused test commands for this area.
- For durable smoke/re-test paths, record only special preparation, shortest command, expected stage/signal, acceptable warnings and excluded dead ends.
- Cross-area smoke should live in the primary owner area; related areas should keep only a short reference.

## Open Risks

- List unresolved risks or blockers.
