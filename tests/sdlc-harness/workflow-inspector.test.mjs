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

  const promptRun = spawnSync(process.execPath, [cliPath, "inspect-workflow", "--prompt"], {
    cwd: root,
    encoding: "utf8"
  });
  assert.equal(promptRun.status, 0, promptRun.stderr);
  assert.match(promptRun.stdout, /Workflow inspection: PASS/);
  assert.match(promptRun.stdout, /Workflow Self-Inspection Prompt/);
  assert.match(promptRun.stdout, /measured \/ inferred/);
  assert.match(promptRun.stdout, />15 分钟/);

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
    docs:
      tech_plan:
        - .docs/03_tech_plan/plan.md
    allowed_paths:
      - src/**
    required_gates:
      - npm test
    acceptance_criteria:
      - First task is executable.
    implementation_doc: .docs/04_implementation/first.md
  - id: TASK-002
    phase: SPRINTING
    title: Second task
    status: pending
    summary: Test multiple open tasks.
    docs:
      tech_plan:
        - .docs/03_tech_plan/plan.md
    allowed_paths:
      - src/**
    required_gates:
      - npm test
    acceptance_criteria:
      - Second task is executable.
    implementation_doc: .docs/04_implementation/second.md
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

  await mkdir(path.join(root, ".docs/04_implementation"), { recursive: true });
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
