import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runInit } from "../../packages/sdlc-harness/dist/lib/init.js";
import { runWorkflowInspection } from "../../packages/sdlc-harness/dist/lib/workflow-inspector.js";

const root = await mkdtemp(path.join(tmpdir(), "sdlc-harness-inspect-"));
const cliPath = fileURLToPath(new URL("../../packages/sdlc-harness/dist/cli.js", import.meta.url));

try {
  await runInit(root, { adopt: false, force: false });
  const healthy = await runWorkflowInspection(root);
  assert.equal(healthy.decision, "PASS");
  assert.equal(healthy.harness_root, ".agent");
  assert.ok(healthy.metrics.some((metric) => metric.id === "workflow_weight.plan_lines" && metric.data_source === "measured"));
  assert.ok(healthy.metrics.some((metric) => metric.id === "workflow_weight.actual_tokens" && metric.data_source === "unavailable"));
  assert.ok(
    healthy.metrics.some(
      (metric) => metric.id === "outcome.workflow_overhead_ratio" && metric.value === null && metric.data_source === "unavailable"
    )
  );

  const promptRun = spawnSync(process.execPath, [cliPath, "inspect-workflow", "--prompt"], {
    cwd: root,
    encoding: "utf8"
  });
  assert.equal(promptRun.status, 0, promptRun.stderr);
  assert.match(promptRun.stdout, /Workflow inspection: PASS/);
  assert.match(promptRun.stdout, /Workflow Self-Inspection Prompt/);
  assert.match(promptRun.stdout, /measured \/ inferred/);
  assert.match(promptRun.stdout, />15 分钟/);
  assert.match(promptRun.stdout, /同等质量 baseline/);
  assert.match(promptRun.stdout, /返工/);

  const outcomePass = spawnSync(
    process.execPath,
    [
      cliPath,
      "inspect-workflow",
      "--json",
      "--workflow-control-minutes",
      "20",
      "--total-delivery-minutes",
      "100",
      "--estimated-vibe-handoff-minutes",
      "110",
      "--avoided-rework-minutes",
      "20",
      "--comparison-confidence",
      "medium"
    ],
    {
      cwd: root,
      encoding: "utf8"
    }
  );
  assert.equal(outcomePass.status, 0, outcomePass.stderr);
  const outcomePassReport = JSON.parse(outcomePass.stdout);
  assert.equal(outcomePassReport.comparison_confidence, "medium");
  assert.ok(
    outcomePassReport.metrics.some(
      (metric) =>
        metric.id === "outcome.workflow_overhead_ratio" &&
        metric.value === 0.2 &&
        metric.level === "PASS" &&
        metric.data_source === "self_reported"
    )
  );
  assert.ok(
    outcomePassReport.metrics.some((metric) => metric.id === "outcome.net_value_minutes" && metric.value === 30)
  );

  const outcomeWarn = await runWorkflowInspection(root, {
    workflowControlMinutes: 40,
    totalDeliveryMinutes: 100
  });
  assert.equal(outcomeWarn.decision, "WARN");
  assert.ok(
    outcomeWarn.metrics.some((metric) => metric.id === "outcome.workflow_overhead_ratio" && metric.level === "WARN")
  );

  const outcomeBlocked = await runWorkflowInspection(root, {
    workflowControlMinutes: 60,
    totalDeliveryMinutes: 100
  });
  assert.equal(outcomeBlocked.decision, "BLOCKED");
  assert.ok(
    outcomeBlocked.metrics.some((metric) => metric.id === "outcome.workflow_overhead_ratio" && metric.level === "BLOCKED")
  );

  const lowConfidenceLoss = await runWorkflowInspection(root, {
    totalDeliveryMinutes: 150,
    estimatedVibeHandoffMinutes: 100,
    avoidedReworkMinutes: 0,
    comparisonConfidence: "low"
  });
  assert.equal(lowConfidenceLoss.decision, "WARN");
  assert.ok(
    lowConfidenceLoss.metrics.some((metric) => metric.id === "outcome.net_value_minutes" && metric.level === "WARN")
  );

  const highConfidenceLoss = await runWorkflowInspection(root, {
    totalDeliveryMinutes: 150,
    estimatedVibeHandoffMinutes: 100,
    avoidedReworkMinutes: 0,
    comparisonConfidence: "high"
  });
  assert.equal(highConfidenceLoss.decision, "BLOCKED");
  assert.ok(
    highConfidenceLoss.metrics.some((metric) => metric.id === "outcome.net_value_minutes" && metric.level === "BLOCKED")
  );

  const selfReported = spawnSync(process.execPath, [cliPath, "inspect-workflow", "--json", "--recent-minutes", "31"], {
    cwd: root,
    encoding: "utf8"
  });
  assert.equal(selfReported.status, 1, selfReported.stderr);
  const selfReportedReport = JSON.parse(selfReported.stdout);
  assert.equal(selfReportedReport.decision, "BLOCKED");
  assert.ok(
    selfReportedReport.metrics.some(
      (metric) =>
        metric.id === "self_reported.recent_minutes" &&
        metric.level === "BLOCKED" &&
        metric.data_source === "self_reported"
    )
  );

  await mkdir(path.join(root, ".agent/state"), { recursive: true });
  await writeFile(path.join(root, ".agent/state/lifecycle.yaml"), 'current_phase: "SPRINTING"\n', "utf8");

  await writeFile(
    path.join(root, ".agent/state/plan.yaml"),
    `current_task_id: "TASK-001"
next_task_sequence: 3
tasks:
  - id: TASK-001
    phase: SPRINTING
    title: First task
    status: pending
    summary: Test multiple open tasks.
    work_products:
      tech_plan:
        - .work_products/03_tech_plan/plan.md
    allowed_paths:
      - src/**
    required_gates:
      - npm test
    acceptance_criteria:
      - First task is executable.
    implementation_work_product: .work_products/04_implementation/first.md
  - id: TASK-002
    phase: SPRINTING
    title: Second task
    status: pending
    summary: Test multiple open tasks.
    work_products:
      tech_plan:
        - .work_products/03_tech_plan/plan.md
    allowed_paths:
      - src/**
    required_gates:
      - npm test
    acceptance_criteria:
      - Second task is executable.
    implementation_work_product: .work_products/04_implementation/second.md
`,
    "utf8"
  );
  const multipleOpen = await runWorkflowInspection(root);
  assert.equal(multipleOpen.decision, "BLOCKED");
  assert.ok(
    multipleOpen.metrics.some(
      (metric) => metric.id === "workflow_weight.open_tasks" && metric.value === 2 && metric.level === "BLOCKED"
    )
  );

  await writeFile(
    path.join(root, ".agent/state/plan.yaml"),
    `current_task_id: "TASK-001"
next_task_sequence: 2
resume_capsule:
  task_id: TASK-001
  state: in_progress
  canonical_path: browser smoke path
  next_step: continue from browser smoke entry
  blocker: none
  last_passed_gate: npm test
  do_not_retry:
    - do not replace browser smoke with unit-only evidence
  recovery_refs:
    - .work_products/04_implementation/high_risk.md
tasks:
  - id: TASK-001
    phase: SPRINTING
    title: High-risk runtime task
    status: pending
    summary: Test high-risk workflow overhead threshold.
    work_products:
      tech_plan:
        - .work_products/03_tech_plan/plan.md
    allowed_paths:
      - src/**
    required_gates:
      - npm test
    acceptance_criteria:
      - High-risk task is executable.
    implementation_work_product: .work_products/04_implementation/high_risk.md
    evidence_level:
      required: external_provider_live
    target_runtime_environment:
      kind: browser
    self_test_contract:
      status: required
      source: .work_products/03_tech_plan/plan.md
      runnable_entry: npm test
      observable_exit: PASS output
      module_key_test_path: npm test -> browser smoke -> PASS output
      required_gates:
        - npm test
      scenarios:
        - id: ST-001
          entry: npm test
          expected_exit: PASS output
          evidence: command output
`,
    "utf8"
  );
  const highRiskOverhead = await runWorkflowInspection(root, {
    workflowControlMinutes: 55,
    totalDeliveryMinutes: 100
  });
  assert.ok(
    highRiskOverhead.metrics.some((metric) => metric.id === "outcome.workflow_overhead_ratio" && metric.level === "WARN")
  );

  await mkdir(path.join(root, ".work_products/04_implementation"), { recursive: true });
  const oversizedPlanLines = Array.from({ length: 510 }, (_, index) => `# filler ${index}`).join("\n");
  await writeFile(
    path.join(root, ".agent/state/plan.yaml"),
    `${oversizedPlanLines}
current_task_id: ""
next_task_sequence: 1
tasks: []
`,
    "utf8"
  );
  const oversized = await runWorkflowInspection(root);
  assert.equal(oversized.decision, "BLOCKED");
  assert.ok(
    oversized.metrics.some(
      (metric) => metric.id === "workflow_weight.plan_lines" && metric.level === "BLOCKED" && metric.data_source === "measured"
    )
  );

  const help = spawnSync(process.execPath, [cliPath, "help"], {
    cwd: root,
    encoding: "utf8"
  });
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /inspect-workflow/);
} finally {
  await rm(root, { recursive: true, force: true });
}
