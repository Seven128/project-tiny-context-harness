# ADR 004: Lightweight Graph Contracts

Status: Accepted

## Context

阶段流转最初由阶段节点上的 `next` / `returns` 字段和 transition helper 中的硬编码 RFC interrupt 规则共同表达。这样会形成多个事实源：文档说明、节点局部字段、工具硬编码和 validator 判断可能漂移。

开发自测路径最初主要是 `Module Key Test Path` 文字路径。它轻量，但 Agent、Review 和 Testing 容易漏读其中的分支、checkpoint、scenario、出口和 evidence refs。复杂 runtime/live/provider/browser/worker task 需要更稳定的 handoff path。

## Options

- 继续使用隐式流转字段、长文字路径和工具硬编码。
- 引入轻量 declarative graph，只保存稳定 contract 和 pointer。
- 引入重型 graph engine、node class、edge class、traversal framework、visualizer、schema migration framework 或 execution trace graph。

## Decision

`phase_contracts.yaml` 使用轻量显式有向图表达阶段关系：`phases` 是阶段节点，只保存稳定阶段 contract；`transitions` 是有向边，只保存合法流转、触发语义和少量运行期效果，例如设置或清理 `suspended_phase`。

TESTING bugfix 回流不新增 `bugfix` transition kind，也不新增 bugfix 子状态机；它使用普通 `kind: return` 加 searchable `trigger` 表达：`bugfix_replan` 回 `ARCHITECTING`，`bugfix_implementation_gap` 回 `SPRINTING`。

`self_test_contract` 保留 `module_key_test_path` 作为短文字摘要和兼容入口；复杂或高风险任务可以设置 `graph_required: true` 并提供轻量 `module_key_test_graph` DAG，表达入口、checkpoint、branch、scenario、observable exit 和短 evidence pointer。

不引入 graph engine、node class、edge class、遍历框架、可视化、schema migration 框架、图数据库、执行引擎或 trace graph。

## Rationale

轻量显式图让正常推进、开发前返回、RFC interrupt、RFC resume、BLOCKED interrupt 和 BLOCKED resume 成为固定字段，被 transition helper 和 validator 同时消费，而不是散落在文档说明、`next` / `returns` 字段和工具硬编码里。

TESTING bugfix 的两个回流方向确实影响下一步动作，但它们不需要重型图建模。`bugfix_replan` 与 `bugfix_implementation_gap` 的差别可以通过 edge trigger、`TEST_REPORT.md#Bugfix Route` 和技能提示词稳定表达；新增 transition kind、graph engine 或 bugfix 状态节点会增加迁移和上下文成本，收益不明显。

测试路径选择 DAG 而不是树，是因为多个 scenario 经常共享 setup、分支后汇合到同一出口。选择轻量 DAG 而不是重型测试执行图，是因为需求只是让 Review/Testing 消费 handoff path，不需要执行引擎、trace graph、图数据库、可视化或遍历框架。

结构化不自动等于 Agent 会注意。只有当 Agent 被要求读取它、validator 检查它、信息在固定字段里、并且不和长文档重复漂移时，结构化才真正降低遗漏。

## Consequences

- `transition.py` 从 `phase_contracts.yaml#transitions` 计算合法流转和 `allowed_next_phases`。
- canonical phase nodes 不再使用 `next` / `returns`；旧 consumer policy 由 transition helper fallback 兼容。
- TESTING bugfix recovery 由 `TEST_REPORT.md#Bugfix Route` 选择 `bugfix_replan` 或 `bugfix_implementation_gap`，transition helper 仍只按合法 `from` / `to` 边流转。
- graph 节点和边只保存稳定 workflow contract 或 handoff path skeleton，不保存 task history、operator log、debug evidence、runbook 正文、implementation doc 正文、截图过程、失败探索流水或阶段执行历史。
- 新增 graph 类结构前必须说明 source of truth、consumer、validator、migration/compat path，以及为什么现有 YAML 字段不够。

## Source Trace

- `PROJECT_SPEC.md#5.2`: 轻量显式阶段图、RFC/BLOCKED edge effects、Development Self-Test Graph。
- `PROJECT_SPEC.md#9.2`: validate-design / validate-dev / validate-rfc graph 影响面。
- `.codex/skills/authoring/harness_package_design/SKILL.md`: workflow graph 和 data-structure 变更边界。

## Links

- [PROJECT_SPEC.md](../../PROJECT_SPEC.md)
- [phase_contracts.yaml](../../.codex/pjsdlc_managed/policies/phase_contracts.yaml)
- [ADR 005: Development Self-Test Handoff](ADR_005_development_self_test_handoff.md)
