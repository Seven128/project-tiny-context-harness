# Gate Thinning Analysis

Status: Recommendation adopted into common Harness guidance.

## Purpose

Delivery Benchmark 现在已经有一个高置信度负向信号：在
`support-triage-board` formal pilot 中，两条路径都通过 hidden quality probe
`12/12 PASS`，但 Harness observer 总耗时为 `48.4984 min`，Baseline 为
`26.9158 min`。这说明当前问题不能只靠继续挑选更高复杂度场景来解释；需要先实事求是地分析 gate
层是否过厚。

本 memo 记录打薄 gate 的收益和风险。`Standard Thin` 已被采纳为通用 Harness 默认 gate 厚度；它改变的是 gate 默认触发频率和范围，不降低同等质量标准。

## Current Conclusion

当前结论：**gate 应该打薄，但不应该打到只剩产品测试；性价比最高的是
`Standard Thin`：内部循环 focused product gates + 轻量状态检查，workflow strict gates 集中到
task completion / pre-commit / phase transition / release / package-source 变更边界。**

这个结论来自两层证据：

- 高置信证据说明当前厚流程在中等复杂度场景下不划算：`support-triage-board`
  两条路径都通过 hidden quality probe `12/12 PASS`，但 Harness `48.4984 min`，
  Baseline `26.9158 min`。
- 诊断证据说明 gate 不能被整体删除：Harness operator 记录到 `9` 个 gate finding，
  其中 `8` 个是 workflow gate finding，`1` 个是 product gate finding。它们不足以证明净价值，
  但足以说明 gate 覆盖的是实际风险，不是纯装饰。

因此，最优不是“保持厚 gate”，也不是“砍掉 gate”。最优是把 gate 的默认触发点从“过程内高频验证”
改为“产品质量随时 focused 验证，workflow 治理在边界集中验证，高风险任务严格验证”。

## Recommended Gate Thickness

| 层级 | 推荐厚度 | 触发点 | 为什么保留 / 打薄 |
|---|---|---|---|
| Orientation | Thin | 新会话、继续、状态查询 | 只读状态和直接事实源，不跑重 gate；这直接降低开场成本且不影响交付完成 gate。 |
| Product quality | Keep focused | 初始交付、RFC、debug 后 | hidden probe / focused smoke 是同等质量前提，当前证据最强，不能打掉。 |
| Workflow state | Thin + boundary strict | 内部循环轻量检查；task completion / pre-commit 跑严格 gate | gate finding 多数是 workflow hygiene；边界集中检查能保留价值，减少 RFC 内反复阻塞。 |
| Handoff/recovery | Conditional | long-lived、多 Agent、复杂 RFC、高风险 provider/live 时严格 | 普通任务完整 handoff 成本可能不划算；高风险或长周期任务仍需要上下文沉淀。 |
| Phase/release | Strict boundary | `/advance`、release、发布前 | 阶段出口和发布安全不可用平均耗时优化换掉。 |
| Package/source/full regression | Strict conditional | package source、managed assets、public CLI、validator 变化 | 对 benchmark 普通 scenario 是无关成本；对 package 变更是必须 gate。 |

### 为什么这是最高性价比

- 它保留了最高置信的质量保障：product hidden probe / focused smoke。
- 它保留了 gate finding 暗示有价值的 workflow 风险，但把高频过程成本压到边界。
- 它正面处理负向耗时证据：同质量下慢 `1.8x` 不能靠“再找更复杂场景”解释过去。
- 它避免最大损失：不牺牲 phase/release/package 和高风险 provider/live 的 strict gate。
- 它可逆：如果后续 hidden probe、escaped defect、repair loop 数据证明某类薄 gate 漏问题，可以把该类恢复为 strict。

## Benefits

- 降低普通/中等复杂度任务的平均负向期望，避免 Harness 在同等质量下系统性慢一倍。
- 减少 RFC/debug 内部反复跑 workflow validators、overview 和 plan checks 的中断成本。
- 让 Agent 把注意力放回产品行为、focused smoke 和 hidden quality，而不是每个阶段都重新证明整个流程。
- 保留核心安全边界：completion、phase transition、release、package/source 变更和高风险 provider/live 仍 strict。
- 让 benchmark 更公平：测 lifecycle delivery efficiency，而不是把不相关 package regression 或 authoring overhead 算进 scenario。

## Risks / Losses

- Workflow state 问题可能更晚暴露，例如 draft task 残留、implementation doc 缺入口、handoff evidence 不完整。
- 普通任务的长期上下文沉淀会变薄，新对话恢复优势可能更弱。
- Agent 必须更准确判断 change surface；如果误判“这不是 UI/provider/package 变更”，可能漏跑相关 gate。
- 边界集中 gate 可能导致最后一次性爆出多项修复，局部延迟更大。
- 如果团队把 `Standard Thin` 误解成“少写文档/少验证质量”，会降低 Harness 的设计价值；必须明确 product quality gate 不打薄。

## Evidence Boundary

当前可以进入核心结论的指标只有：

- external observer elapsed time: high confidence。
- hidden quality probe product quality: high confidence。

当前只能作为诊断线索的指标包括：

- `gate_value`: operator-recorded，medium confidence。
- `automation_burden`: 当前 support pilot 未记录，unavailable。
- `context_recovery`: hidden answer key + file references，medium confidence。
- `wrong_path_count`: 当前 support pilot 未记录，unavailable。

因此，Harness gate finding 可以说明“哪里可能有价值”，但不能证明“gate 净价值已经抵消了成本”。

## Gate Decision Matrix

