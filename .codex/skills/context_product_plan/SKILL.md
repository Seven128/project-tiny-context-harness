---
name: context_product_plan
description: Use when the user asks for 产品方案, 产品经理, 需求方案, 产品规划, product plan, product manager, PM, requirements shaping, or product-facing delivery planning in a Minimal Context Harness project.
---

# Context Product Plan

## 目标

帮助 agent 把产品方案收敛成可恢复的 Minimal Context。

## 工作方式

1. 先读取 `project_context/global.md` 和相关 `project_context/modules/*.md`。
2. 和用户澄清或整理：目标用户、核心问题、主要流程、验收信号、非目标、约束、风险和受影响模块。
3. 输出产品判断时保持短而具体，避免长篇 PRD 模板。
4. 需要沉淀长期事实时，只更新 `project_context/**`：
   - 全局产品目标、边界、背景写入 `global.md`。
   - 模块级用户/系统契约、规则、风险写入对应 module Context。
   - 新模块可新增 `project_context/modules/<module>.md`，并更新 `global.md#Module Index`。
5. Context 只能声明验证入口或验收信号，不能伪造“测试已通过”。

## 输出边界

- 不默认创建 `.work_products/**`、PRD、tech plan、ADR、implementation doc、review/test/release 文档。
- 不要求 lifecycle phase、plan task、phase gate 或阶段 Skill。
- 如果用户明确要求独立方案文档，可以临时生成；长期事实仍要提炼回 `project_context/**`。

## 建议沉淀位置

- `global.md#Product / Delivery Brief`：项目级产品目标、用户、核心流程和非目标。
- `global.md#Design Rationale`：长期产品取舍。
- `modules/*.md#User / System Contract`：模块可见行为、API、CLI、UI 或数据契约。
- `modules/*.md#Key Constraints`：业务规则、边界、风险和不易从代码看出的约束。
