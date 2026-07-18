# Project Tiny Context Harness

Project Tiny Context Harness 是给 AI coding agents 用的轻量项目记忆层，也是一套可由 npm 包管理的上下文与交付 Harness。它为仓库提供耐久项目记忆、轻量默认工作流，以及显式启用的 Single-Goal Rolling Delivery（单目标滚动交付）长程工作流；它不是 Agent 调度器，也不接管 Git 编排。

[English](README.md)

产品原则是：**保留项目记忆，丢掉流程仪式感**。公开推广与 README 以英文主入口为准，中文文档作为二级入口。

## 为什么存在

编码 Agent 同时需要两类能力：跨会话仍然可靠的少量项目事实，以及长任务经历多轮修改或上下文压缩后仍可信的完成检查。

Tiny Context 将两者保持为窄边界：

1. **Minimal Context**：`project_context/**` 保存产品归属、架构、契约和可重复验证等耐久事实。
2. **Workflow Contract**：普通任务使用 Context-first 的轻量默认循环和平台内部计划，不要求计划文件。
3. **Long-Task Workflow**：显式使用 `long-task-delivery-v2`、编译期 Claim Coverage、滚动修复验证与 Live Final Gate。

它不会启动模型、创建 Agent、分支或 worktree，不会 merge、push、创建 PR 或部署，也不会取代项目测试和人工产品验收。

## 快速开始

```powershell
npx --yes project-tiny-context-harness ty-context init
# 已有项目文件的仓库：
npx --yes project-tiny-context-harness ty-context init --adopt

npx --yes project-tiny-context-harness ty-context validate-context
npx --yes project-tiny-context-harness ty-context doctor
```

更新 package-managed 表面：

```powershell
npx --yes project-tiny-context-harness ty-context upgrade
npx --yes project-tiny-context-harness ty-context sync
```

`upgrade` 先执行安全迁移再同步；资产刷新不会推断或覆盖用户编写的 Context、source、Delivery Contract 或历史文件。

默认 Profile 是 `core-portable` 与 `workflow-default`。显式启用长程能力：

```powershell
ty-context enable long-task
```

它会安装 `/source-plan-authoring`、`/long-task-workflow` 与完成 Hook，不安装模型 Worker、Agent runtime、调度器或 Git 编排资产。

## Minimal Context 与默认工作流

默认读取顺序是：

```text
project_context/global.md
project_context/architecture.md
project_context/context.toml
最少的图相关 area/role Context
```

只有近乎所有任务都需要的恢复事实才使用 `read_policy = "default"`；专业架构、契约、部署和历史细节应由任务触发按需读取。`ty-context doctor` 会报告确定性的默认 Context 文件/字节规模、单文件与总量软预算超限，以及字节完全相同的默认文件。这些只是维护提示，不是新验证 Gate 或运行时状态。

Context 负责耐久的意图和边界，代码负责当前实现，测试/CI/浏览器或运行时证据/人工负责行为与产品验收。

普通任务：

1. 读取最少相关 Context；
2. 决定 `Context Delta: none|required`；
3. 耐久语义改变时先更新 owner Context；
4. 使用平台内部计划；
5. 实现并运行项目验证；
6. 执行 Contract Conformance 与 Context drift 检查。

默认工作流不要求 `plan.md`、matrix、verdict、evidence ledger 或第二份执行计划。任务时长、文件数和复杂度不会自动激活长程状态。

每次交接只报告一个 Context 结果：

```text
Context: updated <文件/原因>
# 或
Context: no durable fact change
```

### 架构与模块质量

技术架构能力属于 Minimal Context。高风险工作在平台内部计划中使用 `Architecture Context Hit`、`Decision Rationale Hit: existing|required|none` 和 `Modularity Check: none|required|exception`，不创建 Task Contract 或固定 `plan.md`。只有新长期模块/能力、公共 API/Schema/data/persistence、source of truth/state ownership、dependency direction、跨 area、migration/security/recovery 或可复用抽象才触发架构 Gate；小修复不支付这项成本。Gate 要明确 owner、唯一事实源、依赖方向、接口/状态生命周期、失败/恢复/兼容、禁止绕过路径和项目自己的可执行架构检查。

