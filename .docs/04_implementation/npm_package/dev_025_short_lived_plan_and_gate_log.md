# DEV-025 Short-Lived Plan And Gate Log

## Summary

将 `plan.yaml` 从“累计完成任务摘要”的长期列表改为当前和未来任务的短期执行状态。完成 task 后，当前 `tasks` 列表移除该 task，历史执行合同通过 task implementation commit 和 implementation doc 追溯。`gate_results.log` 改为当前 task/phase 的短期 scratchpad，长期 gate 事实写入 implementation doc、git history、CI logs 或 release 记录。

## Changed Files

| 文件 | 变更 |
|---|---|
| `AGENTS.md`、`README.md` | 更新 Plan Protocol：`next_task_sequence` 负责 task id 延续，done/cancelled task 不再留在当前 `plan.yaml`，`gate_results.log` 完成后重置。 |
| `.agent/skills/pjsdlc_dev_sprint/SKILL.md`、`.agent/skills/pjsdlc_manager/SKILL.md` | 更新开发和调度提示词，要求 implementation commit 保留 open task 合同，completion ledger commit 再移除 task 并重置 gate log。 |
| `.agent/pjsdlc_managed/templates/PLAN_TEMPLATE.yaml` | 移除 `gate_result` 字段示例，新增 `next_task_sequence`。 |
| `tools/validate_plan.py`、`tools/harness_utils.py`、`tools/status.py`、`tools/validate_task_docs.py` | Python validators 支持 `tasks: []`，拒绝 done/cancelled task 留在当前 plan，禁止 open task 携带 `gate_result`，并让 implementation doc 校验改从 `.docs/04_implementation/**` 和 `.docs/INDEX.md` 读取事实。 |
| `packages/sdlc-harness/src/lib/init.ts`、`migrations.ts`、`validators.ts` | 包初始化和迁移写入 `next_task_sequence`，迁移时移除 done/cancelled task，清理 open task 的 `gate_result`，Node validator 与 Python 规则对齐。 |
| `tests/sdlc-harness/*.test.mjs` | 增加 validator 和 upgrade 覆盖：空 task 列表可通过，保留 done task 会失败，迁移会移除 completed task 并递增 `next_task_sequence`。 |
| `packages/sdlc-harness/assets/**` | 通过 `package sync-source` 同步 AGENTS core、Skill 和 template assets。 |
| `.docs/01_product/`、`.docs/03_tech_plan/`、`.docs/rfc/` | 补充短期 plan/gate log 的产品要求、技术方案和 RFC_011。 |

## Behavior

- 当前 `plan.yaml` 只保存 current/future task state；完成任务后从 `tasks` 中移除。
- `next_task_sequence` 是后续 `DEV-*` id 的机器状态，避免删除历史 task 后复用 id。
- open task 不允许写 `gate_result`，gate 结果先写短期 `gate_results.log` 和 implementation doc。
- done/cancelled task 若仍留在当前 `plan.yaml`，Python 和 Node validators 都会失败。
- 旧项目升级时，migration 会移除 done/cancelled task、清除 open task 的 `gate_result`，并补齐 `next_task_sequence`。

## Verification

| Gate | Result |
|---|---|
| `npm test` | PASS，5 个 Node test files 全部通过。 |
| `node packages/sdlc-harness/dist/cli.js package sync-source` | PASS，同步 AGENTS core、Skill 和 template assets。 |
| `node packages/sdlc-harness/dist/cli.js package check-source` | PASS，package source OK。 |
| `make docs-overview` | PASS，刷新全部 `.docs/<stage>/overview.md`。 |
| `python3 tools/validate_allowed_paths.py` | PASS，28 个 changed files 均在 DEV-025 allowed_paths 内。 |
| `make validate-harness` | PASS，Harness scaffold、prompt language 和 overview check 全部通过。 |
| `git diff --check` | PASS。 |

## Notes

- 本任务保留两段提交协议：implementation commit 仍包含 DEV-025 的完整 open task 合同；completion ledger commit 再将 DEV-025 从当前 `plan.yaml` 移除。
- 历史 task 详情不回填到当前 `plan.yaml`。需要追溯时，先读对应 implementation doc，再用 `git log --grep "<TASK_ID>"` 和 `git show <commit>:.agent/state/plan.yaml` 查看当时的 open task 合同。
