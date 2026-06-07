# Minimal Context Harness Protocol

本项目使用 Minimal Context Harness。Harness 只维护上下文质量，不替项目证明产品质量。

## 事实源

- 项目全局上下文：`project_context/global.md`
- 架构上下文：`project_context/architecture.md`（克制、最小，只记录系统边界、组件关系和长期约束）
- Context 图谱：`project_context/context.toml`（Schema v4 默认事实源；声明 area/context_unit、role、触发条件和按需读取策略）
- 模块 / context unit 上下文：`project_context/areas/**/*.md`
- 产品质量事实：项目自己的代码、测试、smoke、CI、hidden probe 或人工验收

## 工作规则

1. 新会话或继续工作时，先读取 `project_context/global.md`、`project_context/architecture.md` 和 `project_context/context.toml`；按其中 default area 和触发条件读取相关 context。
2. 第一处代码编辑前先做轻量变更分类，不按固定时长计时：判断本次是否改变长期事实，包括产品归属 / 产品方案、模块职责、信息架构、API / Schema、状态机或调度语义、跨域边界和验证入口。
3. 若命中长期事实，默认走 context-first：第一处代码编辑前先更新相关 `project_context/**`，写入必要且足以指导实现的长期结论，再按 Context 对齐实现、验证和收尾。
4. 普通 bug fix、局部样式、局部实现漂移修复、测试修复或探索性 spike 不更新 Context，可先改代码；一旦形成长期结论，继续对齐或交付前必须回写 `project_context/**`。
5. `project_context/**` 是项目意图、模块职责、架构边界、集成方向、允许/禁止依赖和验证入口的权威事实源；代码是当前实现状态的权威事实源。
6. 当代码形态、搜索结果或相邻实现与 Context 声明冲突时，把差异视为实现漂移、缺失工作或 Context 过期并显式说明；不要用当前代码形态或关键词搜索结果覆盖 Context 已声明的职责、归属或集成意图。
7. 每个有意义的方案或实现变更收尾时做 Context drift check：确认代码没有引入未沉淀的长期事实，且 Context 没有退化成普通实现摘要；交付说明只报告轻量状态：`Context: 已更新 ...` 或 `Context: 本次无长期事实变化`。
8. 长期事实只写入 `project_context/**`；不要默认创建 PRD、tech plan、ADR、implementation doc、review/test/release 文档。
9. 用户明确要求“产品方案 / 产品经理 / 产品专家”、“设计稿 / UI/UX 设计方案 / 视觉专家”或“开发工程师 / 技术方案 / 开发方案 / 实现 / 实现方案 / 实施计划 / 技术专家 / 多开agent / subagent”这类角色或强产物名时，使用对应 Context authoring Skill，把长期结论写回 `project_context/**`。
10. 当任务涉及设计稿、重做设计、视觉方案、设计系统、visual polish、frontend redesign 或 frontend styling，且存在可扫描的 UI 代码、页面文件、构建产物目录或本地/远程 URL 时，默认运行 `npx impeccable detect <target>` 做 Impeccable 视觉审查；没有可扫描目标、命令不可用或扫描失败时，说明原因并继续。Impeccable 不是 `validate-context` gate，也不替代截图检查、项目测试或人工判断。
11. `.agent/skills/context_product_plan/**`、`.agent/skills/context_uiux_design/**` 和 `.agent/skills/context_development_engineer/**` 是 package-managed 默认 Skill，禁止直接编辑；`sync` 会覆盖这些生成产物。项目本地产品 / UIUX / 开发规则必须新建独立 Skill，例如 `.agent/skills/product_plan/SKILL.md`、`.agent/skills/uiux_design/SKILL.md` 或 `.agent/skills/development_engineer/SKILL.md`；当项目本地 Skill 与默认 Skill 同时适用时，优先使用更具体的项目本地 Skill。项目本地 Skill 的 front matter `description` 触发词应与本文件中的角色触发规则和对应默认 `context_*` Skill 保持一致；新增或收窄关键词时，同步更新本地 Skill 描述和项目级 agent 指引，避免 Skill 触发条件与 SDLC 工作规则漂移。
12. ADR 降级为 Context 中的 `Design Rationale`；实现说明优先写成代码注释、测试名或模块 Context 中的关键约束。
13. Harness workflow gate 只运行 `validate-context`，用于检查上下文是否可恢复；不检查 context/code 修改顺序。自动化最多提示 context-first 风险，不做阻断。
14. 产品质量由项目自己的验证入口证明；Context 只能声明验证入口，不能伪造“测试已通过”。
15. `sync` 只刷新 managed guidance、默认 Skill 和工具；不会合并 Skill override，也不会覆盖用户新建的独立项目本地 Skill。
16. 普通项目默认只有一个 `main` area；monorepo 或 product-family 项目可在 `context.toml` 中增加多个 `area` / `context_unit`，并用 `context_role` 或 manifest role 区分 `area`、`subdomain`、`contract`、`foundation`、`archive`、`implementation-index` 和 `decision-rationale` 等不同 Context 类型。

## 常用命令

- `make validate-context`：检查 `project_context/**` 是否足够支持 agent 恢复上下文。
- `make sdlc-sync`：刷新 managed guidance、Context template、默认 Skill 和工具。
- `npx --yes --package agent-project-sdlc@latest sdlc-harness doctor`：临时诊断 canonical SDLC CLI；避免裸 `npx sdlc-harness` 解析到旧包名或旧本地缓存。
