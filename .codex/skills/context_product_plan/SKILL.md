---
name: context_product_plan
description: Use when the user explicitly asks for 产品方案, 产品经理, 产品专家, 需求方案, 功能方案, 业务规则方案, 用户故事方案, 验收标准方案, 产品规划方案, product plan, product manager, product expert, product spec, or PM spec in a Minimal Context Harness project. Do not trigger for ordinary coding, debugging, package work, or generic mentions of 产品, product, or requirements.
---

# Context Product Plan

## 目标

帮助 agent 把产品方案收敛成可恢复的 Minimal Context。

## 工作方式

1. 先读取 `project_context/global.md` 和 `project_context/context.toml`，按 default area、triggers、read_when 选择相关 context。
2. 和用户澄清或整理：目标用户、产品/页面定位、核心问题、用户需要什么、产品需要提供的内容/能力/反馈、主要流程、验收信号、非目标、约束、风险和受影响模块。
3. 产品意图、模块职责、边界和验收口径以 `project_context/**` 为准；代码和搜索结果只说明当前实现状态。Context 决定“应该是什么”，代码揭示“现在是什么”，代码不能静默重定义 Context。
4. 输出产品判断前先判断是否改变长期事实；如果改变产品方案、模块职责、验收口径、跨域契约或验证入口，先更新相关 `project_context/**`，再让实现按 Context 对齐。
5. 普通 bug fix、局部实现漂移或探索性 spike 形成的产品结论，应在继续对齐或交付前回写 Context；不要把 Context 机械补成代码改动摘要。
6. 如果代码与 Context 冲突，显式标记为实现漂移、缺失工作或 Context 过期。
7. 输出产品判断时保持短而具体，避免长篇 PRD 模板。
8. 需要沉淀长期事实时，只更新 `project_context/**`：
   - 全局产品目标、边界、背景写入 `global.md`。
   - 模块级用户/系统契约、规则、风险写入对应 area / subdomain Context。
   - 跨域契约写入 `context_role: contract` 或 manifest role 为 `contract` 的 Context；底层理论源写入 `foundation`，历史索引写入 `archive`，不要伪装成 module。
   - 新 context unit 可新增 `project_context/areas/<unit>.md`，并更新 `global.md#Context Index`；复杂项目同时更新 `project_context/context.toml`。
   - 如果 `upgrade` 自动把深层 `.md` 注册成 area，但语义上更像 foundation / contract / archive，后续应显式调整 manifest role；不要依赖自动迁移判断语义。
9. Context 只能声明验证入口或验收信号，不能伪造“测试已通过”。

## 产品体验校准

- 做页面、模块或入口规划时，先回答产品或页面定位是什么、要解决什么问题、需要提供什么给用户；再回答放什么、放哪里、为什么。优先保留能帮助目标用户判断状态、采取行动、定位下一步或理解风险的信息。
- 信息归属按使用场景决定：高频且跨页面的动作优先考虑系统级区域；模块动作放模块内部；运维、连接、缓存、后台任务等内部状态只有在影响用户判断或行动时才进入主界面，否则放运维/详情区域；低频解释放 Context、文档、帮助或详情，不默认占据主界面。
- 首页、总览或入口页应服务产品定位下的核心使用路径和核心判断，不要为了证明系统层级完整而重复导航、堆叠入口、保留空指标槽或展示实现来源说明。
- 产品文案面向真实用户，直白、行动优先；除产品名、协议、字段名、ID、调试 JSON 等必要专有名词外，普通按钮、筛选、状态、空态、警告和说明优先使用用户熟悉的语言。
- 空态和数据要求真实：没有数据就显示真正空态，筛选无结果与系统无数据要区分，API/连接失败用用户能理解的状态表达，技术细节放到运维或详情里。

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
