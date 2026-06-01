# .docs/05_decisions overview

<!-- generated-by: AI SDLC Harness build_doc_overviews.py -->
<!-- source-hash: ffb1e063642b81fc -->

Generated artifact. Markdown slices remain the source of truth.

Source hash: `ffb1e063642b81fc`

## Source Slices

1. [ADR_001_stage_contracts_and_gates.md](ADR_001_stage_contracts_and_gates.md)
2. [ADR_002_fact_sources_memory_and_overviews.md](ADR_002_fact_sources_memory_and_overviews.md)
3. [ADR_003_plan_state_and_task_history.md](ADR_003_plan_state_and_task_history.md)
4. [ADR_004_lightweight_graph_contracts.md](ADR_004_lightweight_graph_contracts.md)
5. [ADR_005_development_self_test_handoff.md](ADR_005_development_self_test_handoff.md)
6. [ADR_006_authoring_overlay_and_package_boundary.md](ADR_006_authoring_overlay_and_package_boundary.md)
7. [ADR_007_ui_ux_design_stage.md](ADR_007_ui_ux_design_stage.md)
8. [ADR_008_delivery_benchmark_scenario_design.md](ADR_008_delivery_benchmark_scenario_design.md)

---

## ADR_001_stage_contracts_and_gates.md

Source: [ADR_001_stage_contracts_and_gates.md](ADR_001_stage_contracts_and_gates.md)

# ADR 001: Stage Contracts and Gates

Status: Accepted

## Context

软件工程阶段不是 Harness 额外发明出来的流程负担，而是任何软件项目中客观存在的工作内容。区别只在于复杂度低时，这些阶段会被自然压缩甚至隐式完成；当项目稍有复杂度后，需求澄清、产品边界、技术取舍、任务拆分、实现记录、Review、测试、发布和变更处理都会开始产生真实工作量。

如果仍然只依靠对话上下文和若干大文件保存项目上下文，Agent 很容易遇到上下文窗口不足、事实源不清、旧决策和新决策混杂、需求变化影响范围难判断、阶段交付标准缺失等问题。单纯 Vibe Coding 仍然适合单阶段内的生成和迭代，但不适合作为复杂项目的完整项目控制机制。

从阶段开始到阶段交付完成，不能只依赖 Agent 自我声明完成。为了保证产物质量，交付环节通常需要硬约束，例如 lint、typecheck、unit test、integration test、build、coverage、review checklist、release smoke test 等。

## Options

- 继续把需求、方案、开发、Review 和测试混成一段连续聊天。
- 只保留阶段名称和角色提示词，允许 Agent 自行判断何时完成。
- 把阶段目标、输入、输出、Skill、gate 和流转规则契约化。

## Decision

AI SDLC Harness 固定一套阶段契约：每个阶段都有明确的输入、输出、Skill、gate 和下一阶段入口。Agent 在单阶段内部仍然以 vibe 方式执行；Harness 负责规定当前阶段、应读内容、应写产物、应使用 Skill、完成前必须通过的 gate，以及需求变更时如何局部修正链路。

阶段交付硬约束必须作为阶段完成和状态流转的判断依据。Agent 可以触发脚本、修复失败、记录结果，但不能绕过这些约束直接推进状态。

## Rationale

阶段性工作本身存在输入、执行和输出要求。需求阶段要澄清边界和验收标准，产品方案要固化用户场景和 Out of Scope，技术方案要确认架构、接口和任务拆分，开发阶段要落实实现、测试和实现记录，Review、测试、发布阶段要分别验证质量、覆盖风险和交付状态。

如果没有显式设置工作流程和工作阶段，这些要求很容易被压缩成对话里的隐含期待，导致阶段应有的输入缺失、执行步骤遗漏、输出产物不完整。偏差会沿着阶段向下游累积，直到测试阶段才被集中发现，随后转化为返工、修 bug、改需求或重切方案。

## Consequences

- 阶段切换必须通过 gate 和 transition helper，而不是手改 lifecycle 状态。
- Skill 负责提高单阶段 vibe 的产出效率；gate 负责保证阶段交付质量。
- 当前阶段的工作必须落到阶段产物、plan task、implementation doc、Review/Test/Release/RFC 文档或其它正式事实源。
- 复杂项目不能长期只靠“想到什么就让 Agent 写什么”的方式推进。

