# ADR 006: Authoring Overlay and Package Boundary

Status: Accepted

## Context

本仓库既是 reference implementation，也是 authoring workspace。它保存 Harness 工作流能力源码、当前自举项目的 state data、当前自举项目的 `.docs` 产物，以及面向其它项目分发的 npm 包源码。

普通业务项目通过 `sdlc-harness init` 得到工作流入口、Skill、policy、template、state 初始结构和 `.docs/**` 产物目录；本仓库在这套工作流之上开发 Harness 工作流本身。因此，本仓库需要比普通用户项目更多的工作流开发约束，但这些约束不能因为本仓库是 package source 就自动成为所有用户项目的默认配置。

npm 包长期产品形态不应依赖每个业务项目直接 fork 整套配置。更稳的方式是把通用 Harness 能力拆成可版本化的 npm 包，并把业务项目中的工作流文件视为由包同步出来的 agent-readable artifact。

## Options

- 把本仓库的全部 authoring 规则、state 和 docs 都作为通用模板分发。
- 只保留 npm 包源码，不在工作区 materialize agent-readable workflow files。
- 分离通用 Harness 配置、项目实例数据和 Harness authoring overlay，并通过 sync/upgrade 安全 materialize 通用资产。

## Decision

通用 Harness 配置进入 `<harnessRoot>/skills/**`、`<harnessRoot>/pjsdlc_managed/**` 或 package assets；项目实例数据留在 `<harnessRoot>/state/**` 和 `.docs/**`；Harness authoring overlay 留在 `.codex/skills/authoring/**`，默认不进入 npm 包，也不 materialize 到用户项目。

README 和 package README 是用户指南和迁移/升级说明入口；`PROJECT_SPEC.md` 记录稳定目标、设计理由、概念模型和当前 canonical behavior；implementation doc 记录真实实现事实；ADR 记录长期设计取舍的“为什么”。版本迁移路径、升级操作步骤、release-specific evidence 或临时恢复 SOP 不进入 `PROJECT_SPEC.md`。

### Workflow Configuration Boundary

这里的“工作流配置”不只是一组 skill 或 Skill，而是定义 Harness 如何运行的一整套协议：

- Agent 入口和角色规则：`AGENTS.md`、`<harnessRoot>/skills/**/SKILL.md`。
- 阶段与 gate 策略：`<harnessRoot>/pjsdlc_managed/policies/**`。
- 阶段产物模板：`<harnessRoot>/pjsdlc_managed/templates/**`。
- state protocol：`lifecycle.yaml`、`plan.yaml`、`plan.draft.yaml`、memory 的字段结构、状态枚举、迁移规则和校验逻辑。
- task/plan protocol：`current_task_id`、`next_task_sequence`、`tasks[]`、`summary`、`result_docs` / `implementation_doc` 和 open task 的 `allowed_paths` / `required_gates` 如何组成短期执行记忆。
- memory protocol：memory 如何记录、校验、提升、失效，以及如何链接到 `.docs/**` 正式出处。
- validators、lifecycle transition、sync、upgrade、migration 等确定性工具逻辑。

需要特别区分：

```txt
状态结构 / schema / 生命周期规则 = Harness 工作流配置内容
状态实例 / 当前值 = 当前项目运行数据
```

`lifecycle.yaml` 应该有哪些字段、`plan.yaml` 应该如何拆分、phase/status 枚举是什么、plan 和 memory 如何校验，这些都属于 Harness 工作流配置，应进入 npm 包；但当前项目处于哪个 phase、当前 task 是什么、open task 里有哪些执行备注、memory 记录了哪些具体事实，则属于当前项目实例数据，不应被包升级覆盖。

### Authoring Workspace Boundary

本仓库中实际开发的项目有两个紧密相关的目标：

1. 迭代 AI SDLC Harness 工作流配置本身：调整阶段规则、Skill、policy、template、state protocol、plan protocol、memory protocol 和 validators；通过 `.docs/**` 记录需求、架构、技术方案和真实实现；通过 `.codex/state/**` 记录当前自举项目的运行状态。
2. 开发并迭代 npm 包分发能力：将工作流配置和产物模板打包为 `agent-project-sdlc`，让其它项目可以通过 `sdlc-harness init`、`sync`、`upgrade` 接入和持续升级，并通过 `sdlc-harness package sync-source` / `check-source` 防止包内 canonical source 漂移。

