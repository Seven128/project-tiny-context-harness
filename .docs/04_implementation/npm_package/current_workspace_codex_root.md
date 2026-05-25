# Current Workspace Codex Root Implementation Doc

## Summary

`DEV-041` 将当前 `ProjectTemplate` source authoring workspace 的 Harness root 从 `.agent/**` 迁移到 `.codex/**`，与 `sdlc-harness init` 的默认 `Codex -> .codex` 体验对齐。

迁移后，本仓库自己的 lifecycle、plan、memory、workflow skills、templates、policies 和 Makefile fragment 都位于 `.codex/**`。普通用户项目仍可以通过 `harnessFolderName` 使用其它 root；配置层没有显式配置时的兜底默认值仍由 npm 包保持为 `.agent`。

## Changed Files

| 文件 | 变更 |
|---|---|
| `.codex/**` | 承接原 `.agent/**` 的 state、skills、templates、policies、config 和 Makefile fragment。 |
| `package.json` | 增加 `sdlcHarness.harnessFolderName: ".codex"`，让本仓库工具读取当前 root。 |
| `AGENTS.md` | 当前事实源、工作规则、自然语言路由和阶段流转路径改为 `.codex/**`。 |
| `Makefile` | managed include 改为 `.codex/pjsdlc_managed/make/sdlc-harness.mk`。 |
| `tools/*.py` / `tools/release_npm.mjs` | 本地 validators、transition、allowed paths 和 release 证据读取改为 `.codex/**`。 |
| `packages/sdlc-harness/source-mappings.yaml` | source sync 从 `.codex/skills` 和 `.codex/pjsdlc_managed/**` 读取当前仓库事实源。 |
| `packages/sdlc-harness/src/lib/sync-engine.ts` | `AGENTS_CORE.md` 渲染同时支持把 `.agent` 或 `.codex` 源路径替换成目标项目的 `<harnessRoot>`。 |
| `packages/sdlc-harness/assets/agents/AGENTS_CORE.md` | 通过 `package sync-source` 同步新的 AGENTS managed block。 |
| `README.md` / `PROJECT_SPEC.md` / `.docs/**` | 说明当前 authoring workspace 使用 `.codex/**`，并保留产品层 `Other -> .agent` 与配置兜底语义。 |

## Behavior

- 本仓库运行 `make validate-harness` 时读取 `.codex/state/**`、`.codex/skills/**` 和 `.codex/pjsdlc_managed/**`。
- `package sync-source` 以 `.codex/**` 作为 source authoring workspace 输入，并继续排除 `.codex/skills/authoring/**`。
- 包内 `sync` 对用户项目仍按目标 `<harnessRoot>` 渲染 AGENTS 和 Makefile；`.codex` 只是当前源码仓库的本地 root。
- `.agent/**` 不再作为当前工作区事实源保留。

## Verification

| Gate | Result |
|---|---|
| `npm test` | PASS，5 个 `tests/sdlc-harness/*.test.mjs` 全部通过。 |
| `node packages/sdlc-harness/dist/cli.js package check-source` | PASS，package assets 与 `.codex/**` source mappings 一致。 |
| `make validate-harness` | PASS，Harness scaffold、Skill language contract 和 doc overview check 均通过。 |
| `python3 tools/validate_allowed_paths.py` | PASS，55 个 changed files 均在 DEV-041 allowed_paths 内。 |
| `git diff --check` | PASS。 |
