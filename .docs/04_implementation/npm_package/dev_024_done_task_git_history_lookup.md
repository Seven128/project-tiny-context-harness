# DEV-024 Done Task Git History Lookup

## Summary

补充 done task 详细执行合同的恢复提示：当前 `plan.yaml` 只保留 done 摘要时，Agent 应通过 implementation doc 和 git history 找到 task implementation commit，再查看该 commit 中未压缩的 `plan.yaml`。`pjsdlc:sdlc-harness:*` marker namespace 保持不变。

## Changed Files

| 文件 | 变更 |
|---|---|
| `AGENTS.md` | 在 Plan Protocol 和工作规则中增加 done task git history lookup 规则。 |
| `.agent/skills/pjsdlc_dev_sprint/SKILL.md` | 增加追溯 done task 合同的命令示例，并强调不要重建旧字段。 |
| `.agent/skills/pjsdlc_manager/SKILL.md` | 增加管理/交接时的历史合同查询方式。 |
| `README.md` | 补充 `git log --grep <TASK_ID>` 和 `git show <commit>:<harnessRoot>/state/plan.yaml` 示例。 |
| `packages/sdlc-harness/assets/**` | 通过 `package sync-source` 同步 AGENTS core 和 Skill assets。 |
| `.docs/01_product/`、`.docs/03_tech_plan/`、`.docs/rfc/` | 补充产品要求、技术方案和 RFC_010。 |

## Behavior

```sh
git log --oneline --grep "<TASK_ID>"
git show <implementation_commit>:.agent/state/plan.yaml
```

使用自定义 `<harnessRoot>` 的项目把 `.agent/state/plan.yaml` 替换为实际 root。当前 `plan.yaml` 的 done task 摘要不负责保存旧 `allowed_paths`、`required_gates`、`acceptance_criteria` 或 `working_notes`；需要新执行范围时，通过 RFC 或 revision task 创建新的 open task 合同。

## Verification

| Gate | Result |
|---|---|
| `node packages/sdlc-harness/dist/cli.js package check-source` | PASS，`package source OK`。 |
| `make validate-harness` | PASS，Harness scaffold、prompt language 和 overview check 全部通过。 |
| `python3 tools/validate_allowed_paths.py` | PASS，13 个 changed files 均在 DEV-024 allowed_paths 内。 |
| `git diff --check` | PASS。 |

## Notes

- 本任务不修改 managed block marker；`pjsdlc:sdlc-harness:*` 继续作为 preferred marker namespace。
- done task 仍不在 `plan.yaml` 中长期保留完整合同，避免短期执行计划膨胀。
