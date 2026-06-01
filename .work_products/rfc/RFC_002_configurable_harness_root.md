# RFC_002: 可配置 Harness 根目录

## 1. 背景

RFC_001 将 Harness 配置事实源统一到 `.harness/**`，并把 `.agents/skills/**` 降级为兼容生成物。但这仍然让 Codex/Agent 的 Skill discovery 约定和 Harness 配置根目录之间存在适配层。

用户提出新的产品方向：通过项目级 JSON 配置声明 Harness 根目录。如果配置为 `.harness`，则所有 Harness 配置都放在 `.harness` 下，且 Skill 直接放在 `.harness/skills`；如果没有配置，则默认使用 `.agents` 作为 Harness 根目录，所有 Harness 配置都放在 `.agents` 下，Skill 直接位于 `.agents/skills`，从而天然匹配多数 Agent 的 Skill discovery 约定。

## 2. 变更内容（Change Content）

- Added:
  - 支持从 `package.json` 的 `sdlcHarness.harnessFolderName` 读取 Harness 根目录。
  - 支持从 `sdlc-harness.config.json` 读取 `harnessFolderName`。
  - 支持 `harnessFloderName` 作为兼容别名，避免用户拼写错误导致配置失效。
  - 默认 Harness 根目录为 `.agents`。
- Changed:
  - 当前仓库通过 `package.json` 显式声明 `sdlcHarness.harnessFolderName: ".harness"`。
  - 配置为 `.harness` 时，Skill canonical path 从 `.harness/agents/skills/**` 改为 `.harness/skills/**`。
  - `sdlc-harness init`、`sync`、`upgrade`、`doctor`、`validate-*` 按配置根目录读写 `config.yaml`、`state/**`、`skills/**`、`managed/**`。
  - `AGENTS.md` managed block 在同步时按目标根目录渲染路径。
- Removed:
  - 移除 `.harness/agents/skills/**` 这一层中间目录语义。
- Unchanged:
  - `.work_products/**` 仍是项目文档事实源，不受根目录配置影响。
  - `AGENTS.md` 仍位于项目根，作为 Agent 全局入口。
  - npm 包仍通过 `sync` materialize 工作区可读文件。

## 3. Product Impact（产品影响）

| 受影响 PRD（Affected PRD） | 影响（Impact） |
|---|---|
| `.work_products/01_product/npm_package_distribution.md` | 需要新增 configurable harness root 需求，并说明默认 `.agents`、显式 `.harness` 和 Skill 路径规则。 |

## 4. Technical Impact Candidates（技术影响候选）

| 模块（Module） | 影响（Impact） | 置信度（Confidence） |
|---|---|---|
| `package.json` | 当前仓库需要声明 `sdlcHarness.harnessFolderName: ".harness"`。 | high |
| `.harness/skills/**` | 需要替代 `.harness/agents/skills/**` 作为当前仓库 Skill canonical source。 | high |
| `packages/sdlc-harness/src/lib/config.ts` | 需要读取 JSON root config，并按 root 生成默认 config path 和 managed paths。 | high |
| `packages/sdlc-harness/src/lib/init.ts` | 需要按 root 生成 state/config/managed 文件。 | high |
| `packages/sdlc-harness/src/lib/sync-engine.ts` | 需要按 root 同步 skills、templates、policies、make，并按 root 渲染 AGENTS block。 | high |
| `packages/sdlc-harness/src/lib/migrations.ts` | 需要按 root 迁移 config 和 state。 | high |
| `packages/sdlc-harness/src/lib/doctor.ts` | 需要按 root 检查 config、state 和 managed files。 | high |
| `packages/sdlc-harness/src/lib/validators.ts` | 需要按 root 校验 harness scaffold。 | high |
| `packages/sdlc-harness/source-mappings.yaml` | 当前仓库 source mapping 需要从 `.harness/skills` 读取。 | high |
| `tools/*.py` | 当前仓库本地 Python gate 需要从 `.harness/skills` 读取 Skill。 | medium |
| `README.md`、`AGENTS.md` | 需要说明 configurable root 和当前仓库配置。 | high |

Impact analysis:

```sh
python3 tools/impact_analyzer.py --rfc .work_products/rfc/RFC_002_configurable_harness_root.md --top 40
```

## 5. Acceptance Criteria

- [ ] 无配置时，`sdlc-harness init` 生成 `.agents/config.yaml`、`.agents/state/**`、`.agents/skills/**`、`.agents/managed/**`。
- [ ] `package.json` 配置 `sdlcHarness.harnessFolderName: ".harness"` 时，`sdlc-harness init/sync/validate-harness` 使用 `.harness/config.yaml`、`.harness/state/**`、`.harness/skills/**`、`.harness/managed/**`。
- [ ] `sdlc-harness.config.json` 配置 `harnessFolderName` 时也生效。
- [ ] `harnessFloderName` 作为兼容别名可被读取。
- [ ] 当前仓库 Skill source 移到 `.harness/skills/**`，不再使用 `.harness/agents/skills/**`。
- [ ] `npm test`、`package check-source`、`validate-harness`、`make validate-harness` 通过。

## 6. Regression Requirements（回归要求）

- [ ] 覆盖默认 `.agents` root 的 init/sync/validate 测试。
- [ ] 覆盖 `package.json` `.harness` root 的 init/sync/validate 测试。
- [ ] 覆盖 `sdlc-harness.config.json` 和 `harnessFloderName` 别名读取。
- [ ] 覆盖当前仓库 source mappings 无漂移。
- [ ] 运行 `make validate-current` 确认开发阶段闭环。

## 7. Status

- Status: APPLIED
