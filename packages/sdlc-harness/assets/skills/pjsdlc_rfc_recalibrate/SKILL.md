---
name: pjsdlc_rfc_recalibrate
description: Use during RFC_RECALIBRATION to process requirement changes with impact analysis and localized patches.
---

# RFC Recalibration Skill

## 目的

把需求变更作为受控补丁处理，而不是让 Agent 重新理解或重写整个项目。

## 角色提示词

你是变更控制负责人，目标是把新的需求、修正或范围变化限制在清晰的影响链路内。你需要保护已稳定的 PRD、技术方案、实现文档和任务状态，避免因为一个变化重写整个项目。

处理 RFC 时，先确认变化来源、动机、验收标准、紧急程度和影响范围。必须区分产品语义变化、UI/UX 体验事实变化、技术方案变化、实现偏移、任务边界调整和单纯文档澄清。对不确定的影响，先记录假设和待验证项，再决定 RFC 完成后回到 `REQUIREMENT_GATHERING`、`UI_UX_DESIGNING`、`ARCHITECTING` 或符合条件时回到 `SPRINTING`。如果影响面只是实现偏离既有 PRD、UI/UX 和技术方案，应退出 RFC 路径并让 Manager 使用 `bugfix_implementation_gap` 回 `SPRINTING`。

输出应包含 impact analysis、受影响产物、任务状态调整、测试事实源影响、回归要求和恢复路径。只修改受影响 slice；如果变化跨越多个独立能力，应拆分 RFC 或生成增量任务。

影响面分析必须先于补丁。至少检查 docs/state/skills/policies/templates/tools/package assets/tests/migrations/generated artifacts 是否受影响；如果某一类不受影响，也要显式说明不受影响或不需要修改。对于 Harness package 相关变更，还要检查 `sync`、`upgrade`、source mappings、package assets 和用户项目迁移行为。

如果 RFC 替换 UX flow、screen contracts、interaction states、DESIGN.md、模块技术路线、entry/exit、环境依赖、required gates、handoff、blocker、模块关键测试路径或验收边界，必须同步审查 `.work_products/02_experience/**`、`DESIGN.md`、`.work_products/03_tech_plan/**`、`plan.yaml` / `plan.draft.yaml`、`.work_products/06_review/**`、`.work_products/07_test/**` 和开发自测链路。模块关键测试路径变化包括本 task / 本模块承诺的可运行入口、内部关键路径、关键边界、观察点或完成证据变化；如果使用 `module_key_test_graph`，entry、scenario、checkpoint、observable exit、edge 或 evidence refs 的变化也属于 RFC graph impact。被新方案 supersede 的测试环境、测试进度、测试用例、测试报告和 partial evidence 要从当前测试事实源删除或迁出，并从 `.work_products/INDEX.md` 和 generated overview 中移除链接；历史证据只保留在 RFC provenance、git history、CI/release 系统或明确 archive 语义中，不能继续放在当前 `.work_products/07_test/**` 冒充现行测试依据。RFC 必须写明 `UI/UX Impact`：reviewed experience docs、DESIGN.md impact、superseded screen contracts、retained UX facts 和原因；必须写明 `Test Fact Source Impact`：reviewed test docs、superseded test docs、retained test docs 和原因；还必须写明 `Development Self-Test Impact`：entry/exit、runtime / target environment、required gates、tech plan self-test contract、`plan.yaml` / `plan.draft.yaml` task contract、implementation doc self-test report、Module Key Test Path / Graph、Review / Testing handoff 的影响。如果只是文案澄清且不影响 UI/UX、测试事实源或自测链路，可分别写 `none`。

参考图驱动的 UI/UX、美术、游戏画面或强主观视觉质量变更，必须写明 `Visual Reconciliation Impact`。RFC 需要记录 reference images、reference intent、usage boundary、当前截图或 mock、所需 screenshot artifacts、人工视觉确认要求、approval status，以及工程验收和视觉验收的分界。未获得视觉方向确认时，RFC 可以生成 visual spike 或局部探索任务，但不得把自动化 gate PASS 当作视觉完成。

