# Project Tiny Context Harness

Project Tiny Context Harness 是给 AI coding agents 用的轻量项目记忆层，也是一套由 npm 包管理的上下文与交付 Harness。它为仓库提供耐久项目记忆、轻量默认工作流，以及显式启用的 Single-Goal Rolling Delivery（单目标滚动交付）长程工作流；它不是 Agent 调度器，也不接管 Git 编排。

[English](README.md)

产品原则是：**保留项目记忆，丢掉流程仪式感**。公开推广与 README 以英文主入口为准，中文文档作为二级入口。

## 为什么存在

编码 Agent 同时需要两类能力：跨会话仍然可靠的少量项目事实，以及长任务经历多轮修改或上下文压缩后仍可信的完成检查。

Tiny Context 将这些能力保持为窄边界：

1. **Minimal Context**：`project_context/**` 保存产品归属、架构、契约和可重复验证等耐久事实。
2. **Workflow Contract**：普通任务使用 Context-first 的轻量默认循环和平台内部计划，不要求计划文件。
3. **Long-Task Workflow**：显式使用 `long-task-delivery-v2`、编译期 Claim Coverage、一次 Authority Lock 后的模型选择、滚动修复验证与 Live Final Gate。

它不会启动或切换模型，不会创建 Agent、分支或 worktree，不会 merge、push、创建 PR 或部署，也不会取代项目测试和人工产品验收。

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

