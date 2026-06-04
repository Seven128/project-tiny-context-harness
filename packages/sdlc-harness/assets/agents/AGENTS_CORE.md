# Minimal Context Harness Protocol

本项目使用 Minimal Context Harness。Harness 只维护上下文质量，不替项目证明产品质量。

## 事实源

- 项目全局上下文：`project_context/global.md`
- 架构上下文：`project_context/architecture.md`（克制、最小，只记录系统边界、组件关系和长期约束）
- 模块上下文：`project_context/modules/*.md`
- 产品质量事实：项目自己的代码、测试、smoke、CI、hidden probe 或人工验收

## 工作规则

1. 新会话或继续工作时，先读取 `project_context/global.md`、`project_context/architecture.md` 和相关 `project_context/modules/*.md`。
2. 新需求、需求变更、debug 结论或后续迭代后，如有影响未来恢复的长期事实，更新 `project_context/**`；普通局部实现细节不写。
3. 长期事实只写入 `project_context/**`；不要默认创建 PRD、tech plan、ADR、implementation doc、review/test/release 文档。
4. 用户明确要求“产品方案 / 产品经理 / 产品专家”、“设计稿 / UI/UX 设计方案 / 视觉专家”或“开发工程师 / 技术方案 / 开发方案 / 技术专家”这类角色或强产物名时，使用对应 Context authoring Skill，把长期结论写回 `project_context/**`。
5. 用户可以在 `.agent/pjsdlc_managed/override_skills/context_product_plan.md`、`.agent/pjsdlc_managed/override_skills/context_uiux_design.md` 或 `.agent/pjsdlc_managed/override_skills/context_development_engineer.md` 中追加项目本地 Skill 规则；`sync` 会合并到 `.agent/skills/**`。
6. ADR 降级为 Context 中的 `Design Rationale`；实现说明优先写成代码注释、测试名或模块 Context 中的关键约束。
7. Harness workflow gate 只运行 `validate-context`，用于检查上下文是否可恢复。
8. 产品质量由项目自己的验证入口证明；Context 只能声明验证入口，不能伪造“测试已通过”。
9. `sync` 只刷新 managed guidance、Skill 和工具。

## 常用命令

- `make validate-context`：检查 `project_context/**` 是否足够支持 agent 恢复上下文。
- `npx sdlc-harness sync`：刷新 managed guidance、Context template、默认 Skill 和工具。