Harness 只路由仓库原生 lint/AST/dependency/contract check，不实现跨语言通用架构分析器。`check-modularity` 的语句数/分支风险会定位到最高风险函数和行号。

### 可选 Source Plan Authoring

只有用户明确要求初版方案、源方案、方案源稿、Source Plan，或要求审计/重构这类后续实现与 Contract Authoring 的输入时，才使用 `/source-plan-authoring`。

它输出一份自包含 Markdown Source Plan：

- 保留直接要求及其限定条件；
- 必要推导必须标记并写明 `Derived From`；
- 无来源的新产品选择进入 `DEC`/`decision_required`；
- Outcome 只按可独立判断的可观察结果拆分；
- 重要 Source 项使用稳定语义 Key 与显式 Anchor；
- 强制技术义务使用 `OBL`，非强制实现建议使用 `HINT`；
- 每个已决定的 `CTRL` 分别记录 Location、User task、Trigger、Input、Loading、Empty、Success、Failure 与 Feedback；
- 明确“不算完成”的 Source 含义使用 `NCOMP`；
- 每个 `RISK` 明确 Fact、单个 Affected Outcome、Basis 与 Consequence，无法确定时进入 `DEC`；Fact 必须精确使用 Runtime 的十个名称：`public_api_or_schema_change`、`persistent_data_change`、`data_migration`、`security_boundary_change`、`permission_boundary_change`、`irreversible_external_effect`、`critical_user_path`、`full_population_operation`、`multi_repository_change`、`weak_observability`；
- 每个 AC 只代表一个 Given/When/Then 可观察场景，显式列出对应 `REQ`/`CTRL`/`OBL`/`NCOMP` Key，且不能首次偷渡新需求。

它不更新项目 Context，不绑定真实仓库 owner/path/runner，不生成 Delivery Contract YAML，不执行实现，不创建工作流状态，也不声明完成。`HINT` 不是 Material Source Item；Source Plan Skill 不输出 `ty-source-item` Marker，Marker 由后续 repository-aware Long-Task Authoring 插入。Source Plan 是 Source，不是 Contract Draft。推荐结构只是 Authoring Fast Path；普通文本方案仍可直接作为 Long-Task Source。

## Single-Goal Rolling Delivery

只有用户显式调用 `/long-task-workflow`，或当前 worktree 已有 active long task 时才使用。它固定为：

- 一个平台原生、持续的 Goal；
- 一个用户选定的仓库/worktree；
- 一次完整选定交付、一个 Contract、一个 Final Gate；
- Outcome 依赖只表示验收就绪关系，不表示 Worker 调度；
- 当前 Goal 内部滚动展开实现 Frontier；
- targeted verify 只用于修复，永远不能 accepted；
- Final Gate 在一个当前快照上重跑全部 Check；
- Stop Hook 在结果 stale 时阻止完成。

Long-Task Contract Authoring 会尽量保留 Source 中已有的稳定 Key 与 Anchor。保持产品含义的结构分解和有真实证据的仓库绑定可以继续；新增业务规则、默认值、恢复行为、权限或范围必须进入 `decision_required`，不能静默加入。缺少推荐 Source Plan 结构不构成阻塞，但激活前必须完成只插入标记、不改写原文的 Material Source Item 枚举。

第一次正式 Compile 成功前，`delivery-contract.yaml` 是同一份非权威 Contract Draft。`/long-task-workflow` 可以跨多轮仓库/Context 读取和 Preflight 修复持续修改它，不要求一次响应生成完整 Contract。Draft Authoring 与后续流程集成，是因为仓库绑定和验证输入需要真实证据、Preflight finding 必须回写同一对象，而且额外 handoff 容易丢失语义或产生第二计划/权威。不存在单独 Contract Draft Skill、Draft Receipt 或 Authoring State。

