# Gate Profile

This profile keeps the webhook bridge lifecycle pilot focused on provider safety
gates. It avoids running unrelated Harness package regression during
orientation.

## Orientation

- Read `.benchmark/prompt.md`, `.benchmark/scenario.md`, repository files, README/docs, and tests.
- Do not run heavy validation during orientation.
- Do not run package source sync/check, workspace full regression, or Harness self-tests unless package source or managed assets were changed.

## Domain Focused Gates

- Run the project-local test entrypoint, normally `npm test`.
- Include HMAC signature, timestamp freshness, replay protection and event idempotency tests.
- Include retry/backoff and dead-letter queue tests.
- Include deterministic mock provider fixture smoke.
- When a later staged prompt injects a change or repair condition, add regression coverage for that injected provider-safety boundary before ending the stage.

## Harness Context Gates

- Harness mode may run `make validate-context` after durable `project_context/**` changes.
- Harness mode may run the scenario hidden quality probe at delivery boundaries.
- Harness mode should time these gates with `event gate:<name>` and `phase GATE`.
- Baseline mode does not run Harness validators.

## Boundary Gates

- Run context validation only when Context changed or when handing off a completed run.
- Do not run package or workspace-wide validation at initial orientation.
- Do not treat a green Context gate as a substitute for product smoke tests or hidden probes.

## Out-of-Scope Gates

- `node packages/ty-context/dist/cli.js package sync-source`
- `node packages/ty-context/dist/cli.js package check-source`
- `npm test --workspace project-tiny-context-harness`
- `make validate-harness` unless it is only being used as the `validate-context` alias for this run
- consumer lab / installed-consumer validation

These gates belong to Harness package source changes, not this scenario pilot.
