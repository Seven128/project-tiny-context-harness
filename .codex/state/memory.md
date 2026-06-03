# Project Memory

本文件用于保存跨阶段长期有效的项目知识：

- 架构基准
- 命名和模块约定
- 安全、合规或权限约束
- 已知基础设施限制
- 长期决策的简短摘要和链接

## Harness Design Decisions

- [ADR 001: Stage Contracts and Gates](../../.work_products/05_decisions/ADR_001_stage_contracts_and_gates.md): 阶段契约、阶段 Skill 和交付 gate 是复杂项目降低遗漏与返工的核心控制面；默认 gate 厚度采用 `Standard Thin`，内部循环 focused，边界 strict。
- [ADR 002: Fact Sources, Memory and Overviews](../../.work_products/05_decisions/ADR_002_fact_sources_memory_and_overviews.md): `.work_products/**` 和 `.work_products/INDEX.md` 是事实源，`memory.md` 只做短摘要和导航，`overview.md` 只做 generated 浏览视图。
- [ADR 003: Plan State and Task History](../../.work_products/05_decisions/ADR_003_plan_state_and_task_history.md): `plan.yaml` 保存当前和未来任务合同，active state 不保存历史流水。
- [ADR 004: Lightweight Graph Contracts](../../.work_products/05_decisions/ADR_004_lightweight_graph_contracts.md): phase graph 和 test path graph 采用轻量 declarative schema，不升级为重型图框架。
- [ADR 005: Development Self-Test Handoff](../../.work_products/05_decisions/ADR_005_development_self_test_handoff.md): Development Self-Test Report 是短交接卡，不保存 debug log、operator log、runbook 正文或 evidence body。
- [ADR 006: Authoring Overlay and Package Boundary](../../.work_products/05_decisions/ADR_006_authoring_overlay_and_package_boundary.md): 通用 Harness 配置、项目实例数据和 authoring overlay 分层，README 放用户迁移，PROJECT_SPEC 放稳定设计。
- [ADR 007: UI/UX Design Stage and DESIGN.md Fact Source](../../.work_products/05_decisions/ADR_007_ui_ux_design_stage.md): `UI_UX_DESIGNING` 独立产出体验事实源，visual UI 项目用 `DESIGN.md` 固定视觉系统。
- [ADR 008: Delivery Benchmark Scenario Design](../../.work_products/05_decisions/ADR_008_delivery_benchmark_scenario_design.md): benchmark 用 lifecycle scenarios 验证 Harness 是否降低上下文恢复、RFC/debug 返工和高风险边界错误路径，而不是只比较首轮代码速度。
- [RFC 028: Delivery benchmark clean handoff boundary](../../.work_products/rfc/RFC_028_delivery_benchmark_clean_handoff_boundary.md): 正式 benchmark 的 recovery/RFC/debug 必须从 clean committed product state 开始；baseline 用普通产品交付 commit/push，Harness 用 task commit/push，dirty worktree 只算 calibration。
- [ADR 009: Visual Reconciliation Task Profile](../../.work_products/05_decisions/ADR_009_visual_reconciliation.md): 参考图驱动的 UI/UX、美术和游戏画面任务先做截图对比与人工视觉确认，再进入完整工程闭环。
- [ADR 010: Workflow Work Products Root](../../.work_products/05_decisions/ADR_010_work_products_root.md): `.work_products/**` 是 durable 阶段产物根目录，`.artifacts/**` 保持 ignored temporary root，旧 `.docs/**` 只通过 upgrade migration 迁移。

## Harness Guidance

- 内容保持简短，详细说明链接到 `.work_products/` 下的对应工作产物。
- 短期执行计划写入 `.codex/state/plan.yaml`；长期稳定知识只在这里记录简短摘要和链接。
- 完整决策背景、备选方案、取舍和后果应写入 `.work_products/05_decisions/` ADR 或其它正式 `.work_products/**` 事实源。
