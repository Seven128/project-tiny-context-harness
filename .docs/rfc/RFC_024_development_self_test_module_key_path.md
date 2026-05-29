# RFC_024: 开发自测报告记录模块关键测试路径

## 1. 背景

`RFC_023` 已把 `Development Self-Test Contract` 和 `Development Self-Test Report` 作为开发阶段完成条件，要求记录 contract source、scenario results、executed gates、actual evidence、missing/blockers 和 Testing Handoff Readiness。

但实际 debug 和阶段交接还需要一个更直接的路径摘要：从本地启动或调用入口开始，执行并完成 `self_test_contract` 中全部自测用例的模块关键测试路径。该路径应覆盖本 task / 本模块承诺的所有可运行入口，以及自测用例实际经过的内部关键路径、关键边界、观察点和可观测完成证据。如果报告只列结果，不记录这条路径，后续 Agent 调试时仍需要重新摸索“从哪里启动、经过哪些模块入口和内部关键路径、怎么看中间点、怎样确认所有自测用例跑完”。

## 2. 变更内容（Change Content）

- Added: `self_test_contract.module_key_test_path`，由 ARCHITECTING 或 RFC_RECALIBRATION 预先定义从本地启动或调用入口到完成全部自测 scenario 的模块关键测试路径，覆盖本 task / 本模块承诺的所有可运行入口和内部关键路径。
- Added: `Development Self-Test Contract` 模板中的 `Module key test path` 字段。
- Added: `Development Self-Test Report` 模板中的 `Module Key Test Path` 字段，记录开发阶段实际执行的本地到自测完成路径，包括实际入口、内部关键路径、关键边界、观察点和可观测完成证据。
- Changed: Dev、Architect、RFC、Implementation Doc、Reviewer、Tester prompts 同步要求维护和消费该路径摘要。
- Changed: `validate-design` / `validate-dev` 对 runnable-boundary `self_test_contract.status: "required"` 强制检查 `module_key_test_path` 和报告字段。
- Changed: `validate-rfc` 对 test route / module key path / debug path 相关 RFC 文本要求 `Development Self-Test Impact`。

## 3. Product Impact（产品影响）

| 受影响 PRD（Affected PRD） | 影响（Impact） |
|---|---|
| `.docs/01_product/npm_package_distribution.md` | 强化 package validators 和 workflow assets 的 public behavior：开发自测报告必须能复用为后续 debug 路径。 |
| `README.md` / `packages/sdlc-harness/README.md` / `PROJECT_SPEC.md` | 对外说明 `module_key_test_path` 和 `Development Self-Test Report` 的新增必填字段。 |

## 4. Technical Impact Candidates（技术影响候选）

| 模块（Module） | 影响（Impact） | 置信度（Confidence） |
|---|---|---|
| Package validators | `validate-design`、`validate-dev`、`validate-rfc` 增加模块关键测试路径检查。 | high |
| Python validators | 本仓库 Makefile 使用的 `validate-design` / `validate-rfc` 同步检查合同字段和 RFC trigger terms。 | high |
| Workflow skills/templates | 更新 Architect、Dev、RFC、Implementation Doc、Reviewer、Tester 和 tech plan / plan / implementation / RFC templates。 | high |
| Package assets | 通过 `package sync-source` 同步 managed assets。 | high |
| Tests / consumer lab | 更新 validator regression 与 consumer lab fixture。 | high |

## 5. Acceptance Criteria

- [x] runnable-boundary task 的 `self_test_contract.status: "required"` 缺少 `module_key_test_path` 时被 validator 拒绝。
- [x] tech plan 的 `Development Self-Test Contract` 缺少 `Module key test path` 时被 `validate-design` 拒绝。
- [x] implementation doc 的 `Development Self-Test Report` 缺少 `Module Key Test Path` 时被 `validate-dev` 拒绝。
- [x] `Module Key Test Path` 是 placeholder 时被 `validate-dev` 拒绝。
- [x] 完整合同、报告、scenario result、required gates 和模块关键测试路径一致时通过；路径覆盖本 task / 本模块承诺的入口和内部关键路径。

## 6. Regression Requirements（回归要求）

- [x] `npm test --workspace agent-project-sdlc`
- [x] `node packages/sdlc-harness/dist/cli.js package sync-source`
- [x] `node packages/sdlc-harness/dist/cli.js package check-source`
- [x] `make docs-overview`
- [x] `make validate-harness`
- [x] `make validate-plan`
- [x] `make validate-rfc`
- [x] `node packages/sdlc-harness/dist/cli.js validate-dev`

## 7. Test Fact Source Impact（测试事实源影响）

- Reviewed test docs: `.docs/07_test/TEST_REPORT.md`, `.docs/07_test/harness_consumer_lab.md`
- Superseded test docs: none
- Retained test docs: `.docs/07_test/TEST_REPORT.md`, `.docs/07_test/harness_consumer_lab.md`
- Reason: 本 RFC 强化开发阶段自测报告和 debug handoff evidence，不替换当前 TESTING 事实源。

## 8. Development Self-Test Impact（开发自测影响）

- Entry/exit impact: runnable-boundary task 的自测合同必须描述从本地启动或调用入口到完成所有自测 scenario 的模块关键测试路径，覆盖本 task / 本模块承诺的所有可运行入口。
- Runtime / target environment impact: `module_key_test_path` 补充 `runnable_entry`、`observable_exit`、`evidence_level.required` 和 `target_runtime_environment`，并记录内部关键路径、关键边界、观察点和完成证据，用于调试复用。
- Required gates impact: 不新增 gate 类型；现有 `self_test_contract.required_gates` 仍必须同步到 task `required_gates`。
- Tech plan self-test contract impact: tech plan template 的 `Development Self-Test Contract` 新增 `Module key test path`。
- `plan.yaml` / `plan.draft.yaml` task contract impact: runnable-boundary SPRINTING task 的 `self_test_contract` 新增 `module_key_test_path`。
- Implementation doc self-test report impact: `Development Self-Test Report` 新增 `Module Key Test Path`，记录从本地启动到全部自测 scenario 完成的实际路径，以及自测实际经过的内部关键路径和可观测完成证据。
- Review / Testing handoff impact: Review/Testing 可复用该路径定位入口、模块边界、关键中间观察点和自测完成证据；不新增 TESTING 阶段 runtime 搭建职责。

## 9. Status

- Status: APPLIED
