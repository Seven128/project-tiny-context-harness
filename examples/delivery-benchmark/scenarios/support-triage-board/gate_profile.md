# Gate Profile

This profile keeps the support triage lifecycle pilot focused on product gates
that reveal cross-layer drift. It avoids running unrelated Harness package
regression during orientation.

## Orientation

- Read `.benchmark/prompt.md`, `.benchmark/scenario.md`, repository files, README/docs, and tests.
- Do not run heavy validation during orientation.
- Do not run package source sync/check, workspace full regression, or Harness self-tests unless package source or managed assets were changed.

## Domain Focused Gates

- Run the project-local test entrypoint, normally `npm test`.
- Include API tests for ticket create/list/update/assign/status moves.
- Include priority policy tests for tier, channel, age and contract risk.
- Include UI smoke for kanban/list views and loading/empty/error/invalid states.
- When a later staged prompt injects a change or repair condition, add regression coverage for that injected API/UI/policy boundary before ending the stage.

## Harness Task Gates

- Harness mode may run `make validate-plan` after task or RFC planning changes.
- Harness mode may run `make validate-dev` at development handoff boundaries.
- Harness mode should time these gates with `event gate:<name>` and `phase GATE`.
- Baseline mode does not run Harness validators.

## Phase Exit Gates

- Run the smallest phase exit gate needed for the current Harness phase only when crossing that phase boundary.
- Do not run `make validate-current` at initial orientation.
- Do not treat a green workflow gate as a substitute for product smoke tests.

## Out-of-Scope Gates

- `node packages/sdlc-harness/dist/cli.js package sync-source`
- `node packages/sdlc-harness/dist/cli.js package check-source`
- `npm test --workspace agent-project-sdlc`
- `make validate-harness`
- consumer lab / installed-consumer validation

These gates belong to Harness package source changes, not this scenario pilot.