本仓库保存：

```txt
Harness 工作流能力源码
+ 当前自举项目的 state data
+ 当前自举项目的 .docs 产物
+ 面向其它项目分发的 npm 包源码
```

npm 包导出：

```txt
state schemas / initial state templates / validators / lifecycle transition logic
task-plan protocol / memory protocol
skills / policies / templates / sync / upgrade / migrations
```

npm 包不导出当前项目的具体运行数据，例如当前 `current_phase`、当前 `plan.yaml` 内容、open task 执行备注、memory 条目和 `.docs/**` 产物。

### Authoring Overlay Boundary

Harness authoring overlay 用于回答：

- 迭代 Harness npm 包时必须遵守哪些额外原则。
- 哪些规则只约束工作流源码仓库，而不应分发给普通业务项目。
- 当新增 package sync、migration、validator、Skill、模板或策略时，Agent 应额外读取哪些约束。
- 某条自举规则什么时候应该晋升为通用 Harness 能力。

语义边界：

| 层级 | 示例路径 | 是否默认进入 npm 包 | 责任 |
|---|---|---|---|
| 通用 Harness 配置 | `.codex/skills/**`, `.codex/pjsdlc_managed/**` | 是 | 面向所有接入项目的阶段 Skill、模板、策略和默认规则 |
| 项目实例数据 | `.codex/state/**`, `.docs/**` | 否 | 当前项目的状态、需求、方案、实现、测试和发布事实 |
| Harness authoring overlay | `.codex/skills/authoring/**` | 否 | 只约束本仓库迭代 Harness 自身的原则、专用 Skill 和包化安全规则 |

自举维护 Harness 自身时的阶段化测试流程、全量 consumer lab 验收提示词、测试脚本使用提示词和缺陷归因 SOP 属于 authoring overlay。它们只能沉淀在 `.codex/skills/authoring/**` 或 authoring-only 文档中，不写入通用 `.codex/skills/pjsdlc_*` workflow Skill。

### Package Materialization Boundary

包内维护 canonical source：

- CLI，例如 `sdlc-harness init`、`sdlc-harness sync`、`sdlc-harness upgrade`、`sdlc-harness doctor`。
- 默认 `<harnessRoot>/skills/*/SKILL.md`。
- 默认 `<harnessRoot>/pjsdlc_managed/templates/*`。
- 默认 `<harnessRoot>/pjsdlc_managed/policies/*`。
- 默认 `<harnessRoot>/pjsdlc_managed/make/sdlc-harness.mk`。
- `<harnessRoot>/state/**` 的 schema、初始状态模板、plan protocol、memory protocol 和 migrations。
- 校验脚本、迁移脚本和 overview 生成脚本。

业务项目内保留 agent 实际读取和项目事实源：

- `AGENTS.md`。
- `<harnessRoot>/skills/**`，由 `sdlc-harness sync` 从包内 materialize 到工作区，作为 Skill canonical source。
- `<harnessRoot>/pjsdlc_managed/**`，承载模板、策略和默认 Makefile targets 等可版本化工作流配置。
- `<harnessRoot>/state/**` 的具体数据，例如当前 phase、当前 task、open task 执行备注、memory 条目和 gate 结果；这些值只属于当前项目，不由包覆盖。例外是 `memory.md#Harness Guidance` 这类明确隔离的 package-managed section。
- `<harnessRoot>/config.yaml`，记录 core package identity、schema version、managed files 和 local overrides；package version 从已安装 npm package manifest 获取，不在 config 中持久化。
- `.docs/**`，作为当前项目的需求、方案、实现、测试、发布事实源。例外是 `.docs/INDEX.md#Harness Maintenance Rules` 这类明确隔离的 package-managed section。

正确流程是：

