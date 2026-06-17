# Launch Metrics Snapshot

This is the lightweight metrics runbook for Project Tiny Context Harness launch operations.

Use it before and after each public channel so stars, forks, open issues and npm downloads are recorded consistently.

## Command

```sh
npm run launch:metrics -- --output tmp/ty-context/launch-metrics/baseline.md
```

For JSON:

```sh
npm run launch:metrics -- --json --output tmp/ty-context/launch-metrics/baseline.json
```

For local readiness tests without network:

```sh
npm run launch:metrics -- --offline --json
```

## What It Captures

- GitHub stars, forks, open issues / pull requests, watchers and latest push time for `Seven128/project-tiny-context-harness`.
- Renamed npm package status and last-week downloads for `project-tiny-context-harness`.
- Legacy npm package status and last-week downloads for `agent-project-ty-context`.

Missing npm download data for a newly published package is an informational signal, not a metrics-script failure. The snapshot keeps running so launch notes can show the current telemetry explicitly.

## Boundary

Do not treat stars, forks or downloads as product-quality proof.

Use metrics for distribution telemetry:

- Did a channel bring attention?
- Did attention create real issues, adoption reports or questions?
- Did directory listings create durable discovery?

Use product evidence for product claims:

- install / smoke success
- real adoption reports
- fresh benchmark runs with a current Minimal Context baseline
- issue comments from users who tried it

Do not publish "benchmark-proven faster", adoption, award or productivity claims from this metrics snapshot.
