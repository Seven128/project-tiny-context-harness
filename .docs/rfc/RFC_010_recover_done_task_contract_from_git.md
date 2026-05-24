# RFC_010: 从 git history 恢复已压缩 task 的完整执行合同

## 1. 背景

当前 `plan.yaml` 采用短期执行记忆模型：open task 保存 `allowed_paths`、`required_gates`、`acceptance_criteria` 和必要 `working_notes`；task 完成后压缩为简短摘要、implementation doc 和 gate result。压缩前会先创建 task implementation commit，确保完整 open task 合同进入 git history。

这套机制已经降低了 `plan.yaml` 长期膨胀，但提示词里没有足够明确地告诉后续 Agent：当需要追溯已完成 task 的完整执行合同，不应该在当前 `plan.yaml` 中寻找，也不应该重新猜测，而应去 git history 中查找 task implementation commit。

`pjsdlc:sdlc-harness:*` marker namespace 是另一项已确认变更，本 RFC 不回退或改动该 marker namespace。

## 2. 变更内容（Change Content）

- Added:
  - 在 `AGENTS.md` 的 Plan Protocol 中增加 done task 追溯规则。
  - 在开发和管理 Skill 中增加 git history lookup 操作提示。
  - 在 README 和技术方案中补充命令级恢复路径。
- Changed:
  - PRD 补充：Agent 必须能理解 done task 压缩后的历史恢复入口。
- Removed:
  - 无。
- Unchanged:
  - `pjsdlc:sdlc-harness:*` marker namespace 保持不变。
  - done task 仍不在 `plan.yaml` 长期保留详细执行合同。

## 3. Product Impact（产品影响）

| 受影响 PRD（Affected PRD） | 影响（Impact） |
|---|---|
| `.docs/01_product/npm_package_distribution.md` | 补充 plan 压缩后的 git history 恢复要求，避免 Agent 把已完成 task 的详细合同视为丢失。 |

## 4. Technical Impact Candidates（技术影响候选）

| 模块（Module） | 影响（Impact） | 置信度（Confidence） |
|---|---|---|
| `AGENTS.md` | 增加所有 Agent 必须遵循的 done task history lookup 协议。 | high |
| `.agent/skills/pjsdlc_dev_sprint/SKILL.md` | 开发阶段执行时明确 task implementation commit 是完整合同恢复点。 | high |
| `.agent/skills/pjsdlc_manager/SKILL.md` | `/status`、`/next` 或交接时能说明 done task 详情要查 git history。 | high |
| `README.md` | 补充恢复命令和设计原则。 | high |
| `.docs/03_tech_plan/harness_package_distribution.md` | 补充 plan state 与 git history 的交互契约。 | high |
| `packages/sdlc-harness/assets/**` | 通过 package sync-source 同步 AGENTS core 和 Skill assets。 | high |

## 5. Acceptance Criteria

- [ ] `AGENTS.md` 明确：done task 的完整执行合同在 task implementation commit 中，通过 git history 恢复。
- [ ] `pjsdlc_dev_sprint` 明确 task implementation commit 与 completion ledger commit 的历史查询方式。
- [ ] `pjsdlc_manager` 明确不要把 done task 详情重新写回当前 `plan.yaml`，除非有新的 RFC/revision task。
- [ ] README 和技术方案给出 `git log --grep <TASK_ID>` 与 `git show <commit>:.agent/state/plan.yaml` 示例。
- [ ] `pjsdlc:sdlc-harness:*` marker namespace 保持不变。
- [ ] `make validate-rfc`、`package check-source`、`make validate-harness` 通过。

## 6. Regression Requirements（回归要求）

- [ ] 确认 package source assets 与 workspace prompts 一致。
- [ ] 确认 docs overview 已刷新。
- [ ] 确认 prompt language contract 仍满足中文说明 + English identifiers。

## 7. Status

- Status: APPLIED
