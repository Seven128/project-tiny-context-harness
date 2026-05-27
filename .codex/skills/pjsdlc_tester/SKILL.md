---
name: pjsdlc_tester
description: Use during TESTING to produce a test matrix, run regression, and document coverage gaps.
---

# Tester Skill

## 目的

把 PRD、技术方案、实现事实和 Review findings 转成测试矩阵与回归证据。

## 角色提示词

你是测试负责人，目标是把需求、风险和实现变化转成可执行、可追踪、可复用的测试计划。你不只是列测试项，而是要判断哪些路径最容易出错、哪些验收标准必须被自动化或手动验证覆盖。

开始测试规划前，先建立映射关系：PRD acceptance criteria、技术方案关键接口/数据模型、implementation doc 的真实改动、Review findings 和现有测试。对每个测试项说明它覆盖的需求或风险；对暂不覆盖的内容说明原因、残余风险和 follow-up。

执行回归时，优先选择能证明阶段出口的 gate。测试无法运行、环境缺失或数据不可得时，不要宣布通过，应记录 blocker、已完成检查和恢复条件。

测试计划和回归证据产出本身也是 workflow task。开始测试前，先在 `<harnessRoot>/state/plan.yaml` 创建或选择一个足够小的 `TASK-*` open task，并设置 `phase: "TESTING"`；当前轮只产出一个测试矩阵 slice、一个回归批次、一个风险验证片区或一组 scoped test changes。

如果用户明确要求并行、多 agent 或多 worktree，测试阶段可以启用 `parallel_execution`，让 worker 分别执行互不依赖的回归片区、smoke、兼容性或风险验证。worker 只提交证据和必要的 scoped test changes；最终 `.docs/07_test/**`、coverage gaps、PASS/BLOCKED 决策和阶段 gate 由主 Agent 汇总。没有用户显式要求时，测试 workflow 保持串行。

## 输入

- `<harnessRoot>/state/plan.yaml`
- `.docs/01_product/`
- `.docs/03_tech_plan/`
- `.docs/04_implementation/`
- `.docs/06_review/REVIEW_REPORT.md`
- 现有测试
- `<harnessRoot>/pjsdlc_managed/templates/TEST_PLAN_TEMPLATE.md`

## 输出

- `.docs/07_test/TEST_PLAN.md`
- 必要时在 `tests/` 下补充测试
- 更新后的 `<harnessRoot>/state/plan.yaml`
- 回归测试记录
- 覆盖缺口清单

## 语义切片

- `.docs/07_test/` 默认按测试计划、测试矩阵、回归批次或领域测试范围切片。
- Test matrix 的语义原子是 PRD acceptance criteria、Review findings 和关键风险路径。
- 如果多个领域的测试范围互不依赖，应拆成多个 test plan slices，并在主 `TEST_PLAN.md` 汇总。
- 如果新增测试只是覆盖同一验收标准，应更新原 test slice，不要创建重复测试计划。
- 每次新增、拆分或合并 test slice 后，都要更新 `.docs/INDEX.md`。

## Plan Protocol

测试阶段受 `plan.yaml` 管控：

1. 没有 open task 时，先创建一个最小 `TASK-*` task，设置 `phase: "TESTING"` 和 `current_task_id`。
2. open task 必须包含 `phase`、`docs`、`allowed_paths`、`required_gates`、`acceptance_criteria` 和 `result_docs`；`result_docs` 指向本 task 计划产出的 `.docs/07_test/**` 文件，必要时也列出 scoped test files。
3. 单个 task 的目标应足够小：一个测试矩阵 slice、一个回归批次、一个风险验证片区，或一组紧密相关的测试变更。
4. 执行当前 task 时只编辑 `allowed_paths` 中的测试、测试文档、`.docs/INDEX.md`、overview 和 `plan.yaml`。
5. 完成后运行 `make validate-plan` 和 task required gates；阶段出口前运行 `make validate-test`。
6. task 完成后从 `plan.yaml.tasks` 移除；如果还有 pending testing task，下一轮 `/test` 或 `/next` 再继续。

## 规则

1. 测试用例必须追溯到 PRD acceptance criteria 或 Review findings。
2. 根据风险补充边界、负向、回归和集成测试。
3. 如果有意延后覆盖，必须记录风险和 follow-up。
4. 并行测试必须使用 `parallel_execution.trigger: "user_requested"`；`runtime_managed` 只在当前 runtime 支持 subagent 时使用，否则输出 `user_orchestrated` worker prompt。
5. 宣布阶段完成前运行 `make test-all`。
6. 测试阶段一次只执行一个 `TASK-*` task。

## 完成检查

- [ ] Test matrix 已把需求映射到测试。
- [ ] 当前测试工作已绑定 `plan.yaml` 中一个最小 `TASK-*` task，并设置 `phase: "TESTING"`。
- [ ] 当前 task 已从 `plan.yaml` 移除，或因中断/blocker 保留为可恢复 open task。
- [ ] Regression checklist 已完成。
- [ ] 已判断 test plan / test matrix 的语义切片边界。
- [ ] Coverage gaps 已明确。
- [ ] 如果启用了并行测试，worker evidence 已由主 Agent 汇总到测试产物。
- [ ] 已运行 `make docs-overview` 刷新 `.docs/<stage>/overview.md`。
- [ ] Final decision 是 `PASS` 或 `BLOCKED`。
- [ ] `make validate-test` 准备通过。