Long-Task Skill 采用渐进读取：主 `SKILL.md` 只保留目标、硬边界和阶段路由，Contract Authoring、Evidence Design 与 Authority Lifecycle 细节只在对应阶段读取一层 reference。这只是指令组织，不产生第二权威。Source 或 Controlling Context 已声明的架构约束，使用现有 Technical Obligation/Global Constraint/Forbidden Shortcut、owner/path/Binding 和项目可执行 Check 闭环；当功能 AC 与架构约束可独立失败时，两者不能互相替代。

Draft Outcome 只是 Authority Lock 前的 Outcome。Outcome 按可独立观察、判断和定向验证的结果拆分，使当前 Goal 能缩小 dependency-ready 工作集、定向验证、定位失败、恢复 finding 并精确失效旧局部结果。`depends_on` 只表示 acceptance readiness，Rolling Frontier 只是临时工作状态；Outcome 不是 Worker、scheduler task、queue 或并行单元。Outcome 拆分执行和诊断，不拆分完成权威，因此最终仍必须在当前最终快照运行一次完整 Final Gate。

平台负责物理 Goal/会话生命周期。新会话通过 `resume` 恢复语义状态；Tiny Context 不会重建此前的物理 Turn。

### CLI

```text
ty-context long-task init <workdir>
ty-context long-task preflight <workdir>
ty-context long-task compile <workdir>
ty-context long-task compile <workdir> --revise
ty-context long-task approve-authority-revision <workdir> --revision <sha>
ty-context long-task explain <workdir>
ty-context long-task verify <workdir> [--outcome <key>] [--check <key>]
ty-context long-task status <workdir>
ty-context long-task resume <workdir>
ty-context long-task doctor <workdir>
ty-context long-task final-gate <workdir>
ty-context long-task stop-check <workdir> [--message <text>]
ty-context long-task close <workdir>
ty-context long-task abandon <workdir> [--force-corrupt-state]
```

- `init` 创建单文件 inline Outcome 的 Compact Contract 模板。
- `preflight` 应用 Compact 默认值并一次输出 Source/REQ/CTRL/OBL/AC、Context、风险、路径/Binding、Runner/Input 与 Proof 诊断；完全相同的诊断会合并并给出 `occurrences`，已知问题可附稳定 `refs` 和不会弱化权威的 `repair_hint`。它完全只读，不创建 Authority Lock、marker、cache、progress、Receipt、pending revision、状态锁，也不运行项目 Check。
- `compile` 生成 Global 与 Outcome Result/Requirement/Control-field/Non-completing/Technical Claim，拒绝未覆盖 Claim，并让第一次正式成功 Compile 立即成为 Authority Lock。此后所有 revision 都与 active authority 比较，删除 progress/Receipt/cache 或恢复代码不能重新开放弱化窗口。
- `verify` 先把 Counterfactual Finding 投影进所属 Check Result：原本 passed 的 Main Check 变为 `invalid_evidence`、Claim Proof 清空，再在重查 active task/revision/compiled/worktree identity 后写 scoped Progress；因此 Outcome/Global Check 的失败都能由 status/resume 恢复，且不新增 Global Outcome 状态。并发 revision 返回 `active_authority_changed_during_verify`。
- `status` 输出 `unverified`、`progress_passing`、`progress_failing`、`progress_stale` 或 `blocked_external`；同时用 `final_workflow_status` 报告 fresh Final Receipt（发生 drift 后为 `null`），并完整返回 active Contract 的 `external_confirmations`。它从 common-dir authority snapshot 读取，并把 workdir cache 缺失或不一致报告为可修复诊断。
- `resume` 完全只读，从 common-dir authority snapshot 输出 task/contract identity、风险、相关 Context、Git 状态、相同的 `final_workflow_status` 与 external confirmations、ready Outcome、findings 和 next safe action。
- `final-gate` 在完整 Check 后再次验证 active identity；并发 revision 返回 `active_authority_changed_during_final_gate`，不能产生 accepted。
- `stop-check` 与 `close` 自己运行 Live Final Gate，并只用 accepted identity 做 CAS clear。机器范围通过但外部交付仍待确认时，Stop Hook 允许停止并显示非阻断 `systemMessage`；`close` 返回 `workflow_status` 和完整 `external_confirmations`。`status: closed` 只表示机器 Authority 已清理，不表示完整外部交付完成。
- `abandon --force-corrupt-state` 仅用于损坏/mismatch/legacy-unrecoverable 状态或遗留锁，只删除确定性 active state 与 `<workdir>/.ty-context/**`。

