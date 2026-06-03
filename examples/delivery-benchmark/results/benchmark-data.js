window.__DELIVERY_BENCHMARK_DATA__ = {
  generatedAt: "2026-06-02T05:42:00.000Z",
  copy: {
    en: {
      languageName: "English",
      documentTitle: "Delivery Reliability Benchmark",
      title: "Delivery Reliability Benchmark",
      lede:
        "Evidence for whether AI SDLC Harness improves same-quality delivery, especially as project complexity and handoff risk rise.",
      generatedLabel: "Generated",
      scenarioNavLabel: "Benchmark scenarios",
      languageSwitchLabel: "Report language",
      status: {
        completed: "Completed",
        pending: "Pending"
      },
      decisions: {
        pass: "PASS",
        warn: "WARN"
      },
      headings: {
        scenarioDetail: "Scenario Brief",
        measurement: "Measurement Method",
        metricConfidence: "Metric Confidence",
        automationBurden: "Automation Burden",
        gateValue: "Gate Value",
        gateThinning: "Gate Thinning Recommendation",
        scorecard: "Scorecard",
        quality: "Quality Heatmap",
        artifact: "Harness Artifact Map",
        artifactInventory: "Artifact Inventory",
        cost: "Cost Comparison",
        lifecycle: "Lifecycle Efficiency",
        context: "Context Continuity",
        interpretation: "How To Read This",
        caveats: "Evidence Boundaries"
      },
      scenarioBriefLabels: {
        whatItBuilds: "What this project builds",
        userWorkflow: "User workflow",
        complexitySignals: "Complexity and risk covered",
        midstreamChange: "Change/recovery pressure",
        expectedAdvantage: "Expected Harness advantage"
      },
      measurementConfidenceLabel: "Cost confidence",
      metricConfidenceIntro:
        "Not every benchmark number has the same evidence strength. Only high-confidence metrics are conclusion-grade here. Medium, low, mixed and unavailable metrics remain diagnostic evidence and cannot prove Harness efficiency, gate value, automation burden, or context-recovery advantage.",
      metricConfidenceGroups: {
        conclusion: "Conclusion-grade metrics",
        diagnostic: "Diagnostic metrics"
      },
      conclusionEligibilityLabels: {
        eligible: "Conclusion-grade",
        diagnostic: "Diagnostic"
      },
      automationBurdenIntro:
        "This measures how much unplanned operator help was needed after the benchmark prompt was already injected. Initial prompts and staged recovery/RFC/debug prompts are excluded.",
      gateValueIntro:
        "This checks whether gates created quality value by catching defects, reducing repair loops, or preventing defects that would otherwise escape.",
      gateThinningRecommendation: {
        label: "Recommended thickness: Standard Thin",
        body:
          "Current evidence supports thinning default workflow gates, not deleting gates. Keep focused product quality gates inside the loop; move strict workflow gates to task completion, pre-commit, phase transition, release, and package/source-change boundaries; keep strict gates for high-risk provider/live work.",
        metrics: [
          { label: "Benefit", value: "Less ordinary-task drag" },
          { label: "Loss", value: "Later workflow drift detection" },
          { label: "Best tradeoff", value: "Product quality stays strict" },
          { label: "Why", value: "Cuts repeat cost without dropping boundaries" }
        ]
      },
      automationBurdenLabels: {
        interventionCount: "Interventions",
        operatorPromptChars: "Prompt chars",
        operatorPromptWords: "Prompt words",
        repairLoopCount: "Repair loops"
      },
      gateValueLabels: {
        defectsCaught: "Defects caught",
        productGateDefectsCaught: "Product gate defects",
        workflowGateDefectsCaught: "Workflow gate defects",
        escapedDefectCount: "Escaped defects",
        repairLoopCount: "Repair loops",
        firstPassQualityScore: "First-pass quality"
      },
      artifactInventoryLabels: {
        runType: "Run type",
        dataSource: "Data source",
        confidence: "Confidence",
        totalLines: "Total lines",
        category: "Category",
        baselineFiles: "Baseline files",
        baselineLines: "Baseline lines",
        harnessFiles: "Harness files",
        harnessLines: "Harness lines"
      },
      artifactInventoryCategories: {
        managed_runtime: "Harness managed runtime",
        project_facts: "Project facts",
        product_source_tests: "Product source, tests and UI assets",
        product_docs: "Product docs and handoff",
        scaffold: "Project scaffold",
        raw_artifacts: "Raw artifacts",
        other: "Other"
      },
      confidenceLevelLabels: {
        high: "High",
        "medium-high": "Medium-high",
        medium: "Medium",
        low: "Low",
        mixed: "Mixed",
        unavailable: "Unavailable"
      },
      measurementMethods: {
        observer_measured: {
          label: "External observer",
          body:
            "Measures elapsed time and file activity from outside the agent prompt. The agent under test does not need to maintain a log, so the measurement path stays invisible."
        },
        system_timed_manual_boundary: {
          label: "System timer with manual boundary",
          body:
            "Measures elapsed time from the computer clock, but the agent/operator still labels start and stop boundaries."
        },
        agent_recorded_estimate: {
          label: "Agent-recorded estimate",
          body:
            "Legacy manual minutes recorded during the run. Useful for orientation, but lower confidence than observer-measured data."
        }
      },
      lifecycleEfficiency: {
        label: "Initial delivery vs lifecycle efficiency",
        body:
          "Completed lifecycle pilots should be read as same-quality lifecycle delivery, not first-patch speed. The support-triage pilot is now the strongest conclusion-grade sample: hidden quality tied, but Harness took materially longer. Context-lab also showed slower observer elapsed time for Harness, though its published quality score is lower-confidence static evidence.",
        metrics: [
          { label: "Initial delivery", value: "5.72 / 8.10 min" },
          { label: "Fresh-agent recovery", value: "1.19 / 2.29 min" },
          { label: "RFC + debug fix", value: "5.35 / 8.77 min" },
          { label: "Total lifecycle", value: "12.26 / 19.16 min" }
        ]
      },
      contextContinuity: {
        label: "Context continuity",
        body:
          "Context continuity remains diagnostic rather than conclusion-grade. Context-lab tied at 6/6 on an operator-recorded checkpoint, and support-triage tied at 3/4 with hidden answer-key scoring. Neither proves a high-confidence recovery advantage yet.",
        metrics: [
          { label: "Recovery quiz", value: "6/6 both" },
          { label: "Wrong-path count", value: "0 both" },
          { label: "Final quality", value: "17/17 PASS both" }
        ]
      },
      keyFinding: {
        eyebrow: "Key Finding",
        headline: "Current public evidence does not show Harness is faster.",
        body:
          "Three public scenarios are now completed. The strongest conclusion-grade evidence is negative for Harness speed: support-triage-board reached 12/12 PASS on both paths with hidden quality probes, while observer-measured elapsed time was 26.9158 min baseline vs 48.4984 min Harness. project-context-recovery-lab also has observer-measured elapsed time against Harness, and expense-policy-engine remains a low-confidence legacy cost sample. These results make gate cost and workflow thickness the next priority before seeking more favorable high-complexity wins.",
        points: [
          "Efficiency: conclusion-grade support-triage data shows Harness was materially slower at the same hidden quality bar.",
          "Quality: support-triage reached 12/12 PASS on both paths with hidden probes, so the elapsed-time comparison is same-quality evidence.",
          "Gate value: Harness recorded gate findings, but those are operator-recorded diagnostic evidence and do not yet prove gate net value.",
          "Automation burden and context recovery: current records are diagnostic or unavailable, not high-confidence conclusions.",
          "Gate thinning: current best tradeoff is Standard Thin, not keep-current and not gate deletion."
        ]
      },
      evidenceMetrics: [
        {
          id: "efficiency",
          label: "Efficiency finding",
          value: "Not proven faster",
          detail: "Support: 26.9158 min baseline vs 48.4984 min Harness.",
          help:
            "This answers the speed/efficiency question for the support gate-value pilot. Because both paths passed the hidden quality probe and Harness took more observer-measured elapsed time, this is conclusion-grade evidence against a faster-or-more-efficient claim for this scenario.",
          tone: "warn"
        },
        {
          id: "quality",
          label: "Quality result",
          value: "12/12 PASS both",
          detail: "Support-triage hidden quality probe passed on both paths.",
          help:
            "Both support-triage paths passed the same hidden black-box quality probe after staged RFC/debug work. That makes product quality conclusion-grade for this scenario; static rubric and recovery scoring remain supplemental.",
          tone: "good"
        },
        {
          id: "workflow_control",
          label: "Harness workflow control",
          value: "Diagnostic only",
          detail: "Gate findings were operator-recorded, not conclusion-grade.",
          help:
            "Workflow control is time spent operating the workflow itself. Support-triage recorded gate findings, but the evidence is operator-recorded and therefore diagnostic. It can motivate gate thinning analysis, but cannot by itself prove gate net value.",
          tone: "warn"
        },
        {
          id: "handoff_artifacts",
          label: "Durable handoff",
          value: "Present",
          detail: "Harness left work_products, RFC notes, runbook, and test/implementation records.",
          help:
            "These are the extra materials Harness produced for later recovery, RFC handling, testing, and implementation review. They are visible benefits, but this pilot did not convert them into lower elapsed time.",
          tone: "good"
        },
        {
          id: "confidence",
          label: "Conclusion confidence",
          value: "Split by metric",
          detail: "Elapsed time and hidden support quality are high; gate/context metrics are not.",
          help:
            "Conclusion confidence is checked per metric. Support elapsed time and hidden product quality are high-confidence; gate value, human intervention and context recovery remain diagnostic until they are measured with stronger objective evidence.",
          tone: "neutral"
        },
        {
          id: "coverage",
          label: "Scenario coverage",
          value: "3/4 formal",
          detail: "Expense, context recovery, and support are complete; webhook remains pending.",
          help:
            "Three scenarios now have formal baseline and Harness results. The webhook-provider scenario still needs a clean staged run before broad high-risk boundary claims are closed.",
          tone: "neutral"
        }
      ],
      evidenceStatus:
        "expense-policy-engine, project-context-recovery-lab and support-triage-board are formal completed samples. The strongest conclusion-grade sample is support-triage-board: both paths passed hidden quality, but Harness was about 1.8x slower. Gate value and automation-burden records remain diagnostic or unavailable, so they should guide workflow iteration rather than support a gate net-value claim.",
      metricTemplates: {
        total: "{value} total",
        workflowControl: "{value} workflow control"
      },
      costLabels: {
        baselineTotal: "Baseline total",
        harnessTotal: "Harness total",
        harnessWorkflowControl: "Harness workflow control"
      },
      minuteUnit: "min",
      unavailable: "unavailable",
      workflowFootnote:
        "Workflow control includes orientation, lifecycle/plan handling, gates, transitions, and source/overview drift work.",
      openRunSummary: "Open run summary",
      pending: {
        noRun: "No scored run yet.",
        body:
          "This scenario is part of the complexity/risk coverage, but it is still pending. The report should not claim efficiency conclusions for this class of work until both baseline and Harness paths run against the same quality bar."
      },
      rawArtifactFootnote:
        "Raw generated projects and long transcripts are intentionally excluded from git. Public summaries live in this directory; run artifacts stay under .artifacts/delivery-benchmark/.",
      caveats: [
        "This benchmark compares same-quality delivery, not first-patch speed.",
        "The completed public runs do not prove Harness is faster or more efficient.",
        "Only high-confidence metrics are conclusion-grade. Medium, low, mixed and unavailable metrics are diagnostic only.",
        "The support-triage-board pilot is the strongest current conclusion-grade sample: hidden quality tied at 12/12, but Harness took 48.4984 min vs 26.9158 min baseline.",
        "High-signal scenarios are designed to expose Harness strengths, not to hide speed costs or lower the baseline standard.",
        "The project-context-recovery-lab pilot used staged injection and external observer measurement, but the result is negative for Harness elapsed-time efficiency.",
        "The context pilot's elapsed-time totals are high-confidence observer data; its quality and recovery scores are still static/operator-scored evidence, not hidden-probe evidence.",
        "Support gate findings are operator-recorded diagnostic evidence. They motivate gate-thinning analysis but do not prove gate net value.",
        "Current gate-thinning recommendation is Standard Thin: focused product gates inside the loop, strict workflow gates at completion/phase/release/package boundaries, and strict gates for high-risk work.",
        "Automation burden and escaped-defect metrics remain unavailable where operator prompts or escaped defects were not explicitly recorded.",
        "The Harness initial delivery timer was split after a CLI output stream interruption, so treat its phase split as operational evidence; the total observer elapsed time is the stronger cost signal.",
        "The expense-policy-engine run still uses legacy agent-recorded workflow control cost estimates.",
        "Raw temporary projects and transcripts stay outside git under .artifacts/."
      ]
    },
    zh: {
      languageName: "中文",
      documentTitle: "交付可靠性基准测试",
      title: "交付可靠性基准测试",
      lede:
        "这里展示的是 AI SDLC Harness 对同等质量交付是否有帮助，尤其关注项目复杂度和交接风险升高后的表现。",
      generatedLabel: "生成时间",
      scenarioNavLabel: "Benchmark 场景",
      languageSwitchLabel: "报告语言",
      status: {
        completed: "已完成",
        pending: "待运行"
      },
      decisions: {
        pass: "PASS",
        warn: "WARN"
      },
      headings: {
        scenarioDetail: "项目说明",
        measurement: "测量方式",
        metricConfidence: "指标置信度",
        automationBurden: "自动化负担",
        gateValue: "Gate 价值",
        gateThinning: "Gate 打薄建议",
        scorecard: "记分卡",
        quality: "质量热力图",
        artifact: "Harness 产物地图",
        artifactInventory: "产物数量拆解",
        cost: "成本对比",
        lifecycle: "生命周期效率",
        context: "上下文连续性",
        interpretation: "如何阅读这些数据",
        caveats: "证据边界"
      },
      scenarioBriefLabels: {
        whatItBuilds: "这个项目做什么",
        userWorkflow: "主要使用流程",
        complexitySignals: "覆盖的复杂度与风险",
        midstreamChange: "变更 / 恢复压力",
        expectedAdvantage: "预期能证明的 Harness 优势"
      },
      measurementConfidenceLabel: "成本置信度",
      metricConfidenceIntro:
        "不是每个 benchmark 数字都有同样强的证据。这里约定只有高置信度指标可以进入核心结论；中、低、混合或不可用指标只能作为诊断线索，不能用来证明 Harness 更高效、gate 有净价值、自动化负担更低或上下文恢复更强。",
      metricConfidenceGroups: {
        conclusion: "结论级指标",
        diagnostic: "诊断级指标"
      },
      conclusionEligibilityLabels: {
        eligible: "结论级",
        diagnostic: "诊断级"
      },
      automationBurdenIntro:
        "这里衡量 benchmark prompt 已注入之后，operator 额外补了多少计划外提示。初始 prompt 和 recovery/RFC/debug 分段注入不计入人工介入。",
      gateValueIntro:
        "这里衡量 gate 是否真的创造质量价值：是否提前抓到缺陷、减少修复循环，或阻止本来会逃逸到最终结果的问题。",
      gateThinningRecommendation: {
        label: "推荐厚度：Standard Thin",
        body:
          "当前证据支持打薄默认 workflow gate，而不是删除 gate。循环内保留 focused product quality gate；严格 workflow gate 放到 task completion、pre-commit、phase transition、release 和 package/source 变更边界；高风险 provider/live 任务继续 strict。",
        metrics: [
          { label: "好处", value: "降低普通任务拖累" },
          { label: "坏处", value: "workflow 漂移更晚暴露" },
          { label: "性价比", value: "产品质量仍严格" },
          { label: "为什么", value: "减少重复成本但保留边界" }
        ]
      },
      automationBurdenLabels: {
        interventionCount: "人工介入次数",
        operatorPromptChars: "额外提示字符数",
        operatorPromptWords: "额外提示词数",
        repairLoopCount: "修复循环数"
      },
      gateValueLabels: {
        defectsCaught: "捕获缺陷数",
        productGateDefectsCaught: "产品 gate 捕获",
        workflowGateDefectsCaught: "工作流 gate 捕获",
        escapedDefectCount: "逃逸缺陷数",
        repairLoopCount: "修复循环数",
        firstPassQualityScore: "首轮质量分"
      },
      artifactInventoryLabels: {
        runType: "运行类型",
        dataSource: "数据源",
        confidence: "置信度",
        totalLines: "总行数",
        category: "类别",
        baselineFiles: "Baseline 文件数",
        baselineLines: "Baseline 行数",
        harnessFiles: "Harness 文件数",
        harnessLines: "Harness 行数"
      },
      artifactInventoryCategories: {
        managed_runtime: "Harness managed runtime",
        project_facts: "项目事实源",
        product_source_tests: "产品源码、测试和 UI 资产",
        product_docs: "产品文档和交接材料",
        scaffold: "项目脚手架",
        raw_artifacts: "原始运行产物",
        other: "其它"
      },
      confidenceLevelLabels: {
        high: "高",
        "medium-high": "中高",
        medium: "中",
        low: "低",
        mixed: "混合",
        unavailable: "不可用"
      },
      measurementMethods: {
        observer_measured: {
          label: "外部 observer",
          body:
            "从 agent prompt 外部测量总耗时和文件活动。被测 agent 不需要维护日志，因此观测路径对它不可见。"
        },
        system_timed_manual_boundary: {
          label: "系统计时 + 人工边界",
          body:
            "用电脑时钟测量耗时，但开始/结束边界仍由 agent 或 operator 标注。"
        },
        agent_recorded_estimate: {
          label: "Agent 记录估算",
          body:
            "历史运行里手动记录的分钟数。它能帮助理解过程，但置信度低于外部 observer 的客观测量。"
        }
      },
      lifecycleEfficiency: {
        label: "首轮交付 vs 生命周期效率",
        body:
          "已完成的 lifecycle pilot 应按同等质量生命周期效率阅读，不是首轮代码速度。Support-triage 现在是最强的结论级样本：hidden quality 打平，但 Harness 总耗时明显更长。Context-lab 的 observer 总耗时也对 Harness 不利，但它公开质量分仍是低置信度静态证据。",
        metrics: [
          { label: "首轮交付", value: "5.72 / 8.10 分钟" },
          { label: "新对话恢复", value: "1.19 / 2.29 分钟" },
          { label: "RFC + debug 修复", value: "5.35 / 8.77 分钟" },
          { label: "生命周期总耗时", value: "12.26 / 19.16 分钟" }
        ]
      },
      contextContinuity: {
        label: "上下文连续性",
        body:
          "上下文连续性目前仍是诊断级，而不是结论级。Context-lab 的新对话恢复在 operator-recorded checkpoint 上双方 6/6；support-triage 用 hidden answer key 评分双方 3/4。它们都还不能高置信证明恢复优势。",
        metrics: [
          { label: "恢复问答", value: "双方均 6/6" },
          { label: "走错路径次数", value: "双方均 0" },
          { label: "最终质量", value: "双方均 17/17 PASS" }
        ]
      },
      keyFinding: {
        eyebrow: "核心结论",
        headline: "当前公开证据尚不能证明 Harness 更快或更高效。",
        body:
          "现在有三个正式 completed 场景。最强的结论级证据对 Harness 速度不利：support-triage-board 两条路径都通过 hidden quality probe，都是 12/12 PASS，但外部 observer 测到 Baseline 26.9158 分钟、Harness 48.4984 分钟。project-context-recovery-lab 的 observer 总耗时同样对 Harness 不利；expense-policy-engine 仍是低置信度历史成本样本。这说明下一步应该优先分析 gate 成本和工作流厚度，而不是只继续寻找更有利的高复杂度场景。",
        points: [
          "效率：support-triage 的结论级数据说明，在同等 hidden quality 下 Harness 明显更慢。",
          "质量：support-triage 两条路径都通过 12/12 hidden probe，因此耗时对比具备同等质量前提。",
          "Gate 价值：Harness 记录到 gate finding，但它们是 operator-recorded 诊断证据，还不能证明 gate 净价值。",
          "自动化负担和上下文恢复：当前证据仍是诊断级或不可用，不能当作高置信结论。",
          "Gate 打薄：当前最高性价比是 Standard Thin，而不是保持现状或删除 gate。"
        ]
      },
      evidenceMetrics: [
        {
          id: "efficiency",
          label: "效率结论",
          value: "尚不能证明更快",
          detail: "Support：Baseline 26.9158 分钟，Harness 48.4984 分钟。",
          help:
            "这一项回答“是否更快/更高效”。support gate-value pilot 里，两条路径都通过 hidden quality probe，但 Harness 的外部 observer 总耗时高于 Baseline，所以它是反对“更快/更高效”结论的结论级证据。",
          tone: "warn"
        },
        {
          id: "quality",
          label: "质量结果",
          value: "双方均 12/12 PASS",
          detail: "Support-triage hidden quality probe 双方均通过。",
          help:
            "Support-triage 两条路径在 staged RFC/debug 后都通过同一套隐藏黑盒质量 probe。这让产品质量在这个场景里具备结论级证据；静态 rubric 和 recovery score 仍是补充证据。",
          tone: "good"
        },
        {
          id: "workflow_control",
          label: "Harness 工作流控制成本",
          value: "仅诊断",
          detail: "Gate finding 是 operator-recorded，不是结论级。",
          help:
            "工作流控制成本指操作工作流本身花掉的时间。Support-triage 记录了 gate finding，但它们是 operator-recorded 诊断证据，可以用来分析 gate 打薄，不足以证明 gate 净价值。",
          tone: "warn"
        },
        {
          id: "handoff_artifacts",
          label: "长期交接产物",
          value: "有",
          detail: "Harness 留下 work_products、RFC 记录、runbook、测试和实现记录。",
          help:
            "这些是 Harness 额外留下的可复用材料，用来支撑后续恢复、RFC 处理、测试和实现 review。它们是可见收益，但这次 pilot 没有把这些收益转化成更短耗时。",
          tone: "good"
        },
        {
          id: "confidence",
          label: "结论置信度",
          value: "按指标拆分",
          detail: "耗时和 support 隐藏质量为高；gate/context 不是。",
          help:
            "结论置信度按指标判断。Support 的总耗时和隐藏产品质量是高置信度；Gate 价值、人工介入和上下文恢复目前仍是诊断级，除非后续用更客观的记录链路升级。",
          tone: "neutral"
        },
        {
          id: "coverage",
          label: "场景覆盖",
          value: "3/4 正式完成",
          detail: "expense、context recovery 和 support 已完成；webhook 待运行。",
          help:
            "目前有三个场景完成正式 baseline 和 Harness 双路径。Webhook Provider 还没完成 clean staged run，所以高风险边界场景的整体效率结论还不能提前下结论。",
          tone: "neutral"
        }
      ],
      evidenceStatus:
        "费用报销政策引擎、Project Context Recovery Lab 和 Support SLA Escalation Desk 都是正式 completed 样本。最强的结论级样本是 support-triage-board：两条路径都通过 hidden quality，但 Harness 约慢 1.8 倍。Gate 价值和自动化负担仍是诊断级或不可用，应该作为 workflow 迭代输入，而不是当作 gate 净价值证明。",
      metricTemplates: {
        total: "总计 {value}",
        workflowControl: "工作流控制成本 {value}"
      },
      costLabels: {
        baselineTotal: "Baseline 总耗时",
        harnessTotal: "Harness 总耗时",
        harnessWorkflowControl: "Harness 工作流控制成本"
      },
      minuteUnit: "分钟",
      unavailable: "不可用",
      workflowFootnote:
        "工作流控制成本包括定位上下文、处理 lifecycle/plan、运行 gate、阶段流转，以及处理 source/overview drift 等工作。",
      openRunSummary: "打开本次运行摘要",
      pending: {
        noRun: "暂无评分运行。",
        body:
          "这个场景用于补足复杂度和风险覆盖，但目前仍待运行。在 baseline 和 Harness 都按同一质量标准完成前，不能提前声明这类工作的效率结论。"
      },
      rawArtifactFootnote:
        "原始生成项目和长转录不会提交到 git。公开摘要保留在当前目录，运行产物保留在 .artifacts/delivery-benchmark/。",
      caveats: [
        "这个基准测试比较的是同等质量交付，不是首轮代码生成速度。",
        "已完成公开样本不能证明 Harness 更快或更高效；新的 lifecycle pilot 反而显示 Harness 更慢。",
        "只有高置信度指标是结论级；中、低、混合和不可用指标都只能作为诊断线索。",
        "Support-triage-board 是当前最强的结论级样本：hidden quality 双方 12/12，但 Harness 48.4984 分钟，Baseline 26.9158 分钟。",
        "高信号场景是为了对准 Harness 的设计优势，不是为了掩盖速度成本或降低 baseline 标准。",
        "Project Context Recovery Lab 使用 staged injection 和外部 observer 测量，结果可以发布，但它对 Harness 的耗时效率是负向证据。",
        "Context pilot 的总耗时是高置信度 observer 数据；质量分和恢复分仍是静态 / operator 评分证据，不是 hidden-probe 证据。",
        "Support gate finding 是 operator-recorded 诊断证据，可以驱动 gate 打薄分析，但不能证明 gate 净价值。",
        "当前 gate 打薄建议是 Standard Thin：循环内 focused product gate，completion/phase/release/package 边界 strict workflow gate，高风险任务继续 strict。",
        "没有显式记录 operator 额外提示或 escaped defect 的地方，自动化负担和逃逸缺陷指标必须保持不可用。",
        "Harness 首轮交付计时因为 CLI 输出流中断被拆成两段；阶段拆分按操作证据阅读，总耗时以 observer elapsed time 为更强信号。",
        "费用报销政策引擎仍使用历史 agent-recorded 工作流控制成本估算。",
        "临时项目和原始转录保留在 .artifacts/ 之外，不进入 git。"
      ]
    }
  },
  scenarios: [
    {
      id: "expense-policy-engine",
      status: "completed",
      runId: "20260601-174424",
      summaryPath: "expense-policy-engine-20260601-174424.md",
      measurement: {
        confidence: "low",
        methods: ["agent_recorded_estimate"],
        copy: {
          en: {
            label: "Legacy measurement",
            confidence: "low",
            body:
              "This run was completed before the external observer existed. Its elapsed minutes remain legacy agent-recorded estimates, so the report does not treat them as observer-measured."
          },
          zh: {
            label: "历史测量方式",
            confidence: "低",
            body:
              "这次运行完成时外部 observer 还不存在。它的分钟数仍然是历史 agent-recorded estimate，所以报告不会把它当作 observer-measured 数据。"
          }
        }
      },
      metricConfidence: [
        {
          id: "elapsed_time",
          level: "low",
          conclusionEligible: false,
          dataSource: "agent_recorded_estimate",
          copy: {
            en: {
              label: "Elapsed time",
              explanation: "The 25 vs 53 min cost came from legacy agent-recorded estimates, not external telemetry."
            },
            zh: {
              label: "总耗时",
              explanation: "25 vs 53 分钟来自历史 agent-recorded estimate，不是外部 telemetry。"
            }
          }
        },
        {
          id: "quality_score",
          level: "low",
          conclusionEligible: false,
          dataSource: "static_keyword_path_rubric",
          copy: {
            en: {
              label: "Quality score",
              explanation: "The 13/13 score is based on static path/keyword evidence and should be read as supplemental, not a hidden behavioral probe."
            },
            zh: {
              label: "质量分",
              explanation: "13/13 来自静态 path/keyword evidence，应作为补充证据阅读，不是隐藏行为 probe。"
            }
          }
        },
        {
          id: "context_recovery",
          level: "unavailable",
          conclusionEligible: false,
          dataSource: "unavailable",
          copy: {
            en: {
              label: "Context recovery",
              explanation: "This historical run did not include the new hidden answer-key recovery scoring path."
            },
            zh: {
              label: "上下文恢复",
              explanation: "这个历史样本没有使用新的隐藏 answer key recovery 评分路径。"
            }
          }
        },
        {
          id: "gate_value",
          level: "unavailable",
          conclusionEligible: false,
          dataSource: "unavailable",
          copy: {
            en: {
              label: "Gate value",
              explanation: "This historical run did not record gate findings, escaped defects, or repair loops."
            },
            zh: {
              label: "Gate 价值",
              explanation: "这个历史样本没有记录 gate finding、escaped defect 或 repair loop。"
            }
          }
        },
        {
          id: "human_intervention",
          level: "unavailable",
          conclusionEligible: false,
          dataSource: "unavailable",
          copy: {
            en: {
              label: "Human intervention",
              explanation: "This historical run did not record out-of-protocol operator prompt count or prompt size."
            },
            zh: {
              label: "人工介入",
              explanation: "这个历史样本没有记录协议之外的 operator 提示次数或提示词字数。"
            }
          }
        },
        {
          id: "prompt_ledger",
          level: "unavailable",
          conclusionEligible: false,
          dataSource: "unavailable",
          copy: {
            en: {
              label: "Prompt ledger",
              explanation: "This historical run did not record protocol or operator prompt fingerprints in prompts.ndjson."
            },
            zh: {
              label: "Prompt ledger",
              explanation: "这个历史样本没有在 prompts.ndjson 中记录协议 prompt 或 operator prompt 指纹。"
            }
          }
        }
      ],
      automationBurden: {
        status: "unrecorded",
        metrics: {
          interventionCount: null,
          operatorPromptChars: null,
          operatorPromptWords: null,
          repairLoopCount: null
        },
        copy: {
          en: {
            body:
              "This historical run did not record out-of-protocol operator interventions, so it cannot support an automation-burden conclusion."
          },
          zh: {
            body:
              "这个历史样本没有记录协议之外的 operator 额外介入，因此不能用来判断自动化负担。"
          }
        }
      },
      gateValue: {
        status: "unrecorded",
        metrics: {
          defectsCaught: null,
          productGateDefectsCaught: null,
          workflowGateDefectsCaught: null,
          escapedDefectCount: null,
          repairLoopCount: null,
          firstPassQualityScore: null
        },
        copy: {
          en: {
            body:
              "This run did not record gate findings, first-pass hidden probe failures, escaped defects, or repair loops."
          },
          zh: {
            body:
              "这次运行没有记录 gate finding、first-pass hidden probe failure、escaped defect 或 repair loop。"
          }
        }
      },
      copy: {
        en: {
          name: "Expense Policy Engine",
          shape: "CLI/library policy engine",
          mainRisk: "Acceptance criteria, RFC impact, audit trail, fresh-session recovery",
          projectBrief: {
            whatItBuilds:
              "A reimbursement policy decision engine that can run as a CLI or library. It reads JSON from a file/stdin and returns an approval decision, reason code, user-facing message, and audit trail.",
            userWorkflow:
              "An operator feeds an expense claim into the tool and expects a deterministic JSON decision that explains whether the claim is approved, rejected, or needs review.",
            complexitySignals:
              "The scenario checks policy limits by employee level and jurisdiction, receipt rules, weekend travel review, structured invalid-input errors, smoke tests, and recovery notes.",
            midstreamChange:
              "A midstream RFC renames region to jurisdiction while keeping the deprecated region alias and making auditTrail use the new jurisdiction language."
          }
        },
        zh: {
          name: "费用报销政策引擎",
          shape: "CLI / library 形式的规则引擎",
          mainRisk: "验收标准、变更影响、审计记录、跨会话恢复",
          projectBrief: {
            whatItBuilds:
              "一个费用报销政策判定引擎，可以作为 CLI 或 library 使用。它从文件或 stdin 读取 JSON，输出是否通过、原因码、给用户看的说明，以及 audit trail。",
            userWorkflow:
              "使用者把一笔报销申请交给工具，期望拿到稳定的 JSON 判定结果，并能看懂为什么通过、拒绝或需要人工复核。",
            complexitySignals:
              "这个场景会检查不同职级和 jurisdiction 的费用上限、收据规则、周末差旅复核、结构化非法输入错误、smoke 测试和恢复备注。",
            midstreamChange:
              "中途变更把 region 改名为 jurisdiction，同时要求继续兼容旧的 region alias，并让 auditTrail 使用新的 jurisdiction 语义。"
          }
        }
      },
      modes: {
        baseline: {
          scorePassed: 13,
          scoreTotal: 13,
          decision: "pass",
          totalDeliveryMinutes: 25,
          workflowControlMinutes: null,
          copy: {
            en: {
              label: "Baseline",
              notes: "Plain AI coding path with transcript, tests, smoke, and recovery notes."
            },
            zh: {
              label: "Baseline",
              notes: "直接编码路径，保留了转录、测试、smoke 和恢复备注。"
            }
          }
        },
        harness: {
          scorePassed: 13,
          scoreTotal: 13,
          decision: "pass",
          totalDeliveryMinutes: 53,
          workflowControlMinutes: 29,
          copy: {
            en: {
              label: "AI SDLC Harness",
              notes: "Full Harness lifecycle from init through COMPLETED with local git remote push simulation."
            },
            zh: {
              label: "AI SDLC Harness",
              notes: "完整跑完 Harness 生命周期，从 init 到 COMPLETED，并包含本地 git remote push 模拟。"
            }
          }
        }
      },
      sections: [
        {
          id: "acceptance",
          passed: 10,
          total: 10,
          copy: { en: { label: "Acceptance" }, zh: { label: "验收" } }
        },
        {
          id: "change_impact",
          passed: 2,
          total: 2,
          copy: { en: { label: "Change Impact" }, zh: { label: "变更影响" } }
        },
        {
          id: "handoff",
          passed: 1,
          total: 1,
          copy: { en: { label: "Handoff" }, zh: { label: "交接" } }
        }
      ],
      artifacts: [
        {
          id: "prd",
          copy: {
            en: { label: "PRD", purpose: "Locks product goals, acceptance criteria, and out-of-scope boundaries." },
            zh: { label: "PRD", purpose: "固定产品目标、验收标准和不做什么。" }
          }
        },
        {
          id: "cli_ux_contract",
          copy: {
            en: { label: "CLI UX Contract", purpose: "Turns CLI/API behavior into testable entry, error, success, and handoff states." },
            zh: { label: "CLI UX Contract", purpose: "把 CLI/API 行为写成可测试的入口、错误、成功和交接状态。" }
          }
        },
        {
          id: "architecture",
          copy: {
            en: { label: "Architecture", purpose: "Separates CLI, validator, policy decision, and audit boundaries." },
            zh: { label: "Architecture", purpose: "拆清 CLI、校验器、策略决策和审计边界。" }
          }
        },
        {
          id: "technical_plan",
          copy: {
            en: { label: "Technical Plan", purpose: "Defines interfaces, data model, task breakdown, and self-test contract." },
            zh: { label: "Technical Plan", purpose: "定义接口、数据模型、任务拆分和自测合同。" }
          }
        },
        {
          id: "implementation_work_product",
          copy: {
            en: { label: "Implementation Doc", purpose: "Records runnable entry/exit, development evidence, and verification." },
            zh: { label: "Implementation Doc", purpose: "记录可运行入口/出口、开发证据和验证结果。" }
          }
        },
        {
          id: "runbook",
          copy: {
            en: { label: "Runbook", purpose: "Captures recovery next action and hard constraints." },
            zh: { label: "Runbook", purpose: "记录恢复时下一步该做什么，以及不能重试什么。" }
          }
        },
        {
          id: "review_report",
          copy: {
            en: { label: "Review Report", purpose: "Checks requirements, entry/exit readiness, test gaps, and risk." },
            zh: { label: "Review Report", purpose: "检查需求符合度、入口/出口就绪度、测试缺口和风险。" }
          }
        },
        {
          id: "test_report",
          copy: {
            en: { label: "Test Report", purpose: "Records regression matrix, evidence, coverage gaps, and final decision." },
            zh: { label: "Test Report", purpose: "记录回归矩阵、证据、覆盖缺口和最终结论。" }
          }
        },
        {
          id: "release_status",
          copy: {
            en: { label: "Release Status", purpose: "Summarizes build, smoke, deployment checklist, rollback, and known limits." },
            zh: { label: "Release Status", purpose: "汇总 build、smoke、部署检查、回滚方式和已知限制。" }
          }
        }
      ],
      interpretation: {
        en: [
          "Read the speed question first: this run does not prove Harness is faster.",
          "Read the quality question next: both paths reached the same 13/13 result.",
          "Read the workflow value as handoff and recovery evidence that may matter more on larger or riskier work.",
          "Wait for the pending scenarios before making broad complex-project efficiency claims."
        ],
        zh: [
          "先看速度问题：这次 completed run 不能证明 Harness 更快。",
          "再看质量问题：两条路径都达到同一个 13/13 结果。",
          "再看流程价值：Harness 多出来的是交接和恢复证据，这类收益可能在更大或更高风险的任务里更重要。",
          "复杂项目是否整体更高效，要等 pending 场景跑完后再判断。"
        ]
      }
    },
    {
      id: "project-context-recovery-lab",
      status: "completed",
      runId: "20260602-033759",
      summaryPath: "project-context-recovery-lab-20260602-033759.md",
      measurement: {
        confidence: "high",
        methods: ["observer_measured", "system_timed_manual_boundary"],
        copy: {
          en: {
            label: "External observer lifecycle measurement",
            confidence: "high for elapsed time",
            body:
              "The clean staged pilot used an external observer for total elapsed time and system timers for phase boundaries. Baseline and Harness both ran the same staged recovery/RFC/debug protocol. Harness initial delivery was split after a CLI output stream interruption, so the total observer elapsed time is the stronger cost signal than any one phase split."
          },
          zh: {
            label: "外部 observer 生命周期测量",
            confidence: "总耗时高置信度",
            body:
              "这次 clean staged pilot 使用外部 observer 测总耗时，并用系统计时记录阶段边界。Baseline 和 Harness 都按同一套 recovery/RFC/debug 分段协议运行。Harness 首轮交付因为 CLI 输出流中断被拆成两段，所以总耗时比单个阶段拆分更值得信任。"
          }
        }
      },
      metricConfidence: [
        {
          id: "elapsed_time",
          level: "high",
          conclusionEligible: true,
          dataSource: "observer_measured",
          copy: {
            en: {
              label: "Elapsed time",
              explanation: "The 14.0196 vs 21.0036 min totals came from an external observer outside the measured agent prompt."
            },
            zh: {
              label: "总耗时",
              explanation: "14.0196 vs 21.0036 分钟来自被测 agent prompt 外部的 observer。"
            }
          }
        },
        {
          id: "quality_score",
          level: "low",
          conclusionEligible: false,
          dataSource: "static_keyword_path_rubric",
          copy: {
            en: {
              label: "Quality score",
              explanation: "The published 17/17 score still comes from static rubric evidence; the hidden quality probe was added after this run and does not retroactively upgrade it."
            },
            zh: {
              label: "质量分",
              explanation: "公开的 17/17 仍来自静态 rubric evidence；隐藏 quality probe 是这次之后补上的，不能倒推升级旧分数。"
            }
          }
        },
        {
          id: "context_recovery",
          level: "medium",
          conclusionEligible: false,
          dataSource: "operator_recorded_checkpoint_score",
          copy: {
            en: {
              label: "Context recovery",
              explanation: "The 6/6 recovery score was operator-recorded from a visible checkpoint, not yet scored by the hidden answer-key workflow."
            },
            zh: {
              label: "上下文恢复",
              explanation: "6/6 是 operator 根据可见 checkpoint 记录的分数，还不是隐藏 answer key 工作流评分。"
            }
          }
        },
        {
          id: "gate_value",
          level: "unavailable",
          conclusionEligible: false,
          dataSource: "unavailable",
          copy: {
            en: {
              label: "Gate value",
              explanation: "This pilot did not record first-pass hidden probe failures, defects caught by gates, escaped defects, or repair loops."
            },
            zh: {
              label: "Gate 价值",
              explanation: "这次 pilot 没有记录 first-pass hidden probe failure、gate 捕获缺陷、escaped defect 或 repair loop。"
            }
          }
        },
        {
          id: "human_intervention",
          level: "unavailable",
          conclusionEligible: false,
          dataSource: "unavailable",
          copy: {
            en: {
              label: "Human intervention",
              explanation: "Operator intervention count and prompt-size metrics start with the next support-triage gate-value pilot."
            },
            zh: {
              label: "人工介入",
              explanation: "operator 介入次数和提示词字数指标会从下一轮 support-triage gate-value pilot 开始记录。"
            }
          }
        },
        {
          id: "prompt_ledger",
          level: "unavailable",
          conclusionEligible: false,
          dataSource: "unavailable",
          copy: {
            en: {
              label: "Prompt ledger",
              explanation: "This pilot ran before prompt fingerprints were written to prompts.ndjson."
            },
            zh: {
              label: "Prompt ledger",
              explanation: "这次 pilot 发生时还没有把 prompt 指纹写入 prompts.ndjson。"
            }
          }
        }
      ],
      automationBurden: {
        status: "unrecorded",
        metrics: {
          interventionCount: null,
          operatorPromptChars: null,
          operatorPromptWords: null,
          repairLoopCount: null
        },
        copy: {
          en: {
            body:
              "The clean context pilot did not record operator intervention count or prompt-size metrics. Do not infer low automation burden from missing data."
          },
          zh: {
            body:
              "这次 clean context pilot 没有记录 operator 介入次数或额外提示词字数。不能把缺失数据解读成自动化负担低。"
          }
        }
      },
      gateValue: {
        status: "unrecorded",
        metrics: {
          defectsCaught: null,
          productGateDefectsCaught: null,
          workflowGateDefectsCaught: null,
          escapedDefectCount: null,
          repairLoopCount: null,
          firstPassQualityScore: null
        },
        copy: {
          en: {
            body:
              "This pilot measured elapsed time and final quality, but did not record whether gates caught defects before they escaped. Gate value remains unproven here."
          },
          zh: {
            body:
              "这次 pilot 测了总耗时和最终质量，但没有记录 gate 是否提前抓住缺陷。这里不能证明 gate 净价值。"
          }
        }
      },
      modes: {
        baseline: {
          scorePassed: 17,
          scoreTotal: 17,
          decision: "pass",
          totalDeliveryMinutes: 14.0196,
          workflowControlMinutes: null,
          copy: {
            en: {
              label: "Baseline",
              notes: "Clean staged lifecycle run with external observer measurement; no Harness validators or self-maintained benchmark log."
            },
            zh: {
              label: "Baseline",
              notes: "clean staged lifecycle run，由外部 observer 测量；不运行 Harness validator，也不要求自写 benchmark 日志。"
            }
          }
        },
        harness: {
          scorePassed: 17,
          scoreTotal: 17,
          decision: "pass",
          totalDeliveryMinutes: 21.0036,
          workflowControlMinutes: null,
          copy: {
            en: {
              label: "AI SDLC Harness",
              notes: "Clean staged lifecycle run with Harness fast path and external observer measurement; workflow-control minutes were not separately tagged."
            },
            zh: {
              label: "AI SDLC Harness",
              notes: "clean staged lifecycle run，使用 Harness fast path 和外部 observer；本次没有单独标注 workflow-control 分钟数。"
            }
          }
        }
      },
      sections: [
        {
          id: "acceptance",
          passed: 8,
          total: 8,
          copy: { en: { label: "Acceptance" }, zh: { label: "验收" } }
        },
        {
          id: "context_recovery",
          passed: 4,
          total: 4,
          copy: { en: { label: "Context Recovery" }, zh: { label: "上下文恢复" } }
        },
        {
          id: "rfc_debug",
          passed: 4,
          total: 4,
          copy: { en: { label: "RFC / Debug" }, zh: { label: "RFC / Debug" } }
        },
        {
          id: "handoff",
          passed: 1,
          total: 1,
          copy: { en: { label: "Handoff" }, zh: { label: "交接" } }
        }
      ],
      lifecycle: {
        status: "completed",
        metrics: {
          baseline: {
            initialDeliveryMinutes: 5.72,
            recoveryOrientationMinutes: 1.19,
            rfcFixMinutes: 4.26,
            debugFixMinutes: 1.09,
            totalLifecycleMinutes: 12.26,
            contextRecoveryScore: 6,
            contextRecoveryTotal: 6,
            wrongPathCount: 0,
            finalQualityScore: "17/17 PASS"
          },
          harness: {
            initialDeliveryMinutes: 8.1,
            recoveryOrientationMinutes: 2.29,
            rfcFixMinutes: 6.24,
            debugFixMinutes: 2.53,
            totalLifecycleMinutes: 19.16,
            contextRecoveryScore: 6,
            contextRecoveryTotal: 6,
            wrongPathCount: 0,
            finalQualityScore: "17/17 PASS"
          }
        }
      },
      artifacts: [
        {
          id: "work_products",
          copy: {
            en: {
              label: "Work Products",
              purpose: "Captured product, implementation, test, runbook, and RFC facts for fresh-session recovery."
            },
            zh: {
              label: "Work Products",
              purpose: "沉淀产品、实现、测试、runbook 和 RFC 事实，服务新对话恢复。"
            }
          }
        },
        {
          id: "rfc_record",
          copy: {
            en: {
              label: "RFC Record",
              purpose: "Recorded the impactLevel/provider event/permission cascade and the applied repair boundary."
            },
            zh: {
              label: "RFC 记录",
              purpose: "记录 impactLevel、provider event、权限 cascade，以及实际修复边界。"
            }
          }
        },
        {
          id: "test_evidence",
          copy: {
            en: {
              label: "Test Evidence",
              purpose: "Kept local API/domain/UI smoke evidence for the final 17/17 rubric."
            },
            zh: {
              label: "测试证据",
              purpose: "保留 API、domain、UI smoke 证据，对应最终 17/17 rubric。"
            }
          }
        },
        {
          id: "recovery_notes",
          copy: {
            en: {
              label: "Recovery Notes",
              purpose: "Documented entrypoints, current model, provider boundary, and next safe action."
            },
            zh: {
              label: "恢复备注",
              purpose: "记录入口、当前模型、provider 边界和下一步安全动作。"
            }
          }
        }
      ],
      copy: {
        en: {
          name: "Project Context Recovery Lab",
          shape: "Incident Ops Console",
          mainRisk: "Fresh-agent recovery, multi-RFC cascade, debug fix, context continuity",
          projectBrief: {
            whatItBuilds:
              "An Incident Ops Console with an API, browser board, background worker, deterministic mock provider events, retries, dead-letter handling, and audit trail.",
            userWorkflow:
              "An operator creates or imports incidents, reviews the board, assigns owners, moves work through mitigation, processes mock provider events, and checks the audit trail.",
            complexitySignals:
              "This scenario combines multiple runnable entrypoints, frontend state, worker behavior, provider boundaries, idempotency, permissions, RFC churn, debug repair, and fresh-session recovery.",
            midstreamChange:
              "The lifecycle probe pauses after initial delivery for a fresh-agent recovery quiz, then applies the impactLevel/provider-event/permission RFC cascade and a debug fix.",
            expectedAdvantage:
              "This scenario is designed to give Harness room to recover project state faster, score higher on the context recovery quiz, and avoid wrong paths. The clean pilot did not show that advantage: both paths scored 6/6 recovery and 0 wrong paths, while Baseline was faster."
          }
        },
        zh: {
          name: "Project Context Recovery Lab",
          shape: "Incident Ops Console",
          mainRisk: "新对话恢复、多轮 RFC cascade、debug 修复、上下文连续性",
          projectBrief: {
            whatItBuilds:
              "一个 Incident Ops Console，包含 API、浏览器看板、后台 worker、确定性的 mock provider event、retry、dead-letter 和 audit trail。",
            userWorkflow:
              "使用者创建或导入 incident，在看板里分配负责人、推进处置状态，处理 mock provider event，并检查 audit trail。",
            complexitySignals:
              "这个场景同时包含多个可运行入口、前端状态、worker 行为、provider 边界、幂等、权限、多轮 RFC 变更、debug 修复和新会话恢复。",
            midstreamChange:
              "生命周期 probe 会在首轮交付后暂停，让新对话 agent 做恢复问答，然后继续跑 impactLevel / provider event / 权限 RFC cascade 和一个 debug fix。",
            expectedAdvantage:
              "这个场景本来是为了给 Harness 留出优势空间：更快恢复项目状态、更高 context recovery quiz 得分，并减少继续使用 deprecated severity 或乱试 live credentials 这类 wrong path。clean pilot 没有体现这个优势：双方恢复都是 6/6、wrong path 都是 0，Baseline 反而更快。"
          }
        }
      },
      interpretation: {
        en: [
          "This is a clean formal lifecycle pilot, not calibration data.",
          "The quality result is tied: both paths reached 17/17 PASS.",
          "The efficiency result is negative for Harness: Baseline was faster overall and in every measured lifecycle segment.",
          "The context-continuity hypothesis remains plausible for harder or messier work, but it was not demonstrated by this run."
        ],
        zh: [
          "这是一次 clean formal lifecycle pilot，不是 calibration 数字。",
          "质量结果打平：两条路径都是 17/17 PASS。",
          "效率结果对 Harness 不利：Baseline 总耗时更短，并且每个已测生命周期阶段都更快。",
          "上下文连续性的假设在更难、更混乱的任务里仍可能成立，但这次运行没有证明它。"
        ]
      }
    },
    {
      id: "support-triage-board",
      status: "completed",
      runId: "20260602-083512",
      summaryPath: "support-triage-board-20260602-083512.md",
      measurement: {
        confidence: "high",
        methods: ["observer_measured", "system_timed_manual_boundary"],
        copy: {
          en: {
            label: "External observer with hidden quality probe",
            confidence: "high for elapsed time and product quality",
            body:
              "The formal support gate-value pilot used an external observer for total elapsed time and a scenario-owned hidden quality probe after staged RFC/debug work. Both paths reached 12/12 PASS on that hidden probe, while Harness took materially longer."
          },
          zh: {
            label: "外部 observer + 隐藏质量 probe",
            confidence: "总耗时和产品质量均为高置信度",
            body:
              "正式 support gate-value pilot 使用外部 observer 测总耗时，并在 staged RFC/debug 后运行场景自带 hidden quality probe。两条路径都达到 12/12 PASS，但 Harness 总耗时明显更长。"
          }
        }
      },
      metricConfidence: [
        {
          id: "elapsed_time",
          level: "high",
          conclusionEligible: true,
          dataSource: "observer_measured",
          copy: {
            en: {
              label: "Elapsed time",
              explanation: "The 26.9158 vs 48.4984 min totals came from an external observer outside the measured agent prompt, so they are conclusion-grade cost evidence."
            },
            zh: {
              label: "总耗时",
              explanation: "26.9158 vs 48.4984 分钟来自被测 agent prompt 外部的 observer，因此是结论级耗时证据。"
            }
          }
        },
        {
          id: "quality_score",
          level: "high",
          conclusionEligible: true,
          dataSource: "hidden_quality_probe",
          copy: {
            en: {
              label: "Product quality",
              explanation: "Both paths passed the same hidden 12/12 supportDesk quality probe after RFC/debug, so product quality is conclusion-grade for this scenario."
            },
            zh: {
              label: "产品质量",
              explanation: "两条路径在 RFC/debug 后都通过同一套隐藏 12/12 supportDesk quality probe，因此这个场景的产品质量是结论级证据。"
            }
          }
        },
        {
          id: "context_recovery",
          level: "medium",
          conclusionEligible: false,
          dataSource: "hidden_answer_key_with_file_references",
          copy: {
            en: {
              label: "Context recovery",
              explanation: "Both paths scored 3/4 against a hidden answer key with file references. This is useful diagnostic evidence, but not high-confidence enough to prove context-continuity advantage."
            },
            zh: {
              label: "上下文恢复",
              explanation: "两条路径都按隐藏 answer key 和文件引用评分为 3/4。这是有用的诊断证据，但还不足以证明上下文连续性优势。"
            }
          }
        },
        {
          id: "gate_value",
          level: "medium",
          conclusionEligible: false,
          dataSource: "operator_recorded",
          copy: {
            en: {
              label: "Gate value",
              explanation: "Harness recorded 9 gate-caught defects, but these records are operator-recorded. They motivate gate analysis; they do not yet prove gate net value."
            },
            zh: {
              label: "Gate 价值",
              explanation: "Harness 记录到 9 个 gate 捕获缺陷，但这些记录来自 operator 事后标注。它们可以驱动 gate 分析，不能直接证明 gate 净价值。"
            }
          }
        },
        {
          id: "human_intervention",
          level: "unavailable",
          conclusionEligible: false,
          dataSource: "unavailable",
          copy: {
            en: {
              label: "Human intervention",
              explanation: "No out-of-protocol operator prompts were recorded. Missing records are unavailable evidence, not proof of low automation burden."
            },
            zh: {
              label: "人工介入",
              explanation: "这次没有记录协议之外的 operator 额外提示。缺失记录表示证据不可用，不等于自动化负担低。"
            }
          }
        },
        {
          id: "prompt_ledger",
          level: "unavailable",
          conclusionEligible: false,
          dataSource: "unavailable",
          copy: {
            en: {
              label: "Prompt ledger",
              explanation: "This support pilot did not yet record prompts.ndjson, so prompt character burden remains unavailable."
            },
            zh: {
              label: "Prompt ledger",
              explanation: "这次 support pilot 还没有记录 prompts.ndjson，因此提示词字数负担仍不可用。"
            }
          }
        },
        {
          id: "artifact_inventory",
          level: "high",
          conclusionEligible: false,
          dataSource: "filesystem_scan",
          copy: {
            en: {
              label: "Artifact inventory",
              explanation:
                "File and line counts were measured from the raw run directories. They explain artifact volume, but do not by themselves prove those artifacts created value."
            },
            zh: {
              label: "产物数量拆解",
              explanation:
                "文件数和行数来自 raw run directory 的文件系统扫描。它能解释产物体量，但不能单独证明这些产物创造了价值。"
            }
          }
        }
      ],
      modes: {
        baseline: {
          scorePassed: 12,
          scoreTotal: 12,
          decision: "pass",
          totalDeliveryMinutes: 26.9158,
          workflowControlMinutes: null,
          copy: {
            en: {
              label: "Baseline",
              notes: "Plain coding path with staged recovery/RFC/debug and the same hidden supportDesk quality probe."
            },
            zh: {
              label: "Baseline",
              notes: "直接编码路径，按相同 staged recovery/RFC/debug 协议运行，并通过同一套隐藏 supportDesk 质量 probe。"
            }
          }
        },
        harness: {
          scorePassed: 12,
          scoreTotal: 12,
          decision: "pass",
          totalDeliveryMinutes: 48.4984,
          workflowControlMinutes: null,
          copy: {
            en: {
              label: "AI SDLC Harness",
              notes: "Harness lifecycle path with staged injection. It reached the same hidden quality bar but took about 1.8x the elapsed time."
            },
            zh: {
              label: "AI SDLC Harness",
              notes: "Harness 生命周期路径，按 staged injection 运行。它达到同一 hidden quality bar，但总耗时约为 Baseline 的 1.8 倍。"
            }
          }
        }
      },
      artifactInventory: {
        dataSource: "filesystem_scan",
        confidence: "high",
        conclusionEligible: false,
        runType: "warm",
        copy: {
          en: {
            confidence: "high-count diagnostic",
            body:
              "This inventory was measured from the raw support-triage run directories after scoring. It separates product source/tests/UI assets from Harness managed runtime and project facts, so line counts can explain cost without pretending that artifact volume proves value."
          },
          zh: {
            confidence: "高置信计数，诊断级",
            body:
              "这份清单来自 support-triage raw run directory 的 score 后文件系统扫描。它把产品源码/测试/UI 资产、Harness managed runtime 和项目事实源分开，能解释成本来源，但不能单独作为价值证明。"
          }
        },
        modes: {
          baseline: {
            total: { files: 10, lines: 2319, bytes: 73873 },
            categories: {
              managed_runtime: { files: 0, lines: 0, bytes: 0 },
              project_facts: { files: 0, lines: 0, bytes: 0 },
              product_source_tests: { files: 6, lines: 2151, bytes: 61161 },
              product_docs: { files: 2, lines: 149, bytes: 12396 },
              raw_artifacts: { files: 0, lines: 0, bytes: 0 },
              scaffold: { files: 2, lines: 19, bytes: 316 },
              other: { files: 0, lines: 0, bytes: 0 }
            }
          },
          harness: {
            total: { files: 100, lines: 9191, bytes: 474873 },
            categories: {
              managed_runtime: { files: 59, lines: 5818, bytes: 310941 },
              project_facts: { files: 33, lines: 1828, bytes: 112208 },
              product_source_tests: { files: 4, lines: 1365, bytes: 45027 },
              product_docs: { files: 2, lines: 159, bytes: 6360 },
              raw_artifacts: { files: 0, lines: 0, bytes: 0 },
              scaffold: { files: 2, lines: 21, bytes: 337 },
              other: { files: 0, lines: 0, bytes: 0 }
            }
          }
        }
      },
      sections: [
        {
          id: "hidden_quality",
          passed: 12,
          total: 12,
          copy: { en: { label: "Hidden Quality Probe" }, zh: { label: "隐藏质量 Probe" } }
        },
        {
          id: "static_supplemental",
          passed: 17,
          total: 18,
          copy: { en: { label: "Static Supplemental" }, zh: { label: "静态补充检查" } }
        },
        {
          id: "context_recovery",
          passed: 3,
          total: 4,
          copy: { en: { label: "Context Recovery" }, zh: { label: "上下文恢复" } }
        },
        {
          id: "rfc_debug",
          passed: 12,
          total: 12,
          copy: { en: { label: "RFC / Debug Behavior" }, zh: { label: "RFC / Debug 行为" } }
        }
      ],
      lifecycle: {
        status: "completed",
        metrics: {
          baseline: {
            initialDeliveryMinutes: 11.16,
            recoveryOrientationMinutes: 3.06,
            rfcFixMinutes: 9.89,
            debugFixMinutes: 2.78,
            totalLifecycleMinutes: 26.89,
            contextRecoveryScore: 3,
            contextRecoveryTotal: 4,
            wrongPathCount: null,
            finalQualityScore: "12/12 PASS"
          },
          harness: {
            initialDeliveryMinutes: 20.7,
            recoveryOrientationMinutes: 3.58,
            rfcFixMinutes: 22.86,
            debugFixMinutes: 1.34,
            totalLifecycleMinutes: 48.48,
            contextRecoveryScore: 3,
            contextRecoveryTotal: 4,
            wrongPathCount: null,
            finalQualityScore: "12/12 PASS"
          }
        }
      },
      automationBurden: {
        status: "unavailable",
        metrics: {
          interventionCount: null,
          operatorPromptChars: null,
          operatorPromptWords: null,
          repairLoopCount: null
        },
        copy: {
          en: {
            body:
              "This pilot did not record out-of-protocol operator prompt count or prompt size. Do not infer low automation burden from missing intervention records."
          },
          zh: {
            body:
              "这次 pilot 没有记录协议之外的 operator 额外提示次数或提示词字数。不能把缺失介入记录解读成自动化负担低。"
          }
        }
      },
      gateValue: {
        status: "diagnostic",
        metrics: {
          defectsCaught: 9,
          productGateDefectsCaught: 1,
          workflowGateDefectsCaught: 8,
          escapedDefectCount: null,
          repairLoopCount: 0,
          firstPassQualityScore: "9/9 both"
        },
        copy: {
          en: {
            body:
              "Harness recorded 9 gate findings while Baseline recorded 0. Because those findings are operator-recorded and escaped defects were not independently measured, this is diagnostic evidence for gate-thinning analysis, not conclusion-grade proof of gate net value."
          },
          zh: {
            body:
              "Harness 记录到 9 个 gate finding，Baseline 为 0。由于这些 finding 来自 operator 记录，且 escaped defect 没有被独立测量，这只能作为 gate 打薄分析的诊断证据，不能作为 gate 净价值的结论级证明。"
          }
        }
      },
      copy: {
        en: {
          name: "Support SLA Escalation Desk",
          shape: "API/UI plus SLA policy engine",
          mainRisk: "Cross-layer RFC changes, UI/API drift, debug fix efficiency",
          projectBrief: {
            whatItBuilds:
              "A support escalation desk with an API, browser UI, and priority policy engine. Tickets track tier, channel, status, priority, contract risk, owner, and audit trail.",
            userWorkflow:
              "A support lead switches between kanban and list views, scans SLA risk, assigns owners, bulk assigns selected tickets, and moves tickets through the workflow.",
            complexitySignals:
              "This scenario forces API, UI, priority policy, tests, and docs to change together. It includes loading/empty/error/invalid states and weighted SLA ordering.",
            midstreamChange:
              "The lifecycle probe changes priority sorting to a weighted policy, adds bulk assignment with auditReason, then checks an API/UI ordering or stale-state debug fix.",
            expectedAdvantage:
              "This scenario was designed to test whether Harness reduces UI/API/policy/test/docs partial fixes. The formal pilot did not show an efficiency win: both paths reached 12/12 hidden quality, but Harness took about 1.8x longer. Gate findings are useful diagnostics, not proof that the extra gate cost paid for itself."
          }
        },
        zh: {
          name: "Support SLA Escalation Desk",
          shape: "API/UI + SLA policy engine",
          mainRisk: "跨层 RFC 变更、UI/API 漂移、debug 修复效率",
          projectBrief: {
            whatItBuilds:
              "一个支持工单升级处理台，包含 API、浏览器 UI 和 priority policy engine。工单包含客户等级、渠道、状态、优先级、合同风险、负责人和 audit trail。",
            userWorkflow:
              "支持负责人在 kanban/list 两种视图间切换，查看 SLA 风险，分配负责人，批量分配选中工单，并推动状态流转。",
            complexitySignals:
              "这个场景要求 API、UI、priority policy、tests 和 docs 一起变化，包含 loading/empty/error/invalid 状态，以及 weighted SLA ordering。",
            midstreamChange:
              "生命周期 probe 会把排序规则改成 weighted policy，新增带 auditReason 的 bulk assignment，然后检查 API/UI 排序不一致或 stale state debug fix。",
            expectedAdvantage:
              "这个场景本来用于测试 Harness 是否能减少 UI/API/policy/test/docs 的 partial fix。正式 pilot 没有体现效率优势：两条路径都达到 12/12 hidden quality，但 Harness 约慢 1.8 倍。Gate finding 是有用诊断，不等于额外 gate 成本已经被证明值得。"
          }
        }
      },
      artifacts: [
        {
          id: "support_desk_contract",
          copy: {
            en: {
              label: "SupportDesk Contract",
              purpose: "Provides the hidden-probe smoke contract for API, policy, list view, kanban view, bulk assignment, and stale-state checks."
            },
            zh: {
              label: "SupportDesk Contract",
              purpose: "提供 hidden-probe smoke contract，用来检查 API、policy、list view、kanban view、bulk assignment 和 stale state。"
            }
          }
        },
        {
          id: "policy_rfc",
          copy: {
            en: {
              label: "Weighted Policy RFC",
              purpose: "Exercises cross-layer changes across API sorting, UI rendering, tests, docs, and audit reason handling."
            },
            zh: {
              label: "Weighted Policy RFC",
              purpose: "覆盖 API 排序、UI 渲染、测试、文档和 audit reason 处理的跨层变更。"
            }
          }
        },
        {
          id: "gate_findings",
          copy: {
            en: {
              label: "Gate Findings",
              purpose: "Records diagnostic gate findings that can guide workflow thinning, while staying below conclusion-grade confidence."
            },
            zh: {
              label: "Gate Findings",
              purpose: "记录诊断级 gate finding，用于指导 workflow 打薄，但不把它当成结论级证据。"
            }
          }
        },
        {
          id: "recovery_score",
          copy: {
            en: {
              label: "Recovery Score",
              purpose: "Scores takeover memos against a hidden answer key with file references; useful, but still diagnostic."
            },
            zh: {
              label: "Recovery Score",
              purpose: "用隐藏 answer key 和文件引用评分 takeover memo；有诊断价值，但仍不是结论级。"
            }
          }
        }
      ],
      interpretation: {
        en: [
          "This is the strongest current same-quality efficiency data point because both paths passed the hidden 12/12 product probe.",
          "The result is negative for Harness elapsed-time efficiency: 48.4984 min vs 26.9158 min.",
          "Gate findings suggest Harness gates caught workflow and product issues, but the evidence is operator-recorded and does not yet prove net gate value.",
          "Use this result to analyze thinner or conditional gate profiles before designing only more favorable high-complexity scenarios."
        ],
        zh: [
          "这是当前最强的同等质量效率数据点，因为两条路径都通过隐藏 12/12 产品 probe。",
          "耗时效率结果对 Harness 不利：48.4984 分钟 vs 26.9158 分钟。",
          "Gate finding 暗示 Harness gate 抓到了 workflow 和 product 问题，但证据是 operator-recorded，尚不能证明 gate 净价值。",
          "这份结果更适合作为打薄或条件化 gate 的分析输入，而不是只继续设计更有利的高复杂度场景。"
        ]
      }
    },
    {
      id: "webhook-provider-bridge",
      status: "pending",
      modes: {},
      sections: [],
      lifecycle: {
        status: "pending",
        metrics: {
          initialDeliveryMinutes: null,
          recoveryOrientationMinutes: null,
          rfcFixMinutes: null,
          debugFixMinutes: null,
          totalLifecycleMinutes: null,
          contextRecoveryScore: null,
          contextRecoveryTotal: 6,
          wrongPathCount: null,
          finalQualityScore: null
        }
      },
      automationBurden: {
        status: "unrecorded",
        metrics: {
          interventionCount: null,
          operatorPromptChars: null,
          operatorPromptWords: null,
          repairLoopCount: null
        },
        copy: {
          en: {
            body:
              "No webhook pilot has been run with intervention logging yet. Automation burden remains unavailable for this scenario."
          },
          zh: {
            body:
              "Webhook pilot 还没有带 intervention logging 正式运行，因此这个场景的自动化负担数据不可用。"
          }
        }
      },
      gateValue: {
        status: "unrecorded",
        metrics: {
          defectsCaught: null,
          productGateDefectsCaught: null,
          workflowGateDefectsCaught: null,
          escapedDefectCount: null,
          repairLoopCount: null,
          firstPassQualityScore: null
        },
        copy: {
          en: {
            body:
              "No gate-value findings have been recorded for this pending safety-boundary scenario."
          },
          zh: {
            body:
              "这个 pending 的安全边界场景还没有记录 gate-value finding。"
          }
        }
      },
      copy: {
        en: {
          name: "Webhook Provider Safety Bridge",
          shape: "Provider bridge with mock/live safety boundary",
          mainRisk: "Credential blocker, replay/signature safety, do-not-retry, evidence boundaries",
          projectBrief: {
            whatItBuilds:
              "A webhook safety bridge with receiver, signature verification, event normalizer, delivery queue, DLQ, deterministic mock provider fixture, and explicit mock/live boundary.",
            userWorkflow:
              "An integrator runs local fixture smoke, receives provider webhooks, rejects invalid or replayed requests, retries safe downstream failures, and inspects health/dead-letter status.",
            complexitySignals:
              "This is the safety-boundary scenario: HMAC verification, timestamp freshness, replay protection, idempotency, retry/backoff, DLQ, tenant secret rotation, and evidence-level separation.",
            midstreamChange:
              "The lifecycle probe upgrades provider payloads to schema v2, adds tenant secret rotation and replay protection, then checks a stale timestamp or expired-secret debug fix.",
            expectedAdvantage:
              "Harness should lower wrong-path count by preserving do-not-retry constraints, avoiding credential guessing, and keeping local/mock/live evidence clearly separated."
          }
        },
        zh: {
          name: "Webhook Provider Safety Bridge",
          shape: "带 mock/live 安全边界的 provider bridge",
          mainRisk: "credential blocker、replay/signature 安全、do-not-retry、证据边界",
          projectBrief: {
            whatItBuilds:
              "一个 webhook 安全桥接服务，包含 receiver、signature verification、event normalizer、delivery queue、DLQ、确定性 mock provider fixture 和明确的 mock/live 边界。",
            userWorkflow:
              "集成方先跑本地 fixture smoke，再接收 provider webhook，拒绝非法或 replay 请求，对安全的下游失败做重试，并查看 health / dead-letter 状态。",
            complexitySignals:
              "这是安全边界场景：HMAC 校验、timestamp freshness、replay protection、幂等、retry/backoff、DLQ、tenant secret rotation 和证据等级分离。",
            midstreamChange:
              "生命周期 probe 会把 provider payload 升级到 schema v2，新增 tenant secret rotation 和 replay protection，然后检查 stale timestamp 或 expired-secret debug fix。",
            expectedAdvantage:
              "Harness 应该降低 wrong-path count：保留 do-not-retry 约束，避免猜 credential，并把 local/mock/live evidence 分清楚。"
          }
        }
      }
    }
  ]
};
