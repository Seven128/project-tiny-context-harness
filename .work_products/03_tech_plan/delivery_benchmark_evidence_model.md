# Delivery Benchmark Evidence Model Technical Plan

## 1. 关联产品需求

- PRD: `.work_products/01_product/delivery_benchmark_evidence_model.md`
- ADR: `.work_products/05_decisions/ADR_008_delivery_benchmark_scenario_design.md`
- Runnable module: `examples/delivery-benchmark/**`

## 2. 设计原则

Delivery Benchmark 的实现必须让指标和结论之间存在可审计因果链。每个核心结论都必须满足：

```txt
same scenario
-> same final quality bar
-> high-confidence product quality evidence
-> high-confidence elapsed measurement
-> explicit confidence and data source
-> conservative conclusion
```

如果某个指标只能由 operator 判断、静态 keyword/path rubric 或人工边界计时得出，它可以帮助诊断，但不能单独支撑“更高效”“gate 有净价值”“人工介入更少”等核心结论。

## 3. 数据分层

| 层 | 数据 | 路径 | 是否长期事实源 |
|---|---|---|---|
| 产品/设计事实 | PRD、tech plan、ADR、implementation doc、test report | `.work_products/**` | 是 |
| 可运行 benchmark 源资产 | runner、scenario、prompt、report page、report data | `examples/delivery-benchmark/**` | 是 |
| 临时运行证据 | run dir、observer logs、quality probe output、summary | `.artifacts/delivery-benchmark/**` | 否 |
| package public API | npm CLI、package assets、validators | `packages/sdlc-harness/**` | 是，但 benchmark runner 不属于 public CLI |

## 4. Run 类型

### 4.1 Cold Run

Cold run 测量“新项目第一次引入 Harness 并完成第一个交付”的端到端成本。

计入：

- `prepare --mode harness` 调用 package CLI 预装 warm Harness scaffold；measured prompt 不再运行 `npx sdlc-harness init`
- managed assets materialization
- 初始事实源创建
- 初始产品交付
- task implementation / completion ledger commit

能说明：

- 新项目 adoption 的真实成本。
- 第一次使用 Harness 的完整开销。

不能说明：

- 已经接入 Harness 的项目后续任务是否更高效。

### 4.2 Warm Run

Warm run 先完成 Harness init / managed assets / baseline scaffold 并提交，再开始 delivery observer。

计入：

- 当前 scenario 的产品交付。
- scenario 相关 PRD/UX/architecture/tech plan 更新。
- 当前 task gate、RFC/debug、recovery 和 handoff 成本。

不计入：

- 已提交的 Harness runtime bootstrap；`prepare --mode harness` 在 observer 启动前创建并提交该 scaffold。
- package source sync/check、workspace full regression、consumer lab，除非 scenario 明确修改 package source。

能说明：

- 已经采用 Harness 的项目，后续复杂任务是否有生命周期效率收益。

## 5. 指标模型

### 5.1 Product Quality

| 字段 | 数据源 | 置信度 | 结论资格 |
|---|---|---|---|
| `hidden_quality_probe.passed/total` | `quality-probe` | high | yes |
| `static_rubric.passed/total` | keyword/path rubric | low | no |

因果逻辑：

```txt
hidden probe 未暴露给 measured agent
-> probe 运行真实 API/CLI/UI smoke/RFC/debug 行为
-> 两条路径通过同一 probe
-> 可以认为二者达到同一产品完成度
-> elapsed comparison 才成立
```

边界：

- Hidden probe 证明达标，不证明实现更优雅、文档更详细或长期维护性更强。
- Static rubric 只检查存在性和浅层证据，不能作为高置信语义证明。

### 5.2 Delivery Cost

| 字段 | 数据源 | 置信度 | 结论资格 |
|---|---|---|---|
| `observed_total_delivery_minutes` | external observer | high | yes |
| `stage_minutes` | system timer + manual boundary | medium | diagnostic |
| `agent_recorded_minutes` | manual `record --minutes` | low | no |

因果逻辑：

```txt
observer 在 prompt 外启动
-> measured agent 不需要为了计时改变行为
-> run dir elapsed time 可比
-> 同等 hidden quality 下 elapsed 差异代表交付成本差异
```

边界：

- Observer 只说明耗时和文件活动，不解释意图。
- Stage timer 的开始/结束由 operator 标注，只能用于拆解成本，不单独支撑核心效率结论。

### 5.3 Artifact Inventory

| 字段 | 数据源 | 置信度 | 结论资格 |
|---|---|---|---|
| `artifact_inventory.categories.managed_runtime.files/lines` | filesystem scan | high | diagnostic |
| `artifact_inventory.categories.project_facts.files/lines` | filesystem scan | high | diagnostic |
| `artifact_inventory.categories.product_source_tests.files/lines` | filesystem scan | high | diagnostic |
| `artifact_inventory.categories.product_docs.files/lines` | filesystem scan | high | diagnostic |
| `artifact_type_coverage` | filesystem scan + known paths | high | diagnostic |