### Delivery Contract

`long-task-delivery-v2` 在同一个文件中保持 Product Authority、Technical Boundary Authority 与 Acceptance Authority。Compact YAML 只省略确定性默认值，规范化后的 Contract、Authority Hash 与 Compiled Identity 和完整展开形式一致。Compiler 为可观察结果、原子 Requirement、包括 location 在内的控件字段、非完成结果、技术义务和禁止捷径生成机器 Claim。

Contract 顶层包含：

- `task`：完整目标、source 路径、相关 Context 与 snapshot 模式；
- `risk`：`auto | standard | strict` 与明确 risk facts；
- `global`：非目标、owner boundary、技术约束、禁止路径/捷径和全局 Check；
- `outcomes`：可独立判断并可定向验证的结果、依赖、REQ、产品/控件状态与位置、稳定技术义务和命名 AC。

作者只编写 task、Outcome、control 与 Check key。Compiler 生成 `OUT.<outcome-key>` 和 `CHECK.<outcome-key>.<check-key>`。它会拒绝未知/重复键、YAML alias/tag/merge、多文档、依赖环、不安全路径、无效 Context/source/runner、缺失 package script、没有可执行 Check 的 Outcome，以及没有 browser proof 的 UI Outcome。

Global non-goal、constraint 与 forbidden shortcut 分别生成 `GLOBAL.non_goal.<key>`、`GLOBAL.constraint.<key>`、`GLOBAL.forbidden_shortcut.<key>`，并必须由 Global Check 使用局部 ref 覆盖。Non-goal 与 forbidden shortcut 必须使用 negative proof；constraint 可使用任一 polarity。Global 与 Outcome Check 不得跨 Claim scope。Global forbidden path 不生成 Claim，继续由 changed-path 静态边界执行。

带 Claim 的 structured Global Check 还必须声明 `global.acceptance.counterfactual_controls`。每个 control 通过 `binding_ref: <outcome-key>.<binding-key>` 复用 Outcome 拥有的实现 carrier，不新增 Global Binding 层。`existing` mutation target 在 Preflight/Compile 时必须存在；`planned` target 可在实现前缺失，但 Final Gate 时必须存在，并参与 Progress freshness。

Runner 支持 `package_script`、`project_binary`、`node_oracle`、`playwright_test`。Proof surface 支持 `ui_browser`、`runtime_behavior`、`api_contract`、`data_state`、`security_boundary`、`population_coverage`、`implementation_structure`。

### 一个 Contract 与 Source Claim

用户选定的一次完整交付始终只有一个 Contract 和一个 Final Gate，即使 Outcomes 业务关联较弱。Outcome 只按“可独立判断、可定向验证”的结果拆分；模型输出长度、YAML/文件长度、前后端层、模块数量、并行偏好或 Agent 容量都不是拆分依据。新 Authoring 使用 inline Outcomes；既有 `outcome_files` 只保留物理文件兼容意义，不产生语义、状态或完成边界。

