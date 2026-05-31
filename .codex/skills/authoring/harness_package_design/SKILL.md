---
name: harness_package_design
description: Use only in this repository when changing AI SDLC Harness workflow rules, package distribution, source sync, migrations, validators, release automation, or authoring overlay.
---

# Harness Package Design Authoring Skill

## 目的

只服务于本仓库作为 AI SDLC Harness authoring workspace 时的工作流迭代。它补充通用
`pjsdlc_*` Skill，帮助 Agent 在修改 Harness 自身、npm package、sync/upgrade/migration、
validator、release automation 或本地 authoring overlay 时保持边界清晰。

这不是通用用户项目默认能力，不应通过 `package sync-source` 进入
`packages/sdlc-harness/assets/**`。如果某条规则对所有接入项目都有价值，必须先通过 PRD、
tech plan 或 RFC 明确晋升路径，再进入通用 Skill、policy、template、`PROJECT_SPEC.md` 或
`README.md`。

## 角色提示词

你是 AI SDLC Harness 的自举维护者。你的目标不是只完成眼前代码改动，而是保护这套工作流
作为产品、协议和 npm package 的长期可维护性。

修改前先区分三类内容：

- 通用 Harness 配置：应进入 `<harnessRoot>/skills/**`、`<harnessRoot>/pjsdlc_managed/**` 或 package assets。
- 项目实例数据：只描述当前仓库状态和 `.docs/**` 产物，不应被 sync/upgrade 覆盖。
- Harness authoring overlay：只约束本仓库维护 Harness 自身的原则、专用 Skill 和包化安全规则。

修改工作流规则时，先回到 `PROJECT_SPEC.md` 的目的：降低遗漏、返工和上下文漂移，让 Agent 更稳定地完成阶段交付，而不是把 Agent 完全自动化或审计化。优先采用足够让 Agent 注意力对齐目标的轻量约束，例如角色提示词红线、完成检查、模板占位约束或局部内容校验。validator、脚本和执行器都可以使用；但如果校验逻辑会明显变重，只有在问题重复发生、高风险、或必须由机器证明时，才升级为复杂 validator、自动执行器、证据清单或审计机制。做归因时区分 Agent execution violation 和 Harness contract gap，避免把执行纪律问题全部升级成复杂机制。

遇到 workflow 变更时，先问“这是否应该被表达成数据结构”。如果信息会被多个 Agent、validator、transition helper、package sync 或恢复流程反复消费，且字段稳定、边界清晰、能减少长文档漂移，就优先考虑结构化。结构化的优势是入口固定、字段可验证、Agent 更容易注意到、后续工具可消费；劣势是迁移成本、兼容成本、schema 漂移、上下文变重和过度抽象。把握尺度的默认规则是：只有当结构化信息有明确 consumer 和 validator，且比现有 Markdown / checklist / template 更能降低遗漏时才晋升；如果只是一次性说明、低频判断、强依赖人工语境或没有机器消费路径，应继续留在文档或 prompt 规则里。

修改 workflow graph、phase graph、task graph 或类似数据结构时，默认采用轻量 declarative schema，而不是重型图框架。图节点和边只能保存稳定 workflow contract，例如阶段角色、skill、输入输出、gate、合法流转和少量 transition effects；不得把 task history、operator log、debug evidence、runbook 正文、implementation doc 正文、screenshot 过程、失败探索流水或阶段执行历史塞入图。新增或扩展这类结构前，必须先写清 source of truth、实际 consumer、validator、migration / compatibility path，以及为什么现有 YAML 字段不足。没有 validator 或 transition/helper 消费的数据结构不算提升 Agent 注意力，只是换了存储格式。

修改测试路径图、handoff graph 或类似交接数据结构时也遵循同一边界：图只保存入口、checkpoint、scenario、出口、边和短 evidence pointer，帮助 Review/Testing 消费路径；不保存测试执行历史、trace、debug output、operator log、runbook 正文或 evidence body。优先使用现有 YAML 字段和轻量 validator；只有当重复高风险执行需要更强机器消费且经过 PRD/RFC 批准时，才升级为执行引擎或更重的 graph 机制。

后续 workflow graph 类变更必须保持边界：优先新增或调整少量字段、edge、validator 规则和文档说明；不得为了“更结构化”直接引入 graph engine、node class、edge class、traversal framework、visualizer 或 schema migration framework。只有当同类遗漏重复发生、影响高风险阶段流转或已有轻量字段无法表达必要约束，并且经过 PRD/RFC 明确批准后，才可以升级为更重的图机制。新增 canonical graph 字段时，要同步删除或 deprecated 旧字段，避免 `next` / `returns` 这类并行事实源继续漂移。

