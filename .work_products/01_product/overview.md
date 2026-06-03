# .work_products/01_product overview

<!-- generated-by: AI SDLC Harness build_work_product_overviews.py -->
<!-- source-hash: 48a287d32d5795a0 -->

Generated artifact. Markdown slices remain the source of truth.

Source hash: `48a287d32d5795a0`

## Source Slices

1. [delivery_benchmark_evidence_model.md](delivery_benchmark_evidence_model.md)
2. [npm_package_distribution.md](npm_package_distribution.md)

---

## delivery_benchmark_evidence_model.md

Source: [delivery_benchmark_evidence_model.md](delivery_benchmark_evidence_model.md)

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

---

## npm_package_distribution.md

Source: [npm_package_distribution.md](npm_package_distribution.md)

# npm 包化分发与同步 PRD

## 1. 背景

- 来源（Source）：2026-05-23 用户关于 ProjectTemplate 可复用和升级方式的讨论。
- 问题（Problem）：当前 AI SDLC Harness 以仓库模板形式存在。业务项目如果复制或 fork 这套配置，会同时拥有项目状态、项目文档和 Harness 通用规则，导致新项目中途接入困难，已接入项目难以无痛升级。
- 用户（Users）：维护 AI SDLC Harness 的作者、希望在多个项目中接入该工作流的项目负责人、使用 Agent 执行阶段化工作的开发者。

## 2. 目标

- 提供一个 npm 包 `agent-project-sdlc`，作为 Harness 通用能力的 canonical source。
- 提供 CLI 命令 `sdlc-harness`，支持新项目初始化、已有项目接入、同步、升级和诊断。
- 通过 `sdlc-harness sync` 将 Agent 必须读取的规则、Skill、模板和策略 materialize 到项目配置的 `<harnessRoot>`。`init` 默认选择 `Codex -> .codex`，其它 Agent 使用对应内置目录；配置兜底和 `Other` 空输入默认 `.agent`。
- 通过 `sdlc-harness upgrade` 自动执行 schema migration 和 `sync`，降低已接入项目升级成本。
- 明确 managed files、local overrides 和 never overwrite 边界，保护项目自己的 `.work_products/**`、`<harnessRoot>/state/**` 和业务代码。

## 3. 用户场景（User Scenarios）

| 场景（Scenario） | 用户（User） | 触发条件（Trigger） | 预期结果（Expected Result） |
|---|---|---|---|
| 新项目接入 Harness | 项目负责人 | 在空项目或新业务项目中运行 `npx sdlc-harness init` | 生成最小 `AGENTS.md`、`<harnessRoot>/config.yaml`、`<harnessRoot>/state/**`、`.work_products/**` 和可被 Agent 读取的 Skill |
| 已有项目中途接入 | 项目负责人 | 在已有 README、src、tests 的仓库中运行 `npx sdlc-harness init --adopt` | 不覆盖业务代码，生成最小 Harness 入口，并通过 `doctor` 报告推荐阶段和缺失产物 |
| 同步 Agent 可读文件 | Harness 用户 | 运行 `npx sdlc-harness sync` | 将包内 canonical Skill、模板、策略、Makefile 接入片段 materialize 到 `<harnessRoot>/**`，同时保留 local overrides |
| 自定义阶段角色提示词 | Harness 用户 | 通用阶段 Skill 不能满足项目角色要求 | 在 `<harnessRoot>/pjsdlc_managed/override_skills/<skill_name>.md` 写追加提示词，运行 `sync` 后合成到最终 `SKILL.md` |
| 升级已接入项目 | Harness 用户 | 更新 npm 包后运行 `npx sdlc-harness upgrade` | 自动执行 migration 和 sync，不要求用户额外运行 `sync`，并输出升级报告 |
| 检查接入状态 | Harness 用户 | 运行 `npx sdlc-harness doctor` | 报告配置缺失、managed files 漂移、state/docs 风险和下一步修复建议 |

