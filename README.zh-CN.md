# Project Tiny Context Harness 中文快速说明

[English README](README.md)

Project Tiny Context Harness 是给 AI coding agents 用的轻量项目记忆层，也是 repo-native context contract。

它不是新的全流程 Tiny Context 框架，也不是任务管理器。它做一件小事：把新会话 agent 最容易丢掉、但又必须长期稳定保留的项目事实，以及 Context / 代码 / 验证证据之间的读取和变更优先级放进仓库里，让下一次聊天、交接、调试或换工具时不用从头重新发现。

一句话：

```text
Keep the memory. Drop the ceremony.
保留项目记忆，丢掉流程仪式感。
同时保留 Context / 代码 / 验证证据之间的优先级契约。
```

## 它解决什么问题

很多 agent 在一个对话里表现很好，但换到新对话后会重新问、重新猜或重新扫描：

- 项目到底要解决什么问题
- 哪些事情明确不做
- 架构边界在哪里
- 哪些文件是事实源
- 改完以后应该跑什么验证
- 上一次任务留下了哪些长期约束
- Context、实现和验证证据冲突时谁优先

Project Tiny Context Harness 把这些内容压缩到几个 repo-native 文件里，并通过简单工作流约束 agent 先读 Context、判断是否 context-first、实现后做 drift check：

- `AGENTS.md`
- `project_context/context.toml`
- `project_context/global.md`
- `project_context/architecture.md`
- `project_context/areas/**`

Fresh agent 先读这些文件，再开始改代码。

## 和传统 Tiny Context 流程的区别

这个项目以前尝试过更重的阶段式 Tiny Context：阶段状态、任务流转、PRD / 技术方案 / 实现 / 评审 / 测试 / 发布产物和多个 gate。

后来放弃这个方向，原因很直接：

- 中小任务里，阶段流转和产物校验会显著拖慢执行。
- 现代 coding agents 已经内化了很多普通软件工程循环：理解、设计、实现、测试、修复。
- 真正值得保留下来的不是“每次任务都走完整流程”，而是“新 agent 能快速恢复项目长期事实”。

所以当前默认方向是 Minimal Context Harness：只维护高密度、长期有效、能帮助恢复上下文的项目事实。

一个典型失败场景是 ABCD 模块链：A/B/C 是上游，D 是下游。现在做 D 的需求时发现能力缺口；如果没有 Context 和优先级约束，agent 很容易为了让 D 完成而去改上游 A/B，因为当前代码让这条路可行。但真正需要判断的是：D 是否有权改 A/B？缺口是不是属于 C 的契约？是否必须先声明 `Context Delta`，让项目意图变化被确认后再实现？代码能说明“现在怎么改得动”，不能说明“项目意图是否允许这样改”。Tiny Context 要补的就是这一层 repo 内长期事实和优先级契约。

Tiny Context 有两个核心层。Minimal Context 是长期事实源层：说明哪些项目事实写在 `project_context/**` 或 `DESIGN.md`。流程契约 / Workflow Contract 是 agent 行为层：规定先读 Context，让 foundation / contract / decision-rationale / architecture 等原则和契约类 Context 优先解释当前代码便利路径，再判断 `Context Delta`、编译 Task Contract、必要时用 `plan.md` 承载可见执行面、按契约实现，最后做 Contract Conformance 和 Context drift check。

对于长程任务，Harness 提供两个显式调用的长程任务 Skill。普通长程任务用 `/normal-long-task`：它把方案和验收输入临时放到 `tmp/ty-context/plan-acceptance/**`，生成或复用完整验收清单，并可输出普通目标模式文本。如果外部规划模型参与，推荐仍然只给两份产物：`《开发方案》` 作为执行方向和 plan traceability source，`《验收清单和测试用例》` 作为 Codex target-mode acceptance input packet。第一份应包含可逐项追踪的 plan item、预期落点 surface、full scope 与 sampled/optional 边界；第二份应包含 AC、required evidence、测试命令、真实产品路径 / core path、证据分层、无效证据、状态机、local audit 和 blocker。Source Pack 只是临时上传材料，不是 durable Context。如果方案里已经有明确、具体的“验收清单”，`/normal-long-task` 会直接复用那份清单并单独写入完整验收清单文件；两份输入包走 strict mode，如果两份内容无法完整解析出 required fields，或第二份缺少 required evidence、verification method、fail condition、状态机、无效证据规则等必要字段，Skill 会停止并列出缺失项，不生成完整验收清单或目标模式文本。

