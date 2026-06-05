# Minimal Context Harness Protocol

本仓库当前使用 Minimal Context Harness。默认工作流目标是维护最小长期事实源，让新会话 agent 能快速恢复项目意图、边界、验证入口和下一步安全动作。

## 默认事实源

- 全局上下文：`project_context/global.md`
- 架构上下文：`project_context/architecture.md`（克制、最小，只记录系统边界、组件关系和长期约束）
- Context 图谱：`project_context/context.toml`（Schema v4 默认事实源；声明 area/context_unit、role、触发条件和按需读取策略）
- 模块 / context unit 上下文：`project_context/modules/**/*.md`
- 产品质量事实：项目代码、测试、smoke、CI、hidden probe 或人工验收

## 工作规则

1. 新会话、继续工作、debug 或需求变更时，先读 `project_context/global.md`、`project_context/architecture.md` 和 `project_context/context.toml`；按其中 default area 和触发条件读取相关 context。
2. Harness 只维护上下文质量，不替项目证明产品质量；产品质量由项目自己的测试、probe、CI 或人工验收负责。
3. 长期事实默认只写入 `project_context/**`。不要默认新增 PRD、tech plan、ADR、implementation doc、review/test/release 文档。
4. ADR 内容降级为 Context 的 `Design Rationale`；实现说明优先进入代码注释、测试名或模块 Context 的关键约束。
5. `validate-context` 只检查 Context 是否足够支持恢复上下文，并阻止伪造“测试已通过”的说法。
6. `sync` 只刷新 managed guidance、Skill、Context template 和工具。
7. 用户可通过 `.codex/pjsdlc_managed/override_skills/context_product_plan.md` 和 `.codex/pjsdlc_managed/override_skills/context_uiux_design.md` 定制本项目的产品方案 / UIUX Skill；`sync` 会合并到 `.codex/skills/**`。

## 本仓库 authoring 例外

本仓库仍维护 AI SDLC Harness package、delivery benchmark 和 Minimal Context 规则。修改这些区域时，读取对应 Context 与源码；旧阶段式工作流只在 `PROJECT_SPEC.md` 中保留精简历史说明。

- package / CLI / managed assets：`packages/sdlc-harness/**`、`.codex/pjsdlc_managed/**`、`tools/**`
- benchmark：`examples/delivery-benchmark/**`
- 历史设计摘要：`PROJECT_SPEC.md`
- authoring-only skill：`.codex/skills/authoring/**`

这些文件是本仓库自举与迁移材料，不代表新 package consumer 的默认文件结构。

## 常用命令

- `make validate-context`
- `make validate-harness`（vNext 兼容别名）
- `npx sdlc-harness sync`
- `node packages/sdlc-harness/dist/cli.js package sync-source`
- `node packages/sdlc-harness/dist/cli.js package check-source`

## Karpathy 编码准则（外部 Skill 中文翻译）

来源：`https://github.com/forrestchang/andrej-karpathy-skills`，文件：`skills/karpathy-guidelines/SKILL.md`，许可证：MIT。以下文本块为中文翻译，和本仓库指引隔离保存。

