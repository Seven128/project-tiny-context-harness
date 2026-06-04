---
name: harness_package_design
description: Use only in this repository when changing AI SDLC Harness workflow rules, Minimal Context package distribution, source sync, validators, release automation, delivery benchmarks, or authoring overlay.
---

# Harness Package Design Authoring Skill

## 目的

只服务于本仓库作为 AI SDLC Harness authoring workspace 时的维护工作。当前 canonical product 是
Minimal Context Harness：默认只维护 `project_context/**` 这组最小长期事实源，帮助新会话 agent
快速恢复项目目标、边界、模块入口、验证入口和下一步安全动作。

这不是用户项目默认分发的额外能力，不会通过 `package sync-source` 进入
`packages/sdlc-harness/assets/**`。如果一条 authoring 规则对所有用户项目都有价值，先确认它是否符合
Minimal Context 目标，再同步到通用 `AGENTS.md` managed block、package README、Context template、
validator 或 CLI。

## 产品边界

- Harness 维护上下文质量，不替项目证明产品质量。
- 产品质量由项目自己的代码、测试、smoke、CI、hidden probe 或人工验收负责。
- 默认事实源只有 `project_context/global.md`、`project_context/architecture.md`、`project_context/modules/*.md`、代码和必要测试。
- ADR、PRD、tech plan、implementation doc、review/test/release/RFC 文档链不再是默认产物。
- 旧阶段式工作流的设计思想和历史发现只保留在 `PROJECT_SPEC.md` 的历史迭代说明中。
- 旧项目迁移命令已经退役；不要重新引入阶段式迁移入口或 legacy stage artifacts 作为默认能力。

## 角色提示词

你是 AI SDLC Harness 的自举维护者。你的目标是让 npm package、Context validator、
benchmark 和 release automation 保持一致，避免旧阶段式工作流通过文档、assets、测试或提示词悄悄复活。

修改前先区分三类内容：

- 通用 Minimal Context 配置：可能进入 `AGENTS.md` managed block、`packages/sdlc-harness/assets/**`、
  Context template、validator、Makefile include 或 README。
- 本仓库 Context：只描述当前源码仓库状态，写入 `project_context/**`，不作为用户项目默认内容。
- Historical stage notes：只存在于 `PROJECT_SPEC.md` 的历史说明里。

做设计判断时回到当前目标：用最少事实源提升 agent 恢复上下文、后续迭代和 debug 的效率。随着模型能力增强，
需求拆解、技术推理、实现细节和测试策略不应默认外化成厚文档链；只有代码看不出来、后续恢复容易丢失、
或跨模块长期稳定的约束，才进入 Context。

## 变更规则

1. 修改 package 对外行为时，同步检查 `README.md` 和 `packages/sdlc-harness/README.md`。
2. 修改通用 managed guidance、Context template、Makefile include、validator 或 package docs 后，运行
   `node packages/sdlc-harness/dist/cli.js package sync-source` 和
   `node packages/sdlc-harness/dist/cli.js package check-source`。
3. 不要把 `.codex/skills/authoring/**` 同步到 package assets。
4. 新增或修改 `sync`、`upgrade`、validator、release automation 时，显式检查默认安全行为、
   dry-run 行为、重复执行结果和失败恢复。
5. `sync` 永远只刷新 managed assets、default Skills 和工具；不得生成项目语义内容。
6. `upgrade` 只运行安全 migrations 和 `sync`；不得重新引入语义迁移入口。
7. `validate-context` 只检查 Context 是否可恢复，并阻止伪造“测试已通过”；不要把产品测试质量塞进 Harness gate。
8. 产品方案 / UIUX Skill 的项目本地定制入口是 `<harnessRoot>/pjsdlc_managed/override_skills/*.md`；`sync` 合并到 `<harnessRoot>/skills/**`，不得让用户直接编辑 package-managed Skill 产物。
9. 不要在新项目 init、sync、README、benchmark prompt 或 package assets 中要求阶段状态、stage skill、phase gate 或厚文档链。
10. Delivery Benchmark 当前只保留骨架和基本场景描述；旧阶段式结果不作为当前 Minimal Context 证据。重新跑前，
   不要发布新效率结论。
11. 任何 benchmark 结论都必须来自 fresh baseline 与 Minimal Context Harness 对照运行，并使用高置信耗时和质量证据。
12. `PROJECT_SPEC.md` 记录稳定设计原则和精简历史迭代；升级操作和 release-specific evidence 放在 README、
    package README 或对应脚本/测试说明中。

## 常用入口

- `project_context/global.md`
- `project_context/architecture.md`
- `project_context/modules/*.md`
- `PROJECT_SPEC.md`
- `README.md`
- `packages/sdlc-harness/README.md`
- `packages/sdlc-harness/source-mappings.yaml`
- `packages/sdlc-harness/assets/**`
- `packages/sdlc-harness/src/**`
- `examples/delivery-benchmark/**`
- `tests/sdlc-harness/**`
- `tools/consumer_lab_full_test.mjs`
- `tools/release_npm.mjs`

## 完成检查

- [ ] 变更仍符合 Minimal Context：默认事实源是 `project_context/**`，不是阶段式文档链。
- [ ] 如果修改了通用 package assets 或 source mappings，source sync/check 已通过。
- [ ] README 和 package README 已覆盖 public CLI、sync、upgrade、validator 和 Skill override 行为。
- [ ] `PROJECT_SPEC.md` 只记录稳定设计和精简历史，不承载操作 runbook。
- [ ] Legacy stage artifacts 只作为历史说明存在，不作为迁移输入、测试 fixture 或默认 package 能力。
- [ ] Delivery Benchmark 没有发布旧阶段式结论或低置信数字。
- [ ] 相关 `tests/sdlc-harness/**` 已更新并通过。
- [ ] `make validate-context` 或 `make validate-harness` 已通过。
