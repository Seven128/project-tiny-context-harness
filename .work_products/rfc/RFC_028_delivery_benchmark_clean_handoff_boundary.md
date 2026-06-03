# RFC_028: Delivery benchmark clean handoff boundary

## 1. 背景

`webhook-provider-bridge` 的 2026-06-03 measured pilot 暴露出一个 benchmark
协议漏洞：baseline 初始交付可以通过本地测试，并且 fresh recovery agent 也能写出高分
takeover memo，但产品源码、测试和 README 仍停留在未提交的 dirty worktree 中。

这会破坏 benchmark 想验证的核心因果链：

```txt
stable delivered repository state
-> fresh agent recovers without chat history
-> recovery score represents context handoff quality
```

如果 recovery 读的是未提交草稿，它测到的是“当前文件还在工作区里”，不是“交付状态可被新会话稳定接手”。
Harness 路径已经天然要求 task implementation / completion ledger commit 和 push；baseline 路径也需要一个不带 Harness
语义的普通产品交付 commit/push，才能形成对称的清洁交接点。

## 2. 变更内容（Change Content）

- Added: baseline 初始 prompt 要求 `INITIAL_DELIVERY` 完成后创建一个普通 product delivery commit，并 push 到 run directory 的本地 `origin`。
- Added: mutating staged prompts（`RFC` / `DEBUG`）要求 baseline 在产品测试/smoke 通过后创建普通 product commit/push；Harness 使用正常 task commit/push。
- Added: baseline commit 不得提交 `.benchmark/**`，且不引入 Harness validator、lifecycle、plan 或 workflow skill。
- Added: RUNBOOK formal invalidation rule：任一路径在进入 `RECOVERY`、`RFC` 或 `DEBUG` 前仍有未提交 product source/docs/test changes，只能标为 calibration。
- Added: PRD / tech plan / implementation doc / ADR 明确 clean committed handoff boundary 是 formal lifecycle benchmark 的 P0 规则。
- Unchanged: benchmark runner command interface；`prepare` 已经提供独立 git repo 和本地 bare remote。
- Unchanged: npm package public CLI。

## 3. Product Impact（产品影响）

| 受影响 PRD（Affected PRD） | 影响（Impact） |
|---|---|
| `.work_products/01_product/delivery_benchmark_evidence_model.md` | Adds clean committed handoff as a publishable-result requirement. |

## 4. Technical Impact Candidates（技术影响候选）

| 模块（Module） | 影响（Impact） | 置信度（Confidence） |
|---|---|---|
| `examples/delivery-benchmark/prompts/baseline.md` | Adds ordinary product commit/push boundary for baseline. | high |
| `examples/delivery-benchmark/RUNBOOK.md` | Defines dirty worktree recovery invalidation and operator protocol. | high |
| `.work_products/03_tech_plan/delivery_benchmark_evidence_model.md` | Records causal logic and formal scoring flow boundary. | high |
| `.work_products/04_implementation/delivery_benchmark/evidence_model_and_runner.md` | Records calibration lesson and current implementation boundary. | high |
| `.work_products/05_decisions/ADR_008_delivery_benchmark_scenario_design.md` | Records the long-lived scenario design decision. | high |
| `tests/sdlc-harness/delivery-benchmark.test.mjs` | Static regression locks the baseline prompt and docs. | high |

## 5. Acceptance Criteria

- [x] Baseline initial prompt requires one normal product delivery commit and local `origin` push after product tests/smoke pass.
- [x] Baseline RFC/debug staged prompts require the same ordinary product commit/push boundary after mutating work.
- [x] Baseline prompt still forbids Harness validators, lifecycle files and benchmark self-logs.
- [x] RUNBOOK marks dirty product worktree recovery/RFC/debug as calibration-only.
- [x] Product, technical, implementation and ADR facts explain why recovery must start from clean committed state.
- [x] Tests assert the clean handoff boundary.

## 6. Regression Requirements（回归要求）

- [ ] Run `node --check examples/delivery-benchmark/runner/delivery_benchmark.mjs`.
- [ ] Run `node --check examples/delivery-benchmark/results/benchmark-data.js`.
- [ ] Run `node --test tests/sdlc-harness/delivery-benchmark.test.mjs`.
- [ ] Run `make work-products-overview`.
- [ ] Run `make validate-harness`.
- [ ] Run `make validate-test`.

## 7. Status

- Status: APPLIED
- Applied rationale: cost-effective protocol/documentation change. No runner or package CLI change is needed because `prepare` already initializes the run-dir git repo and local remote.