## Source Trace

- `PROJECT_SPEC.md#2.1`: 稍有复杂度的软件项目天然需要多阶段软件工程。
- `PROJECT_SPEC.md#2.3`: 单阶段主要依靠 vibe 推进，但阶段 Skill 与交付硬约束需要固定进工作流。
- `PROJECT_SPEC.md#3.1`: 总体思路。
- `PROJECT_SPEC.md#5.2`: 阶段契约。
- `PROJECT_SPEC.md#9.2`: 阶段 gate。

## Links

- [PROJECT_SPEC.md](../../PROJECT_SPEC.md)
- [phase_contracts.yaml](../../.codex/pjsdlc_managed/policies/phase_contracts.yaml)

---

## ADR_002_fact_sources_memory_and_overviews.md

Source: [ADR_002_fact_sources_memory_and_overviews.md](ADR_002_fact_sources_memory_and_overviews.md)

# ADR 002: Fact Sources, Memory and Overviews

Status: Accepted

## Context

不同阶段的产物容易分散在不同位置：产品文档可能在 Web AI、Notion、飞书、Confluence 或 Google Docs 中生成；技术方案可能在 IDE Agent 对话里生成；开发过程发生在 coding agent 中；Review 准则可能是临时 skill；测试策略可能靠人工补充。

这种分散会带来切换成本和理解成本。Agent 进入新阶段时，无法天然继承上一阶段的产物、边界、取舍和未解决问题，需要重新读取、总结和对齐。需求变化后，受影响的通常不是单个代码点，而是 PRD、技术方案、接口契约、任务计划、实现代码、测试用例、Review 结论和实现文档组成的一整条链。

RAG 能减少一次性塞进上下文的内容，但固定 chunk 和余弦召回存在信息损失。对 README 这类说明文档，RAG 损失通常可以接受；对需求边界、否定约束、接口契约、测试矩阵、RFC 影响范围等执行约束，不能只依赖 RAG。

## Options

- 依赖对话上下文、长文档和搜索来恢复所有阶段事实。
- 把所有信息长期塞进 `memory.md`。
- 使用 `.docs/**` 语义切片和 `.docs/INDEX.md` 作为事实源，`overview.md` 只做 generated 浏览视图，`memory.md` 只做短摘要和导航。

## Decision

阶段产物统一进入可寻址、可引用、可版本化的项目事实源。Markdown slices 和 `.docs/INDEX.md` 是事实源；`.docs/<stage>/overview.md` 由 `tools/build_doc_overviews.py` 生成，只用于人类浏览和阶段交接。

`<harnessRoot>/state/memory.md` 不承担完整决策记录。memory 回答“下次进入项目要先记住什么、去哪里找”，只保存跨阶段高频事实、约束摘要和到 `.docs/**` 正式事实源的链接。如果 memory 条目需要解释取舍、备选方案或长期后果，应提升为 `.docs/05_decisions/` ADR 或对应 `.docs/**` slice，memory 只保留一行摘要和链接。

## Rationale

每个阶段都需要留下对应产物。阶段产物不是为了堆文档，而是项目上下文的一部分：它记录该阶段已经确认的事实、边界、路径、用例、结果、风险和未决问题，并成为后续阶段继续工作的前提。

`.docs/` 采用粗粒度语义切片：小到足以被稳定检索和引用，大到保持一个完整语义单元，不按固定 token 或段落机械切。`overview.md` 把阶段 Markdown slices 合成总览，方便人类浏览，但需求引用、Review、测试和变更影响分析仍应引用原始 Markdown slice。

## Consequences

- 任意 `.docs/<stage>/**/*.md` 新增、修改、拆分、合并或废弃后，运行 `make docs-overview`。
- 不手写或局部编辑 `overview.md`。
- `.docs/05_decisions/` 只保存 durable decision；当前操作说明仍留 README、skills、templates 或 implementation doc。
- `memory.md` 可以索引 ADR，但不能成为 ADR 正文镜像。

## Source Trace

