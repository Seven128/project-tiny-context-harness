# DEV-016 Implementation: role prompts and Karpathy guidelines

## Task

- Task ID: `DEV-016`
- Title: 补全通用角色提示词和 Karpathy 基础原则
- PRD: `.docs/01_product/npm_package_distribution.md`
- Tech Plan: `.docs/03_tech_plan/harness_package_distribution.md`

## Implementation Summary

通用阶段 Skill 新增 `## 角色提示词`，让每个角色不仅能执行文档切片和状态更新，也能以专业角色姿态与用户对话式澄清、权衡并生成阶段产物。

`AGENTS.md` 中的 Karpathy-inspired 通用原则已补全为 `multica-ai/andrej-karpathy-skills` 的 MIT `CLAUDE.md` guideline 内容，并保留 Harness 额外约束：阶段约束优先、文档先于实现、验证闭环和派生物可再生成。

## Changed Files

| Path | Purpose |
|---|---|
| `AGENTS.md` | 补全 Karpathy guideline 原文内容，并保留 Harness 补充原则。 |
| `.agent/skills/**/SKILL.md` | 为 manager、pm、architect、developer、implementation_doc、reviewer、tester、release_manager、rfc_recalibrate 增加通用角色提示词。 |
| `.agent/managed/templates/SKILL_TEMPLATE.md` / `.agent/templates/SKILL_TEMPLATE.md` | 为未来 Skill 模板增加 `## 角色提示词` 槽位。 |
| `tools/validate_prompt_language.py` | 将 `## 角色提示词` 纳入 Skill 必需章节。 |
| `README.md` | 说明通用阶段 Skill 必须包含对话式角色提示词。 |
| `packages/sdlc-harness/assets/**` | 通过 `package sync-source` 同步包内 canonical assets。 |

## Source Notes

- `multica-ai/andrej-karpathy-skills` README 标注 License 为 MIT。
- 本次纳入的是该仓库 `CLAUDE.md` 中的四条通用行为原则：Think Before Coding、Simplicity First、Surgical Changes、Goal-Driven Execution。

## Impact Notes

这些角色提示词属于通用 Harness 能力，应该随 npm 包分发给所有用户项目；它们不属于 authoring overlay。提示词保持通用，不绑定具体业务项目，也不要求用户直接修改 managed Skill。

## Verification

| Gate | Result |
|---|---|
| `node packages/sdlc-harness/dist/cli.js package sync-source` | PASS |
| `node packages/sdlc-harness/dist/cli.js package check-source` | PASS |
| `make docs-overview` | PASS |
| `make validate-doc-overviews` | PASS |
| `make validate-harness` | PASS |
| `make validate-current` | PASS |
| `npm test` | PASS |
| `git diff --check` | PASS |
