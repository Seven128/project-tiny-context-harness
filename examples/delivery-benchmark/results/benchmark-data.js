window.__DELIVERY_BENCHMARK_DATA__ = {
  generatedAt: "2026-06-01T10:08:26.207Z",
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
        scorecard: "Scorecard",
        quality: "Quality Heatmap",
        artifact: "Harness Artifact Map",
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
          "The current completed run only measures first-scenario delivery. It does not yet test fresh-agent recovery, multi-RFC change, or post-change debugging. The new lifecycle probe will separate initial delivery, recovery orientation, RFC fix, debug fix, and total lifecycle minutes.",
        metrics: [
          { label: "Initial delivery", value: "pending" },
          { label: "Fresh-agent recovery", value: "pending" },
          { label: "RFC + debug fix", value: "pending" },
          { label: "Total lifecycle", value: "pending" }
        ]
      },
      contextContinuity: {
        label: "Context continuity",
        body:
          "Harness should show its advantage when a fresh agent needs to recover current state, history, constraints, test entrypoints, and the next safe action. The context recovery score and wrong-path count are pending until the lifecycle scenario is run.",
        metrics: [
          { label: "Recovery quiz", value: "pending" },
          { label: "Wrong-path count", value: "pending" },
          { label: "Final quality", value: "pending" }
        ]
      },
      keyFinding: {
        eyebrow: "Key Finding",
        headline: "Current evidence does not show Harness is faster.",
        body:
          "The completed scenario shows same-quality delivery: both paths reached 13/13 PASS. Baseline finished in 25 min, while Harness took 53 min with 29 min of workflow control. The visible benefit is stronger durable handoff and recovery evidence, not speed. The API/UI and provider-boundary scenarios are still pending, so complex/high-risk efficiency claims remain open.",
        points: [
          "Efficiency: not proven faster or more efficient in the completed run.",
          "Quality: both paths met the same final rubric.",
          "Cost: Harness added recorded workflow control time.",
          "Handoff: Harness produced review, testing, recovery, and release-ready artifacts.",
          "Confidence: cost data is an agent-recorded estimate with low comparison confidence."
        ]
      },
      evidenceMetrics: [
        {
          id: "efficiency",
          label: "Efficiency finding",
          value: "Not proven faster",
          detail: "25 min baseline vs 53 min Harness in the completed run.",
          help:
            "This answers the speed/efficiency question for the completed scenario. Because Harness took more recorded time than baseline, this run cannot support a faster-or-more-efficient claim.",
          tone: "warn"
        },
        {
          id: "quality",
          label: "Quality result",
          value: "13/13 PASS both",
          detail: "Same acceptance, change impact, and handoff rubric.",
          help:
            "Both paths were scored against the same final rubric: acceptance, change impact, and handoff. This is why the comparison is same-quality delivery rather than first-patch speed.",
          tone: "good"
        },
        {
          id: "workflow_control",
          label: "Harness workflow control",
          value: "29 min",
          detail: "Lifecycle, gates, transitions, and source/overview control work.",
          help:
            "Workflow control is time spent operating the workflow itself: orientation, lifecycle/plan handling, gates, transitions, and source/overview drift work. Durable deliverables are not counted here.",
          tone: "warn"
        },
        {
          id: "handoff_artifacts",
          label: "Durable handoff",
          value: "9 artifact groups",
          detail: "PRD, UX, architecture, tech plan, implementation, runbook, review, test, release.",
          help:
            "These are the extra materials Harness produced for later review, testing, recovery, and release readiness. They are the main visible benefit in this run.",
          tone: "good"
        },
        {
          id: "confidence",
          label: "Cost confidence",
          value: "Low",
          detail: "Legacy agent-recorded estimate, not telemetry.",
          help:
            "Cost confidence is low for the completed run because the minutes were recorded by the agent during the benchmark. New external observer runs can raise elapsed-time confidence without asking the agent to maintain a log, but this historical run is not retroactively upgraded.",
          tone: "neutral"
        },
        {
          id: "coverage",
          label: "Scenario coverage",
          value: "1/4 complete",
          detail: "API/UI, context-recovery, and provider-boundary scenarios are pending.",
          help:
            "Only one scenario has both baseline and Harness results. The more complex API/UI, fresh-agent recovery, multi-RFC/debug, and provider-boundary scenarios must run before broad complex-project efficiency claims are made.",
          tone: "neutral"
        }
      ],
      evidenceStatus:
        "Only expense-policy-engine is complete. support-triage-board, project-context-recovery-lab, and webhook-provider-bridge are pending, so complex API/UI, lifecycle recovery, and provider/live-boundary efficiency conclusions are not closed yet.",
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
        "The completed run does not prove Harness is faster or more efficient.",
        "The completed run does not test fresh-agent recovery, multi-RFC cascade, or debug-fix efficiency.",
        "The completed run still uses legacy agent-recorded workflow control cost estimates; future external observer runs can improve elapsed-time confidence.",
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
        scorecard: "记分卡",
        quality: "质量热力图",
        artifact: "Harness 产物地图",
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
          "当前 completed run 只覆盖一个初始交付样本，还没有测到生命周期效率：新对话恢复、多轮 RFC 变更和变更后的 debug 修复。新的生命周期 probe 会把首轮交付、恢复定向、RFC 修复、debug 修复和总生命周期耗时分开记录。",
        metrics: [
          { label: "首轮交付", value: "待运行" },
          { label: "新对话恢复", value: "待运行" },
          { label: "RFC + debug 修复", value: "待运行" },
          { label: "生命周期总耗时", value: "待运行" }
        ]
      },
      contextContinuity: {
        label: "上下文连续性",
        body:
          "Harness 真正应该拉开差距的地方，是新对话里的 agent 能否快速恢复项目当前状态、历史变更、关键约束、测试入口和下一步安全动作。context recovery score 和 wrong-path count 会等生命周期场景跑完后填写。",
        metrics: [
          { label: "恢复问答", value: "待运行" },
          { label: "走错路径次数", value: "待运行" },
          { label: "最终质量", value: "待运行" }
        ]
      },
      keyFinding: {
        eyebrow: "核心结论",
        headline: "当前证据尚不能证明 Harness 更快或更高效。",
        body:
          "已完成的场景说明：两条路径都达到 13/13 PASS，属于同等质量交付；但 Baseline 用时 25 分钟，Harness 用时 53 分钟，其中 29 分钟是工作流控制成本。当前能确认的收益，是 Harness 产出了更强的交接、恢复、review/testing/release 可检查证据，而不是速度优势。API/UI 和 provider 边界场景仍待运行，复杂/高风险项目的效率结论还没有闭合。",
        points: [
          "效率：已完成样本尚不能证明 Harness 更快或更高效。",
          "质量：两条路径都达到同一最终评分标准。",
          "成本：Harness 明确增加了记录下来的工作流控制成本。",
          "交接：Harness 产出了 review、testing、恢复和发布就绪所需的长期产物。",
          "置信度：成本数据是 agent-recorded estimate，且比较置信度低。"
        ]
      },
      evidenceMetrics: [
        {
          id: "efficiency",
          label: "效率结论",
          value: "尚不能证明更快",
          detail: "已完成样本：Baseline 25 分钟，Harness 53 分钟。",
          help:
            "这一项回答“是否更快/更高效”。在已完成样本里，Harness 记录用时高于 Baseline，所以不能据此宣称 Harness 更快或更高效。",
          tone: "warn"
        },
        {
          id: "quality",
          label: "质量结果",
          value: "双方均 13/13 PASS",
          detail: "验收、变更影响、交接评分标准相同。",
          help:
            "两条路径使用同一套最终评分规则：验收、变更影响和交接。这保证比较的是同等质量交付，而不是谁先写出第一版代码。",
          tone: "good"
        },
        {
          id: "workflow_control",
          label: "Harness 工作流控制成本",
          value: "29 分钟",
          detail: "包括 lifecycle、gate、阶段流转和 source/overview 控制工作。",
          help:
            "工作流控制成本指操作工作流本身花掉的时间，例如定位上下文、处理 lifecycle/plan、跑 gate、阶段流转和处理 source/overview drift。PRD、测试、实现文档等可复用交付物不计入这里。",
          tone: "warn"
        },
        {
          id: "handoff_artifacts",
          label: "长期交接产物",
          value: "9 组产物",
          detail: "PRD、UX、架构、技术方案、实现、runbook、review、test、release。",
          help:
            "这些是 Harness 额外留下的可复用材料，用来支撑后续 review、testing、恢复和发布就绪检查。这是本次 completed run 最明确的收益。",
          tone: "good"
        },
        {
          id: "confidence",
          label: "成本置信度",
          value: "低",
          detail: "历史运行使用 agent-recorded estimate，不是 telemetry。",
          help:
            "成本置信度表示耗时数据有多可靠。已完成样本是历史运行，分钟数来自 agent 在 benchmark 过程中的记录/估算，不是 telemetry，所以仍是低置信度。后续用外部 observer 重跑，可以在不要求 agent 写日志的前提下提升耗时置信度，但不会倒推改写这次结果。",
          tone: "neutral"
        },
        {
          id: "coverage",
          label: "场景覆盖",
          value: "1/4 已完成",
          detail: "API/UI、上下文恢复和 provider 边界场景仍待运行。",
          help:
            "目前只有一个场景完成了 baseline 和 Harness 双路径。更复杂的 API/UI、新对话恢复、多轮 RFC/debug 和 provider 边界场景还没跑完，所以不能把结论扩展到所有复杂项目。",
          tone: "neutral"
        }
      ],
      evidenceStatus:
        "目前只有费用报销政策引擎完成。支持工单分诊看板、Project Context Recovery Lab 和 Webhook Provider Bridge 仍待运行，所以复杂 API/UI、生命周期恢复与 provider/live 边界场景的效率结论还不能提前下结论。",
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
        "已完成样本不能证明 Harness 更快或更高效。",
        "已完成样本还没有覆盖新对话恢复、多轮 RFC cascade 或 debug 修复效率。",
        "已完成样本仍使用历史 agent-recorded 工作流控制成本估算；后续外部 observer 运行可以提升耗时置信度。",
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
          id: "implementation_doc",
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
              "Harness should recover project state faster, score higher on the context recovery quiz, and avoid wrong paths such as using deprecated severity or retrying live credentials."
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
              "Harness 应该能更快恢复项目状态，context recovery quiz 得分更高，并减少继续使用 deprecated severity 或乱试 live credentials 这类 wrong path。"
          }
        }
      }
    },
    {
      id: "support-triage-board",
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
              "Harness should reduce partial fixes where only UI or only API changes, lower RFC/debug time, and preserve same-quality coverage across implementation, tests, and docs."
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
              "Harness 应该减少只改 UI 或只改 API 的 partial fix，降低 RFC/debug 总耗时，并保持实现、测试和文档的同质量覆盖。"
          }
        }
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
