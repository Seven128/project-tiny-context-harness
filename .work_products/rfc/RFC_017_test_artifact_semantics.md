# RFC_017: 测试产物语义与 RFC 清理规则修正

## 1. 背景

微信机器人模块的旧路线曾留下云端、`x weixin`、iLink、OpenClaw 等测试环境和测试进度文档；随后模块通过 RFC 重校准为 Windows PC 微信客户端、本地只读 reader CLI、`pywechat` RPA writer、MiMo agent、人工审核和风控队列的新方案。开发尚未完成真实可测试 entry/exit 时，`.work_products/07_test/**` 中已经出现测试报告形态和旧路线测试结果，会误导后续 TESTING 阶段。

Harness 需要把测试策略、测试用例、执行报告和历史测试证据严格分开：`TEST_REPORT.md` 只代表实际执行后的证据；开发未交付可测应用前不生成正式测试产物；RFC 改变模块方案后，旧测试结果必须清出当前测试事实源。

## 2. 变更内容（Change Content）

- Added: `TEST_STRATEGY.md` 和 `TEST_CASES.md` 文档语义与模板。
- Added: RFC `Test Fact Source Impact` 段，要求列出 reviewed、superseded 和 retained test docs。
- Changed: `validate-test` 只读取 `.work_products/07_test/TEST_REPORT.md`，不再 fallback 到 `TEST_PLAN.md`。
- Changed: `validate-plan` 拒绝非 `TESTING` / `RFC_RECALIBRATION` task 指向 `.work_products/07_test/**`。
- Changed: RFC 替换技术路线、entry/exit 或验收边界时，必须清理被 supersede 的测试事实源和 `.work_products/INDEX.md` 链接。
- Removed: 当前仓库 `.work_products/07_test/TEST_PLAN.md` legacy alias 作为活跃测试事实源。
- Unchanged: 历史测试证据仍可通过 RFC provenance、git history、CI/release 系统追溯；不新增 `<harnessRoot>/archive/**`。

## 3. Product Impact（产品影响）

| 受影响 PRD（Affected PRD） | 影响（Impact） |
|---|---|
| `.work_products/01_product/npm_package_distribution.md` | 更新 TESTING / RFC workflow 对外行为：测试报告必须是执行后证据，旧测试事实由 RFC 清理。 |
| `PROJECT_SPEC.md` / `README.md` | 用户可见说明需要区分 `TEST_STRATEGY.md`、`TEST_CASES.md` 和 `TEST_REPORT.md`。 |

## 4. Technical Impact Candidates（技术影响候选）

| 模块（Module） | 影响（Impact） | 置信度（Confidence） |
|---|---|---|
| Workflow skills | 更新 tester、reviewer、rfc prompts 的测试产物语义和清理规则。 | high |
| Templates / policies | 新增 strategy/cases 模板，更新 RFC/report 模板和阶段 contract。 | high |
| Validators | Python 和 TypeScript validator 同步拒绝 report fallback、占位 report、非法 `.work_products/07_test/**` task 和残留 superseded test docs。 | high |
| Package assets | 通过 `package sync-source` 同步 managed skills/templates/policies/README 到 npm assets。 | high |
| Tests | 更新 validator regression 和 consumer lab fixture。 | high |

## 5. Acceptance Criteria

- [x] `validate-test` 只接受真实 `.work_products/07_test/TEST_REPORT.md`，拒绝 `TEST_PLAN.md` fallback 和占位内容。
- [x] 非 `TESTING` / `RFC_RECALIBRATION` task 不能把 `.work_products/07_test/**` 放入 `allowed_paths` 或 `result_work_products`。
- [x] RFC 中列为 superseded 的 `.work_products/07_test/**` 文件不存在于当前测试事实源，也不出现在 `.work_products/INDEX.md`。
- [x] Package assets 与 authoring source 同步。

## 6. Regression Requirements（回归要求）

- [x] `npm test --workspace agent-project-sdlc`
- [x] `node packages/sdlc-harness/dist/cli.js package check-source`
- [x] `make validate-rfc`
- [x] `make validate-harness`

## 7. Test Fact Source Impact（测试事实源影响）

- Reviewed test docs: `.work_products/07_test/TEST_REPORT.md`, `.work_products/07_test/harness_consumer_lab.md`, `.work_products/07_test/TEST_PLAN.md`
- Superseded test docs: `.work_products/07_test/TEST_PLAN.md`
- Retained test docs: `.work_products/07_test/TEST_REPORT.md`, `.work_products/07_test/harness_consumer_lab.md`
- Reason: `TEST_PLAN.md` 只是 legacy alias，不包含执行证据；继续放在当前测试事实源会弱化 `TEST_REPORT.md` 的执行后证据语义。

## 8. Status

- Status: VERIFIED
