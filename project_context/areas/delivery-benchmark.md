# Area Context: delivery-benchmark

## Responsibility

- Provide repo-local scenarios, runner tools and static reports that evaluate whether Harness improves same-quality lifecycle delivery efficiency.

## User / System Contract

- Benchmark runner prepares fixed baseline and Harness run directories.
- Real Agent pair tooling prepares and validates reproducible control/candidate packets but never invokes or simulates Codex.
- Observer, timer, hidden quality probes, recovery scoring, intervention records and gate findings are measurement tools, not product quality shortcuts.
- Public conclusions should use high-confidence metrics for core claims and keep medium/low-confidence metrics as diagnostics.
- Workflow overhead ratio, artifact inventory / artifact count, gate true-product defect count versus hygiene issue count and AC progress visibility are diagnostic fields only; they explain process cost and evidence visibility but do not create new benchmark conclusions.
- New Harness benchmark prompts should use Minimal Context, not the old stage workflow.

## Core Data / API / State

- Lifecycle runner: `examples/delivery-benchmark/runner/delivery_benchmark.mjs`.
- Real Codex Agent pair runner: `examples/delivery-benchmark/runner/agent_benchmark.mjs`.
- Operator-only experiment plan and gold set: `examples/delivery-benchmark/agent-benchmark/**`.
- Scenarios: `examples/delivery-benchmark/scenarios/**`.
- Prompts: `examples/delivery-benchmark/prompts/baseline.md` and `examples/delivery-benchmark/prompts/harness.md`.
- Report data and UI: `examples/delivery-benchmark/results/benchmark-data.js` and `index.html`.
- Operator docs: `examples/delivery-benchmark/README.md`, `RUNBOOK.md` and `agent-benchmark/README.md`.

## Key Constraints

- Do not publish calibration pilots as formal efficiency results.
- Do not leak recovery/RFC/debug probe answers or the operator-only Agent gold set into measured prompts or run directories.
- A real Agent pair fixes scenario, prompt scope, model, reasoning level, operator runner/scenario/probe hashes, hidden quality bar and a fresh session for every measured stage; only the named Harness variant may differ.
- The pair runner records plan, gold-set, prompt, operator-tool, operator-asset, built-CLI and prepared-tree hashes, revalidates the selected scenario corpus, and requires a clean final `main` pushed to the prepared local `origin/main`; it does not create Agent processes, model routes, workflow authority or product acceptance.
- Historical stage-based numbers are removed from public report data after Minimal Context becomes the default.
- Benchmark projects should be high-signal but not hacked: they may target Harness design goals, but must keep the same quality bar and independent fresh runs.
- Do not publish workflow diagnostic fields as formal efficiency results unless the paired run also satisfies the same-quality, fresh-run and observer-evidence rules.

## Code Entry Points

- `examples/delivery-benchmark/runner/delivery_benchmark.mjs`
- `examples/delivery-benchmark/runner/agent_benchmark.mjs`
- `examples/delivery-benchmark/scenarios/*/quality_probe.mjs`
- `examples/delivery-benchmark/results/index.html`

## Test Entry Points

- `node --test tests/ty-context/delivery-benchmark.test.mjs`
- `node --test tests/ty-context/agent-benchmark-assets.test.mjs tests/ty-context/agent-benchmark-default-path.test.mjs tests/ty-context/agent-benchmark-metadata.test.mjs tests/ty-context/agent-benchmark-repository.test.mjs tests/ty-context/agent-benchmark-run.test.mjs`
- `node --check examples/delivery-benchmark/runner/delivery_benchmark.mjs`
- `node --check examples/delivery-benchmark/runner/agent_benchmark.mjs`
- `node --check examples/delivery-benchmark/results/benchmark-data.js`

## Open Risks

- Current benchmark data is intentionally empty after reset.
- Real Codex A/B execution still requires separate repository-root sessions for every measured stage, operated outside this runner.
- Current scenarios do not yet cover true Population proof, Compact V2 Long-Task authoring, deterministic multi-root Preflight repair or isolated weak-observability policy; the gold set records these as explicit gaps.
- Future pilot design must measure whether Minimal Context reduces recovery cost without hiding Harness overhead.