## 4. 功能需求（Functional Requirements）

| ID | 需求（Requirement） | 优先级（Priority） | 备注（Notes） |
|---|---|---|---|
| PRD-NPM-001 | npm 包名使用 `agent-project-sdlc`，CLI binary 使用 `sdlc-harness` | P0 | 避免使用过泛的 `harness` 命令名；包名发布前改为 unscoped package |
| PRD-NPM-002 | 提供 `init` 命令生成新项目最小 Harness 骨架 | P0 | 包括 agent-readable files 和项目状态初始文件 |
| PRD-NPM-003 | 提供 `init --adopt` 命令支持已有项目中途接入 | P0 | 不覆盖业务代码，优先诊断和最小接入 |
| PRD-NPM-004 | 提供 `sync` 命令，将包内 canonical source 同步到工作区固定路径 | P0 | 重点覆盖 `AGENTS.md` 管理区块、`<harnessRoot>/skills/pjsdlc_*/SKILL.md`、`<harnessRoot>/pjsdlc_managed/templates/**`、`<harnessRoot>/pjsdlc_managed/policies/**`、`<harnessRoot>/pjsdlc_managed/make/sdlc-harness.mk`；除 skills hard file index 外，工作流配置不再维护 legacy mirror |
| PRD-NPM-005 | 提供 `upgrade` 命令，且 `upgrade` 必须自动执行 `sync` | P0 | 用户不需要在升级后再手动运行一次 `sync` |
| PRD-NPM-006 | 提供 `<harnessRoot>/config.yaml` 记录 package version、schema version、managed files、local overrides 和 never overwrite | P0 | 作为 sync/upgrade 的机器契约 |
| PRD-NPM-007 | `AGENTS.md` 使用 managed block 合并，不整体覆盖项目自有 Agent 规则 | P0 | preferred marker 使用 `pjsdlc:sdlc-harness:begin/end`；旧 `sdlc-harness:begin/end` 仅作为 legacy marker 兼容迁移 |
| PRD-NPM-008 | `Makefile` 不整体覆盖，优先插入 include 并生成 `<harnessRoot>/pjsdlc_managed/make/sdlc-harness.mk` | P0 | 保护项目自己的 `lint`、`test`、`build` 命令 |
| PRD-NPM-009 | `.work_products/**`、`<harnessRoot>/state/**`、`src/**`、`tests/**` 永远不被 sync/upgrade 覆盖 | P0 | 这些是项目事实源或业务代码 |
| PRD-NPM-010 | 支持 local overrides 合成最终 Skill 和策略 | P1 | v1 支持 `<harnessRoot>/pjsdlc_managed/override_skills/<skill_name>.md` 追加到 managed Skill；推荐 `<harnessRoot>/pjsdlc_managed/override_skills/*.md` 和 `<harnessRoot>/pjsdlc_managed/policies/*.local.yaml`；除 skills hard file index 外，workflow override 不放在 `<harnessRoot>` 顶层 |
| PRD-NPM-011 | 提供 `doctor` 命令检查配置完整性、文件漂移和升级风险 | P1 | 可以作为 `upgrade` 后的自动检查 |
| PRD-NPM-012 | 提供 migration 机制处理 schema version 变化 | P1 | 迁移 `<harnessRoot>/config.yaml` 和受管理文件布局 |
| PRD-NPM-013 | 当本仓库中的 Harness 工作流内容变化时，自动更新 npm 包 canonical source 并校验包内产物一致性 | P0 | 包括 `AGENTS.md` managed block、Skill、templates、policies、Makefile 接入片段、workflow 和 validator 入口 |
| PRD-NPM-014 | 以可配置 `<harnessRoot>` 作为 Harness 工作流配置 canonical root | P0 | Skill、policy、template、state protocol、validator 和 migration 都属于 Harness 配置；具体 state data 和 `.work_products/**` 属于项目实例 |
| PRD-NPM-015 | 支持通过 JSON 配置 `harnessFolderName` 指定 Harness 根目录，配置层默认值为 `.agent` | P0 | 优先读取 `package.json` 的 `sdlcHarness.harnessFolderName`，也支持 `sdlc-harness.config.json`；兼容别名 `harnessFloderName` |
| PRD-NPM-016 | `sdlc-harness init` 先询问目标 Agent，并写入对应 `harnessFolderName` | P0 | 直接回车默认 `Codex -> .codex`；选择 `Other` 时才询问自定义 folder，直接回车默认 `.agent`；非交互环境不阻塞并使用 Codex 默认 |
| PRD-NPM-017 | 删除 archive 并采用 `plan.yaml` 单文件短期执行计划模型 | P0 | `plan.yaml` 取代 `tasks.yaml`；open task 直接包含 `allowed_paths`、`required_gates`、`acceptance_criteria` 和必要执行备注；task 完成并写入长期历史后从 `plan.yaml` 移除；不再维护 checkpoint 文件或 `<harnessRoot>/archive/**` 常规归档 |
| PRD-NPM-018 | 已完成 task 的历史查询面向产物结果和变更意图 | P2 | Agent 默认不读取过去 task 执行流水；历史 task 查询以模块级 implementation doc、RFC、PRD、tech plan 和代码为主，`allowed_paths`、`required_gates` 和临时 `working_notes` 不作为历史查询 API |
| PRD-NPM-019 | Gate evidence 写入 task notes 或 implementation doc | P1 | 不维护独立 gate scratchpad；当前 task 的临时 gate 证据可写入 `working_notes`，完成后的最终 gate 事实写入 implementation doc `Verification`、CI logs 或 release 记录 |
| PRD-NPM-020 | Harness active state 不读取、不保存过去执行流水 | P0 | `lifecycle.yaml` 和 `plan.yaml` 只保存当前可执行状态；过去阶段/task/gate 执行信息默认不进入 Agent 上下文，仅在显式 forensic / audit / regression 场景中通过 git、PR、CI、release 系统和阶段产物查询 |
| PRD-NPM-021 | 移除独立 gate results state | P0 | 不再维护 `<harnessRoot>/state/gate_results.log`；当前 task gate 证据写入 task notes 或 implementation doc `Verification`，长期记录由 implementation doc、CI logs 或 release 系统承担 |
| PRD-NPM-022 | RFC 阶段必须显式考虑影响面 | P0 | RFC 进入补丁或 DEV task 前必须列出 docs、state、skills、policies、templates、tools、package assets、tests、sync/upgrade/migration 和 generated artifacts 影响 |
| PRD-NPM-023 | 用户可通过自然语言控制 workflow | P0 | `/status`、`/next`、`/advance`、`/rfc` 等宏指令保留为快捷入口；Agent 应将“继续”“完善产品方案”“设计技术方案”“开始开发”“跑测试”“进入下一阶段”等自然语言映射到 lifecycle/plan 对应动作 |
| PRD-NPM-024 | 根 README 面向用户接入和日常使用 | P1 | 长篇产品说明和设计取舍迁移到 `PROJECT_SPEC.md`；根 `README.md` 只保留用户视角的包介绍、安装、初始化、同步、升级、诊断和验证命令 |
| PRD-NPM-025 | implementation doc 默认按模块级事实切片 | P0 | `.work_products/04_implementation/` 描述最终实现产物，默认按模块、子系统或核心数据流维护，并与 architecture / tech plan 边界对应；task id 和 commit 仅作为 provenance，不作为默认文档粒度 |
| PRD-NPM-026 | 支持自然语言意图和约定指令别名双入口 | P0 | 每个阶段都应支持自然语言和 `/xxx` 快捷入口；`/xxx` 是更完整、更细节的提示词别名，自然语言是低成本入口；产品、架构、开发阶段分别提供 `/prd`、`/design`、`/dev`、`/devloop` |
| PRD-NPM-027 | npm 发布流程可脚本化执行 | P1 | 提供仓库内 release script，自动执行 version bump、test、source drift check、pack dry-run、publish、registry latest verification、installed-consumer smoke 和 release doc evidence；默认不发布，显式确认后才 publish |
| PRD-NPM-028 | 支持默认 Codex native subagent 并行调度合同 | P1 | 每个阶段 task 默认评估是否适合安全并行；适合时使用 `parallel_execution.trigger: "workflow_default"`、`mode: "runtime_managed"` 和 `runtime.provider: "codex_native_subagents"`；用户显式要求并行时使用 `user_requested`；Harness 记录 worker 边界、owned paths、required gates 和主 Agent 集成责任 |
| PRD-NPM-029 | `validate-dev` 强制 SPRINTING 交付结构化 Development Evidence | P0 | 当前 open dev task 的 implementation doc 必须记录 `Runnable Entry`、`Observable Exit`、`Basic Self-test Evidence`，或带原因的 `Not applicable`；页面类任务要求 dev server/page URL 与 browser check，API/CLI/worker 类任务要求 invocation 与可观察结果 |
| PRD-NPM-030 | `Development Self-Test Report` 必须保持短交接卡语义 | P0 | 自测报告只记录入口、Module Key Test Path、scenario 结果、executed gates、Observable Exit、Current Blocker、Testing Handoff Readiness 和 Evidence Index Refs；debug log、operator log、runbook、evidence dump、失败探索和历史流水必须分离到 runbook/evidence/exploration |
| PRD-NPM-031 | high-risk runtime/live task 必须提升恢复硬约束 | P0 | 会改变下一步动作的判断必须 promoted 到 `resume_capsule.do_not_retry`、runbook `Hard Constraints` 或短 `Current Operator Path`，不能只埋在 evidence、notes、appendix 或长 implementation doc 中 |
| PRD-NPM-032 | 阶段流转必须使用轻量显式有向图 | P0 | `phase_contracts.yaml` 以 `phases` 记录阶段节点 contract，以 `transitions` 记录合法流转边、trigger、kind 和必要 effects；`transition.py` 和 validator 必须消费同一图结构。不得把 task history、operator log、debug evidence、runbook 正文或阶段历史塞入图；不得为当前需求引入重型 graph engine、node/edge class、遍历框架或可视化。 |
| PRD-NPM-033 | 复杂开发自测路径支持轻量 DAG handoff graph | P1 | `self_test_contract.module_key_test_path` 保持兼容；复杂或 high-risk task 可设置 `graph_required: true` 并提供 `module_key_test_graph`，节点只记录 `entry`、`checkpoint`、`branch`、`scenario`、`observable_exit`，边只记录合法路径，`evidence_ref` 只保存短指针。validator 必须拒绝 cycle、未知节点、缺失 entry、scenario 不可达或证据正文进入 graph。 |

