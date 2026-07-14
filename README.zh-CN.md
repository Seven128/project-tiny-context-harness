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

Minimal Context 继续负责长期事实和 Context 恢复；多组合长程任务 Contract V3 只在用户显式调用时提供轻量严格执行与完成门。它允许模型在实现中漂移，但不允许带已声明漂移的交付通过。

工作流只有四个有明确防漂移价值的步骤：合同编译防止需求遗漏和不可验证合同；实现—验证循环尽早发现行为、范围和证据漂移；最终全量验证防止旧证据、局部证据和跨快照拼接；Codex Stop 完成门防止 final gate 未通过时在聊天中误报完成。模型怎样规划、拆分、使用 subagent、TDD 或 review 不属于工作流状态，也不能签发完成证明。

## 多组合长程任务 Campaign V5

已有讨论方案、需要多个 SFC 从准备一直自动执行到目标分支时，显式调用 `/prepare-composite-long-task`。该显式调用即授权完整 prepare-and-execute；`ty-context composite-campaign` 保存不可静默改写的 `source-plan.md` 和完整 source coverage，先建立控件/能力单元粒度的 Source Unit Inventory，再生成最大内聚的 Scope Fit V4 DAG。每个 Source Unit 必须完整映射到 SFC、Requirement、PI Obligation、AC 和 Verification Spec，并确定性投影三份 V3 YAML authority（Contract V3）：

- `product-architecture-source.yaml`
- `technical-realization-plan.yaml`
- `acceptance-checklist.yaml`

`run --campaign` 启动本地 Codex App Server。每个 SFC 只使用一个可恢复 thread：先用 Controller 的已知 model/effort 在 Integration worktree 运行只读结构化 Authoring Turn；Packet preflight 通过后，才在同一 thread 设置 Goal、切换到 Slice worktree 和 `workspaceWrite` Execution Turn。只有目录可证明的 Sol `xhigh|max` 降为 Sol `medium`；低于阈值、其他模型、未知 profile 或目标不可用都原样保持。同一 wave 的初始 Turn 全部启动后才等待，`needs_work` 和中断继续使用同一 thread。真实 App Server smoke 仅手工运行：`app-server-check --json` 只验证传输和模型目录；完整证明必须对准备好的单 SFC Campaign 执行 `run`，再由 `status` 推导 `accepted`，预检本身不算生命周期证据。

preflight 必须通过 Requirement/PI/obligation/binding/AC/proof/spec/counterfactual、Source Unit 实体链和 oracle 可用性检查。CLI 再根据依赖、写入/读取路径、API/schema/route/runtime/Context contract、资源锁、单元内聚、迁移、生成物、包管理清单和环境 profile 计算确定性 wave；无法证明安全并行时自动串行。Scope Fit 不允许为了并行过度分片，且第一个 Goal 设置后永久冻结。每个 Slice 先 commit 且 clean，再 final-gate；`record-result` 只验证现有结果和 receipt，不重跑 final-gate。

accepted Slice 只合入 Integration Branch。普通 merge conflict 和组合回归自动生成独立 execution-profile repair thread/worktree/Goal，且不能改 Scope Fit 或 Packet；每波通过 Integration Gate 后才解锁下游。全部 SFC integrated 后，Campaign Final Gate 在同一最终快照重跑所有 SFC、global constraints 和 source coverage；目标分支变化会自动同步并重验，成功 merge/push 后才推导 Campaign `accepted`。App Server 异常只自动重连一次并按持久化 Thread/Turn/Goal 恢复；无法唯一确认创建结果时 fail closed，第二次失败进入 `wait_external`，绝不静默回退人工 Goal。旧 Campaign V4 只可审计，不能自动执行。

## 当前最佳实践

短程任务直接使用流程契约和 Context：

```text
流程契约 + project_context/** -> 实现 -> 验证 -> drift check
```

普通长程验收规划显式调用 `/normal-long-task`；多 SFC 讨论方案的完整准备与执行显式调用 `/prepare-composite-long-task`；只有单个 Slice 的三份 Contract V3 YAML 已完整存在时才显式调用 `/composite-long-task-workflow`。

轻量执行器只有一条路径：编译并把三输入、Context、完整图、oracle/verifier 与 workdir 的 hash/identity 冻结到 `compiled-contract.json`；agent 自由实现；根据 verifier-owned findings 循环修复；`final-gate` 对当前工作区重新运行全部 in-scope AC，自底向上重算 obligation、PI 与 Requirement，并生成绑定当前 workspace hash 的 `final-result.json` 及普通项目/Git 双 receipt。Stop 必须确认结果字节与两份 receipt 一致。历史 run 不能拼接成完成；active task 下只有相同合同与相同 workdir 的 compile 幂等，任何变化都以 `active_contract_changed` 拒绝；完成后重新激活会先使旧 final 失效。

稳定前执行器只接受一个精确的 Node Oracle 步骤，不允许网络，也不允许 environment refs、requirements 或 probes。浏览器、package/project 命令和依赖环境的合同会在编译时明确拒绝，不会被静默忽略或作为半启用模式保留。

`needs_work` 是内部循环状态，必须继续实现；`accepted` 是唯一成功终态。真正需要用户决定时按普通任务沟通并暂停，但不能视为 accepted。agent 不能提交 pass result、evidence、assertion result 或实体完成状态。compile 只接受 package-managed Hook 的精确字节与命令；项目级 Stop Hook 在没有 active task 时 no-op，存在 active task 时会阻止缺失、receipt 不匹配、非 accepted、needs_work 或 workspace identity 不匹配的 final result，只有最新 accepted 结果仍新鲜时才放行；Skill policy 禁止隐式调用。

当前保证只覆盖正常 CLI/Hook 流程中的义务遗漏、编译后输入或 oracle/verifier 变化、旧/缺失 final result、final 后工作区变化和静默替换 active contract。它不是 Host 级安全边界，不承诺抵御同用户/管理员删除状态或 Hook、Credential Manager/Registry 攻击、系统级 Hook 绕过或内核/sandbox 逃逸。聚焦机制测试总计不超过 5 分钟，默认 Composite 套件不超过 15 分钟，单测原则上不超过 2 分钟；默认测试不安装 VM、容器、浏览器矩阵或管理员环境。六个真实 CLI/final-gate 黑盒为 `happy_path_real_implementation`、`missing_obligation`、`source_changed_after_compile`、`oracle_or_verifier_changed_after_compile`、`stale_or_missing_final_result`、`drift_repair_end_to_end`。

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
