# Test Suite ROI Redesign

Status: **Implemented — initial rollout**
Implementation status: **Routing, Trust Gate, CI split, timing, tests, and Context are active**
Owning area: `harness-package`
Context entry: `project_context/areas/harness-package/verification.md`

The initial rollout was implemented on 2026-07-20. It changes package-development and CI test routing, but it does not weaken release coverage or change Long-Task acceptance: `main`, publish, and release still run the complete package suite, and only the source-recompiled Long-Task Final Gate can create machine acceptance.

## Current Implementation

- `tools/test_suite_policy.mjs` is the canonical executable list for focused and Trust Boundary coverage.
- `tools/affected_change_discovery.mjs` separates explicit paths, dirty local work, clean local commits, explicit bases, and CI bases; dirty local work is never unioned with an inferred historical branch diff.
- `npm run test:long-task:trust` builds once and runs the canonical Long-Task Trust Boundary Gate; package-level `test:trust:built` runs the complete default suite plus that gate for PR CI.
- `npm test` remains the complete default plus complete Long-Task release regression used by `main` and publish.
- Every package-suite run emits `test-suite-timing-v1`; Package CI uploads the JSON files as 14-day diagnostic artifacts. They are never acceptance state.
- Two fresh Windows Trust Gate runs passed 32 tests across 9 files in 205.681 and 207.986 seconds after a current build. The complete default tier passed 173 tests across 41 files in 113.199 seconds, so the measured PR-equivalent default-plus-Trust path is approximately 321.185 seconds (5 minutes 21 seconds) without another build. These are rollout observations, not yet a multi-sample median or p95 claim.
- Coverage deletion, stateful parallelism, and the 20-change/30-day ROI review remain deliberately deferred until timing and mutation evidence justify them.

## Retrieval Index

| Key | Topic |
| --- | --- |
| `TS-PURPOSE` | Unique purpose of each test tier and the core decision |
| `TS-BASELINE` | Current inventory, observed cost, and why the cost is occurring |
| `TS-TIER-DEV` | Task-local affected and focused feedback |
| `TS-TIER-TRUST` | Middle-cost Trust Boundary Gate |
| `TS-TIER-RELEASE` | Complete package release regression |
| `TS-ROUTING` | Local/CI change discovery and fail-safe selection |
| `TS-RERUN` | Repair-loop and full-suite rerun policy |
| `TS-RELEASE-HANDOFF` | One-test/one-pack release artifact handoff and retry boundary |
| `TS-OPTIMIZE` | Safe runtime optimization rules |
| `TS-MIGRATION` | Phased implementation and affected files |
| `TS-METRICS` | ROI measurements and review thresholds |
| `TS-AC` | Acceptance criteria and rollback |
| `TS-NONGOALS` | Explicit safety boundaries |

## `TS-PURPOSE` — Decision

The complete package suite has one unique job: certify the package's aggregate false-completion, workflow-boundary, compatibility, and distribution regressions on a final source snapshot. It is a release regression gate, not an edit/fix feedback loop, and it never becomes Long-Task acceptance evidence.

The implementation keeps that complete coverage while separating three different jobs:

| Tier | Unique question it answers | Result authority |
| --- | --- | --- |
| Developer feedback | Did this task-local change break the code paths most likely to be affected? | Non-authoritative selection aid |
| Trust Boundary Gate | Did the final candidate break a high-impact false-completion or cross-module trust boundary? | Package handoff/PR regression evidence only |
| Complete release regression | Does the complete supported package suite pass on the final release candidate? | Package CI/release evidence only |

The core change is therefore not “delete slow tests.” It is:

1. keep all current cases in the release tier initially;
2. add the missing middle Trust Boundary Gate;
3. stop using the complete suite after every small repair;
4. fix affected-test discovery so local work is not widened by unrelated historical branch changes;
5. optimize or deduplicate only after fresh timing and invariant-overlap evidence exists.

## `TS-BASELINE` — Motivating Observation

The current Long-Task runner discovers every `long-task-*.test.mjs` file, sorts them, and runs them with `--test-concurrency=1`.

Current inventory observed on 2026-07-20:

- 58 Long-Task test files and 264 executed test cases;
- approximately 369 CLI success/failure invocations and 161 delivery-fixture creations by static call-site scan;
- 47 files exercise integration-like process, fixture, Git, Hook, or workflow behavior; only a minority are purely static checks;
- two recent complete runs took 629.4 seconds and 770.5 seconds; four complete invocations therefore consumed roughly 47 minutes in the motivating task.

Those timings are task observations, not a formal benchmark. A fresh controlled baseline is required before making a performance claim.

The four-run sequence also shows the ROI problem:

1. the first complete run found generated-copy parity and performance/flaky issues;
2. the second found an unintended `.codex/hooks.json` side effect;
3. the third passed after the implementation and modularity repair;
4. the fourth passed after a late conservative documentation/summary correction.

The first two classes should usually be intercepted by cheaper parity, idempotence, side-effect, and targeted checks. Only the frozen final candidate normally needs the expensive complete release proof.

A second cost source was affected-test discovery. The old implementation merged working-tree changes with an inferred base revision diff, so a long-lived workspace could widen a small current task to `full-suite` because older package, dependency, workflow, or documentation changes remained in the branch comparison. `affected-test-plan-v2` fixes that defect and reports the exact discovery source in every plan.

## `TS-TIER-DEV` — Developer Feedback

Purpose: fast defect localization during implementation and repair.

Implemented behavior:

- use explicit task-local paths when the caller knows them;
- otherwise, in a dirty local workspace, select only from the current working-tree diff plus untracked files;
- build at most once per invocation and allow `--no-build` only for the same source snapshot;
- run mapped focused tests for known hot spots;
- fail safe to the Trust Boundary Gate for unmapped Long-Task runtime changes while retaining affected tests not contained by that gate;
- remain explicitly non-authoritative.

Provisional budget after a current build:

- median at or below 90 seconds;
- p95 at or below 3 minutes.

These are target budgets to validate during migration, not current measured claims.

## `TS-TIER-TRUST` — Trust Boundary Gate

Purpose: provide one bounded, high-signal gate between task-local repair and the complete release suite.

The gate should contain one canonical end-to-end proof for each independent high-impact invariant family, while leaving detailed permutations and platform/distribution breadth in affected or release coverage:

- active authority continuity, lock identity, and compare-and-swap races;
- exact authority-revision classification, approval binding, and stateless diagnosis;
- forged, stale, or mismatched Receipt/cache/evidence rejection;
- Source, Context, verifier, and current-snapshot freshness;
- Final Gate, Stop, and close live-gate behavior, including post-gate drift;
- Hook/profile/package parity and one consumer workflow smoke where they cross a trust boundary;
- the platform boundary: no Harness-owned model routing, orchestration, branch, worktree, or agent authority.

The canonical first-rollout files are `long-task-active-authority-continuity`, `long-task-authority-adversarial`, `long-task-authority-revision-classification`, `long-task-authority-revision-diagnosis`, `long-task-context-evolution`, `long-task-final-closure-mutation-smoke`, `long-task-profile-hook`, `long-task-qualified-completion`, and `long-task-workflow-black-box`. The list lives once in `tools/test_suite_policy.mjs` and is exercised by both the runner and selection tests.

Trigger:

- once after implementation, Context, generated surfaces, and review are complete and the candidate diff is frozen;
- before handoff or PR for Long-Task runtime, authority, evidence, Hook, profile, or package-boundary changes;
- after a Trust Gate failure, only after all known failures have been repaired and focused checks pass.

Provisional budget:

- median at or below 6 minutes;
- p95 at or below 8 minutes.

This gate is package regression evidence. It cannot accept a Delivery Contract and cannot replace its source-recompiled Final Gate.

## `TS-TIER-RELEASE` — Complete Release Regression

Purpose: exercise the full supported package regression surface on one final candidate.

Initial policy:

- retain all current 58 files and 264 cases;
- keep the complete suite in `main` Package CI, publish, and release flows while pull requests run complete default plus Trust Boundary coverage;
- select it locally for shared package/dependency changes, unknown broad changes, or an explicit release rehearsal;
- retain the current under-15-minute ceiling until fresh baselines justify a tighter budget;
- pursue an under-10-minute target only through proven isolation, fixture reuse, or safe parallelism—not by silently dropping invariant coverage.

The complete suite is still not product acceptance, deployment proof, or reusable Long-Task completion evidence.

## `TS-ROUTING` — Change Discovery and Selection

The selection source must be explicit and environment-specific:

| Invocation | Default change source |
| --- | --- |
| Local, dirty workspace | `HEAD` working-tree diff plus untracked files only |
| Local, clean workspace | explicit `--base`, otherwise a documented single-commit fallback such as `HEAD^` |
| Pull-request CI | merge-base against the supplied CI base revision |
| Explicit task scope | `--path` values; do not add inferred historical paths |
| Explicit comparison | `--base`; use exactly that comparison plus documented working-tree behavior |

The local default must not union an historical branch-base diff into a non-empty working set. CI must not infer its base from whichever local ref happens to exist.

Fail-safe widening remains required:

