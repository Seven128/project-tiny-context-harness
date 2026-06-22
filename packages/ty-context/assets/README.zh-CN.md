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

这个项目以前尝试过更重的阶段式 Tiny Context：阶段状态、任务流转、PRD / 技术方案 / 实现 / 评审 / 测试 / 发布产物和多个 gate。

后来放弃这个方向，原因很直接：

- 中小任务里，阶段流转和产物校验会显著拖慢执行。
- 现代 coding agents 已经内化了很多普通软件工程循环：理解、设计、实现、测试、修复。
- 真正值得保留下来的不是“每次任务都走完整流程”，而是“新 agent 能快速恢复项目长期事实”。

所以当前默认方向是 Minimal Context Harness：只维护高密度、长期有效、能帮助恢复上下文的项目事实。

一个典型失败场景是 ABCD 模块链：A/B/C 是上游，D 是下游。现在做 D 的需求时发现能力缺口；如果没有 Context 和优先级约束，agent 很容易为了让 D 完成而去改上游 A/B，因为当前代码让这条路可行。但真正需要判断的是：D 是否有权改 A/B？缺口是不是属于 C 的契约？是否必须先声明 `Context Delta`，让项目意图变化被确认后再实现？代码能说明“现在怎么改得动”，不能说明“项目意图是否允许这样改”。Tiny Context 要补的就是这一层 repo 内长期事实和优先级契约。

对于长程任务，Harness 也提供一个轻量的计划验收清单 Skill：当用户明确给出或引用某份方案 / 计划 / RFC / implementation plan，并要求生成验收清单、完成定义或 goal/target 模式提示词时，它会把计划和验收清单临时放到 `tmp/ty-context/plan-acceptance/**`。如果外部规划模型参与，推荐仍然只给两份产物：`《开发方案》` 作为执行方向，`《验收清单和测试用例》` 作为 Codex target-mode acceptance input packet。第二份应包含 AC、required evidence、测试命令、真实产品路径 / core path、证据分层、无效证据、状态机、local audit 和 blocker。Source Pack 只是临时上传材料，不是 durable Context。如果方案里已经有明确、具体的“验收清单”，Skill 会直接复用那份清单并单独写入完整验收清单文件；如果第二份缺少 required evidence、verification method、fail condition、状态机或无效证据规则，Skill 会把它作为来源生成或补齐验收项，而不是把它当完成证明。这只是执行前的一次验收标准梳理，不执行计划、不证明完成，也不会把临时清单注册成 `project_context/**`。

重要使用提示：Minimal Context 有意把 Context 读取顺序、Context / 代码优先级和漂移检查保持为 agent 级软约束，而不是机器强制 gate。这个取舍适合短任务，但长任务、大上下文、多次交接或多轮验证时预期会漂移。遇到这类任务且已有方案/计划来源时，应先用计划验收清单 Skill 外化一个可证伪完成目标；完整验收清单才是验收标准，local audit 只是临时进度/恢复状态。

## 当前最佳实践

短程任务直接使用流程契约和 Context 层：

```text
流程契约 + project_context/** -> 实现 -> 验证 -> drift check
```

长程任务先外化目标，再进入实现：

```text
Web GPT 或其他外部规划模型产出两份产物：《开发方案》+《验收清单和测试用例》
-> 计划验收清单 Skill 生成目标模式文本
-> Superpowers 得出具体落地执行片段
-> 每个执行片段都回到流程契约 + project_context/**
```

这里的 Superpowers 指具体的 [obra/Superpowers](https://github.com/obra/superpowers) 插件/开源工作流，不是泛化的执行规划替代品。如果目标模式文本或原方案还不够可执行，用 `superpowers:writing-plans` 转成 bite-sized implementation plan；有 subagent 支持时优先用 `superpowers:subagent-driven-development`，否则用 `superpowers:executing-plans`；涉及行为变更时用 `superpowers:test-driven-development`；完成声明前用 `superpowers:verification-before-completion` 对完整验收清单和 fresh evidence 做 gate。

原因是漂移控制。流程契约 + Context 层是软约束，短任务里通常能让 agent 按预期执行；长程任务里，Context 仍然能记录符合预期的事实，但 Context 到代码 的实现步骤会随着上下文窗口变大、多次交接、subagent 拆分和多轮验证而漂移。Web GPT 方案、目标模式文本、完整验收清单和 Superpowers 执行层，把完成目标外化成可恢复、可审计的临时执行标准，同时不恢复阶段式 gate。

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
