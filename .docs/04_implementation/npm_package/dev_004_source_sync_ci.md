# DEV-004 package source sync Implementation Doc

## 1. 关联信息

- Task ID: `DEV-004`
- Linked PRD: `.docs/01_product/npm_package_distribution.md`
- Linked technical design: `.docs/03_tech_plan/harness_package_distribution.md`
- Linked RFC: none
- Linked commit: pending

## 2. 本次实现范围

- 新增（Added）:
  - `sdlc-harness package sync-source` to update package canonical assets from this self-hosting workspace.
  - `sdlc-harness package check-source` to detect drift between source workspace files and package assets.
  - Package source mapping implementation for copy-file, copy-tree, managed block extraction, and Makefile target extraction mode.
  - CI steps to install Node dependencies, run package tests, and run package source drift check.
  - Package assets generated from current `AGENTS.md`, `.agents/skills/**`, `.harness/templates/**`, `.harness/policies/**`, `Makefile`, `.github/workflows/harness.yml`, and `tools/**`.
- 修改（Changed）:
  - `package` CLI subcommand now dispatches to real source sync/check behavior.
- 未覆盖（Not covered）:
  - DEV-005 still needs Node/TypeScript validator command implementation instead of Python validator execution.

## 3. 真实代码结构

| 文件（File） | 作用（Purpose） | 关键函数/对象（Key Functions/Objects） |
|---|---|---|
| `packages/sdlc-harness/src/lib/package-source.ts` | Source workspace to package asset sync/check | `syncSource`、`checkSource` |
| `packages/sdlc-harness/src/commands/package-source.ts` | CLI adapter | `packageSource` |
| `packages/sdlc-harness/assets/**` | Package canonical assets | synced skills/templates/policies/validators |
| `.github/workflows/harness.yml` | CI drift check | Node setup, npm test, package check-source |
| `tests/sdlc-harness/package-source.test.mjs` | Focused source sync test | `syncSource`、`checkSource` |

## 4. 核心数据流

```txt
sdlc-harness package sync-source
-> read packages/sdlc-harness/source-mappings.yaml
-> render each source mapping
-> write packages/sdlc-harness/assets/**
-> sdlc-harness package check-source verifies no drift
```

## 5. 关键实现逻辑

- 输入校验（Input validation）: source mappings are read from the committed package mapping file.
- 核心分支（Core branches）:
  - `copy-tree` copies directories while skipping `.gitkeep`.
  - `extract-managed-block` uses marker content when present, otherwise copies the whole source file.
  - `check-source` hashes normalized expected and existing content.
- 异常处理（Error handling）: CLI sets non-zero exit code when drift is detected.
- 边界兜底（Boundary fallback）: source mappings exclude `.docs/**` and `.harness/state/**`, so project instance state does not enter package assets.
- 性能或并发注意事项（Performance or concurrency notes）: source sync removes and rewrites target asset trees deterministically.

## 6. 与技术方案的偏移

- 暂无。实现满足“工作流源变化必须自动更新包 canonical source 并可检查漂移”的约束。

## 7. 测试覆盖（Test Coverage）

| 测试（Test） | 覆盖范围（Coverage） | 结果（Result） |
|---|---|---|
| `npm test` | TypeScript build plus init/sync/doctor/upgrade/source-sync tests | PASS |
| `node packages/sdlc-harness/dist/cli.js package check-source` | 当前仓库 source-to-package drift check | PASS |
| `python3 tools/validate_allowed_paths.py` | DEV-004 changed file boundaries | PASS |
| `make validate-checkpoint` | DEV-004 checkpoint completeness | PASS |
| `make lint` | Current project lint gate placeholder | PASS |
| `make test-current-domain` | Current task focused gate placeholder | PASS |

## 8. 后续维护注意事项

- 每次修改 `AGENTS.md`、Skill、templates、policies、Makefile、workflow 或 validators 后，都要运行 `sdlc-harness package sync-source` 并确认 `check-source` 通过。
- DEV-005 should replace Python validators as runtime dependencies with Node/TypeScript validation commands.
