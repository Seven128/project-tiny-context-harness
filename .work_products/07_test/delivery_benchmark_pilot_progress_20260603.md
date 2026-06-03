# Delivery Benchmark Pilot Progress Snapshot 2026-06-03

## 1. Purpose

本文件保存当前“跑工作流 benchmark，直到完成”目标在暂停时的进度现场、数据置信度、经验和阶段性结论。

这不是公开 benchmark 结果页的数据源，也不是发布用 summary。正式结果仍必须来自 clean、fresh、independent、same-quality 的 baseline / Harness 成对 run，并通过 `evidence-check`。

## 2. Pause Boundary

- Pause request: 用户要求先暂停并保存当前目标现场。
- Active artifact root: `.artifacts/delivery-benchmark/20260602-195213-webhook-warm-optimized/`
- Scenario: `webhook-provider-bridge`
- Mode under measurement at pause: `harness`
- Protocol status: `diagnostic_incomplete`
- Public-result eligibility: no. The current Harness run stopped during `RFC`; it has no final RFC/debug hidden quality score and must not be used as a published efficiency conclusion.

The active RFC segment was stopped by the operator:

| Segment | Source | Minutes | Status |
|---|---|---:|---|
| `INITIAL_DELIVERY` | system timer | 22.0574 | complete |
| `RECOVERY` | system timer | 3.2276 | complete |
| `RFC` | system timer | 11.1315 | paused before completion |
| Cumulative observer elapsed at pause | external observer | 36.4389 | stopped |

Raw pause evidence:

- `.artifacts/delivery-benchmark/20260602-195213-webhook-warm-optimized/harness/.benchmark/events.ndjson`
- `.artifacts/delivery-benchmark/20260602-195213-webhook-warm-optimized/harness/.benchmark/observations.ndjson`
- `.artifacts/delivery-benchmark/20260602-195213-webhook-warm-optimized/harness/.benchmark/observer-state.json`

## 3. Current Harness Run State

### Initial Delivery

- Warm Harness scaffold was present before measured delivery. The prompt explicitly said not to run `npx sdlc-harness init`.
- Product implementation reached hidden initial quality `13/13 PASS`.
- Hidden quality confidence: high.
- Product delivery commits in the run-dir local repo:
  - `74b0bbf TASK-004: implement webhook provider bridge`
  - `0499dd5 TASK-004: complete sprint task ledger`
- Important scoring fix: `QP-WEBHOOK-011` initially exposed a hidden probe issue, not a product issue. The probe was fixed to treat `passed: true` as accepted and to run mock-provider smoke on a fresh bridge instance so previous negative audit entries cannot contaminate the smoke result.

### Fresh-Agent Recovery

- Recovery prompt was injected through staged prompt.
- Recovery answer file: `.benchmark/takeover-answer.md`
- Recovery score: `4/4 PASS`
- Recovery confidence: medium-high, because it uses a hidden answer key plus file references but still scores a natural-language takeover memo.
- No product source/test/work-product files were changed during recovery.

### RFC Cascade

- RFC staged prompt was injected and measurement began.
- The measured agent entered `RFC_RECALIBRATION`, created `TASK-005`, and started implementing schema v2, tenant secret rotation and replay-protection changes.
- The RFC stage was paused before final gates, commit/push closure, final hidden quality probe or debug stage.
- Run-dir dirty state at pause included `.codex/state/**`, `.work_products/**`, `README.md`, `src/webhookBridge.js`, `tests/webhookBridge.test.js` and `.work_products/rfc/webhook-provider-schema-v2-rotation-replay.md`.
- Run-dir diff at pause: 13 files changed, 457 insertions, 145 deletions.

This RFC work can be used as calibration evidence about workflow friction, but not as a formal lifecycle result.

## 4. Baseline Reference Data

The current warm-optimized artifact copied the prior formal baseline summary for comparison:

- Source summary: `.artifacts/delivery-benchmark/20260602-195213-webhook-warm-optimized/baseline-summary.json`
- Baseline observer total: `27.7418 min`
- Baseline lifecycle minutes: initial `8.40`, recovery `2.25`, RFC `9.00`, debug `3.57`
- Baseline final hidden quality: `19/19 PASS`
- Baseline recovery: `4/4 PASS`

