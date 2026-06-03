# Delivery Benchmark Report: support-triage-board

Run id: `20260602-083512-support-gate-value-formal-pilot`

## Public Conclusion

This pilot is the strongest current same-quality efficiency data point because
both paths passed the same hidden product-quality probe after staged
recovery/RFC/debug work.

- Baseline: `12/12 PASS`, observer total `26.9158 min`.
- Harness: `12/12 PASS`, observer total `48.4984 min`.
- Result: same hidden quality, but Harness was about `1.8x` slower.

This is conclusion-grade evidence against claiming Harness is faster or more
efficient for this scenario.

## Evidence Check

This result should be read through
[`EVIDENCE_CHECKLIST.md`](../EVIDENCE_CHECKLIST.md):

- Publishable elapsed comparison: satisfied for same scenario, expected modes,
  formal protocol, hidden `12/12 PASS` quality and observer elapsed time.
- Cost boundary: warm delivery; Harness bootstrap/adoption should not be
  silently mixed into every future task cost.
- Current status: `negative_elapsed_signal`.
- Still missing for design-purpose proof: high-confidence automation burden,
  high-confidence gate net value, high-confidence context recovery advantage
  and high-risk provider/live boundary evidence.

## Gate Thinning Conclusion

This run supports a `Standard Thin` recommendation, not full gate deletion.

- Keep focused product gates and hidden probes inside the delivery loop.
- Move strict workflow gates to task completion, pre-commit, phase transition,
  release, and package/source-change boundaries.
- Keep strict gates for high-risk provider/live work and long-lived handoff.

Expected benefit: lower ordinary and mid-complexity workflow drag while keeping
the same-quality product bar. Expected loss: workflow-state drift, handoff gaps
or implementation-doc gaps may surface later, at boundary gates rather than
inside every loop. This is the highest-value tradeoff because it responds to the
`1.8x` negative elapsed-time signal without removing the quality and safety gates
that still protect product behavior and release/package boundaries.

## Diagnostic Evidence

- Context recovery: both paths scored `3/4` with hidden answer key plus file
  references. This is useful, but not high-confidence enough to prove a context
  recovery advantage.
- Gate value: Harness recorded `9` gate-caught defects, while Baseline recorded
  `0`. Because those findings were operator-recorded and escaped defects were
  not independently measured, this is diagnostic evidence for gate-thinning
  analysis, not proof of gate net value.
- Automation burden: out-of-protocol operator prompt count and prompt size were
  not recorded. Missing data must stay `unavailable`.

## Lifecycle Timing

| Phase | Baseline | Harness |
|---|---:|---:|
| Initial delivery | 11.16 min | 20.70 min |
| Fresh-agent recovery | 3.06 min | 3.58 min |
| RFC cascade | 9.89 min | 22.86 min |
| Debug fix | 2.78 min | 1.34 min |
| Lifecycle total | 26.89 min | 48.48 min |

## Raw Artifacts

Raw projects, observer logs and full JSON summaries stay outside git under:

- `.artifacts/delivery-benchmark/20260602-083512-support-gate-value-formal-pilot/baseline-summary.md`
- `.artifacts/delivery-benchmark/20260602-083512-support-gate-value-formal-pilot/harness-clean-summary.md`