| Gate 类别 | 目的 | 当前收益证据 | 当前成本/负面信号 | 打薄候选 | 收益 | 风险 / 损失 | 保留条件 |
|---|---|---|---|---|---|---|---|
| Orientation gate | 新会话定位当前状态、task 合同和下一步 | 能减少乱跑阶段、减少状态误读 | 开场若误跑重 gate，会把定位变成验收 | 只读 lifecycle、plan、当前 task 和直接事实源 | 降低开场成本，减少 benchmark 中无关验证 | 可能漏掉已过期 overview 或 package drift | 只有用户要求验证、准备提交/发布、阶段流转或本轮已修改后才升级 |
| Product / domain gate | 证明产品行为正确 | hidden quality probe 和项目本地 smoke 是高信号质量证据 | 成本通常较低，且直接服务同等质量 | 保留为默认必跑，优先 hidden probe / focused tests | 保持同质量前提，减少伪快 | 若太窄可能漏跨层问题 | 必须覆盖当前 scenario 的 API/UI/policy/debug 行为 |
| Workflow state gate | 检查 plan/task/draft/implementation doc 状态一致 | support pilot 中 Harness operator 记录到 draft、task metadata、handoff evidence 等问题 | 当前证据是 medium；多次 `validate-plan` / overview gate 会放大 RFC 成本 | 改为 task completion / pre-commit 边界集中运行，减少循环内重复 | 降低 RFC 阶段阻塞，保留状态闭环 | plan/draft 残留、task ledger 漂移、implementation doc 变弱 | 只有能稳定阻止 hidden-probe 相关缺陷、commit 污染或恢复失败才保留高频 |
| Handoff / recovery gate | 保证新 Agent 能恢复入口、风险和下一步 | 长期上下文是 Harness 的核心产品价值 | support/context pilot 尚未高置信证明 recovery 优势 | 从每阶段强制改为 handoff boundary 或 high-risk task 触发 | 降低普通 task 文档负担 | 长期项目上下文沉淀变少，新对话恢复可能变慢 | 高风险、多人接手、长 RFC、provider/live 边界仍保留 |
| Phase / release gate | 阶段出口和发布安全 | 防止未完成 task 越阶段、release 缺 smoke/rollback | 不适合在每个小循环里重复跑 | 只在 `/advance`、release、正式 completion 边界运行 | 减少开发/RFC 内部成本 | 阶段边界更依赖 Agent 判断 | 阶段流转、提交、发布前必须保留 |
| Package/source/full regression | 保护 npm package、managed assets、consumer behavior | 对 Harness package 变更很重要 | 对普通 benchmark scenario 属于 out-of-scope 成本 | 只在 package source、managed assets、public CLI 或 validators 变化时触发 | 避免把 package authoring 成本算进 scenario delivery | 误判变更面时可能漏 package drift | package/source 变更、release 前、consumer-facing 行为变更时必须保留 |

## Candidate Options

### Option A: Benchmark Thin Profile

只在 benchmark 中启用。每个 scenario 默认运行 product/domain gate、hidden quality probe、
轻量 workflow 状态检查；不跑 package sync/check、full regression 或无关 phase gate。

- 收益：最接近同等质量平均期望；减少把 authoring/package 成本算进 Harness。
- 风险 / 损失：benchmark 结果可能低估真实 Harness 在完整用户项目中的治理成本。
- 适用条件：用于正式 delivery benchmark；不能推广为通用 Harness 默认行为。

### Option B: Conditional Gates

按变更面触发 gate：UI 变更才跑 UI smoke，package assets 变更才跑 source sync/check，高风险
provider/live 才跑严格 evidence boundary。

- 收益：普通任务负担下降，同时保留高风险保护。
- 风险 / 损失：需要 Agent 正确识别变更面；误判会漏 gate。
- 适用条件：需要清楚的 change-surface checklist，且失败时能回退到 strict gate。

### Option C: Strict Only At Boundaries

完整 workflow gate 只放在 task completion、phase transition、release、package/source 变更边界；
阶段内部循环只跑 focused product gate。

- 收益：减少 RFC/debug 内部反复 validate 的耗时，让 gate 成本更集中、可解释。
- 风险 / 损失：阶段内部状态漂移可能积累到边界才暴露，修复集中爆发。
- 适用条件：适合普通和中等复杂度任务；不适合安全边界、live provider 或多人并行高风险任务。

### Option D: Keep Current Thickness

保持当前 gate 厚度，但要求每个高频 gate 用高置信 evidence 证明净价值。

- 收益：最大化流程治理和长期上下文完整度。
- 风险 / 损失：当前 support pilot 已显示同质量下显著变慢，继续保持现状可能扩大普通任务负向期望。
- 适用条件：只有当后续高置信数据证明 gate 明确减少 escaped defect、repair loop 或人工纠偏时才合理。

## Implemented Direction

通用 workflow 已采用 `Standard Thin` profile：普通任务和 benchmark 使用 focused product gates + 轻量状态检查 + 边界 strict gates；高风险 provider/live、release、package/source 变更继续 strict。这样既承认当前负向数据，也不直接放弃 Harness 用来沉淀上下文和保护边界的核心价值。

后续是否继续细分 `thin | standard | strict` profile，仍需要更多高置信数据回答：

- 哪些 gate 是 product quality 必需，哪些只是 workflow hygiene？
- 哪些 gate 的成本能被 hidden probe、escaped defect 或 repair loop 数据证明？
- 哪些 gate 打薄后会损失长期上下文恢复能力？
- 是否需要机器可配置的 `thin | standard | strict` profile，还是继续通过文本规则和场景 gate profile 控制？
