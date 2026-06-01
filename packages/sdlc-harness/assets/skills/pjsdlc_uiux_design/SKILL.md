---
name: pjsdlc_uiux_design
description: Use during UI_UX_DESIGNING to create UX flow, screen contracts, interaction states, responsive/a11y acceptance, and optional DESIGN.md design-system handoff.
---

# UI/UX Design Skill

## 目的

把已确认的 PRD 转成后续架构、开发、Review 和测试可以消费的体验事实源。该阶段不写业务代码，也不替代技术方案；它只固定用户旅程、信息架构、屏幕契约、交互状态、响应式 / accessibility 验收、视觉设计系统，以及参考图驱动任务的截图对齐验收口径。

## 角色提示词

你是资深产品设计师和 UX 设计负责人。目标不是做漂亮但不可执行的 UI 描述，而是把 PRD 中的用户场景转成可实现、可审查、可测试的 screen contracts 和 design-system handoff。

开始前先确认 PRD 的 requirement IDs、目标用户、用户场景、验收标准、Out of Scope 和 Open Questions。若产品边界不足以决定用户旅程、屏幕范围或关键交互，不要用设计文档替代 PRD；先收尾或移除当前 open UI/UX task，再请 Manager 使用 `python3 tools/transition.py --to REQUIREMENT_GATHERING` 回到 PM/PRD 工作流。

UI/UX 产出本身也是 workflow task。没有 open task 时，先在 `<harnessRoot>/state/plan.yaml` 创建一个最小 `TASK-*` task，设置 `phase: "UI_UX_DESIGNING"` 和 `current_task_id`。当前轮只完成一个能力、一个用户旅程、一组相关 screen contracts、一次 DESIGN.md 设计系统补充，或一个明确的 `not_applicable` 体验交接结论。不要在一个任务中连续重写大量产品和设计事实。

视觉 UI 场景必须维护根目录 `DESIGN.md`。`DESIGN.md` 使用 Google DESIGN.md format：YAML front matter 保存 colors、typography、spacing、rounded、components；Markdown 正文保存 Overview、Colors、Typography、Layout、Elevation & Depth、Shapes、Components、Do's and Don'ts。tokens 是规范值，正文解释如何应用。`@google/design.md` warning 只作为设计风险提示；error 必须修复或记录 blocker。

参考图、截图或视觉稿驱动的任务必须先做 `visual_reconciliation`。先判断参考图是风格目标、布局目标、资产来源、灵感参考还是未知；再记录使用边界，避免把未授权图片直接当作可复制资产。视觉还原任务的第一目标不是让文档完整，而是快速得到可比对的运行截图或 mock，并用差异分析推动下一轮改动。用户确认前，不要把工程 gate、资产加载或 sprite 渲染当作视觉达标。

CLI、API、agent、operator workflow 等没有传统视觉界面的项目仍然可以进入本阶段，但应在 UX slice 中写 `Applicability: cli_or_api_experience` 并聚焦命令/接口入口、反馈、错误、恢复路径、权限提示和 handoff matrix。完全不适用时写 `Applicability: not_applicable`、PRD refs 和 N/A reason；不要生成空洞的屏幕表。

UI/UX 阶段默认先评估是否适合并行调研或草图拆解。适合时，主 Agent 使用 `parallel_execution.trigger: "workflow_default"` 和 `runtime.provider: "codex_native_subagents"` 调度 worker 做用户旅程、屏幕状态、设计系统或竞品/规范调研；worker 不直接写最终事实源，最终 `.work_products/02_experience/**`、`DESIGN.md`、`.work_products/INDEX.md` 和 task 状态由主 Agent 合成。

## 输入

- `.work_products/INDEX.md`
- `<harnessRoot>/state/plan.yaml`
- 相关 `.work_products/01_product/` PRD
- 现有 `.work_products/02_experience/`
- 可选现有 `DESIGN.md`
- 可选 reference images / screenshots / visual mocks
- `<harnessRoot>/pjsdlc_managed/templates/UI_UX_DESIGN_TEMPLATE.md`

## 输出

- `.work_products/02_experience/` 下的 UX / screen contract 文档
- 视觉 UI 场景的根目录 `DESIGN.md`
- 参考图驱动任务的 `visual_reconciliation` 证据指针、差异分析和人工确认状态
- 更新后的 `<harnessRoot>/state/plan.yaml`
- 更新后的 `.work_products/INDEX.md`

## 语义切片

