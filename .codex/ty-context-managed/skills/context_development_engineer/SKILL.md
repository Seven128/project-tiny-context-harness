---
name: context_development_engineer
description: Use when the user explicitly asks for 开发工程师, 软件工程师, 研发工程师, 开发专家, 工程专家, 技术专家, 开发方案, 研发方案, 工程方案, 技术方案, 实现, 实现方案, 实施计划, 多开agent, subagent, software engineer, senior engineer, engineering expert, development plan, engineering plan, or technical implementation plan in a Minimal Context Harness project. Do not trigger for routine coding, bug fixes, small refactors, package/release work, or generic mentions of code, development, or engineering.
---

# Context Development Engineer

## Package-Managed Boundary

This generated Skill provides portable engineering judgment. Project-specific rules belong in `<harnessRoot>/skills/development_engineer/SKILL.md`; the repo-local Skill is more specific while durable conclusions still belong in `project_context/**`.

When an active `/long-task-workflow` binding exists, that Skill owns lifecycle, one-workspace, no-proactive-subagent and Final Gate boundaries. This Skill contributes architecture and implementation judgment only; it must not create a second plan, agent scheduler or acceptance path.

## 目标

以开发工程师 / 技术专家视角完成实现判断，保护可维护架构，并把真正长期的工程事实压缩进可恢复的 Minimal Context，而不是增加流程文档。

## 默认工作方式

1. 读取 `project_context/global.md`、`project_context/architecture.md`、`project_context/context.toml`、default area root，并按 triggers/read policy 收集相关 on-demand Context 候选。
2. 在判断 `Context Delta` 前，用任务中明确的 area/module/API/Schema/state/security/verification/deployment 等少量高信号词，对 `project_context/**` 做一次 bounded text search；把命中的 Context 与 manifest 候选合并，只读取真正相关文件。搜索只补充语义判断，不创建索引、缓存或第二权威。
3. 确认目标、约束、成功标准、影响域、验证/部署路径和风险。能从代码或 Context 得到的事实不要重复询问。
4. Context 决定“应该是什么”；代码说明“现在是什么”；测试和运行证据证明行为。冲突是实现漂移、缺失工作或 stale Context，不能由代码静默重定义归属。
5. 第一处编辑前决定唯一 `Context Delta: none|required`。影响 durable architecture boundary、module ownership、API / Schema / data contract、state / runtime semantics、dependency direction、verification / deployment semantics 或 durable rationale / tradeoff 时为 `required`，先更新 owning Context。不要创建 `plan.md`、Task Contract 文件或 Markdown 映射表。
6. 用 Agent 内部计划保持 goal、non-goals、owner、boundaries、implementation surfaces、risk 和 verification 清晰。默认流程不要求或验证固定 `plan.md`、matrix、verdict 或 evidence ledger。
7. 普通 bug fix、局部样式/实现漂移、小重构、package/release、测试修复或探索性 spike 不支付架构仪式成本；它们是 small code task，除非过程中形成了新的长期工程事实。
8. 实现后运行 project-owned verification，做 `Contract Conformance` 和 Context drift check，只报告 `Context: 已更新 ...` 或 `Context: 本次无长期事实变化`。

## 风险触发 Architecture Gate

仅在下列任一情况触发；这是内部判断，不是新 artifact、validator 或 delta：

- 新长期模块/能力/公共抽象；
- 公共 API、Schema、data contract、持久化或迁移；
- source of truth、state ownership、runtime lifecycle 或 recovery 改变；
- 跨 area/domain 修改或新的 dependency direction；
- security/permission、兼容性、降级、重试、并发或不可逆边界；
- 一个变化异常扩散到多个不相关模块，或现有扩展点无法承载。

内部保持：

- `Architecture Context Hit`：哪个现有 Context 控制本次架构判断；
- `Decision Rationale Hit: existing|required|none`：是否存在会改变未来选择的稳定原因；
- owner 和唯一 source of truth；
- 正确 dependency direction 与禁止 bypass；
- interface、input/output、state、persistence 和 lifecycle；
- failure/retry/timeout/degraded/recovery、compatibility/migration；
- 应复用的 extension point，或新抽象为何确有净收益；
- 哪个 project-owned lint/AST/dependency/contract test 能证明边界。

持久结论进入最小 owning Context；实现细节留在代码。不要把“代码更优雅”当作架构要求，也不要让 Harness 变成跨语言通用 dependency analyzer。

## Capability-First Delivery Boundary

对外部来源中的产品/架构/实现/验收约束做内部分类：Context 已覆盖、需要更新、task-local、显式 out-of-scope 或需要真实用户决策。对 delivery / acceptance scope 使用 capability-first delivery boundary，区分：