V2 强制至少一个真实 `source_path` 与一个 `source_claim`，且每个声明的 Source 文件至少包含一个 Material Item；纯背景资料不得进入 Source Authority。Authoring 阶段必须在原始 Markdown 中仅插入不渲染的 `ty-source-item:start/end` 标记，不得改写 Item 原文。支持 `outcome_result`、`requirement`、`control`、`acceptance`、`technical_obligation`、`non_completing`、`non_goal`、`forbidden_shortcut`、`risk_fact`、`external_confirmation`、`decision`。Risk marker 必须同时写出精确 `fact=<fact-name> outcome=<outcome-key>`；其 metadata、disposition 与 `risk.facts` 必须一致，且一个 Fact/Outcome pair 只能有一个 Source owner。所有 Source 文件中的 Marker key 与 Source Claim key 必须集合完全相等且全局唯一。嵌套、重叠、未闭合、空内容、非法 key，以及 `statement` 与 Marker 文本在有限空白规范化后不一致，都会阻止 Compile。

类型化 disposition 分开整体结果、Requirement/Control/Obligation/Non-completing Claim、单一命名 Acceptance Assertion、Global Constraint/Non-goal、Risk Fact/Affected Outcome、External Confirmation 与真实决策。Source Plan Risk 与 Runtime 使用同一十项精确名称：数据迁移只用 `data_migration`，关键路径弱可观察拆成 `critical_user_path` 与 `weak_observability`，`multi_repository_change` 保留到 Compiler 明确拒绝。每个非 Decision Source Item 必须且只能拥有一个同 Kind、同规范化文本的 Canonical Target，两个 Source Item 不得拥有同一 Target。Outcome Source Acceptance 必须原样对应一个 `<outcome>.<check>.<assertion>` criterion，并证明至少一个被独立 Requirement/Control/Obligation/Non-completing Source Item 支撑的非 Result Claim。Global Source Acceptance 使用 `GLOBAL.<check>.<assertion>`，同样保持 criterion 原文一致，只能证明 Global Claim，且至少一个 Claim 由另一个 Source non-goal、technical obligation 或 forbidden shortcut 精确支撑。`out_of_scope` 已退休：Source 明确的 non-goal 由 Global Negative Proof 覆盖；排除原本在范围内的要求只能进入 `decision_required`。普通 prose/Source Plan 只需 Marker 枚举，不必改成严格 YAML；Compiler 诚实地不声称能发现未标记的自然语言隐含要求。

Delivery Set 主动编排以及一次选定交付内部的多顶层 Contract 拆分都已退休；`ty-context delivery-set ...` 只返回固定、不可执行的 tombstone。

第一次成功 compile 后，Source/Context/Product/Global 语义、Product Claim 与 Verifier Content 的变化都进入精确 Authority Revision；是否运行过 verify 不再影响审批边界。纯 package root/version relocation 可自动 system revision，bundle/schema/hook 字节变化必须用户批准。Contract 与 Check execution 字段都有编译期 policy 分类。

所有 path-bearing 字段在 hash/matcher 前使用同一个 canonical grammar：Windows 分隔符与单个 leading `./` 规范为 `/`，只有 runner `cwd` 可单独为 `.`；内部 `.`/`..`、控制字符、空 segment、绝对/drive/UNC 路径以及不支持的 glob 语法全部拒绝。

## 确定性风险分级

- **L0**：局部、可逆、可直接测试的任务走默认工作流。
- **L1 standard**：多个可观察 Outcome 或需要跨会话恢复，且有可靠可执行验证。
- **L2 strict**：公共 API/schema、持久数据、迁移、安全/权限边界、不可逆外部影响、全量 population，或可观察性弱的关键主路径。严格 proof 绑定到具体风险 Outcome；不支持多仓库交付。

用户可以主动升级为 strict。显式 `standard` 低于计算出的最低级别会以 `risk_level_below_required` 失败。Strict 所需 negative、counterfactual、population、security、environment、rollback/recovery proof 由 Compiler 按风险强制。实际 changed path 越界时返回 `scope_escape` Finding，由同一个 Goal 复核风险/归属、修订并重新 compile。

## Evidence 与完成权威