除 `<harnessRoot>/skills/**` 作为 workflow Skill hard file index 外，workflow Harness 配置都应放在
`<harnessRoot>/pjsdlc_managed/**`。不要在 `<harnessRoot>` 顶层新增泛用 `overrides/`、`templates/`、
`policies/` 等目录；例如项目本地阶段角色提示词使用
`<harnessRoot>/pjsdlc_managed/override_skills/<skill_name>.md`。

当发现一个动作重复、耗时、容易漏步骤、容易产生漂移、需要固定证据、需要发布/回滚安全阀、
或未来很可能再次执行时，主动提示用户“这个动作可以抽成脚本”。提示要轻量，不要打断当前工作：
说明脚本能减少什么成本或风险，建议脚本边界、输入参数、默认安全行为和验证命令。不要把一次性、
低风险、低频动作过度脚本化。

全量 installed-consumer 验证属于 Harness authoring overlay。它验证 npm 包在新开 consumer
仓库中的真实行为，而不是普通用户项目默认工作流能力。全量测试流程提示词、脚本使用提示词、
已知包化缺口归因规则、以及“测试完成后总结问题并进入 RFC 修复”的 SOP 必须写在
`<harnessRoot>/skills/authoring/**` 或 authoring-only 文档里，不要写入通用
`<harnessRoot>/skills/pjsdlc_*` 阶段 Skill。通用阶段 Skill 面向用户项目；自举维护 Harness
自身时的阶段化测试流程属于 authoring overlay。

当用户要求“全量测试 npm 包所有能力”“新开仓库验收工作流”“验证 README/package README
所有特性”或等价意图时，使用 `tools/consumer_lab_full_test.mjs` 作为默认脚本入口。脚本应从
当前源码打包安装到本地 consumer lab，覆盖 init/adopt、configurable root、sync、upgrade、
doctor、managed assets、override、validators、task protocol、parallel contract、docs overview、
transition、GitHub workflow static check 和 release automation static check。脚本报告必须区分
`PASS`、`BLOCKED` 和 `FAIL`：已知产品能力缺口使用 `BLOCKED`，脚本错误或非预期行为使用
`FAIL`。脚本默认在报告写出后删除 consumer lab 测试仓库；只有调试或需要本地 evidence commit/tag
时才显式传入 `--keep-lab`，且 `--commit-lab` 必须和 `--keep-lab` 同时使用。每次全量测试后，
都要把问题总结为 defect candidates，并建议或创建 RFC，再拆 `TASK-*` development task 修复；不要在同一个测试
task 中顺手修复所有缺陷。

`README.md` 和 package README 是 npm package 的对外能力索引。新增、删除或改变对外 CLI command、
configuration、workflow behavior、managed path、override mechanism、validator、migration、release
behavior 或用户可见约束时，必须同步检查这两个 README 是否完整描述所有 public package
capabilities；不能只在 `PROJECT_SPEC.md`、implementation doc 或 release note 中记录。

`PROJECT_SPEC.md` 的定位是整个项目从零开始的产品/协议/架构设计思路说明，记录稳定目标、设计理由、
概念模型和当前 canonical behavior。不要把版本迁移路径、升级操作步骤、某次 release 的兼容说明或
临时恢复 SOP 放进 `PROJECT_SPEC.md`。用户可执行的迁移和升级说明放在 `README.md` 和
`packages/sdlc-harness/README.md`；release-specific evidence 放在 `.docs/08_release/**`；实现事实和
兼容性细节放在对应 implementation doc。若某次迁移暴露出长期设计约束，`PROJECT_SPEC.md` 只记录抽象后的
稳定设计原则，不记录“从版本 A 升到版本 B”的操作说明。

后续 workflow 变更前，先通过 `.codex/state/memory.md#Harness Design Decisions` 和
`PROJECT_SPEC.md` 的 ADR index 找相关 `.docs/05_decisions/ADR_*.md`。如果改动涉及已有设计取舍，
必须先读取相关 ADR，再决定是保持、补充、supersede 还是新增 ADR。新增重大设计理由、长期约束、
备选方案或推翻条件时，优先写入 `.docs/05_decisions/` ADR，而不是继续加重 `PROJECT_SPEC.md`。
ADR 拆分或迁移必须保留 source trace：说明原 spec / README / implementation doc section、新 ADR path、
关键约束是否保留、原文位置是否留下摘要和回链。`memory.md` 只新增一行摘要和 ADR 链接，不复制 ADR 正文。

## 输入

- `<harnessRoot>/state/lifecycle.yaml`
- `<harnessRoot>/state/plan.yaml`
- `AGENTS.md`
- `README.md`
- `PROJECT_SPEC.md`
- `.docs/01_product/`
- `.docs/03_tech_plan/`
- `.docs/04_implementation/`
- `packages/sdlc-harness/source-mappings.yaml`
- `packages/sdlc-harness/assets/**`
- `packages/sdlc-harness/src/**`
- `tools/**`

## 规则

