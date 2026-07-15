# Project Tiny Context Harness 中文快速说明

[English README](README.md)

Project Tiny Context Harness 是给 AI coding agents 用的轻量项目记忆层，也是 repo-native context contract。

它不是新的全流程 Tiny Context 框架，也不是任务管理器。它做一件小事：把新会话 agent 最容易丢掉、但又必须长期稳定保留的项目事实，以及 Context / 代码 / 验证证据之间的读取和变更优先级放进仓库里，让下一次聊天、交接、调试或换工具时不用从头重新发现。

一句话：

```text
Keep the memory. Drop the ceremony.
保留项目记忆，丢掉流程仪式感。
同时保留 Context / 代码 / 验证证据之间的优先级契约。
```

## 它解决什么问题

很多 agent 在一个对话里表现很好，但换到新对话后会重新问、重新猜或重新扫描：

- 项目到底要解决什么问题
- 哪些事情明确不做
- 架构边界在哪里
- 哪些文件是事实源
- 改完以后应该跑什么验证
- 上一次任务留下了哪些长期约束
- Context、实现和验证证据冲突时谁优先

Project Tiny Context Harness 把这些内容压缩到几个 repo-native 文件里，并通过简单工作流约束 agent 先读 Context、判断是否 context-first、实现后做 drift check：

- `AGENTS.md`
- `project_context/context.toml`
- `project_context/global.md`
- `project_context/architecture.md`
- `project_context/areas/**`

Fresh agent 先读这些文件，再开始改代码。

## 和传统 Tiny Context 流程的区别

Tiny Context 有三项能力：Minimal Context 负责长期事实和恢复；默认 Workflow Contract 负责最小 Context 读取、唯一 `Context Delta`、内部计划、实现、项目验证、Conformance 与 drift check；长程任务工作流只在用户显式执行 `ty-context enable composite-codex` 后提供严格多 SFC 执行与完成门，`ty-context disable composite-codex` 只移除包拥有的 Long-Task Workflow Hook/表面并保留用户 Hook。长程任务工作流继承 Context 规则，但用 Contract V3 和 Campaign Gate 取代普通内部计划与完成计算；模型策略缺失或无效时确定性安全透传，不猜测降级。现有 `composite-*` 命令、Skill 路径和 Schema id 作为兼容标识保留，不再作为产品展示名。

长程任务工作流的三个强制安全步骤是合同编译、最终全量 Gate 和 Codex Stop 新鲜度检查。定向 `verify` 只是可选修复加速器，不能签发 Slice 或 Campaign 完成。模型怎样规划、拆分、使用 subagent、TDD 或 review 不属于工作流状态，也不能签发完成证明。

## 长程任务工作流 Campaign V6

已有讨论方案、需要多个 SFC 从准备一直自动执行到目标分支时，显式调用 `/prepare-composite-long-task`。该显式调用即授权完整 prepare-and-execute；`ty-context composite-campaign` 保存不可静默改写的 `source-plan.md` 和完整 Source Coverage V2（含 Context Resolution 与 Context baseline），先建立控件/能力单元粒度的 Source Unit Inventory，再生成最大内聚的 Scope Fit V4 DAG。每个 Source Unit 必须完整映射到 SFC、Requirement、PI Obligation、AC 和 Verification Spec，并确定性投影三份 V3 YAML authority（Contract V3）：

- `product-architecture-source.yaml`
- `technical-realization-plan.yaml`
- `acceptance-checklist.yaml`

`run --campaign` 是一个前台 Campaign Scheduler，正式 Worker Engine 为 `codex-exec-v1`；它不启动 AppServer，也不持久化 Thread、Goal 或 Turn。Packet Authoring 使用 Controller profile 的一次性只读 Worker；Packet、三份 Contract V3 与 Change Envelope 是交给独立 `workspace-write` Execution/Repair Worker 的权威边界。每个 Worker 都是有界直接子进程，主 CLI 等待全部子进程并在返回前完成终止/收敛。Worker 的 exit code 和文本永远不是 accepted 权威。

策略先解析模型 alias，再同时校验 `minimum_effort` rank 与 accepted efforts。精确 `gpt-5.6-sol`（含配置 alias `gpt-5.6`）的 `xhigh|max|ultra` 执行与修复路由到 Sol `medium`；high 及以下、非 Sol、未知或非法策略原样透传。若 Codex CLI 明确报告目标 profile 不可用，只允许一次 Controller profile 透传重试。Packet Authoring 最多初始加 2 次修复，SFC 每个 run generation 最多初始加 3 次修复，且从持久化的已提交 head 恢复。

