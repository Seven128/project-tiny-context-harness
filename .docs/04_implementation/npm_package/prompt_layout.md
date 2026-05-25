# Harness Prompt Layout Implementation Doc

## Summary

`DEV-038` 将 Harness 阶段角色文件从 `.agent/skills/**/SKILL.md` 迁移为 `.agent/prompts/workflow/**/PROMPT.md`，并把本仓库维护 Harness 自身的 authoring prompt 放到同一棵 `.agent/prompts/**` 树下的 `.agent/prompts/authoring/**`。

这个改动明确区分两类 Prompt：

| 类型 | 路径 | 是否随 npm 包分发 | 用途 |
|---|---|---|---|
| Workflow prompt | `.agent/prompts/workflow/<name>/PROMPT.md` | 是 | 普通用户项目的阶段角色提示词，由 lifecycle 和 phase contract 软索引。 |
| Authoring prompt | `.agent/prompts/authoring/<name>/PROMPT.md` | 否 | 只服务本仓库迭代 AI SDLC Harness 自身，不进入用户项目。 |

## Changed Files

| 文件 | 变更 |
|---|---|
| `.agent/prompts/workflow/**/PROMPT.md` | 承接原通用阶段角色文件，并统一使用 Prompt 术语。 |
| `.agent/prompts/authoring/harness_package_design/PROMPT.md` | 承接本仓库专用 authoring prompt。 |
| `.agent/state/lifecycle.yaml` | `active_skill` 改为 `active_prompt`。 |
| `.agent/pjsdlc_managed/policies/phase_contracts.yaml` | phase contract 字段从 `skill` 改为 `prompt`。 |
| `.agent/config.yaml` | managed path 从 `.agent/skills` 改为 `.agent/prompts`。 |
| `packages/sdlc-harness/source-mappings.yaml` | package source sync 改为同步 `.agent/prompts` 到 `assets/prompts`，并排除 `authoring/**`。 |
| `packages/sdlc-harness/src/lib/package-source.ts` | `copy-tree` source mapping 支持 `exclude` pattern。 |
| `packages/sdlc-harness/src/lib/sync-engine.ts` | 用户项目同步 package `prompts` assets 到 `<harnessRoot>/prompts`。 |
| `packages/sdlc-harness/src/lib/migrations.ts` | 旧 `skills` managed path、`SKILL.md` 和 `active_skill` 迁移到新 Prompt 布局。 |
| `tools/validate_harness.py` / `tools/validate_prompt_language.py` | 本仓库 gate 改为校验 `.agent/prompts/workflow/**/PROMPT.md` 和 `PROMPT_TEMPLATE.md`。 |
| `tests/sdlc-harness/*.test.mjs` | 覆盖 prompt sync、authoring 排除、validator 和 upgrade 兼容。 |

## Behavior

- 新安装或同步的用户项目获得 `<harnessRoot>/prompts/workflow/**/PROMPT.md`，不获得 authoring prompt。
- `package sync-source` 从 `.agent/prompts/**` 复制通用 workflow prompt 到 `packages/sdlc-harness/assets/prompts/**`，但跳过 `.agent/prompts/authoring/**`。
- `sync` / `init` / `upgrade` 使用 package `assets/prompts` 作为通用 Prompt source，并写入用户项目的 `<harnessRoot>/prompts/**`。
- 旧项目如果配置了 `.agents/skills`、`.harness/agents/skills` 或 `<harnessRoot>/skills`，upgrade 会改写到 `<harnessRoot>/prompts`。
- 旧项目 lifecycle 中的 `active_skill` 会迁移为 `active_prompt`；旧 `SKILL.md` 文件会在迁移旧 skills 树时重命名为 `PROMPT.md`。

## Important Boundary

这些 Prompt 不是 Codex 原生注册 skill。Harness 使用的是“阶段状态 + prompt 文件”的软索引：

```txt
.agent/state/lifecycle.yaml active_prompt
-> .agent/pjsdlc_managed/policies/phase_contracts.yaml prompt
-> .agent/prompts/workflow/<prompt>/PROMPT.md
```

Codex 原生 skill 的注册、水合和语义枚举仍由客户端自己的 skill 目录机制控制；Harness workflow prompt 不依赖那个机制，也不会被假装成注册 skill。

## Verification

| Gate | Result |
|---|---|
| `npm test` | PASS，5 个 `tests/sdlc-harness/*.test.mjs` 全部通过。 |
| `node packages/sdlc-harness/dist/cli.js package check-source` | PASS，package assets 与 source mapping 一致。 |
| `make validate-harness` | PASS，Harness scaffold、Prompt language 和 doc overview 均通过。 |
| `python3 tools/validate_allowed_paths.py` | PASS，83 个 changed files 均在 DEV-038 allowed_paths 内。 |
| `git diff --check` | PASS。 |