Because the current Harness run is paused and not a completed pair, the baseline numbers are diagnostic context only here.

## 5. Data Confidence

| Data | Confidence | Why |
|---|---|---|
| Observer elapsed time | high | External observer measured the run directory without asking the measured agent to self-report time. |
| System-timed stage minutes | medium-high | Clock duration is system-measured, but start/stop boundaries are still operator-defined. |
| Hidden product quality probe | high for probed behavior | The probe executes deterministic product behavior and tests; after the `QP-WEBHOOK-011` fix, the mock smoke no longer depends on polluted prior state. |
| Recovery score | medium-high | Hidden answer key and file references reduce subjectivity, but natural-language memo scoring is not fully objective. |
| Gate friction observations | diagnostic | They come from logs and operator interpretation; useful for workflow iteration but not conclusion-grade by themselves. |
| Current RFC partial changes | not conclusion-grade | The stage was paused before quality gates and final scoring. |

## 6. Lessons Preserved

- Warm bootstrap must stay outside the measured delivery window. Otherwise the benchmark measures package adoption cost, not scenario delivery cost.
- Hidden probes are part of the benchmark product and need their own regression tests. A buggy probe can make a correct product look worse; probe fixes must apply uniformly to both modes.
- Harness currently preserves strong handoff/recovery context in this scenario, but it still spends significant time reading and maintaining workflow facts.
- The visible cost drivers are not only coding: work-product generation, overview refreshes, task contract shape validation, self-test evidence formatting and validator strictness all consume time.
- RFC task creation showed repeated field/shape friction (`status`, `summary`, `work_products`). This is a high-ROI candidate for a small task/RFC skeleton generator or stricter template helper.
- `Standard Thin` is directionally right: internal loops should use focused product gates and light state checks, while strict gates remain at task completion, commit/push, phase transition, release, package/source changes and high-risk provider/live boundaries.
- Scenario design should remain high-signal but honest. The next step is to reduce known workflow friction and then rerun; not to search for a scenario that hides ordinary-task negative elapsed signals.
- Artifact volume must be interpreted by category. Harness-managed runtime and `.work_products` facts explain context cost, but line count alone does not prove value.

## 7. Stage Conclusions

Current conclusion-grade facts:

- Harness initial delivery reached hidden initial quality `13/13 PASS`.
- Fresh-agent recovery reached `4/4 PASS` with medium-high confidence.
- The elapsed-time data up to pause is credible for diagnosis.

Current conclusions that are not allowed:

- Do not claim the current warm Harness lifecycle is faster or slower than baseline as a formal result; the pair is incomplete.
- Do not claim RFC/debug quality after the paused stage.
- Do not claim gate net value from this paused run.
- Do not publish the current artifact into `examples/delivery-benchmark/results/benchmark-data.js`.

Diagnostic conclusion:

- Even after excluding warm bootstrap, Harness initial delivery remained materially slower than the prior baseline initial reference. Before trying to prove an advantage with more favorable scenarios, workflow iteration should first target known friction that does not add product quality or context value.

## 8. Resume Options

If this artifact is resumed:

1. Treat it as calibration unless the pause boundary is explicitly accepted as part of the protocol.
2. Finish RFC implementation, run `npm test`, focused scenario hidden quality probe, mode-appropriate commit/push closure and `score`.
3. Inject `DEBUG` only after RFC quality is recorded.
4. Run final hidden quality, recovery if needed, `score` and `evidence-check`.

For a formal public result:

1. Fresh-rerun the Harness path from a clean warm scaffold.
2. Keep the baseline path paired under the same scenario, model/config and staged protocol.
3. Publish only if both paths reach same hidden final quality and `evidence-check` marks the pair publishable.

## 9. Next Workflow Improvement Candidates

- Add a small RFC/task skeleton helper for common `plan.yaml` task shapes, or make the RFC Skill produce a minimal valid task contract before validation.
- Add clearer examples for self-test evidence formatting so validators do not become trial-and-error cost.
- Continue applying `Standard Thin` inside measured loops; only run strict workflow gates at the documented boundaries.
- Consider a compact benchmark work-product profile that preserves recovery-critical facts without forcing full PRD/UX/architecture breadth for every API-only scenario.
- Keep hidden probes and evidence-check tests close to the runner so scoring bugs are caught before measured runs.