最终接受来自当前可执行证据，不来自 Agent 文本。Evidence Adapter 由 Runner 派生：只有 `playwright_test → playwright_json_v1` 可以证明 `ui_browser`，其余 Runner 均为 `structured_json_v2`，只能证明非浏览器 Surface。Adapter 进入 Acceptance、Raw Execution、Compiled、Progress 与 Receipt identity。每个 Outcome 至少有一个非 Result 原子 Claim，且 `required_proof_surfaces` 必须 all-of 全覆盖。Claim-bearing Assertion 使用显式 Expected 比较；`truthy/falsy` 禁止，`exists` 仅允许证明 `implementation_structure` Obligation。

所有共享同一 Raw Execution identity 的 Check 中，一个 Claim-bearing Observation 只能属于一个 Assertion。Playwright Claim Proof 的唯一形式是 `playwright.case.<ac-key>.passed equals true`；Test Title 使用 `[ac:<assertion-key>]`，每个 Test Instance 最多绑定一个已声明 AC，普通标签被忽略，旧 `[<key>]` 只兼容已声明 Key。Aggregate/executed/skipped/status/count 仅供诊断。Missing、Skipped、Flaky、Unexpected、Failed、同一 Test 多 AC，以及同一 Project 内重复 AC 全部 fail-closed；同一 AC 跨不同 Project 只有所有 Instance 均通过才聚合为通过。

Outcome Counterfactual 绑定本 Outcome 的 Binding；Global Counterfactual 通过 `binding_ref` 绑定某个 Outcome 拥有的 Binding，两者都只能修改 carrier 的可证明子集。`structured_json_v2` 继续要求 completed、exit-zero 且失败集合严格等于 designated `assertion_value_mismatch`。弱可观察 `playwright_json_v1` Counterfactual 只有在 JSON 完整、无 root error、全部 unexpected Test Instance 唯一对应指定且真实执行的 AC、其他声明 AC 全部通过，并且没有 unbound/额外 Test、missing/skipped/flaky/timeout/interrupted AC、Artifact/Population/Environment 或其他 Evidence 失败时，才允许 exit one；exit zero 却报告 unexpected 或 exit code 大于一仍 fail-closed。只有退出码被完整解释后，才移除无 Assertion Key 的通用 `test_failed` 并规范化指定 AC；普通 Playwright Baseline 仍要求 exit zero。标准 Playwright 的冻结测试内容属于 trusted verifier input，无需 Counterfactual；`weak_observability` Outcome 的每个 claim-bearing Playwright AC 及相关 Claim 都必须有同 Check 敏感性，恒真、部分覆盖或其他 Check 的 proof 均失败。Report error、declared/unbound unexpected 与逐 AC unexpected/timeout/interruption Observation 只用于诊断，不能绑定 Claim。每个 Claim-bearing structured Check 都必须通过同 Check、覆盖对应 Claim 的 Counterfactual 证明敏感性；正常可观察性下，同 Check Population 只豁免自身 Claims，弱可观察性下不豁免。Structured Result 还必须由 `result` 加至少一个相关非 Result Claim 共同形成失败根。只有整个 Check `passed` 后才输出 Claim/Population Proof。Finding 与 Explain 覆盖 Check、Counterfactual、Population、Scope/Binding、Source Mapping、Canonical Target、Adapter、缺失 Surface 和 Sensitivity，并串起 Source→Canonical Target→Claim/AC→Surface→Check→Adapter→Observation；Global Source AC 还会显示 Source-backed Global Claim、Global Counterfactual 与 Outcome-owned `binding_ref`。

Workdir cache 不能定义 previous authority。Commit、verifier migration、clear 与 abandon 共用唯一 active-state lock；Final/Verify 结束前重查 identity，Stop/close 使用 accepted-identity CAS。开发期 V2 Active Authority、Progress 与 Receipt 不迁移：doctor 报告 `manual_required`，用户升级 Contract 后重新形成 Authority Lock。损坏 continuity 由 doctor 指向显式 `abandon --force-corrupt-state`。