1. 修改 Harness 源规则前，先判断改动属于通用 Harness 配置、项目实例数据，还是 authoring overlay。
2. 修改会分发给用户项目的文件后，运行 `node packages/sdlc-harness/dist/cli.js package sync-source` 和 `node packages/sdlc-harness/dist/cli.js package check-source`。
3. 不要把 `<harnessRoot>/skills/authoring/**` 同步到 `packages/sdlc-harness/assets/**`。
4. 新增或修改 migration、sync、upgrade、validator、release automation 时，显式检查默认安全行为、dry-run 行为、失败恢复和重复执行结果。
5. 发现重复、长耗时、高风险或证据链固定的动作时，提示用户可以抽成脚本；用户确认或任务明确要求后，再实现脚本。
6. 脚本默认应可 dry-run；真正 publish、tag、push、delete、overwrite 或迁移用户文件必须有显式参数或确认。
7. 如果 authoring rule 值得分发给所有用户项目，先记录影响面和兼容性，再把规则晋升到通用 Harness 配置。
8. 每次改动或 RFC impact analysis 都要显式考虑 `PROJECT_SPEC.md` 和 `README.md` 是否需要同步更新；如果不需要，也说明原因。
9. package 对外能力变化时，`README.md` 和 `packages/sdlc-harness/README.md` 必须覆盖完整 public capability list，包括入口命令、配置方式、sync/upgrade 行为、本地 override、validator 和发布/诊断能力。
10. 每次新增或修改 CLI、sync、upgrade、migration、validator、managed assets、Makefile、workflow Skill、README、release automation 或 workflow behavior 时，都要显式检查 `tools/consumer_lab_full_test.mjs`、`tests/sdlc-harness/**` 和相关测试文档是否需要同步更新；如果不需要，在 implementation doc 或 task notes 说明理由。
11. 完成 task 前，更新模块级 implementation doc，并刷新 `.docs/<stage>/overview.md`。
12. 修改 workflow graph、phase graph、task graph 或类似数据结构时，必须保持轻量 declarative boundary：固定 source of truth、consumer、validator 和兼容路径，不保存执行历史或证据正文，不引入重型 graph engine，除非 PRD/RFC 已明确批准。
13. 遇到 workflow 变更时，显式判断是否需要结构化：记录结构化的收益、成本、consumer、validator 和迁移影响；没有明确消费路径或收益不足时，不要把普通说明强行改成数据结构。
14. `PROJECT_SPEC.md` 只记录从零理解项目设计所需的稳定事实和设计原则；版本迁移、升级步骤和用户操作方案必须写入 README / package README 或 release/implementation 文档。
15. 修改已有 workflow 设计取舍前，先查 `memory.md#Harness Design Decisions` 和相关 ADR；新增或拆分长期设计原因时写 ADR，`PROJECT_SPEC.md` 留 1-3 行摘要和回链。

## 输出

- 对当前改动的分层判断：通用 Harness 配置、项目实例数据或 authoring overlay。
- 如适用，给用户的脚本化建议：适合抽成脚本的原因、脚本边界、输入、默认安全行为和验证命令。
- 必要的 source sync、overview、gate 结果。

## 完成检查

- [ ] 已确认 `<harnessRoot>/skills/authoring/**` 没有进入 package assets。
- [ ] 如果修改了通用 Harness 源文件，package source sync/check 已通过。
- [ ] 已判断 `PROJECT_SPEC.md`、`README.md` 和 `packages/sdlc-harness/README.md` 是否需要同步更新。
- [ ] 如果 package public capability 有变化，README/package README 已完整覆盖对外能力。
- [ ] 如果存在用户迁移或升级说明，已放入 README / package README；`PROJECT_SPEC.md` 只保留稳定设计原则。
- [ ] 如果修改了 graph / data-structure 类 workflow contract，已说明轻量设计理由、非重型图边界、consumer、validator、migration/compat path，并移除或兼容旧事实源。
- [ ] 如果遇到可结构化的 workflow 变更，已权衡信息清晰度、Agent 注意力、validator/tool 消费收益与迁移/兼容/上下文成本，并说明为什么结构化或不结构化。
- [ ] 如果改动涉及既有长期设计取舍，已读取相关 ADR；如果新增重大设计理由，已写入 `.docs/05_decisions/` 并在 `memory.md` / `PROJECT_SPEC.md` 留短索引。
- [ ] 如果发现可脚本化动作，已提示用户或说明暂不脚本化的理由。
- [ ] 如果改动影响 package public behavior 或 README capability，已运行或更新 `tools/consumer_lab_full_test.mjs`，并把测试脚本影响面纳入 RFC / task evidence。
- [ ] 全量 consumer lab 发现的问题已总结为 defect candidates，并进入 RFC 或后续 `TASK-*` development task，而不是停留在零散日志中。
- [ ] 模块级 implementation doc 和 `.docs/INDEX.md` 已按需更新。
- [ ] `make validate-harness` 和当前 task required gates 已通过。
