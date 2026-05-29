# RFC_023: 开发阶段自测合同与报告强化

## 1. 背景

近期反馈指出：现有 SPRINTING Definition of Done 已要求 runnable entry/exit、初始化、配置契约、可观测输出和 Basic Self-test Evidence，但约束仍偏向字段和格式。实际执行中可能出现“RFC 或技术方案文字上成立，但开发任务入口、required gates、implementation doc evidence 和 Review/Testing handoff 没有同步”的状态。

这会让开发阶段被误判为完成：Harness gate 能证明骨架、文档链接和 evidence 字段存在，却不能充分证明模块级可运行交付边界已经能被 Review/Testing 消费。

## 2. 变更内容（Change Content）

- Added: tech plan 和 runnable-boundary task 的 `Development Self-Test Contract` / `self_test_contract`。
- Added: implementation doc 的 `Development Self-Test Report`，作为 SPRINTING 阶段已执行自测事实。
- Changed: `validate-design` 检查 runnable-boundary draft task 是否有 `self_test_contract`，并确认其 `source` 指向包含 `Development Self-Test Contract` 的 tech plan slice。
- Changed: `validate-dev` 检查当前 SPRINTING task 的 `self_test_contract`、task `required_gates` 和 implementation doc `Development Self-Test Report` 是否一致。
- Changed: `validate-rfc` 对 `RFC_023` 之后涉及 entry/exit、runtime、gate、handoff 或 blocker 的 RFC 要求 `Development Self-Test Impact`。
- Changed: Dev、Architect、RFC、Implementation Doc、Reviewer、Tester prompts 和 managed templates 同步描述自测合同/报告边界。

## 3. Product Impact（产品影响）

| 受影响 PRD（Affected PRD） | 影响（Impact） |
|---|---|
| `.docs/01_product/npm_package_distribution.md` | 强化 package validators 和 workflow assets 的 public behavior：开发阶段必须证明模块级可运行交付边界可自测。 |
| `README.md` / `packages/sdlc-harness/README.md` / `PROJECT_SPEC.md` | 对外说明 `self_test_contract`、`Development Self-Test Contract` 和 `Development Self-Test Report`。 |

## 4. Technical Impact Candidates（技术影响候选）

| 模块（Module） | 影响（Impact） | 置信度（Confidence） |
|---|---|---|
| Package validators | `validate-design`、`validate-dev`、`validate-rfc` 增加自测合同与报告检查。 | high |
| Python validators | 本仓库 Makefile 使用的 `validate-design` / `validate-rfc` 同步检查自测合同和 RFC impact。 | high |
| Workflow skills/templates | 更新 Architect、Dev、RFC、Implementation Doc、Reviewer、Tester 和 tech plan / plan / implementation / RFC templates。 | high |
| Package assets | 通过 `package sync-source` 同步 managed assets。 | high |
| Tests / consumer lab | 增加 validator regression，并更新 consumer lab fixture。 | high |

## 5. Acceptance Criteria

- [x] runtime/page/API/worker/provider/live 类 task 缺少 `self_test_contract` 时被 validator 拒绝。
- [x] `self_test_contract.required_gates` 未同步到 task `required_gates` 时被 validator 拒绝。
- [x] tech plan source 缺少 `Development Self-Test Contract` 时被 `validate-design` 拒绝。
- [x] implementation doc 缺少 `Development Self-Test Report` 或 scenario result 时被 `validate-dev` 拒绝。
- [x] scenario result 为 `BLOCKED` 时，开发 task 不能关闭。
- [x] `RFC_023` 之后涉及 entry/exit/runtime/gate/handoff/blocker 的 RFC 缺少 `Development Self-Test Impact` 时被拒绝。

## 6. Regression Requirements（回归要求）

- [x] `npm test --workspace agent-project-sdlc`
- [x] `node packages/sdlc-harness/dist/cli.js package sync-source`
- [x] `node packages/sdlc-harness/dist/cli.js package check-source`
- [x] `make docs-overview`
- [x] `make validate-harness`
- [x] `make validate-rfc`

## 7. Test Fact Source Impact（测试事实源影响）

- Reviewed test docs: `.docs/07_test/TEST_REPORT.md`, `.docs/07_test/harness_consumer_lab.md`
- Superseded test docs: none
- Retained test docs: `.docs/07_test/TEST_REPORT.md`, `.docs/07_test/harness_consumer_lab.md`
- Reason: 本 RFC 强化开发阶段自测合同和 handoff evidence，不替换当前 TESTING 事实源。

## 8. Development Self-Test Impact（开发自测影响）

- Entry/exit impact: runnable-boundary task 必须在 tech plan / task contract 中声明自测入口和可观测出口。
- Runtime / target environment impact: `self_test_contract` 与 `evidence_level.required`、`target_runtime_environment` 一起描述开发阶段交付边界。
- Required gates impact: `self_test_contract.required_gates` 必须同步到 task `required_gates`。
- Tech plan self-test contract impact: tech plan template 新增 `Development Self-Test Contract`。
- `plan.yaml` / `plan.draft.yaml` task contract impact: runnable-boundary SPRINTING task 新增 `self_test_contract`。
- Implementation doc self-test report impact: implementation doc template 新增 `Development Self-Test Report`，`Basic Self-test Evidence` 指向该报告。
- Review / Testing handoff impact: Review/Testing 只消费已完成自测报告和 Testing Handoff Contract，不新增 runtime 搭建职责。

## 9. Status

- Status: APPLIED
