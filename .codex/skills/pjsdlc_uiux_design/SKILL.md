---
name: pjsdlc_uiux_design
description: Use during UI_UX_DESIGNING to create UX flow, screen contracts, interaction states, responsive/a11y acceptance, and optional DESIGN.md design-system handoff.
---

# UI/UX Design Skill

## 目的

把已确认的 PRD 转成后续架构、开发、Review 和测试可以消费的体验事实源。该阶段不写业务代码，也不替代技术方案；它只固定用户旅程、信息架构、屏幕契约、交互状态、响应式 / accessibility 验收和视觉设计系统。

## 角色提示词

你是资深产品设计师和 UX 设计负责人。目标不是做漂亮但不可执行的 UI 描述，而是把 PRD 中的用户场景转成可实现、可审查、可测试的 screen contracts 和 design-system handoff。

开始前先确认 PRD 的 requirement IDs、目标用户、用户场景、验收标准、Out of Scope 和 Open Questions。若产品边界不足以决定用户旅程、屏幕范围或关键交互，不要用设计文档替代 PRD；先收尾或移除当前 open UI/UX task，再请 Manager 使用 `python3 tools/transition.py --to REQUIREMENT_GATHERING` 回到 PM/PRD 工作流。

UI/UX 产出本身也是 workflow task。没有 open task 时，先在 `<harnessRoot>/state/plan.yaml` 创建一个最小 `TASK-*` task，设置 `phase: "UI_UX_DESIGNING"` 和 `current_task_id`。当前轮只完成一个能力、一个用户旅程、一组相关 screen contracts、一次 DESIGN.md 设计系统补充，或一个明确的 `not_applicable` 体验交接结论。不要在一个任务中连续重写大量产品和设计事实。

视觉 UI 场景必须维护根目录 `DESIGN.md`。`DESIGN.md` 使用 Google DESIGN.md format：YAML front matter 保存 colors、typography、spacing、rounded、components；Markdown 正文保存 Overview、Colors、Typography、Layout、Elevation & Depth、Shapes、Components、Do's and Don'ts。tokens 是规范值，正文解释如何应用。`@google/design.md` warning 只作为设计风险提示；error 必须修复或记录 blocker。

CLI、API、agent、operator workflow 等没有传统视觉界面的项目仍然可以进入本阶段，但应在 UX slice 中写 `Applicability: cli_or_api_experience` 并聚焦命令/接口入口、反馈、错误、恢复路径、权限提示和 handoff matrix。完全不适用时写 `Applicability: not_applicable`、PRD refs 和 N/A reason；不要生成空洞的屏幕表。

UI/UX 阶段默认先评估是否适合并行调研或草图拆解。适合时，主 Agent 使用 `parallel_execution.trigger: "workflow_default"` 和 `runtime.provider: "codex_native_subagents"` 调度 worker 做用户旅程、屏幕状态、设计系统或竞品/规范调研；worker 不直接写最终事实源，最终 `.docs/02_experience/**`、`DESIGN.md`、`.docs/INDEX.md` 和 task 状态由主 Agent 合成。

## 输入

- `.docs/INDEX.md`
- `<harnessRoot>/state/plan.yaml`
- 相关 `.docs/01_product/` PRD
- 现有 `.docs/02_experience/`
- 可选现有 `DESIGN.md`
- `<harnessRoot>/pjsdlc_managed/templates/UI_UX_DESIGN_TEMPLATE.md`

## 输出

- `.docs/02_experience/` 下的 UX / screen contract 文档
- 视觉 UI 场景的根目录 `DESIGN.md`
- 更新后的 `<harnessRoot>/state/plan.yaml`
- 更新后的 `.docs/INDEX.md`

## 语义切片

- `.docs/02_experience/` 按业务能力、用户旅程、屏幕组、平台表面或体验风险切片。
- 同一用户旅程中的多个屏幕可以在同一 slice；独立流程、独立验收标准或独立平台表面应拆成不同 slice。
- `DESIGN.md` 是全局设计系统事实源，不按能力切片；能力级例外或临时偏移写入对应 UX slice 的 `Design system reference` 或 `Open Questions`。
- `overview.md` 是 generated artifact，不算 UI/UX deliverable，也不能作为 `docs.uiux` 引用。

## Plan Protocol

1. 没有 open task 时，先创建一个最小 `TASK-*` task，设置 `phase: "UI_UX_DESIGNING"` 和 `current_task_id`。
2. open task 必须包含 `phase`、`docs`、`allowed_paths`、`required_gates`、`acceptance_criteria` 和 `result_docs`；`result_docs` 指向本 task 计划产出的 `.docs/02_experience/**` 和可选 `DESIGN.md`。
3. 执行当前 task 时只编辑 `allowed_paths` 中的文件，完成后更新 `.docs/INDEX.md`、运行 `make docs-overview`，并至少运行 `make validate-plan`；阶段出口前运行 `make validate-uiux`。
4. task 完成后，从 `plan.yaml.tasks` 移除该 task；如果仍有 pending `TASK-*` UI/UX task，下一轮 `/uiux` 或 `/next` 再继续。
5. 进入 `SPRINTING` 后发现 UX、screen contract 或 DESIGN.md 需要改变，走 RFC workflow；不要在开发中静默改设计事实。

## 规则

1. UX slice 必须引用 PRD 路径和 requirement IDs，除非明确 `Applicability: not_applicable`。
2. 视觉 UI 必须有 screen contracts，至少覆盖适用的 loading、empty、error、success、permission states，responsive breakpoints，以及 accessibility / focus / keyboard / touch expectations。
3. 视觉 UI 必须引用或生成根目录 `DESIGN.md`；非视觉体验必须写清 `Design system reference: not_applicable` 和原因。
4. Handoff matrix 必须把 requirement -> screen/state -> component/interaction -> acceptance/test seed 连接起来，供 ARCHITECTING 和 TESTING 消费。
5. 不要在 `.docs/02_experience/**` 写技术架构、数据模型或开发任务拆分；这些属于 `ARCHITECTING`。
6. 不要在 TESTING 或 SPRINTING 中补写新的 UX contract 来追认实现；设计事实变化应回到 `UI_UX_DESIGNING` 或 RFC。

## 完成检查

- [ ] 当前 UI/UX 工作已绑定 `plan.yaml` 中一个最小 `TASK-*` task，并设置 `phase: "UI_UX_DESIGNING"`。
- [ ] `.docs/02_experience/` 下存在非 overview 的 UX 产物，或明确记录 `Applicability: not_applicable`。
- [ ] UX slice 引用了 PRD 和 requirement IDs，或记录了明确 N/A reason。
- [ ] 视觉 UI 的 screen contracts 覆盖关键状态、响应式和 accessibility / focus / keyboard / touch。
- [ ] 视觉 UI 的 `DESIGN.md` 通过 `@google/design.md` linter 的 error 检查；warning 已作为风险或偏移记录。
- [ ] Handoff matrix 能被 ARCHITECTING、SPRINTING、REVIEWING 和 TESTING 消费。
- [ ] `.docs/INDEX.md` 已链接新增产物。
- [ ] 已运行 `make docs-overview` 刷新 `.docs/02_experience/overview.md`。
- [ ] `make validate-uiux` 准备通过。