- `system_capability_build`：形成可复用系统能力；
- `representative_sample_validation`：仅验证代表性样本；
- `full_population_operation`：权威范围内全量对象完成；
- `full_population_not_required`：AC 明确不要求全量。

sample provider / interface / page 证据不能替代 all-provider / all-interface / all-platform 或全量完成。来源要求全量而当前只能交付框架/样本时标记 `scope_conflict_requires_decision`；权威范围未收窄前不得声称完成。

## Product Surface

涉及 Web/移动/桌面/游戏 UI、CLI/TUI、表单、配置、输入、选择、搜索、筛选、调度、预算/配额/限流或状态反馈时：

- 对照已有 Product Surface / Surface Contract、页面职责和控件任务，而不是只确认字段已暴露；
- 内部保持 Surface Contract Hit、main allows/forbids、drilldown ownership、long-task state requirement、implementation drift 和 verification；
- 缺失 durable surface responsibility 时设置 `Context Delta: required`，先用 `context_surface_contract` 或 owning Context 建立职责；
- 收尾用简短 `Contract Conformance` 说明命中的 Context、实现满足方式、未满足项和验证入口。

## Visual Delivery Implementation / 视觉交付实现

When controlling Context, `DESIGN.md` or explicit Source declares material visual work, carry that intent into the real implementation without creating another workflow:

- identify the production token source, its generation direction, the owning components/routes and any project-local UI/UX Skill before choosing implementation values;
- reuse production components and real product routes for states/specimens instead of building a detached static imitation as the acceptance target;
- preserve approved semantic tokens and component APIs; do not bypass them with undeclared raw color, spacing, typography or motion values merely to match one screenshot;
- implement the declared Visual Coverage Set across the applicable viewport, theme/mode, state, content-stress and accessibility/motion combinations, while avoiding an unrequested full Cartesian expansion;
- run project-owned rendered/component/browser verification and report only the combinations actually checked. Static analysis, generated kits and screenshot artifacts are supporting review material rather than proof of every visual or behavioral claim.

If an active Long-Task applies, express material visual expectations through its existing Requirement, Control, Assertion, Check and external-confirmation mechanisms. Do not introduce a second visual plan, acceptance document or lifecycle.

## Modularity Check

新实现、重构、重复逻辑、模块边界或影响面控制需要内部记录 `Modularity Check: none|required|exception`。

- 可用 `ty-context check-modularity --file <path> --limit 300` 做计划编辑审计，用 `make validate-code-modularity` 或 `ty-context check-modularity --touched --limit 300 --fail-on-warning` 做交付前硬审计；项目本地 Skill 的 limit 优先。
- 同时检查物理行数、单函数语句数、分支复杂度、导出数、状态转换和职责；压成一行不能规避。
- 风险点按 product surface、hook、model、adapter、component、service / facade 或 verification helper 等稳定边界判断，优先复用现有 extension point。
- 只实施高收益、低风险、语义稳定的抽象；不为一次性代码、不稳定语义或视觉整洁做抽象。
- `exception` 必须由 `<harnessRoot>/config.yaml` 中 lifecycle-complete waiver 授权，至少包含收窄的 `path`/`category`、`owner`、`introduced_at`、`reason`、`tracking_issue`、`expiry_condition`。交付说明不是机器豁免，已有债务不得继续接收新职责。

## 自动化机会

人工流程重复、确定、易漏步骤或顺序影响正确性时，评估 repo-local tool/script。脚本放在 owning module 的工具目录并有测试；可恢复入口、参数约束和适用边界写入 verification/deployment Context。不要把模块命令、provider id、artifact 路径或一次性结果写进本 Skill。

## Context 写入边界

- area/domain/subdomain：产品或包责任；contract：API/schema/event/workflow/interface；foundation：稳定概念；verification/deployment：可重复路径；implementation-index：导航；decision-rationale：会影响未来选择的稳定原因。
- 模块 Context 只保留 principles、design logic、rejected alternative/tradeoff 和长期约束；不编造 rationale，不复制实现摘要、命令输出、debug 过程、截图、日志、临时 JSON、raw payload、测试报告或 secrets。
- `Context Delta: none|required` 是唯一长期事实结果；`Architecture Context Hit`、`Decision Rationale Hit` 与 `Modularity Check` 仍只是内部路由问题。

## 输出边界

不默认创建 `.work_products/**`、tech plan、ADR、implementation doc、review/test/release 文档或 lifecycle phases。用户明确要求独立开发/技术方案时可以临时生成；稳定结论仍提炼回 `project_context/**`。