preflight 必须通过 Requirement/PI/obligation/binding/AC/proof/spec/counterfactual、Source Unit 实体链和 oracle 可用性检查。CLI 再根据依赖、写入/读取路径、API/schema/route/runtime/Context contract、资源锁、单元内聚、迁移、生成物、包管理清单和环境 profile 计算确定性 wave；无法证明安全并行时自动串行。首个 Execution Worker 启动后 Scope Fit 永久冻结。Worker 退出后 Scheduler 独立检查 worktree、base/head、clean commit、Change Envelope、当前 final result、Slice Final Gate 与 Receipt V3。

同一 Wave 的 SFC 从共同 Integration head 创建固定路径的 detached worktree，accepted commit 按 SHA 合入唯一 Integration Branch。整个 Campaign 最多拥有 1 个 Integration worktree、4 个当前 Wave SFC worktree 和 1 个可复用 detached Repair worktree；SFC/Repair 不创建分支，retry 不创建新路径。所有入口共用一个由状态推导的 expected set；预算断言纯只读，只有显式 reconcile/cleanup/abandon 能删除身份已验证的 package-owned 资源。accepted/merged/integration-verified 单调不可回退，唯一未完成 Wave 可恢复，多个未完成 Wave fail closed；持久化 Integration HEAD 是权威，只有可识别的未持久化机械效果能回滚。普通 merge conflict 和组合回归使用同一个串行 Repair Worker，且不能改 Scope Fit 或 Packet。

Target 最终化保留权威上游、精确 commit/tree、不同 tree 全量 Target Snapshot Gate、非 force 交付和匹配 OPEN PR 规则。Campaign `accepted` 只由当前 Contract V3 Gate、Receipt、Integration/Campaign Final Gate 与 Target Finalization 共同产生，并与 Final Result、Receipt、event 原子提交。重跑先验证冻结权威并直接返回 finished，不启动 Worker、不重跑 Gate、不重建 worktree 或 PR；之后幂等清理，失败不撤销 accepted。Lock 与 Worker 都以 PID + process-start identity 确认归属，中断只终止身份匹配的已知进程树，不按 PID 猜测误杀。普通 `cleanup` 不破坏非终态 Campaign；显式 `abandon` 只删除本 Campaign 的本地受管 worktree、Integration branch 与 runtime log，保留 source/Packet/Receipt/event，不触碰 remote ref 或用户 worktree/branch，并形成不可重跑的终态。Status 还展示每个 run generation 的轻量耗时摘要，但它不是验收权威。V5 accepted 可读审计，V5 unfinished 返回 `campaign_v5_execution_retired_recreate_required`，不迁移也不回退 AppServer。

## 当前最佳实践

普通任务直接使用流程契约和 Context：

```text
最小 Context -> Context Delta -> 内部计划 -> 实现 -> 项目验证 -> Conformance + drift check
```

普通长程验收规划显式调用 `/normal-long-task`；多 SFC 讨论方案的完整准备与执行显式调用 `/prepare-composite-long-task`；只有单个 Slice 的三份 Contract V3 YAML 已完整存在时才显式调用 `/composite-long-task-workflow`。

轻量执行器把三输入、完整图、oracle/verifier、workdir 与 Context snapshot 冻结到 `compiled-contract.json`。`context_snapshot_mode: referenced` 是默认值，只冻结 manifest topology 与被引用 Context 的 hash；`full` 需显式选择。agent 可按需运行定向 `verify` 修复，但只有 `final-gate` 可对当前工作区重新运行全部 in-scope AC、自底向上重算图并签发 workspace-bound 结果；Stop 再确认 receipt 与 identity 新鲜。历史 run 不能拼接成完成。

稳定前执行器只接受一个精确的 Node Oracle 步骤，不允许网络，也不允许 environment refs、requirements 或 probes。浏览器、package/project 命令和依赖环境的合同会在编译时明确拒绝，不会被静默忽略或作为半启用模式保留。

`needs_work` 是内部循环状态，必须继续实现；`accepted` 是唯一成功终态。真正需要用户决定时按普通任务沟通并暂停，但不能视为 accepted。agent 不能提交 pass result、evidence、assertion result 或实体完成状态。compile 只接受 package-managed Hook 的精确字节与命令；项目级 Stop Hook 在没有 active task 时 no-op，存在 active task 时会阻止缺失、receipt 不匹配、非 accepted、needs_work 或 workspace identity 不匹配的 final result，只有最新 accepted 结果仍新鲜时才放行；Skill policy 禁止隐式调用。