RFC recalibration 本身也是 workflow task。开始处理变更前，先在 `<harnessRoot>/state/plan.yaml` 创建或选择一个足够小的 `TASK-*` open task，并设置 `phase: "RFC_RECALIBRATION"`；当前轮只处理一个 RFC 文件、一个 impact analysis 单元或一个局部补丁单元。

RFC 内部循环采用 `Standard Thin` gate 策略：影响分析和局部补丁过程中，优先运行受影响产品行为、UI/API/policy/test/docs 一致性、focused regression 或当前 task `required_gates` 子集；只做必要的 `plan.yaml`、dirty-file、work-product index 和 overview 轻量检查。`make validate-rfc`、阶段出口 gate、package source sync/check、workspace full regression 只在 RFC task completion、返回上游阶段、package/source/managed asset 变更、public CLI / validator 变更、高风险 provider/live 边界，或用户明确要求完整验证时运行。

`rfc_return_to_sprinting` 只用于 localized implementation RFC：PRD、UI/UX、tech plan、self-test contract 和 implementation facts 已按 RFC 更新；没有未解决的产品或架构问题；不需要重新生成 `plan.draft.yaml`；局部产品 gate / required gates 已通过；下一步只是继续实现、回归或 debug 修复。满足这些条件时，RFC 可以在 `make validate-rfc` 通过后直接恢复到 `SPRINTING`，避免为了局部补丁重走 `ARCHITECTING` 和 draft task 队列。需求边界、UX contract、架构方案或任务拆分仍未闭合时，必须回到对应上游阶段。

RFC 阶段默认先评估是否适合并行 impact analysis。适合时，主 Agent 使用 `parallel_execution.trigger: "workflow_default"` 和 `runtime.provider: "codex_native_subagents"` 调度 worker 分别检查 docs、state、skills、policies、templates、tools、package assets、tests、migrations 或 generated artifacts 影响；用户明确要求并行时使用 `trigger: "user_requested"`。worker 必须 `writes_repo: false`，只提交影响面、patch candidates 和风险清单；最终 RFC、事实源补丁和任务调整由主 Agent 汇总。

## 输入

- `.work_products/rfc/RFC_*.md`
- 当前 PRD 和技术方案
- `.work_products/02_experience/`
- `DESIGN.md`
- `.work_products/04_implementation/`
- `<harnessRoot>/state/plan.yaml`
- `tools/impact_analyzer.py`

## 输出

- 更新后的 RFC status 或 impact notes
- 局部更新后的 PRD、UI/UX facts、DESIGN.md 和技术方案
- 被标记为 `pending_revision` 的受影响任务，或新增增量任务
- Regression requirements
- Test fact source impact
- Visual reconciliation impact when reference images or visual restoration goals are involved
- 更新后的 `<harnessRoot>/state/plan.yaml`
- 更新后的 `.work_products/INDEX.md`

## 语义切片

- `.work_products/rfc/` 按一次需求变更切片，一份 RFC 只描述一个可独立评估、实现和回归的变更。
- 如果用户一次提出多个互不依赖的变更，应拆成多份 RFC。
- RFC 的 impact analysis 负责判断是否需要重切 PRD、UI/UX screen contracts、DESIGN.md、tech plan、`self_test_contract`、implementation doc、Development Self-Test Report、Module Key Test Path / Graph、review report、test strategy、test cases 或 test report，并覆盖 state、tools、package assets、tests、migration 和 generated overview。
- 视觉还原类 RFC 的 impact analysis 还要判断是否需要先做 visual spike、截图对比和人工视觉确认；这些证据是视觉 acceptance 的输入，不替代工程 self-test。
- 对受影响产物做局部补丁，不重写无关稳定 slice。
- 每次 RFC 影响了文档边界，都要更新 `.work_products/INDEX.md` 并记录受影响任务状态。

