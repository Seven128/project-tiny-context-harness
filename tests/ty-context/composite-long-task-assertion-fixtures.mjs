import { validTaskState } from "./plan-validator-fixtures.mjs";

export function assertionBackedTaskState() {
  const state = validTaskState();
  state.evidence = [
    {
      ...state.evidence[0],
      type: "runtime_assertion",
      command_exit_code: 0,
      assertion_result: assertionResult({
        runner: "node-runtime",
        target_proof_layers: ["AC-001.runtime"],
        positive_assertions: [
          { id: "job_created", status: "passed", expected: "job id", actual: "job-123" },
          { id: "durable_final_state", status: "passed", expected: "complete", actual: "complete" }
        ],
        artifacts: ["tmp/ty-context/plan-acceptance/demo/runtime.json"]
      })
    },
    {
      ...state.evidence[1],
      type: "playwright_assertion",
      command: "npx playwright test tests/runtime.spec.ts --grep recovery",
      command_exit_code: 0,
      artifact_paths: [
        "tmp/ty-context/plan-acceptance/demo/browser.png",
        "tmp/ty-context/plan-acceptance/demo/playwright-trace.zip",
        "tmp/ty-context/plan-acceptance/demo/ui-assertion-report.json"
      ],
      assertion_result: assertionResult({
        runner: "playwright",
        target_proof_layers: ["AC-001.ui_browser"],
        owner_surface: "Operations",
        route: "/operations",
        action: "start recovery and wait for run_id job-123 to complete",
        positive_assertions: [
          { id: "ui_owner_surface_loaded", status: "passed", expected: "Operations", actual: "Operations" },
          { id: "run_id_present", status: "passed", expected: "job-123", actual: "job-123" },
          { id: "polling_observed", status: "passed", expected: "complete", actual: "complete" },
          { id: "final_status_chinese", status: "passed", expected: "已完成", actual: "已完成" }
        ],
        negative_assertions: [
          { id: "no-unverified", status: "passed", forbidden_text: "未验证" },
          { id: "no-unavailable", status: "passed", forbidden_text: "不可用" },
          { id: "no-temp-unavailable", status: "passed", forbidden_text: "暂不可用" },
          { id: "no-unchanged-page", status: "passed", forbidden_text: "页面无明显变化" }
        ],
        artifacts: [
          "tmp/ty-context/plan-acceptance/demo/browser.png",
          "tmp/ty-context/plan-acceptance/demo/playwright-trace.zip",
          "tmp/ty-context/plan-acceptance/demo/ui-assertion-report.json"
        ]
      }),
      negative_evidence_scan: {
        schema_version: "negative-evidence-scan-v1",
        status: "passed",
        target_ac_ids: ["AC-001"],
        owner_surface: "Operations",
        route: "/operations",
        forbidden_findings: [
          { id: "no-unverified", status: "not_found", forbidden_text: "未验证" },
          { id: "no-unavailable", status: "not_found", forbidden_text: "不可用" },
          { id: "no-temp-unavailable", status: "not_found", forbidden_text: "暂不可用" },
          { id: "no-unchanged-page", status: "not_found", forbidden_text: "页面无明显变化" }
        ],
        required_findings: [{ id: "final_status_chinese", status: "passed", expected: "已完成", actual: "已完成" }],
        artifacts: ["tmp/ty-context/plan-acceptance/demo/ui-assertion-report.json"]
      }
    },
    {
      ...state.evidence[2],
      type: "test_assertion",
      command_exit_code: 0,
      assertion_result: assertionResult({
        runner: "node:test",
        target_proof_layers: ["AC-001.test"],
        positive_assertions: [{ id: "required_test_passed", status: "passed", expected: "0 failures", actual: "0 failures" }],
        artifacts: ["tmp/ty-context/plan-acceptance/demo/runtime.json"]
      })
    }
  ];
  return state;
}

function assertionResult(overrides = {}) {
  return {
    schema_version: "assertion-result-v1",
    status: "passed",
    runner: "test-runner",
    exit_code: 0,
    target_ac_ids: ["AC-001"],
    target_proof_layers: [],
    owner_surface: undefined,
    route: undefined,
    action: undefined,
    positive_assertions: [],
    negative_assertions: [{ id: "no-forbidden-final-state", status: "passed" }],
    artifacts: [],
    ...overrides
  };
}