Composite Long-Task Workflow Skill 用 `/composite-long-task-workflow`。如果下一步明确要 Superpowers-backed 目标模式执行，推荐在三份输入都存在后调用：`Product / Architecture Source`（产品/架构原始意图源）、`Technical Realization Plan`（具体技术实现方案）和 `Acceptance Checklist`（验收清单）。它不做复杂度分流；调用它表示上游已经决定使用 composite long-task execution。它不要求先跑 `/normal-long-task`，但也不会把产品方案现场翻译成技术方案；如果只有产品/架构方案和验收清单，Skill 会用 Missing Fields Report 停止并报告缺少 `Technical Realization Plan`。两份输入兼容只限第一份明确包含产品/架构源和技术实现方案两个章节。`Technical Realization Plan` 必须已经满足 Superpowers-ready Markdown implementation plan 的必填字段；满足时它跳过方案生成，直接绑定 Superpowers 执行，不满足时直接中断并报告缺失字段，不生成 prompt。它输出 `workflow-protocol.md`、`execution-binding.md` 和可直接用于 Codex Goal mode 的薄 `goal-objective.txt`，不是把完整 workflow 塞进 4000 字 Goal：Goal 只保留持续完成契约，完整可执行流程放在 protocol snapshot 和 task-specific binding。预期运行效果是显式融合而不是让 agent 自行发挥：先 Tiny Context 流程契约，再三份输入权威，再编译 task-state，再进入 Superpowers implementation slice，每个 slice 更新 canonical state/evidence，derive 出阅读视图，经过 slice/epoch gate，最后 final-gate 计算完成。这个 workflow 是面向 Superpowers execution 的 Tiny Context 适配层，对齐官方 Superpowers skills，但不是上游维护的 schema；它不是 Tiny Context 流程契约本身、不是业务事实源、不是普通 prompt generator、也不是 Superpowers fork。它可以在 Superpowers 外层增加 Tiny Context 的权威、对图纸和验收门禁，但不能重新定义、重复或分叉 Superpowers 执行机制。如果未来改动让 Tiny Context 新增步骤和官方 Superpowers 职责冲突、重复或覆盖，应停止修改并提示边界冲突，不要静默合并两套流程。它不生成技术方案或验收清单、不执行计划、不证明完成，也不会把临时 state、derived views 或 verdict 注册成 `project_context/**`。三输入是上游权威，state / derived views / validator / auditor 不能改写它们。`task-state.json` 是唯一执行状态源，`events.ndjson` 追加记录状态变更，`derived/**` 只生成 local audit、plan-conformance matrix、final acceptance verdict、progress ledger、evidence index、context alignment、final summary 和 final card 等阅读视图。完整验收行按外部审计证据处理：proof chain 来自验收清单，fresh evidence 必须通过 `task-state.evidence[]` 满足每个 required layer，存在 material drift、缺 required layer 或未批准 sibling substitution 时不能标 `complete`。Goal mode 表述必须区分 `audit_task_complete`、`acceptance_target_status`、computed `product_goal_complete` 和 resolver-owned `completion_output_status`：实现/执行目标只在 `ty-context composite-long-task final-gate` 计算出 `product_goal_complete=true` 且 `completion_output_status=accept` 时完成；只读审计目标可在 `audit_task_complete` 时结束，但 verdict 不是 accepted/complete 时，回复写 `Audit workflow completed; acceptance target not complete.`，不能用未限定的 `Goal achieved` 或 `update_goal(status="complete")` 表示用户验收目标已完成。final-gate 未 accept 时，输出必须带 `blocker_triage` category 和 next action；旧 transient bookkeeping 或可重新生成的 generated-output mismatch 最多自愈重跑一次，真实证据、环境、契约和 harness drift blocker 仍保持 blocked/reject。

