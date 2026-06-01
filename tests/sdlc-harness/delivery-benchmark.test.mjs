import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  listScenarios,
  prepareRunDirectory,
  recordEvent,
  renderMarkdownReport,
  scoreRun
} from "../../examples/delivery-benchmark/runner/delivery_benchmark.mjs";

const root = await mkdtemp(path.join(tmpdir(), "delivery-benchmark-"));

try {
  const scenarios = await listScenarios();
  assert.deepEqual(scenarios, ["expense-policy-engine", "support-triage-board", "webhook-provider-bridge"]);

  const runDir = path.join(root, "expense-run");
  const prepared = await prepareRunDirectory({
    scenario: "expense-policy-engine",
    mode: "harness",
    outDir: runDir,
    force: true
  });
  assert.equal(prepared.scenario, "expense-policy-engine");
  assert.equal(prepared.mode, "harness");
  const prompt = await readFile(path.join(runDir, ".benchmark", "prompt.md"), "utf8");
  assert.match(prompt, /Harness Prompt/);
  assert.match(prompt, /Expense Policy Engine Requirements/);

  await recordEvent({
    runDir,
    event: "sync",
    kind: "workflow_control",
    phase: "REQUIREMENT_GATHERING",
    minutes: 3,
    notes: "sync overhead"
  });
  await recordEvent({
    runDir,
    event: "implementation",
    kind: "coding",
    phase: "SPRINTING",
    minutes: 12
  });

  await mkdir(path.join(runDir, "src"), { recursive: true });
  await mkdir(path.join(runDir, "tests"), { recursive: true });
  await writeFile(
    path.join(runDir, "src", "index.js"),
    [
      "const input = JSON.parse(process.argv[2] ?? '{}');",
      "const jurisdiction = input.jurisdiction ?? input.region;",
      "console.log(JSON.stringify({ approved: true, reasonCode: 'APPROVED', auditTrail: ['jurisdiction ' + jurisdiction] }));",
      "export const codes = ['MEAL_LIMIT_EXCEEDED', 'MISSING_RECEIPT', 'WEEKEND_TRAVEL_REVIEW', 'INVALID_INPUT', 'executive'];"
    ].join("\n"),
    "utf8"
  );
  await writeFile(
    path.join(runDir, "tests", "index.test.js"),
    [
      "const expected = ['APPROVED', 'auditTrail', 'MEAL_LIMIT_EXCEEDED', 'MISSING_RECEIPT', 'WEEKEND_TRAVEL_REVIEW', 'INVALID_INPUT', 'executive', 'region', 'jurisdiction'];",
      "console.log(expected.join(' '));"
    ].join("\n"),
    "utf8"
  );
  await writeFile(
    path.join(runDir, ".benchmark", "transcript.md"),
    "CLI smoke PASS\nnpm test PASS\nnext action: final review\nregion deprecated alias\n",
    "utf8"
  );

  const report = await scoreRun({
    scenario: "expense-policy-engine",
    mode: "harness",
    runDir,
    estimatedVibeHandoffMinutes: 30,
    avoidedReworkMinutes: 10,
    comparisonConfidence: "medium"
  });
  assert.equal(report.workflow_cost.workflow_control_minutes, 3);
  assert.equal(report.workflow_cost.total_delivery_minutes, 15);
  assert.equal(report.outcome.workflow_overhead_ratio, 0.2);
  assert.equal(report.outcome.net_value_minutes, 25);
  assert.equal(report.sections.acceptance.total, 10);
  assert.ok(report.sections.acceptance.passed > 0);
  assert.match(renderMarkdownReport(report), /Delivery Benchmark Report/);
} finally {
  await rm(root, { recursive: true, force: true });
}
