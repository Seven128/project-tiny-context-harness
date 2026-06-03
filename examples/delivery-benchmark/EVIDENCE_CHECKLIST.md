# Delivery Benchmark Evidence Checklist

This checklist defines when a benchmark run pair can support claims about the
AI SDLC Harness design purpose. It is intentionally conservative: a run may be
useful and still fail to prove the workflow goal.

## Design Purpose Under Test

The benchmark tests whether Harness improves complex-task same-quality lifecycle
delivery by reducing context loss, missed cross-layer changes, unsafe paths,
repair loops, and human steering enough to justify its workflow cost.

This is not a first-patch speed benchmark. It is also not a document-volume
benchmark: extra `.work_products` facts or managed runtime files only matter if
they improve later recovery, RFC/debug correctness, automation burden, or
high-risk safety.

## Publishable Pair Checklist

A baseline/Harness pair can enter the public report only when all P0 items pass.

| ID | Requirement | Required evidence | Conclusion role |
|---|---|---|---|
| P0-1 | Same scenario and expected modes | baseline report mode is `baseline`, Harness report mode is `harness`, same `scenario_id` | Required for any comparison |
| P0-2 | Formal protocol status | operator marks `--protocol-status formal` after checking fresh independent run, staged injection, no future leakage, no cross-path copy, observer coverage | Required for public result |
| P0-3 | Same hidden product quality | both paths pass the same scenario-owned hidden quality probe | Required for elapsed efficiency |
| P0-4 | High-confidence elapsed time | both paths have observer-measured elapsed time and `elapsed_time.conclusion_eligible` | Required for elapsed efficiency |
| P0-5 | Explicit cost boundary | both paths declare the same non-`unknown` `run_type` (`cold` or `warm`) | Required to avoid bootstrap/delivery mixing |
| P0-6 | Calibration rules checked | no prompt leakage, no copied implementation, no contaminated git surface, no stitched observer interval that changes the work boundary | Required for public result |

P1 diagnostics should be present whenever possible:

| ID | Requirement | Required evidence | Conclusion role |
|---|---|---|---|
| P1-1 | Artifact inventory | both reports include `artifact_inventory` from filesystem scan | Explains output volume only |
| P1-2 | Recovery signal | hidden answer-key recovery score, preferably upgraded to a hidden recovery action probe | Diagnostic until high-confidence |
| P1-3 | Gate value signal | first-pass hidden probe, gate findings, escaped defect and repair-loop records | Diagnostic until high-confidence |
| P1-4 | Automation burden signal | all protocol-external prompts delivered through a sealed prompt/intervention ledger | Diagnostic until completeness is enforceable |
| P1-5 | High-risk boundary signal | provider/live/credential safety scenario with hidden unsafe-path probes | Required for high-risk safety claims |

## Conclusion Rules

Use `evidence-check` before updating committed report data:

```sh
node examples/delivery-benchmark/runner/delivery_benchmark.mjs evidence-check \
  --baseline-report "$RUN_ROOT/baseline-summary.json" \
  --harness-report "$RUN_ROOT/harness-summary.json" \
  --protocol-status formal \
  --out "$RUN_ROOT/evidence-check.json"
```

Allowed conclusions:

- If P0 passes and Harness elapsed is lower: Harness has direct same-quality
  lifecycle efficiency evidence for that scenario.
- If P0 passes and Harness elapsed is higher: the run is conclusion-grade
  evidence against a direct faster/more-efficient claim for that scenario. The
  runner reports this as `negative_elapsed_signal`.
- If P0 fails: the pair is calibration or diagnostic only.
- If P0 passes but context recovery, automation burden, gate value or high-risk
  safety are not high-confidence: those benefits cannot be used to offset slower
  elapsed time.

Prompt burden has two layers. `.benchmark/prompts.ndjson` is high-confidence for
the character count and hash of saved protocol/operator prompt text, because the
runner writes it from the files it renders or receives. `human_intervention`
remains diagnostic unless the formal protocol also proves that all
out-of-protocol prompts were recorded; a missing intervention record is never
evidence of zero intervention burden.

## Design Purpose Proof Routes

Harness design purpose can be considered supported only by one of these routes:

1. Direct efficiency route:
   same hidden quality + formal protocol + same warm/cold boundary + lower
   observer elapsed time for Harness in at least the relevant scenario class.
2. Complexity-specific route:
   Harness may be slower in ordinary tasks, but high-confidence recovery,
   automation burden, gate value or escaped-defect data show a net win in
   complex RFC/debug/recovery scenarios.
3. Safety route:
   Harness prevents high-risk provider/live/credential wrong paths that baseline
   does not, with hidden unsafe-path probes and comparable elapsed/repair data.

Current public data does not yet satisfy these proof routes. It currently
supports a more modest conclusion: support-triage reached the same hidden
quality on both paths while Harness was slower, so the workflow should continue
iterating on gate and artifact cost before claiming efficiency.

## What Not To Do

- Do not publish a favorable phase split without the full pair result.
- Do not use static keyword/path rubric alone as product-quality proof.
- Do not use operator-recorded gate findings as proof of gate net value.
- Do not treat missing intervention records as zero intervention burden.
- Do not treat prompt ledger hashes as semantic proof that an intervention was
  necessary, helpful or complete.
- Do not count managed runtime line volume as product output value.
- Do not keep selecting more favorable scenarios to hide ordinary-task negative
  elapsed signals.
