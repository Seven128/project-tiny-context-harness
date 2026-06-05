---
name: context_development_engineer
description: Use when the user explicitly asks for 开发工程师, 软件工程师, 研发工程师, 开发专家, 工程专家, 技术专家, 开发方案, 研发方案, 工程方案, 技术方案, 实现, 实现方案, 实施计划, software engineer, senior engineer, engineering expert, development plan, engineering plan, or technical implementation plan in a Minimal Context Harness project. Do not trigger for routine coding, bug fixes, small refactors, package/release work, or generic mentions of code, development, or engineering.
---

# Context Development Engineer

## 目标

帮助 agent 以开发工程师 / 技术专家视角完成实现判断，并把长期工程事实压缩进可恢复的 Minimal Context。

## 工作方式

1. 先读取 `project_context/global.md`、`project_context/architecture.md` 和 `project_context/context.toml`，按 default area、triggers、read_when 选择相关 context。
2. 启动多 agent 能力：在支持多 agent 的环境中，如果本 Skill 已触发且任务可拆成互不冲突的工作范围，使用多 agent 并行处理探索、实现或验证；每个 agent 负责清晰且不重叠的文件或问题范围。不支持多 agent 的环境可忽略本条并正常执行。
3. 先确认用户目标、约束、成功标准、影响模块、现有测试入口和风险；能从代码或 Context 发现的事实不要反复询问用户。
4. 实现时保持精准修改，优先遵循仓库现有框架、接口、测试和代码风格。
5. 需要沉淀长期事实时，只更新 `project_context/**`：
   - 全局工程取舍、验证入口或当前状态写入 `global.md`。
   - 模块级 API、数据契约、关键约束、入口和风险写入对应 area / subdomain Context。
   - 跨域接口语义写入 `context_role: contract` 或 manifest role 为 `contract` 的 Context；代码入口索引用 `implementation-index`；底层理论源用 `foundation`；历史归档索引用 `archive`。
   - 新 context unit 可新增 `project_context/areas/<unit>.md`，并更新 `global.md#Context Index`；复杂项目同时更新 `project_context/context.toml`。
   - 如果 `upgrade` 自动把深层 `.md` 注册成 area，但语义上更像 foundation / contract / archive，后续应显式调整 manifest role；不要依赖自动迁移判断语义。
6. Context 只能声明验证入口或验收信号，不能伪造“测试已通过”。

## 输出边界

- 不默认创建 `.work_products/**`、tech plan、ADR、implementation doc、review/test/release 文档。
- 不要求 lifecycle phase、plan task、phase gate 或阶段 Skill。
- 如果用户明确要求独立开发方案、技术方案或实现说明，可以临时生成；长期事实仍要提炼回 `project_context/**`。
- 如果用户只是要求普通代码修改、修 bug、小重构、package/release 处理，或只是泛泛提到“代码 / 开发 / engineering”，不需要触发本 Skill；只有明确角色名或强相关产物名指向工程方案、实现方案、实施计划、技术判断或长期工程事实沉淀时才使用。

## 建议沉淀位置

- `global.md#Design Rationale`：跨模块工程取舍。
- `global.md#Verification Entry Points`：项目级验证入口；只记录入口，不记录未执行结果。
- `global.md#Current State`：影响后续恢复的实现状态。
- `areas/*.md#User / System Contract`：模块可见行为、API、CLI、UI 或数据契约。
- `areas/*.md#Core Data / API / State`：关键数据结构、接口、状态流或规则。
- `areas/*.md#Key Constraints`：性能、安全、兼容、集成、部署或维护约束。
- `areas/*.md#Code Entry Points`：未来 agent 需要快速定位的代码入口。
- `areas/*.md#Test Entry Points`：模块级测试、smoke 或检查命令。
- `project_context/context.toml`：复杂项目的 area/context_unit、role、触发词、按需读取策略和可选边界规则。
