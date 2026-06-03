# ADR 001: Stage Contracts and Gates

Status: Accepted

## Context

软件工程阶段不是 Harness 额外发明出来的流程负担，而是任何软件项目中客观存在的工作内容。区别只在于复杂度低时，这些阶段会被自然压缩甚至隐式完成；当项目稍有复杂度后，需求澄清、产品边界、技术取舍、任务拆分、实现记录、Review、测试、发布和变更处理都会开始产生真实工作量。

如果仍然只依靠对话上下文和若干大文件保存项目上下文，Agent 很容易遇到上下文窗口不足、事实源不清、旧决策和新决策混杂、需求变化影响范围难判断、阶段交付标准缺失等问题。单纯 Vibe Coding 仍然适合单阶段内的生成和迭代，但不适合作为复杂项目的完整项目控制机制。

从阶段开始到阶段交付完成，不能只依赖 Agent 自我声明完成。为了保证产物质量，交付环节通常需要硬约束，例如 lint、typecheck、unit test、integration test、build、coverage、review checklist、release smoke test 等。

## Options

- 继续把需求、方案、开发、Review 和测试混成一段连续聊天。
- 只保留阶段名称和角色提示词，允许 Agent 自行判断何时完成。
- 把阶段目标、输入、输出、Skill、gate 和流转规则契约化。
- 保持厚 gate：在普通内部循环里频繁运行完整 workflow gate、phase gate 或 full regression。
- 只保留产品测试：移除大部分 workflow state、handoff、phase、release 和 package/source gate。
- Standard Thin：内部循环 focused product/domain gate + 轻量状态检查，strict workflow gate 集中到边界。

## Decision

AI SDLC Harness 固定一套阶段契约：每个阶段都有明确的输入、输出、Skill、gate 和下一阶段入口。Agent 在单阶段内部仍然以 vibe 方式执行；Harness 负责规定当前阶段、应读内容、应写产物、应使用 Skill、完成前必须通过的 gate，以及需求变更时如何局部修正链路。

阶段交付硬约束必须作为阶段完成和状态流转的判断依据。Agent 可以触发脚本、修复失败、记录结果，但不能绕过这些约束直接推进状态。

默认 gate 厚度采用 `Standard Thin`：普通开发、RFC 和 debug 内部循环运行当前变更面相关的 product/domain tests、smoke、self-test scenario 或 task `required_gates` 子集，并做必要轻量状态检查；strict workflow gate 集中到 task completion、pre-commit、阶段流转、release、package/source/managed asset 变更、public CLI / validator 变更和 high-risk provider/live 边界。

RFC 完成后的默认返回目标仍然是受影响的上游事实阶段：`REQUIREMENT_GATHERING`、`UI_UX_DESIGNING` 或 `ARCHITECTING`。但 localized implementation RFC 可以在 `make validate-rfc` 通过后用 `rfc_return_to_sprinting` 直接回 `SPRINTING`，前提是 PRD、UI/UX、tech plan、self-test contract 和 implementation facts 已按 RFC 局部更新，没有未决设计问题，不需要重新生成 `plan.draft.yaml`，下一步只是继续实现、回归或 debug 修复。纯实现偏差仍走 `bugfix_implementation_gap`。

## Rationale

阶段性工作本身存在输入、执行和输出要求。需求阶段要澄清边界和验收标准，产品方案要固化用户场景和 Out of Scope，技术方案要确认架构、接口和任务拆分，开发阶段要落实实现、测试和实现记录，Review、测试、发布阶段要分别验证质量、覆盖风险和交付状态。

如果没有显式设置工作流程和工作阶段，这些要求很容易被压缩成对话里的隐含期待，导致阶段应有的输入缺失、执行步骤遗漏、输出产物不完整。偏差会沿着阶段向下游累积，直到测试阶段才被集中发现，随后转化为返工、修 bug、改需求或重切方案。

