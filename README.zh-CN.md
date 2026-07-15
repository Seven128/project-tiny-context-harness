# Project Tiny Context Harness

Project Tiny Context Harness 是给 AI coding agents 用的轻量项目记忆层，也是一套可由 npm 包管理的上下文与交付 Harness。它为仓库提供耐久项目记忆、轻量默认工作流，以及显式启用的 Single-Goal Rolling Delivery（单目标滚动交付）长程工作流；它不是 Agent 调度器，也不接管 Git 编排。

[English](README.md)

产品原则是：**保留项目记忆，丢掉流程仪式感**。公开推广与 README 以英文主入口为准，中文文档作为二级入口。

## 为什么存在

编码 Agent 同时需要两类能力：跨会话仍然可靠的少量项目事实，以及长任务经历多轮修改或上下文压缩后仍可信的完成检查。

Tiny Context 将两者保持为窄边界：

1. **Minimal Context**：`project_context/**` 保存产品归属、架构、契约和可重复验证等耐久事实。
2. **Workflow Contract**：普通任务使用 Context-first 的轻量默认循环和平台内部计划，不要求计划文件。
3. **Long-Task Workflow**：显式使用 `long-task-delivery-v1`、滚动修复验证、同快照 Final Gate 与 Stop 新鲜度。

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
- 一个顶层权威：Contract/Contract Bundle 或 Delivery Set；
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
ty-context long-task approve-authority-revision <workdir> --revision <sha>
ty-context long-task verify <workdir> [--outcome <key>] [--check <key>]
ty-context long-task status <workdir>
ty-context long-task resume <workdir>
ty-context long-task final-gate <workdir>
ty-context long-task stop-check <workdir> [--message <text>]
ty-context long-task close <workdir>
ty-context long-task abandon <workdir>
ty-context delivery-set init|compile|status|resume|final-gate|stop-check|close|abandon <setdir>
ty-context delivery-set approve-authority-revision <setdir> --revision <sha>
```

- `init` 只创建 Contract 模板。
- `compile` 严格解析，保留首次不可重置 baseline，综合声明/配置/实际路径计算风险，并冻结 protected authority 与完整 verifier source。
- `verify` 按 Check 累积 scoped Progress Record；任何 Progress 都没有最终接受权。
- `status` 输出 `unverified`、`progress_passing`、`progress_failing`、`progress_stale` 或 `blocked_external`。
- `resume` 完全只读，输出 task/contract identity、风险、相关 Context、Git 状态、ready Outcome、findings 和 next safe action。
- 顶层 `final-gate` 要求 clean candidate commit，并在一个快照上重跑全部 Check。Child Gate 只能产生 `contract_gate_passed`；Set Gate 重跑全部 Child 和 integration Check，且只有它能产生 `delivery_set_accepted`。
- `stop-check` 仅在 accepted Receipt 与当前 workspace、Contract、source、相关 Context、runner/oracle、verifier 和 Hook 完全一致时放行。
- `close` 只允许 fresh accepted，并保留 Contract 和最终 Receipt。
- `abandon` 是显式非成功清理，保留 `source.md` 与 `delivery-contract.yaml`，且不触碰用户 Git 状态。

### Delivery Contract

`long-task-delivery-v1` 在同一个文件中保持三类逻辑权威：Product Authority、Technical Boundary Authority、Acceptance Authority。

Contract 顶层包含：

- `task`：完整目标、source 路径、相关 Context 与 snapshot 模式；
- `risk`：`auto | standard | strict` 与明确 risk facts；
- `global`：非目标、owner boundary、技术约束、禁止路径/捷径和全局 Check；
- `outcomes`：可观察结果、依赖、产品/控件状态、稳定技术义务和可证伪验收。

作者只编写 task、Outcome、control 与 Check key。Compiler 生成 `OUT.<outcome-key>` 和 `CHECK.<outcome-key>.<check-key>`。它会拒绝未知/重复键、YAML alias/tag/merge、多文档、依赖环、不安全路径、无效 Context/source/runner、缺失 package script、没有可执行 Check 的 Outcome，以及没有 browser proof 的 UI Outcome。

Runner 支持 `package_script`、`project_binary`、`node_oracle`、`playwright_test`。Proof surface 支持 `ui_browser`、`runtime_behavior`、`api_contract`、`data_state`、`security_boundary`、`population_coverage`、`implementation_structure`。

### Contract Bundle、Source Claim 与 Delivery Set

大型但原子的交付仍是一个逻辑 Contract：根文件可以用排序后的 `outcome_files` 替代 inline `outcomes`，fragment 只含 Outcome，整个 Bundle 只有一个 binding、baseline、Final Gate 和 Receipt。文件数、token、前后端层、并行或 Agent 偏好都不是拆成多个 Contract 的理由。

L2、Bundle 与 Set 必须保留原始 `source_paths` 和直接 `source_claims`。每条 claim 只能归属 Outcome/Child、全局约束、带来源理由的 out-of-scope，或阻断执行的 decision-required。Compiler 只验证已声明 claim 的覆盖，不声称能发现未声明要求。

只有每个 Child 都有独立可观察结果、可执行 Acceptance 和真实 release/rollback/owner/risk/product-capability 边界，且不割裂原子用户闭环时才使用 `long-task-delivery-set-v1`。Set 只拥有顶层范围、source coverage、依赖投影、integration Acceptance 和唯一顶层 Receipt；它不调度 Child/Agent/Goal，也不创建 branch/worktree。V1 明确拒绝多仓库交付。

执行开始后，source/Product/Acceptance/risk/Set boundary 变化会生成 hash-bound pending Authority Revision；未按精确 revision 得到用户批准前不会激活。技术 path/support/binding 扩展或 proof 加强必须提供 amendment reason，沿用首次 baseline，并使受影响 progress stale。

## 确定性风险分级

- **L0**：局部、可逆、可直接测试的任务走默认工作流。
- **L1 standard**：多个可观察 Outcome 或需要跨会话恢复，且有可靠可执行验证。
- **L2 strict**：公共 API/schema、持久数据、迁移、安全/权限边界、不可逆外部影响、全量 population，或可观察性弱的关键主路径。V1 不支持多仓库交付。

用户可以主动升级为 strict。显式 `standard` 低于计算出的最低级别会以 `risk_level_below_required` 失败。Strict 所需 negative、counterfactual、population、security、environment、rollback/recovery proof 由 Compiler 按风险强制。实际 changed path 越界时返回 `scope_or_risk_escalation_required`，由同一个 Goal 修订并重新 compile。

## Evidence 与完成权威

最终接受来自当前可执行证据，不来自 Agent 文本。exit code、手写 status、历史 targeted pass、缺失或弱化的 proof 都不能产生 accepted。Contract、source、相关 Context、Oracle/runner、Verifier 或 workspace 改变后旧结果立即 stale。

Final Gate 只能运行 Contract 声明的验证命令，禁止真实部署、支付、迁移执行或不可逆生产副作用。Retry 默认关闭，仅当 `transient_once`、幂等且 effect 为 read-only/test-sandbox 时允许一次；环境变量形式的 network policy 不是 OS 沙箱。顶层 Receipt 绑定 clean HEAD/tree、workspace、source、Context、authority 与完整 verifier identity。Machine accepted 只表示当前快照满足声明的机器检查，不等于 CI/部署/人工确认；存在 external confirmation 时状态为 `machine_accepted_external_pending`。

## 兼容与迁移

0.5.0 会把已退休的 `composite-codex` Profile 选择安全迁移为 `long-task`，删除 package-owned 旧资产，但不会导入、执行或删除用户历史文件。已退休的 `composite-campaign` 和 `composite-long-task` 命令只是轻量、不可执行的 tombstone，会指向 `ty-context long-task`。

`/normal-long-task` 也只是 `/long-task-workflow` 的退休提示，不再生成 checklist、prompt、Local Audit、matrix、verdict 或第二套权威。

## 开发与验证

```powershell
npm install
npm run format:check
npm run typecheck --workspace project-tiny-context-harness
npm run build --workspace project-tiny-context-harness
npm run test:delivery-contract --workspace project-tiny-context-harness
npm run test:long-task-workflow --workspace project-tiny-context-harness
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
