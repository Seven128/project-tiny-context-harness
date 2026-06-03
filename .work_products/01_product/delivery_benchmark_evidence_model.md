# Delivery Benchmark Evidence Model PRD

## 1. 背景

- 来源（Source）：2026-06-02 Delivery Benchmark pilot 复盘、gate 打薄讨论和用户对指标因果关系的要求。
- 问题（Problem）：`examples/delivery-benchmark/` 已经成为本仓库验证 Harness 工作流设计目的的正式模块，但产品目的、指标因果逻辑和实现事实主要散落在 README、RUNBOOK、ADR 和报告页中，缺少 `.work_products/**` 中的产品级事实源。
- 用户（Users）：AI SDLC Harness 维护者、评估是否采用 Harness 的开源用户、需要判断 gate/产物是否过重的 workflow 设计者。

## 2. 产品定位

Delivery Benchmark 是 AI SDLC Harness 自举项目的证据模块。它不是普通 demo，也不是 npm package public API；它用可复现的项目场景、外部测量、隐藏质量 probe 和 staged lifecycle protocol，验证 Harness 是否达到设计目标。

核心决策问题：

> 在复杂项目生命周期开发中，AI SDLC Harness 是否能以可接受的流程成本，提升同等质量交付效率、上下文连续性、自动化推进能力和高风险边界可靠性？

这个产品必须允许三类结果：

- Harness 值得使用：在同等质量下，总生命周期成本更低，或在高风险场景显著减少错误路径。
- Harness 需要打薄：同等质量下成本显著更高，且 recovery、RFC/debug 或 gate value 没有追回成本。
- Harness 有适用边界：只在长期、复杂、多轮变更、高风险 provider/live 或多人交接场景中有净价值。

## 3. 目标

- 用同一 scenario 的 `baseline` 和 `harness` 两条路径，比较同等质量交付，而不是首轮产码速度。
- 将指标按置信度区分为 conclusion-grade 和 diagnostic，避免把低置信或 operator-recorded 数据包装成核心结论。
- 将 cold bootstrap cost 与 warm delivery cost 分开；`harness` warm run 由 `prepare` 预装并提交 Harness scaffold，避免把 `npx sdlc-harness init` 的一次性安装成本误算为每次任务交付成本。
- 说明 Harness 多出来的 PRD、UX、architecture、tech plan、implementation doc、runbook、review/test/release evidence 是否能转化为 recovery、RFC/debug、gate value 或 automation burden 收益。
- 让可视化报告面向开源用户可读，让 `.work_products/**` 面向维护者提供长期设计事实源。

## 4. 非目标

- 不证明 Harness 一定比 plain AI coding 更快。
- 不把 benchmark runner 做成 `sdlc-harness` npm package public CLI。
- 不提交 `.artifacts/delivery-benchmark/**` raw run dirs、observer logs 或临时项目。
- 不通过降低 baseline 质量标准、预先暴露 RFC/debug 材料、复制另一条路径产物或选择性发布有利数字来制造结论。
- 不把 `.codex/**`、`tools/**` managed runtime 文件行数当成项目交付产物量。

## 5. 用户场景

| 场景 | 用户 | 触发条件 | 预期结果 |
|---|---|---|---|
| 判断 Harness 是否值得用于复杂项目 | 开源用户 | 查看 visual report | 先看到同等质量、耗时、置信度和适用边界，而不是营销式结论 |
| 评估 gate 是否过重 | Harness 维护者 | pilot 显示同质量下 Harness 更慢 | 报告能拆出 gate、bootstrap、artifact、product delivery 和 recovery/RFC/debug 成本 |
| 验证上下文沉淀是否有用 | Workflow 设计者 | fresh agent recovery / RFC / debug 阶段执行 | 能看到新 agent 是否更快、更准、错误路径更少，而不是只看到文档更多 |
| 复盘不干净 pilot | Benchmark operator | 跑到泄题、阶段越界、observer 中断或污染 git surface | 结果标记为 calibration，不进入公开效率结论 |
| 解释产物差异 | 开源用户或维护者 | Harness 产物量明显大于 baseline | 报告区分 managed runtime、project facts、product source/tests/docs 和 raw artifacts |

## 6. 功能需求

