# Project Agent Overlay

本文件是 agent 启动路由器和硬边界，不承载完整设计思想、长原则或角色流程；默认 Minimal Context 规则见下方 managed block。

## 本仓库 Authoring 例外

- 本仓库维护 `project-tiny-context-harness` package、Minimal Context managed assets、source sync、validator 和 delivery benchmark。
- 修改 `packages/ty-context/**`、`.codex/ty-context-managed/**`、`tools/**` 或 `examples/delivery-benchmark/**` 时，先读 `project_context/**`，并使用 `.codex/skills/authoring/harness_package_design/SKILL.md`。
- 旧阶段式工作流只作为历史设计摘要保留在 `PROJECT_SPEC.md`；不要把 stage artifacts 恢复成默认 package 能力。
- Karpathy 编码准则是本仓库 agent 的底层行为原则：先思考并暴露假设，优先简洁，精准修改，目标驱动验证；不要把长原则常驻在 AGENTS 启动路径。

<!-- ty-context:managed:begin -->
# Minimal Context Harness Protocol

本项目使用 Minimal Context Harness。Harness 只维护上下文质量，不替项目证明产品质量。

流程契约 / Workflow Contract 是 Tiny Context 的第二核心：它指 Context Priority Ladder、Context Delta、Task Contract、Source-to-Context Coverage、Context-to-Implementation Binding、临时 `plan.md` / 等价计划面、Contract Conformance 和 Context drift check 这组读取、变更、实现和收尾优先级规则。Minimal Context 定义长期事实源是什么；流程契约定义 agent 如何诚实读取、更新、实现和验收这些事实。

## AGENTS.md 定位

- `AGENTS.md` 是 agent 启动路由器和硬边界，只放事实源入口、不可违反规则、关键触发器和最短验证入口。
- 长设计理由默认压缩进 `project_context/**`；若项目已有明确的本地 spec / design 文档，可按项目约定使用。角色流程 / checklist 放 Skills，人类使用说明放 README；新增 AGENTS 规则前优先压缩或替换旧规则，不默认追加。
- 建议把 AGENTS 主路径保持在约 40-70 行；这是软预算，不是 validator 或 CI gate。

## Context 优先级阶梯

1. 先读 `project_context/global.md`、`project_context/architecture.md` 和 `project_context/context.toml`，再按 graph 读取相关 area / context unit。
2. 若任务涉及 Product Surface work（Web UI、移动/桌面屏幕、游戏 UI/HUD/菜单、CLI/TUI 输出、扩展或设备界面）、前端布局、UI/UX、产品模块边界或信息放置，先做产品/页面定位检查；若改变 durable surface responsibility、主层/下钻归属、长任务状态或信息架构，使用 `context_surface_contract` Skill 应用 Surface Contract workflow：`project_context/**` 是 durable surface truth，repo-local Skills 可强制项目 task block，`DESIGN.md` 只放视觉 token/rationale，代码/截图只是实现证据；不新增 surface-specific context role，跨 surface 用现有 `contract` role。
3. 若任务新增、迁移或整理 Context 文件，先做 role placement scan：area 只代表产品域归属；contract / foundation / subdomain / verification / deployment / implementation-index / decision-rationale 等按读取目的拆成 role Context。
4. 对影响架构边界、模块 ownership、API / Schema / 数据契约、状态或运行语义、依赖方向、验证 / 部署语义或 durable rationale / tradeoff 的高风险产品、UI/UX、系统设计和工程任务，先把相关 Context 编译进当前任务契约；契约第一段用 `Context Delta: none|required` 作为唯一长期事实判断点，并包含 `Architecture Context Hit`、`Decision Rationale Hit: existing|required|none`；工程 / RFC / 实现类 Task Contract 同时包含 `Modularity Check: none|required|exception`。
5. 当输入包含产品方案、技术方案、架构迁移、页面职责、runtime/state/API/schema/verification 变更或验收方案时，先按流程契约在 Task Contract 或临时 `plan.md` / 等价计划面中做 Source-to-Context Coverage：逐项判断输入中的 durable constraints 是否已被 Context 覆盖、需要更新、仅属 task-local、显式 out-of-scope 或需要用户决策；不要在这张表里写实现路径。
6. `Context Delta: required` 则 context-first；small code task 默认 code-first，但一旦产生长期结论必须回写 Context。small code task 指现有 Context 已足够、且不改变 durable product / architecture / API-schema / runtime-state / verification-deployment / security-redaction / surface ownership 事实的局部实现任务；它按语义风险判断，不按代码行数判断。Context 更新必须足以指导实现，不能只写状态摘要或把方案约束降级成实现备注。
7. 收尾做 Contract Conformance 和 Context drift check；对照 Task Contract / `plan.md` 区分实现偏差、契约遗漏或长期事实缺失。高风险实现工作还要检查 Context-to-Implementation Binding：Context fact 是否绑定到 expected surfaces、implemented paths、forbidden shortcuts 和 verification path。交付只报告 `Context: 已更新 ...` 或 `Context: 本次无长期事实变化`；不要把一次性证据、任务契约或实现摘要写入 Context。