| Change class | Minimum target tier |
| --- | --- |
| Known isolated implementation hot spot | Mapped developer tests |
| Contract/Context/guidance-only change | Relevant static, parity, and Context gates |
| Unmapped Long-Task runtime or authority change | Trust Boundary Gate or complete Long-Task suite |
| Shared package entry point, dependency, build, or unknown package change | Complete release regression |
| Release/publish workflow change | Complete release regression plus pack/release gates |

The canonical executable mapping is `tools/test_suite_policy.mjs`, shared by the planner and runner. It is static source configuration, not a mutable registry, persisted task-test state, or cached acceptance result.

## `TS-RERUN` — Rerun Policy

Run cheap, diagnostic gates before expensive aggregate gates:

1. format/type checks and one current build;
2. affected/focused tests;
3. generated-source parity, sync idempotence, unexpected-side-effect checks, Context validation, and `git diff --check`;
4. review the complete diff and freeze the candidate;
5. run the Trust Boundary Gate once when selected;
6. run the complete release suite once when routing or release policy requires it.

When an aggregate gate fails:

1. collect and classify every failure from that invocation;
2. distinguish a verification-snapshot failure from a proven local environment-only failure;
3. repair the known causes as one batch;
4. rerun only the failed tests plus affected/Trust coverage until they pass;
5. rerun the failed aggregate gate once on the newly frozen snapshot when tracked source, tests, configuration, shared fixtures or runners changed, cross-suite contamination is plausible, or that invocation owns the required final validation claim.

Skipping a repeated *local* complete suite is safe only when all of these conditions hold:

- the failure is attributable to ignored/untracked local state or external infrastructure rather than product or test semantics;
- tracked source, tests, configuration, shared fixtures and runners are unchanged from the failed aggregate snapshot;
- the failed test and selected affected/Trust repair coverage pass after the environment is restored; and
- a guaranteed downstream `main` or release route will run the complete suite and its green result remains required.

In that case, report the local aggregate as failed and defer the single clean complete pass to the downstream gate. Never splice partial reruns into a claim that the local complete suite passed. If no such downstream gate exists, or the local invocation itself owns the final validation claim, the complete aggregate must pass after repair.

Local complete-suite budget per task:

- zero invocations in the ordinary edit/fix loop;
- at most one planned final invocation after diff freeze when routing requires it;
- one additional invocation after an actionable aggregate failure and batched repair only when the local run still owns the required clean aggregate or the safe deferral conditions above are not all met;
- a third or later invocation requires a recorded reason such as a confirmed flaky/infrastructure investigation or a release-blocking late mutation.

A source change after a green aggregate gate invalidates that result, but the rerun tier should match the change. A documentation-only correction should rerun its static/Context gates; it should not automatically trigger the complete suite unless package or release policy maps it there.

## `TS-RELEASE-HANDOFF` — One Verified Artifact

Trusted Publishing uses a two-job graph inside one workflow run:

1. `prepare` runs the complete package suite once, then packs once and runs exact-tarball smoke once;
2. it uploads the tarball plus a runtime attestation bound to the dispatch commit, stable lockfile identity and tarball SHA-256;
3. after the protected environment gate, `publish` downloads and verifies those exact bytes;
4. `publish` does not install dependencies, build, test, repack or repeat smoke;
5. a retry may skip npm publication only when the registry version and integrity already match the prepared artifact exactly.

`dry_run: true` executes only step 1 and artifact upload as an optional diagnostic. It is not required before `dry_run: false`, because a real run already performs the same prepare gate before publication. Node/npm versions are recorded as provenance but are not equality gates for the non-building publisher job. Lockfile hashing normalizes CRLF/LF only, so cross-worktree line endings do not cause false drift while semantic changes still block.

## `TS-OPTIMIZE` — Safe Runtime Reduction

Optimization must preserve independent false-completion interception.

1. Establish a fresh baseline with separate cold-build and test-only timing, at least five clean samples per supported benchmark environment, and per-file durations stored only as ephemeral CI artifacts.
2. Classify test files by isolation: pure/static, isolated temporary repository, shared process/environment, Hook/profile mutation, or distribution/consumer smoke.
3. Parallelize only proven-isolated groups. Keep real Git races, shared Hook/profile state, process-environment mutation, and distribution flows serial until isolation tests prove otherwise.
4. Move combinatorial parser/classifier cases in-process where they do not need a CLI boundary. Retain at least one real CLI lifecycle per cross-boundary invariant.
5. Reuse setup only inside a sequential scenario whose state transitions are themselves under test. Do not share mutable fixtures merely to save time.
6. Remove or merge a case only when an invariant-coverage comparison and mutation sentinel prove that another case intercepts the same failure path.

## `TS-MIGRATION` — Phased Implementation

### Phase 0 — Measure and Freeze Semantics (started)

- capture fresh Windows and macOS cold-build/test-only baselines;
- emit per-file timing as an ephemeral report;
- map every existing case to an invariant family and tier candidate;
- add mutation sentinels for high-risk trust boundaries before changing selection.

