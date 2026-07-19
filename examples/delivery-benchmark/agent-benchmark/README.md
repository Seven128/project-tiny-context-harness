# Real Codex Agent Benchmark Protocol

This directory defines the operator-only protocol for paired, real Codex Agent runs. It does not simulate an Agent and does not publish benchmark conclusions by itself.

## Purpose

The benchmark isolates one candidate change against the fixed current-main control commit recorded in `plan.json`. A valid pair keeps the following constant:

- scenario and prompt scope;
- Codex model and reasoning level;
- final hidden quality bar;
- fresh independent session boundary for every measured stage;
- operator protocol and staged prompt timing.

Only the Harness commit, generated Harness surface and named variant may differ. The pair validator also requires the operator runner, scenario Source, staged prompts, rubric and hidden probe hashes to be identical.

The gold set remains outside every prepared run. `gold-set.json` is operator-only; the runner records its hash but never copies the file into a run directory.

## Current Coverage

The existing four Minimal Context scenarios provide executable coverage for:

- Context routing and recovery;
- ordinary workflow-expression A/B tests;
- local bugs, cross-module and cross-layer work;
- API/schema evolution;
- UI/browser, worker runtime and structured JSON checks;
- security/permission boundaries and external-pending recovery.

The gold set explicitly records gaps. Long-Task Contract authoring, multi-root Preflight repair, true population proof and isolated weak-observability experiments require dedicated fixtures before those tracks become runnable.

## Validate Assets

```sh
node examples/delivery-benchmark/runner/agent_benchmark.mjs validate-assets
```

This verifies:

- fixed-condition and track definitions;
- scenario references;
- gold-set episode uniqueness;
- every referenced rubric ID against the scenario's current `rubric.json`;
- the baseline commit and known coverage gaps.

## Prepare One Run

Build each selected Harness checkout first so `packages/ty-context/dist/cli.js` matches its declared commit. Preparation rejects a dirty checkout and records the built CLI hash.

Run the control against the exact baseline checkout. The pair tool may live in a newer tooling checkout; `--harness-root` selects the checkout whose Harness assets and lifecycle runner are measured:

```sh
node examples/delivery-benchmark/runner/agent_benchmark.mjs prepare-run \
  --track context-routing \
  --role control \
  --variant current-main \
  --scenario support-triage-board \
  --run-index 1 \
  --model <fixed-model> \
  --reasoning <fixed-reasoning-level> \
  --harness-root /path/to/baseline-checkout \
  --out-dir .artifacts/agent-benchmark/context-routing/support-triage-board/1/control \
  --force
```

Run the candidate against its exact candidate checkout and provide both the checkout and commit explicitly:

```sh
node examples/delivery-benchmark/runner/agent_benchmark.mjs prepare-run \
  --track context-routing \
  --role candidate \
  --variant context-resolve-r0 \
  --scenario support-triage-board \
  --run-index 1 \
  --model <same-model> \
  --reasoning <same-reasoning-level> \
  --harness-root /path/to/candidate-checkout \
  --harness-ref <candidate-commit-sha> \
  --out-dir .artifacts/agent-benchmark/context-routing/support-triage-board/1/candidate \
  --force
```

Preparation fails when the selected `--harness-root` checkout is dirty, its
`HEAD` does not equal the declared commit, or its scenario corpus no longer
matches the operator plan and gold-set rubric references. Each prepared run
contains:

- the existing scenario prompt and warm Harness scaffold;
- `agent-run.json` with prompt, plan, gold-set, operator-tool, operator-asset, built-CLI, prepared-tree and commit hashes;
- `codex-runbook.md` with the exact external-session procedure;
- `agent-session-template.json` for diagnostic session facts.

It contains no gold-set content.

## Execute In Codex

For every stage listed in `agent-run.json`, open a new Codex session rooted at the prepared scenario directory. Use the locked model/reasoning settings. The initial stage uses `.benchmark/prompt.md`; recovery/RFC/debug prompts are rendered and recorded only when their stage begins.

Follow `.benchmark/codex-runbook.md` for per-stage observer cycles, hidden recovery scoring, final quality-probe and validation commands. Do not expose a later-stage prompt early. Record every operator intervention through the existing delivery benchmark runner.

Agent-reported tokens and Context reads remain diagnostic unless a session/tool export independently supports them.

## Validate A Pair

After both independent runs are complete:

```sh
node examples/delivery-benchmark/runner/agent_benchmark.mjs validate-pair \
  --control-run <control-run-dir> \
  --candidate-run <candidate-run-dir> \
  --complete
```

A conclusion-eligible pair requires:

- passing hidden quality probes on both sides;
- a clean final `main` whose `HEAD` is pushed to the prepared local `origin/main`;
- one completed external observer cycle per expected stage;
- a passing hidden recovery score when the scenario includes recovery;
- distinct fresh session IDs for every stage and across both runs;
- equal model, reasoning, scenario, run index, protocol-prompt hashes, gold-set hash and operator-asset hash;
- distinct variant IDs and Harness commits;
- equivalent operator-intervention summaries.

A mechanically valid pair with the same Harness commit or asymmetric
intervention is calibration-only. Pair output includes observer elapsed deltas
and clearly labeled diagnostic session metrics; Agent-reported reads or tokens
do not become conclusion-grade merely because they are machine-aggregated.

At least three eligible paired runs are required before an experiment-level decision. Near-threshold or high-variance results should use five.
