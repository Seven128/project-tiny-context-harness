# RFC_008: 为托管文本块标识增加 pjsdlc 前缀

## 1. 背景

`AGENTS.md`、`Makefile` 等文件会同时承载用户项目配置和 Harness 管理内容。当前 managed block marker 使用 `sdlc-harness:*`，语义仍偏命令名和通用概念。用户希望这些和用户配置文件耦合的文本块标识带有更明确的 `pjsdlc` 前缀，降低与其它工具或用户自定义 marker 冲突的概率。

`.agent/skills/**` 和 `.agent/managed/**` 本身是包拥有的工作流配置区，不需要在每个文件内再做文本块隔离；但当这些配置通过 `AGENTS.md`、`Makefile` 等桥接文件暴露给用户仓库时，桥接 marker 应进入 `pjsdlc` namespace。

## 2. 变更内容（Change Content）

- Added:
  - 新 preferred marker namespace：`pjsdlc:sdlc-harness:*`。
  - 旧 `sdlc-harness:*` marker 的 legacy detection，允许既有项目自动迁移到新 marker。
- Changed:
  - `AGENTS.md` managed block marker 从 `<!-- sdlc-harness:begin/end -->` 改为 `<!-- pjsdlc:sdlc-harness:begin/end -->`。
  - `Makefile` include block marker 从 `# sdlc-harness:make:begin/end` 改为 `# pjsdlc:sdlc-harness:make:begin/end`。
  - managed metadata marker 前缀从 `sdlc-harness-managed` 改为 `pjsdlc:sdlc-harness-managed`。
  - 测试、README、PRD 和技术方案同步说明新 marker。
- Removed:
  - 新生成内容不再使用裸 `sdlc-harness:*` marker 作为 preferred marker。
- Unchanged:
  - CLI binary 仍是 `sdlc-harness`。
  - npm package 仍是 `agent-project-sdlc`。
  - 旧 marker 不立即报错；只有 marker 不完整、重复或新旧 marker 同时冲突时才 blocker。

## 3. Product Impact（产品影响）

| 受影响 PRD（Affected PRD） | 影响（Impact） |
|---|---|
| `.work_products/01_product/npm_package_distribution.md` | `AGENTS.md` managed block 和 acceptance criteria 改为 `pjsdlc:sdlc-harness:*` marker，并要求 sync/upgrade 保留旧 marker 兼容迁移。 |

## 4. Technical Impact Candidates（技术影响候选）

| 模块（Module） | 影响（Impact） | 置信度（Confidence） |
|---|---|---|
| `packages/sdlc-harness/src/lib/managed-file.ts` | 定义新的 preferred marker 和旧 marker 兼容常量。 | high |
| `packages/sdlc-harness/src/lib/sync-engine.ts` | merge block 时识别旧 marker，替换为新 marker；重复或混用冲突时 blocker。 | high |
| `packages/sdlc-harness/src/lib/package-source.ts` | source extraction 支持 preferred marker 和 legacy marker。 | high |
| `tests/sdlc-harness/**` | 更新新 marker 断言，并覆盖旧 marker 自动迁移。 | high |
| `Makefile` / package assets | 根 include block 与包内 assets 同步到新 marker。 | high |

## 5. Acceptance Criteria

- [ ] 新项目 init 后 `AGENTS.md` 使用 `<!-- pjsdlc:sdlc-harness:begin/end -->`。
- [ ] 新项目 init 后 `Makefile` 使用 `# pjsdlc:sdlc-harness:make:begin/end`。
- [ ] 旧 `sdlc-harness:*` marker 的已有项目运行 `sync` 后会被安全替换为新 marker。
- [ ] marker 不完整、重复或新旧 marker 混用冲突时仍 blocker。
- [ ] `npm test`、`package check-source`、`make validate-harness` 通过。

## 6. Regression Requirements（回归要求）

- [ ] 覆盖 AGENTS.md legacy marker 替换为 `pjsdlc:*`。
- [ ] 覆盖 Makefile legacy marker 替换为 `pjsdlc:*`。
- [ ] 覆盖 source mapping 从有 preferred marker 的 AGENTS.md 提取核心内容。
- [ ] 覆盖 broken marker blocker。

## 7. Status

- Status: APPLIED