Machine-verifiable proof layer（如 UI/browser、runtime、API/schema、data artifact、integration、test）不能靠截图、final card、validator pass、matrix/verdict 行或 prose evidence 完成；必须有 `assertion_result.status=passed`、命令和 assertion exit code 为 0、target AC/layer 匹配、positive/negative assertions 通过、reviewable artifacts，且没有 failed/stale `negative_evidence_scan`。UI Path AC 不能用 component screenshot、storybook、viewmodel、mock/unit、diagnostic page 或 API-only evidence 替代 owner page/browser 主路径；`未验证`、`不可用`、`暂不可用`、`页面无明显变化` 等 owner-surface forbidden state 会使 AC/layer 失效。

三份输入还必须承载 capability-first delivery 边界。Product / Architecture Source 声明 `delivery_scope`、`full_population_required`、哪些 representative samples 能验证 claim、哪些不能验证、以及 `out_of_scope_backlog`。每个 Technical Realization Plan item 声明 delivery scope、capability target、representative samples、full-population boundary 和 non-required population。每个 Acceptance Checklist item 声明 acceptance scope、`ac_validates`、`ac_does_not_validate`、sample boundary 和 full-population requirement。source / plan / checklist 在 system capability build、representative sample validation、full population operation 之间冲突时，`scope_conflict_requires_decision` 阻塞完成。sample evidence 或 framework-only implementation 不能证明 all-provider、all-interface、all-platform 或 full-population 完成，除非 AC 明确批准；未显式要求 full population 时，generated views 必须报告 `not_in_scope`。

`ty-context composite-long-task compile` 对这三份输入使用严格的 heading-based grammar。Product / Architecture Source 是一个文档级对象，只读固定字段。Technical Realization Plan 里的 PI 只有写成 `## PI-001: ...` 这类 Markdown heading 才是正式定义；Acceptance Checklist 里的 AC 也只有 `## AC-001: ...` 这类 heading 才是正式定义。heading section 内字段必须使用固定 `key: value`、缩进列表或 `key: |` 多行块。正文、表格、mapping preview、`related_acs` / `related_plan_items` 和普通列表里出现的 `PI-001` / `AC-001` 都只是引用；旧式 `- PI-001: ...` 或 `- AC-001: ...` 后面跟字段的写法会在 compile 阶段带文件和行号报错。

Strict V2 输入还要求 canonical Product / PI / AC 字段组。Product Source 必须包含 `scope_fit_decision`、`selected_scope_fit_slice`、`owner_boundary`、`primary_capability_path`、`non_completing_outcomes`、`assertion_policy` 等 Scope Fit / owner 字段；PI 必须包含 owner、trigger、state transition、observable result 和 assertion support 字段；AC 必须包含 `assertion_command`、`assertion_artifacts`、`positive_assertions`、`negative_assertions`、`machine_blocking`、`invalid_completion_signals` 和 `assertion_result_required`。未知字段、重复字段、表格字段和缺失 canonical 字段都会 compile fail。Canonical proof layers 是 `code`、`api_schema`、`worker_runtime`、`data_artifact`、`integration`、`ui_browser`、`security_redaction`、`all_provider_all_runner`、`cleanup_stale_scan` 和 `test`；`runtime` / `browser` / `api` / `data` / `security` 只是 legacy alias，会编译到 canonical 名称，且 `code` 不能单独完成 machine-backed AC。Evidence index 同时生成 `derived/evidence-index.md` 和 `derived/evidence-index.json`。

对于非平凡 slice，生成的 composite workflow prompt 要求使用结构化 `slice-delta.json`。executor 通过 `ty-context composite-long-task apply-slice-delta <workdir> <slice-delta.json>` 应用 delta，然后运行 `ty-context composite-long-task derive` 和 `ty-context composite-long-task slice-gate`。每个 delta 记录 touched plan items / ACs、code changes、closed / remaining proof layers、blockers、cleanup assertions、`progress_value`，以及带有 `proves`、`does_not_prove`、freshness、redaction 和 reviewability 的 canonical evidence records。默认 slice 策略是把同一 AC、runtime 场景、proof 环境或验证路径下的 2-4 个强相关 missing layers 合并处理；单 gap slice 只留给 blocker、contradiction 或小型 metadata cleanup。prompt 还会要求先分类 missing layer、复用 DB/API/Browser 环境时使用唯一 proof prefix 和 cleanup assertion，并在生成 derived artifacts 后做 stale/overclaim scan。

