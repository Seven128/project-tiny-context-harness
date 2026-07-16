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

它只安装 `/long-task-workflow` Skill 与完成 Hook，不安装模型 Worker、Agent runtime、调度器或 Git 编排资产。

## Minimal Context 与默认工作流

默认读取顺序是：

```text
project_context/global.md
project_context/architecture.md
project_context/context.toml
最少的图相关 area/role Context
```

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

## Single-Goal Rolling Delivery

只有用户显式调用 `/long-task-workflow`，或当前 worktree 已有 active long task 时才使用。它固定为：

- 一个平台原生、持续的 Goal；
- 一个用户选定的仓库/worktree；
- 一个顶层权威：一个 Contract 或逻辑 Contract Bundle；
- Outcome 依赖只表示验收就绪关系，不表示 Worker 调度；
- 当前 Goal 内部滚动展开实现 Frontier；
- targeted verify 只用于修复，永远不能 accepted；
- Final Gate 在一个当前快照上重跑全部 Check；
- Stop Hook 在结果 stale 时阻止完成。

平台负责物理 Goal/会话生命周期。新会话通过 `resume` 恢复语义状态；Tiny Context 不会重建此前的物理 Turn。

### CLI

```text
ty-context long-task init <workdir>
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

- `init` 只创建 Contract 模板。
- `compile` 生成 Global 与 Outcome Claim，拒绝未覆盖 Claim，并让第一次成功 compile 立即成为 Authority Lock。此后所有 revision 都与 active authority 比较，删除 progress/Receipt/cache 或恢复代码不能重新开放弱化窗口。
- `verify` 只在重查 active task/revision/compiled/worktree identity 后写 scoped Progress；并发 revision 返回 `active_authority_changed_during_verify`。
- `status` 输出 `unverified`、`progress_passing`、`progress_failing`、`progress_stale` 或 `blocked_external`；它从 common-dir authority snapshot 读取，并把 workdir cache 缺失或不一致报告为可修复诊断。
- `resume` 完全只读，从 common-dir authority snapshot 输出 task/contract identity、风险、相关 Context、Git 状态、ready Outcome、findings 和 next safe action。
- `final-gate` 在完整 Check 后再次验证 active identity；并发 revision 返回 `active_authority_changed_during_final_gate`，不能产生 accepted。
- `stop-check` 与 `close` 自己运行 Live Final Gate，并只用 accepted identity 做 CAS clear。
- `abandon --force-corrupt-state` 仅用于损坏/mismatch/legacy-unrecoverable 状态或遗留锁，只删除确定性 active state 与 `<workdir>/.ty-context/**`。

### Delivery Contract

`long-task-delivery-v2` 在同一个文件中保持 Product Authority、Technical Boundary Authority 与 Acceptance Authority，并为可观察结果、控件状态、非完成结果、技术义务和禁止捷径生成机器 Claim。

Contract 顶层包含：

- `task`：完整目标、source 路径、相关 Context 与 snapshot 模式；
- `risk`：`auto | standard | strict` 与明确 risk facts；
- `global`：非目标、owner boundary、技术约束、禁止路径/捷径和全局 Check；
- `outcomes`：可观察结果、依赖、产品/控件状态、稳定技术义务和可证伪验收。

作者只编写 task、Outcome、control 与 Check key。Compiler 生成 `OUT.<outcome-key>` 和 `CHECK.<outcome-key>.<check-key>`。它会拒绝未知/重复键、YAML alias/tag/merge、多文档、依赖环、不安全路径、无效 Context/source/runner、缺失 package script、没有可执行 Check 的 Outcome，以及没有 browser proof 的 UI Outcome。

Global non-goal、constraint 与 forbidden shortcut 分别生成 `GLOBAL.non_goal.<key>`、`GLOBAL.constraint.<key>`、`GLOBAL.forbidden_shortcut.<key>`，并必须由 Global Check 使用局部 ref 覆盖。Non-goal 与 forbidden shortcut 必须使用 negative proof；constraint 可使用任一 polarity。Global 与 Outcome Check 不得跨 Claim scope。Global forbidden path 不生成 Claim，继续由 changed-path 静态边界执行。

Runner 支持 `package_script`、`project_binary`、`node_oracle`、`playwright_test`。Proof surface 支持 `ui_browser`、`runtime_behavior`、`api_contract`、`data_state`、`security_boundary`、`population_coverage`、`implementation_structure`。

### Contract Bundle 与 Source Claim

大型但原子的交付仍是一个逻辑 Contract：根文件可以用排序后的 `outcome_files` 替代 inline `outcomes`，fragment 只含 Outcome，整个 Bundle 只有一个 binding、baseline、Final Gate 和 Receipt。文件数、token、前后端层、并行或 Agent 偏好都不是拆成多个 Contract 的理由。

V2 必须保留原始 `source_paths` 和直接 `source_claims`。每条 Source Claim 必须绑定一个已声明且真实存在的 Source 文件，允许 `file#anchor` 定位；其 disposition 只能指向生成 Claim、全局约束、带来源理由的 out-of-scope，或阻断执行的 decision-required。Compiler 只验证已声明要求，不声称能发现遗漏需求。

Delivery Set 主动编排已退休。真正独立的 release/rollback/owner/risk/product 边界应分别运行顶层 Contract；`ty-context delivery-set ...` 只返回固定、不可执行的 tombstone。

第一次成功 compile 后，Source/Context/Product/Global 语义、Product Claim 与 Verifier Content 的变化都进入精确 Authority Revision；是否运行过 verify 不再影响审批边界。纯 package root/version relocation 可自动 system revision，bundle/schema/hook 字节变化必须用户批准。Contract 与 Check execution 字段都有编译期 policy 分类。

所有 path-bearing 字段在 hash/matcher 前使用同一个 canonical grammar：Windows 分隔符与单个 leading `./` 规范为 `/`，只有 runner `cwd` 可单独为 `.`；内部 `.`/`..`、控制字符、空 segment、绝对/drive/UNC 路径以及不支持的 glob 语法全部拒绝。

## 确定性风险分级

- **L0**：局部、可逆、可直接测试的任务走默认工作流。
- **L1 standard**：多个可观察 Outcome 或需要跨会话恢复，且有可靠可执行验证。
- **L2 strict**：公共 API/schema、持久数据、迁移、安全/权限边界、不可逆外部影响、全量 population，或可观察性弱的关键主路径。严格 proof 绑定到具体风险 Outcome；不支持多仓库交付。

用户可以主动升级为 strict。显式 `standard` 低于计算出的最低级别会以 `risk_level_below_required` 失败。Strict 所需 negative、counterfactual、population、security、environment、rollback/recovery proof 由 Compiler 按风险强制。实际 changed path 越界时返回 `scope_or_risk_escalation_required`，由同一个 Goal 修订并重新 compile。

## Evidence 与完成权威

最终接受来自当前可执行证据，不来自 Agent 文本。Raw Execution identity 绑定 frozen runner 与 canonical Environment Requirements，不包含 env 实际值；即使共享 raw command，artifact 与 Assertion 仍逐 Check 计算。Global hard failure 优先为 `needs_work`，否则 Global/Outcome 环境阻塞投影为 `blocked_external`。

Workdir cache 不能定义 previous authority。Commit、migration、clear 与 abandon 共用唯一 active-state lock；Final/Verify 结束前重查 identity，Stop/close 使用 accepted-identity CAS。Legacy V2 只能从完全匹配 cache 迁移；损坏 continuity 由 doctor 指向显式 `abandon --force-corrupt-state`。

Final Gate 只能运行 Contract 声明的验证命令，禁止真实部署、支付、迁移执行或不可逆生产副作用。Retry 默认关闭，仅当 `transient_once`、幂等且 effect 为 read-only/test-sandbox 时允许一次。Runner 默认只获得最小系统环境白名单，额外 env var 必须由当前 Check 精确声明，未声明 secret 不会继承；受保护 authority/proof 文件拒绝 symlink 与可检测 hardlink。网络隔离由外部平台负责。Counterfactual V2 只有在指定 Assertion 精确失败且不存在 artifact、population 或其他 finding 时才有效，Population V2 证明实体全集覆盖。每个 Outcome 必须有 executable Check；人工、CI、部署和产品确认只进入 `external_confirmations`，机器通过但仍待确认时状态为 `machine_accepted_external_pending`。Receipt 仅供审计，不能复用为接受权威。

## 兼容与迁移

0.6.0 退休 V1 Schema/runtime 与 repo-local Hook。Enable、disable 与 upgrade 只逐 entry 删除精确识别的 Tiny Context managed Hook。旧 package absolute command 只有同时命中已知 managed status 与 `node_modules`、pnpm 或 workspace package 布局时才会迁移；无 status 或仅名称相似的 user Hook 保留，也绝不会仅因命令含有 `composite` 就删除。Upgrade 把未完成 V1 active state 报告为 `manual_required`，且绝不会把 V1 progress/Receipt 导入 V2 权威。Delivery Set、`composite-campaign` 与 `composite-long-task` 命令都是不可执行 tombstone。

`/normal-long-task` 也只是 `/long-task-workflow` 的退休提示，不再生成 checklist、prompt、Local Audit、matrix、verdict 或第二套权威。

## 开发与验证

```powershell
npm install
npm run format:check
npm run typecheck --workspace project-tiny-context-harness
npm run build --workspace project-tiny-context-harness
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
