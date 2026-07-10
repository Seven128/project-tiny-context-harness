# Campaign Review, Handoff, Start, And Continuation

## Resume And Review

Resume from `campaign.yaml`, immutable revision files, and CLI projections; do not reconstruct state from chat memory. Run `next --campaign <path> --json` and inspect the selected/current SFC, authoring status, handoff status, result projection, dependencies, and unresolved decisions. Re-read current Context/code before semantic authoring or continuation.

If the current revision is ready, run preflight again before handoff. If it is stale or invalid, create a new packet revision. Never edit rendered projections or execution state to make a campaign appear ready.

## Handoff

Run:

```text
ty-context composite-campaign handoff --campaign <path> --slice <id>
```

Handoff freezes the current revision hashes, materializes a unique workdir, and reuses composite init, compile, and render-goal. It does not call `create_goal`, execute the plan, or prove completion. Report `handoff_ready`, the workdir, and `goal-objective.txt`. Without explicit start authorization, stop here.

## Explicit Start

For `start`, `启动`, or an already-authorized prepare-and-execute request:

1. Read the complete generated `goal-objective.txt`.
2. If no Goal is already bound, call Codex `create_goal` with that complete objective; do not compress it into a lossy summary.
3. After successful Goal creation, or when retrying the already-bound Goal ID, bind it exactly once:

```text
ty-context composite-campaign start --campaign <path> --slice <id> --goal-id <id>
```

The same Goal ID is idempotent. If it is already bound, skip `create_goal` and retry `start` with the existing ID. A different ID conflicts. If Goal creation fails, do not call `start`. Goal execution owns implementation and must reread current Context/code, resolve Context Delta, follow the strict composite execution workflow, and reach its own final gate.

## Record Result

After the bound execution workdir contains a current final-gate event, run:

```text
ty-context composite-campaign record-result --campaign <path> --slice <id> --workdir <path>
```

This mirrors only the current attempt's hash-matching `accept`, `blocked`, or `reject` result. It never runs the gate, upgrades a status, accepts validator-only evidence, or computes campaign completion. Report mismatches as blockers rather than editing campaign or task state.

For an orchestrated prepare-and-execute run, the order is: downstream final gate, `record-result`, then `update_goal(status="complete")` only when the strict Goal completion contract permits it; only after the Goal is no longer active may `next` continue. If the downstream executor already closed the Goal, a later prepare/resume invocation may record the persisted verified result before calling `next`. The strict executor owns Goal completion authority; this Skill owns only campaign result synchronization and continuation.

## Continue Next

Only continue when no active Goal remains. Run:

```text
ty-context composite-campaign next --campaign <path> --json
```

`next` is read-only: a `recommended` candidate is not yet selected and cannot accept a packet. If exactly one dependency-ready candidate exists, create a new `ScopeFitResultV1` with the same stable graph and IDs, preserve prior rationale plus the continuation reason, set `decision: "split_required"`, set `selected_slice_id` to that candidate, clear `decision_required`, and run:

```text
ty-context composite-campaign apply-scope --campaign <path> --input <continued-scope.json>
ty-context composite-campaign next --campaign <path> --json
```

Continue only when the second `next` reports that SFC as `selected`. If multiple same-priority candidates exist or a product decision remains, ask one user choice, then persist the chosen candidate through the same stable-graph `apply-scope` transition and confirm it with `next`; never author directly from `recommended` or `decision_required`. If none is ready, report the blocking dependencies/results.

After selection is persisted, refresh current Context and code, then author that current SFC only. There is no aggregate campaign completion flag; describe observed per-SFC results and the next action without declaring the campaign product-complete.
