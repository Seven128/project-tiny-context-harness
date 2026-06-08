# Project Agent Overlay

本文件是 agent 启动路由器和硬边界，不承载完整设计思想、长原则或角色流程；默认 Minimal Context 规则见下方 managed block。

## 本仓库 Authoring 例外

- 本仓库维护 `agent-project-sdlc` package、Minimal Context managed assets、source sync、validator 和 delivery benchmark。
- 修改 `packages/sdlc-harness/**`、`.codex/pjsdlc_managed/**`、`tools/**` 或 `examples/delivery-benchmark/**` 时，先读 `project_context/**`，并使用 `.codex/skills/authoring/harness_package_design/SKILL.md`。
- 旧阶段式工作流只作为历史设计摘要保留在 `PROJECT_SPEC.md`；不要把 stage artifacts 恢复成默认 package 能力。
- Karpathy 编码准则是本仓库 agent 的底层行为原则：先思考并暴露假设，优先简洁，精准修改，目标驱动验证；不要把长原则常驻在 AGENTS 启动路径。

<!-- pjsdlc:sdlc-harness:begin -->
# Minimal Context Harness Protocol

本项目使用 Minimal Context Harness。Harness 只维护上下文质量，不替项目证明产品质量。

## AGENTS.md 定位

- `AGENTS.md` 是 agent 启动路由器和硬边界，只放事实源入口、不可违反规则、关键触发器和最短验证入口。
- 长设计理由默认压缩进 `project_context/**`；若项目已有明确的本地 spec / design 文档，可按项目约定使用。角色流程 / checklist 放 Skills，人类使用说明放 README；新增 AGENTS 规则前优先压缩或替换旧规则，不默认追加。
- 建议把 AGENTS 主路径保持在约 40-70 行；这是软预算，不是 validator 或 CI gate。

## Context 优先级阶梯

1. 先读 `project_context/global.md`、`project_context/architecture.md` 和 `project_context/context.toml`，再按 graph 读取相关 area / context unit。
2. 若任务涉及 Web 页面、前端布局、UI/UX、产品模块边界或信息放置，先做页面产品定位检查，再完成变更分类；若 UI 改动涉及输入、选择、搜索、筛选、表单/配置、调度/时间窗口、预算/配额/限流或加载/空态/错误态，按产品/UIUX Skill 的控件任务框架做轻量检查。
3. 若任务新增、迁移或整理 Context 文件，先做 role placement scan：area 只代表产品域归属；contract / foundation / subdomain / verification / deployment / implementation-index / decision-rationale 等按读取目的拆成 role Context。
4. 判断是否改变长期事实：产品归属 / 方案、模块职责、信息架构、页面职责、常驻信息边界、API / Schema、状态或调度语义、跨域边界、验证 / 部署关键路径。
5. 命中长期事实则 context-first；普通 bug fix、局部样式、局部漂移修复、测试修复或 spike 默认 code-first，但一旦产生长期结论必须回写 Context。
6. 收尾做 Context drift check，只报告 `Context: 已更新 ...` 或 `Context: 本次无长期事实变化`；高风险 UI 命中已有 Context / 页面契约时另加简短 `Context Conformance: 已检查 ...`，不要把一次性证据写入 Context。

## 事实源

- 项目全局上下文：`project_context/global.md`
- 架构上下文：`project_context/architecture.md`（克制、最小，只记录系统边界、组件关系和长期约束）
- Context 图谱：`project_context/context.toml`（Schema v4 默认事实源；声明产品域 area/context_unit、role、触发条件和按需读取策略）
- 产品域 / context unit 上下文：`project_context/areas/**/*.md`
- 产品质量事实：项目自己的代码、测试、smoke、CI、hidden probe 或人工验收

## 工作规则