The fresh Windows default and two Trust Gate measurements are recorded above. Multi-sample Windows and macOS baselines remain a post-rollout measurement task; no median or p95 claim is made from these rollout samples.

### Phase 1 — Correct Routing (implemented)

- separate local dirty, local clean, CI merge-base, explicit `--base`, and explicit `--path` discovery;
- add selector tests for each source and every fail-safe widening path;
- keep existing full-suite behavior available as the rollback path.

### Phase 2 — Add the Trust Boundary Gate (implemented)

- add one canonical static selection source shared by the test runner and affected planner;
- add `test:long-task:trust` entry points at root and package level;
- update workflow entry-point tests and CI routing without removing the full release gate;
- prove the gate against the trust-boundary mutation sentinels.

### Phase 3 — Enforce Rerun Order (implemented as fail-safe routing and guidance)

- add cheap parity/idempotence/side-effect checks before aggregate suites;
- document the diff-freeze and batched-repair policy in contributor verification guidance;
- report the selected tier and selection reason in command output.

### Phase 4 — Optimize Runtime (timing active; structural optimization deferred)

- parallelize only isolated groups;
- reduce redundant process and fixture setup while preserving real boundary tests;
- compare every change against the Phase 0 baseline and mutation sentinels.

### Phase 5 — Review Coverage Overlap (post-rollout)

- consider deduplication only after at least 20 representative package changes or 30 days of CI data;
- retain a case when it is the only sentinel for an independent failure path, even if its recent failure yield is zero;
- tighten the full-suite budget only after the supported environments meet it consistently.

Expected implementation touch points:

- `tests/ty-context/run-package-suite.mjs`;
- `tools/run_affected_tests.mjs` and `tools/affected_test_selection.mjs`;
- root and package `package.json` scripts;
- `tests/ty-context/affected-test-selection.test.mjs` and workflow entry-point tests;
- package/publish workflows where the new gate is routed;
- Harness verification Context after behavior is implemented.

## `TS-METRICS` — ROI Review

Measure the workflow, not just one command:

- median and p95 wall time by tier, with build time reported separately;
- developer minutes from last source change to the final green candidate;
- number of complete-suite invocations per task;
- actionable-failure yield by tier;
- failures first found by the release tier that should have been caught by the Trust Gate;
- mutation-sentinel escape count, which must remain zero;
- flaky rerun rate and infrastructure-failure rate.

Initial success thresholds after 20 representative changes or 30 days:

- median local complete-suite invocations at or below one per task;
- at least 60% reduction in local complete-suite minutes versus comparable pre-change tasks;
- Trust Gate p95 at or below 8 minutes;
- zero trust-boundary mutation escapes;
- `main` Package CI and publish continue to run the complete release suite.

Timing reports are diagnostics, not Context, workflow state, Receipts, or acceptance authority.

## `TS-AC` — Acceptance and Rollback

The initial deployable rollout is complete. Long-term ROI closure still requires the multi-sample budget and review-window evidence described in `TS-METRICS`. The safety acceptance criteria are:

1. every test command has one documented purpose and authority boundary;
2. all current 264 cases remain reachable from the complete release suite during initial migration;
3. local dirty discovery is not widened by unrelated historical branch changes;
4. selector tests cover dirty-local, clean-local, CI, explicit-path, explicit-base, and unknown fail-safe cases;
5. Trust Gate mutation sentinels cover forged evidence, stale Source/Context, wrong revision approval, diagnosis mutation, compare-and-swap races, and post-gate drift;
6. `main` Package CI and publish retain the complete suite, while pull requests retain complete default plus Trust Boundary coverage;
7. the provisional tier budgets are confirmed by fresh supported-environment measurements or revised explicitly from evidence;
8. one invocation builds at most once and `--no-build` cannot be presented as safe across different source snapshots;
9. no result cache, persisted selection state, second authority, or test runner outcome is accepted as Delivery Contract proof;
10. the current full runner remains callable as a rollback until the new routing has completed its review period.

Rollback is mechanical: route package and CI scripts back to the current complete runner. No Contract, runtime state, Receipt, or migration data is required to reverse the test-tier selection.

## `TS-NONGOALS` — Safety Boundaries

This redesign does not:

- weaken or replace the Long-Task Final Gate;
- treat the Trust Gate or complete package suite as product acceptance;
- cache a test result for later authority;
- remove release coverage solely because it is slow;
- parallelize stateful tests without isolation proof;
- claim a formal benchmark from the motivating task's two timings;
- add a runtime workflow registry, scheduler, Receipt, or persistent task-test state;
- change current verification requirements before implementation and conformance are complete.
