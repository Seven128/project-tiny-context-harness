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

Minimal Context 继续负责长期事实和 Context 恢复；多组合长程任务 Contract V3 只在用户显式调用时提供严格执行与完成门。它允许模型在实现中漂移，但不允许带漂移的交付通过。

工作流只有四个有明确防漂移价值的步骤：Managed Host 在 workspace 外封存第一份完整合同，防止遗漏或重绑；实现—验证循环尽早发现行为、范围和证据漂移；单一最终快照上的全量 spec、probe 与 counterfactual 重算防止旧证据、局部证据和跨快照拼接；managed-only Codex Stop 完成门重复同一 final orchestrator，防止聊天误报完成。模型怎样规划、拆分、使用 subagent、TDD 或 review 不属于工作流状态，也不能签发完成证明。

## 多组合长程任务准备

只有原始需求、还需要 Scope Fit 和严格三输入编写时，显式调用 `/prepare-composite-long-task`，并通过 `ty-context composite-campaign` 管理干净的 V3 authoring campaign。`CompositeAuthoringPacketV3` 直接保存三份结构化 authority，并确定性投影：

- `product-architecture-source.yaml`
- `technical-realization-plan.yaml`
- `acceptance-checklist.yaml`

Scope Fit V3 只使用稳定 `SFC-###` 组件以及 `sfcs`、`sfc_id`、`selected_sfc_id`、CLI `--sfc`；旧 slice 字段/选项会被拒绝。preflight 必须通过完整 graph、binding、proof、counterfactual 覆盖和 Oracle bundle-ready 检查。handoff 只把三份 V3 YAML 复制并冻结到干净 workdir，不创建 Goal、不激活 Host 权威、不执行验证或创建 evidence；`start` 只绑定已经创建的 Goal，并通过 Host 封存第一份权威；`record-result` 只验证并镜像当前完整、已由 Host 提交的签名 `final-result.json`，绝不重跑 final gate。V1/V2 packet 与 authority、Observation V1、Markdown authority、旧 workdir 和历史 runtime 不提供 importer、alias 或静默迁移。

## 当前最佳实践

短程任务直接使用流程契约和 Context：

```text
流程契约 + project_context/** -> 实现 -> 验证 -> drift check
```

普通长程验收规划显式调用 `/normal-long-task`；原始需求准备显式调用 `/prepare-composite-long-task`；只有三份 Contract V3 YAML 已完整存在时才显式调用 `/composite-long-task-workflow`。

严格执行器让 Host 封存完整 Requirement → PI → Obligation → Binding → AC → Proof → Spec → Counterfactual 图，然后由 agent 自由实现并根据主动 verifier 的 findings 循环修复。`verify` 只执行受影响的冻结 spec；真实依赖和 Playwright 浏览器只来自只读内容寻址层。`final-gate` 在一个新隔离快照上运行全部 spec、可信 probe 与 obligation counterfactual，并由 Harness 自底向上重算所有实体，Host 再原子提交签名 `final-result.json`；历史 run 不能拼接成完成。

`needs_work` 是内部循环状态，必须继续实现；只有 `accepted` 或由当前可信 probe 建立的 `externally_blocked` 可以结束。agent 不能提交自定义命令、observation、artifact、blocker、assertion result 或实体完成状态。结束前 system managed Stop Hook 从 workspace 外 Host registry 读取权威合同并重复完整 final gate；repo/user/plugin Hook 永远不是 fallback。没有 active Host authority 时 Hook 完全 no-op，普通问答不受影响；Skill policy 禁止隐式调用。

### 安装签名 Host Gate

运行 Composite 前，管理员必须下载与当前 OS/架构匹配的 `0.4.0` Host release，并按 release packet 公布值核对 SHA-256。随后在管理员终端中解析当前安装包的绝对 CLI/Node 路径，提供真实 Codex 可执行文件的绝对路径（不能使用 PATH shim），执行：

```text
<absolute-node> <absolute-project-tiny-context-harness/dist/cli.js> host-gate install --release <absolute-host-release.tgz> --codex-launcher <absolute-codex-executable>
```

安装器在任何系统变更前验证固定 Ed25519 根、公钥、目标平台/架构、签名 manifest 和每个文件，再原子安装 managed policy/Hook/Helper 并启动系统服务。`host-gate uninstall` 必须同样在管理员终端执行，而且存在 active sealed registry 时会拒绝卸载。项目 CLI 不提供 registry close/reset/recovery/key-rotation；这些操作只允许使用独立安装的 `ty-context-host-admin`，并要求交互式 TTY、registry ID 两次确认，以及 `ty-context-host-installer-ui` 签发的一次性本机在场令牌。

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