当 slice 声称关闭 machine-verifiable layer 时，`slice-delta.json` 的 evidence record 还应包含 `command_exit_code`、`assertion_result`，UI/browser 等需要时还应包含 `negative_evidence_scan`；derived matrix/verdict 只展示 assertion status 和 blocker，不能替代 assertion 执行。

严格完成判定只看 current attempt，并且统一经过 Trusted Evidence Kernel，再经过 completion-output resolver；final-gate、`validate-superpowers-state`、state-backed `validate-plan-acceptance` 和 derived completion views 使用同一个 kernel result。`compile` 从每个 machine-blocking AC 的 `assertion_command`、`assertion_artifacts`、proof layers、required tests、positive/negative assertions、invalid completion signals 和 final evidence expectation 生成 required command specs；`start-attempt --mode product_task|harness_task` 创建当前执行身份；`run-assertion` 记录 assertion command run；`record-evidence` 把 artifact 注册成 canonical EvidenceRecordV2；`final-gate` 只从当前记录重算。EvidenceRecordV2 必须包含 attempt/source/product/plan/checklist hash、git head、worktree fingerprint、command spec/run id、command line / exit code、artifact path/SHA/mtime、target AC ids、target PI ids、target proof layers、assertion status / exit code、positive assertions、negative assertions、invalid completion signals、negative evidence scan 和 required test ids。legacy v1 evidence、历史 `events.ndjson` complete 事件、旧 `derived/**` complete 视图、matrix/verdict/evidence-index/final-summary 行、validator pass、final card、auditor prose、AC summary-only proof、未注册临时 JSON 和手写 status 文件都不能完成 machine-blocking AC，也不能把 generated final answer 升级为 `accept`；更新的 failed command、Playwright/JUnit/test result 失败、owner DOM forbidden state、source/worktree drift、当前 task-state false/partial 或 derived/state mismatch 会让同 AC/layer 的旧 passed evidence 失效。

final-gate 在 kernel、output resolver 和 triage 内部固定执行：load 三输入、重算 source hashes、load task-state、把旧 final/gates/meta transient bookkeeping snapshot 成 audit-only、resolve current attempt、load required command specs、load command-run records、load registered EvidenceRecords、discard stale evidence、scan unregistered assertion JSON、contradiction scan、AC-010 bootstrap prevention、under-specified AC checks、Harness Drift Lock、protected baseline guard、validate scope conflicts、重算每个 AC、重算每个 PI、重算 `acceptance_target_status`、重算 `product_goal_complete`、build current candidate state、resolve candidate `completion_output_status`、regenerate current `derived/**`、按 current candidate mode 扫 generated output、分类 `blocker_triage`、允许 transient/generated-output 自愈一次、append event。旧 `completion_output_status=blocked` 或旧 `generated_output_mismatch=true` 不能把 current kernel accept 拖回 blocked；当前 user-visible false completion claim 仍会 blocked。machine-blocking AC 缺 assertion command/artifacts/assertions/invalid signals，UI proof 缺 browser/e2e/smoke/trace，final evidence 只指向 generated view，test cases 只有人工查看，或无法产出 `assertion_result` 时，AC 是 `under_specified`，PI blocked，`product_goal_complete=false`。AC-010 / final-gate summary 不能反向证明其它 AC：如果 summary AC passed 但其它 required AC missing / failed / stale，则 summary AC invalidated，reason 是 `final_gate_cannot_bootstrap_from_summary_only`。

Harness Drift Lock 把产品证明和验收工具链证明拆开。`product_task` 修改 Playwright spec、测试、assertion generator、AC010 helper、evidence writer、final-gate、validator、derive、task-state reducer、composite workflow Skill/protocol 或相关 Makefile/package test target 时，直接输出 `harness_drift_detected`、`acceptance_target_status=blocked`、`product_goal_complete=false`，并使用文案“本轮修改了验收工具链或测试本身，不能用被修改后的验收证明同一轮产品完成。请拆成独立 harness_task。”`harness_task` 可以修改 harness，但必须有 stale evidence、historical complete、derived contradiction、AC010 summary-only、target mismatch、API-only-for-UI、negative evidence after pass、source hash mismatch、dirty worktree mismatch、missing assertion_result、test weakening、scope leakage、missing UI/browser owner-surface proof、missing negative semantic proof 和 happy path fixtures；它只证明 harness 修对，不证明产品任务完成。`protected-harness-baseline.json` 保护 final-gate、validator、derive、evidence registration、assertion schema、fixture expected outcomes、workflow protocol、Skill markdown 和 test runner scripts；product task 改 baseline blocked，harness task 改 baseline 必须写 reason 并跑 fixtures。HFC-003 是持久 false-completion regression suite；HFC-004 是持久 final-gate blocker triage suite，覆盖旧 transient 自锁、candidate-driven scanner、blocker category/next action 和 one-pass self-recovery，并作为 harness 改动的 package release blocker。