| ID | 需求 | 优先级 | 说明 |
|---|---|---|---|
| PRD-BENCH-001 | 支持 `baseline` 与 `harness` 同 scenario 对照 | P0 | 两条路径共享产品 requirements、acceptance criteria 和 final quality bar |
| PRD-BENCH-002 | 支持 staged injection | P0 | 初始 prompt 只包含 base delivery；recovery、RFC、debug 后续材料按阶段注入 |
| PRD-BENCH-003 | 支持 external observer elapsed measurement | P0 | 被测 agent 不感知 observer；总耗时和文件活动为高置信成本数据 |
| PRD-BENCH-004 | 支持 hidden quality probe | P0 | 产品质量核心结论优先来自隐藏黑盒行为 probe |
| PRD-BENCH-005 | 支持 recovery hidden answer key scoring | P1 | recovery memo 使用隐藏 key 和文件引用评分，默认 medium confidence |
| PRD-BENCH-006 | 支持 automation burden 记录 | P1 | 只记录协议外 operator 纠偏、解释、返工和 safety stop |
| PRD-BENCH-007 | 支持 gate value 记录 | P1 | gate 必须证明是否抓到 defect、是否减少 repair loop 或 escaped defect |
| PRD-BENCH-008 | 支持 cold / warm run 分类 | P0 | cold run 包含 Harness adoption；warm run 排除已提交的 bootstrap 成本；`prepare --mode harness` 预装 warm scaffold |
| PRD-BENCH-009 | 支持 artifact inventory | P1 | 报告区分 managed runtime、project facts、product source/tests/docs 和 raw artifacts |
| PRD-BENCH-010 | 支持 metric confidence / conclusion eligibility | P0 | 只有 high-confidence 指标能进入核心结论 |
| PRD-BENCH-011 | 支持 calibration invalidation | P0 | 泄题、复用上下文、阶段越界、run-dir git 隔离失败等必须降级 |
| PRD-BENCH-012 | 可视化报告支持中英切换 | P2 | 面向开源用户解释 benchmark 价值和证据边界 |
| PRD-BENCH-013 | 支持 publishable evidence check | P0 | 发布公开结果前，必须机械检查 same scenario、expected modes、formal protocol、same hidden quality、observer elapsed、cold/warm boundary 和 artifact inventory |
| PRD-BENCH-014 | 支持 measured-agent environment preflight | P0 | 正式 Harness run 必须确认被测环境可写配置的 Harness root 和 run-dir `.git`；`.codex` / `.git/index.lock` 被 sandbox 阻断时只能算 calibration |
| PRD-BENCH-015 | 支持 clean committed handoff boundary | P0 | `RECOVERY`、`RFC`、`DEBUG` 前两条路径都必须从 clean committed product state 进入；baseline 使用一个普通产品交付 commit/push，Harness 使用 task implementation / completion ledger commit/push |
| PRD-BENCH-016 | 拒绝 warm bootstrap 泄漏 | P0 | 如果 `--run-type warm` 但 observer 看到 Harness scaffold 在计时窗口内新增，`evidence-check` 不允许该耗时比较进入正式结论 |

## 7. 核心指标与因果目标

| 目标 | 指标 | 因果逻辑 |
|---|---|---|
| 证明同等产品完成度 | hidden quality probe pass rate | 只有两条路径都通过同一隐藏行为 probe，耗时比较才有意义 |
| 比较真实交付成本 | observer elapsed time；stage timer | 外部计时不改变 agent 行为，能回答同质量下哪条路径更耗时 |
| 解释一次性安装成本 | bootstrap/adoption cost | Harness `init` 复制 managed assets 是 adoption cost，不应默认摊入每次 warm delivery |
| 解释产物差异 | artifact inventory、project facts lines、source/test/doc lines | 产物多只能说明上下文资产更多，不能单独证明有用 |
| 验证上下文资产是否有用 | recovery task elapsed、recovery pass rate、wrong-path count | 如果事实源有用，新 agent 应更快、更准地接手并少走错路 |
| 验证自动化推进能力 | operator intervention count、operator prompt chars、prompt ledger、repair loop count | 同质量下更少额外提示和返工，才能说明复杂任务更能自动推进 |
| 验证 gate 净价值 | first-pass hidden probe、gate findings、escaped defects、repair loops | gate 只有减少真实缺陷、返工或人工纠偏，才是必要成本 |
| 验证高风险 provider 安全边界 | webhook hidden safety probe、unsafe credential/retry/replay rejection | 如果 Harness 的上下文和 gate 有价值，应在 provider/live 边界减少猜 secret、unsafe retry、mock/live 证据混淆和 replay/timestamp 漏洞 |

## 8. 结论规则

- 如果 hidden quality 不同，不能比较效率，只能比较质量差距。
- 如果 hidden quality 相同且 warm elapsed 更低，可以支持 Harness 有直接效率优势。
- 如果 hidden quality 相同但 warm elapsed 更高，必须看 recovery、RFC/debug、automation burden 或 high-risk safety 是否追回成本。
- 如果没有追回成本，结果应进入 workflow/gate/artifact 打薄分析。
- 如果优势只在高复杂度或高风险场景出现，报告必须标明适用边界。
- 如果 gate value、automation burden 或 context recovery 不是 high confidence，不能用来支撑核心效率结论。
- 如果 Harness measured-agent 环境不能创建 `.codex/**`、写 `.git/index.lock` 或完成 run-dir commit/push 闭环，即使 hidden quality 通过，也只能说明产品 probe 可用，不能作为正式 Harness 效率结论。
- 如果 warm run 的 observer 记录到 `.codex/**`、`AGENTS.md`、`Makefile` 或 managed `tools/**` 在计时窗口内新增，说明 bootstrap 泄漏到 delivery elapsed；即使 hidden quality 相同，也只能作为 calibration/diagnostic。
- 如果 fresh recovery 接手的是未提交 product worktree，而不是 clean committed delivery，即使 recovery memo 得分高，也只能说明 agent 能读当前文件，不能证明稳定上下文交接能力。
- 公开结果更新前必须运行 `evidence-check` 或等价检查；如果检查结果是 `negative_elapsed_signal`，它是 workflow 迭代输入，不能被低置信诊断指标抵消。

## 9. 成功标准

- `.work_products/**` 有 benchmark 产品、技术和实现事实源，后续迭代不用依赖聊天上下文。
- `examples/delivery-benchmark/**` 继续作为可运行 benchmark 源资产。
- `.artifacts/delivery-benchmark/**` 继续只保存临时 raw runs，不进入长期事实源。
- 报告和 summary 能区分 conclusion-grade 指标与 diagnostic 指标。
- cold / warm run 成本可以分开解释。
- runbook 能明确标记 measured-agent sandbox / git blocker，把这类 attempt 降级为 calibration 而不是 formal result。
- baseline 和 Harness 的 fresh-agent recovery 都从 clean committed product state 开始，避免把 dirty worktree 临时状态误当成上下文资产收益。
