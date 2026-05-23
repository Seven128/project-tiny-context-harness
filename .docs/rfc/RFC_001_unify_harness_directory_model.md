# RFC_001: 统一 .harness 工作流根目录与 .agents 兼容出口

## 1. 背景

当前 Harness 配置被拆在两个顶层目录中：

- `.harness/**` 保存生命周期状态、任务状态、模板、策略、配置和运行协议。
- `.agents/skills/**` 保存阶段 Skill，作为 Agent 启动和路由时容易识别的本地目录。

这个拆分解决了 Agent 可读性，但概念上不够一致：Skill 本身也是 Harness 工作流配置的一部分，和 policies、templates、state protocol、validators 一样，都是定义“这套工作流如何运行”的内容。用户提出 `.harness` 与 `.agents` 应该合并为一个工作流根目录，避免把同一类配置拆成两个事实源。

本 RFC 聚焦一个变更：以 `.harness` 作为 Harness 工作流配置的 canonical root，保留 `.agents/skills/**` 作为可选的兼容生成出口，而不是事实源。

## 2. 变更内容（Change Content）

- Added:
  - 新增 `.harness/agents/skills/**` 作为阶段 Skill 的 canonical source。
  - 新增 `.harness/managed/**` 作为包管理内容的统一落点，包括 `templates`、`policies`、`make`、`workflows` 等。
  - 保留 `.agents/skills/**` 作为 `sdlc-harness sync` 生成的 compatibility view，用于兼容当前 Agent 固定目录读取习惯。
- Changed:
  - `.agents/skills/**` 不再作为工作流配置事实源；它由 `.harness/agents/skills/**` 生成或同步。
  - `.harness/templates/**` 和 `.harness/policies/**` 迁移到 `.harness/managed/templates/**` 与 `.harness/managed/policies/**`，避免 state protocol 与 package-managed assets 混在同一层。
  - `sdlc-harness sync`、`upgrade`、`package sync-source`、`package check-source`、`validate-*` 需要识别新的 canonical layout。
  - README、PRD、技术方案和 task plan 需要同步目录语义。
- Removed:
  - 移除 `.agents/skills/**` 作为 canonical source 的语义。
  - 移除“`.harness` 只保存状态/策略，`.agents` 保存 Agent 配置”的旧划分。
- Unchanged:
  - `AGENTS.md` 仍然是 Agent 顶层入口，继续使用 managed block 合并。
  - `.harness/state/**` 的具体值仍属于项目实例运行数据，不由 npm 包覆盖。
  - `.docs/**` 仍属于项目产物，不由 `sync` 或 `upgrade` 覆盖。
  - npm 包仍负责导出 workflow protocol、schemas、initial templates、skills、policies、templates、validators 和 migrations。

## 3. Product Impact（产品影响）

| 受影响 PRD（Affected PRD） | 影响（Impact） |
|---|---|
| `.docs/01_product/npm_package_distribution.md` | 需要把 `sync` 的目标从“同步到 `.agents/skills`、`.harness/templates`、`.harness/policies`”修正为“以 `.harness` 为 canonical root，并生成 `.agents/skills` 兼容出口”。 |

## 4. Technical Impact Candidates（技术影响候选）

| 模块（Module） | 影响（Impact） | 置信度（Confidence） |
|---|---|---|
| `README.md` | 目录结构、npm 包说明、自迭代说明和 Agent 可读性说明需要统一为 `.harness` canonical root。 | high |
| `.docs/03_tech_plan/harness_package_distribution.md` | 工作区生成目录、`.harness/config.yaml`、source sync manifest、风险缓解和任务拆分需要调整。 | high |
| `.harness/config.yaml` | `managed_files` 与 local override 路径需要改为 `.harness/agents` 和 `.harness/managed` 结构。 | high |
| `packages/sdlc-harness/source-mappings.yaml` | 源文件映射需要从 `.harness/agents/skills`、`.harness/managed/templates`、`.harness/managed/policies` 读取。 | high |
| `packages/sdlc-harness/src/lib/config.ts` | 默认配置需要对齐新的 managed files。 | high |
| `packages/sdlc-harness/src/lib/sync-engine.ts` | 需要同时 materialize canonical `.harness/**` 与 compatibility `.agents/skills/**`。 | high |
| `packages/sdlc-harness/src/lib/validators.ts` | `validate-harness` 需要校验 canonical source，并检查兼容出口是否存在或可生成。 | high |
| `packages/sdlc-harness/assets/**` | 包内 assets 布局需要由新的 canonical source 重新生成。 | high |
| `.agents/skills/**` | 需要保留为生成物或兼容出口，不再手写维护。 | high |

Impact analysis 已运行：

```sh
python3 tools/impact_analyzer.py --rfc .docs/rfc/RFC_001_unify_harness_directory_model.md --top 40
```

主要命中 `.docs/01_product/npm_package_distribution.md`、`.docs/02_architecture/harness_package_distribution.md`、`.docs/03_tech_plan/harness_package_distribution.md`、`.docs/INDEX.md`、`tests/sdlc-harness/*` 和 npm 包实现文件。RFC 阶段已更新产品、架构、技术方案和任务状态；代码迁移进入 `DEV-006`。

## 5. Acceptance Criteria

- [ ] README 明确说明 `.harness` 是 Harness 工作流配置 canonical root，`.agents/skills/**` 是 compatibility view。
- [ ] PRD 和技术方案明确 `state protocol` 属于包、`state data` 属于项目实例，并把 Skill、policy、template 归入 `.harness` canonical root。
- [ ] `sdlc-harness sync` 能从包内 assets 生成 `.harness/agents/skills/**`、`.harness/managed/**` 和 `.agents/skills/**` 兼容出口。
- [ ] `sdlc-harness upgrade` 在 migration 后自动执行新布局的 `sync`。
- [ ] `sdlc-harness package sync-source` 与 `package check-source` 使用新的 source mappings，并能防止工作流源内容与包内容漂移。
- [ ] `sdlc-harness validate-harness`、`npm test`、`sdlc-harness package check-source` 通过。

## 6. Regression Requirements（回归要求）

- [ ] 运行 `npm test` 验证 CLI、sync、upgrade、package source 和 validators 行为。
- [ ] 运行 `node packages/sdlc-harness/dist/cli.js package check-source` 验证包内 canonical source 无漂移。
- [ ] 运行 `node packages/sdlc-harness/dist/cli.js validate-harness` 验证新布局的 Harness 骨架。
- [ ] 运行 `make validate-rfc` 验证 RFC 产物和全量回归入口。
- [ ] 确认 `.docs/**`、`.harness/state/**`、`src/**`、`tests/**` 未被 sync/upgrade 覆盖。

## 7. Status

- Status: APPLIED