## 事实源

- 项目全局上下文：`project_context/global.md`
- 架构上下文：`project_context/architecture.md`（克制、最小，只记录系统边界、组件关系和长期约束）
- Context 图谱：`project_context/context.toml`（Schema v4 默认事实源；声明产品域 area/context_unit、role、触发条件和按需读取策略）
- 产品域 / context unit 上下文：`project_context/areas/**/*.md`
- 原则、契约和基础概念类 Context（如 `foundation`、`contract`、`decision-rationale`、`architecture`、`verification` / `deployment`）优先解释当前代码便利路径；代码只能证明当前实现，不能静默改写项目意图。
- 产品质量事实：项目自己的代码、测试、smoke、CI、hidden probe 或人工验收

## 工作规则

1. 新会话或继续工作时，先读取 `project_context/global.md`、`project_context/architecture.md` 和 `project_context/context.toml`；按其中 default area 和触发条件读取相关 context。
2. 第一处代码编辑前先做轻量变更分类，不按固定时长计时。若任务涉及 Product Surface work（Web UI、移动/桌面屏幕、游戏 UI/HUD/菜单、CLI/TUI 输出、扩展或设备界面）、前端布局、UI/UX、产品模块边界或信息应该放在哪个 surface / 页面 / 模块，先做产品/页面定位检查，再完成变更分类：用户在这个 surface 要完成什么判断，产品必须提供哪些信息 / 动作 / 反馈，哪些信息不应常驻，哪些属于主层、下钻、运维、诊断、详情或其他页面，当前布局和信息密度是否匹配 surface 任务。若 UI 改动涉及输入、选择、搜索、筛选、表单/配置、调度/时间窗口、预算/配额/限流或加载/空态/错误态，按产品/UIUX Skill 的控件任务框架做轻量检查，识别既有 Context 或 Product Surface Contract 是否适用以及是否缺少长期 surface/控件契约；职责不清或需要治理时使用 `context_surface_contract`。多 surface、多页面或多模块归属不清时，先审查相关信息架构，再收窄到代码模块实现。该检查是判断是否需要 context-first 的输入，不等于必须更新 Context，也不要求独立文档、新角色或新的 gate。
3. 对产品方案、UI/UX、系统设计、架构边界、模块 ownership、API / Schema / 数据契约、状态机或运行语义、依赖方向、验证 / 部署语义或 durable rationale / tradeoff 等高风险任务，第一处代码编辑前先编译当前任务契约：用 `Context Delta: none|required` 作为唯一正式长期事实判断点，再写本次 Task Contract，并把 `Architecture Context Hit`、`Decision Rationale Hit: existing|required|none`、命中的模块设计上下文、它控制的当前选择、首选路径和 fallback / degraded path 条件写入任务契约；工程 / RFC / 实现类 Task Contract 还应包含 `Modularity Check: none|required|exception`。如果任务输入本身是产品/架构/技术/验收方案，Task Contract 或临时 `plan.md` 必须包含 Source-to-Context Coverage，列出 source item、durable constraint、existing Context hit、Context action、owning Context 和 coverage status；高风险实现工作还应包含 Context-to-Implementation Binding，列出 context fact、implementation obligation、expected surfaces、implemented paths、forbidden shortcuts、verification path 和 binding status。small code task 不强制编译任务契约。
4. 当新增、迁移或整理 `project_context/areas/**` 时，做 role placement scan（软约束，不做 gate）：`area` / `domain` 保留产品域归属，`subdomain` 用于产品域内较小 ownership，`contract` 用于 API / schema / event / 跨域接口语义，`foundation` 用于稳定理论 / 词汇 / 背景材料，`verification` / `deployment` 用于可复用执行路径，`implementation-index` 只做代码导航索引，`decision-rationale` 记录稳定设计原因，`archive` 用于非默认读取的历史或外部材料。
5. 若任务契约声明 `Context Delta: required`，默认走 context-first：第一处代码编辑前先更新相关 `project_context/**`，写入必要且足以指导实现的长期结论，再按 Context 和 Task Contract / `plan.md` 对齐实现、验证和收尾。若 Source-to-Context Coverage 仍有 `new_context_required`、`needs_user_decision` 或 `under_scoped`，不得声称按方案完整实现；若 Context-to-Implementation Binding 仍有 `partial`、`missing`、`blocked`、`needs_user_decision` 或 `contradicted_by_current_state`，不得声称按 Context 完整落地。
6. 普通 bug fix、局部样式、局部实现漂移修复、测试修复或探索性 spike 不更新 Context，可先改代码；一旦形成长期结论，继续对齐或交付前必须回写 `project_context/**`。
7. small code task 不应创建 `plan.md`、完整 trace tables、Source-to-Context Coverage 或 Context-to-Implementation Binding，除非它发现 durable Context 变化、接收到外部 source packet，或扩展成高风险 / 多 surface 工作。
8. `project_context/**` 是项目意图、产品域职责、架构边界、集成方向、允许/禁止依赖、验证关键路径和部署关键路径的权威事实源；代码是当前实现状态的权威事实源。
9. 当代码形态、搜索结果或相邻实现与 Context 声明冲突时，把差异视为实现漂移、缺失工作或 Context 过期并显式说明；不要用当前代码形态或关键词搜索结果覆盖 Context 已声明的职责、归属或集成意图。
10. 每个有意义的方案或实现变更收尾时做 Contract Conformance 和 Context drift check：对照 Task Contract / `plan.md` 区分实现偏差、契约遗漏或长期事实缺失；实现偏差修实现，契约遗漏回 Task Contract，长期事实缺失回 `Context Delta` 并先更新 Context。若存在 Source-to-Context Coverage，收尾必须确认没有未处理的 `under_scoped` / `new_context_required` 项；若存在 Context-to-Implementation Binding，收尾必须确认没有 non-bound 实现项。交付说明只报告轻量状态：`Context: 已更新 ...` 或 `Context: 本次无长期事实变化`；Conformance 证据属于本次交付，不写入 `project_context/**`。
11. 长期事实只写入 `project_context/**`；不要默认创建 PRD、tech plan、ADR、implementation doc、review/test/release 文档。
12. 用户明确要求“产品方案 / 产品经理 / 产品专家 / product plan / product manager / product spec”、“设计稿 / UI/UX 设计方案 / 视觉专家 / UX designer / UI designer / visual polish / design system spec”或“开发工程师 / 技术方案 / 开发方案 / 实现 / 实现方案 / 实施计划 / 技术专家 / software engineer / development plan / technical implementation plan / 多开agent / subagent”这类角色或强产物名时，使用对应 Context authoring Skill，把长期结论写回 `project_context/**`。
13. 用户明确要求“导出尽可能详细的项目全量上下文 / 全量上下文导出 / 项目整体上下文 / full project context export / export full project context / project context export / project overall context / 当前项目代码实现 / 代码级实现导出 / code-level implementation export / Source Pack export / source-pack export / task context export / code index export”时，使用 `context_full_project_export` Skill；默认优先运行 `ty-context export-context --source-pack` 生成最多 5 个临时上传文件到 `tmp/ty-context/context-exports/latest/`，且只保留 `latest/` 导出轮次；只需要导航索引用 `--code-index`，聚焦交接用 `--task-context <name>`，需要 legacy 单文件完整代码快照时再用 `--code`，需要 legacy Context+代码双导出时可用 `--all`；导出产物只放 `tmp/ty-context/context-exports/**`，不得放入或注册到 `project_context/**` / `project_context/context.toml`。用户明确要求“upgrade Tiny Context / update Tiny Context / Project Tiny Context Harness upgrade / 用 Tiny Context upgrade skill 升级这个项目 / 升级 tiny context”时，使用 `context_harness_upgrade` Skill，先走 `upgrade`，不要先单独运行 `sync`。
14. 长程任务不要靠宽泛关键词自动触发临时验收流程；需要普通长程任务包时，建议用户直接调用 `/normal-long-task`；只有原始需求、需要 Scope Fit / 稳定 SFC 拆分和三输入准备时，直接调用 `/prepare-composite-long-task`；已有 Product / Architecture Source、Technical Realization Plan 和 Acceptance Checklist 且需要 Superpowers-backed 多组合长程任务执行时，直接调用 `/composite-long-task-workflow`。准备 campaign 是 opt-in 的用户自有 authoring/provenance；运行状态、证据和派生视图仍只放 `tmp/ty-context/plan-acceptance/**`，不把结果注册到 `project_context/**` / `project_context/context.toml`。
15. 当任务涉及设计稿、重做设计、视觉方案、设计系统、visual polish、frontend redesign 或 frontend styling，且存在可扫描的 UI 代码、页面文件、构建产物目录或本地/远程 URL 时，默认运行 `npx impeccable detect <target>` 做 Impeccable 视觉审查；没有可扫描目标、命令不可用或扫描失败时，说明原因并继续。Impeccable 不是 `validate-context` gate，也不替代截图检查、项目测试或人工判断。
16. Tiny Context / Harness managed surfaces 是生成资产：`AGENTS.md` managed block、`.codex/ty-context-managed/**`、`.codex/skills/context_product_plan/**`、`.codex/skills/context_uiux_design/**`、`.codex/skills/context_development_engineer/**`、`.codex/skills/context_surface_contract/**`、`.codex/skills/context_full_project_export/**`、`.codex/skills/context_harness_upgrade/**`、`.codex/skills/normal-long-task/**`、`.codex/skills/prepare-composite-long-task/**` 和 `.codex/skills/composite-long-task-workflow/**` 禁止承载项目特定规则；直接编辑会在 `sync` 时被覆盖或产生漂移。项目本地产品 / UIUX / 开发 / surface contract 规则必须新建独立 Skill，例如 `.codex/skills/product_plan/SKILL.md`、`.codex/skills/uiux_design/SKILL.md`、`.codex/skills/development_engineer/SKILL.md` 或 `.codex/skills/surface_contract/SKILL.md`；当项目本地 Skill 与默认 Skill 同时适用时，优先使用更具体的项目本地 Skill。项目本地 Skill 的 front matter `description` 触发词应与本文件中的角色触发规则和对应默认 `context_*` Skill 保持一致；新增或收窄关键词时，同步更新本地 Skill 描述和项目级 agent 指引，避免 Skill 触发条件与 Tiny Context 工作规则漂移。
17. ADR 降级为 Context 中的 `Design Rationale`；实现说明优先写成代码注释、测试名或模块 Context 中的关键约束。
18. Harness workflow gate 只运行 `validate-context`，用于检查上下文是否可恢复；不检查 context/code 修改顺序。`validate-plan-contract` 和 `validate-plan-acceptance` 是复杂 plan surface / 长程任务 artifact 的显式一致性检查，不默认进入 workflow gate。自动化最多提示 context-first 风险，不做阻断。
19. 产品质量由项目自己的验证入口证明；Context 只能声明验证 / 部署关键路径，不能伪造“测试已通过”或“部署已成功”。
20. Verification / Deployment Role Context 规则：area 是产品域归属；`verification` 和 `deployment` 是 area-owned 的按需读取角色，用来提高关键测试、smoke、CI、部署、云端初始化或运行拓扑路径的重复执行效率。Context 不记录一次性测试日志、完整命令输出、临时 JSON、CI artifact、测试报告、release ledger、secret、token、cookie、device id 或 raw payload；只记录特殊准备、最短命令或路径、预期阶段 / 信号、可接受 warning、已排除的重复探索点。跨产品域路径可放 project-level role Context，普通产品域路径放 owning area 下的 role Context。
21. `sync` 只刷新 managed guidance、默认 Skill 和工具；不会合并 Skill override，也不会覆盖用户新建的独立项目本地 Skill。
22. 普通项目默认只有一个 `main` area 和一个 `areas/main/verification.md`；monorepo 或 product-family 项目可在 `context.toml` 中增加多个产品域 `area` / `context_unit`，并用 `context_role` 或 manifest role 区分 `area`、`subdomain`、`contract`、`foundation`、`verification`、`deployment`、`archive`、`implementation-index` 和 `decision-rationale` 等不同 Context 类型。

