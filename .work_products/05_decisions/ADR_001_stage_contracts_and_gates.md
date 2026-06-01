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

## Decision

AI SDLC Harness 固定一套阶段契约：每个阶段都有明确的输入、输出、Skill、gate 和下一阶段入口。Agent 在单阶段内部仍然以 vibe 方式执行；Harness 负责规定当前阶段、应读内容、应写产物、应使用 Skill、完成前必须通过的 gate，以及需求变更时如何局部修正链路。

阶段交付硬约束必须作为阶段完成和状态流转的判断依据。Agent 可以触发脚本、修复失败、记录结果，但不能绕过这些约束直接推进状态。

## Rationale

阶段性工作本身存在输入、执行和输出要求。需求阶段要澄清边界和验收标准，产品方案要固化用户场景和 Out of Scope，技术方案要确认架构、接口和任务拆分，开发阶段要落实实现、测试和实现记录，Review、测试、发布阶段要分别验证质量、覆盖风险和交付状态。

如果没有显式设置工作流程和工作阶段，这些要求很容易被压缩成对话里的隐含期待，导致阶段应有的输入缺失、执行步骤遗漏、输出产物不完整。偏差会沿着阶段向下游累积，直到测试阶段才被集中发现，随后转化为返工、修 bug、改需求或重切方案。

## Consequences

- 阶段切换必须通过 gate 和 transition helper，而不是手改 lifecycle 状态。
- Skill 负责提高单阶段 vibe 的产出效率；gate 负责保证阶段交付质量。
- 当前阶段的工作必须落到阶段产物、plan task、implementation doc、Review/Test/Release/RFC 文档或其它正式事实源。
- 复杂项目不能长期只靠“想到什么就让 Agent 写什么”的方式推进。

## Source Trace

- `PROJECT_SPEC.md#2.1`: 稍有复杂度的软件项目天然需要多阶段软件工程。
- `PROJECT_SPEC.md#2.3`: 单阶段主要依靠 vibe 推进，但阶段 Skill 与交付硬约束需要固定进工作流。
- `PROJECT_SPEC.md#3.1`: 总体思路。
- `PROJECT_SPEC.md#5.2`: 阶段契约。
- `PROJECT_SPEC.md#9.2`: 阶段 gate。

## Links

- [PROJECT_SPEC.md](../../PROJECT_SPEC.md)
- [phase_contracts.yaml](../../.codex/pjsdlc_managed/policies/phase_contracts.yaml)
