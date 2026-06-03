window.__DELIVERY_BENCHMARK_DATA__ = {
  generatedAt: "2026-06-03T00:00:00.000Z",
  copy: {
    en: {
      languageName: "English",
      documentTitle: "Delivery Reliability Benchmark",
      title: "Delivery Reliability Benchmark",
      lede:
        "Minimal Context benchmark skeleton. Historical stage-workflow results were removed; future conclusions require fresh formal reruns.",
      generatedLabel: "Generated",
      scenarioNavLabel: "Benchmark scenarios",
      languageSwitchLabel: "Report language",
      rawArtifactFootnote: "Raw run artifacts stay under .artifacts/delivery-benchmark/ and are not committed.",
      status: {
        completed: "Completed",
        pending: "Pending"
      },
      headings: {
        scenarioDetail: "Scenario Brief",
        automationBurden: "Automation Burden",
        gateValue: "Gate Value"
      },
      scenarioBriefLabels: {
        whatItBuilds: "What this project builds",
        userWorkflow: "User workflow",
        complexitySignals: "Complexity and risk covered",
        midstreamChange: "Change/recovery pressure",
        expectedAdvantage: "Expected Minimal Context signal"
      },
      keyFinding: {
        eyebrow: "Reset State",
        headline: "No public benchmark result is currently conclusion-grade.",
        body:
          "The previous public numbers measured the old stage-based workflow. After the product direction changed to Minimal Context Harness, those results are no longer valid evidence for the current workflow and have been removed from the report.",
        points: [
          "Current benchmark data is intentionally empty.",
          "The runner and scenario skeletons remain for future formal reruns.",
          "Future conclusions must use fresh baseline and Minimal Context Harness runs.",
          "Elapsed time and product quality must be measured with high-confidence evidence before publication."
        ]
      },
      evidenceMetrics: [
        {
          id: "result_state",
          label: "Result state",
          value: "Reset",
          detail: "Old stage-workflow result data was removed.",
          help:
            "The old data answered a different product question. It should not be reused to judge Minimal Context Harness.",
          tone: "warn"
        },
        {
          id: "benchmark_scope",
          label: "Benchmark scope",
          value: "Skeleton kept",
          detail: "Runner, scenarios, prompts, and report shell remain.",
          help:
            "The benchmark module still exists so future pilots can be rerun with the current Minimal Context workflow.",
          tone: "neutral"
        },
        {
          id: "next_evidence",
          label: "Next evidence",
          value: "Fresh rerun required",
          detail: "No efficiency claim should be made until rerun.",
          help:
            "Fresh formal runs must use the same model/configuration, observer timing, hidden quality probe, and clean handoff boundary.",
          tone: "neutral"
        },
        {
          id: "confidence",
          label: "Confidence rule",
          value: "High only",
          detail: "Core conclusions require high-confidence metrics.",
          help:
            "Diagnostic or historical data may guide design, but it cannot support public benchmark conclusions.",
          tone: "good"
        }
      ],
      evidenceStatus:
        "All scenarios are pending under the Minimal Context benchmark reset. Historical stage-workflow summaries are intentionally not displayed.",
      pending: {
        noRun: "No current formal run.",
        body:
          "This scenario is kept as a rerun candidate. Run a clean baseline/Harness pair before publishing any numbers."
      }
    },
    zh: {
      languageName: "中文",
      documentTitle: "交付可靠性基准测试",
      title: "交付可靠性基准测试",
      lede:
        "Minimal Context 版本的 benchmark 骨架。旧阶段式工作流结果已移除，后续结论必须重新正式运行。",
      generatedLabel: "生成时间",
      scenarioNavLabel: "Benchmark 场景",
      languageSwitchLabel: "报告语言",
      rawArtifactFootnote: "Raw run artifacts 保留在 .artifacts/delivery-benchmark/，不提交。",
      status: {
        completed: "已完成",
        pending: "待重跑"
      },
      headings: {
        scenarioDetail: "场景说明",
        automationBurden: "自动化负担",
        gateValue: "Gate 价值"
      },
      scenarioBriefLabels: {
        whatItBuilds: "项目具体做什么",
        userWorkflow: "主要用户流程",
        complexitySignals: "复杂度与风险点",
        midstreamChange: "变更/恢复压力",
        expectedAdvantage: "预期 Minimal Context 信号"
      },
      keyFinding: {
        eyebrow: "重置状态",
        headline: "当前没有可用于正式结论的公开 benchmark 结果。",
        body:
          "此前公开数字衡量的是旧阶段式工作流。产品方向已经收敛为 Minimal Context Harness 后，那些结果不能继续作为当前工作流证据，因此已从报告中移除。",
        points: [
          "当前 benchmark 数据有意清空。",
          "runner、场景、prompt 和报告壳保留，供后续正式重跑。",
          "后续结论必须来自 fresh baseline 与 Minimal Context Harness 对照运行。",
          "耗时和产品质量必须具备高置信测量后才能发布。"
        ]
      },
      evidenceMetrics: [
        {
          id: "result_state",
          label: "结果状态",
          value: "已重置",
          detail: "旧阶段式工作流结果数据已移除。",
          help:
            "旧数据回答的是另一个产品问题，不应继续用于判断 Minimal Context Harness。",
          tone: "warn"
        },
        {
          id: "benchmark_scope",
          label: "Benchmark 范围",
          value: "保留骨架",
          detail: "runner、场景、prompt 和报告壳仍保留。",
          help:
            "benchmark 模块仍存在，方便后续用当前 Minimal Context 工作流重新跑 pilot。",
          tone: "neutral"
        },
        {
          id: "next_evidence",
          label: "下一步证据",
          value: "需要 fresh rerun",
          detail: "重跑前不做效率结论。",
          help:
            "正式运行必须保持同模型/配置、observer 计时、hidden quality probe 和干净 handoff 边界。",
          tone: "neutral"
        },
        {
          id: "confidence",
          label: "置信度规则",
          value: "只用高置信",
          detail: "核心结论只允许使用高置信指标。",
          help:
            "诊断或历史数据可以指导设计，但不能支撑公开 benchmark 结论。",
          tone: "good"
        }
      ],
      evidenceStatus:
        "所有场景在 Minimal Context benchmark 重置后均为待重跑。旧阶段式工作流 summary 不再展示。",
      pending: {
        noRun: "当前没有正式运行结果。",
        body:
          "该场景仅作为后续重跑候选。发布任何数字前，需要完成干净的 baseline/Harness 对照运行。"
      }
    }
  },
  scenarios: [
    scenario("expense-policy-engine", {
      en: {
        name: "Expense Policy Engine",
        shape: "CLI/library policy engine",
        mainRisk: "Policy rules, audit reasons, and input validation",
        projectBrief: {
          whatItBuilds: "A small expense approval engine that evaluates JSON claims and returns decisions, reason codes, and audit traces.",
          userWorkflow: "A developer runs tests or a CLI command against sample expense claims.",
          complexitySignals: "Multiple policy rules, reason-code correctness, audit trace recoverability, and a midstream domain rename.",
          midstreamChange: "A future rerun can keep the region to jurisdiction change as the staged RFC.",
          expectedAdvantage: "Minimal Context should help a fresh agent recover policy intent and safe next action without a full document chain."
        }
      },
      zh: {
        name: "报销政策引擎",
        shape: "CLI/library 规则引擎",
        mainRisk: "政策规则、审计原因和输入校验",
        projectBrief: {
          whatItBuilds: "一个报销审批引擎，输入 JSON 报销单，输出审批决策、原因码和审计轨迹。",
          userWorkflow: "开发者通过测试或 CLI 命令验证样例报销单。",
          complexitySignals: "多条政策规则、原因码正确性、审计轨迹可恢复，以及中途领域命名变更。",
          midstreamChange: "后续重跑可继续使用 region 到 jurisdiction 的 staged RFC。",
          expectedAdvantage: "Minimal Context 应帮助 fresh agent 快速恢复政策意图和下一步安全动作，而不需要完整文档链。"
        }
      }
    }),
    scenario("project-context-recovery-lab", {
      en: {
        name: "Project Context Recovery Lab",
        shape: "Incident ops console",
        mainRisk: "Fresh-agent recovery and context continuity",
        projectBrief: {
          whatItBuilds: "An incident operations console with API, board, worker, provider events, retries, dead letters, and audit trail.",
          userWorkflow: "An operator creates incidents, moves statuses, assigns owners, and processes mock provider events.",
          complexitySignals: "API/UI/worker coordination, provider boundary, idempotency, retry behavior, and recovery handoff.",
          midstreamChange: "Future reruns should inject recovery, RFC, and debug stages separately.",
          expectedAdvantage: "Minimal Context should reduce fresh-agent orientation cost by preserving goal, module boundaries, entrypoints, and next safe action."
        }
      },
      zh: {
        name: "项目上下文恢复实验",
        shape: "事故运营控制台",
        mainRisk: "新会话恢复与上下文连续性",
        projectBrief: {
          whatItBuilds: "一个事故运营控制台，包含 API、看板、worker、provider 事件、重试、死信和审计轨迹。",
          userWorkflow: "运营人员创建事故、流转状态、分配负责人，并处理 mock provider 事件。",
          complexitySignals: "API/UI/worker 协同、provider 边界、幂等、重试行为和交接恢复。",
          midstreamChange: "后续重跑应分段注入 recovery、RFC 和 debug。",
          expectedAdvantage: "Minimal Context 应通过保留目标、模块边界、入口和下一步安全动作，降低 fresh agent 定位成本。"
        }
      }
    }),
    scenario("support-triage-board", {
      en: {
        name: "Support Triage Board",
        shape: "Support SLA escalation desk",
        mainRisk: "Cross-layer UI/API/policy drift",
        projectBrief: {
          whatItBuilds: "A support desk with tickets, SLA risk, priority policy, assignment, status movement, and UI views.",
          userWorkflow: "A support lead triages tickets, sorts by risk, assigns owners, and checks escalation state.",
          complexitySignals: "Policy, API, UI state, docs, and tests must change together across RFC/debug stages.",
          midstreamChange: "Future reruns should test whether Context helps repair cross-layer drift without old workflow gates.",
          expectedAdvantage: "Minimal Context may help preserve policy intent and affected entrypoints while avoiding heavy stage overhead."
        }
      },
      zh: {
        name: "客服工单分诊看板",
        shape: "客服 SLA 升级台",
        mainRisk: "UI/API/策略跨层漂移",
        projectBrief: {
          whatItBuilds: "一个客服工单台，包含工单、SLA 风险、优先级策略、分配、状态流转和 UI 视图。",
          userWorkflow: "客服负责人按风险分诊工单、分配负责人并查看升级状态。",
          complexitySignals: "策略、API、UI 状态、文档和测试需要在 RFC/debug 中同步变化。",
          midstreamChange: "后续重跑应验证 Context 是否能帮助修复跨层漂移，同时避免旧 workflow gate 的成本。",
          expectedAdvantage: "Minimal Context 可能保留策略意图与受影响入口，同时避开重阶段成本。"
        }
      }
    }),
    scenario("webhook-provider-bridge", {
      en: {
        name: "Webhook Provider Bridge",
        shape: "Provider safety bridge",
        mainRisk: "HMAC, replay protection, retry, DLQ, and live credential boundaries",
        projectBrief: {
          whatItBuilds: "A webhook receiver that verifies signatures, normalizes events, retries safely, and dead-letters failed delivery.",
          userWorkflow: "A developer sends deterministic mock provider events and checks delivery, idempotency, and replay safety.",
          complexitySignals: "Security-sensitive provider boundary, credential blocker, timestamp freshness, idempotency, and do-not-retry rules.",
          midstreamChange: "Future reruns should inject schema/signing changes and a replay debug fix.",
          expectedAdvantage: "Minimal Context should preserve provider safety boundaries and do-not-retry constraints for fresh agents."
        }
      },
      zh: {
        name: "Webhook Provider 桥接",
        shape: "Provider 安全桥接服务",
        mainRisk: "HMAC、重放保护、重试、DLQ 和 live credential 边界",
        projectBrief: {
          whatItBuilds: "一个 webhook receiver，验证签名、规范化事件、安全重试，并把失败投递进入死信。",
          userWorkflow: "开发者发送确定性的 mock provider 事件，检查投递、幂等和重放安全。",
          complexitySignals: "安全敏感 provider 边界、credential blocker、timestamp freshness、幂等和 do-not-retry 规则。",
          midstreamChange: "后续重跑应注入 schema/signing 变化和 replay debug fix。",
          expectedAdvantage: "Minimal Context 应帮助 fresh agent 保留 provider 安全边界和 do-not-retry 约束。"
        }
      }
    })
  ]
};

function scenario(id, copy) {
  return {
    id,
    status: "pending",
    copy
  };
}