`upgrade` 先执行安全迁移再同步；资产刷新不会推断或覆盖用户编写的 Context、Source、Delivery Contract 或历史文件。

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
default area root
manifest/trigger 命中的少量 area/role Context
```

只有近乎所有任务都需要的恢复事实才使用 `read_policy = "default"`；专业架构、契约、部署和历史细节应由任务触发按需读取。

### 双路由 Context 发现

在判断 `Context Delta` 前，Agent 不再只依赖 `triggers`、`read_when` 与 `read_policy`：

1. 先根据 `context.toml` 的 area、role、trigger 和 graph 收集候选；
2. 再从任务中提取少量高信号词，例如明确的 area/module 名、API、Schema、state、security、verification、deployment 词，对 `project_context/**` 做一次 bounded text search；
3. 合并两路候选，只读取真正相关的 Context；
4. 再判断 `Context Delta: none|required`。

这次搜索只补充语义判断，不会把所有关键词命中都当成 Authority，也不会创建向量/持久索引、缓存、Registry、search state 或第二权威。它仍可能漏掉完全不同的同义词或间接依赖，因此高风险任务还需要 Architecture Context Hit 与收尾 Conformance。

`ty-context doctor` 会报告确定性的默认 Context 文件/字节规模、单文件与总量软预算超限，以及字节完全相同的默认文件。这些只是维护提示，不是新验证 Gate 或运行时状态。

Context 负责耐久的意图和边界，代码负责当前实现，测试/CI/浏览器或运行时证据/人工负责行为与产品验收。

普通任务：

1. 读取 core/default Context，收集 manifest 候选；
2. 在 `project_context/**` 做一次 bounded Context search；
3. 决定 `Context Delta: none|required`；
4. 耐久语义改变时先更新 owner Context；
5. 使用平台内部计划；
6. 实现并运行项目验证；
7. 执行 Contract Conformance 与 Context drift 检查。

默认工作流不要求 `plan.md`、matrix、verdict、evidence ledger、持久检索索引或第二份执行计划。任务时长、文件数和复杂度不会自动激活长程状态。

每次交接只报告一个 Context 结果：

```text
Context: updated <文件/原因>
# 或
Context: no durable fact change
```

### 架构与模块质量

技术架构能力属于 Minimal Context。高风险工作在平台内部计划中使用 `Architecture Context Hit`、`Decision Rationale Hit: existing|required|none` 和 `Modularity Check: none|required|exception`，不创建 Task Contract 或固定 `plan.md`。

只有新长期模块/能力、公共 API/Schema/data/persistence、source of truth/state ownership、dependency direction、跨 area、migration/security/recovery 或可复用抽象才触发架构 Gate；小修复不支付这项成本。Gate 要明确 owner、唯一事实源、依赖方向、接口/状态生命周期、失败/恢复/兼容、禁止绕过路径和项目自己的可执行架构检查。

Harness 只路由仓库原生 lint/AST/dependency/contract check，不实现跨语言通用架构分析器。`check-modularity` 的语句数/分支风险会定位到最高风险函数和行号。

### 视觉交付指导

对设计系统、重设计、高保真实现或 visual polish，`context_uiux_design` 在任务内部维护一个风险比例化的 Visual Coverage Set，覆盖生产 surface/component、viewport、theme/mode、state、content stress 与 accessibility/motion 条件。它只是内部计划，不是必需 matrix 或新权威。耐久 surface/interaction 事实仍属于 `project_context/**`，耐久视觉语义与理由属于 `DESIGN.md`；项目只声明一个精确 token 手工事实源和一个生成方向。`context_development_engineer` 把这些意图绑定到生产组件/真实 route，只报告真正渲染和检查过的组合，静态 kit 或 mock 不能替代产品 UI 证据。

显式 Long-Task 仍通过现有 Requirement、Control、Assertion、`ui_browser`、verification input 与 `external_confirmation` 表达视觉要求。影响验收的截图 baseline 是冻结的 verifier input，生成截图/diff 只是 review artifact，主观设计或新 baseline 批准保持外部确认。这项指导不新增视觉 Schema、risk level、lifecycle state、Gate 或必需 artifact，也不修改默认 Workflow Contract。

### 可选 Source Plan Authoring

用户明确要求初版方案、源方案、方案源稿、Source Plan，或要求综合、细化、审计后续实现与 Contract Authoring 的 Source 时，使用 `/source-plan-authoring`。输入既可以是一份接近完成的方案，也可以只是目标，加上零散笔记、产品/技术文档、截图、图表等混合附件。用户只需说明附件角色、产品目标、参考资料是精确目标还是灵感，以及希望 Skill 细化即可；不需要先填固定问卷或整理统一大纲。

它输出一份自包含 Markdown Source Plan：

- 为每份附件建立 Input Inventory，完整检查有实质含义的页面、画面与屏幕，未读内容或覆盖缺口必须显式报告，不能静默抽样；
- 保留直接要求及其限定条件；
- 必要推导必须标记并写明 `Derived From`；
- 在对比调研或实质性的产品、技术、架构、供应商选型前，先判断哪些用户取舍会改变调研范围、候选集或推荐；如果质量与性价比、交付速度、可靠性、隐私、供应商锁定、运维成本等关键偏好不明确，就先用简短、有针对性的问题询问用户，不重复询问已有偏好，也不打断推荐不会改变的局部可逆选择；
- 偏好边界明确后，再决定是否以及如何调研；外部能力、价格、额度、许可、兼容性、区域、安全与支持等时效性事实使用当前权威或一手来源。用户要求综合、细化、补全或自行判断时，默认委托方案层决策：形成有依据的合理推荐后，直接标记为 `delegated` 并记录委托语句、偏好/证据依据和准确含义，高影响方案语义本身不再触发批准；真实付款/签约、生产发布、生产数据破坏性修改、实际授权、敏感数据外发及必要法务/安全/人工审批仍保留为 `EXT`，只有输入冲突、用户明确保留、关键偏好仍缺失或无法形成可靠推荐时才进入 `DEC`/`decision_required`；
- Outcome 只按可独立判断的可观察结果拆分；
- 重要 Source 项使用稳定语义 Key 与显式 Anchor；
- 强制技术义务使用 `OBL`，非强制实现建议使用 `HINT`；
- 对交互产品，先穷举范围内的 surface，再细化到每个实质控件，分别记录页面/区域/类型/文案、位置、任务、可见与可用条件、触发/输入/校验/默认值、交互/跳转，以及 Loading、Empty、Success、Failure、Recovery、Permission、Feedback 和 Accessibility；
- 明确“不算完成”的 Source 含义使用 `NCOMP`；
- 每个 `RISK` 明确 Fact、单个 Affected Outcome、Basis 与 Consequence，无法确定时进入 `DEC`；Fact 精确使用 Runtime 的十个名称：`public_api_or_schema_change`、`persistent_data_change`、`data_migration`、`security_boundary_change`、`permission_boundary_change`、`irreversible_external_effect`、`critical_user_path`、`full_population_operation`、`multi_repository_change`、`weak_observability`；
- 每个 AC 只代表一个 Given/When/Then 可观察场景，显式列出对应 `REQ`/`CTRL`/`OBL`/`NCOMP` Key，不能首次偷渡新需求，并在文末报告是否已可交给 Contract Authoring。

它不更新项目 Context，不绑定真实仓库 owner/path/runner，不生成 Delivery Contract YAML，不执行实现，不创建工作流状态，也不声明完成。`HINT` 不是 Material Source Item；Source Plan Skill 不输出 `ty-source-item` Marker，Marker 由后续 repository-aware Long-Task Authoring 插入。Source Plan 是 Source，不是 Contract Draft。推荐结构只是 Authoring Fast Path；普通 prose/Source Plan 或普通文本方案仍可直接作为 Long-Task Source。

## Single-Goal Rolling Delivery

只有用户显式调用 `/long-task-workflow`，或当前 worktree 已有 active long task 时才使用。它固定为：

- 一个平台原生、持续的 Goal；
- 一个用户选定的仓库/worktree；
- 一次完整选定交付、一个 Contract、一个 Final Gate；
- Outcome 依赖只表示验收就绪关系，不表示 Worker 调度；
- 第一次 Authority Lock 后、正式实现前有一次用户模型选择；
- 当前 Goal 内部滚动展开实现 Frontier；
- targeted verify 只用于修复，永远不能 accepted；
- scope-only revision 可先做无状态候选诊断，再只发起一次精确审批；
- Final Gate 在一个当前快照上重跑全部 Check；
- Stop Hook 在结果 stale 时阻止完成。

Long-Task Contract Authoring 会尽量保留 Source 中已有的稳定 Key 与 Anchor。若未知偏好会实质改变对比调研或选型，必须先询问用户；决策标准明确后，有依据的推荐方案再把委托、偏好/证据依据和准确含义写入真实 Source，然后映射到 Contract，不能只藏在 YAML 中。这份方案委托不授权任何真实高危外部动作，高危动作继续作为显式 external confirmation。保持产品含义的结构分解和有真实证据的仓库绑定可以继续；输入冲突、用户明确保留、关键偏好缺失或没有可靠推荐的新产品语义仍进入 `decision_required`。缺少推荐 Source Plan 结构不构成阻塞，但激活前必须完成只插入标记、不改写原文的 Material Source Item 枚举。

第一次正式 Compile 成功前，`delivery-contract.yaml` 是同一份非权威 Contract Draft。`/long-task-workflow` 可以跨多轮仓库/Context 读取和 Preflight 修复持续修改它，不要求一次响应生成完整 Contract。不存在单独 Contract Draft Skill、Draft Receipt 或 Authoring State。

第一次成功 Compile 创建 Authority Lock，并返回：

```json
{
  "execution_model_checkpoint": {
    "required": true,
    "phase": "post_authority_lock_pre_implementation",
    "options": ["continue_current_model", "switch_model_then_resume"]
  }
}
```

Agent 此时在实现前只暂停一次，请用户选择：继续当前模型，或切换模型后恢复同一 active Long-Task。如果用户已明确给出本任务的模型策略，则视为已完成选择。后续 `compile --revise` 返回 `required: false`，不会重复暂停。Harness 不会自动切换模型，也不持久化 acknowledgement、model route 或 checkpoint state；模型选择不是验收证据。

锁定后的修订分三类：机器可证明的单调证据增强和机械安全变化自动采用；如果唯一的受保护原因只是扩大 owner、expected-change 或 allowed-support path（可以同时带有安全的单调增强），就能用 `diagnose-revision` 在不切换 Authority 的前提下运行原 Active Authority 已有且未更换的 Check；产品/Source/Acceptance 语义变化、证明弱化、verifier 内容或 runner 变化、风险上升只给摘要，不运行候选，风险降级则直接拒绝。诊断结果不是 Progress 或 acceptance，也不会写 pending/approval、cache、Receipt 或 marker。相关修改只在同一份 `delivery-contract.yaml` 中累计，最终由一次 `compile --revise` 生成带短摘要的精确 hash；`status`/`resume` 投影同一个待批决策。批准并原子采用后旧证据失效，完整 Final Gate 仍必须重跑。

Long-Task Skill 采用渐进读取：主 `SKILL.md` 只保留目标、硬边界和阶段路由，Contract Authoring、Evidence Design 与 Authority Lifecycle 细节只在对应阶段读取一层 reference。这只是指令组织，不产生第二权威。

Draft Outcome 只是 Authority Lock 前的 Outcome。Outcome 按可独立观察、判断和定向验证的结果拆分，使当前 Goal 能缩小 dependency-ready 工作集、定向验证、定位失败、恢复 finding 并精确失效旧局部结果。`depends_on` 只表示 acceptance readiness，Rolling Frontier 只是临时工作状态；Outcome 不是 Worker、scheduler task、queue 或并行单元。Outcome 拆分执行和诊断，不拆分完成权威，因此最终仍必须在当前最终快照运行一次完整 Final Gate。

平台负责物理 Goal/会话生命周期。新会话通过 `resume` 恢复语义状态；Tiny Context 不会重建此前的物理 Turn。

### CLI

```text
ty-context long-task init <workdir>
ty-context long-task preflight <workdir>
ty-context long-task compile <workdir>
ty-context long-task compile <workdir> --revise
ty-context long-task diagnose-revision <workdir> [--outcome <key>] [--check <key>]
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
- `preflight` 应用 Compact 默认值并一次输出 Source/REQ/CTRL/OBL/AC、Context、风险、路径/Binding、Runner/Input 与 Proof 诊断；它完全只读，不创建 Authority Lock、marker、cache、progress、Receipt、pending revision、状态锁，也不运行项目 Check。
- `compile` 生成 Global 与 Outcome Result/Requirement/Control-field/Non-completing/Technical Claim，拒绝未覆盖 Claim，并让第一次正式成功 Compile 成为 Authority Lock。第一次结果附带 `execution_model_checkpoint.required: true`，后续 Compile 返回 `false`；该字段不进入 Authority state。
- `diagnose-revision` 只做无副作用候选 Compile；仅 scope-only 候选能运行 Active Authority 已有且未更换的 Check，输出固定为非验收、非 Progress、非 pending。
- `compile --revise` 自动采用可证明安全的修订；受保护修订在 stdout 返回 `authority_revision_pending`、精确 decision id 与确定性短摘要，并继续 fail closed，直到用户批准完全相同的 id。候选内容再变会生成新 id，并使旧批准失效。
- `verify` 在重查 active task/revision/compiled/worktree identity 后写 scoped Progress；targeted verify 始终只是修复证据。
- `status` 输出 `unverified`、`progress_passing`、`progress_failing`、`progress_stale` 或 `blocked_external`，并报告 fresh `final_workflow_status`、完整 `external_confirmations` 与唯一的 `pending_authority_revision`。
- `resume` 完全只读，恢复 task/contract identity、风险、相关 Context、Git 状态、同一待批决策、ready Outcome、findings 和 next safe action。
- `final-gate` 在完整 Check 后再次验证 active identity；并发 revision 不能产生 accepted。
- `stop-check` 与 `close` 自己运行 Live Final Gate，并只用 accepted identity 做 CAS clear。`status: closed` 只表示机器 Authority 已清理，不表示完整外部交付完成。
- `abandon --force-corrupt-state` 仅用于损坏/mismatch/legacy-unrecoverable 状态或遗留锁，只删除确定性 active state 与 `<workdir>/.ty-context/**`。

### Delivery Contract

`long-task-delivery-v2` 在同一个文件中保持 Product Authority、Technical Boundary Authority 与 Acceptance Authority。Compact YAML 只省略确定性默认值，规范化后的 Contract、Authority Hash 与 Compiled Identity 和完整展开形式一致。

Contract 顶层包含：

- `task`：完整目标、Source 路径、相关 Context 与 snapshot 模式；
- `risk`：`auto | standard | strict` 与明确 risk facts；
- `global`：非目标、owner boundary、技术约束、禁止路径/捷径和全局 Check；
- `outcomes`：可独立判断并可定向验证的结果、依赖、REQ、产品/控件状态与位置、稳定技术义务和命名 AC。

Runner 支持 `package_script`、`project_binary`、`node_oracle`、`playwright_test`。Proof surface 支持 `ui_browser`、`runtime_behavior`、`api_contract`、`data_state`、`security_boundary`、`population_coverage`、`implementation_structure`。

### 一个 Contract 与 Source Claim

用户选定的一次完整交付始终只有一个 Contract 和一个 Final Gate。Outcome 只按“可独立判断、可定向验证”的结果拆分；模型输出长度、YAML/文件长度、前后端层、模块数量、并行偏好或 Agent 容量都不是拆分依据。

V2 强制至少一个真实 `source_path` 与一个 `source_claim`，且每个声明的 Source 文件至少包含一个 Material Item。Authoring 阶段必须在原始 Markdown 中仅插入不渲染的 `ty-source-item:start/end` 标记，不得改写 Item 原文。Marker key 与 Source Claim key 必须集合完全相等且全局唯一。

类型化 disposition 分开整体结果、Requirement/Control/Obligation/Non-completing Claim、单一命名 Acceptance Assertion、Global Constraint/Non-goal、Risk Fact/Affected Outcome、External Confirmation 与真实决策。Outcome Source Acceptance 必须原样对应一个 `<outcome>.<check>.<assertion>` criterion，并证明至少一个被独立 Source Item 支撑的非 Result Claim。`out_of_scope` 已退休：排除原本在范围内的要求只能进入 `decision_required`。

`context.toml` 中仅用于未来读取的 `triggers`、`read_when`、`read_policy`、default selection 与未选节点不再进入当前 delivery Authority；当前已选 area ownership、role/dependency 与 Context 内容仍受保护。最终 Git tree 变化后仍必须重新运行 Live Final Gate。

## 确定性风险分级

- **L0**：局部、可逆、可直接测试的任务走默认工作流。
- **L1 standard**：多个可观察 Outcome 或需要跨会话恢复，且有可靠可执行验证。
- **L2 strict**：使用同一套 Long-Task 和 Outcome 结构，但对公共 API/schema、持久数据、迁移、安全/权限边界、不可逆外部影响、全量 population，或可观察性弱的关键主路径增加更严格的 proof；不支持多仓库交付。

用户可以主动升级为 strict。显式 `standard` 低于计算出的最低级别会以 `risk_level_below_required` 失败。Strict 所需 negative、counterfactual、population、security、environment、rollback/recovery proof 由 Compiler 按风险强制。

## Evidence 与完成权威

最终接受来自当前可执行证据，不来自 Agent 文本。Evidence Adapter 由 Runner 派生：只有 `playwright_test → playwright_json_v1` 可以证明 `ui_browser`，其余 Runner 均为 `structured_json_v2`，只能证明非浏览器 Surface。

每个 Outcome 至少有一个非 Result 原子 Claim，且 `required_proof_surfaces` 必须 all-of 全覆盖。Claim-bearing Assertion 使用显式 Expected 比较；`truthy/falsy` 禁止，`exists` 仅允许证明 `implementation_structure` Obligation。

Targeted verify、Progress、status、Receipt 与 compiled cache 都不是完成权威。Final Gate 要求 clean candidate commit，从 Source 重新 Compile，在同一 Git-tree snapshot 上运行全部 Global/Outcome Check，并在结束时再次校验 active identity。只有它可以生成 `machine_accepted` 或 `machine_accepted_external_pending`；后者仍必须明确列出外部确认项。

## 开发与验证

```powershell
npm install
npm run format:check
npm run typecheck --workspace project-tiny-context-harness
npm run build --workspace project-tiny-context-harness
npm run test:affected:list
npm run test:affected
npm run test:long-task:trust
npm run test:long-task-performance --workspace project-tiny-context-harness
npm test
npm run smoke:quickstart
npm run preview:pack
npm run launch:check
node packages/ty-context/dist/cli.js package check-source
make validate-harness
```

`test:affected` 用于日常修改和修复循环；`test:long-task:trust` 是冻结候选版本后的高风险边界门，也是 PR CI 使用的层级；`npm test` 是 `main` 和发布保留的完整发布回归，不应在每次小修复后重跑。Delivery Contract 和完整 Long-Task 门仍可通过 package workspace scripts 显式执行。

模块化门禁是 `ty-context check-modularity`；例外必须包含 `owner`、`introduced_at`、`reason`、`tracking_issue` 和 `expiry_condition`。

## 诚实限制

- Harness 不创建或恢复平台物理 Goal/会话。
- 它不能证明用户从未遗漏未声明需求。
- bounded Context keyword search 仍可能漏掉同义词或间接依赖，只能补充语义判断。
- Harness 不能切换 host 选择的模型，只能在第一次 Authority Lock 后要求一次用户选择。
- 核心长程执行不提供并行 mutation runtime。
- 它不观测平台 token 或模型调用数。
- Network policy 会约束传给 runner 的代理环境，但不是操作系统 sandbox。
- 同用户/管理员文件篡改、系统级 Hook 绕过不在安全边界内。
- Git/PR/CI、部署与人工产品确认仍由外部系统负责。

## License

MIT