生成的 composite workflow prompt 使用 Slice Gate / Epoch Gate / Final Gate 分层节奏，而不是每个 slice 后都跑完整 final gate。Progress Accounting 在 state 和 generated `derived/progress-ledger.*` 中记录 AC acceptance completion、engineering implementation progress、runtime/proof progress、system capability progress、representative sample progress、real object coverage、full population operation progress、artifact budget 和 workflow overhead。每个 slice 需要声明 artifact budget、proof-layer milestone 状态和 cleanup expectation。workflow overhead backpressure 要求 executor 批处理共享的 provider/browser/runtime/security epoch proof environment，清理 stale artifact，并选择 Next 3-5 high-value clusters 来优先关闭最多阻塞 AC / proof-layer gap。

重要使用提示：Minimal Context 有意把 Context 读取顺序、Context / 代码优先级和漂移检查保持为 agent 级软约束，而不是机器强制 edit-order gate。这个取舍适合短任务，但长任务、大上下文、多次交接或多轮验证时预期会漂移。单靠 Superpowers 在这类压力下仍可能漂移：它能增强执行纪律，但本身不负责保留上游 source authority、防止 scope shrinkage、证明完整符合 Technical Realization Plan，或按 Acceptance Checklist 逐 AC 强制证据成立。普通 checklist 准备需要 `/normal-long-task`；已有产品/架构原始意图源、具体技术实现方案和验收清单且需要 Superpowers-backed execution 时，可直接用 `/composite-long-task-workflow`。`Product Context Delta` 判断产品逻辑、页面职责、信息架构和验收语义是否需要写入 Context；`Technical Context Delta` 判断 API/schema、模块边界、runtime/state、验证/部署路径和稳定技术取舍是否需要写入 Context。`task-state.json` 是唯一执行状态源，`events.ndjson` 追加记录状态变化，`derived/**` 是生成阅读视图，`task-state.evidence[]` 是 canonical evidence ledger；local audit 只是 generated progress/recovery view，不能裁判完成；审计流程完成也不等于被验收目标完成。使用目标模式执行方案时，目标结束条件对齐 computed `product_goal_complete=true`；只读审计目标才可把 `audit_task_complete` 当元任务结束。validators、auditor、Superpowers verification 和 generated views 仍是有用的执行检查，但不能覆盖 Trusted Evidence Kernel，也不能成为 product proof。`validate-plan-contract`、`validate-superpowers-state` 和 `validate-plan-acceptance` 只检查临时 artifact/state 自洽、引用存在、弱证据 complete 行、缺 required proof layer、material/critical drift、sibling substitution 和已声明的 surface/architecture binding 一致性，不证明产品质量。有 subagent 能力时，composite workflow prompt 会把 subagent 作为只读 auditor 加在主 agent 自证和 validator 之后；auditor 用固定 auditor checklist 找 gap，不是 proof source。Superpowers review 和 verification 仍然有价值，但不能覆盖 Tiny Context gates；通过 Superpowers review 不等于证明 plan conformance 或 checklist acceptance。

最终顺序中的 final-gate 还包含 AC Evidence Assertion Gate 和 Negative Evidence Scan Gate；`validate-superpowers-state` / state-backed `validate-plan-acceptance` 会拒绝缺少或失败的 assertion-backed machine proof、negative evidence contradiction、target AC/layer 不匹配和 stale assertion evidence。它们仍只验证 assertion report 与 proof layer 的绑定、freshness、reviewability、redaction、negative contradiction 和 state/derived consistency，不执行项目测试本身，也不证明产品质量。

