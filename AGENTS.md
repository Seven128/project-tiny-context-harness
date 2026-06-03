# Minimal Context Harness Protocol

本仓库当前使用 Minimal Context Harness。默认工作流目标是维护最小长期事实源，让新会话 agent 能快速恢复项目意图、边界、验证入口和下一步安全动作。

## 默认事实源

- 全局上下文：`project_context/global.md`
- 模块上下文：`project_context/modules/*.md`
- 产品质量事实：项目代码、测试、smoke、CI、hidden probe 或人工验收
- 历史事实源：`.work_products/**`、`.codex/state/**` 和阶段 Skill 仍保留为本仓库历史/迁移材料，不再作为新项目默认入口

## 工作规则

1. 新会话、继续工作、debug 或需求变更时，先读 `project_context/global.md` 和相关 `project_context/modules/*.md`。
2. Harness 只维护上下文质量，不替项目证明产品质量；产品质量由项目自己的测试、probe、CI 或人工验收负责。
3. 长期事实默认只写入 `project_context/**`。不要默认新增 PRD、tech plan、ADR、implementation doc、review/test/release 文档。
4. ADR 内容降级为 Context 的 `Design Rationale`；实现说明优先进入代码注释、测试名或模块 Context 的关键约束。
5. `validate-context` 只检查 Context 是否足够支持恢复上下文，并阻止伪造“测试已通过”的说法。
6. `sync` 只刷新 managed guidance 和工具；语义迁移必须由 `migrate-context --write` 显式触发。
7. `upgrade` 不做语义迁移；检测到旧阶段事实源时，只提示运行 `migrate-context --dry-run`。

## 本仓库 authoring 例外

本仓库仍维护 AI SDLC Harness package、delivery benchmark 和历史阶段式实现。修改这些区域时，可以读取对应历史事实源作为设计和迁移证据：

- package / CLI / managed assets：`packages/sdlc-harness/**`、`.codex/pjsdlc_managed/**`、`tools/**`
- benchmark：`examples/delivery-benchmark/**`
- 历史设计与测试证据：`.work_products/**`、`PROJECT_SPEC.md`
- authoring-only skill：`.codex/skills/authoring/**`

这些文件是本仓库自举与迁移材料，不代表新 package consumer 的默认文件结构。

## 常用命令

- `make validate-context`
- `make validate-harness`（vNext 兼容别名）
- `npx sdlc-harness migrate-context --dry-run`
- `npx sdlc-harness migrate-context --write`
- `node packages/sdlc-harness/dist/cli.js package sync-source`
- `node packages/sdlc-harness/dist/cli.js package check-source`

<!-- pjsdlc:sdlc-harness:begin -->
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
4. ADR 降级为 Context 中的 `Design Rationale`；实现说明优先写成代码注释、测试名或模块 Context 中的关键约束。
5. Harness workflow gate 只运行 `validate-context`，用于检查上下文是否可恢复。
6. 产品质量由项目自己的验证入口证明；Context 只能声明验证入口，不能伪造“测试已通过”。
7. `sync` 只刷新 managed guidance 和工具；语义迁移必须由 `migrate-context --write` 显式触发。

## 常用命令

- `make validate-context`：检查 `project_context/**` 是否足够支持 agent 恢复上下文。
- `npx sdlc-harness migrate-context --dry-run`：预览从旧 `.work_products/**` 到 `project_context/**` 的迁移。
- `npx sdlc-harness migrate-context --write`：显式写入迁移结果，不删除旧事实源。
<!-- pjsdlc:sdlc-harness:end -->
