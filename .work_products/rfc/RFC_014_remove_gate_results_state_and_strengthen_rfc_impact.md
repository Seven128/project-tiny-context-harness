# RFC_014 Remove Gate Results State And Strengthen RFC Impact

## Summary

移除独立 `gate_results.log` state。gate 结果不再作为单独 state 文件保存；当前 task 执行时的 gate 证据写入 task `working_notes` 或 implementation doc 的 `Verification`，最终以 implementation doc、CI logs 或 release 记录为准。

同时收敛历史 task 信息的定位：过去 task 查询主要面向“看产物结果和变更意图”，默认读取 implementation doc、RFC/PRD/tech plan 和代码，而不是完整 open task execution contract。`allowed_paths`、`required_gates`、临时 `working_notes` 等字段是当前执行约束，不作为历史查询 API。

本 RFC 还补强 `pjsdlc_rfc_recalibrate`：RFC 阶段必须先做影响面清单，覆盖文档、state、Skill、policy/template、tools、package assets、tests、sync/upgrade/migration 和 generated overview，再进入补丁或 DEV task。

## Motivation

`gate_results.log` 已经从长期历史变成短期 scratchpad。继续保留独立 state 文件会增加额外事实源和清理动作，而 gate 证据本质上属于当前 task 验证过程，可以直接记录在 task notes 和 implementation doc 中。

历史 task 查询也不需要完整执行合同。用户真正关心的是过去做了什么、为什么做、产物在哪里、验证了什么；`allowed_paths`、`required_gates` 和临时 notes 主要服务于当时执行，不应成为默认历史读取内容。

另外，RFC 是改变事实链的入口，必须稳定考虑影响面。漏掉 package assets、tests、migration、generated overview 或 Skill 文案，会让变更在后续阶段才暴露，增加返工。

## Decision

1. 删除 `<harnessRoot>/state/gate_results.log`。
2. `tools/run_current_gate.py` 不再写 gate state，只运行阶段 gate 并输出结果。
3. `sdlc-harness init` 不再生成 `gate_results.log`。
4. `validate_harness`、phase contracts、allowed paths 和 README/AGENTS/Skill 不再要求或描述 `gate_results.log`。
5. gate 证据写入当前 task `working_notes` 或 implementation doc `Verification`；CI/release 系统可作为长期外部记录。
6. 历史 task 查询以 implementation doc、RFC/PRD/tech plan 和代码为主；open task 的 `allowed_paths`、`required_gates`、`working_notes` 是 execution-only fields，不作为历史查询 API。
7. RFC Skill 必须输出影响面清单，并在补丁前确认是否影响 docs/state/skills/policies/templates/tools/package assets/tests/migrations/generated artifacts。

## Out Of Scope

- 不删除 `allowed_paths`、`required_gates` 或 `acceptance_criteria` 作为当前 open task 执行约束。
- 不新增自动 CI 日志抓取或 gate artifact 系统。
- 不回滚 task implementation commit / completion ledger 两段提交协议。

## Acceptance Criteria

- 当前仓库不再保留 `.agent/state/gate_results.log`。
- 新项目 init 不生成 gate results state。
- 当前 gate runner 不再写 gate state。
- README、AGENTS、Dev/Manager Skill 不再要求 gate log。
- RFC Skill 明确要求影响面清单。
- Package assets 同步。