错误融合防线：不得把 `workflow-protocol.md` 注册进 `project_context/context.toml`，不得把它当业务 Context，不得让 `derived/**` 反向改写 Product / Plan / Checklist，不得把 local audit 或 Superpowers review 当质量证明，不得把 sample evidence 当 full population proof，不得在 Source-to-Context Coverage 或 Context-to-Implementation Binding 仍有 unresolved required gap 时声称完整对齐，不得手写 `product_goal_complete`，final-gate 未通过前不得把实现 Goal 标成 complete。

额外的 machine-proof 防线：不得把 screenshot-only、final card、validator pass、matrix/verdict 行、prose evidence、component/storybook/viewmodel/mock/unit/diagnostic page 或 API-only path 当成 UI/browser/runtime/integration/test AC 的完成证明。

## 多组合长程任务准备

只有原始需求、还需要 Scope Fit、稳定 SFC 拆分和严格三输入编写时，显式调用 `/prepare-composite-long-task`。它创建 opt-in、用户自有的 campaign，每次只为当前 dependency-ready SFC 编写 `CompositeAuthoringPacketV1`，由包代码确定性渲染三份 Markdown 并做无状态 preflight；没有显式启动授权时停在 `handoff_ready`。handoff 不创建 Goal；显式 `start` 只把一个成功创建的 Goal 绑定到一个 SFC；`record-result` 只镜像当前 attempt/hash 匹配的 final gate。campaign authoring/provenance 可 Git 跟踪，运行 attempt、证据和 derived views 仍留在 `tmp/**`。v1 不提供 legacy importer，也没有 campaign aggregate completion 状态。已有完整三输入仍直接走 `/composite-long-task-workflow`。

包管理的 `ty-context composite-campaign` 命令包括 `contract`、`create`、`apply-scope`、`apply-packet`、`render`、`preflight`、`next`、`handoff`、`start` 和 `record-result`。`init`、`sync` 和 `upgrade` 只安装能力，不创建、扫描、修改或删除用户 campaign。

## 当前最佳实践

短程任务直接使用流程契约和 Context 层：

```text
流程契约 + project_context/** -> 实现 -> 验证 -> drift check
```

长程任务先外化目标，再进入实现：

```text
Web GPT 或其他外部规划模型产出长任务源输入
-> /normal-long-task 生成完整验收清单和可选普通目标模式文本
-> 需要 Superpowers-backed 多组合长程任务工作流时，/composite-long-task-workflow 消费 Product / Architecture Source + Technical Realization Plan + Acceptance Checklist
-> Superpowers 得出具体落地执行片段
-> 执行中维护 plan-conformance-matrix，最后生成 final-acceptance-verdict
-> 每个执行片段都回到流程契约 + project_context/**
```

