# ADR 008: Delivery Benchmark Scenario Design

Status: Accepted

## Context

AI SDLC Harness 的设计目标不是让首轮代码生成更快，而是在复杂项目中提高同等质量交付（same-quality delivery）效率：减少遗漏、返工、上下文漂移、需求变更漏改和交接恢复成本。

早期 `expense-policy-engine` 样本显示，Harness 可以达到同等质量，但历史记录成本明显更高，且成本数据置信度低。这不能直接证明 Harness 更高效，也不能证明它无效。更合理的问题是：当项目复杂度上升、需要多轮 RFC、debug 修复和新对话恢复时，Harness 沉淀的 PRD、UX、architecture、tech plan、implementation doc、review/test/release evidence 是否能减少后续理解和返工成本。

另一个目标函数是复杂任务可持续自动化交付能力：同等质量下，是否需要更少 operator 纠偏、更少额外提示词、更少 repair loop 和更少安全阻止。这个指标比单纯耗时更贴近“复杂任务能否长时间自动推进”的价值。

纯 vibe coding 在首轮实现中通常更敏捷，因为它直接面向代码和测试，不需要显性化阶段产物。Harness 的优势如果存在，更可能出现在生命周期后段：新 Agent 重新接手、需求变化影响多层、bug 修复依赖历史上下文、外部 provider / credential 边界存在安全风险。

## Options

- 只测首轮从需求到代码的完成时间。
- 只测最终质量分，不区分完成路径和生命周期成本。
- 选择覆盖恢复、RFC、debug 和高风险边界的 lifecycle benchmark，用同等质量交付作为比较基线。

## Decision

Delivery Benchmark 采用同等质量交付基线，不以首轮代码生成速度作为核心结论。每个 scenario 都必须能回答一个和 Harness 设计目标对应的问题：

- 是否能在同等质量下完成交付。
- 是否能在新对话或 fresh agent 接手时快速恢复当前状态、历史变更、测试入口和下一步安全动作。
- 是否能在 RFC cascade 中减少漏改、partial fix 和跨层漂移。
- 是否能在 debug 修复中保留最新上下文，避免重走错误路径。
- 是否能在 provider/live/credential 等高风险边界中减少 unsafe retry、secret guessing 和证据混淆。
- 是否能用更少人工介入、额外提示词和 repair loop 完成同质量交付。

Delivery Benchmark 是本仓库的正式 benchmark 模块，而不是临时 demo。它的可运行实现位于 `examples/delivery-benchmark/**`；产品目的、指标因果逻辑和实现事实分别记录在 `.work_products/01_product/delivery_benchmark_evidence_model.md`、`.work_products/03_tech_plan/delivery_benchmark_evidence_model.md` 和 `.work_products/04_implementation/delivery_benchmark/evidence_model_and_runner.md`；raw run 输出继续留在 `.artifacts/delivery-benchmark/**`。

当前 pending lifecycle scenarios 保留不同主证明方向：

- `project-context-recovery-lab`: 主测上下文连续性和 fresh-agent recovery。
- `support-triage-board`: 主测跨 UI/API/policy/test/docs 的 RFC/debug 效率。
- `webhook-provider-bridge`: 主测 provider/live 边界、安全约束和 do-not-retry 行为。

每个 lifecycle scenario 都采用 `INITIAL_DELIVERY`、`RECOVERY`、`RFC`、`DEBUG` 阶段指标，并记录 `context_recovery_score`、`wrong_path_count` 和最终质量分。外部 observer 只负责总耗时和文件活动可信度；语义阶段、wrong-path 和质量判断仍来自 lifecycle probe、rubric、diff、docs 和 operator scoring。

Benchmark 必须把每个指标的置信度分开表达。外部 observer 总耗时可以是 high confidence；系统计时 + 人工边界、operator intervention 和隐藏 answer key recovery scoring 通常是 medium；历史 agent-recorded estimate、自报 notes 和纯 static keyword/path rubric 只能算 low 或 supplemental。一个页面上的“质量分通过”不能默认等同于高置信语义证明。

正式结论还必须区分 conclusion-grade 和 diagnostic metrics。只有 high confidence 指标可以支撑核心结论；medium、low、mixed 或 unavailable 指标只能作为诊断线索。当前 support gate-value pilot 的高置信结论级证据是：两条路径都通过 hidden quality probe `12/12 PASS`，但 observer 总耗时为 Baseline `26.9158 min`、Harness `48.4984 min`。这可以支持“该场景同等 hidden quality 下 Harness 更慢”的结论；不能支持“gate 已证明净价值”“人工介入更少”或“上下文恢复优势已成立”。

