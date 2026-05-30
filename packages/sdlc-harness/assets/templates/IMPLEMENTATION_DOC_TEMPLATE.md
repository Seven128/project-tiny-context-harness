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
- Not applicable:

## 7. Development Self-Test Report（开发自测报告，已执行）

- Contract Source:
- Scenario Results:
- Executed Gates:
- Module Key Test Path: local start / invocation -> all self-test scenarios -> all task/module promised runnable entries -> actual internal key paths / boundaries / checkpoints -> observable completion evidence
- Actual Evidence:
- Missing / Blockers:
- Testing Handoff Readiness:

| Scenario ID | Result | Executed Entry | Actual Exit | Evidence |
|---|---|---|---|---|
|  |  |  |  |  |

## 8. Testing Handoff Contract（测试交接合同）

- Entry:
- Config:
- Initialization / health:
- Input sample:
- Expected exit / observable side effect:
- Cleanup / reset / idempotency:
- Evidence Level:

## 9. 关键实现逻辑

- 输入校验（Input validation）:
- 核心分支（Core branches）:
- 异常处理（Error handling）:
- 边界兜底（Boundary fallback）:
- 性能或并发注意事项（Performance or concurrency notes）:

## 10. 与技术方案的偏移

- 

## 11. 测试覆盖（Test Coverage）

| 测试（Test） | 覆盖范围（Coverage） | 结果（Result） |
|---|---|---|
|  |  |  |

## 12. 变更记录（Change Log）

| 日期（Date） | Task ID | Commit | 摘要（Summary） |
|---|---|---|---|
|  |  |  |  |

## 13. 后续维护注意事项

- 