这里的 Superpowers 指具体的 [obra/Superpowers](https://github.com/obra/superpowers) 插件/开源工作流，不是泛化的执行规划替代品。`/composite-long-task-workflow` 接受输入包后会冻结 `workflow-protocol.md`、写入 `execution-binding.md` 并生成薄 `goal-objective.txt`；有 subagent 支持时优先用 `superpowers:subagent-driven-development`，否则用 `superpowers:executing-plans`；涉及行为变更时用 `superpowers:test-driven-development`；完成声明前先 derive all views，再用 `superpowers:verification-before-completion`、`ty-context validate-superpowers-state <dir>`、`ty-context validate-plan-acceptance <dir>` 和 read-only auditor 检查，最后由 `ty-context composite-long-task final-gate <dir>` 计算 `product_goal_complete`。

原因是漂移控制。流程契约 + Context 层是软约束，短任务里通常能让 agent 按预期执行；长程任务里，Context 仍然能记录符合预期的事实，但 Context 到代码 的实现步骤会随着上下文窗口变大、多次交接、subagent 拆分和多轮验证而漂移。单靠 Superpowers 也仍可能在复杂长程执行压力下漂移：它增强执行纪律，但不天然保留 source authority、防止 scope shrinkage、证明完整符合 Technical Realization Plan，或按 Acceptance Checklist 逐 AC 强制证据成立。产品/架构原始意图源、具体技术实现方案、验收清单、显式长程任务 Skill 调用、目标模式文本、canonical task state、generated derived views 和可选 Superpowers 执行层，把“产品/技术 Context 有没有先对齐”“有没有按图纸实现”和“有没有按验收证据完成”都外化成可恢复、可审计的临时执行标准，同时不恢复阶段式 gate。

对于高风险产品方案、架构方案、技术方案或验收方案输入，流程契约应先在 `plan.md` 或等价临时计划面里可见化，再进入实现。这个计划面把 Source-to-Context Coverage 和 Context-to-Implementation Binding 分开：前者把每条长期 source 约束映射到 existing Context hit、Context action、owning Context 和 coverage status；后者把 Context fact 映射到 implementation obligation、expected surfaces、implemented paths、forbidden shortcuts、verification path 和 binding status。Source coverage 仍有 `under_scoped` 或未处理的 `new_context_required` 时不能声称按方案完整实现；binding 仍有 `partial`、`missing`、`blocked`、`needs_user_decision` 或 `contradicted_by_current_state` 时不能声称按 Context 完整落地。

small code task 不应该套完整 `plan.md` / trace 表。这里的 small 按语义风险判断，不按代码行数判断：现有 Context 已足够，且不改变 durable product、architecture、API/schema/data、runtime/state/recovery、verification/deployment、security/redaction 或 surface ownership 事实，才算 small。一个一行 schema 改动也可能不是 small；大范围机械样式清理反而可能仍是 small。

## 适合谁

适合：

- 经常用 Codex、Claude Code、Cursor、Gemini CLI、OpenCode 等 agent 改代码的项目。
- 经常开新 chat，agent 反复重新理解项目的项目。
- 想保留项目意图、边界和验证路径，但不想引入完整流程文档链的维护者。
- 多 agent / 多工具协作时，需要一个工具无关的 repo 内事实源。

不适合：

- 替代测试、CI、review 或人工验收。
- 自动执行完整 Tiny Context。
- 做代码语义索引或外部文档检索。
- 给每个任务强制生成 PRD、技术方案、测试报告和发布文档。

## 快速试用

npm 新包名还在等待发布。如果 `project-tiny-context-harness@latest` 尚未可用，可以先用源码 smoke 路径：

```sh
git clone https://github.com/Seven128/project-tiny-context-harness.git
cd project-tiny-context-harness
npm ci
npm run smoke:quickstart
```

发布完成后，普通项目使用：

```sh
npm install -D project-tiny-context-harness@latest
npx --yes --package project-tiny-context-harness@latest ty-context init
make validate-context
```

生成的核心结构类似：

```text
AGENTS.md
project_context/
  context.toml
  global.md
  architecture.md
  areas/main.md
  areas/main/verification.md
```

## 一个简单的使用方式

在新 agent 会话里先发：

```text
Read AGENTS.md and project_context/** first. Summarize the project goal, non-goals, architecture boundaries, validation entry points and next safe action before proposing code changes.
```

如果 agent 能快速说清楚项目目标、非目标、边界和验证入口，而不是重新扫描整个仓库猜测方向，这个 Harness 就发挥作用了。

## Benchmark 说明

不要把旧阶段式 Tiny Context 的 benchmark 数字当成当前 Minimal Context Harness 的性能证明。

当前公开卖点是产品设计和 smoke 证据：它能安装一个小的项目记忆面，并用 `validate-context` 检查恢复事实是否存在。真正的效率结论需要重新设计 fresh baseline 和 Minimal Context Harness 的对照实验。

## 反馈

现在最有价值的反馈不是“能不能多加流程”，而是：

- 你的 agent 经常忘掉什么项目事实？
- 哪些事实应该长期留在仓库里？
- `project_context/**` 是否太多、太少或不够好读？
- 新 chat 是否更快恢复了项目意图？

可以在 GitHub issue 里反馈：

- [Adoption reports](https://github.com/Seven128/project-tiny-context-harness/issues/4)
- [Demo starter issue](https://github.com/Seven128/project-tiny-context-harness/issues/5)
- [Sample walkthrough starter issue](https://github.com/Seven128/project-tiny-context-harness/issues/6)

## 语言策略

本项目的默认 README、npm copy 和公开 launch 文案保持英文优先，方便 GitHub、Hacker News、Reddit、Product Hunt 和 curated lists 上的开发者快速判断项目价值。

中文文档作为二级入口保留，用来服务中文用户和维护者，但不会替代英文主入口。
