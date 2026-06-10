# Benchmarking And Evidence

Project Tiny Context Harness should not be marketed as benchmark-proven faster yet.

The honest public claim is narrower:

```text
Minimal Context gives fresh coding-agent sessions a small repo-native recovery surface.
```

Benchmark work should test when that recovery surface pays for itself, not try to prove that every task is faster.

## Why Simple Benchmarks Are Hard

Coding-agent delivery benchmarks rarely have a clean single variable:

- model behavior changes between runs,
- tool latency and network state vary,
- prompts influence both speed and quality,
- tasks differ in how much project memory matters,
- recovery, RFC and debug turns often matter more than the first implementation turn,
- quality failures can make a fast run useless.

For this project, the tempting but wrong benchmark is:

```text
Run one task with Harness and one task without Harness, then compare elapsed time.
```

That can be useful as a smoke signal, but it is not enough for a public speedup claim.

## What A Useful Benchmark Should Measure

Measure the tradeoff:

```text
Context reading and maintenance cost
vs.
reduced rediscovery, fewer partial fixes and better recovery after a fresh chat.
```

A useful benchmark should include:

- the same product quality bar for baseline and Harness runs,
- fresh independent runs, not a reused chat history,
- a recovery checkpoint where a new agent must resume without prior conversation,
- RFC or debug turns when the scenario is meant to test iteration,
- hidden or operator-held quality probes,
- recorded operator interventions,
- clear handling of failed or incomplete runs,
- no conclusion if either path fails the same quality bar.

## What Counts As Evidence

Good evidence:

- a baseline/Harness pair that both pass the same tests or hidden quality probes,
- observer elapsed time with enough run metadata to reproduce the boundary,
- recovery-score evidence tied to file citations,
- repeated scenario results that show a pattern,
- adoption reports that describe concrete facts agents stopped rediscovering.

Weak evidence:

- one demo that felt faster,
- a run where Harness had more information than baseline,
- a run where baseline failed quality but Harness passed,
- a run where the operator intervened in one path but not the other,
- old stage-based SDLC results.

## How To Interpret Outcomes

Possible benchmark outcomes are all useful:

| Outcome | Interpretation |
|---|---|
| Baseline faster, same quality | Harness overhead did not pay back for that task. |
| Harness faster, same quality | Context recovery likely helped, but repeat before claiming a general win. |
| Same speed, Harness recovers better | Useful for multi-turn or team workflows even without speedup. |
| Harness slower, better recovery | May still be valuable for high-risk or frequently resumed projects. |
| Harness slower, no recovery gain | Scenario is outside the useful range or Context is too noisy. |

The target is the break-even curve: which task complexity, project size, handoff frequency and validation risk make Minimal Context worth maintaining.

## Current Public Boundary

Allowed:

```text
Recovery evidence is useful.
Fresh benchmark claims need new baseline and Minimal Context comparisons.
Historical stage-based results explain why the old heavier workflow was removed.
```

Avoid:

```text
Benchmark-proven faster.
2x faster.
Reduces engineering time by N%.
Old stage-based results prove the current Minimal Context package is faster.
```

## Current Benchmark Assets

The repo-local benchmark skeleton lives under:

```text
examples/delivery-benchmark/
```

Use:

- [examples/delivery-benchmark/RUNBOOK.md](../examples/delivery-benchmark/RUNBOOK.md) for the operator protocol,
- [examples/delivery-benchmark/results/README.md](../examples/delivery-benchmark/results/README.md) for the current reset status,
- [examples/delivery-benchmark/results/index.html](../examples/delivery-benchmark/results/index.html) for the static report shell.

Do not update public result summaries until a fresh baseline/Harness pair passes the current evidence rules.
