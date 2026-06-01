# ADR 003: Plan State and Task History

Status: Accepted

## Context

`.codex/state/plan.yaml` 是阶段任务的机器可读短期执行记忆，只保留当前和未来任务。`current_phase` 只保存在 `.codex/state/lifecycle.yaml`，`plan.yaml` 不重复保存当前阶段。open task 直接保存当前任务需要的执行合同；任务完成后从 `plan.yaml` 移除，避免过往任务变成无效上下文。

早期设计里，checkpoint 文件、archive 目录、gate results 和 lifecycle history 会让 active state 同时承担“当前现场”和“历史流水”两种职责。随着任务推进，这类信息会膨胀、过期，并持续占用 Agent 默认上下文。

## Options

- 在 active state 中长期保存 done task、phase history、gate logs 和 checkpoint。
- 只在 Git/CI/release 系统中追溯所有历史，不保存任何可恢复的当前现场。
- 让 `plan.yaml` 保存当前和未来任务合同，完成历史转入 implementation docs、git、PR/CI、release evidence 或外部系统。

## Decision

`plan.yaml` 是长程目标被拆分后的短期任务容器，而不是历史任务数据库。凡是与项目目的相关、需要拆成可恢复小步执行的工作，都可以被表达为 plan task；通用 Harness 默认只解释 workflow 关心的任务。

任务完成并写入或更新相关事实源后，从 `plan.yaml` 移除该 task。历史动作记录由 git commit、PR/CI、release evidence 和模块级 implementation doc 共同承担；只有用户明确要求 forensic、audit 或 regression 追溯时，才临时查询冷 archive。

## Rationale

open task 的 `allowed_paths`、`required_gates` 和 `working_notes` 是执行期约束，不是长期查询 API。把它们长期保留会让 Agent 误读过期现场，也会增加每次恢复任务时的上下文噪声。

`plan.draft.yaml` 的设计动机，是在不污染当前执行状态的前提下完成开发交接。技术方案阶段必须证明 PRD 和架构可以落成具体开发单元，但 `plan.yaml` 在 `ARCHITECTING` 时仍是架构阶段的正式执行队列。未来 `SPRINTING` task 因此先进入 `plan.draft.yaml`，在开发阶段被 promote 后同次从 draft queue 删除。

## Consequences

- `lifecycle.yaml` 不保存 phase transition history。
- `plan.yaml` 不长期保存 commit hash、done task 合同或 gate log。
- 任何 draft task promote 成正式 `TASK-*` 时，必须同次从源 draft queue 删除。
- SPRINTING task 完成采用 implementation commit + completion ledger commit 的两段提交。
- `validate-current` 在阶段出口继续执行 no-open 检查。

## Source Trace

- `PROJECT_SPEC.md#5.1`: 生命周期状态。
- `PROJECT_SPEC.md#7.1`: plan.yaml。
- `PROJECT_SPEC.md#7.2`: 开发阶段循环。
- `PROJECT_SPEC.md#7.3`: Plan Protocol。
- RFC lineage: `RFC_004`, `RFC_005`, `RFC_010`, `RFC_011`, `RFC_012`, `RFC_016`。

## Links

- [PROJECT_SPEC.md](../../PROJECT_SPEC.md)
- [.codex/state/plan.yaml](../../.codex/state/plan.yaml)
- [.codex/state/plan.draft.yaml](../../.codex/state/plan.draft.yaml)
