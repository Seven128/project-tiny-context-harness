# RFC_021: Task runtime evidence contract

## 1. 背景

`RFC_019` 和 `RFC_020` 已经要求 SPRINTING 记录 runnable entry/exit 和 application readiness，但规则主要依赖 implementation doc 关键词。service、agent、runtime、worker、frontend app 或 provider/live integration 任务仍可能用本地 smoke、provider live smoke、fake adapter 或 localhost evidence 关闭更高等级的目标环境交付。

本 RFC 将证据等级和目标运行环境提升为通用 task contract，让 Review 和 Testing 能判断“证据是否匹配承诺的运行环境”，而不是只判断“有没有 smoke”。

## 2. 变更内容（Change Content）

- Added: SPRINTING runtime/app/provider/live task contract 字段 `evidence_level.required`、`evidence_level.supporting` 和 `target_runtime_environment`。
- Added: evidence levels: `unit`、`local_runtime`、`external_provider_live`、`deployed_runtime`、`business_handoff_ready`。
- Added: target runtime kinds: `local`、`ci`、`staging`、`cloud_vm`、`managed_service`、`browser`、`worker`、`not_applicable`。
- Changed: `validate-dev` 对 runtime/app/provider/live task 检查 task contract、implementation doc evidence level、target runtime、handoff entrypoint 和 Testing Handoff Contract。
- Changed: `validate-review` 和 `validate-test` 拒绝把 runtime/handoff mismatch、未部署、未初始化、local-only 或 fake adapter 状态写成 `PASS`。
- Changed: architecture/dev/review/test/implementation prompts 和 templates 要求最后一公里 runtime 初始化、health/readiness、入口出口和 testing handoff。

## 3. Product Impact（产品影响）

| 受影响 PRD（Affected PRD） | 影响（Impact） |
|---|---|
| `.docs/01_product/npm_package_distribution.md` | `validate-dev`、`validate-review` 和 `validate-test` 的 public behavior 更严格，防止低等级证据关闭高等级 runtime task。 |
| `README.md` / `packages/sdlc-harness/README.md` / `PROJECT_SPEC.md` | 对外说明 Evidence Level、Target Runtime Environment 和 Testing Handoff Contract。 |

## 4. Technical Impact Candidates（技术影响候选）

| 模块（Module） | 影响（Impact） | 置信度（Confidence） |
|---|---|---|
| Package validators | 扩展 task contract validation、Development Evidence validation、review/test PASS mismatch validation。 | high |
| Workflow skills/templates | 更新 Architect、Dev、Implementation Doc、Reviewer、Tester 和 plan/review/test/implementation templates。 | high |
| Package assets | 通过 `package sync-source` 同步 managed assets。 | high |
| Tests | 增加 deployed runtime、cloud VM handoff、business handoff 和 unit/not_applicable regression。 | high |

## 5. Acceptance Criteria

- [x] runtime/app/provider/live SPRINTING task 缺少 `evidence_level.required` 或 `target_runtime_environment` 时被 validator 拒绝。
- [x] `deployed_runtime` 不能被 provider live smoke、fake adapter、localhost smoke 或其它 lower-level evidence 单独关闭。
- [x] `cloud_vm` / `staging` / `managed_service` 且 `required_for_done: true` 时，final handoff entrypoint 不能是 localhost。
- [x] `business_handoff_ready` task 缺少 Testing Handoff Contract 时被拒绝。
- [x] `unit` / `not_applicable` 的纯领域任务仍可使用 explicit `Not applicable`。
- [x] Review/Test `PASS` 报告中出现未部署、未初始化、local-only、fake adapter 或 runtime mismatch 时被拒绝。

## 6. Regression Requirements（回归要求）

- [x] `npm test --workspace agent-project-sdlc`
- [x] `node packages/sdlc-harness/dist/cli.js package sync-source`
- [x] `node packages/sdlc-harness/dist/cli.js package check-source`
- [x] `make docs-overview`
- [x] `make validate-harness`
- [x] `make validate-dev`

## 7. Test Fact Source Impact（测试事实源影响）

- Reviewed test docs: `.docs/07_test/TEST_REPORT.md`, `.docs/07_test/harness_consumer_lab.md`
- Superseded test docs: none
- Retained test docs: `.docs/07_test/TEST_REPORT.md`, `.docs/07_test/harness_consumer_lab.md`
- Reason: 本 RFC 强化 workflow gate 和 task contract，不替换当前 TESTING 事实源。

## 8. Status

- Status: APPLIED