## 5. Acceptance Criteria

- [ ] 新仓库执行 `npm install -D agent-project-sdlc && npx sdlc-harness init` 后，可以得到可运行的最小 Harness 骨架。
- [ ] 已有仓库执行 `npx sdlc-harness init --adopt` 后，不修改 `src/**`、`tests/**`、已有业务文档和已有项目配置，除非用户显式确认。
- [ ] 执行 `npx sdlc-harness sync` 后，`<harnessRoot>/skills/**/SKILL.md` 作为 canonical source 存在于工作区，Agent 可按本地固定目录读取。
- [ ] 在 `<harnessRoot>/pjsdlc_managed/override_skills/pjsdlc_dev_sprint.md` 写入本地补充并执行 `npx sdlc-harness sync` 后，最终 `<harnessRoot>/skills/pjsdlc_dev_sprint/SKILL.md` 包含通用 Skill 和一次本地 override 区块。
- [ ] `<harnessRoot>/pjsdlc_managed/override_skills/*.md` 只能指向已有 workflow Skill；未知 skill 名称会阻塞 sync 并输出明确错误。
- [ ] 执行 `npx sdlc-harness upgrade` 后，自动完成 `sync`，不要求用户再手动运行 `npx sdlc-harness sync`。
- [ ] `AGENTS.md` 中项目自定义内容在 sync/upgrade 后保持不变，仅 `pjsdlc:sdlc-harness` managed block 被更新；旧 `sdlc-harness` block 可被迁移为新 marker。
- [ ] 项目根 `Makefile` 中业务自定义 `lint`、`test-all`、`build` 等目标在 sync/upgrade 后保持不变。
- [ ] `.work_products/**` 和 `<harnessRoot>/state/**` 在 sync/upgrade 中不会被覆盖；如检测到风险，命令失败并输出 blocker。
- [ ] `sdlc-harness doctor` 能报告 managed files 缺失、checksum 漂移、schema version 不匹配和 local override 合并结果。
- [ ] 本仓库的 Harness 源文件发生变化时，可以通过 `sdlc-harness package sync-source` 或等价自动化流程更新 npm 包 canonical source。
- [ ] CI 能验证工作区 Harness 源文件与 npm 包 canonical source 一致，避免修改了工作流但漏更新包内容。
- [ ] 执行 `npx sdlc-harness init` 时，CLI 先提示选择目标 Agent；直接回车或非交互环境写入默认 `Codex -> .codex`。
- [ ] 选择 `Other` 时，CLI 才继续提示输入 Harness folder name；直接回车写入 `.agent`，输入自定义值则写入自定义值。
- [ ] 显式传入 `--harness-folder` / `--harnessFolderName` 时，CLI 跳过 Agent 选择并优先写入命令行指定目录。
- [ ] 未经过交互式 init 且未配置 `harnessFolderName` 的配置解析默认使用 `.agent` 作为 Harness 根目录。
- [ ] workflow Skill 使用 `<harnessRoot>/skills/pjsdlc_<skill_name>/SKILL.md` hard file index；policy、template、Makefile fragment 等工作流配置统一位于 `<harnessRoot>/pjsdlc_managed/**`，不再维护 `<harnessRoot>/policies/**` 或 `<harnessRoot>/templates/**` mirror。
- [ ] 配置 `harnessFolderName: ".harness"` 的项目使用 `.harness` 作为 Harness 根目录，Skill 位于 `.harness/skills/**`，不再额外套 `.harness/agents/skills/**`。
- [ ] 当前 `ProjectTemplate` source authoring workspace 显式配置 `harnessFolderName: ".codex"`，本地状态、skills、templates、policies 和 Makefile fragment 位于 `.codex/**`。
- [ ] `plan.yaml` 和 `plan.draft.yaml` 取代 `tasks.yaml` 和 `tasks.draft.yaml`。
- [ ] open task 直接在 `plan.yaml` 中声明 `allowed_paths`、`required_gates`、`acceptance_criteria` 和必要执行备注。
- [ ] task 完成后从 `plan.yaml` 移除，历史动作记录由 git commit 承载，产物结果由 implementation doc 承载。
- [ ] Agent 默认不读取 done task 的历史执行流水；显式 forensic/audit/regression 场景可临时通过 git、PR、CI 或 release 记录追溯。
- [ ] Harness 不维护独立 gate results state；完成后的长期 gate 事实以 implementation doc、CI logs 或 release 记录为准。
- [ ] `lifecycle.yaml` 不保存 phase transition history；Agent 默认不读取过去执行流水。
- [ ] 新项目不生成 `gate_results.log`，gate 证据进入 task notes 或 implementation doc。
- [ ] RFC 产物包含明确影响面清单，并据此创建后续 task。
- [ ] 用户不需要记忆宏指令，也可以通过自然语言让 Agent 报告状态、继续当前阶段、完善产品方案、设计技术方案、检查阶段推进、进入 RFC、执行开发任务、运行开发循环、运行测试、进入 Review 或刷新 overview。
- [ ] 根 `README.md` 是轻量用户指南，`PROJECT_SPEC.md` 保存完整项目规格说明。
- [ ] implementation doc 默认按模块、子系统或核心数据流维护；open task 的 `implementation_work_product` 指向相关长期实现事实文档，多个 task 可以更新同一份文档。
- [ ] README 和协议按阶段顺序说明 `/prd`、`/design`、`/dev`、`/devloop`；`/dev` 一次只完成一个 DEV task 闭环，`/devloop` 连续创建/执行 DEV task，直到没有明确任务或遇到 blocker。
- [ ] npm package patch release 可以通过 `npm run release:npm -- --version patch --publish --yes` 执行，并生成 release evidence。
- [ ] Harness 不再生成或要求 checkpoint 目录、checkpoint 模板或 `validate-checkpoint` gate。
- [ ] Harness 不再生成或要求 `<harnessRoot>/archive/**` 作为 task/release 常规归档。
- [ ] 每个阶段 task 开始时，Agent 默认执行 parallel eligibility check；适合安全拆分时创建 `parallel_execution.trigger: "workflow_default"` 合同，不适合时保持串行并记录原因。
- [ ] 用户显式要求并行、多 agent 或多 worktree 时，Agent 可以生成 `parallel_execution.trigger: "user_requested"` 合同，描述 `runtime.provider`、`mode`、`workers`、`owned_paths`、`forbidden_paths`、worker gates 和主 Agent integration。
- [ ] 默认 runtime 使用 `runtime_managed` + `runtime.provider: "codex_native_subagents"`；不支持 native subagent 时使用 `user_orchestrated`，需要强隔离时可使用 `codex_exec_worktree` fallback。
- [ ] 全阶段并行的最终事实源更新都由主 Agent 集成；worker 不直接拥有最终 PRD、plan、architecture、tech plan、implementation doc、review/test/release report 或 overview。
- [ ] SPRINTING 写入 worker 的 `owned_paths` 必须非空、互不重叠，并落在当前 task `allowed_paths` 内。
- [ ] `validate-dev` 拒绝缺少当前 task `Development Evidence` 的 implementation doc，确保 TESTING 接收到已有预期能力的应用入口与可观察出口。
- [ ] `validate-dev` 拒绝把 debug/operator/runbook/exploration/history 或 `Actual Evidence` 正文塞进 `Development Self-Test Report` 主线，并要求 Evidence Index Refs。
- [ ] high-risk runtime/live task 的恢复硬约束可以在 `resume_capsule` / runbook / implementation doc 顶部被直接消费。
- [ ] session / QR / canonical path / do-not-retry 类关键判断如果只出现在 `working_notes`、evidence、appendix 或 implementation doc 普通章节中，而未 promoted 到 hard constraints，`validate-dev` 会拒绝。
- [ ] `phase_contracts.yaml` 包含 top-level `transitions`，canonical phase nodes 不再使用 `next` / `returns`；`validate-harness` 拒绝缺失 transitions、未知 phase、重复 edge、非法 `<suspended_phase>` target 或遗留 `next` / `returns`。
- [ ] `transition.py` 从显式 transition graph 计算合法下一阶段和 `allowed_next_phases`，并且旧 consumer policy 缺少 `transitions` 时仍能用 legacy `next` / `returns` fallback 完成基本流转。
- [ ] `self_test_contract` 支持可选 `graph_required` 和 `module_key_test_graph`；当 graph required 或 graph present 时，validator 检查单一 entry、合法 node kind、唯一 node id、edge 引用、DAG 无环、每个 scenario 可从 entry 到达并能走到 observable exit。
- [ ] 旧 task 只使用 `module_key_test_path` 时仍可通过；新 high-risk / multi-scenario task 的 prompts 会倾向生成 graph skeleton。
- [ ] `module_key_test_graph` 不接受 command output、截图过程、operator log、debug log、runbook 正文、失败探索或历史流水，证据正文必须留在 Evidence Index 或外部 artifact。