```txt
npm package = canonical source / version source / migration source
sdlc-harness sync = materialize 到工作区固定目录
workspace files = Agent 实际读取入口
state protocol = 包提供 schema / template / validator / migration
<harnessRoot>/state concrete data + .docs = 项目事实源，升级不覆盖
```

### Sync / Upgrade Boundary

`sdlc-harness init` 先询问目标 Agent，默认 `Codex -> .codex`；`Other` 才继续询问自定义 folder，直接回车默认 `.agent`。也可以通过 `package.json#sdlcHarness.harnessFolderName`、`sdlc-harness.config.json#harnessFolderName` 或显式 `--harness-folder` 配置。

`sync` 负责把包内默认 Skill、模板、策略文件和默认 Makefile targets materialize 到工作区固定位置，并为 managed files 写入版本和 checksum metadata。`upgrade` 自动执行 `sync`，但 state schema migration 只升级结构，不覆盖项目自己的状态值。

项目本地定制不应直接改 managed files。推荐使用：

```txt
<harnessRoot>/pjsdlc_managed/override_skills/<skill_name>.md
<harnessRoot>/pjsdlc_managed/policies/*.local.yaml
```

Skill override 的 v1 行为是追加合成；未知或嵌套的 skill override 路径必须阻塞 sync，避免用户误以为本地提示词已生效。未来如果实现模板或其它 workflow config override，也必须放在 `<harnessRoot>/pjsdlc_managed/**` 下，不在 `<harnessRoot>` 顶层新增泛用 `overrides/` 目录。

## Rationale

多数 Agent 在启动或路由 Skill 时，只读取工作区内固定目录，例如 `AGENTS.md`、`.codex/skills/**/SKILL.md`、`.agent/skills/**/SKILL.md` 或类似约定。它们通常不会直接扫描 `node_modules` 中的包内容。因此 npm 包不能只把 Skill 藏在包里；需要 `sdlc-harness sync` materialize 到工作区固定目录。

同时，用户仓库可能已经改过 `AGENTS.md`、`Makefile`、local policies、Skill overrides、模板覆盖、状态数据或业务文档。`sync` 和 `upgrade` 必须增量合并，不得全量覆盖用户项目事实。

## Consequences

- `package sync-source` 默认不复制 `.codex/skills/authoring/**` 到 `packages/sdlc-harness/assets/**`。
- `sdlc-harness sync` 和 `upgrade` 默认不把 authoring overlay materialize 到用户项目。
- 如果 authoring rule 对所有用户项目都有价值，必须通过 PRD、tech plan 或 RFC 明确晋升为通用 Skill、policy、template、PROJECT_SPEC 或 README 规则。
- 修改 public package behavior 时，README 和 package README 必须同步覆盖入口命令、配置方式、sync/upgrade 行为、本地 override、validator 和发布/诊断能力。
- 用户耦合 Markdown 文件只通过固定 heading section 或 managed block 更新 package-managed guidance，不能覆盖用户正文、memory 条目、产物地图或链接。
- `AGENTS.md`、`Makefile` 等高冲突入口只能通过 managed block、include block 或 create-if-missing 方式接入，不能整文件覆盖。
- `.github/workflows/harness.yml` 只更新 marker-managed 文件或完全等于旧版 generated workflow 的文件，自定义无 marker workflow 必须跳过并报告 `customized`。
- migration 只能做可解释、可回滚、可诊断的结构变更；遇到 marker 缺失、checksum 漂移、override 冲突或无法判定的本地改动时，应停止并报告 blocker。

## Source Trace

- `PROJECT_SPEC.md#3.4`: 项目级 singleton workflow。
- `PROJECT_SPEC.md#17`: 本工作流项目如何使用工作流迭代自己。
- `PROJECT_SPEC.md#18`: npm 包化与项目接入。
- `.codex/skills/authoring/harness_package_design/SKILL.md`: authoring overlay 专用规则。

## Links

- [PROJECT_SPEC.md](../../PROJECT_SPEC.md)
- [README.md](../../README.md)
- [package README](../../packages/sdlc-harness/README.md)
- [Authoring skill](../../.codex/skills/authoring/harness_package_design/SKILL.md)