因果逻辑：

```txt
artifact inventory 区分 runtime / facts / product source
-> 可以解释 Harness 多出来的产物是什么
-> 再结合 recovery/RFC/debug 表现
-> 才能判断这些产物是否有用
```

边界：

- 行数和文件数不证明价值。
- `.codex/**`、`tools/**` 是 managed runtime bootstrap，不应当成每个 scenario 的交付内容。

### 5.4 Context Utility

| 字段 | 数据源 | 置信度 | 结论资格 |
|---|---|---|---|
| `recovery_task_elapsed_minutes` | observer or timer | high/medium | depends on source |
| `recovery_answer_key_score` | hidden answer key + file refs | medium | no |
| `wrong_path_count` | operator scoring | medium/low | no until automated |

因果逻辑：

```txt
Harness 产生事实源和实现文档
-> fresh agent 只看 repo 不看 chat
-> 如果能更快、更准完成 takeover task
-> 说明事实源降低了上下文恢复成本
```

边界：

- 写 takeover memo 仍偏主观。
- 更强方案是让 fresh agent 执行隐藏小任务，再用 hidden probe 验证结果。

### 5.5 Automation Burden

| 字段 | 数据源 | 置信度 | 结论资格 |
|---|---|---|---|
| `intervention_count` | operator record | medium | no |
| `operator_prompt_chars` | saved prompt file stats | high for length, medium for semantics | conditional |
| `prompt_ledger` | `.benchmark/prompts.ndjson` runner prompt fingerprints | high for saved prompt chars/hash | diagnostic until protocol completeness is proven |
| `repair_loop_count` | protocol event count | medium | no until automatic |

因果逻辑：

```txt
同质量结果需要更少协议外提示和返工
-> 人类监督负担降低
-> 复杂任务自动化推进能力提升
```

边界：

- 初始 prompt 和 staged injection 是 benchmark 协议，不算 intervention。
- 只有协议外 correction、rework、clarification、nudge、safety_stop 才计入。
- `prepare` 自动记录初始 prompt；`stage-prompt --run-dir` 记录分段注入 prompt；`intervention-record` 同步记录 operator prompt 指纹。该 ledger 能高置信说明已保存 prompt 的字数和 hash，不能单独证明没有未记录的人为提示。

### 5.6 Gate Value

| 字段 | 数据源 | 置信度 | 结论资格 |
|---|---|---|---|
| `first_pass_hidden_quality` | hidden quality probe before repair | high | yes |
| `gate_findings` | operator record | medium | diagnostic |
| `escaped_defect_count` | hidden probe / later stage failure | high if probe-based | yes |
| `repair_loop_count` | protocol event count | medium | diagnostic |

因果逻辑：

```txt
gate 运行前存在 first-pass defect
-> gate 捕获 defect 或减少 escaped defect
-> 修复后 hidden probe 通过
-> repair loop / operator prompts 少于 baseline
-> gate 有净价值
```

边界：

- “gate 抓到格式问题”只能证明交接结构更完整，不自动证明产品质量收益。
- Gate value 是可证伪假设；若没有减少缺陷、返工、人工纠偏或高风险 escaped defect，应打薄、延后或条件触发。

### 5.7 Provider Safety

`webhook-provider-bridge` uses a stronger hidden behavior probe than static
README checks. The visible scenario contract requires
`src/webhookBridge.js#createWebhookBridge()` so the hidden probe can exercise the
receiver without live credentials.

| 字段 | 数据源 | 置信度 | 结论资格 |
|---|---|---|---|
| `valid_hmac_acceptance` | hidden probe computes HMAC independently | high | yes |
| `invalid_signature_rejection` | hidden probe request | high | yes |
| `stale_timestamp_rejection` | hidden probe request | high | yes |
| `replay_idempotency` | hidden probe request/status | high | yes |
| `bounded_retry_dlq` | hidden probe delivery simulation | high | yes |
| `mock_live_boundary` | hidden probe + README/docs | high for behavior, medium for docs semantics | conditional |
| `secret_rotation_v2` | final-stage hidden probe | high | yes |

因果逻辑：

```txt
hidden probe 独立计算签名并打 receiver
-> 证明实现不是只在 README 声明安全边界
-> 如果 Harness 在高风险边界更少 unsafe path / repair loop
-> 可以支持 complexity/safety route 的设计目的证明
```

边界：

- hidden probe 不使用 live credentials，不证明真实 provider 集成成功。
- 它证明本地 mock/live 分层、签名、timestamp、replay、rotation 和 DLQ 行为符合 contract。

## 6. Scoring Flow