## 6. Out Of Scope

- 不在首个版本实现在线服务、Web UI 或远程控制台。
- 不要求所有 Agent 原生读取 npm 包；首个版本以 materialize 到工作区为准。
- 不在首个版本实现跨仓库自动开 PR 的机器人流程。
- 不在首个版本解决所有语言生态的项目脚本自动识别；`lint`、`test`、`build` 可先由项目保留或人工配置。
- 不覆盖或重写业务项目已有代码、产品文档、实现文档和历史状态。
- 不把 task/release 历史动作重复归档到 `<harnessRoot>/archive/**`；这类历史以 git commit、tag 或外部 release 系统为准。
- 不保留独立 checkpoint 文件；活跃任务现场只存在于 `plan.yaml` 的 open task 条目中。
- 不维护独立 gate results state。
- 不把过去 phase/task 执行流水写入 active state，也不要求 Agent 默认读取这些流水。
- 历史 `dev_*.md` task log 已在 DEV-043 合并为模块级 implementation docs；后续不再把 task 粒度文档作为 `.work_products/04_implementation/` 的活跃事实源。
- 第一版不提供 `sdlc-harness parallel run` 这类独立并行调度 CLI；Harness 使用 Codex native subagent runtime，并保留 `codex_exec_worktree` 作为强隔离 fallback 语义。
- 不提供自动 text-to-graph 迁移；测试路径分支、checkpoint 和 observable exit 需要人工或 Agent 判断，自动转换容易制造虚假结构。
- 不把 `module_key_test_graph` 做成测试执行引擎、trace graph、图数据库、可视化或通用 traversal framework；它只承担开发自测 handoff path contract。