每个 lifecycle scenario 也要带 `gate_profile.md`。Gate profile 区分 orientation、domain focused gates、Harness task gates、phase exit gates 和 out-of-scope gates，尤其要标出 out-of-scope package regression。这样可以保持同等质量门槛，同时避免每个 fresh agent session 一开始就运行与当前 scenario 无关的 full Harness/package validation，制造错误的成本信号。

正式 lifecycle benchmark 必须使用 staged injection。`prepare` 生成的初始 prompt 只暴露 base requirements、acceptance criteria 和 gate profile；fresh-agent recovery、RFC cascade、debug fix 和 lifecycle scoring notes 只能在对应测量阶段由 operator 通过 `stage-prompt` 注入。后续 probe 或 debug 答案不能提前暴露给被测 agent，否则它可能在初始实现时按未来题目铺路，结果只能算 protocol calibration，不能进入公开效率结论。

`INITIAL_DELIVERY` 也是硬阶段边界。Harness 路径可以在这个阶段产出 PRD、UX、architecture、tech plan、implementation doc、runbook、开发 gate 证据和必要的 task implementation / completion ledger commits，但它只能做到 review-ready、testing-ready 和 handoff-ready；不能继续进入 `REVIEWING`、`TESTING`、`RELEASING`、review report、test report 或 release readiness。若 measured agent 在初始阶段越界，说明阶段注入或 prompt 边界不干净，该路径只能作为 calibration evidence，必须 fresh rerun 后才能进入正式结果。

正式 pilot 的 run directory 也必须是独立 git repo，并带有本地 bare `origin`。Harness 的 task implementation commit、task completion ledger commit 和 push gate 应落在该 run dir 内；如果它意外落到 source repository，或因为 `.artifacts` ignore / 无 remote 导致提交闭环无法完成，测到的是运行协议问题，不是 Harness 生命周期效率。

正式 Harness pilot 还必须确认 measured-agent sandbox 支持 configured Harness root 和 run-dir git 写入。若 `.codex/**` 创建被阻断、`.git/index.lock` 无法写入，或 agent 因此 fallback 到 `codex/**` 之类非配置 root，即使 hidden quality probe 通过，也只能说明产品实现达标，不能说明 Harness 协议达标；该 run 必须进入 calibration ledger 后 fresh rerun。

正式 lifecycle pilot 还必须从 clean committed handoff boundary 进入后续阶段。Baseline 在 `INITIAL_DELIVERY`、`RFC` 和 `DEBUG` 这类 mutating stage 后必须创建一个普通 product delivery commit 并 push 到 run directory 的本地 `origin`；Harness 使用自身 task implementation / completion ledger commit 和 push。这个要求不是把 baseline workflow 化，而是保证 fresh recovery、RFC、debug 和 final scoring 看到的是稳定交付物，而不是 dirty worktree 草稿。若任一路径带着未提交 product source/docs/tests 进入 `RECOVERY`、`RFC`、`DEBUG` 或 final scoring，该 run 只能作为 calibration。

质量检测和上下文恢复评分也必须防止泄题。Static rubric 保留为补充证据，但后续正式 pilot 应优先使用 scenario-owned hidden quality probe 验证可运行行为、RFC 后行为和 debug regression。Fresh-agent recovery 应使用自然 takeover memo，再用隐藏 `recovery_answer_key.json` 和文件引用要求评分；可见 prompt 不应列出完整答案或评分 key。

人工介入和 gate 价值也必须由 operator-side 记录，不让被测 agent 感知。`intervention-record` 只统计协议之外的额外提示：nudge、clarification、correction、rework 和 safety_stop；初始 prompt 与 staged injection 不计入。`gate-record` 记录 gate 是否抓到 defect、属于 product 还是 workflow gate、缺陷是否原本会逃逸。Gate 是可证伪成本假设：如果不能减少漏项、返工、人工纠偏或 escaped defect，就不应在 benchmark 结论里被天然视为必要成本。

同理，observer/timer/gate-value 记录由 operator 在被测 prompt 外完成。被测 agent 可以在普通交接文档里说明自己跑了哪些 gate 和结果，但不应被要求维护 benchmark 计时或 gate-value 日志，以免为了测量改变执行策略。