- `PROJECT_SPEC.md#2.2`: 阶段产物分散，跨阶段衔接存在切换成本和理解成本。
- `PROJECT_SPEC.md#3.3`: 事实源与派生产物。
- `PROJECT_SPEC.md#6.1`: 为什么要语义切片。
- `PROJECT_SPEC.md#6.2`: 各阶段切片责任、ADR 和 memory 边界。
- `PROJECT_SPEC.md#6.3`: overview.md。

## Links

- [PROJECT_SPEC.md](../../PROJECT_SPEC.md)
- [.docs/INDEX.md](../INDEX.md)
- [.codex/state/memory.md](../../.codex/state/memory.md)

---

## ADR_003_plan_state_and_task_history.md

Source: [ADR_003_plan_state_and_task_history.md](ADR_003_plan_state_and_task_history.md)

# ADR 003: Plan State and Task History

Status: Accepted

## Context

`.codex/state/plan.yaml` 是阶段任务的机器可读短期执行记忆，只保留当前和未来任务。`current_phase` 只保存在 `.codex/state/lifecycle.yaml`，`plan.yaml` 不重复保存当前阶段。open task 直接保存当前任务需要的执行合同；任务完成后从 `plan.yaml` 移除，避免过往任务变成无效上下文。

早期设计里，checkpoint 文件、archive 目录、gate results 和 lifecycle history 会让 active state 同时承担“当前现场”和“历史流水”两种职责。随着任务推进，这类信息会膨胀、过期，并持续占用 Agent 默认上下文。

## Options

- 在 active state 中长期保存 done task、phase history、gate logs 和 checkpoint。
- 只在 Git/CI/release 系统中追溯所有历史，不保存任何可恢复的当前现场。
- 让 `plan.yaml` 保存当前和未来任务合同，完成历史转入 implementation docs、git、PR/CI、release evidence 或外部系统。

## Decision

`plan.yaml` 是长程目标被拆分后的短期任务容器，而不是历史任务数据库。凡是与项目目的相关、需要拆成可恢复小步执行的工作，都可以被表达为 plan task；通用 Harness 默认只解释 workflow 关心的任务。

任务完成并写入或更新相关事实源后，从 `plan.yaml` 移除该 task。历史动作记录由 git commit、PR/CI、release evidence 和模块级 implementation doc 共同承担；只有用户明确要求 forensic、audit 或 regression 追溯时，才临时查询冷 archive。

## Rationale

open task 的 `allowed_paths`、`required_gates` 和 `working_notes` 是执行期约束，不是长期查询 API。把它们长期保留会让 Agent 误读过期现场，也会增加每次恢复任务时的上下文噪声。

`plan.draft.yaml` 的设计动机，是在不污染当前执行状态的前提下完成开发交接。技术方案阶段必须证明 PRD 和架构可以落成具体开发单元，但 `plan.yaml` 在 `ARCHITECTING` 时仍是架构阶段的正式执行队列。未来 `SPRINTING` task 因此先进入 `plan.draft.yaml`，在开发阶段被 promote 后同次从 draft queue 删除。

## Consequences

- `lifecycle.yaml` 不保存 phase transition history。
- `plan.yaml` 不长期保存 commit hash、done task 合同或 gate log。
- 任何 draft task promote 成正式 `TASK-*` 时，必须同次从源 draft queue 删除。
- SPRINTING task 完成采用 implementation commit + completion ledger commit 的两段提交。
- `validate-current` 在阶段出口继续执行 no-open 检查。

## Source Trace

- `PROJECT_SPEC.md#5.1`: 生命周期状态。
- `PROJECT_SPEC.md#7.1`: plan.yaml。
- `PROJECT_SPEC.md#7.2`: 开发阶段循环。
- `PROJECT_SPEC.md#7.3`: Plan Protocol。
- RFC lineage: `RFC_004`, `RFC_005`, `RFC_010`, `RFC_011`, `RFC_012`, `RFC_016`。

## Links

- [PROJECT_SPEC.md](../../PROJECT_SPEC.md)
- [.codex/state/plan.yaml](../../.codex/state/plan.yaml)
- [.codex/state/plan.draft.yaml](../../.codex/state/plan.draft.yaml)

---

## ADR_004_lightweight_graph_contracts.md