```text
Karpathy 编码准则

用于减少常见 LLM 编码错误的行为准则。适用于编写、审查或重构代码：避免过度复杂，做精准修改，暴露假设，并定义可验证的成功标准。源自 Andrej Karpathy 对 LLM 编码陷阱的观察。

权衡：这些准则偏向谨慎而不是速度。对于琐碎任务，请自行判断。

1. 编码前思考

不要假设。不要隐藏困惑。呈现权衡。

实现前：
- 明确说明你的假设。不确定时就询问。
- 如果存在多种解释，说明这些解释，不要默默选择。
- 如果有更简单的方法，直接说出来。必要时提出异议。
- 如果事情不清楚，停下来。说清楚哪里让你困惑，然后询问。

2. 简洁优先

用能解决问题的最少代码。不要做投机性设计。

- 不添加用户没有要求的功能。
- 不为一次性代码创建抽象。
- 不添加用户没有要求的“灵活性”或“可配置性”。
- 不为不可能发生的场景做错误处理。
- 如果你写了 200 行，而它本可以是 50 行，就重写。

自问：“资深工程师会认为这过度复杂吗？”如果会，就简化。

3. 精准修改

只碰必须碰的内容。只清理你自己造成的混乱。

编辑现有代码时：
- 不“改进”相邻代码、注释或格式。
- 不重构没有坏掉的东西。
- 匹配现有风格，即使你会用不同写法。
- 如果注意到无关的死代码，提出来，不要删除。

当你的修改产生孤儿代码时：
- 删除因你的修改而变得无用的导入、变量或函数。
- 不删除预先存在的死代码，除非用户要求。

检验标准：每一行修改都应该能直接追溯到用户请求。

4. 目标驱动执行

定义成功标准。循环验证直到达成。

将任务转化为可验证目标：
- “添加校验” -> “为无效输入编写测试，然后让测试通过”
- “修复 bug” -> “编写能重现 bug 的测试，然后让测试通过”
- “重构 X” -> “确保重构前后测试都能通过”

对于多步骤任务，说明简短计划：
1. [步骤] -> 验证：[检查]
2. [步骤] -> 验证：[检查]
3. [步骤] -> 验证：[检查]

强成功标准能让 agent 独立循环执行。弱标准（“让它能用”）会不断需要澄清。
```

<!-- pjsdlc:sdlc-harness:begin -->
# Minimal Context Harness Protocol

本项目使用 Minimal Context Harness。Harness 只维护上下文质量，不替项目证明产品质量。

## 事实源

- 项目全局上下文：`project_context/global.md`
- 架构上下文：`project_context/architecture.md`（克制、最小，只记录系统边界、组件关系和长期约束）
- Context 图谱：`project_context/context.toml`（Schema v4 默认事实源；声明 area/context_unit、role、触发条件和按需读取策略）
- 模块 / context unit 上下文：`project_context/modules/**/*.md`
- 产品质量事实：项目自己的代码、测试、smoke、CI、hidden probe 或人工验收

## 工作规则

1. 新会话或继续工作时，先读取 `project_context/global.md`、`project_context/architecture.md` 和 `project_context/context.toml`；按其中 default area 和触发条件读取相关 context。
2. 新需求、需求变更、debug 结论或后续迭代后，如有影响未来恢复的长期事实，更新 `project_context/**`；普通局部实现细节不写。
3. 长期事实只写入 `project_context/**`；不要默认创建 PRD、tech plan、ADR、implementation doc、review/test/release 文档。
4. 用户明确要求“产品方案 / 产品经理 / 产品专家”、“设计稿 / UI/UX 设计方案 / 视觉专家”或“开发工程师 / 技术方案 / 开发方案 / 实现 / 实现方案 / 实施计划 / 技术专家”这类角色或强产物名时，使用对应 Context authoring Skill，把长期结论写回 `project_context/**`。
5. 用户可以在 `.codex/pjsdlc_managed/override_skills/context_product_plan.md`、`.codex/pjsdlc_managed/override_skills/context_uiux_design.md` 或 `.codex/pjsdlc_managed/override_skills/context_development_engineer.md` 中追加项目本地 Skill 规则；`sync` 会合并到 `.codex/skills/**`。
6. ADR 降级为 Context 中的 `Design Rationale`；实现说明优先写成代码注释、测试名或模块 Context 中的关键约束。
7. Harness workflow gate 只运行 `validate-context`，用于检查上下文是否可恢复。
8. 产品质量由项目自己的验证入口证明；Context 只能声明验证入口，不能伪造“测试已通过”。
9. `sync` 只刷新 managed guidance、Skill 和工具。
10. 普通项目默认只有一个 `main` area；monorepo 或 product-family 项目可在 `context.toml` 中增加多个 `area` / `context_unit`，并用 `context_role` 或 manifest role 区分 `area`、`subdomain`、`contract`、`foundation`、`archive`、`implementation-index` 和 `decision-rationale` 等不同 Context 类型。

## 常用命令

- `make validate-context`：检查 `project_context/**` 是否足够支持 agent 恢复上下文。
- `npx sdlc-harness sync`：刷新 managed guidance、Context template、默认 Skill 和工具。
<!-- pjsdlc:sdlc-harness:end -->