下一轮 gate-value pilot 选择 `support-triage-board`，因为它最容易暴露 API/UI/policy/test/docs 跨层漏改。正式流程应先做 first-pass score，不立刻人工修；如果失败，只注入失败 checklist，记录 intervention 和 repair loop，再比较 Harness 是否真的减少 partial fix 与额外提示词。Benchmark 负责提供 gate 成本/收益证据；通用 gate 厚度的采纳和设计原因由 ADR 001 记录。

support gate-value pilot 的负向耗时结果已经足够触发 gate 打薄评估。评估文档逐类列出 orientation、product/domain、workflow state、handoff/recovery、phase/release、package/source/full regression gate 的目的、收益证据、成本、打薄收益和风险/损失；通用 workflow 是否采纳打薄结论由 [ADR 001](ADR_001_stage_contracts_and_gates.md) 记录，不能在 benchmark 私有规则里悄悄降低同等质量门槛。

当前 gate 打薄结论是 `Standard Thin` 性价比最高，并已晋升为通用 Harness gate 厚度：内部循环保留 focused product gates 和轻量状态检查，把 workflow strict gates 集中到 task completion、pre-commit、phase transition、release 和 package/source 变更边界；高风险 provider/live、长周期多人交接和发布仍使用 strict gate。这比保持厚 gate 更能回应同质量下 `1.8x` 负向耗时信号，又比全砍 gate 更能保留产品质量、阶段边界、长期上下文和 package/release 安全。

Pilot 的失败、重跑和校准经验也属于事实源。每次正式尝试都应保留 compact calibration ledger，记录哪些 attempt 因阶段越界、future material 泄露、operator artifact 污染 git surface、observer/timer 中断、基础设施不稳定或评分口径冲突而被降级为 calibration。这样 benchmark 迭代可以复用经验，而不是在下次 run 中重新踩同样的 protocol 坑。

Scenario 可以也应该是 high-signal：它们要对准 Harness 的设计目标，让上下文恢复、RFC/debug 返工控制、跨层一致性和高风险边界这些优势有被观察到的空间。这不是 hack 结果。正式 benchmark 必须允许 Harness 更慢、没有优势、或只在特定复杂度阈值后有优势；不能通过复用前序实现上下文、复制另一条路径成品、预先完成 RFC/debug、降低 baseline 质量标准或选择性发布有利数字来制造结论。

## Rationale

这组 benchmark 与 Harness 工作流设计一一对应：

- 阶段契约和 gate 的价值，应体现在 RFC/debug 后仍能维持同等质量，而不是只看首轮产码速度。
- `.work_products/**` 事实源、implementation doc、review/test/release evidence 的价值，应体现在 fresh-agent recovery 更快、更准确。
- RFC workflow 的价值，应体现在复杂变更后更少漏改和 partial fix。
- runbook、evidence boundary 和 do-not-retry 约束的价值，应体现在高风险 provider/live 场景中更少危险路径。
- Gate 的价值，应体现为更少 first-pass 漏项、更少 operator correction、更少 repair loop 或更少 escaped defect，而不是仅仅“运行过更多校验”。

因此，benchmark 故意不选择只适合一次性实现的小 demo。场景应保持中高复杂度：足够触发上下文恢复、跨层变更和 debug 返工，但不能大到无法在可控时间内重复运行。

## Consequences

