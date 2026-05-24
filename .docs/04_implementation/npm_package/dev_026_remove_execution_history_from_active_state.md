# DEV-026 Remove Execution History From Active State

## Summary

移除 active state 中的过去执行流水。`lifecycle.yaml` 不再包含 `history`，`transition.py` 不再写入 phase history；`plan.yaml` 和 `gate_results.log` 继续保持短期化。过去 phase/task/gate 执行信息不再是 Agent 默认上下文，只在用户明确要求 forensic/audit/regression 追溯时临时查询 git、PR、CI 或 release 记录。

## Changed Files

| 文件 | 变更 |
|---|---|
| `.agent/state/lifecycle.yaml` | 删除既有 `history`，只保留当前 phase routing state。 |
| `tools/transition.py` | 保留 `--reason` 兼容参数，但不再 append lifecycle history。 |
| `packages/sdlc-harness/src/lib/init.ts` | 新项目初始化的 `lifecycle.yaml` 不再生成 `history: []`。 |
| `packages/sdlc-harness/src/lib/migrations.ts` | upgrade migration 删除既有 lifecycle `history`，并继续兼容旧 Skill 名称迁移。 |
| `tools/validate_prompt_language.py` | Prompt language validator 不再要求 lifecycle `history` key。 |
| `AGENTS.md`、`README.md`、`.agent/skills/**` | 声明过去执行流水不是默认上下文，done task 合同查询降级为显式 forensic fallback。 |
| `tests/sdlc-harness/**` | 增加 init 不生成 `history`、upgrade 删除 legacy `history` 的覆盖。 |
| `packages/sdlc-harness/assets/**` | 通过 `package sync-source` 同步 AGENTS core 和 Skill assets。 |
| `.docs/01_product/`、`.docs/03_tech_plan/`、`.docs/rfc/` | 补充 RFC_012、产品要求和技术方案。 |

## Behavior

- `lifecycle.yaml` 只保存当前路由状态：`current_phase`、`active_role`、`active_skill`、`blocked_reason`、`suspended_phase` 和 `allowed_next_phases` 等。
- `transition.py --reason` 仅输出 note，不写入 active state。
- 旧项目执行 `upgrade` 后，lifecycle `history` 会被 migration 删除。
- Agent 默认不读取过去 task/phase/gate 执行流水；普通 bugfix 直接基于当前代码、测试、PRD、技术方案和 implementation doc。
- 明确的 forensic/audit/regression 任务仍可临时查询 git、PR、CI 或 release 记录。

## Verification

| Gate | Result |
|---|---|
| `npm test` | PASS，5 个 Node test files 全部通过。 |
| `node packages/sdlc-harness/dist/cli.js package sync-source` | PASS，同步 AGENTS core 和 Skill assets。 |
| `node packages/sdlc-harness/dist/cli.js package check-source` | PASS，package source OK。 |
| `make docs-overview` | PASS，刷新全部 `.docs/<stage>/overview.md`。 |
| `python3 tools/validate_allowed_paths.py` | PASS，22 个 changed files 均在 DEV-026 allowed_paths 内。 |
| `make validate-harness` | PASS，Harness scaffold、prompt language 和 overview check 全部通过。 |
| `git diff --check` | PASS。 |

## Notes

- 本任务不把 lifecycle history 合并到 `plan.yaml` 或其它 state 文件，因为这仍然会把过去执行流水带回默认上下文。
- `memory.md` 保留为长期稳定知识入口，但不应记录 phase timeline 或 task execution timeline。
