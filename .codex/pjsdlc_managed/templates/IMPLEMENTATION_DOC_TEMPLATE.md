# [Module/Subsystem/Core Flow] Implementation Doc

## 1. 关联信息

- Domain:
- Module / subsystem / core flow:
- Updated by task:
- Linked PRD:
- Linked technical design:
- Linked RFC:
- Linked commit:

## 2. 当前实现范围

- 新增（Added）:
- 修改（Changed）:
- 未覆盖（Not covered）:

## 3. 真实代码结构

| 文件（File） | 作用（Purpose） | 关键函数/对象（Key Functions/Objects） |
|---|---|---|
| `src/...` |  |  |

## 4. 核心数据流

```txt
Input
-> Validation
-> Core processing
-> Error handling
-> Output
```

## 5. Runnable Entry/Exit（可运行入口/出口）

- Entry points:
- Exit / side effects:
- Config contract:
- Fixture/live boundary:
- Missing runtime boundaries:

## 6. Development Evidence（开发自测证据）

- Evidence Level:
- Target Runtime Environment:
- Runnable Entry:
- Observable Exit:
- Client / Server Initialization:
- Config Contract:
- Testing Handoff Readiness:
- Known Missing Runtime Boundaries:
- Basic Self-test Evidence: See `Development Self-Test Report`.
- Resume Capsule / Runbook:
- Not applicable:

## 7. Current Operator Path（当前操作路径，仅 runtime/live/remote-operator 需要）

- Canonical path:
- Operator runbook: `.docs/09_runbooks/...`
- Credential reference: Keychain item name 或 secret reference name only；不要记录明文密钥。
- Command/UI channel:
- Hard Constraints: 会改变下一步动作的判断必须提升到这里和 `plan.yaml#resume_capsule.do_not_retry`；不要只埋在 evidence、notes 或 appendix。
- Do-not-retry summary: fallback / diagnostic 只写一句结论，详细内容进 exploration appendix 或 git history。

## 8. Development Self-Test Report（开发自测报告）

本节是开发阶段可执行交接卡，只证明模块应用入口、核心路径、出口和最小证据指针。目标控制在几十行；high-risk runtime/live 场景包含 `Gate Breakdown` 时也不要超过 120 行。本节不是 debug log、operator log、runbook、evidence dump 或探索流水。

- Report Status: PASS | BLOCKED | IN_PROGRESS | STALE
- Contract Source:
- Module Application Entry:
- Module Key Test Path: local start / invocation -> all self-test scenarios -> all task/module promised runnable entries -> actual internal key paths / boundaries / checkpoints -> observable completion evidence
- Module Key Test Graph: required only when `self_test_contract.graph_required: true` or `module_key_test_graph` exists; keep it as a compact DAG pointer list/table covering entry, checkpoints, scenario nodes, observable exit, and evidence refs.
- Scenario Results:
- Executed Gates:
- Observable Exit:
- Current Blocker:
- Testing Handoff Readiness:
- Evidence Index Refs: `.docs/09_runbooks/..._evidence.md` 或外部 artifact / CI / command output path；不要复制证据正文。

保留：
- Runnable Entry / Module Key Test Path / Observable Exit
- Scenario Results / Executed Gates / Evidence Index Refs
- Current Blocker / Testing Handoff Readiness

不保留：
- 每次工具探索的完整流水
- debug log、operator log、历史操作日记或 runbook 正文
- fallback / diagnostic 的长篇命令、截图过程或 UI 细节
- 与当前恢复路径无关的旧失败通道；只在 appendix 或 git history 保留
- `Actual Evidence` 正文字段；证据正文进入 Evidence Index 或外部 artifact，本节只留 refs
- high-risk implementation doc 主线不得新增 `Evidence Dump`、`Operator Log`、`Failed Attempts`、`Screenshot Index` 等章节；这些只能进入 runbook / evidence index / exploration appendix

### Gate Breakdown（Gate 分层）

| Gate Layer | Status | Evidence | Gap / Next Action |
|---|---|---|---|
| Local gate |  |  |  |
| Cloud/service gate |  |  |  |
| Executor/operator readiness |  |  |  |
| Live smoke / handoff |  |  |  |

| Scenario ID | Result | Executed Entry | Actual Exit | Evidence |
|---|---|---|---|---|
|  |  |  |  |  |

### Module Key Test Graph（复杂 / high-risk 路径需要）

只记录实际 handoff path 的 DAG 骨架和 evidence pointer；不要放 command output、截图过程、operator log、debug log、runbook 正文、失败探索或历史流水。

| Node ID | Kind | Label | Scenario Ref | Expected Exit | Evidence Ref |
|---|---|---|---|---|---|
| entry-local-start | entry |  |  |  |  |
| scenario-st-001 | scenario |  | ST-001 |  | `.docs/09_runbooks/...#ST-001` |
| exit-observable | observable_exit |  |  |  |  |

| From | To |
|---|---|
| entry-local-start | scenario-st-001 |
| scenario-st-001 | exit-observable |

## 9. Testing Handoff Contract（测试交接合同）

- Entry:
- Config:
- Initialization / health:
- Input sample:
- Expected exit / observable side effect:
- Cleanup / reset / idempotency:
- Evidence Level:

## 10. 关键实现逻辑

- 输入校验（Input validation）:
- 核心分支（Core branches）:
- 异常处理（Error handling）:
- 边界兜底（Boundary fallback）:
- 性能或并发注意事项（Performance or concurrency notes）:

## 11. 与技术方案的偏移

- 

## 12. 测试覆盖（Test Coverage）

| 测试（Test） | 覆盖范围（Coverage） | 结果（Result） |
|---|---|---|
|  |  |  |

## 13. 变更记录（Change Log）

| 日期（Date） | Task ID | Commit | 摘要（Summary） |
|---|---|---|---|
|  |  |  |  |

## 14. 后续维护注意事项

- 