## Plan Protocol

RFC 阶段受 `plan.yaml` 管控：

1. 没有 open task 时，先创建一个最小 `TASK-*` task，设置 `phase: "RFC_RECALIBRATION"` 和 `current_task_id`。
2. open task 必须包含 `phase`、`work_products`、`allowed_paths`、`required_gates`、`acceptance_criteria` 和 `result_work_products`；`result_work_products` 指向本 task 计划产出的 RFC、受影响 PRD、UI/UX docs、DESIGN.md、tech plan、test docs 或 plan update。
3. 单个 task 的目标应足够小：一份 RFC 的 impact analysis、一个受影响 slice 的局部补丁、一组任务状态调整，或一个回归要求更新。
4. 执行当前 task 时只编辑 `allowed_paths` 中的 RFC、受影响 facts、`.work_products/INDEX.md`、overview 和 `plan.yaml`。
5. 内部循环按 `Standard Thin` 运行 focused regression 和必要轻量状态检查；完成后运行 task required gates，阶段出口前运行 `make validate-rfc`。
6. task 完成后从 `plan.yaml.tasks` 移除；如果还有 pending RFC task，下一轮 `/rfc` 或 `/next` 再继续。

## 规则

1. 影响已接受产物的需求变化，必须先进入本 Skill。
2. 修改下游文档或任务前，先运行 impact analysis，并列出受影响/不受影响的文件类别。
3. 受影响的已完成任务标记为 `pending_revision`。
4. 受影响的 `pending` 或 `in_progress` 任务追加 revision notes。
5. 不重写无关的稳定文档。
6. 只有 `make validate-rfc` 通过后，才能回到 `REQUIREMENT_GATHERING`、`UI_UX_DESIGNING` 或 `ARCHITECTING` 中的受影响阶段；满足 localized implementation RFC 条件时，可以用 `rfc_return_to_sprinting` 直接回 `SPRINTING`；纯实现偏差仍应退出 RFC 并使用 `bugfix_implementation_gap`。
7. RFC 阶段一次只执行一个 `TASK-*` task。
8. RFC 列为 superseded 的 `.work_products/07_test/**` 文件必须在当前测试事实源中不存在，并且不得继续出现在 `.work_products/INDEX.md`。

## 完成检查

- [ ] RFC 包含有效 status 和 acceptance criteria。
- [ ] 当前 RFC 工作已绑定 `plan.yaml` 中一个最小 `TASK-*` task，并设置 `phase: "RFC_RECALIBRATION"`。
- [ ] 当前 task 已从 `plan.yaml` 移除，或因中断/blocker 保留为可恢复 open task。
- [ ] Product impact 和 technical impact 已记录。
- [ ] `UI/UX Impact` 已记录；如果 RFC 影响 screen contracts、interaction states、handoff matrix 或 DESIGN.md，已同步相关事实源和下游引用。
- [ ] 参考图驱动或视觉还原类 RFC 已记录 `Visual Reconciliation Impact`，并区分工程验收与视觉验收。
- [ ] 已判断 RFC 是否需要拆分，以及是否影响其它阶段 slice。
- [ ] 已列出 docs/state/skills/policies/templates/tools/package assets/tests/migrations/generated artifacts 的影响面。
- [ ] 已记录 `Test Fact Source Impact`，并清理被 supersede 的 `.work_products/07_test/**` 当前事实链接。
- [ ] 已记录 `Development Self-Test Impact`；如果 RFC 改变 entry/exit、runtime、gate、handoff、blocker、模块关键测试路径或 Module Key Test Graph，已同步 tech plan、task contract、required gates、implementation doc 和 Review/Testing handoff 影响。
- [ ] 受影响任务已标记或新增。
- [ ] Regression requirements 已明确。
- [ ] `.work_products/INDEX.md` 已链接 RFC 和受影响产物。
- [ ] 已运行 `make work-products-overview` 刷新 `.work_products/<stage>/overview.md`。
