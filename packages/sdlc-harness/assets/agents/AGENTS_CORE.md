# Minimal Context Harness Protocol

本项目使用 Minimal Context Harness。Harness 只维护上下文质量，不替项目证明产品质量。

## 事实源

- 项目全局上下文：`project_context/global.md`
- 模块上下文：`project_context/modules/*.md`
- 产品质量事实：项目自己的代码、测试、smoke、CI、hidden probe 或人工验收

## 工作规则

1. 新会话或继续工作时，先读取 `project_context/global.md` 和相关 `project_context/modules/*.md`。
2. 如果用户请求新需求、debug、RFC 或后续迭代，先判断需要更新哪些 Context 模块，再修改代码。
3. 长期事实只写入 `project_context/**`；不要默认创建 PRD、tech plan、ADR、implementation doc、review/test/release 文档。
4. 用户要求“产品方案 / 产品经理”或“设计稿 / UI/UX”时，使用对应 Context authoring Skill，把长期结论写回 `project_context/**`。
5. ADR 降级为 Context 中的 `Design Rationale`；实现说明优先写成代码注释、测试名或模块 Context 中的关键约束。
6. Harness workflow gate 只运行 `validate-context`，用于检查上下文是否可恢复。
7. 产品质量由项目自己的验证入口证明；Context 只能声明验证入口，不能伪造“测试已通过”。
8. `sync` 只刷新 managed guidance 和工具；语义迁移必须由 `migrate-context --write` 显式触发。

## 常用命令

- `make validate-context`：检查 `project_context/**` 是否足够支持 agent 恢复上下文。
- `npx sdlc-harness migrate-context --dry-run`：预览从旧用户项目资料到 `project_context/**` 的迁移。
- `npx sdlc-harness migrate-context --write`：显式写入迁移结果，不删除旧事实源。