## 常用命令

- `make validate-context`：检查 `project_context/**` 是否足够支持 agent 恢复上下文。
- `make ty-context-sync`：刷新 managed guidance、Context template、默认 Skill 和工具。
- `npx --yes --package project-tiny-context-harness@latest ty-context export-context --source-pack`：导出最多 5 个临时 Source Pack 上传文件到 `tmp/ty-context/context-exports/latest/`，并移除旧时间戳导出轮次。
- `npx --yes --package project-tiny-context-harness@latest ty-context export-context --code-index`：导出不含完整源码正文的临时代码索引和 manifest。
- `npx --yes --package project-tiny-context-harness@latest ty-context export-context --task-context <name>`：导出最多 5 个临时聚焦任务交接文件。
- `npx --yes --package project-tiny-context-harness@latest ty-context export-context --all`：同时导出临时项目级 Context 汇总和代码级实现 Markdown 到 `tmp/ty-context/context-exports/**`。
- `npx --yes --package project-tiny-context-harness@latest ty-context export-context --full`：导出临时项目级 Context 汇总 Markdown 到 `tmp/ty-context/context-exports/**`。
- `npx --yes --package project-tiny-context-harness@latest ty-context export-context --code`：导出临时代码级实现 Markdown 到 `tmp/ty-context/context-exports/**`。
- `npx --yes --package project-tiny-context-harness@latest ty-context validate-plan-contract <plan.md|dir>`：检查临时计划面的 Source-to-Context Coverage / Context-to-Implementation Binding 自洽、引用存在和弱证据矛盾；不证明产品质量。
- `npx --yes --package project-tiny-context-harness@latest ty-context validate-plan-acceptance <dir>`：检查长程任务 matrix/verdict JSON 自洽、引用存在和 complete 声明矛盾；不替代测试、CI 或人工验收。
- `npx --yes --package project-tiny-context-harness@latest ty-context doctor`：临时诊断 canonical Tiny Context CLI；避免裸 `npx ty-context` 解析到旧包名或旧本地缓存。
<!-- ty-context:managed:end -->