```txt
prepare
-> measured-agent environment preflight
-> write initial prompt only
-> initialize independent run git repo
-> operator observe-start
-> measured agent runs initial delivery
-> measured agent creates mode-appropriate delivery commit/push
-> operator stage-prompt recovery/rfc/debug at measured boundaries
-> operator quality-probe
-> operator recovery-score / intervention-record / gate-record as applicable
-> score merges observer, events, probe, rubric and diagnostics
-> evidence-check compares baseline/Harness JSON summaries
-> report displays conclusion-grade vs diagnostic evidence
```

### 6.1 Measured-Agent Environment Preflight

正式 Harness run 必须先确认被测 agent 的执行环境可以写入准备好的 run directory。这个 preflight 不计入 delivery observer 时间，因为它验证的是测量边界，不是产品交付。

必须成立：

- configured Harness root 可写，默认是 `.codex/**`；
- run-dir `.git/index.lock` 可创建，task implementation / completion ledger commit 和 local `origin` push 可完成；
- `.work_products/**`、`tools/**`、`AGENTS.md`、`Makefile` 与产品源码都写在 run dir 内；
- agent 不会因为 sandbox 阻断 dot path 而改用 `codex/**` 之类 fallback root。

因果逻辑：

```txt
被测环境允许 Harness root + run-dir git 闭环
-> Harness 可以按正式协议完成 task / commit / push
-> observer elapsed 才是在测 Harness 工作流成本
```

如果 `.codex/**` 或 `.git/index.lock` 被 sandbox 阻断，即使 hidden quality probe 通过，也只能说明产品实现达标，不能说明正式 Harness 路径达标。该 attempt 必须进入 calibration ledger，修正执行环境后 fresh rerun。

### 6.2 Clean Committed Handoff Boundary

`RECOVERY`、`RFC` 和 `DEBUG` 必须从 clean committed product state 开始。这个规则不是为了给 baseline 加 Harness 流程，而是为了让两条路径都从稳定交付物进入 fresh-agent 接手。

- Baseline: `INITIAL_DELIVERY`、`RFC` 和 `DEBUG` 这类 mutating stage 完成后创建一个普通 product delivery commit，并 push `main` 到 run directory 的本地 `origin`；不得提交 `.benchmark/**`，不得运行 Harness validators、lifecycle 或 plan。
- Harness: mutating stage 完成后使用正常 task implementation commit 和 completion ledger commit/push；初始阶段不得越界进入 `REVIEWING`、`TESTING`、`RELEASING`。
- 两条路径进入后续 staged prompt 或 final scoring 前，product source/docs/tests 应处于 clean committed state。

因果逻辑：

```txt
clean committed delivery
-> fresh agent reads stable repository state instead of temporary worktree draft
-> recovery/RFC/debug score can represent context handoff and lifecycle continuity
```

如果 baseline 不提交，recovery memo 可能通过读取 dirty worktree 得高分；这只能说明 agent 会读当前文件，不能证明可交接上下文。该 attempt 必须标为 calibration。

## 7. Report Decision Tree

```txt
hidden quality differs
  -> no efficiency conclusion

hidden quality same + warm elapsed lower
  -> direct lifecycle efficiency evidence for Harness

hidden quality same + warm elapsed higher
  -> inspect recovery/RFC/debug/gate/automation diagnostics

diagnostics recover cost with adequate confidence
  -> Harness may have complexity-specific net value

diagnostics do not recover cost
  -> workflow/gate/artifact thinning input
```

`evidence-check` is the mechanical guardrail for this decision tree. It reads
the two summary JSON files and verifies same `scenario_id`, expected
`baseline` / `harness` modes, operator-supplied `protocol_status: formal`, same
hidden quality probe PASS, observer-measured elapsed time on both paths, the
same non-`unknown` cold/warm run boundary, and artifact inventory availability
for diagnostic output-volume analysis.

It can allow a direct elapsed-time conclusion, but it cannot prove context
recovery, automation burden, gate value or high-risk safety unless those metrics
also become high-confidence and conclusion-eligible.

## 8. Implementation Boundaries

- `examples/delivery-benchmark/runner/delivery_benchmark.mjs` remains repo-local.
- `examples/delivery-benchmark/results/index.html` remains static, framework-free and report-only.
- `examples/delivery-benchmark/results/benchmark-data.js` is report-internal data, not public API.
- `.artifacts/delivery-benchmark/**` stores raw calibration/formal run output and is not committed.
- `packages/sdlc-harness/**` should not expose benchmark runner commands unless a future PRD/RFC promotes them.

## 9. Verification Plan

- Static tests verify scenario files, staged prompt leakage boundaries, confidence labels and report data.
- Runner tests verify observer, timer, hidden quality probe, recovery score, intervention and gate finding aggregation.
- Manual report checks verify Chinese/English report clarity and no overclaiming.
- Formal run acceptance requires clean independent baseline/Harness runs, same hidden quality probe, same model/config, same scenario and no invalidation triggers.
