# ADR 008: Delivery Benchmark Scenario Design

Status: Accepted

## Context

AI SDLC Harness 的设计目标不是让首轮代码生成更快，而是在复杂项目中提高同等质量交付（same-quality delivery）效率：减少遗漏、返工、上下文漂移、需求变更漏改和交接恢复成本。

早期 `expense-policy-engine` 样本显示，Harness 可以达到同等质量，但历史记录成本明显更高，且成本数据置信度低。这不能直接证明 Harness 更高效，也不能证明它无效。更合理的问题是：当项目复杂度上升、需要多轮 RFC、debug 修复和新对话恢复时，Harness 沉淀的 PRD、UX、architecture、tech plan、implementation doc、review/test/release evidence 是否能减少后续理解和返工成本。

纯 vibe coding 在首轮实现中通常更敏捷，因为它直接面向代码和测试，不需要显性化阶段产物。Harness 的优势如果存在，更可能出现在生命周期后段：新 Agent 重新接手、需求变化影响多层、bug 修复依赖历史上下文、外部 provider / credential 边界存在安全风险。

## Options

- 只测首轮从需求到代码的完成时间。
- 只测最终质量分，不区分完成路径和生命周期成本。
- 选择覆盖恢复、RFC、debug 和高风险边界的 lifecycle benchmark，用同等质量交付作为比较基线。

## Decision

Delivery Benchmark 采用同等质量交付基线，不以首轮代码生成速度作为核心结论。每个 scenario 都必须能回答一个和 Harness 设计目标对应的问题：

- 是否能在同等质量下完成交付。
- 是否能在新对话或 fresh agent 接手时快速恢复当前状态、历史变更、测试入口和下一步安全动作。
- 是否能在 RFC cascade 中减少漏改、partial fix 和跨层漂移。
- 是否能在 debug 修复中保留最新上下文，避免重走错误路径。
- 是否能在 provider/live/credential 等高风险边界中减少 unsafe retry、secret guessing 和证据混淆。

当前 pending lifecycle scenarios 保留不同主证明方向：

- `project-context-recovery-lab`: 主测上下文连续性和 fresh-agent recovery。
- `support-triage-board`: 主测跨 UI/API/policy/test/docs 的 RFC/debug 效率。
- `webhook-provider-bridge`: 主测 provider/live 边界、安全约束和 do-not-retry 行为。

每个 lifecycle scenario 都采用 `INITIAL_DELIVERY`、`RECOVERY`、`RFC`、`DEBUG` 阶段指标，并记录 `context_recovery_score`、`wrong_path_count` 和最终质量分。外部 observer 只负责总耗时和文件活动可信度；语义阶段、wrong-path 和质量判断仍来自 lifecycle probe、rubric、diff、docs 和 operator scoring。

每个 lifecycle scenario 也要带 `gate_profile.md`。Gate profile 区分 orientation、domain focused gates、Harness task gates、phase exit gates 和 out-of-scope gates，尤其要标出 out-of-scope package regression。这样可以保持同等质量门槛，同时避免每个 fresh agent session 一开始就运行与当前 scenario 无关的 full Harness/package validation，制造错误的成本信号。

正式 lifecycle benchmark 必须使用 staged injection。`prepare` 生成的初始 prompt 只暴露 base requirements、acceptance criteria 和 gate profile；fresh-agent recovery、RFC cascade、debug fix 和 lifecycle scoring notes 只能在对应测量阶段由 operator 通过 `stage-prompt` 注入。后续 probe 或 debug 答案不能提前暴露给被测 agent，否则它可能在初始实现时按未来题目铺路，结果只能算 protocol calibration，不能进入公开效率结论。

Scenario 可以也应该是 high-signal：它们要对准 Harness 的设计目标，让上下文恢复、RFC/debug 返工控制、跨层一致性和高风险边界这些优势有被观察到的空间。这不是 hack 结果。正式 benchmark 必须允许 Harness 更慢、没有优势、或只在特定复杂度阈值后有优势；不能通过复用前序实现上下文、复制另一条路径成品、预先完成 RFC/debug、降低 baseline 质量标准或选择性发布有利数字来制造结论。

## Rationale

这组 benchmark 与 Harness 工作流设计一一对应：

- 阶段契约和 gate 的价值，应体现在 RFC/debug 后仍能维持同等质量，而不是只看首轮产码速度。
- `.work_products/**` 事实源、implementation doc、review/test/release evidence 的价值，应体现在 fresh-agent recovery 更快、更准确。
- RFC workflow 的价值，应体现在复杂变更后更少漏改和 partial fix。
- runbook、evidence boundary 和 do-not-retry 约束的价值，应体现在高风险 provider/live 场景中更少危险路径。

因此，benchmark 故意不选择只适合一次性实现的小 demo。场景应保持中高复杂度：足够触发上下文恢复、跨层变更和 debug 返工，但不能大到无法在可控时间内重复运行。

## Consequences

- 单个历史样本不能证明 Harness 更快或更高效；报告必须保守表达证据边界。
- 新结果必须同时包含 `baseline` 和 `harness`，并达到同一最终质量 rubric，才适合进入公开报告。
- 不干净的 pilot 只能作为 protocol calibration：可以用来验证 observer、timer、score、runbook 和报告链路，但数字不能作为效率证明发布。
- 若任一路径提前暴露 recovery/RFC/debug 后续材料，必须标为 calibration-only，因为它破坏了生命周期阶段边界。
- 若 Harness 在首轮更慢但在 recovery、RFC、debug 或 wrong-path 上追回成本，这才支持“生命周期效率提升”的判断。
- 若复杂 lifecycle scenarios 仍无法追回成本，应回到工作流设计本身，判断是项目复杂度不足、阶段产物过重、gate 成本过高，还是 Harness 目标假设不成立。
- Benchmark scenario 选择本身属于 Harness authoring evidence，不是 npm package public API。
- Gate 成本必须和产品实现时间分开解释。报告应区分 product verification gates 与 workflow-control gates；除非 package source 或 managed assets 发生变化，否则不应把 package source sync/check、workspace full regression 或 consumer-lab validation 算进 scenario delivery cost。

## Source Trace

- `PROJECT_SPEC.md#一最终目的`: 效率定义为复杂项目中的阶段目标、交付物、上下文衔接、需求变更和交付约束效率。
- `PROJECT_SPEC.md#2.1`: 单纯 Vibe Coding 适合单阶段生成，但不适合作为复杂项目完整控制机制。
- `PROJECT_SPEC.md#2.2`: 阶段产物和事实源用于降低切换成本与理解成本。
- `PROJECT_SPEC.md#3.2`: 阶段契约化、产物仓库化、变更补丁化和实现文档增量化。
- `examples/delivery-benchmark/README.md`: Delivery Benchmark scenarios, lifecycle efficiency probe and result policy.
- `examples/delivery-benchmark/RUNBOOK.md`: 首个 `project-context-recovery-lab` pilot 的 operator protocol。

## Links

- [PROJECT_SPEC.md](../../PROJECT_SPEC.md)
- [Delivery Benchmark README](../../examples/delivery-benchmark/README.md)
- [Delivery Benchmark Runbook](../../examples/delivery-benchmark/RUNBOOK.md)
- [ADR 001: Stage Contracts and Gates](ADR_001_stage_contracts_and_gates.md)
- [ADR 002: Fact Sources, Memory and Overviews](ADR_002_fact_sources_memory_and_overviews.md)