- `.work_products/02_experience/` 按业务能力、用户旅程、屏幕组、平台表面或体验风险切片。
- 参考图驱动的视觉探索按一个视觉目标或一组强相关画面切片；不要把多个互不相关的页面、角色、HUD 和资产体系塞进同一个 visual spike。
- 同一用户旅程中的多个屏幕可以在同一 slice；独立流程、独立验收标准或独立平台表面应拆成不同 slice。
- `DESIGN.md` 是全局设计系统事实源，不按能力切片；能力级例外或临时偏移写入对应 UX slice 的 `Design system reference` 或 `Open Questions`。
- 非 Markdown 设计物料、截图、mock 和参考导出物放在 `.work_products/02_experience/assets/<capability>/`，并从对应 UX slice 引用具体路径。
- `overview.md` 是 generated artifact，不算 UI/UX deliverable，也不能作为 `work_products.uiux` 引用。

## Plan Protocol

1. 没有 open task 时，先创建一个最小 `TASK-*` task，设置 `phase: "UI_UX_DESIGNING"` 和 `current_task_id`。
2. open task 必须包含 `phase`、`work_products`、`allowed_paths`、`required_gates`、`acceptance_criteria` 和 `result_work_products`；`result_work_products` 指向本 task 计划产出的 `.work_products/02_experience/**` 和可选 `DESIGN.md`。
3. 执行当前 task 时只编辑 `allowed_paths` 中的文件，完成后更新 `.work_products/INDEX.md`、运行 `make work-products-overview`，并至少运行 `make validate-plan`；阶段出口前运行 `make validate-uiux`。
4. task 完成后，从 `plan.yaml.tasks` 移除该 task；如果仍有 pending `TASK-*` UI/UX task，下一轮 `/uiux` 或 `/next` 再继续。
5. 进入 `SPRINTING` 后发现 UX、screen contract 或 DESIGN.md 需要改变，走 RFC workflow；不要在开发中静默改设计事实。

当 open task 声明 `visual_reconciliation.required: true` 时，task acceptance criteria 必须包含截图或 mock 对比、差异分析、桌面/移动视口要求以及 `human_visual_approval_required`。如果视觉方向未获用户确认，task 可以保持 `blocked` / `pending_revision`，但不得声称视觉目标完成。

## 规则

1. UX slice 必须引用 PRD 路径和 requirement IDs，除非明确 `Applicability: not_applicable`。
2. 视觉 UI 必须有 screen contracts，至少覆盖适用的 loading、empty、error、success、permission states，responsive breakpoints，以及 accessibility / focus / keyboard / touch expectations。
3. 视觉 UI 必须引用或生成根目录 `DESIGN.md`；非视觉体验必须写清 `Design system reference: not_applicable` 和原因。
4. Handoff matrix 必须把 requirement -> screen/state -> component/interaction -> acceptance/test seed 连接起来，供 ARCHITECTING 和 TESTING 消费。
5. 非 Markdown 设计物料、截图、mock 和参考导出物放在 `.work_products/02_experience/assets/<capability>/`，并从 UX slice 引用，供后续阶段按路径消费。
6. 不要在 `.work_products/02_experience/**` 写技术架构、数据模型或开发任务拆分；这些属于 `ARCHITECTING`。
7. 不要在 TESTING 或 SPRINTING 中补写新的 UX contract 来追认实现；设计事实变化应回到 `UI_UX_DESIGNING` 或 RFC。
8. 视觉还原任务必须把“资产是否接入”和“画面是否达标”分开记录：`assetKeys`、sprite、fallback 是工程事实；风格、比例、清晰度、层级、主体识别度和 HUD/readability 是视觉事实。
9. 自动化 gate 只能证明文档或功能未明显破坏；`visual_reconciliation` 的视觉完成需要截图对比证据和人工确认。

## 完成检查

- [ ] 当前 UI/UX 工作已绑定 `plan.yaml` 中一个最小 `TASK-*` task，并设置 `phase: "UI_UX_DESIGNING"`。
- [ ] `.work_products/02_experience/` 下存在非 overview 的 UX 产物，或明确记录 `Applicability: not_applicable`。
- [ ] UX slice 引用了 PRD 和 requirement IDs，或记录了明确 N/A reason。
- [ ] 视觉 UI 的 screen contracts 覆盖关键状态、响应式和 accessibility / focus / keyboard / touch。
- [ ] 视觉 UI 的 `DESIGN.md` 通过 `@google/design.md` linter 的 error 检查；warning 已作为风险或偏移记录。
- [ ] UX slice 引用的 `.work_products/02_experience/assets/**` 物料路径存在且用途明确。
- [ ] Handoff matrix 能被 ARCHITECTING、SPRINTING、REVIEWING 和 TESTING 消费。
- [ ] 参考图驱动任务已记录 reference images、reference intent、usage boundary、screenshot artifacts、difference analysis 和 human visual approval status。
- [ ] `.work_products/INDEX.md` 已链接新增产物。
- [ ] 已运行 `make work-products-overview` 刷新 `.work_products/02_experience/overview.md`。
- [ ] `make validate-uiux` 准备通过。
