---
name: context_product_plan
description: Use when the user explicitly asks for 产品方案, 产品经理, 产品专家, 需求方案, 功能方案, 业务规则方案, 用户故事方案, 验收标准方案, 产品规划方案, product plan, product manager, product expert, product spec, or PM spec in a Minimal Context Harness project. Do not trigger for ordinary coding, debugging, package work, or generic mentions of 产品, product, or requirements.
---

# Context Product Plan

## 目标

帮助 agent 把产品方案收敛成可恢复的 Minimal Context。

## 工作方式

1. 先读取 `project_context/global.md` 和 `project_context/context.toml`，按 default area、triggers、read_when 选择相关 context。
2. 和用户澄清或整理：目标用户、核心问题、主要流程、验收信号、非目标、约束、风险和受影响模块。
3. 输出产品判断时保持短而具体，避免长篇 PRD 模板。
4. 需要沉淀长期事实时，只更新 `project_context/**`：
   - 全局产品目标、边界、背景写入 `global.md`。
   - 模块级用户/系统契约、规则、风险写入对应 area / subdomain Context。
   - 跨域契约写入 `context_role: contract` 或 manifest role 为 `contract` 的 Context；底层理论源写入 `foundation`，历史索引写入 `archive`，不要伪装成 module。
   - 新 context unit 可新增 `project_context/areas/<unit>.md`，并更新 `global.md#Context Index`；复杂项目同时更新 `project_context/context.toml`。
   - 如果 `upgrade` 自动把深层 `.md` 注册成 area，但语义上更像 foundation / contract / archive，后续应显式调整 manifest role；不要依赖自动迁移判断语义。
5. Context 只能声明验证入口或验收信号，不能伪造“测试已通过”。

## 输出边界

- 不默认创建 `.work_products/**`、PRD、tech plan、ADR、implementation doc、review/test/release 文档。
- 不要求 lifecycle phase、plan task、phase gate 或阶段 Skill。
- 如果用户明确要求独立方案文档，可以临时生成；长期事实仍要提炼回 `project_context/**`。
- 如果用户只是要求实现功能、修 bug、调整代码、处理 package/release，或只是泛泛提到“产品 / product / requirements”，不需要触发本 Skill；只有明确角色名或强相关产物名指向产品判断、需求整理、验收口径或长期产品事实沉淀时才使用。

## 建议沉淀位置

- `global.md#Product / Delivery Brief`：项目级产品目标、用户、核心流程和非目标。
- `global.md#Design Rationale`：长期产品取舍。
- `areas/*.md#User / System Contract`：模块可见行为、API、CLI、UI 或数据契约。
- `areas/*.md#Key Constraints`：业务规则、边界、风险和不易从代码看出的约束。
- `project_context/context.toml`：复杂项目的 area/context_unit、role、触发词、按需读取策略和可选边界规则。