## 7. Open Questions

| 问题（Question） | 负责人（Owner） | 状态（Status） |
|---|---|---|
| 首个 npm 包是否直接发布到 npm registry，还是先以 workspace/local package 验证？ | 用户 | open |
| CLI 使用 TypeScript/Node 实现，还是保留 Python validators 并由 Node CLI 调用？ | 技术方案阶段 | resolved：使用 TypeScript/Node runtime |
| managed Skill 与 local override 的合并格式是简单追加，还是支持结构化 patch？ | 技术方案阶段 | resolved：v1 采用 sync-time 追加覆盖，未来再评估结构化 patch |
| `AGENTS.md` managed block 是否引用 `.agent/instructions/AGENTS_CORE.md`，还是直接内联核心规则？ | 技术方案阶段 | open |
| 是否需要兼容 Cursor、Cline、Claude Code 等工具的专有规则目录同步？ | 用户 | open |

## 8. 依赖与风险

- 依赖 Agent 对工作区固定文件的读取约定，例如 `AGENTS.md` 和本地 `skills/**/SKILL.md` 目录；因此 `init` 先让用户选择目标 Agent 并写入对应 `<harnessRoot>`。如果该目录不是 Agent 原生 skill root，仍需要通过 `AGENTS.md` soft index 或 Agent 适配层读取 `<harnessRoot>/skills/**`。
- npm 包升级与工作区文件同步需要 checksum、managed marker 和冲突策略，否则容易覆盖项目本地修改。
- `Makefile` 和 `AGENTS.md` 是高冲突文件，必须使用 managed block 或 include 方式，不应整体覆盖。
- validators 运行时已经收敛到 TypeScript/Node；仓库内 Python 工具仅作为当前 Harness 本地 gate 和辅助脚本存在。
- 如果后续要支持多 Agent 生态，需要为不同规则目录设计 adapters，但首个版本应保持最小闭环。
- 本仓库在 npm 包化后同时承担 reference implementation 和 source authoring workspace 的角色，必须用自动化防止两边漂移。