Final Gate 只能运行 Contract 声明的验证命令，禁止真实部署、支付、迁移执行或不可逆生产副作用。Retry 默认关闭，仅当 `transient_once`、幂等且 effect 为 read-only/test-sandbox 时允许一次。Runner 默认只获得最小系统环境白名单，额外 env var 必须由当前 Check 精确声明，未声明 secret 不会继承；受保护 authority/proof 文件拒绝 symlink 与可检测 hardlink。网络隔离由外部平台负责。Counterfactual V2 只有在指定 Assertion 精确失败且不存在 artifact、population 或其他 finding 时才有效，Population V2 证明实体全集覆盖。每个 Outcome 必须有 executable Check；人工、CI、部署和产品确认只进入 `external_confirmations`，机器通过但仍待确认时状态为 `machine_accepted_external_pending`。Receipt 仅供审计，不能复用为接受权威。

## 兼容与迁移

0.6.0 退休 V1 Schema/runtime 与 repo-local Hook。Enable、disable 与 upgrade 只逐 entry 删除精确识别的 Tiny Context managed Hook。旧 package absolute command 只有同时命中已知 managed status 与 `node_modules`、pnpm 或 workspace package 布局时才会迁移；无 status 或仅名称相似的 user Hook 保留，也绝不会仅因命令含有 `composite` 就删除。Upgrade 把未完成 V1 active state 报告为 `manual_required`，且绝不会把 V1 progress/Receipt 导入 V2 权威。Delivery Set、`composite-campaign` 与 `composite-long-task` 命令都是不可执行 tombstone。

0.6.0 在保留 `long-task-delivery-v2` 名称与 `outcome_files` 物理解析形式的同时，定义第一版公开 V2 语义；不再承诺开发期 Draft 可直接激活。旧 Draft 对缺失 Source Marker、Result 压缩、缺少 Criterion、`out_of_scope`、非 Playwright Browser Proof 与 Required Surface 未全覆盖给出明确迁移诊断。可选 Source Plan Authoring 不新增 Schema、CLI、Preflight、Compile、Validator、Receipt、Authority 或状态。Preflight 与直接 Compile 使用同一 Activation Safety Kernel，因此跳过 Preflight 也不能绕过 Criterion 或任何完成安全规则。

`/normal-long-task` 也只是 `/long-task-workflow` 的退休提示，不再生成 checklist、prompt、Local Audit、matrix、verdict 或第二套权威。

## 开发与验证

```powershell
npm install
npm run format:check
npm run typecheck --workspace project-tiny-context-harness
npm run build --workspace project-tiny-context-harness
node --test --test-concurrency=1 tests/ty-context/source-plan-authoring-skill.test.mjs tests/ty-context/sync-init-doctor.test.mjs tests/ty-context/workflow-contract-routing.test.mjs
npm run test:delivery-contract --workspace project-tiny-context-harness
npm run test:long-task-workflow --workspace project-tiny-context-harness
npm run test:long-task-performance --workspace project-tiny-context-harness
npm test
npm run smoke:quickstart
npm run preview:pack
npm run launch:check
node packages/ty-context/dist/cli.js package check-source
make validate-harness
```

模块化门禁是 `ty-context check-modularity`；例外必须包含 `owner`、`introduced_at`、`reason`、`tracking_issue` 和 `expiry_condition`。

## 诚实限制

- Harness 不创建或恢复平台物理 Goal/会话。
- 它不能证明用户从未遗漏未声明需求。
- 核心长程执行不提供并行 mutation runtime。
- 它不观测平台 token 或模型调用数。
- Network policy 会约束传给 runner 的代理环境，但不是操作系统 sandbox。
- 同用户/管理员文件篡改、系统级 Hook 绕过不在安全边界内。
- Git/PR/CI、部署与人工产品确认仍由外部系统负责。

## License

MIT