- 单个历史样本不能证明 Harness 更快或更高效；报告必须保守表达证据边界。
- 新结果必须同时包含 `baseline` 和 `harness`，并达到同一最终质量 rubric，才适合进入公开报告。
- 不干净的 pilot 只能作为 protocol calibration：可以用来验证 observer、timer、score、runbook 和报告链路，但数字不能作为效率证明发布。
- 若任一路径提前暴露 recovery/RFC/debug 后续材料，必须标为 calibration-only，因为它破坏了生命周期阶段边界。
- 若 Harness 无法在 run dir 内完成本地 commit/push 闭环，必须标为 calibration-only，因为运行目录隔离没有满足正式协议。
- 若 measured-agent sandbox 阻断 `.codex/**` 或 `.git/index.lock`，必须标为 calibration-only，因为测量到的是执行环境边界而不是 Harness 生命周期效率。
- 若任一路径在进入 recovery/RFC/debug 前仍有未提交 product source/docs/test changes，必须标为 calibration-only，因为 fresh agent 读到的是 dirty worktree 草稿，不是稳定交付上下文。
- 若 Harness 在首轮更慢但在 recovery、RFC、debug 或 wrong-path 上追回成本，这才支持“生命周期效率提升”的判断。
- 若复杂 lifecycle scenarios 仍无法追回成本，应回到工作流设计本身，判断是项目复杂度不足、阶段产物过重、gate 成本过高，还是 Harness 目标假设不成立。
- 若某项结果只来自 static keyword/path rubric 或 operator-recorded checkpoint，报告必须标明其置信度，不得把它包装成隐藏黑盒质量证明。
- 若 automation burden 或 gate value 未显式记录，报告必须显示 unavailable；不能把缺失数据解读为人工介入少或 gate 有价值。
- 若 support gate-value pilot 无法证明 gate 净价值，应把结论作为 workflow 迭代输入，而不是选择性隐藏负向数据。
- 若同等 hidden quality 下 observer 总耗时显示普通/中等复杂度任务存在显著负向期望，应优先分析 gate/workflow 厚度，而不是只继续挑选更有利的复杂场景来恢复叙事。
- 若 pilot 暴露的主要成本来自无效 task contract 往返、validator 证据格式试错、重复 overview 刷新或内部循环跑了过宽 gate，应优先优化这些 workflow friction。优化方向必须保留阶段事实源、clean handoff、同质量 gate 和高风险边界安全，不应为了让 benchmark 变快而删除能降低遗漏和返工的核心设计。
- Gate 打薄分析必须同时记录收益与损失：降低普通任务耗时、减少 RFC 阶段阻塞和降低开场验证成本，可能换来 plan/task 漂移、handoff 变弱、阶段边界变模糊、release/package 风险上升和长期上下文沉淀变少。
- 每次 pilot 的 calibration ledger 应记录 publishable / calibration / blocker 的判定理由；同一个协议问题重复出现时，应先修 runbook、prompt 或 runner，再继续烧正式测量成本。
- 暂停或中断中的 pilot 也要记录 compact snapshot：保存 artifact path、已完成阶段、当前 dirty state、可用高置信证据、不能发布的结论和下一步恢复选项。这样 benchmark 经验进入事实源，而不是只留在聊天上下文里。
- Benchmark scenario 选择本身属于 Harness authoring evidence，不是 npm package public API。
- Gate 成本必须和产品实现时间分开解释。报告应区分 product verification gates 与 workflow-control gates；除非 package source 或 managed assets 发生变化，否则不应把 package source sync/check、workspace full regression 或 consumer-lab validation 算进 scenario delivery cost。

## Source Trace

- `PROJECT_SPEC.md#一最终目的`: 效率定义为复杂项目中的阶段目标、交付物、上下文衔接、需求变更和交付约束效率。
- `PROJECT_SPEC.md#2.1`: 单纯 Vibe Coding 适合单阶段生成，但不适合作为复杂项目完整控制机制。
- `PROJECT_SPEC.md#2.2`: 阶段产物和事实源用于降低切换成本与理解成本。
- `PROJECT_SPEC.md#3.2`: 阶段契约化、产物仓库化、变更补丁化和实现文档增量化。
- `.work_products/01_product/delivery_benchmark_evidence_model.md`: Benchmark 产品目的、用户场景、指标目标和结论规则。
- `.work_products/03_tech_plan/delivery_benchmark_evidence_model.md`: 指标因果关系、cold/warm run、数据分层和 report decision tree。
- `.work_products/04_implementation/delivery_benchmark/evidence_model_and_runner.md`: 当前 runner、scenario、report 和 evidence model 实现事实。
- `examples/delivery-benchmark/README.md`: Delivery Benchmark scenarios, lifecycle efficiency probe, automation burden, gate value and result policy.
- `examples/delivery-benchmark/RUNBOOK.md`: 首个 `project-context-recovery-lab` pilot 的 operator protocol。

## Links

- [PROJECT_SPEC.md](../../PROJECT_SPEC.md)
- [Delivery Benchmark README](../../examples/delivery-benchmark/README.md)
- [Delivery Benchmark Runbook](../../examples/delivery-benchmark/RUNBOOK.md)
- [ADR 001: Stage Contracts and Gates](ADR_001_stage_contracts_and_gates.md)
- [ADR 002: Fact Sources, Memory and Overviews](ADR_002_fact_sources_memory_and_overviews.md)