Source: [ADR_004_lightweight_graph_contracts.md](ADR_004_lightweight_graph_contracts.md)

# ADR 004: Lightweight Graph Contracts

Status: Accepted

## Context

阶段流转最初由阶段节点上的 `next` / `returns` 字段和 transition helper 中的硬编码 RFC interrupt 规则共同表达。这样会形成多个事实源：文档说明、节点局部字段、工具硬编码和 validator 判断可能漂移。

开发自测路径最初主要是 `Module Key Test Path` 文字路径。它轻量，但 Agent、Review 和 Testing 容易漏读其中的分支、checkpoint、scenario、出口和 evidence refs。复杂 runtime/live/provider/browser/worker task 需要更稳定的 handoff path。

## Options

- 继续使用隐式流转字段、长文字路径和工具硬编码。
- 引入轻量 declarative graph，只保存稳定 contract 和 pointer。
- 引入重型 graph engine、node class、edge class、traversal framework、visualizer、schema migration framework 或 execution trace graph。

## Decision

`phase_contracts.yaml` 使用轻量显式有向图表达阶段关系：`phases` 是阶段节点，只保存稳定阶段 contract；`transitions` 是有向边，只保存合法流转、触发语义和少量运行期效果，例如设置或清理 `suspended_phase`。

TESTING bugfix 回流不新增 `bugfix` transition kind，也不新增 bugfix 子状态机；它使用普通 `kind: return` 加 searchable `trigger` 表达：`bugfix_replan` 回 `ARCHITECTING`，`bugfix_implementation_gap` 回 `SPRINTING`。

`self_test_contract` 保留 `module_key_test_path` 作为短文字摘要和兼容入口；复杂或高风险任务可以设置 `graph_required: true` 并提供轻量 `module_key_test_graph` DAG，表达入口、checkpoint、branch、scenario、observable exit 和短 evidence pointer。

不引入 graph engine、node class、edge class、遍历框架、可视化、schema migration 框架、图数据库、执行引擎或 trace graph。

## Rationale

轻量显式图让正常推进、开发前返回、RFC interrupt、RFC resume、BLOCKED interrupt 和 BLOCKED resume 成为固定字段，被 transition helper 和 validator 同时消费，而不是散落在文档说明、`next` / `returns` 字段和工具硬编码里。

TESTING bugfix 的两个回流方向确实影响下一步动作，但它们不需要重型图建模。`bugfix_replan` 与 `bugfix_implementation_gap` 的差别可以通过 edge trigger、`TEST_REPORT.md#Bugfix Route` 和技能提示词稳定表达；新增 transition kind、graph engine 或 bugfix 状态节点会增加迁移和上下文成本，收益不明显。

测试路径选择 DAG 而不是树，是因为多个 scenario 经常共享 setup、分支后汇合到同一出口。选择轻量 DAG 而不是重型测试执行图，是因为需求只是让 Review/Testing 消费 handoff path，不需要执行引擎、trace graph、图数据库、可视化或遍历框架。

结构化不自动等于 Agent 会注意。只有当 Agent 被要求读取它、validator 检查它、信息在固定字段里、并且不和长文档重复漂移时，结构化才真正降低遗漏。

## Consequences

- `transition.py` 从 `phase_contracts.yaml#transitions` 计算合法流转和 `allowed_next_phases`。
- canonical phase nodes 不再使用 `next` / `returns`；旧 consumer policy 由 transition helper fallback 兼容。
- TESTING bugfix recovery 由 `TEST_REPORT.md#Bugfix Route` 选择 `bugfix_replan` 或 `bugfix_implementation_gap`，transition helper 仍只按合法 `from` / `to` 边流转。
- graph 节点和边只保存稳定 workflow contract 或 handoff path skeleton，不保存 task history、operator log、debug evidence、runbook 正文、implementation doc 正文、截图过程、失败探索流水或阶段执行历史。
- 新增 graph 类结构前必须说明 source of truth、consumer、validator、migration/compat path，以及为什么现有 YAML 字段不够。

## Source Trace

