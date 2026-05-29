# [Feature/Capability] Technical Design

## 1. 关联产品需求

- PRD:
- Requirement IDs:

## 2. 现有上下文

- 当前模块（Current modules）:
- 相关 APIs（Related APIs）:
- 相关数据（Related data）:

## 3. 方案架构

- 领域边界（Domain boundary）:
- 主要组件（Main components）:
- 数据流（Data flow）:

```txt
Input
-> Validation
-> Core processing
-> Persistence / side effects
-> Output
```

## 4. 接口契约（Interface Contract）

| 接口（Interface） | 方法/事件（Method/Event） | 请求（Request） | 响应（Response） | 错误（Errors） |
|---|---|---|---|---|
|  |  |  |  |  |

## 5. 数据模型（Data Model）

| 实体（Entity） | 字段（Fields） | 负责人（Owner） | 备注（Notes） |
|---|---|---|---|
|  |  |  |  |

## 6. 任务拆分（Task Breakdown）

| Task ID | 标题（Title） | Allowed Paths | Required Gates | Implementation Doc |
|---|---|---|---|---|
| TASK-001 |  | `src/**`, `tests/**` | `make lint`, `make test-current-domain` | `.docs/04_implementation/...` |

`Implementation Doc` 应指向模块、子系统或核心数据流级文档；多个 task 可以更新同一份文档，task id 和 commit 记录在该文档的 provenance / Change Log 中。

## 7. Development Self-Test Contract（开发自测合同，待执行）

> service / agent / runtime / worker / frontend app / provider-live / API / CLI 等可运行边界的开发 task 必填，并同步写入 `plan.draft.yaml.tasks[].self_test_contract`。

- Contract source:
- Capability refs:
- Runnable entry:
- Observable exit:
- Module key test path（local start -> all self-test scenarios -> all promised runnable entries -> internal key paths -> observable completion evidence）:
- Required gates:

| Scenario ID | Entry | Expected Exit | Evidence |
|---|---|---|---|
| ST-001 |  |  | command/browser/API/log/screenshot/etc |

- Not applicable reason:

## 8. 风险与缓解

| 风险（Risk） | 等级（Level） | 缓解措施（Mitigation） |
|---|---|---|
|  | P1 |  |

## 9. 需要关注的方案偏移

- 