Standard Thin 的设计原因来自 delivery benchmark 暴露出的成本信号：在中等复杂度、同等 hidden quality 的场景下，厚 gate 让 Harness 明显慢于 baseline。如果继续在每个内部循环频繁跑完整 workflow gate，普通任务的平均期望会先被流程成本拉低，Harness 的上下文和交接收益还没来得及体现就已经背上过重成本。

但把 gate 打到只剩产品测试也不成立。阶段状态、task 合同、implementation doc、handoff、phase transition、release 和 package/source 边界是 Harness 能减少遗漏、返工和上下文漂移的核心保护。如果全砍 workflow gate，短期会更快，但会损失新会话恢复、阶段边界、发布安全和 package managed assets 安全。`Standard Thin` 的折中是：产品质量验证保持 focused 且高频，workflow governance 在完成、提交、阶段、发布、package/source 和高风险边界严格执行。

这个策略的收益是降低普通开发、RFC 和 debug 的重复验证成本，让 Agent 把注意力放回当前产品行为；风险是 workflow state 问题可能更晚暴露、handoff 文档可能变薄、change surface 误判会漏跑 gate。因此 high-risk provider/live、长周期多人交接、release、package/source、public CLI / validator 变更仍保留 strict gate。如果后续高置信数据证明某类薄 gate 导致 escaped defect、repair loop 或恢复失败增加，应恢复该类 strict gate。

`rfc_return_to_sprinting` 的设计原因来自 provider-safety lifecycle pilot 暴露出的回流成本：RFC 已经完成局部实现和事实源更新后，后续 debug 仍被迫回到 `ARCHITECTING` 创建临时 architecture task、生成 draft task、再通过 phase gate 进入 `SPRINTING`。这段成本没有提升产品质量，也没有新增上下文价值，只是在局部补丁场景中重复证明“可以继续开发”。允许符合条件的 RFC 直接回 `SPRINTING`，保留 RFC impact analysis 和 `validate-rfc`，同时移除无必要的 draft queue 往返。它不适用于需求边界、UX contract、架构方案或任务拆分仍未闭合的 RFC。

## Consequences

- 阶段切换必须通过 gate 和 transition helper，而不是手改 lifecycle 状态。
- Skill 负责提高单阶段 vibe 的产出效率；gate 负责保证阶段交付质量。
- 当前阶段的工作必须落到阶段产物、plan task、implementation doc、Review/Test/Release/RFC 文档或其它正式事实源。
- 复杂项目不能长期只靠“想到什么就让 Agent 写什么”的方式推进。
- 普通内部循环默认不再重复运行 full regression、package source sync/check 或阶段出口 gate；这些 strict gate 后移到完成、提交、流转、发布、package/source 和高风险边界。
- `Standard Thin` 不是降低 Definition of Done：task 完成前仍要执行 `required_gates`，`/advance` 仍要执行 phase gate，release/package/source/high-risk 仍要 strict。
- Agent 需要更清楚判断 change surface；误判风险由边界 strict gate、高风险 strict gate 和后续 escaped-defect / repair-loop 数据复核来控制。
- Localized implementation RFC 可以用 `rfc_return_to_sprinting` 减少无意义的 ARCHITECTING / draft queue 往返；如果影响面判断错误，`validate-rfc`、task completion gate 和后续 product hidden probe / focused tests 必须能暴露问题。

## Source Trace

- `PROJECT_SPEC.md#2.1`: 稍有复杂度的软件项目天然需要多阶段软件工程。
- `PROJECT_SPEC.md#2.3`: 单阶段主要依靠 vibe 推进，但阶段 Skill 与交付硬约束需要固定进工作流。
- `PROJECT_SPEC.md#3.1`: 总体思路。
- `PROJECT_SPEC.md#5.2`: 阶段契约。
- `PROJECT_SPEC.md#9.2`: 阶段 gate。
- `examples/delivery-benchmark/GATE_THINNING_ANALYSIS.md`: `Standard Thin` gate thickness recommendation and evidence boundary.

## Links

- [PROJECT_SPEC.md](../../PROJECT_SPEC.md)
- [phase_contracts.yaml](../../.codex/pjsdlc_managed/policies/phase_contracts.yaml)