- `PROJECT_SPEC.md#5.2`: 轻量显式阶段图、RFC/BLOCKED edge effects、Development Self-Test Graph。
- `PROJECT_SPEC.md#9.2`: validate-design / validate-dev / validate-rfc graph 影响面。
- `.codex/skills/authoring/harness_package_design/SKILL.md`: workflow graph 和 data-structure 变更边界。

## Links

- [PROJECT_SPEC.md](../../PROJECT_SPEC.md)
- [phase_contracts.yaml](../../.codex/pjsdlc_managed/policies/phase_contracts.yaml)
- [ADR 005: Development Self-Test Handoff](ADR_005_development_self_test_handoff.md)

---

## ADR_005_development_self_test_handoff.md

Source: [ADR_005_development_self_test_handoff.md](ADR_005_development_self_test_handoff.md)

# ADR 005: Development Self-Test Handoff

Status: Accepted

## Context

开发阶段自测是阶段契约原则在 `SPRINTING` 中的具体体现。自测不是把 TESTING 阶段前移，也不是让开发者完成完整质量验收；它要求开发阶段先证明本 task / 本模块承诺的 runnable entry、核心路径和 observable exit 已经实际跑通。

否则“核心路径没跑通”“入口启动不了”“配置契约缺失”“最小用例无法完成”这类本应在开发阶段关闭的问题，会被留给后续 Review 或 TESTING 阶段处理。测试阶段的职责应是基于已经可运行、已有开发自测证据的入口做独立验证、回归覆盖和最终判断，而不是替开发阶段补 runtime、补入口、补 bootstrap 或排查最小链路为什么不能运行。

高风险 runtime/live/remote-operator task 还会遇到恢复路径、operator path、session reset、do-not-retry 和 evidence pointer 被埋进长文档的问题。会改变下一步动作的判断如果没有被提升为 hard constraint，后续 Agent 很容易继续错误路径。

## Options

- 不要求开发阶段自测，把 runnable entry/exit 判断留给 REVIEWING 或 TESTING。
- 在 implementation doc 中保存完整 debug log、operator log、证据正文和失败探索。
- 把 Development Self-Test Report 收窄成短 handoff card，证据正文、runbook 和探索记录放到独立位置。

## Decision

当 `self_test_contract.status: "required"` 时，implementation doc 必须包含已执行的 `Development Self-Test Report`，记录 `Report Status: PASS | BLOCKED | IN_PROGRESS | STALE`、contract source、Module Application Entry、scenario results、executed gates、Module Key Test Path、必要时的 Module Key Test Graph、Observable Exit、Current Blocker、Testing Handoff Readiness 和 Evidence Index Refs。

`Development Self-Test Report` 只证明模块入口、核心路径、出口和最小证据指针，不承担 debug log、operator log、runbook、evidence dump 或探索流水职责。主报告不得使用 `Actual Evidence` 正文字段；普通报告目标不超过 80 行，high-risk 报告目标不超过 120 行。

凡会改变下一步动作的判断，必须 promoted 到 `resume_capsule.do_not_retry`、runbook 顶部 `Hard Constraints` 或短 `Current Operator Path`；不能只埋在 evidence、notes、appendix 或长 implementation doc 中。

## Rationale

Review、TESTING、发布判断以及后续 RFC / 需求变更需要复用开发阶段事实，避免后来者重新猜测“入口在哪里、核心路径是否跑通过、哪些用例已经验证、哪些问题仍然缺失”。

自测报告如果膨胀成 evidence dump，反而会让入口、核心路径、出口、当前 blocker 和 Testing handoff readiness 难以被消费。短 handoff card 更符合开发阶段报告的职责边界。

## Consequences

- 只有 `Report Status: PASS` 且所有 scenario 为 `PASS` 才能关闭 development task。
- evidence 正文进入 Evidence Index、CI/artifact、runbook appendix 或外部证据系统；主报告只保存 pointer。
- High-risk task 必须维护 resume-first recovery surface，包括 `resume_capsule`、Current Operator Path、Hard Constraints 和 `.docs/09_runbooks/**` recovery refs。
- Validator 会扫描 session / QR / canonical path / do-not-retry 类关键判断，未 promoted 时 fail。

## Source Trace

