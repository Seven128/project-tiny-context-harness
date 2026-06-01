# ADR 005: Development Self-Test Handoff

Status: Accepted

## Context

开发阶段自测是阶段契约原则在 `SPRINTING` 中的具体体现。自测不是把 TESTING 阶段前移，也不是让开发者完成完整质量验收；它要求开发阶段先证明本 task / 本模块承诺的 runnable entry、核心路径和 observable exit 已经实际跑通。

否则“核心路径没跑通”“入口启动不了”“配置契约缺失”“最小用例无法完成”这类本应在开发阶段关闭的问题，会被留给后续 Review 或 TESTING 阶段处理。测试阶段的职责应是基于已经可运行、已有开发自测证据的入口做独立验证、回归覆盖和最终判断，而不是替开发阶段补 runtime、补入口、补 bootstrap 或排查最小链路为什么不能运行。

高风险 runtime/live/remote-operator task 还会遇到恢复路径、operator path、session reset、do-not-retry 和 evidence pointer 被埋进长文档的问题。会改变下一步动作的判断如果没有被提升为 hard constraint，后续 Agent 很容易继续错误路径。

## Options

- 不要求开发阶段自测，把 runnable entry/exit 判断留给 REVIEWING 或 TESTING。
- 在 implementation doc 中保存完整 debug log、operator log、证据正文和失败探索。
- 把 Development Self-Test Report 收窄成短 handoff card，证据正文、runbook 和探索记录放到独立位置。

## Decision

当 `self_test_contract.status: "required"` 时，implementation doc 必须包含已执行的 `Development Self-Test Report`，记录 `Report Status: PASS | BLOCKED | IN_PROGRESS | STALE`、contract source、Module Application Entry、scenario results、executed gates、Module Key Test Path、必要时的 Module Key Test Graph、Observable Exit、Current Blocker、Testing Handoff Readiness 和 Evidence Index Refs。

`Development Self-Test Report` 只证明模块入口、核心路径、出口和最小证据指针，不承担 debug log、operator log、runbook、evidence dump 或探索流水职责。主报告不得使用 `Actual Evidence` 正文字段；普通报告目标不超过 80 行，high-risk 报告目标不超过 120 行。

凡会改变下一步动作的判断，必须 promoted 到 `resume_capsule.do_not_retry`、runbook 顶部 `Hard Constraints` 或短 `Current Operator Path`；不能只埋在 evidence、notes、appendix 或长 implementation doc 中。

## Rationale

Review、TESTING、发布判断以及后续 RFC / 需求变更需要复用开发阶段事实，避免后来者重新猜测“入口在哪里、核心路径是否跑通过、哪些用例已经验证、哪些问题仍然缺失”。

自测报告如果膨胀成 evidence dump，反而会让入口、核心路径、出口、当前 blocker 和 Testing handoff readiness 难以被消费。短 handoff card 更符合开发阶段报告的职责边界。

## Consequences

- 只有 `Report Status: PASS` 且所有 scenario 为 `PASS` 才能关闭 development task。
- evidence 正文进入 Evidence Index、CI/artifact、runbook appendix 或外部证据系统；主报告只保存 pointer。
- High-risk task 必须维护 resume-first recovery surface，包括 `resume_capsule`、Current Operator Path、Hard Constraints 和 `.work_products/09_runbooks/**` recovery refs。
- Validator 会扫描 session / QR / canonical path / do-not-retry 类关键判断，未 promoted 时 fail。

## Source Trace

- `PROJECT_SPEC.md#2.1`: 开发阶段自测原则。
- `PROJECT_SPEC.md#2.2`: Development Self-Test Report 作为阶段产物。
- `PROJECT_SPEC.md#5.2`: self-test contract、Development Evidence、resume capsule 和 high-risk handoff rules。
- `.work_products/04_implementation/harness_workflow/skills_prompt_and_authoring.md`: prompt 和 validator 实现事实。

## Links

- [PROJECT_SPEC.md](../../PROJECT_SPEC.md)
- [Skills prompt and authoring implementation](../04_implementation/harness_workflow/skills_prompt_and_authoring.md)
- [ADR 004: Lightweight Graph Contracts](ADR_004_lightweight_graph_contracts.md)
