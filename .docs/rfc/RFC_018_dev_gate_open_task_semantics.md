# RFC_018: 修正 validate-dev open task 语义与 package Makefile wiring

## 1. 背景

`SPRINTING` 阶段开发中需要在 `plan.yaml` 保留当前 open task：`current_task_id` 指向正在执行的开发任务，任务状态通常是 `in_progress`，并且必须保留 `allowed_paths`、`required_gates`、`acceptance_criteria` 和 `implementation_doc` 等执行合同。只有代码、测试、implementation doc 和 gate 完成后，task 才从 `plan.yaml` 移除。

当前 `make validate-dev` 的 wiring 与这个协议冲突：它调用 no-open 语义的 `tools/validate_plan.py`，并调用 package consumer 中不会被 sync 的 `tools/validate_dev_state.py`。结果是开发中 gate 无法在正常 open task 状态下闭环。

## 2. 变更内容（Change Content）

- Added: `validate-dev` 的开发中 gate 语义，允许校验当前 open `SPRINTING` task。
- Changed: package CLI `validate-dev` 校验 lifecycle、当前 task、dirty files、draft queue 和 implementation docs。
- Changed: `validate-current` 在 `SPRINTING` 阶段保留 phase-exit no-open 语义。
- Changed: managed Makefile `validate-dev` 通过 `$(SDLC_HARNESS) validate-dev` 运行 package validator，不再直接依赖未同步的 Python tools。
- Unchanged: 其它 Makefile targets 仍可能依赖 `tools/**`；完整工具分发或替换不在本 RFC 范围。

## 3. Product Impact（产品影响）

| 受影响 PRD（Affected PRD） | 影响（Impact） |
|---|---|
| `.docs/01_product/npm_package_distribution.md` | `validate-dev` public behavior 改为支持开发中 open task，并保持 phase-exit safety。 |
| `README.md` / `PROJECT_SPEC.md` | 需要说明 direct dev gate 与 `/advance` / `validate-current` 的区别。 |

## 4. Technical Impact Candidates（技术影响候选）

| 模块（Module） | 影响（Impact） | 置信度（Confidence） |
|---|---|---|
| Package validators | `validate-dev` allow-open，新增 current task 和 dirty path 校验；`validate-current` 对 SPRINTING 继续 no-open。 | high |
| Managed Makefile | `validate-dev` 改用 `SDLC_HARNESS ?= npx sdlc-harness`，避免缺失 Python tool。 | high |
| Workflow docs/skills | 更新 dev、manager、README 和 implementation docs 的 gate 语义。 | high |
| Consumer lab / tests | 翻转旧的 open task rejection 预期，增加 Makefile dev gate PASS coverage。 | high |

## 5. Acceptance Criteria

- [x] `validate-dev` 接受合法的当前 open `SPRINTING` task。
- [x] `validate-current` 在 `SPRINTING` 有 open task 时失败。
- [x] `make validate-dev` 不直接调用 `tools/validate_dev_state.py` 等未同步 Python validators。
- [x] package source sync/check 通过。

## 6. Regression Requirements（回归要求）

- [x] `npm test --workspace agent-project-sdlc`
- [x] `node packages/sdlc-harness/dist/cli.js package sync-source`
- [x] `node packages/sdlc-harness/dist/cli.js package check-source`
- [x] `make validate-rfc`
- [x] `make validate-harness`

## 7. Test Fact Source Impact（测试事实源影响）

- Reviewed test docs: `.docs/07_test/TEST_REPORT.md`, `.docs/07_test/harness_consumer_lab.md`
- Superseded test docs: none
- Retained test docs: `.docs/07_test/TEST_REPORT.md`, `.docs/07_test/harness_consumer_lab.md`
- Reason: 本 RFC 改变 dev gate wiring，不替换测试事实源。

## 8. Status

- Status: VERIFIED