当前保证只覆盖正常 CLI/Hook 流程中的义务遗漏、编译后输入或 oracle/verifier 变化、旧/缺失 final result、final 后工作区变化和静默替换 active contract。它不是 Host 级安全边界，不承诺抵御同用户/管理员删除状态或 Hook、Credential Manager/Registry 攻击、系统级 Hook 绕过或内核/sandbox 逃逸。聚焦机制测试总计不超过 5 分钟，长程任务工作流套件不超过 15 分钟，单测原则上不超过 2 分钟；默认测试不安装 VM、容器、浏览器矩阵或管理员环境。开发者直接执行 `npm test` 或 `npm run test:long-task-workflow --workspace project-tiny-context-harness` 时会运行长程任务工作流自测试；GitHub package PR/main/publish CI 通过 `npm test` 运行它。release preparation、本地 fallback publish、Hook 和消费者 Harness gate 只走默认测试路径，不触发该套件。六个真实 CLI/final-gate 黑盒为 `happy_path_real_implementation`、`missing_obligation`、`source_changed_after_compile`、`oracle_or_verifier_changed_after_compile`、`stale_or_missing_final_result`、`drift_repair_end_to_end`。

## 适合谁

适合：

- 经常用 Codex、Claude Code、Cursor、Gemini CLI、OpenCode 等 agent 改代码的项目。
- 经常开新 chat，agent 反复重新理解项目的项目。
- 想保留项目意图、边界和验证路径，但不想引入完整流程文档链的维护者。
- 多 agent / 多工具协作时，需要一个工具无关的 repo 内事实源。

不适合：

- 替代测试、CI、review 或人工验收。
- 自动执行完整 Tiny Context。
- 做代码语义索引或外部文档检索。
- 给每个任务强制生成 PRD、技术方案、测试报告和发布文档。

## 快速试用

npm 新包名还在等待发布。如果 `project-tiny-context-harness@latest` 尚未可用，可以先用源码 smoke 路径：

```sh
git clone https://github.com/Seven128/project-tiny-context-harness.git
cd project-tiny-context-harness
npm ci
npm run smoke:quickstart
```

发布完成后，普通项目使用：

```sh
npm install -D project-tiny-context-harness@latest
npx --yes --package project-tiny-context-harness@latest ty-context init
make validate-context
```

生成的核心结构类似：

```text
AGENTS.md
project_context/
  context.toml
  global.md
  architecture.md
  areas/main.md
  areas/main/verification.md
```

## 一个简单的使用方式

在新 agent 会话里先发：

```text
Read AGENTS.md and project_context/** first. Summarize the project goal, non-goals, architecture boundaries, validation entry points and next safe action before proposing code changes.
```

如果 agent 能快速说清楚项目目标、非目标、边界和验证入口，而不是重新扫描整个仓库猜测方向，这个 Harness 就发挥作用了。

## Benchmark 说明

不要把旧阶段式 Tiny Context 的 benchmark 数字当成当前 Minimal Context Harness 的性能证明。

当前公开卖点是产品设计和 smoke 证据：它能安装一个小的项目记忆面，并用 `validate-context` 检查恢复事实是否存在。真正的效率结论需要重新设计 fresh baseline 和 Minimal Context Harness 的对照实验。

## 反馈

现在最有价值的反馈不是“能不能多加流程”，而是：

- 你的 agent 经常忘掉什么项目事实？
- 哪些事实应该长期留在仓库里？
- `project_context/**` 是否太多、太少或不够好读？
- 新 chat 是否更快恢复了项目意图？

可以在 GitHub issue 里反馈：

- [Adoption reports](https://github.com/Seven128/project-tiny-context-harness/issues/4)
- [Demo starter issue](https://github.com/Seven128/project-tiny-context-harness/issues/5)
- [Sample walkthrough starter issue](https://github.com/Seven128/project-tiny-context-harness/issues/6)

## 语言策略

本项目的默认 README、npm copy 和公开 launch 文案保持英文优先，方便 GitHub、Hacker News、Reddit、Product Hunt 和 curated lists 上的开发者快速判断项目价值。

中文文档作为二级入口保留，用来服务中文用户和维护者，但不会替代英文主入口。
