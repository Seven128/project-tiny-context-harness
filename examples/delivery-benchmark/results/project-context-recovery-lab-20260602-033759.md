# Delivery Benchmark Report: project-context-recovery-lab

This is a clean staged-injection lifecycle pilot, not calibration data. Baseline and Harness both received the same initial delivery prompt first; recovery, RFC and debug materials were injected only at their measured stages.

## Result

| Mode | Score | Observer total | Lifecycle total | Recovery | Wrong paths |
|---|---:|---:|---:|---:|---:|
| Baseline | 17/17 PASS | 14.0196 min | 12.26 min | 6/6 | 0 |
| Harness | 17/17 PASS | 21.0036 min | 19.16 min | 6/6 | 0 |

## Lifecycle Segments

| Segment | Baseline | Harness |
|---|---:|---:|
| Initial delivery | 5.72 min | 8.10 min |
| Fresh-agent recovery | 1.19 min | 2.29 min |
| RFC cascade | 4.26 min | 6.24 min |
| Debug fix | 1.09 min | 2.53 min |

## Interpretation

The pilot reached same-quality delivery, but it does not support a Harness efficiency claim. Baseline was faster overall and in every measured lifecycle segment.

The run is still useful evidence: staged injection, external observer measurement, lifecycle scoring, context recovery scoring and wrong-path recording all landed cleanly enough for public reporting. The context-continuity hypothesis remains open for harder or messier scenarios, but it was not demonstrated here.

## Metric Confidence

- Elapsed time: high confidence; totals came from the external observer.
- Quality score: low confidence as semantic proof; the 17/17 score came from the static keyword/path rubric before hidden quality probes were added.
- Context recovery: medium confidence; the 6/6 recovery score was operator-recorded from the visible checkpoint, not hidden answer-key scoring.
- Gate value and human intervention: unavailable; this pilot did not record first-pass hidden probe failures, defects caught by gates, escaped defects, repair loops or operator prompt counts.

## Caveats

- The Harness initial delivery timer was split after a CLI output stream interruption; the observer total is the stronger elapsed-time signal.
- Workflow-control minutes were not separately tagged in this pilot.
- The newly added hidden quality probe and recovery answer key do not retroactively upgrade this run's quality/recovery confidence.
- Raw generated projects and full observer logs stay outside git.