- `PROJECT_SPEC.md#2.1`: 开发阶段自测原则。
- `PROJECT_SPEC.md#2.2`: Development Self-Test Report 作为阶段产物。
- `PROJECT_SPEC.md#5.2`: self-test contract、Development Evidence、resume capsule 和 high-risk handoff rules。
- `.docs/04_implementation/harness_workflow/skills_prompt_and_authoring.md`: prompt 和 validator 实现事实。

## Links

- [PROJECT_SPEC.md](../../PROJECT_SPEC.md)
- [Skills prompt and authoring implementation](../04_implementation/harness_workflow/skills_prompt_and_authoring.md)
- [ADR 004: Lightweight Graph Contracts](ADR_004_lightweight_graph_contracts.md)

---

## ADR_006_authoring_overlay_and_package_boundary.md

Source: [ADR_006_authoring_overlay_and_package_boundary.md](ADR_006_authoring_overlay_and_package_boundary.md)

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

---

## ADR_007_ui_ux_design_stage.md

Source: [ADR_007_ui_ux_design_stage.md](ADR_007_ui_ux_design_stage.md)

# ADR 007: UI/UX Design Stage and DESIGN.md Fact Source

Status: Accepted

## Context

原有阶段链路从 `REQUIREMENT_GATHERING` 直接进入 `ARCHITECTING`。这让 PRD 里的用户目标和验收标准可以进入技术方案，但视觉 UI、页面状态、交互行为、响应式、a11y 和设计 token 往往没有独立事实源。后续 Agent 在架构、开发、Review 或测试阶段容易临场补设计，导致体验口径漂移、实现偏离、Review 缺少对照基准、TESTING 重新设计 UI。

Google 开源的 `DESIGN.md` 提供了 agent-readable 设计系统格式，适合保存 colors、typography、spacing、components 等视觉系统事实。但它主要描述视觉系统，不覆盖完整用户旅程、screen contract、状态矩阵和测试种子，因此不能单独替代 UX 交接文档。

## Options

- 继续把 UI/UX 设计作为 `ARCHITECTING` 的一个小节。
- 只引入根目录 `DESIGN.md`，不新增阶段。
- 新增 `UI_UX_DESIGNING` 阶段，并把 `.docs/02_experience/**` 作为体验事实源；视觉 UI 项目再强制 `DESIGN.md`。

## Decision

新增 `UI_UX_DESIGNING` 阶段，插入正常流转 `REQUIREMENT_GATHERING -> UI_UX_DESIGNING -> ARCHITECTING`。该阶段由 `pjsdlc_uiux_design` 负责，出口 gate 是 `make validate-uiux` / `npx sdlc-harness validate-uiux`。

阶段产物拆成两层：

- `.docs/02_experience/<capability>.md` 是体验事实源，记录 PRD refs、Requirement IDs、Applicability、user journeys、IA/routes/screens、screen contracts、component interaction contracts、responsive/a11y acceptance、handoff matrix、open questions 和 out of scope。
- `DESIGN.md` 是 visual UI 项目的视觉设计系统事实源，采用 Google `@google/design.md` 格式。CLI/API/non-visual 项目可以在 UX slice 中声明 `Applicability: cli_or_api_experience` 或 `Applicability: not_applicable`，不强制生成 `DESIGN.md`。

`ARCHITECTING` 可以在进入 `SPRINTING` 前通过 `ARCHITECTING -> UI_UX_DESIGNING` return edge 补体验事实。`TESTING` 发现 PRD 正确但 UX contract 错误时，使用 `Bugfix Route: bugfix_uiux_replan` 回到 `UI_UX_DESIGNING`。进入 `SPRINTING` 后发现设计事实需要变化，按 RFC workflow 处理。

## Rationale

UI/UX 阶段独立出来，是为了让体验设计成为后续阶段可引用、可校验、可变更影响分析的事实源，而不是把页面状态和视觉系统埋在 PRD 或技术方案里。`.docs/02_experience/**` 覆盖用户旅程、screen state 和交接矩阵；`DESIGN.md` 覆盖视觉 token 和组件设计系统。两者组合后，架构可以从 screen contracts 派生 UI task 和 browser scenarios，开发可以按 `docs.uiux` / `docs.design_system` 实现，Review 和 TESTING 可以基于相同 contract 检查一致性。