1. 新会话或继续工作时，先读取 `project_context/global.md`、`project_context/architecture.md` 和 `project_context/context.toml`；按其中 default area 和触发条件读取相关 context。
2. 第一处代码编辑前先做轻量变更分类，不按固定时长计时。若任务涉及 Web 页面、前端布局、UI/UX、产品模块边界或信息应该放在哪个页面 / 模块，先做页面产品定位检查，再完成变更分类：用户在这个页面要完成什么判断，产品必须提供哪些信息 / 动作 / 反馈，哪些信息不应常驻，哪些属于下游消费层 / 运维层 / 详情层 / 其他页面，当前布局和信息密度是否匹配页面任务。若 UI 改动涉及输入、选择、搜索、筛选、表单/配置、调度/时间窗口、预算/配额/限流或加载/空态/错误态，按产品/UIUX Skill 的控件任务框架做轻量检查，识别既有 Context 是否适用以及是否缺少长期页面/控件契约。多页面或多模块归属不清时，先审查全站或相关页面的信息架构，再收窄到代码模块实现。该检查是判断是否需要 context-first 的输入，不等于必须更新 Context，也不要求独立文档或新的 gate。
3. 判断本次是否改变长期事实，包括产品归属 / 产品方案、模块职责、信息架构、页面职责、常驻信息边界、API / Schema、状态机或调度语义、跨域边界、验证关键路径和部署关键路径。
4. 当新增、迁移或整理 `project_context/areas/**` 时，做 role placement scan（软约束，不做 gate）：`area` / `domain` 保留产品域归属，`subdomain` 用于产品域内较小 ownership，`contract` 用于 API / schema / event / 跨域接口语义，`foundation` 用于稳定理论 / 词汇 / 背景材料，`verification` / `deployment` 用于可复用执行路径，`implementation-index` 只做代码导航索引，`decision-rationale` 记录稳定设计原因，`archive` 用于非默认读取的历史或外部材料。
5. 若页面产品定位检查或其他变更分类命中长期事实，默认走 context-first：第一处代码编辑前先更新相关 `project_context/**`，写入必要且足以指导实现的长期结论，再按 Context 对齐实现、验证和收尾。
6. 普通 bug fix、局部样式、局部实现漂移修复、测试修复或探索性 spike 不更新 Context，可先改代码；一旦形成长期结论，继续对齐或交付前必须回写 `project_context/**`。
7. `project_context/**` 是项目意图、产品域职责、架构边界、集成方向、允许/禁止依赖、验证关键路径和部署关键路径的权威事实源；代码是当前实现状态的权威事实源。
8. 当代码形态、搜索结果或相邻实现与 Context 声明冲突时，把差异视为实现漂移、缺失工作或 Context 过期并显式说明；不要用当前代码形态或关键词搜索结果覆盖 Context 已声明的职责、归属或集成意图。
9. 每个有意义的方案或实现变更收尾时做 Context drift check：确认代码没有引入未沉淀的长期事实，且 Context 没有退化成普通实现摘要；交付说明只报告轻量状态：`Context: 已更新 ...` 或 `Context: 本次无长期事实变化`。高风险 UI 命中已有 Context / 页面契约时，另补一行简短 `Context Conformance: 已检查 ...`，说明实现如何满足或有哪些延期；该证据属于本次交付，不写入 `project_context/**`。
10. 长期事实只写入 `project_context/**`；不要默认创建 PRD、tech plan、ADR、implementation doc、review/test/release 文档。
11. 用户明确要求“产品方案 / 产品经理 / 产品专家”、“设计稿 / UI/UX 设计方案 / 视觉专家”或“开发工程师 / 技术方案 / 开发方案 / 实现 / 实现方案 / 实施计划 / 技术专家 / 多开agent / subagent”这类角色或强产物名时，使用对应 Context authoring Skill，把长期结论写回 `project_context/**`。
12. 用户明确要求“导出尽可能详细的项目全量上下文 / 全量上下文导出 / full project context export / 当前项目代码实现 / 代码级实现导出”时，使用 `context_full_project_export` Skill；默认优先运行 `sdlc-harness export-context --all` 同时生成项目级 Context 汇总和代码级实现快照；只需要单份产物时再用 `--full` 或 `--code`；导出产物只放 `tmp/sdlc/context-exports/**`，不得放入或注册到 `project_context/**` / `project_context/context.toml`。
13. 当任务涉及设计稿、重做设计、视觉方案、设计系统、visual polish、frontend redesign 或 frontend styling，且存在可扫描的 UI 代码、页面文件、构建产物目录或本地/远程 URL 时，默认运行 `npx impeccable detect <target>` 做 Impeccable 视觉审查；没有可扫描目标、命令不可用或扫描失败时，说明原因并继续。Impeccable 不是 `validate-context` gate，也不替代截图检查、项目测试或人工判断。
14. SDLC / Harness managed surfaces 是生成资产：`AGENTS.md` managed block、`.codex/pjsdlc_managed/**`、`.codex/skills/context_product_plan/**`、`.codex/skills/context_uiux_design/**`、`.codex/skills/context_development_engineer/**` 和 `.codex/skills/context_full_project_export/**` 禁止承载项目特定规则；直接编辑会在 `sync` 时被覆盖或产生漂移。项目本地产品 / UIUX / 开发规则必须新建独立 Skill，例如 `.codex/skills/product_plan/SKILL.md`、`.codex/skills/uiux_design/SKILL.md` 或 `.codex/skills/development_engineer/SKILL.md`；当项目本地 Skill 与默认 Skill 同时适用时，优先使用更具体的项目本地 Skill。项目本地 Skill 的 front matter `description` 触发词应与本文件中的角色触发规则和对应默认 `context_*` Skill 保持一致；新增或收窄关键词时，同步更新本地 Skill 描述和项目级 agent 指引，避免 Skill 触发条件与 SDLC 工作规则漂移。
15. ADR 降级为 Context 中的 `Design Rationale`；实现说明优先写成代码注释、测试名或模块 Context 中的关键约束。
16. Harness workflow gate 只运行 `validate-context`，用于检查上下文是否可恢复；不检查 context/code 修改顺序。自动化最多提示 context-first 风险，不做阻断。
17. 产品质量由项目自己的验证入口证明；Context 只能声明验证 / 部署关键路径，不能伪造“测试已通过”或“部署已成功”。
18. Verification / Deployment Role Context 规则：area 是产品域归属；`verification` 和 `deployment` 是 area-owned 的按需读取角色，用来提高关键测试、smoke、CI、部署、云端初始化或运行拓扑路径的重复执行效率。Context 不记录一次性测试日志、完整命令输出、临时 JSON、CI artifact、测试报告、release ledger、secret、token、cookie、device id 或 raw payload；只记录特殊准备、最短命令或路径、预期阶段 / 信号、可接受 warning、已排除的重复探索点。跨产品域路径可放 project-level role Context，普通产品域路径放 owning area 下的 role Context。
19. `sync` 只刷新 managed guidance、默认 Skill 和工具；不会合并 Skill override，也不会覆盖用户新建的独立项目本地 Skill。
20. 普通项目默认只有一个 `main` area 和一个 `areas/main/verification.md`；monorepo 或 product-family 项目可在 `context.toml` 中增加多个产品域 `area` / `context_unit`，并用 `context_role` 或 manifest role 区分 `area`、`subdomain`、`contract`、`foundation`、`verification`、`deployment`、`archive`、`implementation-index` 和 `decision-rationale` 等不同 Context 类型。

## 常用命令

- `make validate-context`：检查 `project_context/**` 是否足够支持 agent 恢复上下文。
- `make sdlc-sync`：刷新 managed guidance、Context template、默认 Skill 和工具。
- `npx --yes --package agent-project-sdlc@latest sdlc-harness export-context --all`：同时导出临时项目级 Context 汇总和代码级实现 Markdown 到 `tmp/sdlc/context-exports/**`。
- `npx --yes --package agent-project-sdlc@latest sdlc-harness export-context --full`：导出临时项目级 Context 汇总 Markdown 到 `tmp/sdlc/context-exports/**`。
- `npx --yes --package agent-project-sdlc@latest sdlc-harness export-context --code`：导出临时代码级实现 Markdown 到 `tmp/sdlc/context-exports/**`。
- `npx --yes --package agent-project-sdlc@latest sdlc-harness doctor`：临时诊断 canonical SDLC CLI；避免裸 `npx sdlc-harness` 解析到旧包名或旧本地缓存。
<!-- pjsdlc:sdlc-harness:end -->
