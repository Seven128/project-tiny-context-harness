# ADR 009: Visual Reconciliation Task Profile

Status: Accepted

## Context

参考图驱动的 UI/UX、美术、游戏画面和 HUD 重做任务，与普通确定性工程任务不同。用户真正关心的第一验收点通常是“运行截图是否接近参考图”，而不是资产是否成功加载、sprite 是否渲染、类型检查是否通过或 E2E 是否绿色。

已有 Harness 已经有 `UI_UX_DESIGNING`、`DESIGN.md`、RFC 和 `SPRINTING` 自测合同，但这些机制更擅长固定事实源、技术路径和 runnable entry/exit。它们不能天然证明主观视觉质量达标。之前的执行暴露出一个 workflow gap：Agent 容易在视觉方向尚未确认前进入完整 RFC / 开发 / gate / 提交流程，造成工程闭环很完整，但画面仍不像参考图。

## Options

- 继续把视觉还原当作普通 UI/UX 或 SPRINTING task，只靠现有 gate 和截图 evidence。
- 新增完整 lifecycle phase，例如 `VISUAL_SPIKE` 或 `DESIGN_RECONCILIATION`。
- 新增轻量 `visual_reconciliation` task profile，在现有 `UI_UX_DESIGNING`、RFC 和 SPRINTING 任务内要求截图对比和人工视觉确认。

## Decision

采用轻量 `visual_reconciliation` task profile，而不是新增完整 lifecycle phase。

当用户提供参考图、截图、视觉稿，或要求“像这张图”“还原风格”“美术重做”“游戏画面重做”“HUD/角色/资产更像参考图”时，Manager 和 UI/UX Skill 先识别为参考图驱动的视觉任务。默认流程是：

1. 记录 reference images、reference intent 和 usage boundary。
2. 快速产出当前运行截图、局部 mock 或低成本 visual spike。
3. 做 reference vs screenshot 的差异分析。
4. 列出下一轮改动清单。
5. 等待用户人工视觉确认。
6. 获得 `approval_status: approved` 后，再进入正式 RFC、技术方案、SPRINTING 和完整 gate 闭环。

`assetKeys`、sprite 渲染、fallback 关闭、自动化测试和 `validate-dev PASS` 是工程验收，不等于视觉验收。对 `human_visual_approval_required: true` 的任务，只有用户确认后才能声称视觉目标达成。

## Rationale

不新增完整 phase 的原因是视觉探索具有高主观性和短反馈周期，强行加入 phase graph 会增加迁移、validator、transition 和 package compatibility 成本，还会把本应快速试错的工作变成新一层重流程。

使用 task profile 的好处是足够轻：它只给当前 task 增加稳定字段和 prompt 保护，不改变 lifecycle graph；同时又足够明确：Manager 能识别参考图需求，UI/UX 能产出截图对比，RFC 能记录视觉影响，SPRINTING 能区分工程 gate 和视觉达标。

这符合 Harness 的 lightweight-constraint 原则：先用角色提示词、模板字段和人工确认把 Agent 注意力对齐到真实验收目标；只有当同类遗漏重复发生或需要机器证明时，才升级为更重 validator 或专用执行器。

## Consequences

- `plan.yaml` task 可以声明 `visual_reconciliation.required: true`、`reference_images`、`screenshot_artifacts`、`human_visual_approval_required` 和 `approval_status`。
- `UI_UX_DESIGN_TEMPLATE.md` 增加 Visual reconciliation section，用于记录参考图、截图、差异分析和人工确认。
- RFC 模板增加 `Visual Reconciliation Impact`，使进入开发后的视觉变更仍能受控影响分析。
- Dev Skill 明确区分工程验收与视觉验收，避免用绿色 gate 关闭未达标的视觉目标。
- 现阶段不新增 phase graph 节点、transition edge、visual diff engine、Figma/Stitch 集成或截图相似度 validator。

## Source Trace

- User feedback: reference-image-driven climbing game visual redo exposed that complete engineering gates did not imply visual match to the “Boulder & Balance” target style.
- `.codex/skills/pjsdlc_manager/SKILL.md`: visual reconciliation routing.
- `.codex/skills/pjsdlc_uiux_design/SKILL.md`: reference image intake and screenshot comparison.
- `.codex/skills/pjsdlc_dev_sprint/SKILL.md`: engineering vs visual completion boundary.
- `.codex/pjsdlc_managed/templates/PLAN_TEMPLATE.yaml`: task-level `visual_reconciliation` fields.
- `.codex/pjsdlc_managed/templates/UI_UX_DESIGN_TEMPLATE.md`: visual reconciliation evidence section.

## Links

- [PROJECT_SPEC.md](../../PROJECT_SPEC.md)
- [README.md](../../README.md)
- [package README](../../packages/sdlc-harness/README.md)
- [UI/UX Skill](../../.codex/skills/pjsdlc_uiux_design/SKILL.md)
- [Manager Skill](../../.codex/skills/pjsdlc_manager/SKILL.md)