这个设计保持轻量 declarative 边界：phase graph 只新增阶段节点和少量 return edge；validator 只检查必要产物、引用和 `DESIGN.md` linter error；不引入 Figma/Stitch 设计稿生成器、UI 运行时执行器或重型设计图 schema。

## Consequences

- `phase_contracts.yaml`、`allowed_paths.yaml`、`gates.yaml`、Skill、templates、validators、README 和 package assets 都需要包含 `UI_UX_DESIGNING`。
- `validate-design` 会把 UI/frontend draft task 缺少 `docs.uiux` 或 `docs.design_system` 作为 gate error。
- `SPRINTING`、`REVIEWING`、`TESTING` 和 `RFC_RECALIBRATION` 都必须把 `.docs/02_experience/**` 和可选 `DESIGN.md` 纳入输入或影响分析。
- `DESIGN.md` linter error 阻断 visual UI gate；warning 先报告，不默认阻断。
- 非 visual UI 项目必须显式声明 Applicability，避免为 CLI/API 项目制造无意义设计系统文件。

## Source Trace

- User plan: "UI/UX Design Stage For AI SDLC Harness".
- `PROJECT_SPEC.md#5`: 生命周期与阶段契约。
- `.codex/pjsdlc_managed/policies/phase_contracts.yaml`: canonical phase graph.
- `.codex/pjsdlc_managed/templates/UI_UX_DESIGN_TEMPLATE.md`: UX slice template.
- `.codex/skills/pjsdlc_uiux_design/SKILL.md`: stage Skill.

## Links

- [PROJECT_SPEC.md](../../PROJECT_SPEC.md)
- [README.md](../../README.md)
- [package README](../../packages/sdlc-harness/README.md)
- [UI/UX Skill](../../.codex/skills/pjsdlc_uiux_design/SKILL.md)
- [UI/UX Template](../../.codex/pjsdlc_managed/templates/UI_UX_DESIGN_TEMPLATE.md)

---

## ADR_008_delivery_benchmark_scenario_design.md

Source: [ADR_008_delivery_benchmark_scenario_design.md](ADR_008_delivery_benchmark_scenario_design.md)

# ADR 008: Delivery Benchmark Scenario Design

Status: Accepted

## Context

AI SDLC Harness 的设计目标不是让首轮代码生成更快，而是在复杂项目中提高同等质量交付（same-quality delivery）效率：减少遗漏、返工、上下文漂移、需求变更漏改和交接恢复成本。

早期 `expense-policy-engine` 样本显示，Harness 可以达到同等质量，但历史记录成本明显更高，且成本数据置信度低。这不能直接证明 Harness 更高效，也不能证明它无效。更合理的问题是：当项目复杂度上升、需要多轮 RFC、debug 修复和新对话恢复时，Harness 沉淀的 PRD、UX、architecture、tech plan、implementation doc、review/test/release evidence 是否能减少后续理解和返工成本。

纯 vibe coding 在首轮实现中通常更敏捷，因为它直接面向代码和测试，不需要显性化阶段产物。Harness 的优势如果存在，更可能出现在生命周期后段：新 Agent 重新接手、需求变化影响多层、bug 修复依赖历史上下文、外部 provider / credential 边界存在安全风险。

## Options

- 只测首轮从需求到代码的完成时间。
- 只测最终质量分，不区分完成路径和生命周期成本。
- 选择覆盖恢复、RFC、debug 和高风险边界的 lifecycle benchmark，用同等质量交付作为比较基线。

## Decision

Delivery Benchmark 采用同等质量交付基线，不以首轮代码生成速度作为核心结论。每个 scenario 都必须能回答一个和 Harness 设计目标对应的问题：

- 是否能在同等质量下完成交付。
- 是否能在新对话或 fresh agent 接手时快速恢复当前状态、历史变更、测试入口和下一步安全动作。
- 是否能在 RFC cascade 中减少漏改、partial fix 和跨层漂移。
- 是否能在 debug 修复中保留最新上下文，避免重走错误路径。
- 是否能在 provider/live/credential 等高风险边界中减少 unsafe retry、secret guessing 和证据混淆。

当前 pending lifecycle scenarios 保留不同主证明方向：

- `project-context-recovery-lab`: 主测上下文连续性和 fresh-agent recovery。
- `support-triage-board`: 主测跨 UI/API/policy/test/docs 的 RFC/debug 效率。
- `webhook-provider-bridge`: 主测 provider/live 边界、安全约束和 do-not-retry 行为。

每个 lifecycle scenario 都采用 `INITIAL_DELIVERY`、`RECOVERY`、`RFC`、`DEBUG` 阶段指标，并记录 `context_recovery_score`、`wrong_path_count` 和最终质量分。外部 observer 只负责总耗时和文件活动可信度；语义阶段、wrong-path 和质量判断仍来自 lifecycle probe、rubric、diff、docs 和 operator scoring。

每个 lifecycle scenario 也要带 `gate_profile.md`。Gate profile 区分 orientation、domain focused gates、Harness task gates、phase exit gates 和 out-of-scope gates，尤其要标出 out-of-scope package regression。这样可以保持同等质量门槛，同时避免每个 fresh agent session 一开始就运行与当前 scenario 无关的 full Harness/package validation，制造错误的成本信号。

## Rationale

这组 benchmark 与 Harness 工作流设计一一对应：

- 阶段契约和 gate 的价值，应体现在 RFC/debug 后仍能维持同等质量，而不是只看首轮产码速度。
- `.docs/**` 事实源、implementation doc、review/test/release evidence 的价值，应体现在 fresh-agent recovery 更快、更准确。
- RFC workflow 的价值，应体现在复杂变更后更少漏改和 partial fix。
- runbook、evidence boundary 和 do-not-retry 约束的价值，应体现在高风险 provider/live 场景中更少危险路径。

因此，benchmark 故意不选择只适合一次性实现的小 demo。场景应保持中高复杂度：足够触发上下文恢复、跨层变更和 debug 返工，但不能大到无法在可控时间内重复运行。

## Consequences

- 单个历史样本不能证明 Harness 更快或更高效；报告必须保守表达证据边界。
- 新结果必须同时包含 `baseline` 和 `harness`，并达到同一最终质量 rubric，才适合进入公开报告。
- 若 Harness 在首轮更慢但在 recovery、RFC、debug 或 wrong-path 上追回成本，这才支持“生命周期效率提升”的判断。
- 若复杂 lifecycle scenarios 仍无法追回成本，应回到工作流设计本身，判断是项目复杂度不足、阶段产物过重、gate 成本过高，还是 Harness 目标假设不成立。
- Benchmark scenario 选择本身属于 Harness authoring evidence，不是 npm package public API。
- Gate 成本必须和产品实现时间分开解释。报告应区分 product verification gates 与 workflow-control gates；除非 package source 或 managed assets 发生变化，否则不应把 package source sync/check、workspace full regression 或 consumer-lab validation 算进 scenario delivery cost。

## Source Trace

- `PROJECT_SPEC.md#一最终目的`: 效率定义为复杂项目中的阶段目标、交付物、上下文衔接、需求变更和交付约束效率。
- `PROJECT_SPEC.md#2.1`: 单纯 Vibe Coding 适合单阶段生成，但不适合作为复杂项目完整控制机制。
- `PROJECT_SPEC.md#2.2`: 阶段产物和事实源用于降低切换成本与理解成本。
- `PROJECT_SPEC.md#3.2`: 阶段契约化、产物仓库化、变更补丁化和实现文档增量化。
- `examples/delivery-benchmark/README.md`: Delivery Benchmark scenarios, lifecycle efficiency probe and result policy.
- `examples/delivery-benchmark/RUNBOOK.md`: 首个 `project-context-recovery-lab` pilot 的 operator protocol。

## Links

- [PROJECT_SPEC.md](../../PROJECT_SPEC.md)
- [Delivery Benchmark README](../../examples/delivery-benchmark/README.md)
- [Delivery Benchmark Runbook](../../examples/delivery-benchmark/RUNBOOK.md)
- [ADR 001: Stage Contracts and Gates](ADR_001_stage_contracts_and_gates.md)
- [ADR 002: Fact Sources, Memory and Overviews](ADR_002_fact_sources_memory_and_overviews.md)
